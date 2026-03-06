'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Container,
    Skeleton,
    Button,
    Divider,
    Tabs,
    Tab,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
} from '@mui/material';
import { ArrowLeft2, Notification, TickCircle, Trash, Clock, MessageNotif, Send2, DocumentText, InfoCircle, CloseCircle, ArrowRight2, Status } from 'iconsax-react';
import { useRouter } from 'next/navigation';
import { useLocale } from '../providers/LocaleProvider';
import { useSession } from 'next-auth/react';
import BottomNav from '../components/BottomNav';

interface NotificationItem {
    id: number;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    data?: any;
}

// Tab categories - redesigned with 3 categories
type TabType = 'all' | 'action_required' | 'my_leaves' | 'system';

// Define which notification types belong to which category
// realTimeStatus is the actual current status of the leave request (pending, approved, rejected, cancelled)
// hasUserActed indicates whether the current user has already acted on this notification (approved/rejected)
const getNotificationCategory = (
    type: string,
    realTimeStatus?: string,
    hasUserActed?: boolean,
    isWaitingForCurrentUser?: boolean
): 'action_required' | 'my_leaves' | 'system' => {
    // สำหรับ notification ประเภท action_required (approval_pending, reminder)
    if (type === 'approval_pending' || type === 'reminder') {
        // 1. ถ้า user ได้ทำ action (approve/reject) ไปแล้ว ให้ย้ายไป system tab
        if (hasUserActed) {
            return 'system';
        }

        // 2. ถ้าใบลาเสร็จสิ้นแล้ว หรือ ไม่ใช่คิวของ user คนนี้แล้ว ให้ย้ายไป system tab
        if (realTimeStatus && ['approved', 'rejected', 'cancelled'].includes(realTimeStatus)) {
            return 'system';
        }

        // ถ้าใบลาอยู่ในสถานะ in_progress แต่ระบบระบุว่า "ไม่ใช่คิวเราแล้ว" (เช่น มีคนอื่นกดแทน หรือข้ามเลเวล)
        if (realTimeStatus === 'in_progress' && isWaitingForCurrentUser === false) {
            return 'system';
        }

        return 'action_required';
    }

    switch (type) {
        // For Employees - my leaves status updates (สถานะการอนุมัติ)
        case 'partial_approved':  // อนุมัติบางส่วน (ผ่านขั้นตอนแรก รอขั้นตอนถัดไป)
        case 'approved':          // อนุมัติแล้ว
        case 'rejected':          // ถูกปฏิเสธ
            return 'my_leaves';
        // System messages (ข้อความจากระบบ)
        case 'submitted':         // ส่งใบลาแล้ว
        case 'escalated':         // ถูก escalate
        case 'cancelled':         // ยกเลิกแล้ว
        default:
            return 'system';
    }
};

import { Drawer } from 'vaul';

// Leave type translation map for notification messages
const leaveTypeTranslations: Record<string, Record<string, string>> = {
    'vacation': { th: 'ลาพักร้อน', en: 'Vacation Leave', my: 'အားလပ်ခွင့်' },
    'sick': { th: 'ลาป่วย', en: 'Sick Leave', my: 'ဖျားနာခွင့်' },
    'personal': { th: 'ลากิจ', en: 'Personal Leave', my: 'ကိုယ်ရေးကိုယ်တာခွင့်' },
    'maternity': { th: 'ลาคลอด', en: 'Maternity Leave', my: 'မီးဖွားခွင့်' },
    'ordination': { th: 'ลาบวช', en: 'Ordination Leave', my: 'ရဟန်းခံခွင့်' },
    'military': { th: 'ลาเกณฑ์ทหาร', en: 'Military Leave', my: 'စစ်မှုထမ်းခွင့်' },
    'wedding': { th: 'ลาแต่งงาน', en: 'Wedding Leave', my: 'လက်ထပ်ခွင့်' },
    'funeral': { th: 'ลางานศพ', en: 'Funeral Leave', my: 'အသုဘခွင့်' },
    'wfh': { th: 'ทำงานที่บ้าน', en: 'Work From Home', my: 'အိမ်မှအလုပ်လုပ်' },
    'unpaid': { th: 'ลาไม่รับค่าจ้าง', en: 'Unpaid Leave', my: 'လစာမဲ့ခွင့်' },
};

