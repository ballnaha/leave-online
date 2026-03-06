import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyLeaveApproved, notifyLeaveSubmitted } from '@/lib/onesignal';
import { createApprovalSteps, calculateEscalationDeadline } from '@/lib/escalation';
import { calculateVacationDays } from '@/lib/vacationCalculator';

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

// ประเภทการลาที่ไม่จำกัดวัน
const unlimitedLeaveTypes = ['unpaid', 'other', 'sick_no_pay', 'personal_no_pay', 'paternity_care'];

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
        const isAdmin = ['admin', 'hr', 'hr_manager'].includes(session.user.role);

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

        // ตรวจสอบสิทธิ์การอนุมัติ (เหมือนกับ approve route)
        const pendingApproval = isAdmin
            ? originalLeave.approvals.find(
                (a) => a.level === originalLeave.currentLevel && a.status === 'pending'
            )
            : originalLeave.approvals.find(
                (a) =>
                    a.approverId === approverId &&
                    a.level === originalLeave.currentLevel &&
                    a.status === 'pending'
            );

        if (!pendingApproval) {
            return NextResponse.json(
                { error: 'คุณไม่มีสิทธิ์ในการจัดการใบลาใบนี้' },
                { status: 403 }
            );
        }

        // ============ ตรวจสอบประเภทการลาที่ถูกต้อง ============
        // ดึงประเภทการลาทั้งหมดที่ active
        const activeLeaveTypes = await prisma.leaveType.findMany({
            where: { isActive: true },
            select: { code: true, name: true, maxDaysPerYear: true }
        });
        const activeLeaveTypeCodes = activeLeaveTypes.map(t => t.code);

        // ตรวจสอบว่าทุก split ใช้ประเภทการลาที่มีอยู่จริง
        for (const split of splits) {
            if (!activeLeaveTypeCodes.includes(split.leaveType)) {
                return NextResponse.json(
                    { error: `ประเภทการลา "${split.leaveType}" ไม่มีในระบบหรือถูกปิดใช้งาน` },
                    { status: 400 }
                );
            }
        }

        // ============ ตรวจสอบวันลาคงเหลือ ============
        // คำนวณปีที่เกี่ยวข้อง (ใช้ปีของวันเริ่มลา)
        const leaveYear = new Date(originalLeave.startDate).getFullYear();

        // ดึงวันลาที่ใช้ไปแล้วในปีนี้สำหรับแต่ละประเภท (เฉพาะ approved และ pending/in_progress ไม่รวมใบลาเดิม)
        const usedLeaves = await prisma.leaveRequest.groupBy({
            by: ['leaveType'],
            where: {
                userId: originalLeave.userId,
                status: { in: ['approved', 'pending', 'in_progress', 'completed'] },
                id: { not: originalLeaveId }, // ไม่นับใบลาเดิมที่กำลังจะถูกยกเลิก
                startDate: {
                    gte: new Date(leaveYear, 0, 1),
                    lt: new Date(leaveYear + 1, 0, 1)
                }
            },
            _sum: { totalDays: true }
        });

        // สร้าง map ของวันลาที่ใช้ไป
        const usedDaysMap: Record<string, number> = {};
        usedLeaves.forEach(leave => {
            usedDaysMap[leave.leaveType] = leave._sum.totalDays || 0;
        });

        // รวมวันลาที่จะแยกใหม่ตามประเภท
        const newDaysByType: Record<string, number> = {};
        for (const split of splits) {
            newDaysByType[split.leaveType] = (newDaysByType[split.leaveType] || 0) + split.totalDays;
        }

        // ตรวจสอบโควต้าสำหรับแต่ละประเภทที่ไม่ใช่ Unlimited
        for (const [leaveTypeCode, newDays] of Object.entries(newDaysByType)) {
            // ข้ามประเภทที่ไม่จำกัดวัน
            if (unlimitedLeaveTypes.includes(leaveTypeCode)) {
                continue;
            }

            const leaveTypeInfo = activeLeaveTypes.find(t => t.code === leaveTypeCode);
            if (!leaveTypeInfo) continue;

            // คำนวณ maxDays (พิเศษสำหรับ vacation)
            let maxDays = leaveTypeInfo.maxDaysPerYear || 0;
            if (leaveTypeCode === 'vacation' && originalLeave.user.startDate) {
                maxDays = calculateVacationDays(
                    originalLeave.user.startDate,
                    leaveYear,
                    leaveTypeInfo.maxDaysPerYear || 6
                );
            }

            // ถ้า maxDays = 0 หรือ null ถือว่าไม่จำกัด
            if (!maxDays || maxDays === 0) {
                continue;
            }

            const usedDays = usedDaysMap[leaveTypeCode] || 0;
            const totalAfterSplit = usedDays + newDays;

            if (totalAfterSplit > maxDays) {
                const remainingDays = Math.max(0, maxDays - usedDays);
                return NextResponse.json(
                    {
                        error: `วันลาประเภท "${leaveTypeInfo.name}" ไม่เพียงพอ (ใช้ไปแล้ว ${usedDays} วัน, ต้องการ ${newDays} วัน, เหลือ ${remainingDays} วัน จากทั้งหมด ${maxDays} วัน)`
                    },
                    { status: 400 }
                );
            }
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
        // ถ้าเป็น HR Manager หรือ Admin ให้ Auto Approve เลย
        // ถ้าเป็นหัวหน้างานทั่วไป ให้เริ่มกระบวนการอนุมัติใหม่ (Pending Level 1)
        const shouldAutoApprove = isAdmin;

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
                    comment: `แยกใบลาโดยผู้อนุมัติ: ${session.user.firstName} ${session.user.lastName}${comment ? ` - ${comment}` : ''}`,
                    actionAt: now,
                },
            });

            // 3. สร้างใบลาใหม่ตาม splits
            for (let i = 0; i < splits.length; i++) {
                const split = splits[i];
                const splitStart = new Date(split.startDate);
                const splitEnd = new Date(split.endDate);

                // สร้างรหัสใบลาใหม่
                const newLeaveCode = await generateLeaveCode(split.leaveType, splitStart);

                // คำนวณ escalation deadline (13:00 ของวันถัดไป)
                const escalationDeadline = calculateEscalationDeadline();

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
                            level: 99, // HR Manager/Admin level override
                            approverId: approverId,
                            status: 'approved',
                            comment: `อนุมัติอัตโนมัติจากการแยกใบลา${comment ? `: ${comment}` : ''}`,
                            actionAt: now,
                        },
                    });
                } else {
                    // ถ้าไม่อนุมัติทันที ให้สร้าง Approval Steps เริ่มต้นใหม่ (จะทำนอก transaction loop เพื่อเลี่ยงปัญหา async ซ้อน หรือต้องเรียก function ที่รองรับ tx)
                    // เนื่องจาก createApprovalSteps ใน lib/escalation ใช้ prisma instance หลัก ไม่ได้รับ tx
                    // ดังนั้นเราจะเรียก createApprovalSteps หลังจาก transaction commit แล้วสำหรับใบลาที่สร้างใหม่
                    // แต่เพื่อความถูกต้องของข้อมูล เราควรทำใน transaction เดียวกัน
                    // แต่ในที่นี้ architecture ของ lib แยกออกมา จึงจำใจต้องทำหลัง transaction หรือต้องแก้ lib
                    // เราจะเลือกทำหลัง transaction loop (ใน block ถัดไป)
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

        // ดำเนินการต่อหลังจาก Transaction เสร็จสิ้น
        for (const leaveId of createdLeaves) {
            const newLeave = await prisma.leaveRequest.findUnique({
                where: { id: leaveId },
                include: { user: true },
            });

            if (newLeave) {
                if (shouldAutoApprove) {
                    // แจ้งเตือนผู้ขอลาว่าใบลาได้รับการอนุมัติแล้ว (HR Manager/Admin)
                    await notifyLeaveApproved(
                        newLeave.userId,
                        leaveId,
                        `${session.user.firstName} ${session.user.lastName}`,
                        newLeave.leaveType
                    );
                } else {
                    // สร้าง Approval Steps สำหรับใบลาใหม่ (หัวหน้างานแยกใบลา)
                    await createApprovalSteps(leaveId, newLeave.userId);

                    // แจ้งเตือนผู้ขอลาว่าใบลาถูกแยกและสร้างใหม่ (สถานะ Pending)
                    await notifyLeaveSubmitted(
                        newLeave.userId,
                        leaveId,
                        newLeave.leaveType,
                        newLeave.totalDays,
                        newLeave.startDate.toISOString(),
                        newLeave.endDate.toISOString(),
                        newLeave.leaveCode || undefined
                    );
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `แยกใบลาสำเร็จ สร้างใบลาใหม่ ${createdLeaves.length} รายการ (${shouldAutoApprove ? 'อนุมัติแล้ว' : 'รออนุมัติ'})`,
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
