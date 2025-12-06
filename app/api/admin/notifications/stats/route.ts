import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get notification stats
    const [
      totalNotifications,
      sentCount,
      deliveredCount,
      openedCount,
      failedCount,
      dismissedCount,
      totalSubscribers,
      activeSubscribers,
      recentNotifications,
      dailyStats,
    ] = await Promise.all([
      // Total notifications in period
      prisma.notificationLog.count({
        where: { createdAt: { gte: startDate } }
      }),
      // Sent
      prisma.notificationLog.count({
        where: { status: 'sent', createdAt: { gte: startDate } }
      }),
      // Delivered
      prisma.notificationLog.count({
        where: { status: 'delivered', createdAt: { gte: startDate } }
      }),
      // Opened
      prisma.notificationLog.count({
        where: { status: 'opened', createdAt: { gte: startDate } }
      }),
      // Failed
      prisma.notificationLog.count({
        where: { status: 'failed', createdAt: { gte: startDate } }
      }),
      // Dismissed
      prisma.notificationLog.count({
        where: { status: 'dismissed', createdAt: { gte: startDate } }
      }),
      // Total subscribers (devices)
      prisma.userDevice.count(),
      // Active subscribers
      prisma.userDevice.count({
        where: { isActive: true }
      }),
      // Recent notifications
      prisma.notificationLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { firstName: true, lastName: true, employeeId: true }
          }
        }
      }),
      // Daily stats for chart
      prisma.$queryRaw`
        SELECT 
          DATE(createdAt) as date,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) as opened,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM notification_logs
        WHERE createdAt >= ${startDate}
        GROUP BY DATE(createdAt)
        ORDER BY date DESC
        LIMIT 30
      ` as Promise<any[]>,
    ]);

    // Calculate rates
    const deliveryRate = totalNotifications > 0 
      ? ((deliveredCount + openedCount) / totalNotifications * 100).toFixed(1) 
      : '0';
    const openRate = (deliveredCount + openedCount) > 0 
      ? (openedCount / (deliveredCount + openedCount) * 100).toFixed(1) 
      : '0';

    // Get notification types breakdown
    const typeBreakdown = await prisma.notificationLog.groupBy({
      by: ['type'],
      _count: { type: true },
      where: { createdAt: { gte: startDate } },
      orderBy: { _count: { type: 'desc' } }
    });

    return NextResponse.json({
      summary: {
        totalNotifications,
        sentCount,
        deliveredCount,
        openedCount,
        failedCount,
        dismissedCount,
        deliveryRate: parseFloat(deliveryRate),
        openRate: parseFloat(openRate),
      },
      subscribers: {
        total: totalSubscribers,
        active: activeSubscribers,
        inactive: totalSubscribers - activeSubscribers,
      },
      recentNotifications,
      dailyStats: (dailyStats || []).map((d: any) => ({
        date: d.date,
        total: Number(d.total),
        sent: Number(d.sent),
        delivered: Number(d.delivered),
        opened: Number(d.opened),
        failed: Number(d.failed),
      })),
      typeBreakdown: typeBreakdown.map(t => ({
        type: t.type,
        count: t._count.type,
      })),
    });

  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification stats' },
      { status: 500 }
    );
  }
}
