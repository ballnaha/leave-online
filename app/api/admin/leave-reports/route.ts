import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

const statusLabelMap: Record<string, string> = {
  approved: 'อนุมัติ',
  rejected: 'ไม่อนุมัติ',
  pending: 'รออนุมัติ',
  in_progress: 'กำลังดำเนินการ',
  cancelled: 'ยกเลิก',
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, PERMISSIONS.CAN_VIEW_REPORTS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');
    const search = searchParams.get('search');
    const company = searchParams.get('company');
    const department = searchParams.get('department');
    const section = searchParams.get('section');

    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const page = pageParam ? Number(pageParam) : 1;
    const limit = limitParam ? Number(limitParam) : 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    const userConditions: any[] = [];

    // --- Scoping Logic for Non-Admin Roles ---
    let allowedDepartments: string[] = [];
    let allowedSections: string[] = [];
    let isGlobalAdmin = isAdminRole(session.user.role);

    if (!isGlobalAdmin) {
      // Fetch user's managed scope
      const currentUser = await prisma.user.findUnique({
        where: { employeeId: session.user.employeeId },
        select: { department: true, section: true, managedDepartments: true, managedSections: true }
      });

      if (currentUser) {
        // Use managedDepartments if exists, otherwise fallback to their own department
        if (currentUser.managedDepartments) {
          allowedDepartments = currentUser.managedDepartments.split(',').map(d => d.trim()).filter(Boolean);
        } else if (currentUser.department) {
          allowedDepartments = [currentUser.department];
        }

        if (currentUser.managedSections) {
          allowedSections = currentUser.managedSections.split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      // Enforce the scope in the WHERE clause
      const scopeConditions: any[] = [];
      if (allowedSections.length > 0) {
        scopeConditions.push({ section: { in: allowedSections } });
      }
      if (allowedDepartments.length > 0) {
        scopeConditions.push({ department: { in: allowedDepartments } });
      }

      if (scopeConditions.length > 0) {
        userConditions.push({ OR: scopeConditions });
      } else {
        // If no scope found for a non-admin, they should see nothing or just themselves
        userConditions.push({ employeeId: session.user.employeeId });
      }
    }
    // ----------------------------------------

    if (status && status !== 'all') {
      where.status = status;
    }

    // Exclude forced annual leave (FL) from the main report rows / stats.
    // We compute FL summary separately and return it as flStats.
    where.leaveCode = { ...(where.leaveCode || {}), not: { startsWith: 'FL' } };

    // Filter by search (employee name or ID)
    if (search) {
      userConditions.push({
        OR: [
          { employeeId: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
        ],
      });
    }

    // Filter by company (user's department belongs to company)
    if (company && company !== 'all') {
      userConditions.push({ company });
    }

    // Filter by department
    if (department && department !== 'all') {
      userConditions.push({ department });
    }

    // Filter by section
    if (section && section !== 'all') {
      userConditions.push({ section });
    }

    if (userConditions.length > 0) {
      where.user = { AND: userConditions };
    }

    // Filter by month/year using startDate (month=0 means all months)
    if (monthParam && Number(monthParam) !== 0) {
      const month = Number(monthParam);
      const now = new Date();
      const year = yearParam ? Number(yearParam) : now.getFullYear();
      if (!Number.isNaN(month) && month >= 1 && month <= 12 && !Number.isNaN(year)) {
        const rangeStart = new Date(year, month - 1, 1);
        const rangeEnd = new Date(year, month, 1);
        where.startDate = { ...where.startDate, gte: rangeStart, lt: rangeEnd };
      }
    } else if (yearParam) {
      // Filter by year only when month is 0 (all months)
      const year = Number(yearParam);
      if (!Number.isNaN(year)) {
        const rangeStart = new Date(year, 0, 1);
        const rangeEnd = new Date(year + 1, 0, 1);
        where.startDate = { ...where.startDate, gte: rangeStart, lt: rangeEnd };
      }
    }

    if (startDate) {
      where.startDate = { ...where.startDate, gte: new Date(startDate) };
    }
    if (endDate) {
      where.endDate = { ...where.endDate, lte: new Date(endDate) };
    }

    // Build a parallel WHERE for FL-only (same scope/date filters, but leaveCode starts with FL)
    const flWhere: any = {
      ...where,
      leaveCode: { startsWith: 'FL' },
    };
    // Remove the NOT-FL constraint from flWhere (it was set above on `where`)
    delete flWhere.leaveCode;  // will be overwritten below
    flWhere.leaveCode = { startsWith: 'FL' };

    // We need total count for ALL matching leaves for stats, but we only return a subset for rows
    const [allMatchingLeavesForStats, flRows] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        select: { totalDays: true, status: true },
      }),
      prisma.leaveRequest.findMany({
        where: flWhere,
        select: { userId: true, totalDays: true, status: true },
      }),
    ]);

    // FL summary stats
    const flApprovedRows = flRows.filter((r: any) => (r.status || '').toLowerCase() === 'approved');
    const flStats = {
      totalRequests: flRows.length,
      uniqueEmployees: new Set(flRows.map((r: any) => r.userId)).size,
      approvedDays: flApprovedRows.reduce((sum: number, r: any) => sum + r.totalDays, 0),
    };

    const [leaveRequests, leaveTypes, companies, departments, sections] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
        skip: limitParam ? skip : undefined, // Only paginate if limit is provided
        take: limitParam ? limit : undefined,
        select: {
          id: true,
          leaveCode: true,
          startDate: true,
          endDate: true,
          totalDays: true,
          leaveType: true,
          reason: true,
          status: true,
          rejectReason: true,
          cancelReason: true,
          approvals: {
            select: {
              status: true,
              comment: true,
              level: true,
              actedBy: { select: { firstName: true, lastName: true } },
              approver: { select: { firstName: true, lastName: true } },
            },
            orderBy: { level: 'asc' },
          },
          user: {
            select: {
              employeeId: true,
              firstName: true,
              lastName: true,
              position: true,
              department: true,
              section: true,
            },
          },
        },
      }),
      prisma.leaveType.findMany({ select: { code: true, name: true } }),
      prisma.company.findMany({ where: { isActive: true }, select: { code: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.department.findMany({ 
        where: { 
          isActive: true,
          ...(allowedDepartments.length > 0 && !isGlobalAdmin ? { code: { in: allowedDepartments } } : {})
        }, 
        select: { code: true, name: true, company: true }, 
        orderBy: { name: 'asc' } 
      }),
      prisma.section.findMany({
        where: { 
          isActive: true,
          // Scope by department if non-admin
          ...(allowedDepartments.length > 0 && !isGlobalAdmin ? { department: { code: { in: allowedDepartments } } } : {}),
          // Or specifically allowed sections
          ...(allowedSections.length > 0 && !isGlobalAdmin ? { code: { in: allowedSections } } : {})
        },
        include: {
          department: { select: { code: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const leaveTypeMap = new Map(leaveTypes.map((lt) => [lt.code, lt.name]));
    const deptMap = new Map(departments.map((d) => [d.code, d.name]));
    const sectionMap = new Map(sections.map((s: any) => [s.code, s.name]));

    // Calculate stats using allMatchingLeavesForStats
    const stats = {
      total: allMatchingLeavesForStats.length,
      totalDays: allMatchingLeavesForStats.reduce(
        (sum, lr) => ((lr.status || '').toLowerCase() === 'approved' ? sum + lr.totalDays : sum),
        0,
      ),
      pending: allMatchingLeavesForStats.filter((lr) => (lr.status || '').toLowerCase() === 'pending' || (lr.status || '').toLowerCase() === 'in_progress').length,
      approved: allMatchingLeavesForStats.filter((lr) => (lr.status || '').toLowerCase() === 'approved').length,
      rejected: allMatchingLeavesForStats.filter((lr) => (lr.status || '').toLowerCase() === 'rejected').length,
      cancelled: allMatchingLeavesForStats.filter((lr) => (lr.status || '').toLowerCase() === 'cancelled').length,
    };

    const rows = leaveRequests.map((lr: any) => {
      const leaveTypeName = leaveTypeMap.get(lr.leaveType) || lr.leaveType;
      const normalizedStatus = (lr.status || '').toLowerCase();
      const statusLabel = statusLabelMap[normalizedStatus] || statusLabelMap[lr.status] || lr.status;
      
      const approvalComments = (lr.approvals || [])
        .filter((a: any) => a.comment && a.comment.trim())
        .map((a: any) => {
          const person = a.actedBy || a.approver;
          const name = person ? `${person.firstName}` : `L${a.level}`;
          return `[${name}] ${a.comment.trim()}`;
        })
        .join('; ');
      const note = lr.rejectReason || lr.cancelReason || approvalComments || '';

      // Find the current pending approver (lowest-level approval step still pending)
      const currentPendingApproval = (lr.approvals || [])
        .filter((a: any) => (a.status || '').toLowerCase() === 'pending')
        .sort((a: any, b: any) => a.level - b.level)[0];
      const pendingApprover = currentPendingApproval
        ? `${currentPendingApproval.approver?.firstName || ''} ${currentPendingApproval.approver?.lastName || ''}`.trim()
        : null;
      const departmentName = deptMap.get(lr.user.department) || lr.user.department || '-';
      const sectionName = lr.user.section ? (sectionMap.get(lr.user.section) || lr.user.section) : '-';

      return {
        id: lr.id,
        leaveCode: lr.leaveCode || `L-${lr.id}`,
        employeeId: lr.user.employeeId,
        employeeName: `${lr.user.firstName} ${lr.user.lastName}`,
        position: lr.user.position || '-',
        department: departmentName,
        departmentCode: lr.user.department,
        section: sectionName,
        sectionCode: lr.user.section || '',
        startDate: lr.startDate.toISOString(),
        endDate: lr.endDate.toISOString(),
        totalDays: lr.totalDays,
        leaveTypeName,
        reason: lr.reason,
        status: normalizedStatus || lr.status,
        statusLabel,
        pendingApprover: pendingApprover || null,
        note,
      };
    });

    // Final lists for the response
    let finalCompanyList = companies.map((c) => ({ code: c.code, name: c.name }));
    let finalDepartmentList = departments.map((d: any) => ({ code: d.code, name: d.name, companyCode: d.company }));
    let finalSectionList = sections.map((s: any) => ({ code: s.code, name: s.name, departmentCode: s.department?.code }));

    return NextResponse.json({ 
      rows, 
      stats, 
      flStats,
      companies: finalCompanyList, 
      departments: finalDepartmentList, 
      sections: finalSectionList,
      pagination: {
        total: allMatchingLeavesForStats.length,
        page,
        limit,
        totalPages: Math.ceil(allMatchingLeavesForStats.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching leave reports:', error);
    return NextResponse.json({ error: 'Failed to fetch leave reports' }, { status: 500 });
  }
}