export default function NotificationsPage() {
    const { t, locale } = useLocale();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeTab, setActiveTab] = useState<TabType>('all');

    // Drawer state for approve/reject
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [leaveDetails, setLeaveDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const dateLocale = locale === 'th' ? 'th-TH' : locale === 'my' ? 'my-MM' : 'en-US';

    // Translate leave type name based on current locale
    const translateLeaveType = useCallback((leaveTypeCode: string | undefined, fallback: string = '') => {
        if (!leaveTypeCode) return fallback;
        const code = leaveTypeCode.toLowerCase();
        return leaveTypeTranslations[code]?.[locale] || fallback || leaveTypeCode;
    }, [locale]);

    // Get translated notification title based on type
    const getTranslatedTitle = useCallback((notification: NotificationItem): string => {
        const titleKey = `notif_title_${notification.type}`;
        let translated = t(titleKey, '');
        if (!translated) {
            return notification.title;
        }

        translated = translated
            .replace('{{currentLevel}}', String(notification.data?.currentLevel ?? ''))
            .replace('{{totalLevels}}', String(notification.data?.totalLevels ?? ''));

        return translated;
    }, [t]);

    // Get translated notification message based on type and data
    const getTranslatedMessage = useCallback((notification: NotificationItem): string => {
        const messageKey = `notif_msg_${notification.type}`;
        let translated = t(messageKey, '');

        if (!translated) {
            return notification.message;
        }

        // Get leave type from data
        const leaveTypeCode = notification.data?.leaveTypeCode || notification.data?.leaveType;
        const leaveTypeName = translateLeaveType(leaveTypeCode, notification.data?.leaveTypeName || '');

        // Replace placeholders with actual values
        translated = translated
            .replace('{{leaveType}}', leaveTypeName)
            .replace('{{approverName}}', notification.data?.approverName || '')
            .replace('{{requesterName}}', notification.data?.requesterName || '')
            .replace('{{hoursLeft}}', notification.data?.hoursLeft || '')
            .replace('{{currentLevel}}', String(notification.data?.currentLevel ?? ''))
            .replace('{{totalLevels}}', String(notification.data?.totalLevels ?? ''));

        return translated;
    }, [t, translateLeaveType]);

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/login');
        }
    }, [status, router]);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/notifications?limit=100');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.data || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchNotifications();
        }
    }, [status, fetchNotifications]);

    // Filter notifications based on active tab
    const filteredNotifications = useMemo(() => {
        if (activeTab === 'all') return notifications;
        return notifications.filter(n =>
            getNotificationCategory(n.type, n.data?.realTimeStatus, n.data?.hasUserActed, n.data?.isWaitingForCurrentUser) === activeTab
        );
    }, [notifications, activeTab]);

    // Count unread per category
    const unreadCounts = useMemo(() => {
        const counts = {
            all: 0,
            action_required: 0,
            my_leaves: 0,
            system: 0,
        };
        notifications.forEach(n => {
            if (!n.isRead) {
                counts.all++;
                counts[getNotificationCategory(n.type, n.data?.realTimeStatus, n.data?.hasUserActed, n.data?.isWaitingForCurrentUser)]++;
            }
        });
        return counts;
    }, [notifications]);

    // Mark single notification as read
    const markAsRead = async (notificationId: number) => {
        // Optimistic update
        setNotifications(prev =>
            prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds: [notificationId] }),
                keepalive: true,
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            const res = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAllAsRead: true }),
                keepalive: true,
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    // Open approve/reject drawer
    const handleOpenDrawer = async (notification: NotificationItem, action: 'approve' | 'reject' = 'approve') => {
        setSelectedNotification(notification);
        setActionType(action);
        setComment('');
        setError('');
        setLeaveDetails(null);
        setDrawerOpen(true);

        // Mark as read
        if (!notification.isRead) {
            markAsRead(notification.id);
        }

        // Fetch leave details including attachments and latest status
        if (notification.data?.leaveRequestId) {
            setLoadingDetails(true);
            try {
                const res = await fetch(`/api/leaves/${notification.data.leaveRequestId}`);
                if (res.ok) {
                    const data = await res.json();
                    setLeaveDetails(data);
                }
            } catch (err) {
                console.error('Error fetching leave details:', err);
            } finally {
                setLoadingDetails(false);
            }
        }
    };

    // Submit approve/reject action
    const handleSubmitAction = async () => {
        if (!selectedNotification?.data?.leaveRequestId) return;

        if (actionType === 'reject' && !comment.trim()) {
            setError(t('please_enter_reason', 'กรุณาระบุเหตุผลในการปฏิเสธ'));
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const response = await fetch(`/api/leaves/${selectedNotification.data.leaveRequestId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: actionType,
                    comment: comment.trim() || undefined,
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({ error: 'เกิดข้อผิดพลาด' }));
                setError(data.error || t('error_occurred', 'เกิดข้อผิดพลาด'));
                return;
            }

            setDrawerOpen(false);
            setLeaveDetails(null);

            // Keep notification in list for history (don't remove)
            // Refresh to ensure latest status is reflected if needed
            fetchNotifications();

            // Show success (optional: could use toast)
        } catch (err) {
            setError(t('connection_error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ'));
        } finally {
            setSubmitting(false);
        }
    };

    // Format time ago
    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return t('just_now', 'เมื่อสักครู่');
        if (diffMins < 60) return t('minutes_ago', '{{mins}} นาทีที่แล้ว').replace('{{mins}}', String(diffMins));
        if (diffHours < 24) return t('hours_ago', '{{hours}} ชั่วโมงที่แล้ว').replace('{{hours}}', String(diffHours));
        if (diffDays < 7) return t('days_ago', '{{days}} วันที่แล้ว').replace('{{days}}', String(diffDays));
        return date.toLocaleDateString(dateLocale);
    };

    // Get notification icon based on type
    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'submitted':
                return <Send2 size={20} color="#2196F3" variant="Bold" />;
            case 'approval_pending':
                return <Clock size={20} color="#FFC107" variant="Bold" />;
            case 'reminder':
                return <InfoCircle size={20} color="#FF9800" variant="Bold" />;
            case 'partial_approved':
                return <Status size={20} color="#2196F3" variant="Bold" />;
            case 'approved':
                return <TickCircle size={20} color="#4CAF50" variant="Bold" />;
            case 'rejected':
                return <CloseCircle size={20} color="#F44336" variant="Bold" />;
            case 'escalated':
                return <DocumentText size={20} color="#9C27B0" variant="Bold" />;
            case 'cancelled':
                return <Trash size={20} color="#757575" variant="Bold" />;
            default:
                return <Notification size={20} color="#6C63FF" variant="Bold" />;
        }
    };

    // Get icon background color based on type
    const getIconBgColor = (type: string) => {
        switch (type) {
            case 'submitted':
                return '#E3F2FD';
            case 'approval_pending':
                return '#FFF8E1';
            case 'reminder':
                return '#FFF3E0';
            case 'partial_approved':
                return '#E3F2FD';
            case 'approved':
                return '#E8F5E9';
            case 'rejected':
                return '#FFEBEE';
            case 'escalated':
                return '#F3E5F5';
            case 'cancelled':
                return '#FAFAFA';
            default:
                return '#F1F5F9';
        }
    };

    // Handle notification click
    const handleNotificationClick = async (notification: NotificationItem) => {
        if (!notification.isRead) {
            markAsRead(notification.id);
        }

        // Navigate based on notification type and data
        const leaveRequestId = notification.data?.leaveRequestId;

        switch (notification.type) {
            case 'approval_pending':
            case 'reminder':
                // ไปหน้าอนุมัติใบลา
                if (leaveRequestId) {
                    router.push(`/approval/${leaveRequestId}?action=approve`);
                } else {
                    router.push('/approval');
                }
                break;
            case 'approved':
            case 'rejected':
            case 'submitted':
            case 'partial_approved':
            case 'escalated':
            case 'cancelled':
                // ไปหน้าใบลาของฉัน
                router.push('/leave');
                break;
            default:
                // Default: ไปหน้าใบลา
                router.push('/leave');
                break;
        }
    };

    // Handle tab change
    const handleTabChange = (_event: React.SyntheticEvent, newValue: TabType) => {
        setActiveTab(newValue);
    };


    // Check if user has approver role (can see action_required tab)
    const userRole = session?.user?.role || '';
    const isApprover = ['head', 'manager', 'dept_manager', 'shift_leader', 'hr_manager', 'admin'].includes(userRole);

    // Tab config - action_required tab only visible for approvers
    const tabs = [
        { value: 'all' as TabType, label: t('tab_all', 'ทั้งหมด'), icon: <Notification size={18} color="#6C63FF" /> },
        ...(isApprover ? [{
            value: 'action_required' as TabType,
            label: t('tab_action_required', 'รอดำเนินการ'),
            icon: <Clock size={18} color="#FFC107" />
        }] : []),
        { value: 'my_leaves' as TabType, label: t('tab_my_leaves', 'สถานะอนุมัติ'), icon: <TickCircle size={18} color="#4CAF50" /> },
        { value: 'system' as TabType, label: t('tab_system', 'ข้อความระบบ'), icon: <InfoCircle size={18} color="#2196F3" /> },
    ];

    if (status === 'loading') {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8F9FA' }}>
                <Skeleton variant="circular" width={80} height={80} />
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#F8F9FA', pb: 10 }}>
            {/* Header */}
            <Box
                sx={{
                    bgcolor: 'white',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                }}
            >
                <Container maxWidth={false} sx={{ maxWidth: 1200, px: { xs: 2.5, sm: 3, md: 4 } }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            py: 2,
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton onClick={() => router.back()} sx={{ ml: -1 }}>
                                <ArrowLeft2 size={24} color="#1E293B" />
                            </IconButton>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>
                                {t('notifications', 'การแจ้งเตือน')}
                            </Typography>
                            {unreadCount > 0 && (
                                <Box
                                    sx={{
                                        bgcolor: '#F44336',
                                        color: 'white',
                                        borderRadius: '12px',
                                        px: 1,
                                        py: 0.25,
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    {unreadCount}
                                </Box>
                            )}
                        </Box>
                        {unreadCount > 0 && (
                            <Button
                                size="small"
                                onClick={markAllAsRead}
                                sx={{
                                    fontSize: '0.8rem',
                                    color: '#6C63FF',
                                    textTransform: 'none',
                                }}
                            >
                                {t('mark_all_read', 'อ่านทั้งหมด')}
                            </Button>
                        )}
                    </Box>
                </Container>

                {/* Tabs */}
                <Box sx={{ borderBottom: '1px solid #E2E8F0' }}>
                    <Container maxWidth={false} sx={{ maxWidth: 1200, px: { xs: 2.5, sm: 3, md: 4 } }}>
                        <Tabs
                            value={activeTab}
                            onChange={handleTabChange}
                            variant="scrollable"
                            scrollButtons={false}
                            sx={{
                                minHeight: 48,
                                '& .MuiTabs-indicator': {
                                    bgcolor: '#6C63FF',
                                    height: 3,
                                    borderRadius: '3px 3px 0 0',
                                },
                                '& .MuiTab-root': {
                                    minHeight: 48,
                                    textTransform: 'none',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    color: '#94A3B8',
                                    '&.Mui-selected': {
                                        color: '#6C63FF',
                                        fontWeight: 600,
                                    },
                                },
                            }}
                        >
                            {tabs.map(tab => (
                                <Tab
                                    key={tab.value}
                                    value={tab.value}
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                            {tab.icon}
                                            <span>{tab.label}</span>
                                            {unreadCounts[tab.value] > 0 && (
                                                <Box
                                                    sx={{
                                                        bgcolor: activeTab === tab.value ? '#6C63FF' : '#E2E8F0',
                                                        color: activeTab === tab.value ? 'white' : '#64748B',
                                                        borderRadius: '10px',
                                                        px: 0.75,
                                                        py: 0.125,
                                                        fontSize: '0.7rem',
                                                        fontWeight: 600,
                                                        minWidth: 18,
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    {unreadCounts[tab.value]}
                                                </Box>
                                            )}
                                        </Box>
                                    }
                                />
                            ))}
                        </Tabs>
                    </Container>
                </Box>
            </Box>

            {/* Content */}
            <Container maxWidth={false} sx={{ maxWidth: 1200, px: { xs: 2.5, sm: 3, md: 4 }, py: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton
                                key={i}
                                variant="rectangular"
                                height={80}
                                sx={{ borderRadius: 1 }}
                            />
                        ))}
                    </Box>
                ) : filteredNotifications.length === 0 ? (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: 8,
                        }}
                    >
                        <Notification size={64} color="#CBD5E1" variant="Bulk" />
                        <Typography
                            variant="body1"
                            sx={{ mt: 2, color: '#94A3B8', fontWeight: 500 }}
                        >
                            {t('no_notifications', 'ไม่มีการแจ้งเตือน')}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ mt: 0.5, color: '#CBD5E1', textAlign: 'center' }}
                        >
                            {activeTab === 'all'
                                ? t('no_notifications_desc', 'เมื่อมีการแจ้งเตือนใหม่ จะแสดงที่นี่')
                                : activeTab === 'action_required'
                                    ? t('no_action_required_notifications', 'ไม่มีใบลารอดำเนินการ')
                                    : activeTab === 'my_leaves'
                                        ? t('no_my_leaves_notifications', 'ไม่มีการแจ้งเตือนสถานะการอนุมัติ')
                                        : t('no_system_notifications', 'ไม่มีข้อความจากระบบ')
                            }
                        </Typography>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            bgcolor: 'white',
                            borderRadius: 1,
                            overflow: 'hidden',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                    >
                        {filteredNotifications.map((notification, index) => (
                            <React.Fragment key={notification.id}>
                                <Box
                                    onClick={() => handleNotificationClick(notification)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 2,
                                        p: 2,
                                        bgcolor: notification.isRead ? 'transparent' : 'rgba(108, 99, 255, 0.04)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            bgcolor: notification.isRead
                                                ? 'rgba(0,0,0,0.02)'
                                                : 'rgba(108, 99, 255, 0.08)',
                                        },
                                        '&:active': {
                                            transform: 'scale(0.99)',
                                        },
                                    }}
                                >
                                    {/* Icon */}
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            bgcolor: getIconBgColor(notification.type),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {getNotificationIcon(notification.type)}
                                    </Box>

                                    {/* Content */}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                            sx={{
                                                fontWeight: notification.isRead ? 500 : 700,
                                                color: '#1E293B',
                                                fontSize: '0.9rem',
                                                mb: 0.5,
                                            }}
                                        >
                                            {getTranslatedTitle(notification)}
                                        </Typography>
                                        <Typography
                                            sx={{
                                                color: '#64748B',
                                                fontSize: '0.85rem',
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            {getTranslatedMessage(notification)}
                                        </Typography>

                                        {/* Show leave details if available */}
                                        {(notification.data?.leaveRequestId || notification.data?.startDate) && (
                                            <Box sx={{
                                                mt: 1,
                                                p: 1.5,
                                                bgcolor: '#F8FAFC',
                                                borderRadius: 1,
                                                border: '1px solid #E2E8F0'
                                            }}>
                                                {/* Leave Request ID and Type */}
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: notification.data?.startDate ? 0.75 : 0 }}>
                                                    {/* Leave Request ID / Code */}
                                                    {(notification.data?.leaveCode || notification.data?.leaveRequestId) && (
                                                        <Box sx={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            bgcolor: '#EEF2FF',
                                                            color: '#4F46E5',
                                                            px: 1,
                                                            py: 0.25,
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                        }}>
                                                            📋 {notification.data.leaveCode || `#${notification.data.leaveRequestId}`}
                                                        </Box>
                                                    )}

                                                    {/* Leave Type */}
                                                    {(notification.data?.leaveTypeCode || notification.data?.leaveTypeName) && (
                                                        <Box sx={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            bgcolor: '#FEF3C7',
                                                            color: '#D97706',
                                                            px: 1,
                                                            py: 0.25,
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                        }}>
                                                            🏷️ {translateLeaveType(notification.data.leaveTypeCode, notification.data.leaveTypeName)}
                                                        </Box>
                                                    )}

                                                    {/* Total Days */}
                                                    {notification.data?.totalDays && (
                                                        <Box sx={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            bgcolor: '#E0F2FE',
                                                            color: '#0284C7',
                                                            px: 1,
                                                            py: 0.25,
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                        }}>
                                                            ⏱️ {notification.data.totalDays} {t('days', 'วัน')}
                                                        </Box>
                                                    )}
                                                </Box>

                                                {/* Date range */}
                                                {notification.data?.startDate && (
                                                    <Typography
                                                        sx={{
                                                            color: '#475569',
                                                            fontSize: '0.8rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            mb: notification.data?.reason ? 0.75 : 0,
                                                        }}
                                                    >
                                                        📅 {t('leave_date', 'วันที่ลา')}: {new Date(notification.data.startDate).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        {notification.data?.endDate && notification.data.startDate !== notification.data.endDate && (
                                                            <> - {new Date(notification.data.endDate).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}</>
                                                        )}
                                                    </Typography>
                                                )}

                                                {/* Reason */}
                                                {notification.data?.reason && (
                                                    <Typography
                                                        sx={{
                                                            color: '#64748B',
                                                            fontSize: '0.8rem',
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                        }}
                                                    >
                                                        💬 {notification.data.reason}
                                                    </Typography>
                                                )}
                                            </Box>
                                        )}

                                        {/* Action Logic based on Real-Time Status */}
                                        {(() => {
                                            const isActionableType = (notification.type === 'approval_pending' || notification.type === 'reminder') && notification.data?.leaveRequestId;
                                            if (!isActionableType) return null;

                                            const realTimeStatus = notification.data?.realTimeStatus; // 'pending', 'in_progress', 'approved', 'rejected', 'cancelled'
                                            const isWaitingForCurrentUser = notification.data?.isWaitingForCurrentUser; // true if current user is next approver
                                            const hasUserActed = notification.data?.hasUserActed; // true if user already approved/rejected
                                            const userActionStatus = notification.data?.userActionStatus; // 'approved', 'rejected', 'skipped'

                                            // Show Buttons if:
                                            // 1. isWaitingForCurrentUser is true (user is the current approver in queue)
                                            // 2. OR status is pending/in_progress and no isWaitingForCurrentUser info (legacy/fallback)
                                            const showButtons = isWaitingForCurrentUser === true ||
                                                (isWaitingForCurrentUser === undefined && (realTimeStatus === 'pending' || realTimeStatus === 'in_progress') && !hasUserActed);

                                            if (showButtons) {
                                                return (
                                                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!notification.isRead) markAsRead(notification.id);
                                                                handleOpenDrawer(notification, 'approve');
                                                            }}
                                                            sx={{
                                                                bgcolor: '#4CAF50',
                                                                color: 'white',
                                                                textTransform: 'none',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                py: 0.5,
                                                                px: 1.5,
                                                                borderRadius: 1,
                                                                boxShadow: 'none',
                                                                '&:hover': {
                                                                    bgcolor: '#43A047',
                                                                    boxShadow: 'none',
                                                                },
                                                            }}
                                                            startIcon={<TickCircle size={14} color="#ffffff" />}
                                                        >
                                                            {t('approve', 'อนุมัติ')}
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!notification.isRead) markAsRead(notification.id);
                                                                handleOpenDrawer(notification, 'reject');
                                                            }}
                                                            sx={{
                                                                borderColor: '#F44336',
                                                                color: '#F44336',
                                                                textTransform: 'none',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                py: 0.5,
                                                                px: 1.5,
                                                                borderRadius: 1,
                                                                '&:hover': {
                                                                    borderColor: '#D32F2F',
                                                                    bgcolor: 'rgba(244, 67, 54, 0.04)',
                                                                },
                                                            }}
                                                            startIcon={<CloseCircle size={14} color="#F44336" />}
                                                        >
                                                            {t('reject', 'ปฏิเสธ')}
                                                        </Button>
                                                    </Box>
                                                );
                                            }

                                            // Show status if user has already acted OR leave is completed
                                            let statusColor = '#64748B';
                                            let statusText = '';
                                            let Icon = InfoCircle;

                                            // Priority 1: Show what the user did (if they acted)
                                            if (hasUserActed && userActionStatus) {
                                                if (userActionStatus === 'approved') {
                                                    statusColor = '#4CAF50';
                                                    statusText = t('you_approved', 'คุณอนุมัติแล้ว');
                                                    Icon = TickCircle;
                                                } else if (userActionStatus === 'rejected') {
                                                    statusColor = '#F44336';
                                                    statusText = t('you_rejected', 'คุณปฏิเสธแล้ว');
                                                    Icon = CloseCircle;
                                                } else if (userActionStatus === 'skipped') {
                                                    statusColor = '#9E9E9E';
                                                    statusText = t('skipped', 'ถูกข้าม');
                                                    Icon = InfoCircle;
                                                }
                                            }
                                            // Priority 2: Show overall leave status if user hasn't acted
                                            else if (realTimeStatus && realTimeStatus !== 'pending') {
                                                if (realTimeStatus === 'in_progress') {
                                                    statusColor = '#2196F3';
                                                    statusText = notification.data?.waitingFor
                                                        ? t('waiting_for', 'รอ {{name}}').replace('{{name}}', notification.data.waitingFor)
                                                        : t('in_progress', 'กำลังดำเนินการ');
                                                    Icon = Status;
                                                } else if (realTimeStatus === 'approved') {
                                                    statusColor = '#4CAF50';
                                                    statusText = t('approved', 'อนุมัติแล้ว');
                                                    Icon = TickCircle;
                                                } else if (realTimeStatus === 'rejected') {
                                                    statusColor = '#F44336';
                                                    statusText = t('rejected', 'ปฏิเสธแล้ว');
                                                    Icon = CloseCircle;
                                                } else if (realTimeStatus === 'cancelled') {
                                                    statusColor = '#9E9E9E';
                                                    statusText = t('cancelled', 'ยกเลิกแล้ว');
                                                    Icon = CloseCircle;
                                                }
                                            }

                                            if (statusText) {
                                                return (
                                                    <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Icon size={16} color={statusColor} variant="Bold" />
                                                        <Typography variant="body2" sx={{ color: statusColor, fontWeight: 600 }}>
                                                            {statusText}
                                                        </Typography>
                                                    </Box>
                                                );
                                            }

                                            // Fallback for "Read but no status" (legacy)
                                            if (!realTimeStatus && notification.isRead) {
                                                return (
                                                    <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <InfoCircle size={14} color="#94A3B8" />
                                                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                                                            {t('click_to_view_status', 'คลิกเพื่อดูสถานะปัจจุบัน')}
                                                        </Typography>
                                                    </Box>
                                                );
                                            }
                                        })()}

                                        <Typography
                                            sx={{
                                                color: '#94A3B8',
                                                fontSize: '0.75rem',
                                                mt: 0.5,
                                            }}
                                        >
                                            {formatTimeAgo(notification.createdAt)}
                                        </Typography>
                                    </Box>

                                    {/* Unread indicator */}
                                    {!notification.isRead && (
                                        <Box
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                bgcolor: '#6C63FF',
                                                flexShrink: 0,
                                                mt: 1,
                                            }}
                                        />
                                    )}
                                </Box>
                                {index < filteredNotifications.length - 1 && (
                                    <Divider sx={{ mx: 2 }} />
                                )}
                            </React.Fragment>
                        ))}
                    </Box>
                )}
            </Container>

            {/* Approval/Rejection Dialog */}
            <Drawer.Root
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                shouldScaleBackground={false}
            >
                <Drawer.Portal>
                    <Drawer.Overlay
                        className="vaul-overlay"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 1300,
                        }}
                    />
                    <Drawer.Content
                        className="vaul-content"
                        style={{
                            backgroundColor: 'white',
                            display: 'flex',
                            flexDirection: 'column',
                            borderTopLeftRadius: '16px',
                            borderTopRightRadius: '16px',
                            maxHeight: '85vh',
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            zIndex: 1301,
                            outline: 'none',
                        }}
                    >
                        <Drawer.Title style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
                            {t('notification_action', 'การดำเนินการ')}
                        </Drawer.Title>

                        <Box sx={{ p: 2, borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                            <Box sx={{ width: 40, height: 4, bgcolor: '#E2E8F0', borderRadius: 2 }} />
                        </Box>

                        <Box sx={{ p: 3, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            {/* Loading State */}
                            {loadingDetails ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                                    <Skeleton variant="circular" width={60} height={60} sx={{ mb: 2 }} />
                                    <Skeleton variant="text" width={200} height={30} />
                                    <Skeleton variant="text" width={150} height={20} />
                                </Box>
                            ) : leaveDetails ? (
                                <>
                                    {/* Status Check: If already processed, show banner */}
                                    {leaveDetails.status && leaveDetails.status !== 'pending' && leaveDetails.status !== 'in_progress' ? (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3, py: 2 }}>
                                            <Box
                                                sx={{
                                                    width: 72,
                                                    height: 72,
                                                    borderRadius: '50%',
                                                    bgcolor: leaveDetails.status === 'approved' ? '#E8F5E9' : '#FFEBEE',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    mb: 2,
                                                }}
                                            >
                                                {leaveDetails.status === 'approved' ? (
                                                    <TickCircle size={40} color="#2E7D32" variant="Bold" />
                                                ) : (
                                                    <CloseCircle size={40} color="#D32F2F" variant="Bold" />
                                                )}
                                            </Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: leaveDetails.status === 'approved' ? '#2E7D32' : '#D32F2F', mb: 0.5 }}>
                                                {leaveDetails.status === 'approved' ? t('approved_completed', 'อนุมัติเรียบร้อยแล้ว') : t('rejected_completed', 'ปฏิเสธเรียบร้อยแล้ว')}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#64748B' }}>
                                                {leaveDetails.updatedAt ? formatTimeAgo(leaveDetails.updatedAt) : formatTimeAgo(leaveDetails.createdAt)}
                                            </Typography>
                                        </Box>
                                    ) : (
                                        /* Normal Action UI */
                                        <Box sx={{ mb: 3 }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                                                <Box
                                                    sx={{
                                                        width: 56,
                                                        height: 56,
                                                        borderRadius: '50%',
                                                        bgcolor: actionType === 'approve' ? '#E8F5E9' : '#FFEBEE',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        mb: 2,
                                                    }}
                                                >
                                                    {actionType === 'approve' ? (
                                                        <TickCircle size={28} color="#2E7D32" variant="Bold" />
                                                    ) : (
                                                        <CloseCircle size={28} color="#D32F2F" variant="Bold" />
                                                    )}
                                                </Box>
                                                <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center' }}>
                                                    {actionType === 'approve' ? t('confirm_approve', 'ยืนยันการอนุมัติ') : t('confirm_reject', 'ยืนยันการปฏิเสธ')}
                                                </Typography>
                                            </Box>

                                            <Box sx={{ bgcolor: '#F8FAFC', p: 2.5, borderRadius: 1, mb: 3, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                {/* User Info */}
                                                {leaveDetails.user && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 2, borderBottom: '1px dashed #CBD5E1' }}>
                                                        <Box sx={{
                                                            width: 48,
                                                            height: 48,
                                                            borderRadius: '50%',
                                                            bgcolor: 'white',
                                                            color: '#4F46E5',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 700,
                                                            fontSize: '1.2rem',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                            border: '1px solid #E2E8F0'
                                                        }}>
                                                            {leaveDetails.user.firstName?.[0] || 'U'}
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1E293B', lineHeight: 1.2 }}>
                                                                {leaveDetails.user.firstName} {leaveDetails.user.lastName}
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
                                                                {leaveDetails.user.department}{leaveDetails.user.section ? ` • ${leaveDetails.user.section}` : ''}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                )}

                                                {/* Leave Info */}
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5, fontWeight: 500 }}>
                                                        {t('leave_details', 'รายละเอียดการลา')}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#1E293B' }}>
                                                            {translateLeaveType(leaveDetails.leaveType)}
                                                        </Typography>
                                                        <Chip
                                                            label={`${leaveDetails.totalDays} ${t('days', 'วัน')}`}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: '#EEF2FF',
                                                                color: '#4F46E5',
                                                                fontWeight: 600,
                                                                height: 24,
                                                                border: '1px solid #E0E7FF'
                                                            }}
                                                        />
                                                    </Box>
                                                    <Typography variant="body2" sx={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                        <Clock size={16} variant="Bulk" color="#64748B" />
                                                        {new Date(leaveDetails.startDate).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })} - {new Date(leaveDetails.endDate).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </Typography>
                                                </Box>

                                                {/* Reason */}
                                                {leaveDetails.reason && (
                                                    <Box sx={{ pt: 2, borderTop: '1px dashed #CBD5E1' }}>
                                                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5, fontWeight: 500 }}>
                                                            {t('reason', 'เหตุผลการลา')}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.6 }}>
                                                            {leaveDetails.reason}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>

                                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#1E293B' }}>
                                                {actionType === 'approve' ? t('comment', 'ความคิดเห็นเพิ่มเติม (ถ้ามี)') : t('reject_reason', 'ระบุเหตุผลในการปฏิเสธ *')}
                                            </Typography>
                                            <TextField
                                                fullWidth
                                                multiline
                                                rows={3}
                                                variant="outlined"
                                                placeholder={t('comment_placeholder', 'ระบุรายละเอียด...')}
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                                error={!!error}
                                                helperText={error}
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        bgcolor: '#F8FAFC',
                                                        '& fieldset': { borderColor: '#E2E8F0' },
                                                        '&:hover fieldset': { borderColor: '#CBD5E1' },
                                                        '&.Mui-focused fieldset': { borderColor: '#6C63FF' },
                                                    },
                                                }}
                                            />
                                        </Box>
                                    )}

                                    {/* Attachments Preview (if any) */}
                                    {leaveDetails.attachments && leaveDetails.attachments.length > 0 && (
                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#64748B', fontSize: '0.85rem' }}>
                                                {t('attachments', 'ไฟล์แนบ')} ({leaveDetails.attachments.length})
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1 }}>
                                                {leaveDetails.attachments.map((file: any, index: number) => (
                                                    <Box
                                                        key={file.id || index}
                                                        component="a"
                                                        href={file.filePath}
                                                        target="_blank"
                                                        sx={{
                                                            width: 80,
                                                            height: 80,
                                                            borderRadius: 2,
                                                            bgcolor: '#F8FAFC',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                            border: '1px solid #E2E8F0',
                                                            textDecoration: 'none',
                                                            position: 'relative',
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        {file.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                            <Box component="img" src={file.filePath} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <DocumentText size={28} color="#64748B" />
                                                        )}
                                                    </Box>
                                                ))}
                                            </Box>
                                        </Box>
                                    )}

                                    {/* Action Buttons */}
                                    <Box sx={{ display: 'flex', gap: 2, pb: 2 }}>
                                        {(leaveDetails.status === 'pending' || leaveDetails.status === 'in_progress') ? (
                                            <>
                                                <Button
                                                    fullWidth
                                                    variant="outlined"
                                                    onClick={() => setDrawerOpen(false)}
                                                    sx={{
                                                        py: 1.5,
                                                        borderRadius: 1.5,
                                                        borderColor: '#E2E8F0',
                                                        color: '#64748B',
                                                        textTransform: 'none',
                                                        fontSize: '0.95rem',
                                                        '&:hover': { borderColor: '#CBD5E1', bgcolor: '#F8FAFC' }
                                                    }}
                                                    disabled={submitting}
                                                >
                                                    {t('cancel', 'ยกเลิก')}
                                                </Button>
                                                <Button
                                                    fullWidth
                                                    variant="contained"
                                                    onClick={handleSubmitAction}
                                                    disabled={submitting || (actionType === 'reject' && !comment.trim())}
                                                    sx={{
                                                        py: 1.5,
                                                        borderRadius: 1.5,
                                                        bgcolor: actionType === 'approve' ? '#4CAF50' : '#F44336',
                                                        color: 'white',
                                                        fontWeight: 600,
                                                        textTransform: 'none',
                                                        fontSize: '0.95rem',
                                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                                        '&:hover': {
                                                            bgcolor: actionType === 'approve' ? '#43A047' : '#D32F2F',
                                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                        }
                                                    }}
                                                >
                                                    {submitting
                                                        ? t('processing', 'กำลังดำเนินการ...')
                                                        : (actionType === 'approve' ? t('confirm_approve', 'ยืนยันอนุมัติ') : t('confirm_reject', 'ยืนยันปฏิเสธ'))
                                                    }
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                onClick={() => setDrawerOpen(false)}
                                                sx={{
                                                    py: 1.5,
                                                    borderRadius: 1.5,
                                                    borderColor: '#E2E8F0',
                                                    color: '#64748B',
                                                    textTransform: 'none',
                                                    fontSize: '0.95rem',
                                                    '&:hover': { borderColor: '#CBD5E1', bgcolor: '#F8FAFC' }
                                                }}
                                            >
                                                {t('close', 'ปิด')}
                                            </Button>
                                        )}
                                    </Box>
                                </>
                            ) : null}
                        </Box>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            <BottomNav />
        </Box>
    );
}
