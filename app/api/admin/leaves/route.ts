import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';

// GET all leave requests for admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const leaveType = searchParams.get('leaveType');
    const company = searchParams.get('company');
    const department = searchParams.get('department');
    const section = searchParams.get('section');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    const where: any = {};

    // Filter by status
    if (status && status !== 'all') {
      // Include both 'pending' and 'in_progress' for pending filter
      if (status === 'pending') {
        where.status = { in: ['pending', 'in_progress'] };
      } else {
        where.status = status;
      }
    }

    // Filter by leave type
    if (leaveType && leaveType !== 'all') {
      where.leaveType = leaveType;
    }

    // Filter by date range
    if (startDate) {
      where.startDate = {
        ...where.startDate,
        gte: new Date(startDate),
      };
    }
    if (endDate) {
      where.endDate = {
        ...where.endDate,
        lte: new Date(endDate),
      };
    }

    // Filter by user's company/department/section
    if (company && company !== 'all') {
      where.user = {
        ...where.user,
        company,
      };
    }
    if (department && department !== 'all') {
      where.user = {
        ...where.user,
        department,
      };
    }
    if (section && section !== 'all') {
      where.user = {
        ...where.user,
        section,
      };
    }

    // Search by employee name or ID
    if (search) {
      where.user = {
        ...where.user,
        OR: [
          { employeeId: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
        ],
      };
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            company: true,
            department: true,
            section: true,
            position: true,
            avatar: true,
          },
        },
        approvals: {
          orderBy: { level: 'asc' },
          include: {
            approver: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
            actedBy: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
        attachments: true,
      },
    });

    // Get department and section names
    const [departments, sections, leaveTypes] = await Promise.all([
      prisma.department.findMany({ select: { code: true, name: true } }),
      prisma.section.findMany({ select: { code: true, name: true } }),
      prisma.leaveType.findMany({ select: { code: true, name: true } }),
    ]);

    const deptMap = new Map(departments.map(d => [d.code, d.name]));
    const sectionMap = new Map(sections.map(s => [s.code, s.name]));
    const leaveTypeMap = new Map(leaveTypes.map(lt => [lt.code, lt.name]));

    // Add names to leaves
    const leavesWithNames = leaves.map(leave => ({
      ...leave,
      leaveCode: leave.leaveCode || `LV${String(leave.id).padStart(6, '0')}`,
      leaveTypeName: leaveTypeMap.get(leave.leaveType) || leave.leaveType,
      user: {
        ...leave.user,
        departmentName: deptMap.get(leave.user.department) || leave.user.department,
        sectionName: leave.user.section ? (sectionMap.get(leave.user.section) || leave.user.section) : null,
      },
    }));

    // Calculate stats based on same filters but without status filter (for tab counts)
    const whereWithoutStatus = { ...where };
    delete whereWithoutStatus.status;

    const allFilteredLeaves = await prisma.leaveRequest.findMany({
      where: whereWithoutStatus,
      select: { status: true },
    });

    const stats = {
      total: allFilteredLeaves.length,
      pending: allFilteredLeaves.filter(l => l.status === 'pending' || l.status === 'in_progress').length,
      approved: allFilteredLeaves.filter(l => l.status === 'approved').length,
      rejected: allFilteredLeaves.filter(l => l.status === 'rejected').length,
      cancelled: allFilteredLeaves.filter(l => l.status === 'cancelled').length,
    };

    return NextResponse.json({ leaves: leavesWithNames, stats });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaves' },
      { status: 500 }
    );
  }
}
