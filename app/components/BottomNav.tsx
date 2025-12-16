'use client';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Fab, Paper, Typography } from '@mui/material';
import { useLocale } from '../providers/LocaleProvider';
import { useUser } from '../providers/UserProvider';
import { usePWA } from '../providers/PWAProvider';
import {
    Home2,
    Message,
    Heart,
    User,
    Add,
    Health,
    Sun1,
    Lovely,
    More,
    Briefcase,
    Calendar2,
    Clock,
    Building4,
    Shield,
    People,
    Car,
    MessageQuestion,
    Profile2User,
    Clock as ClockTimer,
    Chart

} from 'iconsax-react';
import { HelpCircle } from 'lucide-react';

interface BottomNavProps {
    activePage?: 'home' | 'chart' | 'leave' | 'profile';
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
    sick: { icon: Health, color: '#5E72E4', gradient: 'linear-gradient(135deg, #5E72E4 0%, #825EE4 100%)' },
    personal: { icon: Briefcase, color: '#8965E0', gradient: 'linear-gradient(135deg, #8965E0 0%, #BC65E0 100%)' },
    vacation: { icon: Sun1, color: '#11CDEF', gradient: 'linear-gradient(135deg, #11CDEF 0%, #1171EF 100%)' },
    annual: { icon: Sun1, color: '#2DCECC', gradient: 'linear-gradient(135deg, #2DCECC 0%, #2D8BCC 100%)' },
    maternity: { icon: Lovely, color: '#F5365C', gradient: 'linear-gradient(135deg, #F5365C 0%, #F56036 100%)' },
    ordination: { icon: Building4, color: '#FB6340', gradient: 'linear-gradient(135deg, #FB6340 0%, #FBB140 100%)' },
    work_outside: { icon: Car, color: '#2DCECC', gradient: 'linear-gradient(135deg, #2DCECC 0%, #2D8BCC 100%)' },
    absent: { icon: MessageQuestion, color: '#F5365C', gradient: 'linear-gradient(135deg, #F5365C 0%, #F56036 100%)' },
    military: { icon: Shield, color: '#5E72E4', gradient: 'linear-gradient(135deg, #5E72E4 0%, #5E9BE4 100%)' },
    marriage: { icon: Heart, color: '#F3A4B5', gradient: 'linear-gradient(135deg, #F3A4B5 0%, #D66086 100%)' },
    funeral: { icon: People, color: '#8898AA', gradient: 'linear-gradient(135deg, #8898AA 0%, #6A7A8A 100%)' },
    paternity: { icon: Profile2User, color: '#11CDEF', gradient: 'linear-gradient(135deg, #11CDEF 0%, #1171EF 100%)' },
    sterilization: { icon: Health, color: '#2DCECC', gradient: 'linear-gradient(135deg, #2DCECC 0%, #2D8BCC 100%)' },
    business: { icon: Car, color: '#8965E0', gradient: 'linear-gradient(135deg, #8965E0 0%, #BC65E0 100%)' },
    unpaid: { icon: Clock, color: '#F5365C', gradient: 'linear-gradient(135deg, #F5365C 0%, #F56036 100%)' },
    other: { icon: HelpCircle, color: '#5E72E4', gradient: 'linear-gradient(135deg, #5E72E4 0%, #825EE4 100%)' },
    default: { icon: MessageQuestion, color: '#8898AA', gradient: 'linear-gradient(135deg, #8898AA 0%, #6A7A8A 100%)' },
};

// Cache สำหรับเก็บข้อมูล leave types เพื่อป้องกันการ fetch ซ้ำ
let cachedLeaveTypes: LeaveType[] | null = null;
let isFetching = false;

