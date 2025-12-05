import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createApprovalSteps } from '@/lib/escalation';

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

        // หา approval step ที่รอการอนุมัติจาก user นี้
        // ต้องหา approval ที่ status เป็น pending หรือ in_progress และ approverId ตรงกับ user ปัจจุบัน
        const pendingApproval = originalLeave.approvals.find(
            (a) => a.approverId === approverId && (a.status === 'pending' || a.status === 'in_progress')
        );

        // ถ้าไม่เจอ ให้ตรวจสอบว่าเป็น admin, hr หรือ hr_manager หรือไม่
        const allowedRoles = ['admin', 'hr', 'hr_manager'];
        const hasPermission = allowedRoles.includes(session.user.role || '');

        if (!pendingApproval && !hasPermission) {
            console.log('Split Leave - Permission denied:', {
                approverId,
                userRole: session.user.role,
                approvals: originalLeave.approvals.map(a => ({ id: a.id, approverId: a.approverId, status: a.status, level: a.level })),
            });
            return NextResponse.json(
                { error: 'คุณไม่มีสิทธิ์แยกใบลานี้' },
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

            // 2. อัพเดต approval ของใบลาเดิมเป็น cancelled (ถ้ามี pendingApproval)
            if (pendingApproval) {
                await tx.leaveApproval.update({
                    where: { id: pendingApproval.id },
                    data: {
                        status: 'cancelled',
                        comment: `แยกใบลาเป็น ${splits.length} ส่วน${comment ? `: ${comment}` : ''}`,
                        actionAt: now,
                    },
                });
            } else {
                // ถ้าไม่มี pendingApproval (เช่น hr/admin ที่ไม่ใช่ approver) ให้ยกเลิก approval ทั้งหมดที่ยัง pending
                await tx.leaveApproval.updateMany({
                    where: { 
                        leaveRequestId: originalLeaveId,
                        status: { in: ['pending', 'in_progress'] }
                    },
                    data: {
                        status: 'cancelled',
                        comment: `แยกใบลาโดย ${session.user.role}: ${session.user.firstName} ${session.user.lastName}${comment ? ` - ${comment}` : ''}`,
                        actionAt: now,
                    },
                });
            }

            // 3. สร้างใบลาใหม่ตาม splits
            for (let i = 0; i < splits.length; i++) {
                const split = splits[i];
                const splitStart = new Date(split.startDate);
                const splitEnd = new Date(split.endDate);

                // สร้างรหัสใบลาใหม่
                const newLeaveCode = await generateLeaveCode(split.leaveType, splitStart);

                // คำนวณ escalation deadline (2 วัน)
                const escalationDeadline = new Date();
                escalationDeadline.setHours(escalationDeadline.getHours() + 48);

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
                        status: 'pending',
                        currentLevel: 1,
                        escalationDeadline,
                        isEscalated: false,
                        contactPhone: originalLeave.contactPhone,
                        contactAddress: originalLeave.contactAddress,
                    },
                });

                createdLeaves.push(newLeave.id);

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

        // สร้าง approval steps สำหรับใบลาใหม่ทั้งหมด (นอก transaction เพราะอาจมี side effects)
        for (const leaveId of createdLeaves) {
            await createApprovalSteps(leaveId, originalLeave.userId);
        }

        return NextResponse.json({
            success: true,
            message: `แยกใบลาสำเร็จ สร้างใบลาใหม่ ${createdLeaves.length} รายการ`,
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
