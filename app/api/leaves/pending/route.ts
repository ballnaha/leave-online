import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/leaves/pending - ดึงรายการใบลาที่รอการอนุมัติ
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const approverId = parseInt(session.user.id);
    const userRole = session.user.role;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending'; // pending, all

    // Admin และ HR Manager: ดึงจาก leave_requests โดยตรง (เห็นทุกใบลา)
    if (userRole === 'admin' || userRole === 'hr_manager') {
      const whereClause: Record<string, unknown> = {};
      
      if (status === 'pending') {
        whereClause.status = { in: ['pending', 'in_progress'] };
      }

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
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { createdAt: 'desc' },
        ],
      });

      // จัดรูปแบบข้อมูลให้ตรงกับ format เดิม
      const result = leaveRequests.map((leave) => ({
        approvalId: leave.id, // ใช้ leaveRequest id แทน
        level: leave.currentLevel,
        status: leave.status === 'approved' ? 'approved' : leave.status === 'rejected' ? 'rejected' : 'pending',
        comment: null,
        actionAt: leave.finalApprovedAt || leave.finalRejectedAt,
        leaveRequest: {
          id: leave.id,
          leaveType: leave.leaveType,
          startDate: leave.startDate,
          startTime: leave.startTime,
          endDate: leave.endDate,
          endTime: leave.endTime,
          totalDays: leave.totalDays,
          reason: leave.reason,
          status: leave.status,
          currentLevel: leave.currentLevel,
          escalationDeadline: leave.escalationDeadline,
          isEscalated: leave.isEscalated,
          createdAt: leave.createdAt,
          cancelReason: leave.cancelReason,
          cancelledAt: leave.cancelledAt,
          user: leave.user,
          attachments: leave.attachments,
          approvalHistory: leave.approvals,
        },
      }));

      // นับจำนวน
      const counts = {
        pending: leaveRequests.filter((r) => ['pending', 'in_progress'].includes(r.status)).length,
        approved: leaveRequests.filter((r) => r.status === 'approved').length,
        rejected: leaveRequests.filter((r) => r.status === 'rejected').length,
        cancelled: leaveRequests.filter((r) => r.status === 'cancelled').length,
        total: leaveRequests.length,
      };

      return NextResponse.json({
        data: result,
        counts,
      });
    }

    // Non-admin: ดึงจาก leave_approvals ตามปกติ
    const whereClause: Record<string, unknown> = {
      approverId,
    };

    if (status === 'pending') {
      whereClause.status = 'pending';
      // เพิ่มเงื่อนไข: ต้องเป็น level ปัจจุบันของใบลาด้วย ถึงจะเห็น
      // เพื่อป้องกันไม่ให้เห็นใบลาที่ยังมาไม่ถึงคิวตัวเอง (กรณีสร้างมารอไว้ก่อน)
      // แต่ logic เดิมคือสร้างทีละ step หรือสร้างมารอ?
      // ดูจาก escalation.ts -> createApprovalSteps -> สร้างมารอไว้เลยทุก step
      // ดังนั้นต้องเช็คว่า leaveRequest.currentLevel == approval.level
    }

    const pendingApprovals = await prisma.leaveApproval.findMany({
      where: whereClause,
      include: {
        leaveRequest: {
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
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // pending first
        { createdAt: 'desc' },
      ],
    });

    // Filter เฉพาะใบลาที่ถึงคิวตัวเองแล้ว
    const filteredApprovals = pendingApprovals.filter(approval => {
        if (approval.status !== 'pending') return true; // ถ้าทำไปแล้วก็ให้เห็น
        // ถ้ายัง pending ต้องเช็คว่าเป็นคิวตัวเองไหม
        return approval.leaveRequest.currentLevel === approval.level;
    });

    // จัดรูปแบบข้อมูลให้อ่านง่าย
    const result = filteredApprovals.map((approval) => ({
      approvalId: approval.id,
      level: approval.level,
      status: approval.status,
      comment: approval.comment,
      actionAt: approval.actionAt,
      leaveRequest: {
        id: approval.leaveRequest.id,
        leaveType: approval.leaveRequest.leaveType,
        startDate: approval.leaveRequest.startDate,
        startTime: approval.leaveRequest.startTime,
        endDate: approval.leaveRequest.endDate,
        endTime: approval.leaveRequest.endTime,
        totalDays: approval.leaveRequest.totalDays,
        reason: approval.leaveRequest.reason,
        status: approval.leaveRequest.status,
        currentLevel: approval.leaveRequest.currentLevel,
        escalationDeadline: approval.leaveRequest.escalationDeadline,
        isEscalated: approval.leaveRequest.isEscalated,
        createdAt: approval.leaveRequest.createdAt,
        cancelReason: approval.leaveRequest.cancelReason,
        cancelledAt: approval.leaveRequest.cancelledAt,
        user: approval.leaveRequest.user,
        attachments: approval.leaveRequest.attachments,
        approvalHistory: approval.leaveRequest.approvals,
      },
    }));

    // นับจำนวน
    const counts = {
      pending: result.filter((r) => r.status === 'pending').length,
      approved: result.filter((r) => r.status === 'approved').length,
      rejected: result.filter((r) => r.status === 'rejected').length,
      cancelled: result.filter((r) => r.status === 'cancelled').length,
      total: result.length,
    };

    return NextResponse.json({
      data: result,
      counts,
    });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    );
  }
}
