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
import { ArrowLeft2, Notification, TickCircle, Trash, Clock, MessageNotif, Send2, DocumentText, InfoCircle, CloseCircle, ArrowRight2 } from 'iconsax-react';
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

// Tab categories
type TabType = 'all' | 'submitted' | 'results' | 'system';

// Define which notification types belong to which category
const getNotificationCategory = (type: string): TabType => {
    switch (type) {
        case 'submitted':
            return 'submitted';
        case 'approved':
        case 'rejected':
            return 'results';
        case 'approval_pending':
        case 'reminder':
        case 'escalated':
        case 'cancelled':
        default:
            return 'system';
    }
};

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
    const { status } = useSession();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeTab, setActiveTab] = useState<TabType>('all');
    
    // Dialog state for approve/reject
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [attachments, setAttachments] = useState<any[]>([]);
    const [loadingAttachments, setLoadingAttachments] = useState(false);

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
        const translated = t(titleKey, '');
        return translated || notification.title;
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
            .replace('{{hoursLeft}}', notification.data?.hoursLeft || '');

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
        return notifications.filter(n => getNotificationCategory(n.type) === activeTab);
    }, [notifications, activeTab]);

    // Count unread per category
    const unreadCounts = useMemo(() => {
        const counts = {
            all: 0,
            submitted: 0,
            results: 0,
            system: 0,
        };
        notifications.forEach(n => {
            if (!n.isRead) {
                counts.all++;
                counts[getNotificationCategory(n.type)]++;
            }
        });
        return counts;
    }, [notifications]);

    // Mark single notification as read
    const markAsRead = async (notificationId: number) => {
        try {
            const res = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId }),
            });
            if (res.ok) {
                setNotifications(prev =>
                    prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
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
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    // Open approve/reject dialog
    const handleOpenDialog = async (notification: NotificationItem, action: 'approve' | 'reject') => {
        setSelectedNotification(notification);
        setActionType(action);
        setComment('');
        setError('');
        setAttachments([]);
        setDialogOpen(true);
        
        // Mark as read
        if (!notification.isRead) {
            markAsRead(notification.id);
        }
        
        // Fetch attachments from leave request
        if (notification.data?.leaveRequestId) {
            setLoadingAttachments(true);
            try {
                const res = await fetch(`/api/leaves/${notification.data.leaveRequestId}`);
                if (res.ok) {
                    const data = await res.json();
                    setAttachments(data.attachments || []);
                }
            } catch (err) {
                console.error('Error fetching attachments:', err);
            } finally {
                setLoadingAttachments(false);
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

            setDialogOpen(false);
            
            // Remove the notification from list or refresh
            setNotifications(prev => prev.filter(n => n.id !== selectedNotification.id));
            
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
            await markAsRead(notification.id);
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

    // Tab config
    const tabs = [
        { value: 'all' as TabType, label: t('tab_all', 'ทั้งหมด'), icon: <Notification size={18} color="#6C63FF" /> },
        { value: 'submitted' as TabType, label: t('tab_submitted', 'ส่งใบลา'), icon: <Send2 size={18} color="#2196F3" /> },
        { value: 'results' as TabType, label: t('tab_results', 'ผลอนุมัติ'), icon: <TickCircle size={18} color="#4CAF50" /> },
        { value: 'system' as TabType, label: t('tab_system', 'ระบบ'), icon: <InfoCircle size={18} color="#FF9800" /> },
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
                                : activeTab === 'submitted'
                                    ? t('no_submitted_notifications', 'ไม่มีการแจ้งเตือนการส่งใบลา')
                                    : activeTab === 'results'
                                        ? t('no_results_notifications', 'ไม่มีการแจ้งเตือนผลอนุมัติ')
                                        : t('no_system_notifications', 'ไม่มีการแจ้งเตือนจากระบบ')
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
                                        {(notification.data?.totalDays || notification.data?.startDate) && (
                                            <Box sx={{ 
                                                mt: 1, 
                                                p: 1.5, 
                                                bgcolor: '#F8FAFC', 
                                                borderRadius: 1,
                                                border: '1px solid #E2E8F0'
                                            }}>
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
                                                        📅 {new Date(notification.data.startDate).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
                                                        {notification.data?.endDate && notification.data.startDate !== notification.data.endDate && (
                                                            <> - {new Date(notification.data.endDate).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}</>
                                                        )}
                                                        {notification.data?.totalDays && (
                                                            <Box component="span" sx={{ color: '#6C63FF', fontWeight: 600, ml: 0.5 }}>
                                                                ({notification.data.totalDays} {t('days', 'วัน')})
                                                            </Box>
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
                                        
                                        {/* Action buttons for approval_pending and reminder */}
                                        {(notification.type === 'approval_pending' || notification.type === 'reminder') && notification.data?.leaveRequestId && (
                                            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!notification.isRead) markAsRead(notification.id);
                                                        handleOpenDialog(notification, 'approve');
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
                                                        handleOpenDialog(notification, 'reject');
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
                                        )}
                                        
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
            <Dialog
                open={dialogOpen}
                onClose={() => !submitting && setDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 1,
                        mx: 2,
                    },
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {actionType === 'approve' ? (
                            <TickCircle size={28} color="#4CAF50" variant="Bold" />
                        ) : (
                            <CloseCircle size={28} color="#F44336" variant="Bold" />
                        )}
                        <Typography variant="h6" fontWeight={600}>
                            {actionType === 'approve'
                                ? t('confirmApproval', 'ยืนยันการอนุมัติ')
                                : t('confirmRejection', 'ยืนยันการปฏิเสธ')}
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Leave Info Summary */}
                    {selectedNotification && (
                        <Box
                            sx={{
                                bgcolor: '#F8FAFC',
                                borderRadius: 1,
                                p: 2,
                                mb: 2,
                            }}
                        >
                            <Typography fontWeight={600} sx={{ mb: 1 }}>
                                {selectedNotification.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                {selectedNotification.message}
                            </Typography>
                            {selectedNotification.data?.startDate && (
                                <Typography variant="body2" color="text.secondary">
                                    📅 {new Date(selectedNotification.data.startDate).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {selectedNotification.data?.endDate && selectedNotification.data.startDate !== selectedNotification.data.endDate && (
                                        <> - {new Date(selectedNotification.data.endDate).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}</>
                                    )}
                                    {selectedNotification.data?.totalDays && (
                                        <Box component="span" sx={{ color: '#6C63FF', fontWeight: 600, ml: 0.5 }}>
                                            ({selectedNotification.data.totalDays} {t('days', 'วัน')})
                                        </Box>
                                    )}
                                </Typography>
                            )}
                            {selectedNotification.data?.reason && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    💬 {selectedNotification.data.reason}
                                </Typography>
                            )}
                            
                            {/* Attachments */}
                            {loadingAttachments && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {t('loading_attachments', 'กำลังโหลดไฟล์แนบ...')}
                                </Typography>
                            )}
                            {!loadingAttachments && attachments.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                        📎 {t('attachments', 'ไฟล์แนบ')} ({attachments.length})
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {attachments.map((file: any, index: number) => (
                                            <Box
                                                key={file.id || index}
                                                component="a"
                                                href={file.filePath}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                    bgcolor: '#E8F4FD',
                                                    color: '#1976D2',
                                                    px: 1.5,
                                                    py: 0.5,
                                                    borderRadius: 1,
                                                    fontSize: '0.75rem',
                                                    textDecoration: 'none',
                                                    '&:hover': {
                                                        bgcolor: '#D0E8FA',
                                                    },
                                                }}
                                            >
                                                <DocumentText size={14} color="#1976D2" />
                                                {file.fileName || `ไฟล์ ${index + 1}`}
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}

                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label={actionType === 'approve'
                            ? t('approvalComment', 'ความคิดเห็น (ถ้ามี)')
                            : t('rejectionReason', 'เหตุผลในการปฏิเสธ')}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={actionType === 'approve'
                            ? t('enterApprovalComment', 'ใส่ความคิดเห็น...')
                            : t('enterRejectionReason', 'ใส่เหตุผลในการปฏิเสธ...')}
                        required={actionType === 'reject'}
                        disabled={submitting}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 1,
                            },
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        onClick={() => setDialogOpen(false)}
                        disabled={submitting}
                        sx={{
                            color: '#64748B',
                            textTransform: 'none',
                        }}
                    >
                        {t('cancel', 'ยกเลิก')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmitAction}
                        disabled={submitting || (actionType === 'reject' && !comment.trim())}
                        sx={{
                            bgcolor: actionType === 'approve' ? '#4CAF50' : '#F44336',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                            borderRadius: 1,
                            '&:hover': {
                                bgcolor: actionType === 'approve' ? '#43A047' : '#D32F2F',
                            },
                        }}
                        startIcon={actionType === 'approve'
                            ? <TickCircle size={18} color="#ffffff" />
                            : <CloseCircle size={18} color="#ffffff" />}
                    >
                        {submitting
                            ? t('processing', 'กำลังดำเนินการ...')
                            : actionType === 'approve'
                                ? t('approve', 'อนุมัติ')
                                : t('reject', 'ปฏิเสธ')}
                    </Button>
                </DialogActions>
            </Dialog>

            <BottomNav />
        </Box>
    );
}
