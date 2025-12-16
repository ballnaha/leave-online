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
    IconButton,
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
    More,
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
    percentage: number; // สำหรับ progress bar (max 100)
    displayPercentage: number; // สำหรับแสดงตัวเลข (สามารถเกิน 100 ได้)
    isOverLimit: boolean;
}

// Icon and color config for leave types
const leaveTypeConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
    sick: { icon: Health, color: '#5E72E4', bgColor: '#E9ECFF' },
    personal: { icon: Briefcase, color: '#8965E0', bgColor: '#F0E9FF' },
    vacation: { icon: Sun1, color: '#11CDEF', bgColor: '#E3F9FC' },
    annual: { icon: Sun1, color: '#11CDEF', bgColor: '#E3F9FC' },
    maternity: { icon: Lovely, color: '#F3A4B5', bgColor: '#FDEEF1' },
    ordination: { icon: Building4, color: '#FB6340', bgColor: '#FFF0EB' },
    work_outside: { icon: Car, color: '#2DCECC', bgColor: '#E0F7FA' },
    military: { icon: Shield, color: '#5E72E4', bgColor: '#E9ECFF' },
    marriage: { icon: Heart, color: '#F5365C', bgColor: '#FEE2E2' },
    funeral: { icon: People, color: '#525F7F', bgColor: '#E9ECEF' },
    paternity: { icon: Profile2User, color: '#2DCE89', bgColor: '#E3FCF1' },
    sterilization: { icon: Health, color: '#F5365C', bgColor: '#FEE2E2' },
    business: { icon: Car, color: '#11CDEF', bgColor: '#E3F9FC' },
    unpaid: { icon: MoneySend, color: '#FB6340', bgColor: '#FFF0EB' },
    other: { icon: MessageQuestion, color: '#8898AA', bgColor: '#F0F3F5' },
    default: { icon: MessageQuestion, color: '#8898AA', bgColor: '#F0F3F5' },
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
        // Scale: progress bar 90% = ใช้ครบ, 100% = เกินสิทธิ์
        // แต่ตัวเลข: 100% = ใช้ครบ, >100% = เกินสิทธิ์
        const BAR_FULL_SCALE = 90; // progress bar ที่ 90% = ใช้ครบ
        const stats: LeaveStat[] = filteredTypes.map(type => {
            const used = usedDaysMap[type.code] || 0;
            const max = type.maxDaysPerYear;

            let percentage = 0; // สำหรับ progress bar (90% = ครบ, 100% = เกิน)
            let displayPercentage = 0; // สำหรับแสดงตัวเลข (100% = ครบ, >100% = เกิน)
            let isOverLimit = false;

            if (max && max > 0) {
                // คำนวณ displayPercentage ตามจริง (100% = ใช้ครบ)
                displayPercentage = (used / max) * 100;

                if (used > max) {
                    // เกินสิทธิ์ = bar เต็ม 100% และตัวเลขเกิน 100%
                    percentage = 100;
                    isOverLimit = true;
                } else {
                    // ใช้ไม่ถึงหรือครบพอดี = bar max 90%
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

        // Sort by percentage descending
        return stats.sort((a, b) => b.percentage - a.percentage);
    }, [leaveTypes, leaveRequests, user?.gender, user?.startDate, t]);

    const getConfig = (code: string) => {
        return leaveTypeConfig[code] || leaveTypeConfig.default;
    };

    if (status === 'loading') {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <Skeleton variant="rectangular" width="100%" height={400} />
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#F8F9FA', pb: 12 }}>
            {/* Header with Gradient */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    pt: 'calc(env(safe-area-inset-top, 0px) + 24px)',
                    pb: 8,
                    px: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: -50,
                        right: -50,
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: -30,
                        left: -30,
                        width: 150,
                        height: 150,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                    },
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, position: 'relative', zIndex: 1 }}>
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                        {t('chart_title', 'สถิติการลา')}
                    </Typography>

                    {/* Year Filter */}
                    <FormControl size="small">
                        <Select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                borderRadius: 2,
                                minWidth: 100,
                                '& .MuiOutlinedInput-notchedOutline': {
                                    border: 'none',
                                },
                                '& .MuiSelect-icon': {
                                    color: 'white',
                                },
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                                },
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
                            <Card key={item} sx={{ borderRadius: 3, p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: 2 }} />
                                    <Box sx={{ flex: 1 }}>
                                        <Skeleton variant="text" width="60%" height={24} />
                                        <Skeleton variant="text" width="40%" height={20} />
                                    </Box>
                                </Box>
                                <Skeleton variant="rounded" height={8} sx={{ mt: 2, borderRadius: 1 }} />
                            </Card>
                        ))}
                    </Box>
                ) : leaveStats.length === 0 ? (
                    <Card sx={{ borderRadius: 3, textAlign: 'center', py: 6 }}>
                        <Calendar size={64} color="#CBD5E1" variant="TwoTone" />
                        <Typography sx={{ color: '#94A3B8', mt: 2, fontWeight: 500 }}>
                            {t('no_leave_data', 'ไม่พบข้อมูลการลา')}
                        </Typography>
                    </Card>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {leaveStats.map((stat) => {
                            const config = getConfig(stat.code);
                            const IconComponent = config.icon;
                            const remaining = stat.max !== null ? Math.max(0, stat.max - stat.used) : null;

                            return (
                                <Card
                                    key={stat.code}
                                    sx={{
                                        borderRadius: 1,
                                        bgcolor: 'white',
                                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                                        border: '1px solid #F1F5F9',
                                        overflow: 'visible',
                                    }}
                                >
                                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                        {/* Header Row */}
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                {/* Icon */}
                                                <Box
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: 2,
                                                        bgcolor: config.bgColor,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <IconComponent size={20} color={config.color} variant="Bold" />
                                                </Box>

                                                {/* Title */}
                                                <Typography
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: '#1E293B',
                                                        fontSize: '0.95rem',
                                                    }}
                                                >
                                                    {stat.name}
                                                </Typography>
                                            </Box>

                                            {/* More Button */}
                                            <IconButton size="small" sx={{ color: '#94A3B8', mt: -0.5, mr: -1 }}>
                                                <More size={18} />
                                            </IconButton>
                                        </Box>

                                        {/* Stats Row */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, ml: 6.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#DC2626' }} />
                                                <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                                                    {t('chart_used_label', 'ใช้ไป')}: <strong style={{ color: '#DC2626' }}>{stat.used}</strong> {t('days', 'วัน')}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#94A3B8' }} />
                                                <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                                                    {t('chart_max_label', 'สิทธิ์')}: <strong style={{ color: '#1E293B' }}>{stat.max !== null ? stat.max : '∞'}</strong> {t('days', 'วัน')}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Progress Bar */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box sx={{ flex: 1, position: 'relative' }}>
                                                {/* Background */}
                                                <Box
                                                    sx={{
                                                        height: 8,
                                                        borderRadius: 4,
                                                        bgcolor: '#F1F5F9',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    {/* Fill */}
                                                    <Box
                                                        sx={{
                                                            width: `${Math.min(stat.percentage, 100)}%`,
                                                            height: '100%',
                                                            borderRadius: 4,
                                                            background: stat.isOverLimit
                                                                ? 'linear-gradient(90deg, #DC2626 0%, #991B1B 100%)'
                                                                : 'linear-gradient(90deg, #FCA5A5 0%, #EF4444 50%, #DC2626 100%)',
                                                            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
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
                                                            }}
                                                        />
                                                        {/* MAX Tooltip */}
                                                        <Box
                                                            sx={{
                                                                position: 'absolute',
                                                                bottom: '100%',
                                                                left: '50%',
                                                                transform: 'translateX(-50%)',
                                                                mb: 0.5,
                                                                bgcolor: '#6366F1',
                                                                color: 'white',
                                                                fontSize: '0.6rem',
                                                                fontWeight: 700,
                                                                px: 0.8,
                                                                py: 0.3,
                                                                borderRadius: 1,
                                                                whiteSpace: 'nowrap',
                                                                boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)',
                                                                '&::after': {
                                                                    content: '""',
                                                                    position: 'absolute',
                                                                    top: '100%',
                                                                    left: '50%',
                                                                    transform: 'translateX(-50%)',
                                                                    border: '4px solid transparent',
                                                                    borderTopColor: '#6366F1',
                                                                },
                                                            }}
                                                        >
                                                            MAX
                                                        </Box>
                                                    </Box>
                                                )}
                                            </Box>

                                            {/* Percentage */}
                                            <Typography
                                                sx={{
                                                    fontWeight: 700,
                                                    color: stat.isOverLimit ? '#991B1B' : '#DC2626',
                                                    fontSize: '0.95rem',
                                                    minWidth: 50,
                                                    textAlign: 'right',
                                                }}
                                            >
                                                {Math.round(stat.displayPercentage)}%
                                            </Typography>
                                        </Box>

                                        {/* Footer */}
                                        <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #F1F5F9' }}>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
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
