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
        const departmentCode = searchParams.get('department'); // Department code to drill into
        const companyCode = searchParams.get('company');
        const selectedYear = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

        if (!leaveType) {
            return NextResponse.json({ error: 'leaveType is required' }, { status: 400 });
        }

        if (!departmentCode) {
            return NextResponse.json({ error: 'department is required' }, { status: 400 });
        }

        // Get leave type code from name
        const leaveTypeRecord = await prisma.leaveType.findFirst({
            where: { name: leaveType },
            select: { code: true, name: true }
        });

        if (!leaveTypeRecord) {
            return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
        }

        // Get department name
        const department = await prisma.department.findUnique({
            where: { code: departmentCode },
            select: { code: true, name: true }
        });

        const userFilter = {
            department: departmentCode,
            ...(companyCode ? { company: companyCode } : {}),
        };

        const yearStart = new Date(selectedYear, 0, 1);
        const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59);

        // Get all approved leaves for this leave type, department, in the selected year
        const leaves = await prisma.leaveRequest.findMany({
            where: {
                status: 'approved',
                leaveType: leaveTypeRecord.code,
                startDate: { gte: yearStart, lte: yearEnd },
                user: userFilter
            },
            select: {
                totalDays: true,
                user: {
                    select: {
                        section: true
                    }
                }
            }
        });

        // Get section names mapping
        const sections = await prisma.section.findMany({
            select: { code: true, name: true }
        });
        const sectionMap = new Map(sections.map(s => [s.code, s.name]));

        // Aggregate by section
        const sectionStats: Record<string, { code: string; name: string; totalDays: number }> = {};

        leaves.forEach(leave => {
            const sectionCode = leave.user.section || 'OTHER';
            const sectionName = sectionCode === 'OTHER' ? 'อื่น ๆ' : (sectionMap.get(sectionCode) || sectionCode);

            if (!sectionStats[sectionCode]) {
                sectionStats[sectionCode] = {
                    code: sectionCode,
                    name: sectionName,
                    totalDays: 0
                };
            }
            sectionStats[sectionCode].totalDays += leave.totalDays || 0;
        });

        // Handle users with no section (null/empty) -> group to "อื่น ๆ"
        // Already handled above by using 'OTHER' as key

        // Convert to array and sort by totalDays descending
        const result = Object.values(sectionStats)
            .sort((a, b) => b.totalDays - a.totalDays);

        // Calculate total
        const totalDays = result.reduce((sum, section) => sum + section.totalDays, 0);

        return NextResponse.json({
            leaveType: leaveTypeRecord.name,
            department: {
                code: departmentCode,
                name: department?.name || departmentCode
            },
            year: selectedYear,
            totalDays,
            sections: result
        });

    } catch (error) {
        console.error('Error fetching section drilldown data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch section drilldown data' },
            { status: 500 }
        );
    }
}
