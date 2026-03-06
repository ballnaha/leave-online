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

        const searchParams = request.nextUrl.searchParams;
        const companyCode = searchParams.get('company');
        const deptCode = searchParams.get('dept');
        const sectionCode = searchParams.get('section');
        const search = searchParams.get('search');
        const selectedYear = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const sortBy = searchParams.get('sortBy') || 'employeeId'; // 'total', 'employeeId', or leave type name
        const sortOrder = searchParams.get('sortOrder') || 'asc'; // 'asc' or 'desc'

        // 1. Fetch Users with filters
        const whereClause: any = {
            isActive: true,
        };

        if (companyCode && companyCode !== 'all') {
            whereClause.company = companyCode;
        }
        if (deptCode && deptCode !== 'all') {
            whereClause.department = deptCode;
        }
        if (sectionCode && sectionCode !== 'all') {
            whereClause.section = sectionCode;
        }
        if (search) {
            const trimmedSearch = search.trim();
            const searchParts = trimmedSearch.split(/\s+/);

            if (searchParts.length > 1) {
                // If there's a space, try matching parts across firstName and lastName
                whereClause.OR = [
                    {
                        AND: [
                            { firstName: { contains: searchParts[0] } },
                            { lastName: { contains: searchParts.slice(1).join(' ') } },
                        ]
                    },
                    {
                        AND: [
                            { firstName: { contains: searchParts.slice(0, -1).join(' ') } },
                            { lastName: { contains: searchParts[searchParts.length - 1] } },
                        ]
                    },
                    { employeeId: { contains: trimmedSearch } },
                    { firstName: { contains: trimmedSearch } },
                    { lastName: { contains: trimmedSearch } },
                ];
            } else {
                whereClause.OR = [
                    { firstName: { contains: trimmedSearch } },
                    { lastName: { contains: trimmedSearch } },
                    { employeeId: { contains: trimmedSearch } },
                ];
            }
        }

        // Fetch all users matching the filter to sort correctly across pages
        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                department: true,
                section: true,
                avatar: true,
            },
        });

        const userIds = users.map(u => u.id);

        // 2. Fetch approved leave requests for these users in the selected year
        const leaveRequests = await prisma.leaveRequest.findMany({
            where: {
                userId: { in: userIds },
                status: 'approved',
                startDate: {
                    gte: new Date(selectedYear, 0, 1),
                    lte: new Date(selectedYear, 11, 31, 23, 59, 59),
                },
            },
            select: {
                userId: true,
                leaveType: true,
                totalDays: true,
            },
        });

        // 3. Fetch leave types for labels
        const leaveTypes = await prisma.leaveType.findMany({
            where: { isActive: true },
            select: { code: true, name: true }
        });
        const leaveTypeMap = new Map(leaveTypes.map(lt => [lt.code, lt.name]));
        const allLeaveTypeNames = Array.from(leaveTypeMap.values());

        // 4. Calculate stats per user
        const statsMap = new Map();
        userIds.forEach(id => {
            statsMap.set(id, { total: 0, byType: {} });
        });

        leaveRequests.forEach(req => {
            const userStats = statsMap.get(req.userId);
            if (userStats) {
                const typeName = leaveTypeMap.get(req.leaveType) || req.leaveType;
                userStats.total += req.totalDays;
                userStats.byType[typeName] = (userStats.byType[typeName] || 0) + req.totalDays;
            }
        });

        // 5. Get Department/Section names
        const departments = await prisma.department.findMany({ select: { code: true, name: true } });
        const deptNameMap = new Map(departments.map(d => [d.code, d.name]));

        const sections = await prisma.section.findMany({ select: { code: true, name: true } });
        const sectionNameMap = new Map(sections.map(s => [s.code, s.name]));

        let results = users.map(user => {
            const userStats = statsMap.get(user.id);
            return {
                id: user.id,
                employeeId: user.employeeId,
                name: `${user.firstName} ${user.lastName}`,
                department: deptNameMap.get(user.department) || user.department,
                section: sectionNameMap.get(user.section || '') || user.section || '-',
                avatar: user.avatar,
                totalDays: userStats.total,
                leaveDetails: userStats.byType,
            };
        });

        // 6. Sort results
        results.sort((a, b) => {
            let valA: any, valB: any;
            if (sortBy === 'total') {
                valA = a.totalDays;
                valB = b.totalDays;
            } else if (sortBy === 'employeeId') {
                valA = a.employeeId;
                valB = b.employeeId;
            } else {
                // Sorting by specific leave type
                valA = a.leaveDetails[sortBy] || 0;
                valB = b.leaveDetails[sortBy] || 0;
            }

            if (sortOrder === 'asc') return valA > valB ? 1 : -1;
            return valA < valB ? 1 : -1;
        });

        const total = results.length;
        const pagedResults = results.slice((page - 1) * limit, page * limit);

        return NextResponse.json({
            data: pagedResults,
            leaveTypes: allLeaveTypeNames,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching employee leave stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch employee leave stats' },
            { status: 500 }
        );
    }
}