const BottomNav: React.FC<BottomNavProps> = ({ activePage = 'home' }) => {
    const router = useRouter();
    const { t } = useLocale();
    const { user } = useUser();
    const { isInstallPromptVisible } = usePWA();
    const [openMenu, setOpenMenu] = useState(false);
    const [animatingOut, setAnimatingOut] = useState(false);
    const [renderMenu, setRenderMenu] = useState(false);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(cachedLeaveTypes || []);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // คำนวณอายุงานเป็นปี
    const getYearsOfService = (startDate: string | null | undefined): number => {
        if (!startDate) return 0;
        const start = new Date(startDate);
        const now = new Date();
        const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return years;
    };

    // Filter leave types based on gender and years of service
    // แสดงทุกประเภทการลาที่ผู้ใช้มีสิทธิ์
    const filteredLeaveTypes = useMemo(() => {
        const yearsOfService = getYearsOfService(user?.startDate);

        return leaveTypes.filter(leave => {
            // ถ้าเป็นเพศชาย ไม่แสดงลาคลอด (maternity)
            if (user?.gender === 'male' && leave.code === 'maternity') {
                return false;
            }
            // ถ้าเป็นเพศหญิง ไม่แสดงลาดูแลภรรยาคลอด (paternity)
            if (user?.gender === 'female' && leave.code === 'paternity') {
                return false;
            }
            // ถ้าเป็นเพศหญิง ไม่แสดงลาบวช (ordination)
            if (user?.gender === 'female' && leave.code === 'ordination') {
                return false;
            }
            // ลาบวช ต้องมีอายุงาน >= 1 ปี
            if (leave.code === 'ordination' && yearsOfService < 1) {
                return false;
            }
            return true;
        });
    }, [leaveTypes, user?.gender, user?.startDate]);

    // Fetch leave types from API - only if not cached
    useEffect(() => {
        // ถ้ามี cache แล้วไม่ต้อง fetch
        if (cachedLeaveTypes) {
            setLeaveTypes(cachedLeaveTypes);
            return;
        }

        // ถ้ากำลัง fetch อยู่ ไม่ต้องทำซ้ำ
        if (isFetching) return;

        fetchLeaveTypes();
    }, []);

    const fetchLeaveTypes = async () => {
        isFetching = true;
        try {
            const response = await fetch('/api/leave-types');
            if (!response.ok) throw new Error('Failed to fetch leave types');
            const data = await response.json();
            // แสดงทั้งหมด
            cachedLeaveTypes = data;
            setLeaveTypes(data);
        } catch (error) {
            console.error('Error fetching leave types:', error);
        } finally {
            isFetching = false;
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
                const maxDelayMs = (filteredLeaveTypes.length - 1) * 60; // 0.06s steps in ms
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
            <Box sx={{
                position: 'fixed',
                bottom: isInstallPromptVisible ? 'calc(80px + env(safe-area-inset-bottom, 20px))' : 0,
                left: '50%',
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                zIndex: 1000,
                width: '100%',
                maxWidth: 560,
                transition: 'bottom 0.3s ease'
            }}>
                <Box sx={{ position: 'relative', height: 70, width: '100%' }}>
                    {/* Leave Type Menu Balloon - Right Side (render with exit animation) */}
                    {renderMenu && (
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 100,
                                right: 20,
                                pointerEvents: openMenu ? 'auto' : 'none',
                                zIndex: 1001,
                            }}
                        >
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {filteredLeaveTypes.map((leave, index) => {
                                    const config = getLeaveTypeConfig(leave.code);
                                    const Icon = config.icon;
                                    const delay = index * 0.08; // seconds
                                    const reverseDelay = (filteredLeaveTypes.length - 1 - index) * 0.06; // seconds
                                    return (
                                        <Box
                                            key={leave.id}
                                            onClick={() => handleLeaveTypeClick(leave.code)}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                p: 1,
                                                borderRadius: 2.5,
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
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 2,
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
                                                <Icon size={18} color="white" />
                                            </Box>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: 'text.primary',
                                                    fontSize: '0.8rem',
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
                                                {t(`leave_${leave.code}`, leave.name)}
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
                            height: 70,
                            bgcolor: 'rgba(237, 233, 254, 0.95)',
                            borderRadius: '28px 28px 0 0',
                            boxShadow: '0 -8px 32px rgba(108, 99, 255, 0.08)',
                            backdropFilter: 'blur(20px)',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 80px 1fr 1fr',
                            alignItems: 'center',
                            px: 3,
                            pointerEvents: 'auto',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 0.5,
                                cursor: 'pointer',
                                justifySelf: 'center',
                                textAlign: 'center',
                                py: 1,
                            }}
                            onClick={() => {
                                setOpenMenu(false);
                                router.push('/');
                            }}
                        >
                            <Box
                                sx={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: activePage === 'home' ? 'rgba(108, 99, 255, 0.15)' : 'transparent',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        bgcolor: 'rgba(108, 99, 255, 0.1)',
                                        transform: 'scale(1.05)',
                                    },
                                    '&:active': {
                                        transform: 'scale(0.95)',
                                    },
                                }}
                            >
                                <Home2
                                    size={22}
                                    variant={activePage === 'home' ? 'Bold' : 'TwoTone'}
                                    color={activePage === 'home' ? '#6C63FF' : '#8B7FC7'}
                                />
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 0.5,
                                cursor: 'pointer',
                                justifySelf: 'center',
                                textAlign: 'center',
                                py: 1,
                            }}
                            onClick={() => {
                                setOpenMenu(false);
                                router.push('/leave');
                            }}
                        >
                            <Box
                                sx={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: activePage === 'leave' ? 'rgba(108, 99, 255, 0.15)' : 'transparent',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        bgcolor: 'rgba(108, 99, 255, 0.1)',
                                        transform: 'scale(1.05)',
                                    },
                                    '&:active': {
                                        transform: 'scale(0.95)',
                                    },
                                }}
                            >
                                <Clock
                                    size={22}
                                    variant={activePage === 'leave' ? 'Bold' : 'TwoTone'}
                                    color={activePage === 'leave' ? '#6C63FF' : '#8B7FC7'}
                                />
                            </Box>
                        </Box>

                        {/* Spacer for FAB with curved notch effect */}
                        <Box sx={{ width: 80, justifySelf: 'center', position: 'relative' }}>
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: -35,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 72,
                                    height: 36,
                                    bgcolor: 'rgba(237, 233, 254, 0.95)',
                                    borderRadius: '0 0 36px 36px',
                                }}
                            />
                        </Box>

                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 0.5,
                                cursor: 'pointer',
                                justifySelf: 'center',
                                textAlign: 'center',
                                py: 1,
                            }}
                            onClick={() => {
                                setOpenMenu(false);
                                router.push('/charts');
                            }}
                        >
                            <Box
                                sx={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: activePage === 'chart' ? 'rgba(108, 99, 255, 0.15)' : 'transparent',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        bgcolor: 'rgba(108, 99, 255, 0.1)',
                                        transform: 'scale(1.05)',
                                    },
                                    '&:active': {
                                        transform: 'scale(0.95)',
                                    },
                                }}
                            >
                                <Chart
                                    size={22}
                                    variant={activePage === 'chart' ? 'Bold' : 'TwoTone'}
                                    color={activePage === 'chart' ? '#6C63FF' : '#8B7FC7'}
                                />
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 0.5,
                                cursor: 'pointer',
                                justifySelf: 'center',
                                textAlign: 'center',
                                py: 1,
                            }}
                            onClick={() => {
                                setOpenMenu(false);
                                router.push('/profile');
                            }}
                        >
                            <Box
                                sx={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: activePage === 'profile' ? 'rgba(108, 99, 255, 0.15)' : 'transparent',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        bgcolor: 'rgba(108, 99, 255, 0.1)',
                                        transform: 'scale(1.05)',
                                    },
                                    '&:active': {
                                        transform: 'scale(0.95)',
                                    },
                                }}
                            >
                                <Profile2User
                                    size={22}
                                    variant={activePage === 'profile' ? 'Bold' : 'TwoTone'}
                                    color={activePage === 'profile' ? '#6C63FF' : '#8B7FC7'}
                                />
                            </Box>
                        </Box>
                    </Paper>

                    {/* Floating Action Button */}
                    <Box sx={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
                        <Fab
                            onClick={() => setOpenMenu(!openMenu)}
                            sx={{
                                width: 60,
                                height: 60,
                                bgcolor: '#6C63FF',
                                color: 'white',
                                boxShadow: openMenu
                                    ? '0 12px 28px rgba(108, 99, 255, 0.55)'
                                    : '0 8px 24px rgba(108, 99, 255, 0.45)',
                                '&:hover': {
                                    bgcolor: '#5A52E0',
                                    boxShadow: '0 14px 32px rgba(108, 99, 255, 0.6)',
                                },
                                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                transform: openMenu ? 'rotate(45deg)' : 'rotate(0deg)',
                            }}
                        >
                            <Add color="white" size={32} />
                        </Fab>
                    </Box>
                </Box>
            </Box>
        </>
    );
};

export default BottomNav;
