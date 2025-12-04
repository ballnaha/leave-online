'use client';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Box, Typography, IconButton, Badge, Avatar, Skeleton, Popover, List, ListItem, ListItemText, Divider, Button } from '@mui/material';
import { Notification } from 'iconsax-react';
import Sidebar from './Sidebar';
import ImageSlider from './ImageSlider';
import { useLocale } from '../providers/LocaleProvider';
import { useUser } from '../providers/UserProvider';

interface NotificationItem {
    id: number;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

const Header = () => {
    const { t, locale } = useLocale();
    const { user, loading } = useUser();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    const dateLocale = useMemo(() => (locale === 'th' ? 'th-TH' : locale === 'my' ? 'my-MM' : 'en-US'), [locale]);
    const currentDate = new Date().toLocaleDateString(dateLocale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            setLoadingNotifications(true);
            const res = await fetch('/api/notifications?limit=10');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.data || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoadingNotifications(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        // Refresh every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

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
            console.error('Error marking notifications as read:', error);
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

        if (diffMins < 1) return 'เมื่อสักครู่';
        if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
        if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
        if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
        return date.toLocaleDateString(dateLocale);
    };

    const handleNotificationClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    // แสดง Sidebar สำหรับทุกคนยกเว้น employee
    const showSidebar = !!user && user.role !== 'employee';

    return (
        <>
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2, 
                pt: 3, 
                pb: 1,
                mx: { xs: -2, md: 0 },
                px: 2,
                borderBottom: '1px solid #f0f0f0',
                width: { xs: '100vw', md: '100%' },
                position: 'relative',
                left: { xs: '50%', md: 'auto' },
                transform: { xs: 'translateX(-50%)', md: 'none' },
            }}>
                {/* Top Row: Menu, Avatar, Date/Greeting, Notification */}
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 50,
                    maxWidth: 1200,
                    mx: 'auto',
                    width: '100%',
                    pl: 2,
                    pr: 0,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {/* แสดง Hamburger Menu สำหรับทุกคนยกเว้น employee */}
                        {showSidebar && (
                            <IconButton
                                onClick={() => setIsSidebarOpen(true)}
                                sx={{ 
                                    color: 'text.primary',
                                    width: 40,
                                    height: 40,
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        width: 20,
                                        height: 16,
                                        position: 'relative',
                                        '& span': {
                                            display: 'block',
                                            position: 'absolute',
                                            height: 2,
                                            bgcolor: 'primary.main',
                                            borderRadius: 1,
                                            transition: 'all 0.3s ease',
                                        },
                                    }}
                                >
                                    <Box
                                        component="span"
                                        sx={{
                                            width: 20,
                                            top: 0,
                                        }}
                                    />
                                    <Box
                                        component="span"
                                        sx={{
                                            width: 14,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            left: 0,
                                        }}
                                    />
                                    <Box
                                        component="span"
                                        sx={{
                                            width: 20,
                                            bottom: 0,
                                            left: 0,
                                        }}
                                    />
                                </Box>
                            </IconButton>
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {loading ? (
                                <Skeleton variant="circular" width={54} height={54} />
                            ) : (
                                <Avatar
                                    alt={user ? `${user.firstName} ${user.lastName}` : 'User'}
                                    src={user?.avatar || undefined}
                                    sx={{
                                        width: 54,
                                        height: 54,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                        border: '2px solid #fff',
                                        bgcolor: 'primary.main',
                                        '& img': {
                                            objectFit: 'cover',
                                            objectPosition: 'center',
                                        },
                                    }}
                                >
                                    {user?.firstName?.charAt(0)?.toUpperCase()}
                                </Avatar>
                            )}
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25, fontSize: '0.7rem' }}>
                                    {currentDate}
                                </Typography>
                                {loading ? (
                                    <Skeleton variant="text" width={100} height={24} />
                                ) : (
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1, color: 'text.primary', fontSize: '1rem' }}>
                                        {user?.firstName || 'ผู้ใช้'}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    <IconButton
                        onClick={handleNotificationClick}
                        sx={{
                            bgcolor: 'white',
                            boxShadow: 'none',
                            width: 40,
                            height: 40,
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                        }}
                    >
                        <Badge 
                            badgeContent={unreadCount > 0 ? unreadCount : undefined}
                            color="error" 
                            overlap="circular"
                            variant={unreadCount > 0 ? "standard" : undefined}
                            sx={{
                                '& .MuiBadge-badge': {
                                    fontSize: '0.65rem',
                                    minWidth: 16,
                                    height: 16,
                                }
                            }}
                        >
                            <Notification size={20} variant="Outline" color="#64748B" />
                        </Badge>
                    </IconButton>

                    {/* Notification Popover */}
                    <Popover
                        open={open}
                        anchorEl={anchorEl}
                        onClose={handleClose}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        PaperProps={{
                            sx: {
                                width: 320,
                                maxHeight: 400,
                                mt: 1,
                                borderRadius: 1,
                                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                            }
                        }}
                    >
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                                {t('notifications', 'การแจ้งเตือน')}
                            </Typography>
                            {unreadCount > 0 && (
                                <Button size="small" onClick={markAllAsRead} sx={{ fontSize: '0.75rem' }}>
                                    {t('mark_all_read', 'อ่านทั้งหมด')}
                                </Button>
                            )}
                        </Box>

                        {loadingNotifications ? (
                            <Box sx={{ p: 2 }}>
                                {[1, 2, 3].map(i => (
                                    <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
                                ))}
                            </Box>
                        ) : notifications.length === 0 ? (
                            <Box sx={{ 
                                p: 4, 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center' 
                            }}>
                                <Notification size={40} color="#ccc" variant="Bulk" />
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {t('no_notifications', 'ไม่มีการแจ้งเตือน')}
                                </Typography>
                            </Box>
                        ) : (
                            <List sx={{ p: 0, maxHeight: 300, overflow: 'auto' }}>
                                {notifications.map((notification, index) => (
                                    <React.Fragment key={notification.id}>
                                        <ListItem
                                            sx={{
                                                bgcolor: notification.isRead ? 'transparent' : 'rgba(108, 99, 255, 0.05)',
                                                '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Typography variant="body2" fontWeight={notification.isRead ? 400 : 600} sx={{ fontSize: '0.85rem' }}>
                                                        {notification.title}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem' }}>
                                                            {notification.message.length > 60 
                                                                ? notification.message.substring(0, 60) + '...' 
                                                                : notification.message
                                                            }
                                                        </Typography>
                                                        <Typography variant="caption" color="primary" sx={{ fontSize: '0.7rem', mt: 0.5, display: 'block' }}>
                                                            {formatTimeAgo(notification.createdAt)}
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                            {!notification.isRead && (
                                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', ml: 1 }} />
                                            )}
                                        </ListItem>
                                        {index < notifications.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        )}
                    </Popover>
                </Box>
            </Box>

            {/* แสดง Sidebar สำหรับทุกคนยกเว้น employee */}
            {showSidebar && (
                <Sidebar open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            )}
        </>
    );
};

export default Header;
