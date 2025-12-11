import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdminRole(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { playerId, userId } = await req.json();

        if (!playerId) {
            return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
        }

        if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
            return NextResponse.json({
                success: false,
                error: 'OneSignal not configured'
            }, { status: 400 });
        }

        // Get user info for the notification
        let userName = 'ผู้ใช้';
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { firstName: true, lastName: true }
            });
            if (user) {
                userName = `${user.firstName} ${user.lastName}`;
            }
        }

        // Send test notification via OneSignal
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                include_player_ids: [playerId],
                headings: { en: '🔔 การแจ้งเตือนทดสอบ' },
                contents: {
                    en: `สวัสดี ${userName}! นี่คือการแจ้งเตือนทดสอบจากระบบ Leave Online เพื่อตรวจสอบว่าอุปกรณ์ของคุณสามารถรับการแจ้งเตือนได้`
                },
                url: process.env.NEXT_PUBLIC_APP_URL || 'https://leave.poonsubcan.co.th',
                data: {
                    type: 'test',
                    sentBy: session.user.name || 'Admin',
                    sentAt: new Date().toISOString(),
                },
            }),
        });

        const result = await response.json();

        if (response.ok && result.id) {
            // Log the test notification
            await prisma.notificationLog.create({
                data: {
                    userId: userId || 0,
                    type: 'test',
                    title: '🔔 การแจ้งเตือนทดสอบ',
                    message: `ส่งโดย ${session.user.name || 'Admin'}`,
                    oneSignalId: result.id,
                    status: 'sent',
                }
            });

            return NextResponse.json({
                success: true,
                message: 'Test notification sent',
                oneSignalId: result.id,
                recipients: result.recipients || 1,
            });
        } else {
            console.error('OneSignal error:', result);
            return NextResponse.json({
                success: false,
                error: result.errors?.[0] || 'Failed to send notification',
                details: result,
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Error sending test notification:', error);
        return NextResponse.json(
            { error: 'Failed to send test notification' },
            { status: 500 }
        );
    }
}
