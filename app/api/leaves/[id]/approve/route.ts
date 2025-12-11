import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { processNextApproval } from '@/lib/escalation';
import { notifyLeaveApproved, notifyLeaveRejected, notifyLeavePartialApproved } from '@/lib/onesignal';

// POST /api/leaves/[id]/approve - อนุมัติหรือปฏิเสธใบลา
export async function POST(
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
    const approverId = parseInt(session.user.id);
    const body = await request.json();
    const { action, comment } = body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // ดึงข้อมูลใบลา
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        user: true,
        approvals: {
          orderBy: { level: 'asc' },
        },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    // ตรวจสอบว่าใบลายังไม่ถูก approve/reject
    if (['approved', 'rejected', 'cancelled'].includes(leaveRequest.status)) {
      return NextResponse.json(
        { error: `Leave request already ${leaveRequest.status}` },
        { status: 400 }
      );
    }

    // หา approval step ที่รอการอนุมัติจาก user นี้
    const pendingApproval = leaveRequest.approvals.find(
      (a) => a.approverId === approverId && a.status === 'pending'
    );

    if (!pendingApproval) {
      return NextResponse.json(
        { error: 'You are not authorized to approve this leave request' },
        { status: 403 }
      );
    }

    const now = new Date();
    const approverName = `${session.user.firstName} ${session.user.lastName}`;

    if (action === 'approve') {
      // อัพเดต approval step
      await prisma.leaveApproval.update({
        where: { id: pendingApproval.id },
        data: {
          status: 'approved',
          comment,
          actionAt: now,
        },
      });

      // ตรวจสอบว่ามี level ถัดไปหรือไม่
      const { isComplete, nextApproverId } = await processNextApproval(
        leaveRequestId,
        pendingApproval.level
      );

      if (isComplete) {
        // อนุมัติสมบูรณ์
        await prisma.leaveRequest.update({
          where: { id: leaveRequestId },
          data: {
            status: 'approved',
            finalApprovedBy: approverId,
            finalApprovedAt: now,
          },
        });

        // แจ้งเตือนพนักงานว่าใบลาได้รับการอนุมัติ
        await notifyLeaveApproved(
          leaveRequest.userId,
          leaveRequestId,
          approverName,
          leaveRequest.leaveType
        );

        return NextResponse.json({
          success: true,
          message: 'Leave request fully approved',
          status: 'approved',
        });
      } else {
        // อัพเดตสถานะเป็น in_progress
        await prisma.leaveRequest.update({
          where: { id: leaveRequestId },
          data: { status: 'in_progress' },
        });

        // แจ้งเตือนพนักงานว่าใบลาผ่านการอนุมัติขั้นนี้แล้ว
        const totalApprovals = leaveRequest.approvals.length;
        const completedApprovals = leaveRequest.approvals.filter(
          a => a.status === 'approved' || a.id === pendingApproval.id
        ).length;

        await notifyLeavePartialApproved(
          leaveRequest.userId,
          leaveRequestId,
          approverName,
          leaveRequest.leaveType,
          completedApprovals,
          totalApprovals
        );

        return NextResponse.json({
          success: true,
          message: 'Approved. Sent to next approver',
          status: 'in_progress',
          nextApproverId,
        });
      }
    } else {
      // ปฏิเสธ
      await prisma.leaveApproval.update({
        where: { id: pendingApproval.id },
        data: {
          status: 'rejected',
          comment,
          actionAt: now,
        },
      });

      // อัพเดตสถานะใบลาเป็น rejected
      await prisma.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: 'rejected',
          finalRejectedBy: approverId,
          finalRejectedAt: now,
          rejectReason: comment,
        },
      });

      // แจ้งเตือนพนักงานว่าใบลาถูกปฏิเสธ
      await notifyLeaveRejected(
        leaveRequest.userId,
        leaveRequestId,
        approverName,
        leaveRequest.leaveType,
        comment
      );

      return NextResponse.json({
        success: true,
        message: 'Leave request rejected',
        status: 'rejected',
      });
    }
  } catch (error) {
    console.error('Error processing approval:', error);
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    );
  }
}
