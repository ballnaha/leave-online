import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/leaves/team-history - ดึงประวัติการลาทั้งหมดของลูกน้อง (พนักงานที่อยู่ในสายอนุมัติของตัวเอง)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const approverId = parseInt(session.user.id);
    const userRole = session.user.role;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;
    const status = searchParams.get('status') || 'all'; // all, approved, rejected, pending, cancelled

    // Fetch departments, sections and companies for name lookup
    const [departments, sections, companies, leaveTypes] = await Promise.all([
      prisma.department.findMany({ select: { code: true, name: true } }),
      prisma.section.findMany({ select: { code: true, name: true } }),
      prisma.company.findMany({ select: { code: true, name: true } }),
      prisma.leaveType.findMany({ select: { code: true, name: true } }),
    ]);
    const deptMap = new Map(departments.map(d => [d.code, d.name]));
    const sectMap = new Map(sections.map(s => [s.code, s.name]));
    const companyMap = new Map(companies.map(c => [c.code, c.name]));
    const leaveTypeMap = new Map(leaveTypes.map(lt => [lt.code, lt.name]));

    // หา user IDs ที่เป็นลูกน้อง (พนักงานที่มี approverId ในสายอนุมัติ)
    let subordinateIds: number[] = [];

    if (userRole === 'admin' || userRole === 'hr_manager' || userRole === 'hr') {
      // Admin/HR เห็นทุกคน - ไม่ต้อง filter
      const allUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      subordinateIds = allUsers.map(u => u.id);
    } else {
      // หาลูกน้องจาก UserApprovalFlow - พนักงานที่มี approver เป็นเรา
      const approvalFlows = await prisma.userApprovalFlow.findMany({
        where: {
          approverId: approverId,
          isActive: true,
        },
        select: { userId: true },
      });
      subordinateIds = [...new Set(approvalFlows.map(af => af.userId))];
    }

    if (subordinateIds.length === 0) {
      return NextResponse.json({
        data: [],
        counts: { total: 0, approved: 0, rejected: 0, pending: 0, cancelled: 0 },
        summary: [],
        employeeSummary: [],
      });
    }

    // Base where clause (year + subordinates only, no status filter)
    const baseWhereClause: Record<string, unknown> = {
      userId: { in: subordinateIds },
    };

    // Filter by year
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);
    let dateFilter: { gte: Date; lte: Date } = {
      gte: startOfYear,
      lte: endOfYear,
    };

    // Filter by month if specified
    if (month && month >= 1 && month <= 12) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);
      dateFilter = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }
    baseWhereClause.startDate = dateFilter;

    // 1. First, get ALL leaves (without status filter) to calculate accurate counts
    const allLeaveRequests = await prisma.leaveRequest.findMany({
      where: baseWhereClause,
      select: {
        id: true,
        status: true,
      },
    });

    // Calculate counts from ALL data (not filtered by status)
    const counts = {
      total: allLeaveRequests.length,
      approved: allLeaveRequests.filter((r) => r.status === 'approved').length,
      rejected: allLeaveRequests.filter((r) => r.status === 'rejected').length,
      pending: allLeaveRequests.filter((r) => ['pending', 'in_progress'].includes(r.status)).length,
      cancelled: allLeaveRequests.filter((r) => r.status === 'cancelled').length,
    };

    // 2. Now create where clause WITH status filter for actual data
    const whereClause: Record<string, unknown> = {
      ...baseWhereClause,
    };

    // Filter by status
    if (status !== 'all') {
      if (status === 'pending') {
        whereClause.status = { in: ['pending', 'in_progress'] };
      } else {
        whereClause.status = status;
      }
    }

    // ดึง leave requests ของลูกน้องทั้งหมด
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            position: true,
            company: true,
            department: true,
            section: true,
            shift: true,
            avatar: true,
          },
        },
        attachments: true,
        approvals: {
          orderBy: { level: 'asc' },
          include: {
            approver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                position: true,
              },
            },
            actedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                position: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // จัดรูปแบบข้อมูล
    const result = leaveRequests.map((leave) => ({
      id: leave.id,
      leaveCode: leave.leaveCode,
      leaveType: leave.leaveType,
      leaveTypeName: leaveTypeMap.get(leave.leaveType) || leave.leaveType,
      startDate: leave.startDate,
      startTime: leave.startTime,
      endDate: leave.endDate,
      endTime: leave.endTime,
      totalDays: leave.totalDays,
      reason: leave.reason,
      status: leave.status,
      currentLevel: leave.currentLevel,
      createdAt: leave.createdAt,
      cancelReason: leave.cancelReason,
      cancelledAt: leave.cancelledAt,
      finalApprovedAt: leave.finalApprovedAt,
      finalRejectedAt: leave.finalRejectedAt,
      user: {
        ...leave.user,
        company: companyMap.get(leave.user.company) || leave.user.company,
        department: deptMap.get(leave.user.department) || leave.user.department,
        section: leave.user.section ? (sectMap.get(leave.user.section) || leave.user.section) : null,
      },
      attachments: leave.attachments,
      approvalHistory: leave.approvals,
    }));

    // สรุปจำนวนวันลาตามประเภท (เฉพาะ approved - สำหรับ summary)
    const summaryMap: Record<string, { code: string; name: string; totalDays: number; count: number }> = {};
    result
      .filter(r => r.status === 'approved')
      .forEach(r => {
        if (!summaryMap[r.leaveType]) {
          summaryMap[r.leaveType] = {
            code: r.leaveType,
            name: r.leaveTypeName,
            totalDays: 0,
            count: 0,
          };
        }
        summaryMap[r.leaveType].totalDays += r.totalDays;
        summaryMap[r.leaveType].count += 1;
      });

    const summary = Object.values(summaryMap).sort((a, b) => b.totalDays - a.totalDays);

    // สรุปจำนวนตามพนักงาน (ตาม data ที่ filter แล้ว - รวมทุก status ที่เลือก)
    const employeeSummaryMap: Record<number, {
      user: typeof result[0]['user'];
      totalDays: number;
      leaveCount: number;
      byType: Record<string, number>;
    }> = {};

    // คำนวณจาก result ที่ filter ตาม status แล้ว (ไม่ใช่เฉพาะ approved)
    result.forEach(r => {
        if (!employeeSummaryMap[r.user.id]) {
          employeeSummaryMap[r.user.id] = {
            user: r.user,
            totalDays: 0,
            leaveCount: 0,
            byType: {},
          };
        }
        employeeSummaryMap[r.user.id].totalDays += r.totalDays;
        employeeSummaryMap[r.user.id].leaveCount += 1;
        employeeSummaryMap[r.user.id].byType[r.leaveType] = 
          (employeeSummaryMap[r.user.id].byType[r.leaveType] || 0) + r.totalDays;
      });

    const employeeSummary = Object.values(employeeSummaryMap)
      .sort((a, b) => b.totalDays - a.totalDays);

    return NextResponse.json({
      data: result,
      counts,
      summary,
      employeeSummary,
      subordinateCount: subordinateIds.length,
    });
  } catch (error) {
    console.error('Error fetching team history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team history' },
      { status: 500 }
    );
  }
}
