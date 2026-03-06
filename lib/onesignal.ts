/**
 * OneSignal Push Notification Service
 * ใช้สำหรับส่งแจ้งเตือนไปยัง Mobile App
 */

import { prisma } from './prisma';

// OneSignal Configuration
const ONESIGNAL_APP_ID = (process.env.ONESIGNAL_APP_ID || '').trim();
const ONESIGNAL_REST_API_KEY = (process.env.ONESIGNAL_REST_API_KEY || '').trim();
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leave.poonsubcan.co.th';

// Leave type translations
const leaveTypeTranslations: Record<string, { th: string; en: string; my: string }> = {
  sick: { th: 'ลาป่วย', en: 'Sick Leave', my: 'ဆေးခွင့်' },
  personal: { th: 'ลากิจ', en: 'Personal Leave', my: 'ရှောင်တခင်ခွင့်' },
  vacation: { th: 'ลาพักร้อน', en: 'Vacation Leave', my: 'အပန်းဖြေခွင့်' },
  annual: { th: 'ลาพักร้อน', en: 'Annual Leave', my: 'လုပ်သက်ခွင့်' },
  maternity: { th: 'ลาคลอด', en: 'Maternity Leave', my: 'မီးဖွားခွင့်' },
  ordination: { th: 'ลาอุปสมบท', en: 'Ordination Leave', my: 'ရဟန်းခံခွင့်' },
  military: { th: 'ลาเกณฑ์ทหาร', en: 'Military Service Leave', my: 'စစ်မှုထမ်းခွင့်' },
  marriage: { th: 'ลาแต่งงาน', en: 'Marriage Leave', my: 'မင်္ဂလာဆောင်ခွင့်' },
  funeral: { th: 'ลาฌาปนกิจ', en: 'Funeral Leave', my: 'နာရေးခွင့်' },
  paternity: { th: 'ลาดูแลภรรยาคลอด', en: 'Paternity Leave', my: 'ဖခင်ခွင့်' },
  sterilization: { th: 'ลาทำหมัน', en: 'Sterilization Leave', my: 'သားဆက်ခြားခွင့်' },
  business: { th: 'ลาติดต่อราชการ', en: 'Business Leave', my: 'အလုပ်ကိစ္စခွင့်' },
  unpaid: { th: 'ลาไม่รับค่าจ้าง', en: 'Unpaid Leave', my: 'လစာမဲ့ခွင့်' },
  other: { th: 'ลาอื่นๆ', en: 'Other Leave', my: 'အခြားခွင့်' },
};

/**
 * แปลงชื่อประเภทการลาตามภาษา
 */
function translateLeaveType(leaveType: string, locale: 'th' | 'en' | 'my'): string {
  const key = leaveType.toLowerCase();
  const translation = leaveTypeTranslations[key];
  if (translation) {
    return translation[locale];
  }
  // ถ้าไม่พบในรายการ ให้ใช้ค่าเดิม
  return leaveType;
}

export interface NotificationPayload {
  title: string | Record<string, string>;
  message: string | Record<string, string>;
  data?: Record<string, any>;
  url?: string;
  buttons?: Array<{
    id: string;
    text: string;
    icon?: string;
    url?: string;
  }>;
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

