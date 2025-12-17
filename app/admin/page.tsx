'use client';

import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Avatar,
    Chip,
    Button,
    Stack,
    Skeleton,
    useTheme,
    alpha,
    IconButton,
    Tooltip,
    LinearProgress,
    Divider,
} from '@mui/material';
import {
    Profile2User,
    Clock,
    TickCircle,
    Calendar,
    ArrowRight2,
    DocumentText,
    Refresh2,
    Building,
    People,
    Timer,
    StatusUp,
    Briefcase,
    UserRemove,
} from 'iconsax-react';
import { useRouter } from 'next/navigation';

// --- Interfaces ---
interface DashboardStats {
    totalEmployees: number;
    pending: number;
    approvedToday: number;
    activeLeavesToday: number;
}

interface PendingLeave {
    id: number;
    name: string;
    role: string;
    type: string;
    days: number;
    dates: string;
    avatar?: string;
    status: string;
}

interface WhoIsOut {
    name: string;
    dept: string;
    status: string;
    avatar?: string;
}

interface DepartmentStat {
    name: string;
    value: number;
}

interface LeaveTypeStat {
    label: string;
    value: number;
    color: string;
}

interface ActivityItem {
    id: string;
    title: string;
    description: string;
    timestamp: string;
    category: 'leave' | 'system' | 'people';
}

interface TopLeaveTaker {
    id: string;
    name: string;
    dept: string;
    totalDays: number;
    avatar?: string;
}

interface DashboardData {
    stats: DashboardStats;
    pendingLeaves: PendingLeave[];
    whoIsOut: WhoIsOut[];
    departmentStats: DepartmentStat[];
    leaveTypeStats: LeaveTypeStat[];
    activities?: ActivityItem[];
    topLeaveTakers?: TopLeaveTaker[];
}

