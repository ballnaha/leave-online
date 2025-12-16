'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    CardActionArea,
    Skeleton,
    Chip,
} from '@mui/material';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import BottomNav from '@/app/components/BottomNav';
import { useLocale } from '@/app/providers/LocaleProvider';
import { useUser } from '@/app/providers/UserProvider';
import { useSession } from 'next-auth/react';
import {
    Health,
    Briefcase,
    Sun1,
    Lovely,
    Building4,
    Car,
    MessageQuestion,
    Shield,
    Heart,
    People,
    Profile2User,
    Clock,
    Calendar2,
    MoneySend,
} from 'iconsax-react';
import { HelpCircle } from 'lucide-react';

interface LeaveType {
    id: number;
    code: string;
    name: string;
    description: string | null;
    maxDaysPerYear: number | null;
    isPaid: boolean;
    isActive: boolean;
}

// กำหนด icon, สี และ รูปภาพสำหรับแต่ละประเภทการลา
const leaveTypeConfig: Record<string, { icon: any; color: string; gradient: string; image: string; descKey: string }> = {
    sick: {
        icon: Health,
        color: '#5E72E4',
        gradient: 'linear-gradient(135deg, #5E72E4 0%, #825EE4 100%)',
        image: '/images/icon-stechoscope.png',
        descKey: 'desc_sick'
    },
    personal: {
        icon: Briefcase,
        color: '#8965E0',
        gradient: 'linear-gradient(135deg, #8965E0 0%, #BC65E0 100%)',
        image: '/images/icon-business.png',
        descKey: 'desc_personal'
    },
    vacation: {
        icon: Sun1,
        color: '#11CDEF',
        gradient: 'linear-gradient(135deg, #11CDEF 0%, #1171EF 100%)',
        image: '/images/icon-vacation.png',
        descKey: 'desc_vacation'
    },
    annual: {
        icon: Sun1,
        color: '#2DCECC',
        gradient: 'linear-gradient(135deg, #2DCECC 0%, #2D8BCC 100%)',
        image: '/images/icon-vacation.png',
        descKey: 'desc_vacation'
    },
    maternity: {
        icon: Lovely,
        color: '#F5365C',
        gradient: 'linear-gradient(135deg, #F5365C 0%, #F56036 100%)',
        image: '/images/icon-pregnant.png',
        descKey: 'desc_maternity'
    },
    ordination: {
        icon: Building4,
        color: '#FB6340',
        gradient: 'linear-gradient(135deg, #FB6340 0%, #FBB140 100%)',
        image: '/images/icon-monk.png',
        descKey: 'desc_ordination'
    },
    work_outside: {
        icon: Car,
        color: '#2DCECC',
        gradient: 'linear-gradient(135deg, #2DCECC 0%, #2D8BCC 100%)',
        image: '/images/icon-workoutside.png',
        descKey: 'desc_work_outside'
    },
    unpaid: {
        icon: MoneySend,
        color: '#F5365C',
        gradient: 'linear-gradient(135deg, #F5365C 0%, #F56036 100%)',
        image: '/images/icon-unpaid1.png',
        descKey: 'desc_unpaid'
    },
    military: {
        icon: Shield,
        color: '#5E72E4',
        gradient: 'linear-gradient(135deg, #5E72E4 0%, #5E9BE4 100%)',
        image: '/images/icon-other.png',
        descKey: 'desc_military'
    },
    marriage: {
        icon: Heart,
        color: '#F3A4B5',
        gradient: 'linear-gradient(135deg, #F3A4B5 0%, #D66086 100%)',
        image: '/images/icon-other.png',
        descKey: 'desc_marriage'
    },
    funeral: {
        icon: People,
        color: '#8898AA',
        gradient: 'linear-gradient(135deg, #8898AA 0%, #6A7A8A 100%)',
        image: '/images/icon-other.png',
        descKey: 'desc_funeral'
    },
    paternity: {
        icon: Profile2User,
        color: '#11CDEF',
        gradient: 'linear-gradient(135deg, #11CDEF 0%, #1171EF 100%)',
        image: '/images/icon-other.png',
        descKey: 'desc_paternity'
    },
    sterilization: {
        icon: Health,
        color: '#2DCECC',
        gradient: 'linear-gradient(135deg, #2DCECC 0%, #2D8BCC 100%)',
        image: '/images/icon-other.png',
        descKey: 'desc_sterilization'
    },
    business: {
        icon: Car,
        color: '#8965E0',
        gradient: 'linear-gradient(135deg, #8965E0 0%, #BC65E0 100%)',
        image: '/images/icon-business.png',
        descKey: 'desc_business'
    },
    other: {
        icon: HelpCircle,
        color: '#5E72E4',
        gradient: 'linear-gradient(135deg, #8898AA 0%, #6A7A8A 100%)',
        image: '/images/icon-other.png',
        descKey: 'desc_other'
    },
    default: {
        icon: Calendar2,
        color: '#5E72E4',
        gradient: 'linear-gradient(135deg, #5E72E4 0%, #825EE4 100%)',
        image: '/images/icon-other.png',
        descKey: 'desc_default'
    },
};

