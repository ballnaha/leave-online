import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/notifications/register - ลงทะเบียน OneSignal Player ID
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { playerId, deviceType } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId is required' },
        { status: 400 }
      );
    }

    const userId = parseInt(session.user.id);

    // ตรวจสอบว่า playerId นี้มีอยู่แล้วหรือไม่
    const existingDevice = await prisma.userDevice.findUnique({
      where: { playerId },
    });

    if (existingDevice) {
      // ถ้ามีอยู่แล้ว อัพเดตเป็น user ปัจจุบัน
      await prisma.userDevice.update({
        where: { playerId },
        data: {
          userId,
          deviceType: deviceType || 'web',
          isActive: true,
          updatedAt: new Date(),
        },
      });
    } else {
      // สร้างใหม่
      await prisma.userDevice.create({
        data: {
          userId,
          playerId,
          deviceType: deviceType || 'web',
          isActive: true,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error registering device:', error);
    return NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/register - ยกเลิกการลงทะเบียน
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId is required' },
        { status: 400 }
      );
    }

    await prisma.userDevice.updateMany({
      where: { playerId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unregistering device:', error);
    return NextResponse.json(
      { error: 'Failed to unregister device' },
      { status: 500 }
    );
  }
}
