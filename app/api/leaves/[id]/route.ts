import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/leaves/[id] - ดึงรายละเอียดใบลา
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const leaveRequestId = parseInt(id);
    const userId = parseInt(session.user.id);
    const userRole = session.user.role;

    if (isNaN(leaveRequestId)) {
      return NextResponse.json({ error: 'Invalid leave request ID' }, { status: 400 });
    }

    // Fetch departments and sections for name lookup
    const [departments, sections] = await Promise.all([
      prisma.department.findMany({ select: { code: true, name: true } }),
      prisma.section.findMany({ select: { code: true, name: true } }),
    ]);
    const deptMap = new Map(departments.map(d => [d.code, `${d.code} - ${d.name}`]));
    const sectMap = new Map(sections.map(s => [s.code, `${s.code} - ${s.name}`]));

    // ดึงข้อมูลใบลา
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        user: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            position: true,
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
                role: true,
              },
            },
            actedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                position: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    // ตรวจสอบสิทธิ์การเข้าถึง
    // - เจ้าของใบลา
    // - Admin/HR Manager
    // - ผู้อนุมัติที่เกี่ยวข้อง
    const isOwner = leaveRequest.userId === userId;
    const isAdminOrHR = userRole === 'admin' || userRole === 'hr_manager';
    const isApprover = leaveRequest.approvals.some(a => a.approverId === userId);

    if (!isOwner && !isAdminOrHR && !isApprover) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // จัดรูปแบบข้อมูล
    const result = {
      id: leaveRequest.id,
      leaveCode: leaveRequest.leaveCode,
      leaveType: leaveRequest.leaveType,
      startDate: leaveRequest.startDate,
      startTime: leaveRequest.startTime,
      endDate: leaveRequest.endDate,
      endTime: leaveRequest.endTime,
      totalDays: leaveRequest.totalDays,
      reason: leaveRequest.reason,
      status: leaveRequest.status,
      currentLevel: leaveRequest.currentLevel,
      escalationDeadline: leaveRequest.escalationDeadline,
      isEscalated: leaveRequest.isEscalated,
      createdAt: leaveRequest.createdAt,
      cancelReason: leaveRequest.cancelReason,
      cancelledAt: leaveRequest.cancelledAt,
      user: {
        ...leaveRequest.user,
        department: deptMap.get(leaveRequest.user.department) || leaveRequest.user.department,
        section: leaveRequest.user.section ? (sectMap.get(leaveRequest.user.section) || leaveRequest.user.section) : null,
      },
      attachments: leaveRequest.attachments,
      approvalHistory: leaveRequest.approvals.map(a => ({
        level: a.level,
        status: a.status,
        comment: a.comment,
        actionAt: a.actionAt,
        approver: a.approver,
        actedBy: (a as any).actedBy || null,
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching leave detail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
