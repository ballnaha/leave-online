/**
 * OneSignal Push Notification Service
 * ใช้สำหรับส่งแจ้งเตือนไปยัง Mobile App
 */

import { prisma } from './prisma';

// OneSignal Configuration
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

export interface NotificationPayload {
  title: string | Record<string, string>;
  message: string | Record<string, string>;
  data?: Record<string, any>;
  url?: string;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

/**
 * ส่ง Push Notification ไปยัง OneSignal
 */
export async function sendPushNotification(
  playerIds: string[],
  payload: NotificationPayload
): Promise<NotificationResult> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.warn('OneSignal credentials not configured');
    return { success: false, error: 'OneSignal not configured' };
  }

  if (playerIds.length === 0) {
    return { success: false, error: 'No player IDs provided' };
  }

  try {
    const headings = typeof payload.title === 'string' 
      ? { en: payload.title, th: payload.title } 
      : payload.title;
      
    const contents = typeof payload.message === 'string'
      ? { en: payload.message, th: payload.message }
      : payload.message;

    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: playerIds,
        headings: headings,
        contents: contents,
        data: payload.data || {},
        url: payload.url,
      }),
    });

    const result = await response.json();

    if (response.ok && result.id) {
      return { success: true, notificationId: result.id };
    } else {
      // Extract detailed error message
      let errorMessage = 'Unknown error';
      if (result.errors) {
        if (Array.isArray(result.errors)) {
          errorMessage = result.errors.map((e: any) => typeof e === 'string' ? e : JSON.stringify(e)).join(', ');
        } else if (typeof result.errors === 'object') {
          errorMessage = JSON.stringify(result.errors);
        } else {
          errorMessage = String(result.errors);
        }
      }
      
      console.error('OneSignal API Error:', result);
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.error('OneSignal API error:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * ดึง Player IDs ของ user
 */
export async function getUserPlayerIds(userId: number): Promise<string[]> {
  const devices = await prisma.userDevice.findMany({
    where: { userId, isActive: true },
    select: { playerId: true },
  });
  return devices.map(d => d.playerId);
}

/**
 * ส่งแจ้งเตือนไปยัง user และบันทึก log
 */
export async function notifyUser(
  userId: number,
  type: string,
  payload: NotificationPayload
): Promise<NotificationResult> {
  const playerIds = await getUserPlayerIds(userId);

  // บันทึก notification log ไม่ว่าจะส่งได้หรือไม่
  const logData = {
    userId,
    type,
    title: typeof payload.title === 'string' ? payload.title : (payload.title['th'] || payload.title['en'] || ''),
    message: typeof payload.message === 'string' ? payload.message : (payload.message['th'] || payload.message['en'] || ''),
    data: payload.data || {},
    status: 'pending' as const,
  };

  if (playerIds.length === 0) {
    // ไม่มี device ลงทะเบียน แต่ยังบันทึก log
    await prisma.notificationLog.create({
      data: { ...logData, status: 'failed' },
    });
    return { success: false, error: 'No devices registered' };
  }

  const result = await sendPushNotification(playerIds, payload);

  // Handle "All included players are not subscribed" error
  // This happens when users clear browser data or unsubscribe, but our DB still has the old ID
  if (!result.success && result.error && result.error.includes('All included players are not subscribed')) {
    console.warn(`OneSignal: All devices for user ${userId} are unsubscribed. Deactivating devices.`);
    await prisma.userDevice.updateMany({
      where: { 
        userId, 
        playerId: { in: playerIds } 
      },
      data: { isActive: false }
    });
  }

  // บันทึก log พร้อมผลลัพธ์
  await prisma.notificationLog.create({
    data: {
      ...logData,
      oneSignalId: result.notificationId,
      status: result.success ? 'sent' : 'failed',
    },
  });

  return result;
}

/**
 * แจ้งเตือนเมื่อมีใบลาใหม่รอการอนุมัติ
 */
export async function notifyApprovalPending(
  approverId: number,
  leaveRequestId: number,
  requesterName: string,
  leaveType: string
): Promise<NotificationResult> {
  return notifyUser(approverId, 'approval_pending', {
    title: '📋 มีใบลารออนุมัติ',
    message: `${requesterName} ขอ${leaveType}`,
    data: {
      type: 'approval_pending',
      leaveRequestId,
    },
  });
}

/**
 * แจ้งเตือนเมื่อใบลาได้รับการอนุมัติ
 */
export async function notifyLeaveApproved(
  userId: number,
  leaveRequestId: number,
  approverName: string,
  leaveType: string
): Promise<NotificationResult> {
  return notifyUser(userId, 'approved', {
    title: '✅ ใบลาได้รับการอนุมัติ',
    message: `${leaveType}ของคุณได้รับการอนุมัติโดย ${approverName}`,
    data: {
      type: 'approved',
      leaveRequestId,
    },
  });
}

/**
 * แจ้งเตือนเมื่อใบลาถูกปฏิเสธ
 */
export async function notifyLeaveRejected(
  userId: number,
  leaveRequestId: number,
  approverName: string,
  leaveType: string,
  reason?: string
): Promise<NotificationResult> {
  return notifyUser(userId, 'rejected', {
    title: '❌ ใบลาถูกปฏิเสธ',
    message: `${leaveType}ของคุณถูกปฏิเสธโดย ${approverName}${reason ? `: ${reason}` : ''}`,
    data: {
      type: 'rejected',
      leaveRequestId,
      reason,
    },
  });
}

/**
 * แจ้งเตือนเมื่อใบลาถูก escalate ไป HR
 */
export async function notifyEscalated(
  userId: number,
  leaveRequestId: number,
  leaveType: string
): Promise<NotificationResult> {
  return notifyUser(userId, 'escalated', {
    title: '⚡ ใบลาถูกส่งต่อ',
    message: `${leaveType}ของคุณถูกส่งไปยังผู้จัดการฝ่ายบุคคลเนื่องจากเกินเวลากำหนด`,
    data: {
      type: 'escalated',
      leaveRequestId,
    },
  });
}

/**
 * แจ้งเตือนเตือนความจำให้อนุมัติ
 */
export async function notifyApprovalReminder(
  approverId: number,
  leaveRequestId: number,
  requesterName: string,
  leaveType: string,
  hoursLeft: number
): Promise<NotificationResult> {
  return notifyUser(approverId, 'reminder', {
    title: '⏰ เตือนอนุมัติใบลา',
    message: `${requesterName} รอ${leaveType} (เหลือเวลา ${hoursLeft} ชม.)`,
    data: {
      type: 'reminder',
      leaveRequestId,
    },
  });
}

/**
 * แจ้งเตือนเมื่อส่งใบลาสำเร็จ (แจ้งผู้ขอ)
 */
export async function notifyLeaveSubmitted(
  userId: number,
  leaveRequestId: number,
  leaveType: string
): Promise<NotificationResult> {
  return notifyUser(userId, 'submitted', {
    title: {
      en: '✅ Leave Submitted',
      th: '✅ ส่งใบลาสำเร็จ',
      my: '✅ ခွင့်တင်ပြပြီး'
    },
    message: {
      en: `Your ${leaveType} request has been submitted and is pending approval`,
      th: `คำขอ${leaveType}ของคุณถูกส่งแล้วและกำลังรอการอนุมัติ`,
      my: `သင်၏ ${leaveType} တောင်းဆိုမှုကို တင်ပြပြီး အတည်ပြုချက်စောင့်ဆိုင်းနေသည်`
    },
    data: {
      type: 'submitted',
      leaveRequestId,
    },
  });
}
