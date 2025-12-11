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

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';

// Helper function to update player tags in OneSignal
async function updateOneSignalPlayerTags(playerId: string, tags: Record<string, string | number | boolean>) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.log('OneSignal not configured, skipping tag update');
    return { success: false, error: 'OneSignal not configured' };
  }

  try {
    const response = await fetch(
      `https://onesignal.com/api/v1/players/${playerId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          tags,
        }),
      }
    );

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.text();
      console.error('OneSignal tag update failed:', error);
      return { success: false, error };
    }
  } catch (error) {
    console.error('Error updating OneSignal tags:', error);
    return { success: false, error: String(error) };
  }
}

// Delete a device (permanently remove from database)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('id');

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    // Get device to get playerId before deletion
    const device = await prisma.userDevice.findUnique({
      where: { id: parseInt(deviceId) },
      select: { playerId: true, userId: true }
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // Delete from DB permanently
    await prisma.userDevice.delete({
      where: { id: parseInt(deviceId) }
    });

    // Try to update tag in OneSignal to mark as deleted
    const onesignalResult = await updateOneSignalPlayerTags(device.playerId, {
      app_deleted: 'true',
      deleted_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Device deleted permanently',
      onesignalSync: onesignalResult.success
    });

  } catch (error) {
    console.error('Error deleting device:', error);
    return NextResponse.json(
      { error: 'Failed to delete device' },
      { status: 500 }
    );
  }
}

// Reactivate a device
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    // Get device to get playerId
    const device = await prisma.userDevice.findUnique({
      where: { id: parseInt(id) },
      select: { playerId: true }
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // Update in DB
    await prisma.userDevice.update({
      where: { id: parseInt(id) },
      data: { isActive }
    });

    // Update tag in OneSignal
    const onesignalResult = await updateOneSignalPlayerTags(device.playerId, {
      app_disabled: isActive ? '' : 'true', // Empty string removes the tag
      disabled_at: isActive ? '' : new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: isActive ? 'Device activated' : 'Device deactivated',
      onesignalSync: onesignalResult.success
    });

  } catch (error) {
    console.error('Error updating device:', error);
    return NextResponse.json(
      { error: 'Failed to update device' },
      { status: 500 }
    );
  }
}
