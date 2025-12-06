import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }
    
    if (search) {
      where.OR = [
        { playerId: { contains: search } },
        { user: { firstName: { contains: search } } },
        { user: { lastName: { contains: search } } },
        { user: { employeeId: { contains: search } } },
      ];
    }

    const [devices, total, stats] = await Promise.all([
      prisma.userDevice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              department: true,
              company: true,
              avatar: true,
              isActive: true,
            }
          }
        }
      }),
      prisma.userDevice.count({ where }),
      // Stats
      Promise.all([
        prisma.userDevice.count(),
        prisma.userDevice.count({ where: { isActive: true } }),
        prisma.userDevice.groupBy({
          by: ['deviceType'],
          _count: { deviceType: true }
        }),
      ]),
    ]);

    const [totalDevices, activeDevices, deviceTypes] = stats;

    return NextResponse.json({
      devices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: totalDevices,
        active: activeDevices,
        inactive: totalDevices - activeDevices,
        byType: deviceTypes.map(d => ({
          type: d.deviceType,
          count: d._count.deviceType,
        })),
      }
    });

  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscribers' },
      { status: 500 }
    );
  }
}

// Deactivate a device
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('id');

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    await prisma.userDevice.update({
      where: { id: parseInt(deviceId) },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true, message: 'Device deactivated' });

  } catch (error) {
    console.error('Error deactivating device:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate device' },
      { status: 500 }
    );
  }
}

// Reactivate a device
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    await prisma.userDevice.update({
      where: { id: parseInt(id) },
      data: { isActive }
    });

    return NextResponse.json({ 
      success: true, 
      message: isActive ? 'Device activated' : 'Device deactivated' 
    });

  } catch (error) {
    console.error('Error updating device:', error);
    return NextResponse.json(
      { error: 'Failed to update device' },
      { status: 500 }
    );
  }
}
