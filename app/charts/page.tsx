'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Skeleton,
    Select,
    MenuItem,
    FormControl,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import BottomNav from '@/app/components/BottomNav';
import { useLocale } from '@/app/providers/LocaleProvider';
import { useUser } from '@/app/providers/UserProvider';
import { useSession } from 'next-auth/react';
import {
    Calendar,
    Health,
    Briefcase,
    Sun1,
    Lovely,
    Building4,
    Car,
    Shield,
    Heart,
    People,
    Profile2User,
    MoneySend,
    MessageQuestion,
    Chart,
} from 'iconsax-react';

interface LeaveType {
    id: number;
    code: string;
    name: string;
    description: string | null;
    maxDaysPerYear: number | null;
    isPaid: boolean;
    isActive: boolean;
}

interface LeaveRequest {
    id: number;
    leaveType: string;
    totalDays: number;
    status: string;
}

interface LeaveStat {
    code: string;
    name: string;
    used: number;
    max: number | null;
    percentage: number;
    displayPercentage: number;
    isOverLimit: boolean;
}

// Icon and color config - synchronized with BottomNav colors
const leaveTypeConfig: Record<string, { icon: any; gradient: string; color: string; glassColor: string }> = {
    sick: { icon: Health, gradient: 'linear-gradient(135deg, #5E72E4 0%, #825EE4 100%)', color: '#5E72E4', glassColor: 'rgba(94, 114, 228, 0.15)' },
    personal: { icon: Briefcase, gradient: 'linear-gradient(135deg, #8965E0 0%, #BC65E0 100%)', color: '#8965E0', glassColor: 'rgba(137, 101, 224, 0.15)' },
    vacation: { icon: Sun1, gradient: 'linear-gradient(135deg, #11CDEF 0%, #1171EF 100%)', color: '#11CDEF', glassColor: 'rgba(17, 205, 239, 0.15)' },
    annual: { icon: Sun1, gradient: 'linear-gradient(135deg, #2DCECC 0%, #2D8BCC 100%)', color: '#2DCECC', glassColor: 'rgba(45, 206, 204, 0.15)' },
    maternity: { icon: Lovely, gradient: 'linear-gradient(135deg, #F5365C 0%, #F56036 100%)', color: '#F5365C', glassColor: 'rgba(245, 54, 92, 0.15)' },
    ordination: { icon: Building4, gradient: 'linear-gradient(135deg, #FB6340 0%, #FBB140 100%)', color: '#FB6340', glassColor: 'rgba(251, 99, 64, 0.15)' },
    work_outside: { icon: Car, gradient: 'linear-gradient(135deg, #2DCECC 0%, #2D8BCC 100%)', color: '#2DCECC', glassColor: 'rgba(45, 206, 204, 0.15)' },
    absent: { icon: MessageQuestion, gradient: 'linear-gradient(135deg, #F5365C 0%, #F56036 100%)', color: '#F5365C', glassColor: 'rgba(245, 54, 92, 0.15)' },
    military: { icon: Shield, gradient: 'linear-gradient(135deg, #5E72E4 0%, #5E9BE4 100%)', color: '#5E72E4', glassColor: 'rgba(94, 114, 228, 0.15)' },
    marriage: { icon: Heart, gradient: 'linear-gradient(135deg, #F3A4B5 0%, #D66086 100%)', color: '#F3A4B5', glassColor: 'rgba(243, 164, 181, 0.15)' },
    funeral: { icon: People, gradient: 'linear-gradient(135deg, #8898AA 0%, #6A7A8A 100%)', color: '#8898AA', glassColor: 'rgba(136, 152, 170, 0.15)' },
    paternity: { icon: Profile2User, gradient: 'linear-gradient(135deg, #11CDEF 0%, #1171EF 100%)', color: '#11CDEF', glassColor: 'rgba(17, 205, 239, 0.15)' },
    sterilization: { icon: Health, gradient: 'linear-gradient(135deg, #2DCECC 0%, #2D8BCC 100%)', color: '#2DCECC', glassColor: 'rgba(45, 206, 204, 0.15)' },
    business: { icon: Car, gradient: 'linear-gradient(135deg, #8965E0 0%, #BC65E0 100%)', color: '#8965E0', glassColor: 'rgba(137, 101, 224, 0.15)' },
    unpaid: { icon: MoneySend, gradient: 'linear-gradient(135deg, #F5365C 0%, #F56036 100%)', color: '#F5365C', glassColor: 'rgba(245, 54, 92, 0.15)' },
    other: { icon: MessageQuestion, gradient: 'linear-gradient(135deg, #5E72E4 0%, #825EE4 100%)', color: '#8898AA', glassColor: 'rgba(136, 152, 170, 0.15)' },
    default: { icon: MessageQuestion, gradient: 'linear-gradient(135deg, #8898AA 0%, #6A7A8A 100%)', color: '#8898AA', glassColor: 'rgba(136, 152, 170, 0.15)' },
};

