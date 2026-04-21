import { NextRequest, NextResponse } from 'next/server';
import { checkAndEscalate } from '@/lib/escalation';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';

// POST /api/cron/check-escalation - ตรวจสอบและ escalate ใบลาที่เกินเวลา
// เรียกจาก Cron Job (Vercel Cron, Railway Cron, etc.) หรือ Admin Dashboard
async function handleCronRequest(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const secretParam = searchParams.get('secret');
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        // 1. ตรวจสอบ Security
        const isValidHeader = authHeader === `Bearer ${cronSecret}`;
        const isValidParam = secretParam === cronSecret;
        const isCron = cronSecret && (isValidHeader || isValidParam);

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

        // 2. รับ Parameter เสริม
        const force = searchParams.get('force') === 'true';
        const leaveIdParam = searchParams.get('leaveId');
        const leaveId = leaveIdParam ? parseInt(leaveIdParam) : undefined;

        // 3. เริ่มรันงาน
        console.log(`[Cron] Starting escalation check... (Method: ${request.method}, Force: ${force})`);
        const result = await checkAndEscalate({ force, leaveId });
        
        return NextResponse.json({
            success: true,
            escalated: result.escalated,
            reminded: result.reminded,
            errors: result.errors,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Cron] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    return handleCronRequest(request);
}

export async function GET(request: NextRequest) {
    return handleCronRequest(request);
}
