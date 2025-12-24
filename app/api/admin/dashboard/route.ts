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

        const searchParams = request.nextUrl.searchParams;
        const companyCode = searchParams.get('company');
        const deptCode = searchParams.get('dept');
        const sectionCode = searchParams.get('section');
        const selectedYear = parseInt(searchParams.get('year') || today.getFullYear().toString());

        const userFilter = companyCode || deptCode || sectionCode ? {
            ...(companyCode ? { company: companyCode } : {}),
            ...(deptCode ? { department: deptCode } : {}),
            ...(sectionCode ? { section: sectionCode } : {})
        } : null;

        // 1. Stats
        const [
            totalEmployees,
            pendingRequests,
            approvedToday,
            activeLeavesToday
        ] = await Promise.all([
            prisma.user.count({
                where: {
                    isActive: true,
                    ...(userFilter ? userFilter : {})
                }
            }),
            prisma.leaveRequest.count({
                where: {
                    status: 'pending',
                    ...(userFilter ? { user: userFilter } : {})
                }
            }),
            prisma.leaveRequest.count({
                where: {
                    status: 'approved',
                    updatedAt: {
                        gte: today,
                        lt: tomorrow
                    },
                    ...(userFilter ? { user: userFilter } : {})
                }
            }),
            // Count leave requests starting today
            prisma.leaveRequest.count({
                where: {
                    startDate: {
                        gte: today,
                        lt: tomorrow
                    },
                    ...(userFilter ? { user: userFilter } : {})
                }
            })
        ]);

        // 2. Pending Leaves (Recent 5)
        const recentPendingLeaves = await prisma.leaveRequest.findMany({
            where: {
                status: 'pending',
                ...(userFilter ? { user: userFilter } : {})
            },
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
                },
                ...(userFilter ? { user: userFilter } : {})
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
                status: 'approved',
                startDate: {
                    gte: new Date(selectedYear, 0, 1),
                    lte: new Date(selectedYear, 11, 31, 23, 59, 59)
                },
                ...(userFilter ? { user: userFilter } : {})
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

        // Get Company names mapping
        const companies = await prisma.company.findMany({ select: { code: true, name: true } });

        // Get Department names mapping
        const departments = await prisma.department.findMany({ select: { code: true, name: true } });
        const deptMap = new Map(departments.map(d => [d.code, d.name]));

        const allSections = await prisma.section.findMany({
            select: {
                code: true,
                name: true,
                department: { select: { code: true } }
            }
        });

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

        // 6. Stats for Analytics (Leave types comparison)
        const yearStart = new Date(selectedYear, 0, 1);
        const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59);
        const prevYearStart = new Date(selectedYear - 1, 0, 1);
        const prevYearEnd = new Date(selectedYear - 1, 11, 31, 23, 59, 59);

        const [leavesCurrent, leavesPrevious] = await Promise.all([
            prisma.leaveRequest.findMany({
                where: {
                    status: 'approved',
                    startDate: { gte: yearStart, lte: yearEnd },
                    ...(userFilter ? { user: userFilter } : {})
                },
                select: { leaveType: true, totalDays: true }
            }),
            prisma.leaveRequest.findMany({
                where: {
                    status: 'approved',
                    startDate: { gte: prevYearStart, lte: prevYearEnd },
                    ...(userFilter ? { user: userFilter } : {})
                },
                select: { leaveType: true, totalDays: true }
            })
        ]);

        const currentYearStats: Record<string, number> = {};
        leavesCurrent.forEach(l => {
            const typeName = leaveTypeMap.get(l.leaveType) || l.leaveType;
            currentYearStats[typeName] = (currentYearStats[typeName] || 0) + (l.totalDays || 0);
        });

        const prevYearStats: Record<string, number> = {};
        leavesPrevious.forEach(l => {
            const typeName = leaveTypeMap.get(l.leaveType) || l.leaveType;
            prevYearStats[typeName] = (prevYearStats[typeName] || 0) + (l.totalDays || 0);
        });

        const allLeaveTypes = Array.from(new Set([
            ...Object.keys(currentYearStats),
            ...Object.keys(prevYearStats)
        ]));

        const comparisonStats = allLeaveTypes.map(type => ({
            type,
            current: currentYearStats[type] || 0,
            previous: prevYearStats[type] || 0
        }));

        // Get available years
        const oldestLeave = await prisma.leaveRequest.findFirst({
            orderBy: { startDate: 'asc' },
            select: { startDate: true }
        });
        const currentYearNum = today.getFullYear();
        const startYearNum = oldestLeave ? oldestLeave.startDate.getFullYear() : currentYearNum;
        const availableYears = [];
        for (let y = currentYearNum; y >= startYearNum; y--) {
            availableYears.push(y);
        }

        return NextResponse.json({
            stats: {
                totalEmployees,
                pending: pendingRequests,
                approvedToday,
                activeLeavesToday
            },
            pendingLeaves: formattedPendingLeaves,
            whoIsOut: formattedWhoIsOut,
            comparisonStats,
            activities: formattedActivities,
            topLeaveTakers: formattedTopLeaveTakers,
            filterOptions: {
                companies: companies.map(c => ({ code: c.code, name: c.name })),
                departments: departments.map(d => ({ code: d.code, name: d.name })),
                sections: allSections.map(s => ({
                    code: s.code,
                    name: s.name,
                    departmentCode: s.department.code
                })),
                availableYears
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}