export default function LeaveTypesPage() {
    const router = useRouter();
    const { t } = useLocale();
    const { status } = useSession();
    const { user } = useUser();
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/login');
        }
    }, [status, router]);

    useEffect(() => {
        fetchLeaveTypes();
    }, []);

    const fetchLeaveTypes = async () => {
        try {
            const response = await fetch('/api/leave-types');
            if (!response.ok) throw new Error('Failed to fetch leave types');
            const data = await response.json();
            setLeaveTypes(data);
        } catch (error) {
            console.error('Error fetching leave types:', error);
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

    // Filter leave types based on gender and years of service
    const filteredLeaveTypes = useMemo(() => {
        const yearsOfService = getYearsOfService(user?.startDate);

        return leaveTypes.filter(leave => {
            // ถ้าเป็นเพศชาย ไม่แสดงลาคลอด (maternity)
            if (user?.gender === 'male' && leave.code === 'maternity') {
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

    const handleCardClick = (leaveType: LeaveType) => {
        router.push(`/leave/${leaveType.code}`);
    };

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
            {/* Header with Gradient - Like Profile Page */}
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
                        {t('leave_types', 'ประเภทการลา')}
                    </Typography>
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{ px: 2, mt: -5, position: 'relative', zIndex: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {[1, 2, 3, 4, 5, 6].map((item) => (
                            <Box key={item} sx={{ width: 'calc(50% - 8px)' }}>
                                <Skeleton
                                    variant="rounded"
                                    height={160}
                                    sx={{
                                        borderRadius: '16px',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                    }}
                                />
                            </Box>
                        ))}
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {filteredLeaveTypes.map((leaveType) => {
                            const config = getConfig(leaveType.code);

                            return (
                                <Box key={leaveType.id} sx={{ width: 'calc(50% - 8px)' }}>
                                    <Card
                                        sx={{
                                            borderRadius: '20px',
                                            overflow: 'hidden',
                                            bgcolor: 'rgba(255, 255, 255, 0.5)',
                                            backdropFilter: 'blur(10px)',
                                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                                            border: '1px solid rgba(255, 255, 255, 0.8)',
                                            transition: 'all 0.3s ease',
                                            position: 'relative',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: '0 15px 50px rgba(0,0,0,0.15)',
                                                bgcolor: 'rgba(255, 255, 255, 0.7)',
                                            }
                                        }}
                                    >
                                        <CardActionArea onClick={() => handleCardClick(leaveType)}>
                                            {/* Content Section */}
                                            <CardContent sx={{ p: 2, pb: 8, position: 'relative', minHeight: 140 }}>
                                                {/* Days Badge */}
                                                {leaveType.maxDaysPerYear && (
                                                    <Chip
                                                        label={`${leaveType.maxDaysPerYear} ${t('days', 'วัน')}`}
                                                        size="small"
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 12,
                                                            right: 12,
                                                            bgcolor: config.color,
                                                            color: 'white',
                                                            fontWeight: 600,
                                                            fontSize: '0.7rem',
                                                        }}
                                                    />
                                                )}

                                                <Typography
                                                    variant="subtitle1"
                                                    sx={{
                                                        fontWeight: 700,
                                                        color: '#2B3674',
                                                        fontSize: '0.95rem',
                                                        mb: 0.5,
                                                        lineHeight: 1.3,
                                                        pr: leaveType.maxDaysPerYear ? 6 : 0,
                                                    }}
                                                >
                                                    {t(`leave_${leaveType.code}`, leaveType.name)}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{

                                                        fontSize: '0.72rem',
                                                        lineHeight: 1.4,
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    {leaveType.description || t(config.descKey, config.descKey)}
                                                </Typography>


                                                {/* Image at bottom right */}
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        bottom: 8,
                                                        right: 8,
                                                        width: 60,
                                                        height: 60,
                                                        opacity: 0.9,
                                                    }}
                                                >
                                                    <Image
                                                        src={config.image}
                                                        alt={t(`leave_${leaveType.code}`, leaveType.name)}
                                                        width={60}
                                                        height={60}
                                                        style={{
                                                            objectFit: 'contain',
                                                        }}
                                                    />
                                                </Box>
                                            </CardContent>
                                        </CardActionArea>
                                    </Card>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Box>

            {/* Bottom Navigation */}
            <BottomNav activePage="leave-types" />
        </Box>
    );
}
