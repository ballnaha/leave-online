'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, IconButton, Fab, Paper, Typography } from '@mui/material';
import { useLocale } from '../providers/LocaleProvider';
import { Home, Mail, Heart, User, Plus, Stethoscope, Umbrella, Sun, Baby, MoreHorizontal } from 'lucide-react';

interface BottomNavProps {
    activePage?: 'home' | 'messages' | 'favorites' | 'profile';
}

const BottomNav: React.FC<BottomNavProps> = ({ activePage = 'home' }) => {
    const router = useRouter();
    const { t } = useLocale();
    const [openMenu, setOpenMenu] = useState(false);
    const [animatingOut, setAnimatingOut] = useState(false);
    const [renderMenu, setRenderMenu] = useState(false);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const leaveTypes = [
        { icon: Stethoscope, name: 'ลาป่วย', color: '#FF6B6B', gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)' },
        { icon: Umbrella, name: 'ลากิจ', color: '#4ECDC4', gradient: 'linear-gradient(135deg, #4ECDC4 0%, #6FE0D7 100%)' },
        { icon: Sun, name: 'ลาพักร้อน', color: '#FFD93D', gradient: 'linear-gradient(135deg, #FFD93D 0%, #FFE566 100%)' },
        { icon: Baby, name: 'ลาคลอด', color: '#FF8ED4', gradient: 'linear-gradient(135deg, #FF8ED4 0%, #FFB3E6 100%)' },
        { icon: MoreHorizontal, name: 'ลาอื่นๆ', color: '#95A5A6', gradient: 'linear-gradient(135deg, #95A5A6 0%, #B0BEC5 100%)' },
    ];

    // Control mount/unmount for exit animation
    useEffect(() => {
        if (openMenu) {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
            }
            setRenderMenu(true);
            setAnimatingOut(false);
        } else {
            if (renderMenu) {
                setAnimatingOut(true);
                const outDurationMs = 300; // 0.3s per item animation
                const maxDelayMs = (leaveTypes.length - 1) * 60; // 0.06s steps in ms
                const totalMs = outDurationMs + maxDelayMs + 100; // buffer
                closeTimeoutRef.current = setTimeout(() => {
                    setAnimatingOut(false);
                    setRenderMenu(false);
                    closeTimeoutRef.current = null;
                }, totalMs);
            }
        }
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openMenu]);

    const handleLeaveTypeClick = (leaveName: string) => {
        console.log(`Selected: ${leaveName}`);
        setOpenMenu(false);
    };

    return (
        <>
            <Box sx={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 1000, width: '100%', maxWidth: 560 }}>
                <Box sx={{ position: 'relative', height: 70, width: '100%' }}>
                    {/* Leave Type Menu Balloon - Right Side (render with exit animation) */}
                    {renderMenu && (
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 75,
                                right: 20,
                                pointerEvents: openMenu ? 'auto' : 'none',
                                zIndex: 1001,
                            }}
                        >
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {leaveTypes.map((leave, index) => {
                                    const Icon = leave.icon;
                                    const delay = index * 0.08; // seconds
                                    const reverseDelay = (leaveTypes.length - 1 - index) * 0.06; // seconds
                                    return (
                                        <Box
                                            key={leave.name}
                                            onClick={() => handleLeaveTypeClick(leave.name)}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                p: 1.5,
                                                borderRadius: 3,
                                                cursor: 'pointer',
                                                background: 'rgba(255, 255, 255, 0.98)',
                                                backdropFilter: 'blur(20px)',
                                                border: '1px solid rgba(255, 255, 255, 0.8)',
                                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                                                animation: openMenu
                                                    ? `slideInBounce-${index} 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s both`
                                                    : animatingOut
                                                        ? `slideOutBounce-${index} 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045) ${reverseDelay}s both`
                                                        : 'none',
                                                [`@keyframes slideInBounce-${index}`]: {
                                                    '0%': {
                                                        opacity: 0,
                                                        transform: 'translateX(30px) scale(0.8)',
                                                    },
                                                    '60%': {
                                                        opacity: 1,
                                                        transform: 'translateX(-5px) scale(1.05)',
                                                    },
                                                    '80%': {
                                                        transform: 'translateX(2px) scale(0.98)',
                                                    },
                                                    '100%': {
                                                        opacity: 1,
                                                        transform: 'translateX(0) scale(1)',
                                                    },
                                                },
                                                [`@keyframes slideOutBounce-${index}`]: {
                                                    '0%': {
                                                        opacity: 1,
                                                        transform: 'translateX(0) scale(1)',
                                                    },
                                                    '30%': {
                                                        opacity: 0.7,
                                                        transform: 'translateX(-5px) scale(0.95)',
                                                    },
                                                    '100%': {
                                                        opacity: 0,
                                                        transform: 'translateX(40px) scale(0.7)',
                                                    },
                                                },
                                                '&:hover': {
                                                    transform: 'translateX(-6px) scale(1.05)',
                                                    boxShadow: `0 12px 32px ${leave.color}50`,
                                                    borderColor: leave.color,
                                                    background: 'rgba(255, 255, 255, 1)',
                                                },
                                                '&:active': {
                                                    transform: 'translateX(-4px) scale(0.98)',
                                                },
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 42,
                                                    height: 42,
                                                    borderRadius: 2.5,
                                                    background: leave.gradient,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    boxShadow: `0 4px 16px ${leave.color}40`,
                                                    flexShrink: 0,
                                                    animation: openMenu
                                                        ? `iconPop-${index} 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay + 0.1}s both`
                                                        : animatingOut
                                                            ? `iconShrink-${index} 0.25s ease ${reverseDelay}s both`
                                                            : 'none',
                                                    [`@keyframes iconPop-${index}`]: {
                                                        '0%': {
                                                            transform: 'scale(0) rotate(-180deg)',
                                                        },
                                                        '70%': {
                                                            transform: 'scale(1.2) rotate(10deg)',
                                                        },
                                                        '100%': {
                                                            transform: 'scale(1) rotate(0deg)',
                                                        },
                                                    },
                                                    [`@keyframes iconShrink-${index}`]: {
                                                        '0%': {
                                                            transform: 'scale(1) rotate(0deg)',
                                                        },
                                                        '100%': {
                                                            transform: 'scale(0) rotate(180deg)',
                                                        },
                                                    },
                                                }}
                                            >
                                                <Icon size={22} />
                                            </Box>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: 'text.primary',
                                                    fontSize: '0.9rem',
                                                    animation: openMenu
                                                        ? `textFade-${index} 0.4s ease ${delay + 0.15}s both`
                                                        : animatingOut
                                                            ? `textFadeOut-${index} 0.2s ease ${reverseDelay}s both`
                                                            : 'none',
                                                    [`@keyframes textFade-${index}`]: {
                                                        '0%': {
                                                            opacity: 0,
                                                            transform: 'translateX(10px)',
                                                        },
                                                        '100%': {
                                                            opacity: 1,
                                                            transform: 'translateX(0)',
                                                        },
                                                    },
                                                    [`@keyframes textFadeOut-${index}`]: {
                                                        '0%': {
                                                            opacity: 1,
                                                            transform: 'translateX(0)',
                                                        },
                                                        '100%': {
                                                            opacity: 0,
                                                            transform: 'translateX(15px)',
                                                        },
                                                    },
                                                }}
                                            >
                                                {leave.name}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    )}

                    {/* Background Shape */}
                    <Paper
                        elevation={0}
                        sx={{
                            position: 'absolute',
                            bottom: 0,
                            width: '100%',
                            height: 65,
                            bgcolor: 'background.paper',
                            borderRadius: '16px 16px 0 0',
                            boxShadow: '0 -10px 30px rgba(0,0,0,0.05)',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 64px 1fr 1fr',
                            alignItems: 'center',
                            px: 2,
                            pointerEvents: 'auto',
                        }}
                    >
                        <Box 
                            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3, cursor: 'pointer', justifySelf: 'center', textAlign: 'center' }}
                            onClick={() => {
                                setOpenMenu(false);
                                router.push('/');
                            }}
                        >
                            <IconButton sx={{ 
                                color: activePage === 'home' ? 'primary.main' : 'text.disabled', 
                                '&:hover': { color: activePage === 'home' ? 'primary.dark' : 'text.secondary' }, 
                                p: 0.5 
                            }}>
                                <Home size={20} />
                            </IconButton>
                            <Typography variant="caption" noWrap sx={{ 
                                fontSize: '0.6rem', 
                                fontWeight: activePage === 'home' ? 600 : 500, 
                                color: activePage === 'home' ? 'primary.main' : 'text.disabled',
                                maxWidth: 72,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1
                            }}>
                                {t('nav_home', 'หน้าหลัก')}
                            </Typography>
                        </Box>

                        <Box 
                            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3, cursor: 'pointer', justifySelf: 'center', textAlign: 'center' }}
                            onClick={() => {
                                setOpenMenu(false);
                                router.push('/messages');
                            }}
                        >
                            <IconButton sx={{ 
                                color: activePage === 'messages' ? 'primary.main' : 'text.disabled', 
                                '&:hover': { color: activePage === 'messages' ? 'primary.dark' : 'text.secondary' }, 
                                p: 0.5 
                            }}>
                                <Mail size={20} />
                            </IconButton>
                            <Typography variant="caption" noWrap sx={{ 
                                fontSize: '0.6rem', 
                                fontWeight: activePage === 'messages' ? 600 : 500, 
                                color: activePage === 'messages' ? 'primary.main' : 'text.disabled',
                                maxWidth: 72,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1
                            }}>
                                {t('nav_messages', 'ข้อความ')}
                            </Typography>
                        </Box>

                        {/* Spacer for FAB */}
                        <Box sx={{ width: 64, justifySelf: 'center' }} />

                        <Box 
                            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3, cursor: 'pointer', justifySelf: 'center', textAlign: 'center' }}
                            onClick={() => {
                                setOpenMenu(false);
                                router.push('/favorites');
                            }}
                        >
                            <IconButton sx={{ 
                                color: activePage === 'favorites' ? 'primary.main' : 'text.disabled', 
                                '&:hover': { color: activePage === 'favorites' ? 'primary.dark' : 'text.secondary' }, 
                                p: 0.5 
                            }}>
                                <Heart size={20} />
                            </IconButton>
                            <Typography variant="caption" noWrap sx={{ 
                                fontSize: '0.6rem', 
                                fontWeight: activePage === 'favorites' ? 600 : 500, 
                                color: activePage === 'favorites' ? 'primary.main' : 'text.disabled',
                                maxWidth: 72,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1
                            }}>
                                {t('nav_favorites', 'ชื่นชอบ')}
                            </Typography>
                        </Box>

                        <Box
                            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3, cursor: 'pointer', justifySelf: 'center', textAlign: 'center' }}
                            onClick={() => {
                                setOpenMenu(false);
                                router.push('/profile');
                            }}
                        >
                            <IconButton sx={{ 
                                color: activePage === 'profile' ? 'primary.main' : 'text.disabled', 
                                '&:hover': { color: activePage === 'profile' ? 'primary.dark' : 'text.secondary' }, 
                                p: 0.5 
                            }}>
                                <User size={20} />
                            </IconButton>
                            <Typography variant="caption" noWrap sx={{ 
                                fontSize: '0.6rem', 
                                fontWeight: activePage === 'profile' ? 600 : 500, 
                                color: activePage === 'profile' ? 'primary.main' : 'text.disabled',
                                maxWidth: 72,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1
                            }}>
                                {t('nav_profile', 'โปรไฟล์')}
                            </Typography>
                        </Box>
                    </Paper>

                    {/* Floating Action Button */}
                    <Box sx={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
                        <Fab
                            onClick={() => setOpenMenu(!openMenu)}
                            sx={{
                                width: 56,
                                height: 56,
                                bgcolor: 'primary.main',
                                color: 'white',
                                boxShadow: openMenu
                                    ? '0 8px 24px rgba(108, 99, 255, 0.5)'
                                    : '0 10px 20px rgba(108, 99, 255, 0.4)',
                                '&:hover': {
                                    bgcolor: 'primary.dark',
                                    transform: 'scale(1.05)',
                                },
                                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                transform: openMenu ? 'rotate(45deg)' : 'rotate(0deg)',
                            }}
                        >
                            <Plus size={24} />

                        </Fab>

                    </Box>
                </Box>
            </Box>
        </>
    );
};

export default BottomNav;
