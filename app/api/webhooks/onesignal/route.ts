import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Secret key for verifying webhook requests (Optional but recommended)
// You should set this in your .env file and OneSignal dashboard
const WEBHOOK_SECRET = process.env.ONESIGNAL_WEBHOOK_SECRET;

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
    const { event: eventType, id, notificationId, android_notification_id, ios_notification_id } = event;
    
    // Determine the OneSignal Notification ID
    // Note: The field name might vary based on the event type
    const oneSignalId = id || notificationId || android_notification_id || ios_notification_id;

    if (!oneSignalId) return;

    try {
        switch (eventType) {
            case 'notification.opened':
                console.log(`🔔 Notification opened: ${oneSignalId}`);
                await prisma.notificationLog.updateMany({
                    where: { oneSignalId: oneSignalId },
                    data: { status: 'opened' }
                });
                break;

            case 'notification.delivered':
                console.log(`🔔 Notification delivered: ${oneSignalId}`);
                await prisma.notificationLog.updateMany({
                    where: { oneSignalId: oneSignalId },
                    data: { status: 'delivered' }
                });
                break;
            
            // Add more cases as needed
            // case 'subscription.changed': ...
        }
    } catch (dbError) {
        console.error(`❌ Error updating DB for event ${eventType}:`, dbError);
    }
}
