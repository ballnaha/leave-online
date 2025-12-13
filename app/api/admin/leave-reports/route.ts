import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';

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
    if (!session || !isAdminRole(session.user.role)) {
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

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    // Filter by search (employee name or ID)
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

    // Filter by company (user's department belongs to company)
    if (company && company !== 'all') {
      where.user = {
        ...where.user,
        company,
      };
    }

    // Filter by department
    if (department && department !== 'all') {
      where.user = {
        ...where.user,
        department,
      };
    }

    // Filter by section
    if (section && section !== 'all') {
      where.user = {
        ...where.user,
        section,
      };
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

    const [leaveRequests, leaveTypes, companies, departments, sections] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          startDate: true,
          endDate: true,
          totalDays: true,
          leaveType: true,
          reason: true,
          status: true,
          rejectReason: true,
          cancelReason: true,
          approvals: {
            where: { comment: { not: null } },
            select: {
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
      prisma.department.findMany({ where: { isActive: true }, select: { code: true, name: true, company: true }, orderBy: { name: 'asc' } }),
      prisma.section.findMany({
        where: { isActive: true },
        include: {
          department: { select: { code: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const leaveTypeMap = new Map(leaveTypes.map((lt) => [lt.code, lt.name]));
    const deptMap = new Map(departments.map((d) => [d.code, d.name]));
    const sectionMap = new Map(sections.map((s: any) => [s.code, s.name]));
    const sectionDeptMap = new Map(sections.map((s: any) => [s.code, s.department?.code]));

    // Calculate stats
    const stats = {
      total: leaveRequests.length,
      totalDays: leaveRequests.reduce((sum, lr) => sum + lr.totalDays, 0),
      pending: leaveRequests.filter((lr) => (lr.status || '').toLowerCase() === 'pending' || (lr.status || '').toLowerCase() === 'in_progress').length,
      approved: leaveRequests.filter((lr) => (lr.status || '').toLowerCase() === 'approved').length,
      rejected: leaveRequests.filter((lr) => (lr.status || '').toLowerCase() === 'rejected').length,
      cancelled: leaveRequests.filter((lr) => (lr.status || '').toLowerCase() === 'cancelled').length,
    };

    const rows = leaveRequests.map((lr: any) => {
      const leaveTypeName = leaveTypeMap.get(lr.leaveType) || lr.leaveType;
      const normalizedStatus = (lr.status || '').toLowerCase();
      const statusLabel = statusLabelMap[normalizedStatus] || statusLabelMap[lr.status] || lr.status;
      
      // Combine approval comments with reject/cancel reason (include approver name)
      const approvalComments = (lr.approvals || [])
        .filter((a: any) => a.comment && a.comment.trim())
        .map((a: any) => {
          // Use actedBy first, then approver as fallback
          const person = a.actedBy || a.approver;
          const name = person ? `${person.firstName}` : `L${a.level}`;
          return `[${name}] ${a.comment.trim()}`;
        })
        .join('; ');
      const note = lr.rejectReason || lr.cancelReason || approvalComments || '';
      const departmentName = deptMap.get(lr.user.department) || lr.user.department || '-';
      const sectionName = lr.user.section ? (sectionMap.get(lr.user.section) || lr.user.section) : '-';

      return {
        id: lr.id,
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
        note,
      };
    });

    // Return company/department/section lists for filters
    const companyList = companies.map((c) => ({ code: c.code, name: c.name }));
    const departmentList = departments.map((d: any) => ({ code: d.code, name: d.name, companyCode: d.company }));
    const sectionList = sections.map((s: any) => ({ code: s.code, name: s.name, departmentCode: s.department?.code }));

    return NextResponse.json({ rows, stats, companies: companyList, departments: departmentList, sections: sectionList });
  } catch (error) {
    console.error('Error fetching leave reports:', error);
    return NextResponse.json({ error: 'Failed to fetch leave reports' }, { status: 500 });
  }
}
