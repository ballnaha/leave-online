import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyLeaveApproved } from '@/lib/onesignal';

// Map leave type to short code
const leaveTypeCodeMap: Record<string, string> = {
    sick: 'SK',
    personal: 'PS',
    vacation: 'VC',
    maternity: 'MT',
    ordination: 'OR',
    work_outside: 'WO',
    absent: 'AB',
    other: 'OT',
};

// Generate leave code: SK2511001 (type + year + month + running)
async function generateLeaveCode(leaveType: string, date: Date): Promise<string> {
    const typeCode = leaveTypeCodeMap[leaveType] || 'OT';
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `${typeCode}${year}${month}`;

    const lastLeave = await prisma.leaveRequest.findFirst({
        where: {
            leaveCode: {
                startsWith: prefix,
            },
        },
        orderBy: {
            leaveCode: 'desc',
        },
        select: {
            leaveCode: true,
        },
    });

    let runningNumber = 1;
    if (lastLeave?.leaveCode) {
        const lastNumber = parseInt(lastLeave.leaveCode.slice(-3), 10);
        if (!isNaN(lastNumber)) {
            runningNumber = lastNumber + 1;
        }
    }

    return `${prefix}${String(runningNumber).padStart(3, '0')}`;
}

// คำนวณจำนวนวันระหว่าง 2 วันที่
function calculateDaysBetween(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 เพราะนับวันแรกด้วย
    return diffDays;
}

interface SplitPart {
    leaveType: string;
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
    totalDays: number;
    reason?: string;
}

