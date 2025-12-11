import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Fixed policy: Escalate at 08:00 AM, 2 days after creation
const REMINDER_HOURS = 24;

// GET - Fetch escalation stats (Auto Escalation is always enabled)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdminRole(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();

        // Get pending leaves with escalation info
        const pendingLeaves = await prisma.leaveRequest.findMany({
            where: {
                status: { in: ['pending', 'in_progress'] },
                isEscalated: false,
            },
            include: {
                user: {
                    select: { firstName: true, lastName: true },
                },
                approvals: {
                    where: { status: 'pending' },
                    orderBy: { level: 'asc' },
                    take: 1,
                    include: {
                        approver: {
                            select: { firstName: true, lastName: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
            take: 20,
        });

        const pending = pendingLeaves.map((leave) => {
            // คำนวณ deadline ตาม Policy: Created + 2 days at 08:00
            const deadline = new Date(leave.createdAt);
            deadline.setDate(deadline.getDate() + 2);
            deadline.setHours(8, 0, 0, 0);

            const hoursRemaining = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
            const currentApprover = leave.approvals[0]?.approver;

            return {
                id: leave.id,
                leaveCode: leave.leaveCode,
                employeeName: `${leave.user.firstName} ${leave.user.lastName}`,
                leaveType: leave.leaveType,
                createdAt: leave.createdAt.toISOString(),
                deadline: deadline.toISOString(),
                hoursRemaining,
                currentApprover: currentApprover ? `${currentApprover.firstName} ${currentApprover.lastName}` : 'ไม่มี',
            };
        });

        // Get recent escalated leaves
        const escalatedLeaves = await prisma.leaveRequest.findMany({
            where: { isEscalated: true },
            include: {
                user: {
                    select: { firstName: true, lastName: true },
                },
                approvals: {
                    where: { level: 99 },
                    include: {
                        approver: {
                            select: { firstName: true, lastName: true },
                        },
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
            take: 20,
        });

        const logs = escalatedLeaves.map((leave) => {
            const hrApproval = leave.approvals[0];
            return {
                id: leave.id,
                leaveRequestId: leave.id,
                leaveCode: leave.leaveCode,
                employeeName: `${leave.user.firstName} ${leave.user.lastName}`,
                leaveType: leave.leaveType,
                escalatedTo: hrApproval?.approver ? `${hrApproval.approver.firstName} ${hrApproval.approver.lastName}` : 'HR Manager',
                escalatedAt: leave.updatedAt.toISOString(),
                status: leave.status === 'approved' ? 'อนุมัติแล้ว' : leave.status === 'rejected' ? 'ไม่อนุมัติ' : 'รอดำเนินการ',
            };
        });

        // Calculate stats
        const nearDeadline = pending.filter(p => p.hoursRemaining > 0 && p.hoursRemaining <= REMINDER_HOURS).length;
        const totalEscalated = await prisma.leaveRequest.count({
            where: { isEscalated: true },
        });

        return NextResponse.json({
            config: {
                enabled: true, // Always enabled
                cronConfigured: !!process.env.CRON_SECRET,
            },
            pending,
            logs,
            stats: {
                pendingCount: pending.length,
                nearDeadline,
                totalEscalated,
            },
        });

    } catch (error) {
        console.error('Error fetching escalation settings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        );
    }
}