export default function ChartsPage() {
    const router = useRouter();
    const { t } = useLocale();
    const { status } = useSession();
    const { user } = useUser();
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());

    // Generate year options (current year - 2 to current year + 1)
    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
    }, []);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/login');
        }
    }, [status, router]);

    useEffect(() => {
        fetchData();
    }, [year]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [leaveTypesRes, leaveRequestsRes] = await Promise.all([
                fetch(`/api/leave-types?year=${year}`),
                fetch(`/api/my-leaves?year=${year}`)
            ]);

            if (leaveTypesRes.ok) {
                const typesData = await leaveTypesRes.json();
                setLeaveTypes(typesData);
            }

            if (leaveRequestsRes.ok) {
                const requestsData = await leaveRequestsRes.json();
                if (requestsData.success && requestsData.data) {
                    setLeaveRequests(requestsData.data);
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // คำนวณอายุงานเป็นปี
    const getYearsOfService = (startDate: string | null | undefined): number => {
        if (!startDate) return 0;
        const start = new Date(startDate);
        const now = new Date();
        const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return years;
    };

    // Calculate leave statistics
    const leaveStats = useMemo(() => {
        const yearsOfService = getYearsOfService(user?.startDate);

        // Filter leave types based on gender and years of service
        const filteredTypes = leaveTypes.filter(leave => {
            if (user?.gender === 'male' && leave.code === 'maternity') return false;
            if (user?.gender === 'female' && leave.code === 'ordination') return false;
            if (leave.code === 'ordination' && yearsOfService < 1) return false;
            return true;
        });

        // Calculate used days per leave type (only approved leaves)
        const usedDaysMap: Record<string, number> = {};
        leaveRequests
            .filter(req => req.status === 'approved')
            .forEach(req => {
                usedDaysMap[req.leaveType] = (usedDaysMap[req.leaveType] || 0) + req.totalDays;
            });

        // Build stats
        const BAR_FULL_SCALE = 90;
        const stats: LeaveStat[] = filteredTypes.map(type => {
            const used = usedDaysMap[type.code] || 0;
            const max = type.maxDaysPerYear;

            let percentage = 0;
            let displayPercentage = 0;
            let isOverLimit = false;

            if (max && max > 0) {
                displayPercentage = (used / max) * 100;

                if (used > max) {
                    percentage = 100;
                    isOverLimit = true;
                } else {
                    percentage = (used / max) * BAR_FULL_SCALE;
                }
            }

            return {
                code: type.code,
                name: t(`leave_${type.code}`, type.name),
                used,
                max,
                percentage,
                displayPercentage,
                isOverLimit
            };
        });

        return stats.sort((a, b) => b.percentage - a.percentage);
    }, [leaveTypes, leaveRequests, user?.gender, user?.startDate, t]);

    const getConfig = (code: string) => {
        return leaveTypeConfig[code] || leaveTypeConfig.default;
    };

    // Liquid Glass Card Style
    const liquidGlassCard = {
        borderRadius: 1,
        bgcolor: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: `
            0 1px 2px rgba(0, 0, 0, 0.02),
            0 4px 8px rgba(0, 0, 0, 0.03),
            0 8px 16px rgba(0, 0, 0, 0.03),
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            inset 0 -1px 0 rgba(255, 255, 255, 0.2)
        `,
        overflow: 'visible',
        position: 'relative' as const,
        '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%)',
            borderRadius: 'inherit',
            pointerEvents: 'none',
        },
    };

    if (status === 'loading') {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <Skeleton variant="rectangular" width="100%" height={400} />
            </Box>
        );
    }

    return (
        <Box sx={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #E8EEF5 0%, #F5F7FA 50%, #FFFFFF 100%)',
            pb: 12
        }}>
            {/* Header with Liquid Glass Style */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    pt: 'calc(env(safe-area-inset-top, 0px) + 24px)',
                    pb: 8,
                    px: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '100%',
                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 50%)',
                        pointerEvents: 'none',
                    },
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: -100,
                        right: -100,
                        width: 300,
                        height: 300,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
                    },
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>

                        <Typography variant="h5" sx={{
                            color: 'white',
                            fontWeight: 700,
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                        }}>
                            {t('chart_title', 'สถิติการลา')}
                        </Typography>
                    </Box>

                    {/* Year Filter - Liquid Glass Style */}
                    <FormControl size="small">
                        <Select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(10px)',
                                color: 'white',
                                borderRadius: 2,
                                minWidth: 100,
                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                '& .MuiOutlinedInput-notchedOutline': {
                                    border: 'none',
                                },
                                '& .MuiSelect-icon': {
                                    color: 'white',
                                },
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                                },
                                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                            }}
                        >
                            {yearOptions.map((y) => (
                                <MenuItem key={y} value={y}>
                                    {y + 543}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{ px: 2, mt: -5, position: 'relative', zIndex: 2, maxWidth: 1200, mx: 'auto' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {[1, 2, 3, 4].map((item) => (
                            <Card key={item} sx={{ ...liquidGlassCard, p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: 2, bgcolor: 'rgba(0,0,0,0.06)' }} />
                                    <Box sx={{ flex: 1 }}>
                                        <Skeleton variant="text" width="60%" height={24} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
                                        <Skeleton variant="text" width="40%" height={20} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
                                    </Box>
                                </Box>
                                <Skeleton variant="rounded" height={8} sx={{ mt: 2, borderRadius: 1, bgcolor: 'rgba(0,0,0,0.06)' }} />
                            </Card>
                        ))}
                    </Box>
                ) : leaveStats.length === 0 ? (
                    <Card sx={{
                        ...liquidGlassCard,
                        textAlign: 'center',
                        py: 6,
                    }}>
                        <Calendar size={64} color="#CBD5E1" variant="TwoTone" />
                        <Typography sx={{ color: '#94A3B8', mt: 2, fontWeight: 500 }}>
                            {t('no_leave_data', 'ไม่พบข้อมูลการลา')}
                        </Typography>
                    </Card>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {leaveStats.map((stat, index) => {
                            const config = getConfig(stat.code);
                            const IconComponent = config.icon;
                            const remaining = stat.max !== null ? Math.max(0, stat.max - stat.used) : null;

                            return (
                                <Card
                                    key={stat.code}
                                    sx={{
                                        ...liquidGlassCard,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        animation: `fadeIn 0.4s ease-out ${0.05 * index}s both`,
                                        '@keyframes fadeIn': {
                                            from: { opacity: 0, transform: 'translateY(10px)' },
                                            to: { opacity: 1, transform: 'translateY(0)' },
                                        },
                                        '&:hover': {
                                            transform: 'translateY(-1px) scale(1)',
                                            boxShadow: `
                                                0 2px 4px rgba(0, 0, 0, 0.03),
                                                0 8px 16px rgba(0, 0, 0, 0.04),
                                                0 16px 32px rgba(0, 0, 0, 0.04),
                                                inset 0 1px 0 rgba(255, 255, 255, 0.9),
                                                inset 0 -1px 0 rgba(255, 255, 255, 0.3)
                                            `,
                                            bgcolor: 'rgba(255, 255, 255, 0.75)',
                                        },
                                        '&:active': {
                                            transform: 'translateY(0) scale(0.995)',
                                        },
                                    }}
                                >
                                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, position: 'relative', zIndex: 1 }}>
                                        {/* Header Row */}
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                {/* Icon with Liquid Glass Effect */}
                                                <Box
                                                    sx={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: 2,
                                                        background: config.gradient,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        boxShadow: `
                                                            0 4px 12px rgba(0, 0, 0, 0.15),
                                                            inset 0 1px 0 rgba(255, 255, 255, 0.3)
                                                        `,
                                                        position: 'relative',
                                                        '&::before': {
                                                            content: '""',
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            right: 0,
                                                            height: '50%',
                                                            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 100%)',
                                                            borderRadius: 'inherit',
                                                        },
                                                    }}
                                                >
                                                    <IconComponent size={22} color="white" variant="Bold" />
                                                </Box>

                                                {/* Title */}
                                                <Typography
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: '#1E293B',
                                                        fontSize: '1rem',
                                                    }}
                                                >
                                                    {stat.name}
                                                </Typography>
                                            </Box>

                                            {/* Percentage Badge - Liquid Glass Style */}
                                            <Box
                                                sx={{
                                                    px: 1.75,
                                                    py: 0.6,
                                                    borderRadius: 1.5,
                                                    bgcolor: 'rgba(220, 38, 38, 0.12)',
                                                    backdropFilter: 'blur(8px)',
                                                    border: '1px solid rgba(220, 38, 38, 0.2)',
                                                }}
                                            >
                                                <Typography
                                                    sx={{
                                                        fontWeight: 700,
                                                        color: '#DC2626',
                                                        fontSize: '1rem',
                                                    }}
                                                >
                                                    {Math.round(stat.displayPercentage)}%
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Stats Row */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, ml: 7 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Box sx={{
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: '50%',
                                                    bgcolor: '#DC2626',
                                                    boxShadow: '0 0 4px rgba(220, 38, 38, 0.4)',
                                                }} />
                                                <Typography sx={{ fontSize: '0.875rem', color: '#64748B' }}>
                                                    {t('chart_used_label', 'ใช้ไป')}: <strong style={{ color: '#DC2626' }}>{stat.used}</strong> {t('days', 'วัน')}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Box sx={{
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: '50%',
                                                    bgcolor: '#94A3B8',
                                                    boxShadow: '0 0 4px rgba(148, 163, 184, 0.4)',
                                                }} />
                                                <Typography sx={{ fontSize: '0.875rem', color: '#64748B' }}>
                                                    {t('chart_max_label', 'สิทธิ์')}: <strong style={{ color: '#1E293B' }}>{stat.max !== null ? stat.max : '∞'}</strong> {t('days', 'วัน')}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Progress Bar - Enhanced Liquid Glass Style */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box sx={{ flex: 1, position: 'relative' }}>
                                                {/* Background Track */}
                                                <Box
                                                    sx={{
                                                        height: 12,
                                                        borderRadius: 6,
                                                        bgcolor: 'rgba(0, 0, 0, 0.04)',
                                                        overflow: 'hidden',
                                                        boxShadow: `
                                                            inset 0 2px 4px rgba(0, 0, 0, 0.06),
                                                            inset 0 -1px 0 rgba(255, 255, 255, 0.8),
                                                            0 1px 0 rgba(255, 255, 255, 0.5)
                                                        `,
                                                        border: '1px solid rgba(0, 0, 0, 0.03)',
                                                    }}
                                                >
                                                    {/* Fill Bar */}
                                                    <Box
                                                        sx={{
                                                            width: `${Math.min(stat.percentage, 100)}%`,
                                                            height: '100%',
                                                            borderRadius: 6,
                                                            background: 'linear-gradient(90deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)',
                                                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            position: 'relative',
                                                            boxShadow: '0 0 12px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                                                            overflow: 'hidden',
                                                            // Inner highlight
                                                            '&::before': {
                                                                content: '""',
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                right: 0,
                                                                height: '50%',
                                                                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.1) 100%)',
                                                                borderRadius: 'inherit',
                                                            },
                                                        }}
                                                    />
                                                </Box>

                                                {/* MAX Marker at 90% */}
                                                {stat.max !== null && (
                                                    <Box
                                                        sx={{
                                                            position: 'absolute',
                                                            left: '90%',
                                                            top: '50%',
                                                            transform: 'translate(-50%, -50%)',
                                                            zIndex: 2,
                                                        }}
                                                    >
                                                        {/* Vertical Line */}
                                                        <Box
                                                            sx={{
                                                                width: 2,
                                                                height: 16,
                                                                bgcolor: '#6366F1',
                                                                borderRadius: 1,
                                                                boxShadow: '0 0 4px rgba(99, 102, 241, 0.5)',
                                                            }}
                                                        />
                                                        {/* MAX Tooltip - Liquid Glass Style */}
                                                        <Box
                                                            sx={{
                                                                position: 'absolute',
                                                                bottom: '100%',
                                                                left: '50%',
                                                                transform: 'translateX(-50%)',
                                                                mb: 0.5,
                                                                bgcolor: 'rgba(99, 102, 241, 0.9)',
                                                                backdropFilter: 'blur(8px)',
                                                                color: 'white',
                                                                fontSize: '0.6rem',
                                                                fontWeight: 700,
                                                                px: 0.8,
                                                                py: 0.3,
                                                                borderRadius: 1,
                                                                whiteSpace: 'nowrap',
                                                                boxShadow: `
                                                                    0 2px 8px rgba(99, 102, 241, 0.4),
                                                                    inset 0 1px 0 rgba(255, 255, 255, 0.2)
                                                                `,
                                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                '&::after': {
                                                                    content: '""',
                                                                    position: 'absolute',
                                                                    top: '100%',
                                                                    left: '50%',
                                                                    transform: 'translateX(-50%)',
                                                                    border: '4px solid transparent',
                                                                    borderTopColor: 'rgba(99, 102, 241, 0.9)',
                                                                },
                                                            }}
                                                        >
                                                            MAX
                                                        </Box>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>

                                        {/* Footer */}
                                        <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
                                            <Typography sx={{ fontSize: '0.85rem', color: '#94A3B8' }}>
                                                {remaining !== null && remaining > 0 ? (
                                                    <>
                                                        {t('chart_remaining', 'คงเหลือ')}: <strong style={{ color: '#16A34A' }}>{remaining}</strong> {t('days', 'วัน')}
                                                    </>
                                                ) : stat.isOverLimit ? (
                                                    <span style={{ color: '#DC2626' }}>
                                                        ⚠️ {t('chart_over_limit', 'เกินสิทธิ์')} {stat.used - (stat.max || 0)} {t('days', 'วัน')}
                                                    </span>
                                                ) : stat.max === null ? (
                                                    <>{t('chart_unlimited', 'ไม่จำกัดสิทธิ์')}</>
                                                ) : (
                                                    <>{t('chart_used_all', 'ใช้สิทธิ์ครบแล้ว')}</>
                                                )}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>
                )}
            </Box>

            {/* Bottom Navigation */}
            <BottomNav activePage="chart" />
        </Box>
    );
}