    // Build notification body
    const notificationBody: Record<string, any> = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: headings,
      contents: contents,
      data: payload.data || {},
    };

    // Add URL for click action (use web_url only - OneSignal doesn't allow both url and web_url)
    if (payload.url) {
      notificationBody.web_url = payload.url;
    }

    // Add action buttons
    if (payload.buttons && payload.buttons.length > 0) {
      notificationBody.buttons = payload.buttons;   // For mobile
      notificationBody.web_buttons = payload.buttons.map(btn => ({
        id: btn.id,
        text: btn.text,
        icon: btn.icon,
        url: btn.url,
      }));  // For web push
    }

    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notificationBody),
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('OneSignal API Non-JSON Response:', responseText);
      return { success: false, error: `Invalid JSON response: ${responseText.substring(0, 100)}...` };
    }

    if (response.ok && result.id) {
      console.log('OneSignal Success:', result.id);
      return { success: true, notificationId: result.id };
    } else {
      console.error('OneSignal API Error Status:', response.status);
      console.error('OneSignal API Error Body:', result);

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
    console.warn(`🔔 notifyUser: No active devices found for userId ${userId}`);
    // ไม่มี device ลงทะเบียน แต่ยังบันทึก log
    await prisma.notificationLog.create({
      data: { ...logData, status: 'failed' },
    });
    return { success: false, error: `No devices registered for userId ${userId}` };
  }

  console.log(`🔔 notifyUser: Found ${playerIds.length} devices for userId ${userId}. Sending push...`);

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
  leaveType: string,
  totalDays?: number,
  startDate?: string,
  endDate?: string,
  reason?: string,
  leaveCode?: string
): Promise<NotificationResult> {
  const thLeaveType = translateLeaveType(leaveType, 'th');
  const enLeaveType = translateLeaveType(leaveType, 'en');
  const myLeaveType = translateLeaveType(leaveType, 'my');

  const daysText = totalDays ? ` (${totalDays} ${totalDays === 1 ? 'day' : 'days'})` : '';
  const daysTextTh = totalDays ? ` (${totalDays} วัน)` : '';

  return notifyUser(approverId, 'approval_pending', {
    title: {
      en: '📋 Leave Request Pending',
      th: '📋 มีใบลารออนุมัติ',
      my: '📋 ခွင့်တောင်းဆိုမှုစောင့်ဆိုင်းနေသည်'
    },
    message: {
      en: `${requesterName} requested ${enLeaveType}${daysText}`,
      th: `${requesterName} ขอ${thLeaveType}${daysTextTh}`,
      my: `${requesterName} က ${myLeaveType} တောင်းဆိုသည်${daysText}`
    },
    url: `${APP_URL}/approval/${leaveRequestId}?action=approve`,
    buttons: [
      {
        id: 'approve',
        text: '✅ อนุมัติ',
        url: `${APP_URL}/approval/${leaveRequestId}?action=approve`,
      },
      {
        id: 'reject',
        text: '❌ ปฏิเสธ',
        url: `${APP_URL}/approval/${leaveRequestId}?action=reject`,
      },
    ],
    data: {
      type: 'approval_pending',
      leaveRequestId,
      leaveCode: leaveCode || null,
      leaveTypeCode: leaveType,
      requesterName,
      totalDays: totalDays || null,
      startDate: startDate || null,
      endDate: endDate || null,
      reason: reason || null,
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
  leaveType: string,
  totalDays?: number,
  startDate?: string,
  endDate?: string,
  leaveCode?: string
): Promise<NotificationResult> {
  const thLeaveType = translateLeaveType(leaveType, 'th');
  const enLeaveType = translateLeaveType(leaveType, 'en');
  const myLeaveType = translateLeaveType(leaveType, 'my');

  return notifyUser(userId, 'approved', {
    title: {
      en: '✅ Leave Approved',
      th: '✅ ใบลาได้รับการอนุมัติ',
      my: '✅ ခွင့်အတည်ပြုပြီး'
    },
    message: {
      en: `Your ${enLeaveType} has been approved by ${approverName}`,
      th: `${thLeaveType}ของคุณได้รับการอนุมัติโดย ${approverName}`,
      my: `သင်၏ ${myLeaveType} ကို ${approverName} က အတည်ပြုပြီး`
    },
    url: `${APP_URL}/leave`,
    data: {
      type: 'approved',
      leaveRequestId,
      leaveCode: leaveCode || null,
      leaveTypeCode: leaveType,
      approverName,
      totalDays: totalDays || null,
      startDate: startDate || null,
      endDate: endDate || null,
    },
  });
}

/**
 * แจ้งเตือนเมื่อใบลาผ่านการอนุมัติขั้นหนึ่ง (ยังมีผู้อนุมัติถัดไป)
 */
export async function notifyLeavePartialApproved(
  userId: number,
  leaveRequestId: number,
  approverName: string,
  leaveType: string,
  currentLevel: number,
  totalLevels: number,
  totalDays?: number,
  startDate?: string,
  endDate?: string,
  leaveCode?: string
): Promise<NotificationResult> {
  const thLeaveType = translateLeaveType(leaveType, 'th');
  const enLeaveType = translateLeaveType(leaveType, 'en');
  const myLeaveType = translateLeaveType(leaveType, 'my');

  return notifyUser(userId, 'partial_approved', {
    title: {
      en: `📝 Leave Approved ${currentLevel}/${totalLevels} Steps`,
      th: `📝 ใบลาผ่านการอนุมัติ ${currentLevel}/${totalLevels} ขั้นตอน`,
      my: `📝 ခွင့်အတည်ပြုမှု ${currentLevel}/${totalLevels} အဆင့်`
    },
    message: {
      en: `Your ${enLeaveType} was approved by ${approverName} (Step ${currentLevel} of ${totalLevels}). Waiting for the next approver.`,
      th: `${thLeaveType}ของคุณผ่านการอนุมัติโดย ${approverName} (อนุมัติขั้นตอนที่ ${currentLevel} จากทั้งหมด ${totalLevels} ขั้นตอน) รอผู้อนุมัติลำดับถัดไป`,
      my: `သင်၏ ${myLeaveType} ကို ${approverName} က အတည်ပြုပြီး (အဆင့် ${currentLevel} / ${totalLevels}) နောက်ထပ်အတည်ပြုသူစောင့်ဆိုင်းနေသည်`
    },
    url: `${APP_URL}/leave`,
    data: {
      type: 'partial_approved',
      leaveRequestId,
      leaveCode: leaveCode || null,
      leaveTypeCode: leaveType,
      approverName,
      currentLevel,
      totalLevels,
      totalDays: totalDays || null,
      startDate: startDate || null,
      endDate: endDate || null,
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
  reason?: string,
  totalDays?: number,
  startDate?: string,
  endDate?: string,
  leaveCode?: string
): Promise<NotificationResult> {
  const thLeaveType = translateLeaveType(leaveType, 'th');
  const enLeaveType = translateLeaveType(leaveType, 'en');
  const myLeaveType = translateLeaveType(leaveType, 'my');

  return notifyUser(userId, 'rejected', {
    title: {
      en: '❌ Leave Rejected',
      th: '❌ ใบลาถูกปฏิเสธ',
      my: '❌ ခွင့်ပယ်ချခံရသည်'
    },
    message: {
      en: `Your ${enLeaveType} has been rejected by ${approverName}${reason ? `: ${reason}` : ''}`,
      th: `${thLeaveType}ของคุณถูกปฏิเสธโดย ${approverName}${reason ? `: ${reason}` : ''}`,
      my: `သင်၏ ${myLeaveType} ကို ${approverName} က ပယ်ချလိုက်သည်${reason ? `: ${reason}` : ''}`
    },
    url: `${APP_URL}/leave`,
    data: {
      type: 'rejected',
      leaveRequestId,
      leaveCode: leaveCode || null,
      leaveTypeCode: leaveType,
      approverName,
      reason,
      totalDays: totalDays || null,
      startDate: startDate || null,
      endDate: endDate || null,
    },
  });
}

/**
 * แจ้งเตือนเมื่อใบลาถูก escalate ไป HR
 */
export async function notifyEscalated(
  userId: number,
  leaveRequestId: number,
  leaveType: string,
  totalDays?: number,
  startDate?: string,
  endDate?: string,
  leaveCode?: string
): Promise<NotificationResult> {
  const thLeaveType = translateLeaveType(leaveType, 'th');
  const enLeaveType = translateLeaveType(leaveType, 'en');
  const myLeaveType = translateLeaveType(leaveType, 'my');

  return notifyUser(userId, 'escalated', {
    title: {
      en: '⚡ Leave Escalated',
      th: '⚡ ใบลาถูกส่งต่อถึงฝ่ายบุคคล',
      my: '⚡ ခွင့်တိုးမြှင့်တင်ပြပြီး'
    },
    message: {
      en: `Leave request from ${leaveCode || 'employee'} has been escalated to you due to timeout`,
      th: `ใบลาเลขที่ ${leaveCode || ''} ถูกส่งต่อถึงคุณเนื่องจากผู้อนุมัติเดิมไม่ได้ดำเนินการในเวลาที่กำหนด`,
      my: `ခွင့်တောင်းဆိုမှု ${leaveCode || ''} ကို အချိန်လွန်သောကြောင့် သင့်ထံ တင်ပြလိုက်သည်`
    },
    url: `${APP_URL}/approval/${leaveRequestId}?action=approve`,
    buttons: [
      {
        id: 'approve',
        text: '✅ อนุมัติ',
        url: `${APP_URL}/approval/${leaveRequestId}?action=approve`,
      },
      {
        id: 'reject',
        text: '❌ ปฏิเสธ',
        url: `${APP_URL}/approval/${leaveRequestId}?action=reject`,
      },
    ],
    data: {
      type: 'escalated',
      leaveRequestId,
      leaveCode: leaveCode || null,
      leaveTypeCode: leaveType,
      totalDays: totalDays || null,
      startDate: startDate || null,
      endDate: endDate || null,
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
  const thLeaveType = translateLeaveType(leaveType, 'th');
  const enLeaveType = translateLeaveType(leaveType, 'en');
  const myLeaveType = translateLeaveType(leaveType, 'my');

  return notifyUser(approverId, 'reminder', {
    title: {
      en: '⏰ Leave Approval Reminder',
      th: '⏰ เตือนอนุมัติใบลา',
      my: '⏰ ခွင့်အတည်ပြုရန်သတိပေးချက်'
    },
    message: {
      en: `${requesterName} is waiting for ${enLeaveType} approval (${hoursLeft} hrs left)`,
      th: `${requesterName} รอ${thLeaveType} (เหลือเวลา ${hoursLeft} ชม.)`,
      my: `${requesterName} က ${myLeaveType} အတည်ပြုရန်စောင့်ဆိုင်းနေသည် (${hoursLeft} နာရီကျန်)`
    },
    url: `${APP_URL}/approval/${leaveRequestId}?action=approve`,
    buttons: [
      {
        id: 'approve',
        text: '✅ อนุมัติ',
        url: `${APP_URL}/approval/${leaveRequestId}?action=approve`,
      },
      {
        id: 'reject',
        text: '❌ ปฏิเสธ',
        url: `${APP_URL}/approval/${leaveRequestId}?action=reject`,
      },
    ],
    data: {
      type: 'reminder',
      leaveRequestId,
      leaveTypeCode: leaveType,
      requesterName,
      hoursLeft: String(hoursLeft),
    },
  });
}

/**
 * แจ้งเตือนเมื่อส่งใบลาสำเร็จ (แจ้งผู้ขอ)
 */
export async function notifyLeaveSubmitted(
  userId: number,
  leaveRequestId: number,
  leaveType: string,
  totalDays?: number,
  startDate?: string,
  endDate?: string,
  leaveCode?: string
): Promise<NotificationResult> {
  const thLeaveType = translateLeaveType(leaveType, 'th');
  const enLeaveType = translateLeaveType(leaveType, 'en');
  const myLeaveType = translateLeaveType(leaveType, 'my');

  return notifyUser(userId, 'submitted', {
    title: {
      en: '✅ Leave Submitted',
      th: '✅ ส่งใบลาสำเร็จ',
      my: '✅ ခွင့်တင်ပြပြီး'
    },
    message: {
      en: `Your ${enLeaveType} request has been submitted and is pending approval`,
      th: `คำขอ${thLeaveType}ของคุณถูกส่งแล้วและกำลังรอการอนุมัติ`,
      my: `သင်၏ ${myLeaveType} တောင်းဆိုမှုကို တင်ပြပြီး အတည်ပြုချက်စောင့်ဆိုင်းနေသည်`
    },
    url: `${APP_URL}/leave`,
    data: {
      type: 'submitted',
      leaveRequestId,
      leaveCode: leaveCode || null,
      leaveTypeCode: leaveType,
      totalDays: totalDays || null,
      startDate: startDate || null,
      endDate: endDate || null,
    },
  });
}
