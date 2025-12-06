import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Secret key for verifying webhook requests (Optional but recommended)
// You should set this in your .env file and OneSignal dashboard
const WEBHOOK_SECRET = process.env.ONESIGNAL_WEBHOOK_SECRET;

// Handle GET request (for webhook verification/health check)
export async function GET(req: NextRequest) {
    return NextResponse.json({ 
        status: 'ok', 
        message: 'OneSignal Webhook endpoint is active',
        timestamp: new Date().toISOString()
    });
}

// Handle HEAD request (some services use this to verify endpoint)
export async function HEAD(req: NextRequest) {
    return new NextResponse(null, { status: 200 });
}

// Handle OPTIONS request (CORS preflight)
export async function OPTIONS(req: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-OneSignal-Signature',
        },
    });
}

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Request (Optional)
        // If you set up a secret in OneSignal, verify it here
        // const signature = req.headers.get('x-onesignal-signature');
        // if (WEBHOOK_SECRET && signature !== WEBHOOK_SECRET) {
        //     return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        // }

        const body = await req.json();
        console.log('🔔 OneSignal Webhook received:', JSON.stringify(body, null, 2));

        // OneSignal sends events in different formats depending on the configuration
        // This is a generic handler for common events
        
        // Handle Notification Events
        if (body.event) {
            await handleEvent(body);
        } else if (Array.isArray(body)) {
            // Sometimes events come as an array
            for (const event of body) {
                await handleEvent(event);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('❌ Webhook Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

async function handleEvent(event: any) {
    const { 
        event: eventType, 
        id, 
        notificationId, 
        notification_id,
        android_notification_id, 
        ios_notification_id,
        // Subscription events data
        subscription,
        player_id,
        external_user_id,
        // Click/Action data
        action_id,
        url,
        // User data
        user_id,
    } = event;
    
    // Determine the OneSignal Notification ID
    const oneSignalId = id || notificationId || notification_id || android_notification_id || ios_notification_id;
    
    // Determine player ID for subscription events
    const playerId = player_id || subscription?.id;
    const externalUserId = external_user_id || subscription?.external_id;

    console.log(`🔔 Processing event: ${eventType}`, { oneSignalId, playerId, externalUserId });

    try {
        switch (eventType) {
            // ==================== Notification Events ====================
            
            case 'notification.sent':
                // การแจ้งเตือนถูกส่งจาก OneSignal server
                console.log(`📤 Notification sent: ${oneSignalId}`);
                if (oneSignalId) {
                    await prisma.notificationLog.updateMany({
                        where: { oneSignalId: oneSignalId },
                        data: { status: 'sent' }
                    });
                }
                break;

            case 'notification.delivered':
                // การแจ้งเตือนถูกส่งถึงอุปกรณ์ผู้ใช้แล้ว
                console.log(`✅ Notification delivered: ${oneSignalId}`);
                if (oneSignalId) {
                    await prisma.notificationLog.updateMany({
                        where: { oneSignalId: oneSignalId },
                        data: { status: 'delivered' }
                    });
                }
                break;

            case 'notification.opened':
            case 'notification.clicked':
                // ผู้ใช้คลิกเปิดการแจ้งเตือน
                console.log(`👆 Notification opened/clicked: ${oneSignalId}`, { action_id, url });
                if (oneSignalId) {
                    await prisma.notificationLog.updateMany({
                        where: { oneSignalId: oneSignalId },
                        data: { status: 'opened' }
                    });
                }
                break;

            case 'notification.dismissed':
                // ผู้ใช้ปิดการแจ้งเตือนโดยไม่คลิก
                console.log(`❌ Notification dismissed: ${oneSignalId}`);
                if (oneSignalId) {
                    await prisma.notificationLog.updateMany({
                        where: { oneSignalId: oneSignalId },
                        data: { status: 'dismissed' }
                    });
                }
                break;

            case 'notification.failed':
                // การส่งแจ้งเตือนล้มเหลว
                console.log(`💥 Notification failed: ${oneSignalId}`);
                if (oneSignalId) {
                    await prisma.notificationLog.updateMany({
                        where: { oneSignalId: oneSignalId },
                        data: { status: 'failed' }
                    });
                }
                break;

            // ==================== Subscription Events ====================
            
            case 'subscription.created':
                // ผู้ใช้ subscribe ใหม่
                console.log(`➕ New subscription: ${playerId}`, { externalUserId });
                // ถ้ามี external_user_id (user ID ของเรา) ให้ลงทะเบียน device
                if (playerId && externalUserId) {
                    const userId = parseInt(externalUserId);
                    if (!isNaN(userId)) {
                        await prisma.userDevice.upsert({
                            where: { playerId: playerId },
                            create: {
                                userId: userId,
                                playerId: playerId,
                                deviceType: 'web',
                                isActive: true,
                            },
                            update: {
                                userId: userId,
                                isActive: true,
                                updatedAt: new Date(),
                            }
                        });
                    }
                }
                break;

            case 'subscription.changed':
                // การเปลี่ยนแปลง subscription (เปิด/ปิด notification)
                console.log(`🔄 Subscription changed: ${playerId}`, event);
                if (playerId) {
                    const isOptedIn = subscription?.optedIn ?? event.optedIn ?? true;
                    await prisma.userDevice.updateMany({
                        where: { playerId: playerId },
                        data: { 
                            isActive: isOptedIn,
                            updatedAt: new Date(),
                        }
                    });
                }
                break;

            case 'subscription.deleted':
            case 'subscription.unsubscribed':
                // ผู้ใช้ unsubscribe
                console.log(`➖ Subscription deleted/unsubscribed: ${playerId}`);
                if (playerId) {
                    await prisma.userDevice.updateMany({
                        where: { playerId: playerId },
                        data: { 
                            isActive: false,
                            updatedAt: new Date(),
                        }
                    });
                }
                break;

            // ==================== User Events ====================
            
            case 'user.updated':
                // ข้อมูล user ถูกอัพเดท
                console.log(`👤 User updated:`, { externalUserId, playerId });
                break;

            case 'user.deleted':
                // User ถูกลบจาก OneSignal
                console.log(`🗑️ User deleted:`, { externalUserId });
                if (externalUserId) {
                    const userId = parseInt(externalUserId);
                    if (!isNaN(userId)) {
                        await prisma.userDevice.updateMany({
                            where: { userId: userId },
                            data: { isActive: false }
                        });
                    }
                }
                break;

            // ==================== Session Events ====================
            
            case 'session.started':
                // ผู้ใช้เปิดแอป
                console.log(`🚀 Session started:`, { playerId, externalUserId });
                break;

            case 'session.ended':
                // ผู้ใช้ปิดแอป
                console.log(`🔚 Session ended:`, { playerId, externalUserId });
                break;

            // ==================== In-App Message Events ====================
            
            case 'in_app_message.impression':
                // In-app message ถูกแสดง
                console.log(`👁️ In-app message impression:`, event);
                break;

            case 'in_app_message.clicked':
                // ผู้ใช้คลิก in-app message
                console.log(`👆 In-app message clicked:`, event);
                break;

            case 'in_app_message.dismissed':
                // ผู้ใช้ปิด in-app message
                console.log(`❌ In-app message dismissed:`, event);
                break;

            // ==================== Default ====================
            
            default:
                console.log(`❓ Unknown event type: ${eventType}`, event);
                break;
        }
    } catch (dbError) {
        console.error(`❌ Error processing event ${eventType}:`, dbError);
    }
}
