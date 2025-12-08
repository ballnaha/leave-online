import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/notifications - ดึงประวัติการแจ้งเตือน
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const notifications = await prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Extract leaveRequestIds
    const leaveRequestIds = notifications
      .map(n => (n.data as any)?.leaveRequestId)
      .filter((id): id is number => typeof id === 'number');

    // Fetch current status
    let statusMap = new Map<number, { status: string; waitingFor: string }>();

    if (leaveRequestIds.length > 0) {
      const leaveRequests = await prisma.leaveRequest.findMany({
        where: { id: { in: leaveRequestIds } },
        select: {
          id: true,
          status: true,
          approvals: {
            where: { status: 'pending' },
            include: { approver: { select: { firstName: true, lastName: true } } },
            orderBy: { level: 'asc' },
            take: 1,
          },
        },
      });

      leaveRequests.forEach((lr) => {
        let waitingFor = '';
        if (lr.status === 'pending' && lr.approvals.length > 0) {
          const approver = lr.approvals[0].approver;
          waitingFor = `${approver.firstName} ${approver.lastName}`;
        }
        statusMap.set(lr.id, {
          status: lr.status,
          waitingFor,
        });
      });
    }

    // Enrich notifications
    const enrichedNotifications = notifications.map((n) => {
      const leaveId = (n.data as any)?.leaveRequestId;
      if (leaveId && statusMap.has(leaveId)) {
        const info = statusMap.get(leaveId)!;
        return {
          ...n,
          data: {
            ...(n.data as object),
            realTimeStatus: info.status,
            waitingFor: info.waitingFor,
          },
        };
      }
      return n;
    });

    const total = await prisma.notificationLog.count({
      where: { userId },
    });

    const unreadCount = await prisma.notificationLog.count({
      where: { userId, isRead: false },
    });

    return NextResponse.json({
      data: enrichedNotifications,
      total,
      unreadCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { notificationIds, markAllAsRead } = body;

    if (markAllAsRead) {
      // Mark all notifications as read
      await prisma.notificationLog.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      await prisma.notificationLog.updateMany({
        where: {
          id: { in: notificationIds },
          userId,
        },
        data: { isRead: true, readAt: new Date() },
      });
    }

    const unreadCount = await prisma.notificationLog.count({
      where: { userId, isRead: false },
    });

    return NextResponse.json({ success: true, unreadCount });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
