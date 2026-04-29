import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateEscalationDeadline } from '@/lib/escalation';

// Fixed policy: Escalate at 13:00 PM the next day
const REMINDER_HOURS = 4; // Warn at 09:00 AM (4 hours before 13:00)

// GET - Fetch escalation stats (Auto Escalation is always enabled)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdminRole(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const { searchParams } = new URL(req.url);
        const yearParam = searchParams.get('year');
        const monthParam = searchParams.get('month');
        
        const selectedYear = yearParam ? parseInt(yearParam) : now.getFullYear();
        const selectedMonth = monthParam ? parseInt(monthParam) : 0; // 0 = all months

        let start: Date;
        let end: Date;

        if (selectedMonth === 0) {
            start = new Date(selectedYear, 0, 1);
            end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
        } else {
            start = new Date(selectedYear, selectedMonth - 1, 1);
            end = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
        }

        // Get last run info from system config
        const lastRunConfig = await prisma.systemConfig.findUnique({
            where: { key: 'last_escalation_run' }
        });

        const wherePending: any = {
            status: { in: ['pending', 'in_progress'] },
            isEscalated: false,
        };

        if (yearParam) {
            wherePending.createdAt = {
                gte: start,
                lte: end,
            };
        }

        const pendingLeaves = await prisma.leaveRequest.findMany({
            where: wherePending,
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
            take: 100,
        });

        const pending = pendingLeaves.map((leave) => {
            const deadline = leave.escalationDeadline || calculateEscalationDeadline(leave.createdAt);
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
        const whereEscalated: any = { isEscalated: true };
        if (yearParam) {
            whereEscalated.createdAt = {
                gte: start,
                lte: end,
            };
        }

        const escalatedLeaves = await prisma.leaveRequest.findMany({
            where: whereEscalated,
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
            take: 100,
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
            where: whereEscalated,
        });

        return NextResponse.json({
            config: {
                enabled: true,
                lastRun: lastRunConfig?.value || null,
                cronConfigured: !!process.env.CRON_SECRET,
            },
            selectedYear,
            selectedMonth,
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
