'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, IconButton, Fab, Paper, Typography } from '@mui/material';
import { useLocale } from '../providers/LocaleProvider';
import { 
    Home, Mail, Heart, User, Plus, 
    Stethoscope, Umbrella, Sun, Baby, MoreHorizontal,
    Briefcase, Calendar, Clock, Church, Shield, Users, Car, HelpCircle , History
} from 'lucide-react';

interface BottomNavProps {
    activePage?: 'home' | 'messages' | 'leave' | 'profile';
}

interface LeaveType {
    id: number;
    code: string;
    name: string;
    description: string | null;
    maxDaysPerYear: number | null;
    isPaid: boolean;
    isActive: boolean;
}

// กำหนด icon และสีสำหรับแต่ละประเภทการลา (สีแบบ balloon เหมือนปฏิทิน)
const leaveTypeConfig: Record<string, { icon: any; color: string; gradient: string }> = {
    sick: { icon: Stethoscope, color: '#42A5F5', gradient: 'linear-gradient(135deg, #42A5F5 0%, #64B5F6 100%)' },
    personal: { icon: Umbrella, color: '#845EF7', gradient: 'linear-gradient(135deg, #845EF7 0%, #9775FA 100%)' },
    vacation: { icon: Sun, color: '#FFD43B', gradient: 'linear-gradient(135deg, #FFD43B 0%, #FFE066 100%)' },
    annual: { icon: Sun, color: '#FFD43B', gradient: 'linear-gradient(135deg, #FFD43B 0%, #FFE066 100%)' },
    maternity: { icon: Baby, color: '#F783AC', gradient: 'linear-gradient(135deg, #F783AC 0%, #FAA2C1 100%)' },
    ordination: { icon: Church, color: '#FFA726', gradient: 'linear-gradient(135deg, #FFA726 0%, #FFB74D 100%)' },
    military: { icon: Shield, color: '#66BB6A', gradient: 'linear-gradient(135deg, #66BB6A 0%, #81C784 100%)' },
    marriage: { icon: Heart, color: '#FF6B6B', gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)' },
    funeral: { icon: Users, color: '#78909C', gradient: 'linear-gradient(135deg, #78909C 0%, #90A4AE 100%)' },
    paternity: { icon: User, color: '#42A5F5', gradient: 'linear-gradient(135deg, #42A5F5 0%, #64B5F6 100%)' },
    sterilization: { icon: Stethoscope, color: '#26A69A', gradient: 'linear-gradient(135deg, #26A69A 0%, #4DB6AC 100%)' },
    business: { icon: Car, color: '#845EF7', gradient: 'linear-gradient(135deg, #845EF7 0%, #9775FA 100%)' },
    unpaid: { icon: Clock, color: '#868E96', gradient: 'linear-gradient(135deg, #868E96 0%, #ADB5BD 100%)' },
    other: { icon: HelpCircle, color: '#748FFC', gradient: 'linear-gradient(135deg, #748FFC 0%, #91A7FF 100%)' },
    default: { icon: HelpCircle, color: '#868E96', gradient: 'linear-gradient(135deg, #868E96 0%, #ADB5BD 100%)' },
};

const BottomNav: React.FC<BottomNavProps> = ({ activePage = 'home' }) => {
    const router = useRouter();
    const { t } = useLocale();
    const [openMenu, setOpenMenu] = useState(false);
    const [animatingOut, setAnimatingOut] = useState(false);
    const [renderMenu, setRenderMenu] = useState(false);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch leave types from API
    useEffect(() => {
        fetchLeaveTypes();
    }, []);

    const fetchLeaveTypes = async () => {
        try {
            const response = await fetch('/api/leave-types');
            if (response.ok) {
                const data = await response.json();
                // จำกัดแสดงแค่ 5 ประเภทแรก
                setLeaveTypes(data.slice(0, 5));
            }
        } catch (error) {
            console.error('Error fetching leave types:', error);
        }
    };

    const getLeaveTypeConfig = (code: string) => {
        return leaveTypeConfig[code] || leaveTypeConfig.default;
    };

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

    const handleLeaveTypeClick = (leaveCode: string) => {
        setOpenMenu(false);
        router.push(`/leave/${leaveCode}`);
    };

    return (
        <>
            {/* Overlay Background */}
            {renderMenu && (
                <Box
                    onClick={() => setOpenMenu(false)}
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        bgcolor: 'rgba(0, 0, 0, 0.3)',
                        backdropFilter: 'blur(2px)',
                        zIndex: 999,
                        opacity: openMenu ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                        pointerEvents: openMenu ? 'auto' : 'none',
                    }}
                />
            )}

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
                                    const config = getLeaveTypeConfig(leave.code);
                                    const Icon = config.icon;
                                    const delay = index * 0.08; // seconds
                                    const reverseDelay = (leaveTypes.length - 1 - index) * 0.06; // seconds
                                    return (
                                        <Box
                                            key={leave.id}
                                            onClick={() => handleLeaveTypeClick(leave.code)}
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
                                                    boxShadow: `0 12px 32px ${config.color}50`,
                                                    borderColor: config.color,
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
                                                    background: config.gradient,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    boxShadow: `0 4px 16px ${config.color}40`,
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
                                router.push('/leave');
                            }}
                        >
                            <IconButton sx={{ 
                                color: activePage === 'leave' ? 'primary.main' : 'text.disabled', 
                                '&:hover': { color: activePage === 'leave' ? 'primary.dark' : 'text.secondary' }, 
                                p: 0.5 
                            }}>
                                <History size={20} />
                            </IconButton>
                            <Typography variant="caption" noWrap sx={{ 
                                fontSize: '0.6rem', 
                                fontWeight: activePage === 'leave' ? 600 : 500, 
                                color: activePage === 'leave' ? 'primary.main' : 'text.disabled',
                                maxWidth: 72,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1
                            }}>
                                {t('nav_leave', 'ประวัติการลา')}
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
