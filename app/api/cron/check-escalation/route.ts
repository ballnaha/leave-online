import { NextRequest, NextResponse } from 'next/server';
import { checkAndEscalate } from '@/lib/escalation';

// POST /api/cron/check-escalation - ตรวจสอบและ escalate ใบลาที่เกินเวลา
// เรียกจาก Cron Job (Vercel Cron, Railway Cron, etc.)
export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบ secret key สำหรับ security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting escalation check...');
    const result = await checkAndEscalate();
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
