import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Config stored in SystemConfig table or use defaults
const DEFAULT_ESCALATION_HOURS = 48;
const DEFAULT_REMINDER_HOURS = 24;

// GET - Fetch escalation settings and stats
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdminRole(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();

        // Get config from SystemConfig table (or use defaults)
        let escalationHours = DEFAULT_ESCALATION_HOURS;
        let reminderHours = DEFAULT_REMINDER_HOURS;
        let enabled = true;
        let lastRun: string | null = null;

        const configRecord = await prisma.systemConfig.findFirst({
            where: { key: 'escalation_settings' },
        }).catch(() => null);

        if (configRecord?.value) {
            try {
                const parsed = JSON.parse(configRecord.value);
                escalationHours = parsed.escalationHours ?? DEFAULT_ESCALATION_HOURS;
                reminderHours = parsed.reminderHours ?? DEFAULT_REMINDER_HOURS;
                enabled = parsed.enabled ?? true;
                lastRun = parsed.lastRun ?? null;
            } catch (e) { }
        }

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
            const deadline = leave.escalationDeadline || new Date(leave.createdAt.getTime() + escalationHours * 60 * 60 * 1000);
            const hoursRemaining = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
            const currentApprover = leave.approvals[0]?.approver;

            return {
                id: leave.id,
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
                employeeName: `${leave.user.firstName} ${leave.user.lastName}`,
                leaveType: leave.leaveType,
                escalatedTo: hrApproval?.approver ? `${hrApproval.approver.firstName} ${hrApproval.approver.lastName}` : 'HR Manager',
                escalatedAt: leave.updatedAt.toISOString(),
                status: leave.status === 'approved' ? 'อนุมัติแล้ว' : leave.status === 'rejected' ? 'ไม่อนุมัติ' : 'รอดำเนินการ',
            };
        });

        // Calculate stats
        const nearDeadline = pending.filter(p => p.hoursRemaining > 0 && p.hoursRemaining <= reminderHours).length;
        const totalEscalated = await prisma.leaveRequest.count({
            where: { isEscalated: true },
        });

        return NextResponse.json({
            config: {
                escalationHours,
                reminderHours,
                enabled,
                lastRun,
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

// PUT - Update escalation settings
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdminRole(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { escalationHours, reminderHours, enabled } = await req.json();

        // Validate
        if (escalationHours < 1 || escalationHours > 168) {
            return NextResponse.json({ error: 'escalationHours must be between 1 and 168' }, { status: 400 });
        }
        if (reminderHours < 1 || reminderHours > 72) {
            return NextResponse.json({ error: 'reminderHours must be between 1 and 72' }, { status: 400 });
        }

        // Get existing config to preserve lastRun
        const existingConfig = await prisma.systemConfig.findFirst({
            where: { key: 'escalation_settings' },
        }).catch(() => null);

        let lastRun = null;
        if (existingConfig?.value) {
            try {
                const parsed = JSON.parse(existingConfig.value);
                lastRun = parsed.lastRun;
            } catch (e) { }
        }

        const configValue = JSON.stringify({
            escalationHours,
            reminderHours,
            enabled,
            lastRun,
        });

        // Upsert config
        await prisma.systemConfig.upsert({
            where: { key: 'escalation_settings' },
            create: {
                key: 'escalation_settings',
                value: configValue,
            },
            update: {
                value: configValue,
            },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error updating escalation settings:', error);
        return NextResponse.json(
            { error: 'Failed to update settings' },
            { status: 500 }
        );
    }
}
