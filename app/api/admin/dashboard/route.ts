import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdminRole(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. Stats
        const [
            totalEmployees,
            pendingRequests,
            approvedToday,
            activeLeavesToday
        ] = await Promise.all([
            // Fix: Use isActive boolean instead of status string
            prisma.user.count({ where: { isActive: true } }),
            prisma.leaveRequest.count({ where: { status: 'pending' } }),
            prisma.leaveRequest.count({
                where: {
                    status: 'approved',
                    updatedAt: {
                        gte: today,
                        lt: tomorrow
                    }
                }
            }),
            prisma.leaveRequest.count({
                where: {
                    status: 'approved',
                    startDate: { lte: today },
                    endDate: { gte: today }
                }
            })
        ]);

        // 2. Pending Leaves (Recent 5)
        const recentPendingLeaves = await prisma.leaveRequest.findMany({
            where: { status: 'pending' },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        position: true,
                        avatar: true,
                    }
                }
            }
        });

        // 3. Who is Out Today (Top 5)
        const whoIsOut = await prisma.leaveRequest.findMany({
            where: {
                status: 'approved',
                startDate: { lte: today },
                endDate: { gte: today }
            },
            take: 5,
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        department: true,
                        avatar: true
                    }
                }
            }
        });

        // Get Department names mapping
        const departments = await prisma.department.findMany({ select: { code: true, name: true } });
        const deptMap = new Map(departments.map(d => [d.code, d.name]));

        // Get LeaveType names mapping
        const leaveTypes = await prisma.leaveType.findMany({ select: { code: true, name: true } });
        const leaveTypeMap = new Map(leaveTypes.map(l => [l.code, l.name]));

        // Format Pending Leaves
        const formattedPendingLeaves = recentPendingLeaves.map(leave => ({
            id: leave.id,
            name: `${leave.user.firstName} ${leave.user.lastName}`,
            role: leave.user.position || 'Employee',
            type: leaveTypeMap.get(leave.leaveType) || leave.leaveType,
            days: leave.totalDays,
            dates: `${new Date(leave.startDate).getDate()} ${new Date(leave.startDate).toLocaleString('en-US', { month: 'short' })}`,
            avatar: leave.user.avatar,
            status: leave.status,
        }));

        // Format Who Is Out
        const formattedWhoIsOut = whoIsOut.map(leave => ({
            name: `${leave.user.firstName} ${leave.user.lastName}`,
            dept: deptMap.get(leave.user.department) || leave.user.department,
            status: leaveTypeMap.get(leave.leaveType) || leave.leaveType,
            avatar: leave.user.avatar
        }));

        // 4. Department Stats (Approved leaves count by department)
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const leavesForStats = await prisma.leaveRequest.findMany({
            where: {
                status: 'approved',
                createdAt: { gte: yearStart }
            },
            select: {
                user: { select: { department: true } },
                leaveType: true
            }
        });

        const deptStats: Record<string, number> = {};
        leavesForStats.forEach(l => {
            const deptName = deptMap.get(l.user.department) || l.user.department;
            deptStats[deptName] = (deptStats[deptName] || 0) + 1;
        });

        const formattedDeptStats = Object.entries(deptStats)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 5) // Top 5
            .map(([name, value]) => ({ name, value }));

        // 5. Leave Type Stats
        const typeStats: Record<string, number> = {};
        leavesForStats.forEach(l => {
            const typeName = leaveTypeMap.get(l.leaveType) || l.leaveType;
            typeStats[typeName] = (typeStats[typeName] || 0) + 1;
        });

        const totalLeaves = leavesForStats.length;
        const formattedTypeStats = Object.entries(typeStats)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([label, value]) => ({
                label,
                value: totalLeaves > 0 ? Math.round(((value as number) / totalLeaves) * 100) : 0,
                color: '#6366F1'
            }));

        return NextResponse.json({
            stats: {
                totalEmployees,
                pending: pendingRequests,
                approvedToday,
                activeLeavesToday
            },
            pendingLeaves: formattedPendingLeaves,
            whoIsOut: formattedWhoIsOut,
            departmentStats: formattedDeptStats,
            leaveTypeStats: formattedTypeStats
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}
