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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (type && type !== 'all') {
      where.type = type;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { message: { contains: search } },
        { user: { firstName: { contains: search } } },
        { user: { lastName: { contains: search } } },
        { user: { employeeId: { contains: search } } },
      ];
    }
    
    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: end };
    }

    const [logs, total, types] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              department: true,
              avatar: true,
            }
          }
        }
      }),
      prisma.notificationLog.count({ where }),
      // Get unique types for filter
      prisma.notificationLog.findMany({
        distinct: ['type'],
        select: { type: true }
      }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        types: types.map(t => t.type),
        statuses: ['sent', 'delivered', 'opened', 'dismissed', 'failed'],
      }
    });

  } catch (error) {
    console.error('Error fetching notification logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification logs' },
      { status: 500 }
    );
  }
}
