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
            // Count leave requests starting today
            prisma.leaveRequest.count({
                where: {
                    startDate: {
                        gte: today,
                        lt: tomorrow
                    }
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

        // 3. Leave Requests Starting Today (Top 5)
        const whoIsOut = await prisma.leaveRequest.findMany({
            where: {
                startDate: {
                    gte: today,
                    lt: tomorrow
                }
            },
            take: 5,
            orderBy: { startDate: 'asc' },
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

        // 4. Recent Activities (Notification Logs)
        const recentActivities = await prisma.notificationLog.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        // 5. Top Leave Takers (Users with most leaves)
        const topLeaveTakers = await prisma.leaveRequest.groupBy({
            by: ['userId'],
            where: {
                status: 'approved'
            },
            _sum: {
                totalDays: true
            },
            orderBy: {
                _sum: {
                    totalDays: 'desc'
                }
            },
            take: 5
        });

        // Get user details for top leave takers
        const topLeaveTakerUserIds = topLeaveTakers.map(t => t.userId);
        const topLeaveTakerUsers = await prisma.user.findMany({
            where: { id: { in: topLeaveTakerUserIds } },
            select: { id: true, firstName: true, lastName: true, avatar: true, department: true }
        });
        const userMap = new Map(topLeaveTakerUsers.map(u => [u.id, u]));

        // Get Department names mapping
        const departments = await prisma.department.findMany({ select: { code: true, name: true } });
        const deptMap = new Map(departments.map(d => [d.code, d.name]));

        // Get LeaveType names mapping
        const leaveTypes = await prisma.leaveType.findMany({ select: { code: true, name: true } });
        const leaveTypeMap = new Map(leaveTypes.map(l => [l.code, l.name]));

        // Format Top Leave Takers
        const maxLeaveDays = topLeaveTakers[0]?._sum.totalDays || 1;
        const formattedTopLeaveTakers = topLeaveTakers.map(t => {
            const user = userMap.get(t.userId);
            return {
                id: t.userId.toString(),
                name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
                dept: user ? (deptMap.get(user.department) || user.department) : '',
                totalDays: t._sum.totalDays || 0,
                avatar: user?.avatar || null
            };
        });

        // Format Pending Leaves
        const formattedPendingLeaves = recentPendingLeaves.map(leave => ({
            id: leave.id,
            name: `${leave.user.firstName} ${leave.user.lastName}`,
            role: leave.user.position || 'Employee',
            type: leaveTypeMap.get(leave.leaveType) || leave.leaveType,
            days: leave.totalDays,
            dates: `${new Date(leave.startDate).getDate()} ${new Date(leave.startDate).toLocaleString('th-TH', { month: 'short' })}`,
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

        // Format Activities
        const formattedActivities = recentActivities.map(log => ({
            id: log.id.toString(),
            title: log.title,
            description: log.message,
            timestamp: new Date(log.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            category: log.type === 'LEAVE_REQUEST' ? 'leave' : (log.type === 'SYSTEM' ? 'system' : 'people')
        }));

        // 6. Department Stats (Approved leaves count by department)
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

        // 7. Leave Type Stats (actual count values)
        const typeStats: Record<string, number> = {};
        leavesForStats.forEach(l => {
            const typeName = leaveTypeMap.get(l.leaveType) || l.leaveType;
            typeStats[typeName] = (typeStats[typeName] || 0) + 1;
        });

        const sortedTypeStats = Object.entries(typeStats)
            .sort(([, a], [, b]) => (b as number) - (a as number));
        const maxTypeValue = sortedTypeStats[0]?.[1] || 1;
        
        const formattedTypeStats = sortedTypeStats.map(([label, value]) => ({
            label,
            value: value as number,
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
            leaveTypeStats: formattedTypeStats,
            activities: formattedActivities,
            topLeaveTakers: formattedTopLeaveTakers
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}