export default function AdminDashboardPage() {
    const router = useRouter();
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardData | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/dashboard');
            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);


    const typeColors: { [key: string]: string } = {
        'ลาป่วย': '#EF4444',
        'ลากิจ': '#F59E0B',
        'พักร้อน': '#10B981',
        'ลาคลอด': '#EC4899',
        'ลาบวช': '#8B5CF6',
        'default': '#6366F1'
    };

    const currentDate = new Date();

    const statsConfig = [
        {
            label: 'พนักงานทั้งหมด',
            value: data?.stats.totalEmployees || 0,
            icon: Profile2User,
            color: '#6366F1',
            description: 'อัปเดตจากระบบ HR'
        },
        {
            label: 'รอดำเนินการ',
            value: data?.stats.pending || 0,
            icon: Timer,
            color: '#F59E0B',
            description: 'ต้องอนุมัติภายใน SLA'
        },
        {
            label: 'อนุมัติวันนี้',
            value: data?.stats.approvedToday || 0,
            icon: TickCircle,
            color: '#10B981',
            description: 'สรุปภายใน 24 ชั่วโมง'
        },
        {
            label: 'กำลังลาวันนี้',
            value: data?.stats.activeLeavesToday || 0,
            icon: UserRemove,
            color: '#EC4899',
            description: 'พนักงานที่ลาอยู่ในวันนี้'
        },
    ];

    const departmentData = data?.departmentStats ?? [];
    const leaveTypeData = data?.leaveTypeStats ?? [];
    const pendingLeaves = data?.pendingLeaves ?? [];
    const pendingLeavesToShow = pendingLeaves.slice(0, 5);
    const whoIsOutList = data?.whoIsOut ?? [];
    const activityFeed = data?.activities ?? [];
    const topLeaveTakersList = data?.topLeaveTakers ?? [];
    const maxDepartmentValue = departmentData.reduce((max, item) => Math.max(max, item.value), 1);
    const maxLeaveTypeValue = leaveTypeData.reduce((max, item) => Math.max(max, item.value), 1);
    const maxLeaveTakerDays = topLeaveTakersList.reduce((max, item) => Math.max(max, item.totalDays), 1);

    const activityCategoryStyles: Record<ActivityItem['category'], { label: string; color: string }> = {
        leave: { label: 'คำขอลา', color: '#6366F1' },
        system: { label: 'ระบบ', color: '#F97316' },
        people: { label: 'พนักงาน', color: '#0EA5E9' },
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
                <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1, fontWeight: 600 }}>
                        OVERVIEW
                    </Typography>
                    <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ mb: 0.5 }}>
                        Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {currentDate.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Tooltip title="รีเฟรชข้อมูล">
                        <IconButton
                            onClick={fetchData}
                            size="small"
                            sx={{
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                width: 40,
                                height: 40
                            }}
                        >
                            <Refresh2 size={20} color={theme.palette.text.secondary} />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<DocumentText size={18} color={theme.palette.common.white} />}
                        onClick={() => router.push('/admin/leaves')}
                        sx={{
                            borderRadius: 1,
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                            boxShadow: theme.shadows[2]
                        }}
                    >
                        จัดการใบลา
                    </Button>
                </Box>
            </Box>

            {/* Stats Grid */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' },
                gap: 2.5,
                mb: 4
            }}>
                {statsConfig.map((stat) => (
                    <Paper
                        key={stat.label}
                        elevation={0}
                        sx={{
                            height: '100%',
                            p: 3,
                            borderRadius: 1,
                            background: `linear-gradient(145deg, ${alpha(stat.color, 0.03)} 0%, ${alpha(stat.color, 0.08)} 50%, ${alpha(stat.color, 0.15)} 100%)`,
                            border: '1px solid',
                            borderColor: alpha(stat.color, 0.2),
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            backdropFilter: 'blur(10px)',
                            '&:hover': {
                                transform: 'translateY(-2px) scale(1.02)',
                                boxShadow: `0 20px 40px -12px ${alpha(stat.color, 0.35)}`,
                                borderColor: alpha(stat.color, 0.4),
                                '& .stat-icon-box': {
                                    transform: 'rotate(-5deg) scale(1.1)',
                                },
                                '& .stat-glow': {
                                    opacity: 1,
                                },

                            },
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: -50,
                                right: -50,
                                width: 150,
                                height: 150,
                                background: `radial-gradient(circle, ${alpha(stat.color, 0.15)} 0%, transparent 60%)`,
                                borderRadius: '50%',
                            },
                            '&::after': {
                                content: '""',
                                position: 'absolute',
                                bottom: -30,
                                left: -30,
                                width: 100,
                                height: 100,
                                background: `radial-gradient(circle, ${alpha(stat.color, 0.1)} 0%, transparent 70%)`,
                                borderRadius: '50%',
                            }
                        }}
                    >
                        {/* Glow effect on hover */}
                        <Box
                            className="stat-glow"
                            sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '120%',
                                height: '120%',
                                background: `radial-gradient(ellipse at center, ${alpha(stat.color, 0.08)} 0%, transparent 70%)`,
                                opacity: 0,
                                transition: 'opacity 0.4s ease',
                                pointerEvents: 'none',
                            }}
                        />
                        {/* Background Icon */}
                        <Box
                            className="stat-bg-icon"
                            sx={{
                                position: 'absolute',
                                bottom: -15,
                                right: -15,
                                opacity: 0.07,

                                pointerEvents: 'none',
                            }}
                        >
                            <stat.icon size={120} color={stat.color} variant="Bold" />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                            <Box
                                className="stat-icon-box"
                                sx={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 1.5,
                                    background: `linear-gradient(135deg, ${alpha(stat.color, 0.2)} 0%, ${alpha(stat.color, 0.35)} 100%)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: `0 8px 20px ${alpha(stat.color, 0.3)}, inset 0 1px 1px ${alpha('#fff', 0.2)}`,
                                    transition: 'transform 0.4s ease',
                                    border: `1px solid ${alpha(stat.color, 0.3)}`,
                                }}
                            >
                                <stat.icon size={28} color={stat.color} variant="Bold" />
                            </Box>
                            {stat.description && (
                                <Tooltip title={stat.description} arrow>
                                    <Box sx={{
                                        cursor: 'help',
                                        width: 26,
                                        height: 26,
                                        borderRadius: '50%',
                                        background: `linear-gradient(135deg, ${alpha(stat.color, 0.1)} 0%, ${alpha(stat.color, 0.2)} 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `1px solid ${alpha(stat.color, 0.2)}`,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            background: `linear-gradient(135deg, ${alpha(stat.color, 0.2)} 0%, ${alpha(stat.color, 0.3)} 100%)`,
                                        }
                                    }}>
                                        <Typography variant="caption" color={stat.color} sx={{ fontWeight: 700, fontSize: '0.7rem' }}>
                                            ?
                                        </Typography>
                                    </Box>
                                </Tooltip>
                            )}
                        </Box>
                        <Box sx={{ position: 'relative', zIndex: 1 }}>
                            {loading ? (
                                <Skeleton variant="rectangular" width={80} height={20} sx={{ borderRadius: 0.5 }} />
                            ) : (
                                <Typography
                                    variant="h3"
                                    fontWeight={800}
                                    sx={{
                                        background: `linear-gradient(135deg, ${stat.color} 0%, ${alpha(stat.color, 0.7)} 100%)`,
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        letterSpacing: '-1px',
                                        textShadow: `0 2px 10px ${alpha(stat.color, 0.2)}`,
                                    }}
                                >
                                    {stat.value}
                                </Typography>
                            )}
                            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mt: 0.5, letterSpacing: '0.3px' }}>
                                {stat.label}
                            </Typography>
                        </Box>
                    </Paper>
                ))}
            </Box>

            {/* Main Layout Grid */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '2.5fr 1fr' },
                gap: 3
            }}>
                {/* Left Column */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                    {/* Alert Section */}
                    {!loading && data?.stats.pending != null && data.stats.pending > 0 && (
                        <Paper
                            elevation={0}
                            onClick={() => router.push('/admin/leaves?status=pending')}
                            sx={{
                                p: 2,
                                borderRadius: 1,
                                bgcolor: alpha('#F59E0B', 0.05),
                                border: '1px dashed',
                                borderColor: '#F59E0B',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                '&:hover': { bgcolor: alpha('#F59E0B', 0.1) }
                            }}
                        >
                            <Box sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                bgcolor: '#F59E0B',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Clock size={20} color="#fff" variant="Bold" />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle1" fontWeight={700} color="#B45309">
                                    มี {data.stats.pending} คำขอรอการอนุมัติ
                                </Typography>
                                <Typography variant="body2" color="#B45309" sx={{ opacity: 0.8 }}>
                                    โปรดตรวจสอบและดำเนินการภายในเวลาที่กำหนด
                                </Typography>
                            </Box>
                            <ArrowRight2 size={20} color="#B45309" />
                        </Paper>
                    )}

                    {/* Row 1: Pending & Activity */}
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', xl: '1.5fr 1fr' },
                        gap: 3
                    }}>
                        {/* Pending Requests */}
                        <Paper elevation={0} sx={{
                            height: '100%',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                boxShadow: theme.shadows[8],
                                borderColor: 'transparent',
                            }
                        }}>
                            <Box sx={{
                                p: 2.5,
                                background: `linear-gradient(135deg, ${alpha('#6366F1', 0.05)} 0%, ${alpha('#6366F1', 0.1)} 100%)`,
                                borderBottom: '1px solid',
                                borderColor: alpha('#6366F1', 0.1),
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1,
                                        bgcolor: alpha('#6366F1', 0.15),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Clock size={18} color="#6366F1" variant="Bold" />
                                    </Box>
                                    <Typography variant="h6" fontWeight={700}>คำขอล่าสุด</Typography>
                                </Box>
                                <Button
                                    size="small"
                                    onClick={() => router.push('/admin/leaves')}
                                    endIcon={<ArrowRight2 size={16} color="#6366F1" />}
                                    sx={{
                                        borderRadius: 1,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                    }}
                                >
                                    ดูทั้งหมด
                                </Button>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                {loading ? (
                                    <Box sx={{ p: 2.5 }}>
                                        <Stack spacing={2.5}>
                                            {[1, 2, 3].map(i => (
                                                <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                                    <Skeleton variant="circular" width={40} height={40} sx={{ flexShrink: 0 }} />
                                                    <Box sx={{ flex: 1 }}>
                                                        <Skeleton variant="rectangular" width="55%" height={14} sx={{ borderRadius: 0.5, mb: 1 }} />
                                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                            <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 0.5 }} />
                                                            <Skeleton variant="rectangular" width={40} height={12} sx={{ borderRadius: 0.5 }} />
                                                        </Box>
                                                    </Box>
                                                    <Skeleton variant="rectangular" width={45} height={12} sx={{ borderRadius: 0.5 }} />
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Box>
                                ) : pendingLeaves.length === 0 ? (
                                    <Box sx={{ py: 8, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <Box sx={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: '50%',
                                            bgcolor: alpha('#10B981', 0.1),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mb: 2,
                                        }}>
                                            <TickCircle size={32} color="#10B981" variant="Bold" />
                                        </Box>
                                        <Typography variant="body1" fontWeight={600}>ไม่มีรายการรออนุมัติ</Typography>
                                        <Typography variant="body2" color="text.secondary">จัดการครบถ้วนแล้ว</Typography>
                                    </Box>
                                ) : (
                                    <Stack divider={<Divider />}>
                                        {pendingLeavesToShow.map((leave) => (
                                            <Box key={leave.id} onClick={() => router.push(`/admin/leaves?id=${leave.id}`)} sx={{ p: 2, display: 'flex', gap: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                                                <Avatar src={leave.avatar} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>{leave.name.charAt(0)}</Avatar>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="subtitle2" fontWeight={600}>{leave.name}</Typography>
                                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                                                        <Chip label={leave.type} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: alpha(typeColors[leave.type] || typeColors.default, 0.1), color: typeColors[leave.type] || typeColors.default, fontWeight: 600 }} />
                                                        <Typography variant="caption" color="text.secondary">{leave.days} วัน</Typography>
                                                    </Box>
                                                </Box>
                                                <Typography variant="caption" color="text.secondary" fontWeight={500}>{leave.dates}</Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        </Paper>

                        {/* Recent Activity */}
                        <Paper elevation={0} sx={{
                            height: '100%',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                boxShadow: theme.shadows[8],
                                borderColor: 'transparent',
                            }
                        }}>
                            <Box sx={{
                                p: 2.5,
                                background: `linear-gradient(135deg, ${alpha('#10B981', 0.05)} 0%, ${alpha('#10B981', 0.1)} 100%)`,
                                borderBottom: '1px solid',
                                borderColor: alpha('#10B981', 0.1),
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1,
                                        bgcolor: alpha('#10B981', 0.15),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <StatusUp size={18} color="#10B981" variant="Bold" />
                                    </Box>
                                    <Typography variant="h6" fontWeight={700}>ความเคลื่อนไหว</Typography>
                                </Box>
                                <Button
                                    size="small"
                                    onClick={() => router.push('/admin/notifications')}
                                    endIcon={<ArrowRight2 size={16} color="#6366F1" />}
                                    sx={{
                                        borderRadius: 1,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                    }}
                                >
                                    ประวัติ
                                </Button>
                            </Box>
                            <Box sx={{ p: 2.5, flex: 1 }}>
                                {loading ? (
                                    <Stack spacing={2.5}>
                                        {[1, 2, 3].map(i => (
                                            <Box key={i} sx={{ display: 'flex', gap: 1.5 }}>
                                                <Skeleton variant="circular" width={8} height={8} sx={{ mt: 0.8, flexShrink: 0 }} />
                                                <Box sx={{ flex: 1 }}>
                                                    <Skeleton variant="rectangular" width="65%" height={14} sx={{ borderRadius: 0.5, mb: 0.75 }} />
                                                    <Skeleton variant="rectangular" width="85%" height={12} sx={{ borderRadius: 0.5, mb: 0.75 }} />
                                                    <Skeleton variant="rectangular" width="25%" height={10} sx={{ borderRadius: 0.5 }} />
                                                </Box>
                                            </Box>
                                        ))}
                                    </Stack>
                                ) : activityFeed.length === 0 ? (
                                    <Box sx={{ py: 5, textAlign: 'center' }}>
                                        <Box sx={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: '50%',
                                            bgcolor: alpha('#10B981', 0.1),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mx: 'auto',
                                            mb: 2,
                                        }}>
                                            <StatusUp size={28} color="#10B981" variant="Outline" />
                                        </Box>
                                        <Typography variant="body1" fontWeight={600} color="text.primary">ไม่มีกิจกรรมล่าสุด</Typography>
                                        <Typography variant="caption" color="text.secondary">ความเคลื่อนไหวจะปรากฏเมื่อมีการดำเนินการ</Typography>
                                    </Box>
                                ) : (
                                    <Stack spacing={2}>
                                        {activityFeed.map((activity) => (
                                            <Box key={activity.id} sx={{ display: 'flex', gap: 2 }}>
                                                <Box sx={{ mt: 0.5, width: 8, height: 8, borderRadius: '50%', bgcolor: activityCategoryStyles[activity.category].color }} />
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="body2" fontWeight={600}>{activity.title}</Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{activity.description}</Typography>
                                                    <Typography variant="caption" color="text.disabled">{activity.timestamp}</Typography>
                                                </Box>
                                            </Box>
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        </Paper>
                    </Box>

                    {/* Row 2: Stats Charts */}
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        gap: 3
                    }}>
                        {/* Leave Types */}
                        <Paper elevation={0} sx={{
                            height: '100%',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            p: 3,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                boxShadow: theme.shadows[8],
                                borderColor: 'transparent',
                            }
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                <Box sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 1,
                                    bgcolor: alpha('#8B5CF6', 0.15),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Calendar size={18} color="#8B5CF6" variant="Bold" />
                                </Box>
                                <Typography variant="h6" fontWeight={700}>สถิติการลา</Typography>
                            </Box>
                            {loading ? (
                                <Stack spacing={2}>
                                    {[1, 2, 3, 4].map(i => (
                                        <Box key={i}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                                                <Skeleton variant="rectangular" width="35%" height={14} sx={{ borderRadius: 0.5 }} />
                                                <Skeleton variant="rectangular" width="12%" height={14} sx={{ borderRadius: 0.5 }} />
                                            </Box>
                                            <Skeleton variant="rectangular" height={4} sx={{ borderRadius: 0.5 }} />
                                        </Box>
                                    ))}
                                </Stack>
                            ) : leaveTypeData.length === 0 ? (
                                <Box sx={{ py: 5, textAlign: 'center' }}>
                                    <Box sx={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: '50%',
                                        bgcolor: alpha('#8B5CF6', 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mx: 'auto',
                                        mb: 2,
                                    }}>
                                        <Calendar size={28} color="#8B5CF6" variant="Outline" />
                                    </Box>
                                    <Typography variant="body1" fontWeight={600} color="text.primary">ยังไม่มีข้อมูลสถิติการลา</Typography>
                                    <Typography variant="caption" color="text.secondary">ข้อมูลจะปรากฏเมื่อมีการลาในระบบ</Typography>
                                </Box>
                            ) : (
                                <Stack spacing={2.5}>
                                    {leaveTypeData.map((item) => (
                                        <Box key={item.label}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2" fontWeight={500}>{item.label}</Typography>
                                                <Typography variant="body2" fontWeight={700}>{item.value} ครั้ง</Typography>
                                            </Box>
                                            <LinearProgress variant="determinate" value={(item.value / maxLeaveTypeValue) * 100} sx={{ height: 8, borderRadius: 1, bgcolor: alpha(typeColors[item.label] || typeColors.default, 0.1), '& .MuiLinearProgress-bar': { bgcolor: typeColors[item.label] || typeColors.default, borderRadius: 1 } }} />
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </Paper>

                        {/* Departments */}
                        <Paper elevation={0} sx={{
                            height: '100%',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            p: 3,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                boxShadow: theme.shadows[8],
                                borderColor: 'transparent',
                            }
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                <Box sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 1,
                                    bgcolor: alpha('#0EA5E9', 0.15),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Building size={18} color="#0EA5E9" variant="Bold" />
                                </Box>
                                <Typography variant="h6" fontWeight={700}>การลาตามฝ่าย</Typography>
                            </Box>
                            {loading ? (
                                <Stack spacing={2}>
                                    {[1, 2, 3, 4].map(i => (
                                        <Box key={i}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                                                <Skeleton variant="rectangular" width="45%" height={14} sx={{ borderRadius: 0.5 }} />
                                                <Skeleton variant="rectangular" width="12%" height={14} sx={{ borderRadius: 0.5 }} />
                                            </Box>
                                            <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 0.5 }} />
                                        </Box>
                                    ))}
                                </Stack>
                            ) : departmentData.length === 0 ? (
                                <Box sx={{ py: 5, textAlign: 'center' }}>
                                    <Box sx={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: '50%',
                                        bgcolor: alpha('#0EA5E9', 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mx: 'auto',
                                        mb: 2,
                                    }}>
                                        <Building size={28} color="#0EA5E9" variant="Outline" />
                                    </Box>
                                    <Typography variant="body1" fontWeight={600} color="text.primary">ยังไม่มีข้อมูลการลาตามฝ่าย</Typography>
                                    <Typography variant="caption" color="text.secondary">ข้อมูลจะปรากฏเมื่อมีการลาในระบบ</Typography>
                                </Box>
                            ) : (
                                <Stack spacing={2.5}>
                                    {departmentData.map((dept) => (
                                        <Box key={dept.name}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2" fontWeight={500}>{dept.name}</Typography>
                                                <Typography variant="body2" fontWeight={700}>{dept.value} ครั้ง</Typography>
                                            </Box>
                                            <LinearProgress variant="determinate" value={(dept.value / maxDepartmentValue) * 100} sx={{ height: 8, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), '& .MuiLinearProgress-bar': { bgcolor: theme.palette.primary.main, borderRadius: 1 } }} />
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </Paper>
                    </Box>
                </Box>

                {/* Right Column */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Who's Out */}
                    <Paper elevation={0} sx={{
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            boxShadow: theme.shadows[8],
                            borderColor: 'transparent',
                        }
                    }}>
                        <Box sx={{
                            p: 2.5,
                            background: `linear-gradient(135deg, ${alpha('#EC4899', 0.08)} 0%, ${alpha('#EC4899', 0.15)} 100%)`,
                            borderBottom: '1px solid',
                            borderColor: alpha('#EC4899', 0.15),
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 1,
                                    bgcolor: alpha('#EC4899', 0.2),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: `0 4px 12px ${alpha('#EC4899', 0.2)}`,
                                }}>
                                    <UserRemove size={20} color="#EC4899" variant="Bold" />
                                </Box>
                                <Typography variant="subtitle1" fontWeight={700} color="#BE185D">คำขอลาวันนี้</Typography>
                            </Box>
                            <Chip
                                label={`${data?.stats.activeLeavesToday || 0} รายการ`}
                                size="small"
                                sx={{
                                    bgcolor: '#EC4899',
                                    color: 'white',
                                    fontWeight: 700,
                                    height: 28,
                                    px: 1,
                                    borderRadius: 1,
                                    boxShadow: `0 2px 8px ${alpha('#EC4899', 0.4)}`,
                                }}
                            />
                        </Box>
                        <Box sx={{ p: 2 }}>
                            {loading ? (
                                <Stack spacing={1.5}>
                                    {[1, 2, 3].map(i => (
                                        <Box key={i} sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            p: 1.5,
                                            borderRadius: 0.5,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                        }}>
                                            <Skeleton variant="circular" width={40} height={40} sx={{ flexShrink: 0 }} />
                                            <Box sx={{ flex: 1 }}>
                                                <Skeleton variant="rectangular" width="55%" height={14} sx={{ borderRadius: 0.5, mb: 0.75 }} />
                                                <Skeleton variant="rectangular" width="35%" height={12} sx={{ borderRadius: 0.5 }} />
                                            </Box>
                                            <Skeleton variant="rectangular" width={55} height={22} sx={{ borderRadius: 0.5 }} />
                                        </Box>
                                    ))}
                                </Stack>
                            ) : whoIsOutList.length === 0 ? (
                                <Box sx={{ py: 5, textAlign: 'center' }}>
                                    <Box sx={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: '50%',
                                        bgcolor: alpha('#10B981', 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mx: 'auto',
                                        mb: 2,
                                    }}>
                                        <TickCircle size={32} color="#10B981" variant="Bold" />
                                    </Box>
                                    <Typography variant="body1" fontWeight={600} color="text.primary">ยังไม่มีคำขอลาวันนี้</Typography>
                                    <Typography variant="caption" color="text.secondary">ไม่มีพนักงานส่งคำขอลาในวันนี้</Typography>
                                </Box>
                            ) : (
                                <Stack spacing={1.5}>
                                    {whoIsOutList.slice(0, 5).map((person, index) => (
                                        <Box key={index} sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            p: 1.5,
                                            borderRadius: 1,
                                            bgcolor: alpha('#EC4899', 0.04),
                                            border: '1px solid',
                                            borderColor: alpha('#EC4899', 0.1),
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                bgcolor: alpha('#EC4899', 0.08),
                                                borderColor: alpha('#EC4899', 0.2),
                                            }
                                        }}>
                                            <Avatar
                                                src={person.avatar}
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    bgcolor: alpha('#EC4899', 0.15),
                                                    color: '#EC4899',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {person.name.charAt(0)}
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2" fontWeight={600}>{person.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{person.dept}</Typography>
                                            </Box>
                                            <Chip
                                                label={person.status}
                                                size="small"
                                                sx={{
                                                    height: 22,
                                                    fontSize: '0.7rem',
                                                    bgcolor: alpha(typeColors[person.status] || typeColors.default, 0.1),
                                                    color: typeColors[person.status] || typeColors.default,
                                                    fontWeight: 600,
                                                    borderRadius: 1.5,
                                                }}
                                            />
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </Box>
                    </Paper>

                    {/* Top Leave Takers */}
                    <Paper elevation={0} sx={{
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        p: 2.5,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            boxShadow: theme.shadows[8],
                            borderColor: 'transparent',
                        }
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 1,
                                    bgcolor: alpha('#F59E0B', 0.15),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Calendar size={18} color="#F59E0B" variant="Bold" />
                                </Box>
                                <Typography variant="subtitle1" fontWeight={700}>ลามากที่สุด</Typography>
                            </Box>
                        </Box>
                        <Stack spacing={2}>
                            {loading ? (
                                <Stack spacing={1.5}>
                                    {[1, 2, 3].map(i => (
                                        <Box key={i} sx={{
                                            p: 2,
                                            borderRadius: 0.5,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                                <Skeleton variant="circular" width={24} height={24} />
                                                <Skeleton variant="circular" width={32} height={32} />
                                                <Box sx={{ flex: 1 }}>
                                                    <Skeleton variant="rectangular" width="50%" height={14} sx={{ borderRadius: 0.5, mb: 0.5 }} />
                                                    <Skeleton variant="rectangular" width="30%" height={12} sx={{ borderRadius: 0.5 }} />
                                                </Box>
                                                <Skeleton variant="rectangular" width={40} height={14} sx={{ borderRadius: 0.5 }} />
                                            </Box>
                                            <Skeleton variant="rectangular" height={6} sx={{ borderRadius: 0.5 }} />
                                        </Box>
                                    ))}
                                </Stack>
                            ) : topLeaveTakersList.length === 0 ? (
                                <Box sx={{ py: 4, textAlign: 'center' }}>
                                    <Box sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '50%',
                                        bgcolor: alpha('#F59E0B', 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mx: 'auto',
                                        mb: 1.5,
                                    }}>
                                        <Calendar size={24} color="#F59E0B" variant="Outline" />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">ยังไม่มีข้อมูล</Typography>
                                </Box>
                            ) : (
                                topLeaveTakersList.map((person, index) => (
                                    <Box key={person.id} sx={{
                                        p: 2,
                                        borderRadius: 1,
                                        background: index === 0
                                            ? `linear-gradient(135deg, ${alpha('#F59E0B', 0.08)} 0%, ${alpha('#F59E0B', 0.15)} 100%)`
                                            : 'transparent',
                                        border: '1px solid',
                                        borderColor: index === 0 ? alpha('#F59E0B', 0.2) : 'divider',
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: '50%',
                                                    bgcolor: index === 0 ? '#F59E0B' : alpha('#6366F1', 0.1),
                                                    color: index === 0 ? 'white' : '#6366F1',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {index + 1}
                                            </Typography>
                                            <Avatar
                                                src={person.avatar}
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    bgcolor: alpha('#F59E0B', 0.15),
                                                    color: '#F59E0B',
                                                    fontSize: '0.8rem',
                                                }}
                                            >
                                                {person.name.charAt(0)}
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2" fontWeight={600}>{person.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{person.dept}</Typography>
                                            </Box>
                                            <Typography variant="body2" fontWeight={700} color="#F59E0B">
                                                {person.totalDays} วัน
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={(person.totalDays / maxLeaveTakerDays) * 100}
                                            sx={{
                                                height: 6,
                                                borderRadius: 3,
                                                bgcolor: alpha('#F59E0B', 0.1),
                                                '& .MuiLinearProgress-bar': {
                                                    bgcolor: '#F59E0B',
                                                    borderRadius: 3
                                                }
                                            }}
                                        />
                                    </Box>
                                ))
                            )}
                        </Stack>
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
}
