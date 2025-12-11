import { NextRequest, NextResponse } from 'next/server';
import { checkAndEscalate } from '@/lib/escalation';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';

// POST /api/cron/check-escalation - ตรวจสอบและ escalate ใบลาที่เกินเวลา
// เรียกจาก Cron Job (Vercel Cron, Railway Cron, etc.) หรือ Admin Dashboard
export async function POST(request: NextRequest) {
  try {
    // 1. ตรวจสอบ secret key (สำหรับ External Cron)
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    const isValidHeader = authHeader === `Bearer ${cronSecret}`;
    const isValidParam = secretParam === cronSecret;
    const isCron = cronSecret && (isValidHeader || isValidParam);

    const force = searchParams.get('force') === 'true';
    const leaveIdParam = searchParams.get('leaveId');
    const leaveId = leaveIdParam ? parseInt(leaveIdParam) : undefined;

    // 2. ตรวจสอบ Admin Session (สำหรับกดปุ่ม Run Now จาก Dashboard)
    let isAdmin = false;
    if (!isCron) {
      const session = await getServerSession(authOptions);
      if (session && isAdminRole(session.user.role)) {
        isAdmin = true;
      }
    }

    if (!isCron && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`Starting escalation check... (Force: ${force}, LeaveId: ${leaveId || 'All'})`);
    const result = await checkAndEscalate({ force, leaveId });
    console.log('Escalation check completed:', result);

    return NextResponse.json({
      success: true,
      escalated: result.escalated,
      reminded: result.reminded,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron escalation check failed:', error);
    return NextResponse.json(
      { error: 'Escalation check failed', details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/cron/check-escalation - สำหรับทดสอบ (อาจต้องปิดใน production)
export async function GET(request: NextRequest) {
  // แค่แสดงสถานะ ไม่ได้ทำ escalation จริง
  const cronSecret = process.env.CRON_SECRET;

  return NextResponse.json({
    status: 'ready',
    configured: !!cronSecret,
    message: 'Use POST method to trigger escalation check',
    timestamp: new Date().toISOString(),
  });
}
