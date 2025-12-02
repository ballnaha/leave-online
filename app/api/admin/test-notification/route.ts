import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// OneSignal Configuration
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, message, targetType, targetUserId, playerId } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'กรุณากรอกหัวข้อและข้อความ' },
        { status: 400 }
      );
    }

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return NextResponse.json(
        { error: 'OneSignal ยังไม่ได้ตั้งค่า (ตรวจสอบ .env)' },
        { status: 500 }
      );
    }

    let playerIds: string[] = [];

    // กำหนด target ของ notification
    if (targetType === 'specific' && playerId) {
      // ส่งไปยัง Player ID ที่ระบุ
      playerIds = [playerId];
    } else if (targetType === 'user' && targetUserId) {
      // ส่งไปยัง user ที่ระบุ
      const devices = await prisma.userDevice.findMany({
        where: { userId: parseInt(targetUserId), isActive: true },
        select: { playerId: true },
      });
      playerIds = devices.map(d => d.playerId);
    } else if (targetType === 'all') {
      // ส่งไปยังทุก device ที่ลงทะเบียน
      const devices = await prisma.userDevice.findMany({
        where: { isActive: true },
        select: { playerId: true },
      });
      playerIds = devices.map(d => d.playerId);
    } else if (targetType === 'self') {
      // ส่งไปยัง device ของตัวเอง
      const userId = parseInt(session.user.id);
      const devices = await prisma.userDevice.findMany({
        where: { userId, isActive: true },
        select: { playerId: true },
      });
      playerIds = devices.map(d => d.playerId);
    }

    if (playerIds.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบอุปกรณ์ที่ลงทะเบียน', playerIds: [] },
        { status: 400 }
      );
    }

    // ส่ง notification ไปยัง OneSignal
    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: playerIds,
        headings: { en: title, th: title },
        contents: { en: message, th: message },
        data: { type: 'test', timestamp: new Date().toISOString() },
      }),
    });

    const result = await response.json();

    if (response.ok && result.id) {
      // บันทึก log
      await prisma.notificationLog.create({
        data: {
          userId: parseInt(session.user.id),
          type: 'test',
          title,
          message,
          data: { targetType, playerIds },
          oneSignalId: result.id,
          status: 'sent',
        },
      });

      return NextResponse.json({
        success: true,
        notificationId: result.id,
        recipientCount: playerIds.length,
        message: `ส่งการแจ้งเตือนไปยัง ${playerIds.length} อุปกรณ์สำเร็จ`,
      });
    } else {
      // Extract detailed error message
      let errorMessage = 'เกิดข้อผิดพลาดในการส่ง';
      if (result.errors) {
        if (Array.isArray(result.errors)) {
          errorMessage = result.errors.map((e: any) => typeof e === 'string' ? e : JSON.stringify(e)).join(', ');
        } else if (typeof result.errors === 'object') {
          errorMessage = JSON.stringify(result.errors);
        } else {
          errorMessage = String(result.errors);
        }
      }

      return NextResponse.json(
        { 
          error: errorMessage, 
          details: result 
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { error: `เกิดข้อผิดพลาด: ${error.message || String(error)}` },
      { status: 500 }
    );
  }
}

// GET - ดึงรายการ devices ที่ลงทะเบียน
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const devices = await prisma.userDevice.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const recentLogs = await prisma.notificationLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({
      devices,
      recentLogs,
      config: {
        appIdConfigured: !!ONESIGNAL_APP_ID,
        apiKeyConfigured: !!ONESIGNAL_REST_API_KEY,
      },
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}
