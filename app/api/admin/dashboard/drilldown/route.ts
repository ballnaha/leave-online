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
        const leaveType = searchParams.get('leaveType'); // Leave type name (Thai)
        const companyCode = searchParams.get('company');
        const deptCode = searchParams.get('dept');
        const sectionCode = searchParams.get('section');
        const selectedYear = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

        if (!leaveType) {
            return NextResponse.json({ error: 'leaveType is required' }, { status: 400 });
        }

        // Get leave type code from name
        const leaveTypeRecord = await prisma.leaveType.findFirst({
            where: { name: leaveType },
            select: { code: true, name: true }
        });

        if (!leaveTypeRecord) {
            return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
        }

        const userFilter = companyCode || deptCode || sectionCode ? {
            ...(companyCode ? { company: companyCode } : {}),
            ...(deptCode ? { department: deptCode } : {}),
            ...(sectionCode ? { section: sectionCode } : {})
        } : null;

        const yearStart = new Date(selectedYear, 0, 1);
        const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59);

        // Get all approved leaves for this leave type in the selected year
        const leaves = await prisma.leaveRequest.findMany({
            where: {
                status: 'approved',
                leaveType: leaveTypeRecord.code,
                startDate: { gte: yearStart, lte: yearEnd },
                ...(userFilter ? { user: userFilter } : {})
            },
            select: {
                totalDays: true,
                user: {
                    select: {
                        department: true,
                        section: true
                    }
                }
            }
        });

        // Get department names mapping
        const departments = await prisma.department.findMany({
            select: { code: true, name: true }
        });
        const deptMap = new Map(departments.map(d => [d.code, d.name]));

        // Aggregate by department
        const deptStats: Record<string, { code: string; name: string; totalDays: number }> = {};

        leaves.forEach(leave => {
            const deptCode = leave.user.department;
            if (!deptStats[deptCode]) {
                deptStats[deptCode] = {
                    code: deptCode,
                    name: deptMap.get(deptCode) || deptCode,
                    totalDays: 0
                };
            }
            deptStats[deptCode].totalDays += leave.totalDays || 0;
        });

        // Convert to array and sort by totalDays descending
        const result = Object.values(deptStats)
            .sort((a, b) => b.totalDays - a.totalDays);

        // Calculate total
        const totalDays = result.reduce((sum, dept) => sum + dept.totalDays, 0);

        return NextResponse.json({
            leaveType: leaveTypeRecord.name,
            year: selectedYear,
            totalDays,
            departments: result
        });

    } catch (error) {
        console.error('Error fetching drilldown data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch drilldown data' },
            { status: 500 }
        );
    }
}