// POST /api/leaves/[id]/split - แยกใบลาเป็นหลายส่วน
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const originalLeaveId = parseInt(id);
        const approverId = parseInt(session.user.id);
        const body = await request.json();
        const { splits, comment } = body as { splits: SplitPart[]; comment?: string };

        if (!splits || !Array.isArray(splits) || splits.length < 2) {
            return NextResponse.json(
                { error: 'ต้องแยกใบลาเป็นอย่างน้อย 2 ส่วน' },
                { status: 400 }
            );
        }

        // ดึงข้อมูลใบลาเดิม
        const originalLeave = await prisma.leaveRequest.findUnique({
            where: { id: originalLeaveId },
            include: {
                user: true,
                approvals: {
                    orderBy: { level: 'asc' },
                },
                attachments: true,
            },
        });

        if (!originalLeave) {
            return NextResponse.json({ error: 'ไม่พบใบลา' }, { status: 404 });
        }

        // ตรวจสอบว่าใบลายังไม่ถูก approve/reject
        if (['approved', 'rejected', 'cancelled'].includes(originalLeave.status)) {
            return NextResponse.json(
                { error: `ใบลานี้${originalLeave.status === 'approved' ? 'อนุมัติแล้ว' : originalLeave.status === 'rejected' ? 'ถูกปฏิเสธแล้ว' : 'ถูกยกเลิกแล้ว'}` },
                { status: 400 }
            );
        }

        // ตรวจสอบว่าเป็น hr_manager เท่านั้นที่แยกใบลาได้
        if (session.user.role !== 'hr_manager') {
            return NextResponse.json(
                { error: 'เฉพาะ HR Manager เท่านั้นที่สามารถแยกใบลาได้' },
                { status: 403 }
            );
        }

        // ตรวจสอบวันที่ของ splits ว่าครอบคลุมวันที่เดิมทั้งหมด
        const originalStart = new Date(originalLeave.startDate);
        const originalEnd = new Date(originalLeave.endDate);

        // คำนวณผลรวมวันลาที่แยก
        const totalSplitDays = splits.reduce((sum, s) => sum + s.totalDays, 0);
        if (Math.abs(totalSplitDays - originalLeave.totalDays) > 0.01) {
            return NextResponse.json(
                { error: `จำนวนวันรวมไม่ตรงกับใบลาเดิม (เดิม: ${originalLeave.totalDays} วัน, แยก: ${totalSplitDays} วัน)` },
                { status: 400 }
            );
        }

        const now = new Date();
        const createdLeaves: number[] = [];

        // ใช้ transaction เพื่อความปลอดภัย
        await prisma.$transaction(async (tx) => {
            // 1. ยกเลิกใบลาเดิม โดยใส่หมายเหตุว่าถูกแยก
            await tx.leaveRequest.update({
                where: { id: originalLeaveId },
                data: {
                    status: 'cancelled',
                    cancelReason: `แยกใบลาโดยผู้อนุมัติ: ${session.user.firstName} ${session.user.lastName}${comment ? ` - ${comment}` : ''}`,
                    cancelledAt: now,
                },
            });

            // 2. ยกเลิก approval ทั้งหมดที่ยัง pending
            await tx.leaveApproval.updateMany({
                where: {
                    leaveRequestId: originalLeaveId,
                    status: { in: ['pending', 'in_progress'] }
                },
                data: {
                    status: 'cancelled',
                    comment: `แยกใบลาโดย HR Manager: ${session.user.firstName} ${session.user.lastName}${comment ? ` - ${comment}` : ''}`,
                    actionAt: now,
                },
            });

            // 3. สร้างใบลาใหม่ตาม splits
            // hr_manager สามารถอนุมัติทันทีสำหรับทุกประเภทใบลา เพราะเป็นผู้อนุมัติคนสุดท้าย
            const shouldAutoApprove = true; // hr_manager แยกใบลาจะอนุมัติทันทีเสมอ

            for (let i = 0; i < splits.length; i++) {
                const split = splits[i];
                const splitStart = new Date(split.startDate);
                const splitEnd = new Date(split.endDate);

                // สร้างรหัสใบลาใหม่
                const newLeaveCode = await generateLeaveCode(split.leaveType, splitStart);

                // คำนวณ escalation deadline (+2 วัน เวลา 08:00 น.)
                const escalationDeadline = new Date();
                escalationDeadline.setDate(escalationDeadline.getDate() + 2);
                escalationDeadline.setHours(8, 0, 0, 0);

                // สร้างใบลาใหม่
                const newLeave = await tx.leaveRequest.create({
                    data: {
                        userId: originalLeave.userId,
                        leaveCode: newLeaveCode,
                        leaveType: split.leaveType,
                        startDate: splitStart,
                        startTime: split.startTime || originalLeave.startTime,
                        endDate: splitEnd,
                        endTime: split.endTime || originalLeave.endTime,
                        totalDays: split.totalDays,
                        reason: split.reason || `${originalLeave.reason} (แยกจากใบลา ${originalLeave.leaveCode || '#' + originalLeaveId})`,
                        status: shouldAutoApprove ? 'approved' : 'pending',
                        currentLevel: shouldAutoApprove ? 99 : 1,
                        escalationDeadline: shouldAutoApprove ? null : escalationDeadline,
                        isEscalated: false,
                        contactPhone: originalLeave.contactPhone,
                        contactAddress: originalLeave.contactAddress,
                        finalApprovedAt: shouldAutoApprove ? now : null,
                        finalApprovedBy: shouldAutoApprove ? approverId : null,
                    },
                });

                createdLeaves.push(newLeave.id);

                // ถ้าอนุมัติทันที สร้าง approval record ด้วย
                if (shouldAutoApprove) {
                    await tx.leaveApproval.create({
                        data: {
                            leaveRequestId: newLeave.id,
                            level: 99, // HR Manager level
                            approverId: approverId,
                            status: 'approved',
                            comment: `อนุมัติอัตโนมัติจากการแยกใบลา${comment ? `: ${comment}` : ''}`,
                            actionAt: now,
                        },
                    });
                }

                // Copy attachments ถ้ามี
                if (originalLeave.attachments.length > 0) {
                    await tx.leaveAttachment.createMany({
                        data: originalLeave.attachments.map((att) => ({
                            leaveRequestId: newLeave.id,
                            fileName: att.fileName,
                            filePath: att.filePath,
                            fileSize: att.fileSize,
                            mimeType: att.mimeType,
                        })),
                    });
                }
            }
        });

        // แจ้งเตือนผู้ขอลาว่าใบลาได้รับการอนุมัติแล้ว (เฉพาะ hr_manager)
        for (const leaveId of createdLeaves) {
            const newLeave = await prisma.leaveRequest.findUnique({
                where: { id: leaveId },
                include: { user: true },
            });

            if (newLeave) {
                // แจ้งเตือนผู้ขอลา
                await notifyLeaveApproved(
                    newLeave.userId,
                    leaveId,
                    `${session.user.firstName} ${session.user.lastName}`,
                    newLeave.leaveType
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: `แยกและอนุมัติใบลาสำเร็จ สร้างใบลาใหม่ ${createdLeaves.length} รายการ (อนุมัติแล้ว)`,
            originalLeaveId,
            newLeaveIds: createdLeaves,
        });
    } catch (error) {
        console.error('Error splitting leave request:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาดในการแยกใบลา' },
            { status: 500 }
        );
    }
}
