'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
} from '@mui/material';
import { Notification } from 'iconsax-react';
import { useOneSignal } from '@/app/providers/OneSignalProvider';
import { useSession } from 'next-auth/react';
import { useLocale } from '@/app/providers/LocaleProvider';
import { Drawer } from 'vaul';

interface NotificationRequiredModalProps {
    skipOnPaths?: string[];
}

export default function NotificationRequiredModal({ skipOnPaths = [] }: NotificationRequiredModalProps) {
    const { t } = useLocale();
    const { status } = useSession();
    const {
        isSupported,
        isSubscribed,
        isInitialized,
        permission,
        subscribe,
    } = useOneSignal();

    const [loading, setLoading] = useState(false);
    const [showBlockedHelp, setShowBlockedHelp] = useState(false);
    const [currentPath, setCurrentPath] = useState('');
    const [blockedDismissed, setBlockedDismissed] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentPath(window.location.pathname);
        }
    }, []);

    const shouldSkip = skipOnPaths.some(path => currentPath.startsWith(path));

    const shouldShowDrawer =
        status === 'authenticated' &&
        isInitialized &&
        isSupported &&
        !isSubscribed &&
        !shouldSkip &&
        permission !== 'denied';

    const isBlocked = permission === 'denied';

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            await subscribe();
        } catch (error: any) {
            console.error('Subscribe error:', error);
            if (typeof window !== 'undefined' && window.Notification?.permission === 'denied') {
                setShowBlockedHelp(true);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!shouldShowDrawer && !isBlocked) {
        return null;
    }

    // Blocked state drawer - แจ้งเตือนแต่ปิดได้
    if (isBlocked && status === 'authenticated' && isInitialized && !shouldSkip && !blockedDismissed) {
        return (
            <Drawer.Root
                open={true}
                onOpenChange={(open) => {
                    if (!open) setBlockedDismissed(true);
                }}
                dismissible={true}
                shouldScaleBackground={false}
            >
                <Drawer.Portal>
                    <Drawer.Overlay
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.3)',
                            zIndex: 1300,
                        }}
                    />
                    <Drawer.Content
                        style={{
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: 'white',
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            zIndex: 1300,
                            outline: 'none',
                        }}
                    >
                        {/* Handle */}
                        <Box sx={{ pt: 2, pb: 1, display: 'flex', justifyContent: 'center' }}>
                            <Box
                                sx={{
                                    width: 36,
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: '#E5E7EB',
                                }}
                            />
                        </Box>

                        {/* Content */}
                        <Box sx={{ px: 4, pb: 5, pt: 2, textAlign: 'center' }}>
                            {/* Bell Icon with sparkles */}
                            <Box sx={{ mb: 3, position: 'relative', display: 'inline-block' }}>
                                {/* Background glow */}
                                <Box
                                    sx={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: '50%',
                                        bgcolor: '#FEF3C7',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                    }}
                                >
                                    <Box component="img" src="/images/bell.png" alt="bell" sx={{ width: 50, height: 50 }} />
                                </Box>
                                {/* Sparkle effects */}
                                <Box sx={{ position: 'absolute', top: -5, left: -5, fontSize: '0.9rem' }}>✨</Box>
                                <Box sx={{ position: 'absolute', top: -5, right: -5, fontSize: '0.9rem' }}>✨</Box>
                            </Box>

                            {/* Title */}
                            <Drawer.Title asChild>
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: '1.4rem',
                                        color: '#1F2937',
                                        mb: 1.5,
                                    }}
                                >
                                    {t('notif_blocked_title', 'การแจ้งเตือนถูกบล็อก')}
                                </Typography>
                            </Drawer.Title>

                            {/* Description */}
                            <Drawer.Description asChild>
                                <Typography
                                    sx={{
                                        color: '#6B7280',
                                        fontSize: '0.95rem',
                                        mb: 4,
                                        lineHeight: 1.6,
                                        px: 1,
                                    }}
                                >
                                    {t('notif_blocked_simple_desc', 'กรุณาเปิดการแจ้งเตือนในการตั้งค่าเบราว์เซอร์')}
                                </Typography>
                            </Drawer.Description>

                            {/* Close Button */}
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={() => setBlockedDismissed(true)}
                                sx={{
                                    py: 1.75,
                                    borderRadius: 50,
                                    background: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    textTransform: 'none',
                                    letterSpacing: 0.5,
                                    boxShadow: '0 4px 14px rgba(100, 116, 139, 0.3)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                                        boxShadow: '0 6px 20px rgba(100, 116, 139, 0.4)',
                                    },
                                }}
                            >
                                {t('btn_close', 'ปิด')}
                            </Button>
                        </Box>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        );
    }

    // Main subscribe drawer - Clean design
    return (
        <Drawer.Root
            open={shouldShowDrawer}
            dismissible={false}
            shouldScaleBackground={false}
        >
            <Drawer.Portal>
                <Drawer.Overlay
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.3)',
                        zIndex: 1300,
                    }}
                />
                <Drawer.Content
                    style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        zIndex: 1300,
                        outline: 'none',
                    }}
                >
                    {/* Handle */}
                    <Box sx={{ pt: 2, pb: 1, display: 'flex', justifyContent: 'center' }}>
                        <Box
                            sx={{
                                width: 36,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: '#E5E7EB',
                            }}
                        />
                    </Box>

                    {/* Content */}
                    <Box sx={{ px: 4, pb: 5, pt: 2, textAlign: 'center' }}>
                        {/* Bell Icon with sparkles */}
                        <Box sx={{ mb: 3, position: 'relative', display: 'inline-block' }}>
                            {/* Background glow */}
                            <Box
                                sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    bgcolor: '#FEF3C7',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                }}
                            >
                                <Box component="img" src="/images/bell.png" alt="bell" sx={{ width: 50, height: 50 }} />
                            </Box>
                            {/* Sparkle effects */}
                            <Box sx={{ position: 'absolute', top: -5, left: -5, fontSize: '0.9rem' }}>✨</Box>
                            <Box sx={{ position: 'absolute', top: -5, right: -5, fontSize: '0.9rem' }}>✨</Box>
                        </Box>

                        {/* Title */}
                        <Drawer.Title asChild>
                            <Typography
                                sx={{
                                    fontWeight: 700,
                                    fontSize: '1.4rem',
                                    color: '#1F2937',
                                    mb: 1.5,
                                }}
                            >
                                {t('notif_required_title', 'เปิดการแจ้งเตือน!')}
                            </Typography>
                        </Drawer.Title>

                        {/* Description */}
                        <Drawer.Description asChild>
                            <Typography
                                sx={{
                                    color: '#6B7280',
                                    fontSize: '0.95rem',
                                    mb: 4,
                                    lineHeight: 1.6,
                                    px: 1,
                                }}
                            >
                                {t('notif_simple_desc', 'เปิดการแจ้งเตือนเพื่อรับข้อมูลสถานะใบลาและการอนุมัติแบบเรียลไทม์')}
                            </Typography>
                        </Drawer.Description>

                        {/* Blocked Warning */}
                        {showBlockedHelp && (
                            <Box
                                sx={{
                                    bgcolor: '#FEF3C7',
                                    borderRadius: 2,
                                    p: 2,
                                    mb: 3,
                                }}
                            >
                                <Typography sx={{ fontSize: '0.85rem', color: '#92400E' }}>
                                    ⚠️ {t('notif_blocked_inline_desc', 'กรุณาเปิดในการตั้งค่าเบราว์เซอร์แล้วรีเฟรช')}
                                </Typography>
                            </Box>
                        )}

                        {/* Enable Button */}
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleSubscribe}
                            disabled={loading}
                            sx={{
                                py: 1.75,
                                borderRadius: 50,
                                background: loading
                                    ? '#94A3B8'
                                    : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                                boxShadow: loading ? 'none' : '0 4px 14px rgba(59, 130, 246, 0.4)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                                    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.5)',
                                },
                                '&.Mui-disabled': {
                                    color: 'white',
                                },
                            }}
                        >
                            {loading ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <CircularProgress size={18} color="inherit" />
                                    {t('notif_enabling', 'กำลังเปิด...')}
                                </Box>
                            ) : (
                                t('notif_enable_notifications', 'เปิดการแจ้งเตือน')
                            )}
                        </Button>
                    </Box>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
