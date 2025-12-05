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
} from '@mui/material';
import { ArrowLeft2, Notification, TickCircle, Trash, Clock, MessageNotif, Send2, DocumentText, InfoCircle, CloseCircle } from 'iconsax-react';
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

export default function NotificationsPage() {
    const { t, locale } = useLocale();
    const router = useRouter();
    const { status } = useSession();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeTab, setActiveTab] = useState<TabType>('all');

    const dateLocale = locale === 'th' ? 'th-TH' : locale === 'my' ? 'my-MM' : 'en-US';

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
        if (notification.data?.leaveRequestId) {
            // Could navigate to leave detail page if needed
            // router.push(`/leave/detail/${notification.data.leaveRequestId}`);
        }
    };

    // Handle tab change
    const handleTabChange = (_event: React.SyntheticEvent, newValue: TabType) => {
        setActiveTab(newValue);
    };

    // Tab config
    const tabs = [
        { value: 'all' as TabType, label: t('tab_all', 'ทั้งหมด'), icon: <Notification size={18} /> },
        { value: 'submitted' as TabType, label: t('tab_submitted', 'ส่งใบลา'), icon: <Send2 size={18} /> },
        { value: 'results' as TabType, label: t('tab_results', 'ผลอนุมัติ'), icon: <TickCircle size={18} /> },
        { value: 'system' as TabType, label: t('tab_system', 'ระบบ'), icon: <InfoCircle size={18} /> },
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
                                            {notification.title}
                                        </Typography>
                                        <Typography
                                            sx={{
                                                color: '#64748B',
                                                fontSize: '0.85rem',
                                                lineHeight: 1.4,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {notification.message}
                                        </Typography>
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

            <BottomNav />
        </Box>
    );
}
