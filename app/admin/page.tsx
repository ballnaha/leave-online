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

interface AnnouncementItem {
    id: string;
    title: string;
    description: string;
    date: string;
    author?: string;
}

interface SystemHealthItem {
    id: string;
    label: string;
    status: 'healthy' | 'warning' | 'critical';
    detail: string;
    updatedAt: string;
}

interface DashboardData {
    stats: DashboardStats;
    pendingLeaves: PendingLeave[];
    whoIsOut: WhoIsOut[];
    departmentStats: DepartmentStat[];
    leaveTypeStats: LeaveTypeStat[];
    activities?: ActivityItem[];
    announcements?: AnnouncementItem[];
    systemHealth?: SystemHealthItem[];
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

    const attendanceRate = data?.stats.totalEmployees
        ? Math.round(((data.stats.totalEmployees - data.stats.activeLeavesToday) / data.stats.totalEmployees) * 100)
        : 100;

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
            label: 'อัตราเข้างาน',
            value: `${attendanceRate}%`,
            icon: StatusUp,
            color: '#EC4899',
            description: 'เทียบกับพนักงานทั้งหมด'
        },
    ];

    const fallbackDepartmentStats: DepartmentStat[] = [
        { name: 'ฝ่ายขาย', value: 38 },
        { name: 'วิศวกรรม', value: 25 },
        { name: 'ปฏิบัติการ', value: 18 },
        { name: 'สนับสนุนลูกค้า', value: 12 },
        { name: 'การตลาด', value: 9 },
    ];

    const fallbackLeaveTypeStats: LeaveTypeStat[] = [
        { label: 'ลาป่วย', value: 42, color: typeColors['ลาป่วย'] },
        { label: 'ลากิจ', value: 27, color: typeColors['ลากิจ'] },
        { label: 'พักร้อน', value: 18, color: typeColors['พักร้อน'] },
        { label: 'ลาคลอด', value: 8, color: typeColors['ลาคลอด'] },
        { label: 'ลาบวช', value: 5, color: typeColors['ลาบวช'] },
    ];

    const fallbackActivities: ActivityItem[] = [
        {
            id: 'act-1',
            title: 'อนุมัติคำขอจาก นภัสสร',
            description: 'อนุมัติการลาพักร้อน 3 วัน โดยคุณศิริน',
            timestamp: '09:35 น.',
            category: 'leave',
        },
        {
            id: 'act-2',
            title: 'สร้างนโยบายลาใหม่',
            description: 'เพิ่มสิทธิ์ลากิจพิเศษสำหรับทีมดูแลลูกค้า',
            timestamp: '09:10 น.',
            category: 'people',
        },
        {
            id: 'act-3',
            title: 'Cron job ส่งแจ้งเตือนสำเร็จ',
            description: 'กำหนดการแจ้งเตือนรอบเช้าสถานะปกติ',
            timestamp: '08:40 น.',
            category: 'system',
        },
        {
            id: 'act-4',
            title: 'คำขอใหม่จาก ปริญญา',
            description: 'ลาป่วย 1 วันรอการอนุมัติ',
            timestamp: '08:15 น.',
            category: 'leave',
        },
    ];

    const fallbackAnnouncements: AnnouncementItem[] = [
        {
            id: 'ann-1',
            title: 'แจ้งวันหยุดชดเชย',
            description: 'หยุดเพิ่มวันที่ 12 ธันวาคม เพื่อปรับสมดุลวันหยุดประจำปี',
            date: '7 ธ.ค. 2568',
            author: 'ฝ่ายบุคคล',
        },
        {
            id: 'ann-2',
            title: 'อัปเดตนโยบายการลา',
            description: 'ปรับเพดานลากิจเป็น 8 วัน สำหรับทีมปฏิบัติการ',
            date: '6 ธ.ค. 2568',
            author: 'HRBP',
        },
        {
            id: 'ann-3',
            title: 'ระบบ OneSignal',
            description: 'ทีม IT ทดสอบ Push Notification รอบค่ำเรียบร้อยแล้ว',
            date: '5 ธ.ค. 2568',
            author: 'ฝ่ายไอที',
        },
    ];

    const fallbackSystemHealth: SystemHealthItem[] = [
        {
            id: 'cron',
            label: 'Cron Jobs',
            status: 'healthy',
            detail: 'อัปเดตรอบ 06:00, 12:00, 18:00 สำเร็จ',
            updatedAt: '10:20 น.',
        },
        {
            id: 'onesignal',
            label: 'OneSignal',
            status: 'warning',
            detail: 'พบ error การ push 2 รายการ ต้องตรวจสอบ token',
            updatedAt: '09:50 น.',
        },
        {
            id: 'webhook',
            label: 'Webhook HRIS',
            status: 'healthy',
            detail: 'ซิงก์พนักงานล่าสุด 09:30 น.',
            updatedAt: '09:32 น.',
        },
    ];

    const departmentData = (data?.departmentStats?.length ? data.departmentStats : fallbackDepartmentStats).slice(0, 5);
    const leaveTypeData = (data?.leaveTypeStats?.length ? data.leaveTypeStats : fallbackLeaveTypeStats).slice(0, 5);
    const pendingLeaves = data?.pendingLeaves ?? [];
    const pendingLeavesToShow = pendingLeaves.slice(0, 5);
    const whoIsOutList = data?.whoIsOut ?? [];
    const activityFeed = (data?.activities?.length ? data.activities : fallbackActivities).slice(0, 5);
    const announcementFeed = (data?.announcements?.length ? data.announcements : fallbackAnnouncements).slice(0, 3);
    const systemHealthItems = data?.systemHealth?.length ? data.systemHealth : fallbackSystemHealth;
    const maxDepartmentValue = departmentData.reduce((max, item) => Math.max(max, item.value), 1);

    const activityCategoryStyles: Record<ActivityItem['category'], { label: string; color: string }> = {
        leave: { label: 'คำขอลา', color: '#6366F1' },
        system: { label: 'ระบบ', color: '#F97316' },
        people: { label: 'พนักงาน', color: '#0EA5E9' },
    };

    const systemHealthStatusTokens = {
        healthy: {
            label: 'พร้อมใช้งาน',
            color: theme.palette.success.main,
        },
        warning: {
            label: 'โปรดตรวจสอบ',
            color: '#F59E0B',
        },
        critical: {
            label: 'มีปัญหา',
            color: '#EF4444',
        },
    } as const;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {/* Header */}
            <Box
                sx={{
                    mb: 4,
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 2,
                }}
            >
                <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                        แผงควบคุมองค์กร
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="text.primary">
                        Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {currentDate.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="รีเฟรช">
                        <IconButton
                            onClick={fetchData}
                            size="small"
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                            }}
                        >
                            <Refresh2 size={18} color={theme.palette.text.secondary} />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<DocumentText size={16} />}
                        onClick={() => router.push('/admin/leaves')}
                        sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600, px: 2 }}
                    >
                        จัดการใบลา
                    </Button>
                </Box>
            </Box>

            {/* Stats Cards */}
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    mb: 3,
                }}
            >
                {statsConfig.map((stat) => (
                    <Box
                        key={stat.label}
                        sx={{
                            flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 16px)', lg: '1 1 calc(25% - 16px)' },
                            minWidth: { xs: '100%', sm: 'calc(50% - 16px)', lg: 'calc(25% - 16px)' },
                        }}
                    >
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                height: '100%',
                            }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                        {stat.label}
                                    </Typography>
                                    {loading ? (
                                        <Skeleton width={80} height={34} />
                                    ) : (
                                        <>
                                            <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                                                {stat.value}
                                            </Typography>
                                            {stat.description && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {stat.description}
                                                </Typography>
                                            )}
                                        </>
                                    )}
                                </Box>
                                <Box sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 1,
                                    bgcolor: alpha(stat.color, 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <stat.icon size={20} color={stat.color} variant="Bold" />
                                </Box>
                            </Box>
                        </Paper>
                    </Box>
                ))}
            </Box>

            {/* Main Content */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3 }}>
                {/* Left Column */}
                <Box sx={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Alert for Pending */}
                    {!loading && data?.stats.pending && data.stats.pending > 0 && (
                        <Paper
                            elevation={0}
                            onClick={() => router.push('/admin/leaves?status=pending')}
                            sx={{
                                p: 2,
                                borderRadius: 1,
                                bgcolor: alpha('#F59E0B', 0.08),
                                border: '1px solid',
                                borderColor: alpha('#F59E0B', 0.2),
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                transition: 'all 0.2s',
                                '&:hover': {
                                    bgcolor: alpha('#F59E0B', 0.12),
                                    borderColor: alpha('#F59E0B', 0.3),
                                }
                            }}
                        >
                            <Box sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 1,
                                bgcolor: '#F59E0B',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Clock size={18} color="#fff" variant="Bold" />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={700} color="#92400E">
                                    มี {data.stats.pending} คำขอรออนุมัติ
                                </Typography>
                            </Box>
                            <ArrowRight2 size={18} color="#92400E" />
                        </Paper>
                    )}

                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', xl: 'row' },
                            gap: 3,
                        }}
                    >
                        <Box sx={{ flex: 7, minWidth: 0 }}>
                            {/* Pending Requests */}
                            <Paper
                                elevation={0}
                                sx={{
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    overflow: 'hidden',
                                }}
                            >
                                <Box sx={{
                                    px: 2.5,
                                    py: 2,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 1,
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <Clock size={16} color={theme.palette.primary.main} variant="Bold" />
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            คำขอล่าสุด
                                        </Typography>
                                    </Box>
                                    <Button
                                        size="small"
                                        endIcon={<ArrowRight2 size={14} />}
                                        onClick={() => router.push('/admin/leaves')}
                                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1 }}
                                    >
                                        ดูทั้งหมด
                                    </Button>
                                </Box>

                                {loading ? (
                                    <Box sx={{ p: 2 }}>
                                        <Stack spacing={1.5}>
                                            {[1, 2, 3].map(i => (
                                                <Skeleton key={i} height={56} sx={{ borderRadius: 1 }} />
                                            ))}
                                        </Stack>
                                    </Box>
                                ) : pendingLeaves.length === 0 ? (
                                    <Box sx={{ py: 6, textAlign: 'center' }}>
                                        <Box sx={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 1,
                                            bgcolor: alpha('#10B981', 0.1),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mx: 'auto',
                                            mb: 2,
                                        }}>
                                            <TickCircle size={28} color="#10B981" variant="Bold" />
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={600} color="success.main">
                                            ไม่มีคำขอรออนุมัติ
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            ดำเนินการเรียบร้อยแล้ว
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Stack spacing={0} divider={<Divider />}>
                                        {pendingLeavesToShow.map((leave) => (
                                            <Box
                                                key={leave.id}
                                                onClick={() => router.push(`/admin/leaves?id=${leave.id}`)}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 2,
                                                    px: 2.5,
                                                    py: 1.5,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s',
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                                                    }
                                                }}
                                            >
                                                <Avatar
                                                    src={leave.avatar}
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        fontSize: '0.875rem',
                                                        fontWeight: 600,
                                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                        color: 'primary.main',
                                                    }}
                                                >
                                                    {leave.name.charAt(0)}
                                                </Avatar>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" fontWeight={600} noWrap>
                                                        {leave.name}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                                                        <Chip
                                                            label={leave.type}
                                                            size="small"
                                                            sx={{
                                                                height: 20,
                                                                fontSize: '0.65rem',
                                                                fontWeight: 600,
                                                                borderRadius: 0.5,
                                                                bgcolor: alpha(typeColors[leave.type] || typeColors.default, 0.1),
                                                                color: typeColors[leave.type] || typeColors.default,
                                                            }}
                                                        />
                                                        <Typography variant="caption" color="text.secondary">
                                                            {leave.days} วัน
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {leave.dates}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        ))}
                                    </Stack>
                                )}
                            </Paper>
                        </Box>
                        <Box sx={{ flex: 5, minWidth: 0 }}>
                            {/* Recent Activity */}
                            <Paper
                                elevation={0}
                                sx={{
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    overflow: 'hidden',
                                    height: '100%',
                                }}
                            >
                                <Box sx={{
                                    px: 2.5,
                                    py: 2,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 1,
                                            bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <StatusUp size={16} color={theme.palette.secondary.main} variant="Bold" />
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            ความเคลื่อนไหวล่าสุด
                                        </Typography>
                                    </Box>
                                    <Button
                                        size="small"
                                        onClick={() => router.push('/admin/notifications')}
                                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1 }}
                                        endIcon={<ArrowRight2 size={14} />}
                                    >
                                        เปิดบันทึก
                                    </Button>
                                </Box>
                                <Box sx={{ p: 2.5 }}>
                                    {loading ? (
                                        <Stack spacing={1.5}>
                                            {[1, 2, 3].map(i => (
                                                <Skeleton key={i} height={60} sx={{ borderRadius: 1 }} />
                                            ))}
                                        </Stack>
                                    ) : activityFeed.length === 0 ? (
                                        <Typography variant="caption" color="text.secondary">
                                            ยังไม่มีบันทึกกิจกรรมในวันนี้
                                        </Typography>
                                    ) : (
                                        <Stack spacing={1.5}>
                                            {activityFeed.map((activity) => {
                                                const chip = activityCategoryStyles[activity.category];
                                                return (
                                                    <Box
                                                        key={activity.id}
                                                        sx={{
                                                            border: '1px solid',
                                                            borderColor: 'divider',
                                                            borderRadius: 1,
                                                            p: 1.5,
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
                                                            <Chip
                                                                label={chip?.label || 'ทั่วไป'}
                                                                size="small"
                                                                sx={{
                                                                    height: 22,
                                                                    borderRadius: 1,
                                                                    fontWeight: 600,
                                                                    bgcolor: alpha(chip?.color || theme.palette.primary.main, 0.12),
                                                                    color: chip?.color || theme.palette.primary.main,
                                                                }}
                                                            />
                                                            <Typography variant="caption" color="text.secondary">
                                                                {activity.timestamp}
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                                                            {activity.title}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {activity.description}
                                                        </Typography>
                                                    </Box>
                                                );
                                            })}
                                        </Stack>
                                    )}
                                </Box>
                            </Paper>
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            gap: 3,
                            flexWrap: 'wrap',
                        }}
                    >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            {/* Leave Type Stats */}
                            <Paper
                                elevation={0}
                                sx={{
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    overflow: 'hidden',
                                    height: '100%',
                                }}
                            >
                            <Box sx={{
                                px: 2.5,
                                py: 2,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 1,
                                        bgcolor: alpha('#6366F1', 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Briefcase size={16} color="#6366F1" variant="Bold" />
                                    </Box>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        ประเภทการลา (ปีนี้)
                                    </Typography>
                                </Box>
                            </Box>
                            <Box sx={{ p: 2.5 }}>
                                {loading ? (
                                    <Stack spacing={2}>
                                        {[1, 2, 3].map(i => <Skeleton key={i} height={32} sx={{ borderRadius: 1 }} />)}
                                    </Stack>
                                ) : (
                                    <Stack spacing={2}>
                                        {leaveTypeData.map((item) => {
                                            const color = typeColors[item.label] || item.color || typeColors.default;
                                            return (
                                                <Box key={item.label}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                                                            <Typography variant="body2" fontWeight={500}>
                                                                {item.label}
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="body2" fontWeight={700} color="text.secondary">
                                                            {item.value}%
                                                        </Typography>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={item.value}
                                                        sx={{
                                                            height: 6,
                                                            borderRadius: 1,
                                                            bgcolor: alpha(color, 0.1),
                                                            '& .MuiLinearProgress-bar': {
                                                                bgcolor: color,
                                                                borderRadius: 1,
                                                            }
                                                        }}
                                                    />
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                )}
                            </Box>
                            </Paper>
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            {/* Department Stats */}
                            <Paper
                                elevation={0}
                                sx={{
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    overflow: 'hidden',
                                    height: '100%',
                                }}
                            >
                            <Box sx={{
                                px: 2.5,
                                py: 2,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 1,
                                        bgcolor: alpha('#0EA5E9', 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Building size={16} color="#0EA5E9" variant="Bold" />
                                    </Box>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        ภาระงานแต่ละฝ่าย
                                    </Typography>
                                </Box>
                            </Box>
                            <Box sx={{ p: 2.5 }}>
                                {loading ? (
                                    <Stack spacing={2}>
                                        {[1, 2, 3].map(i => <Skeleton key={i} height={32} sx={{ borderRadius: 1 }} />)}
                                    </Stack>
                                ) : departmentData.length === 0 ? (
                                    <Typography variant="caption" color="text.secondary">
                                        ยังไม่มีข้อมูลฝ่ายงาน
                                    </Typography>
                                ) : (
                                    <Stack spacing={2}>
                                        {departmentData.map((dept) => (
                                            <Box key={dept.name}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {dept.name}
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={700} color="text.secondary">
                                                        {dept.value} คน
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={(dept.value / maxDepartmentValue) * 100}
                                                    sx={{
                                                        height: 6,
                                                        borderRadius: 1,
                                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                        '& .MuiLinearProgress-bar': {
                                                            bgcolor: theme.palette.primary.main,
                                                            borderRadius: 1,
                                                        }
                                                    }}
                                                />
                                            </Box>
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                            </Paper>
                        </Box>
                    </Box>
                </Box>

                {/* Right Column */}
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Who's Out - Light Theme */}
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden',
                        }}
                    >
                        <Box sx={{
                            px: 2.5,
                            py: 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            bgcolor: alpha('#EC4899', 0.04),
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 1,
                                    bgcolor: alpha('#EC4899', 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <UserRemove size={16} color="#EC4899" variant="Bold" />
                                </Box>
                                <Typography variant="subtitle2" fontWeight={700}>
                                    ลาวันนี้
                                </Typography>
                            </Box>
                            <Chip
                                label={data?.stats.activeLeavesToday || 0}
                                size="small"
                                sx={{
                                    height: 24,
                                    minWidth: 24,
                                    fontWeight: 700,
                                    bgcolor: '#EC4899',
                                    color: 'white',
                                    borderRadius: 1,
                                }}
                            />
                        </Box>
                        <Box sx={{ p: 2 }}>
                            {loading ? (
                                <Stack spacing={1.5}>
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} height={48} sx={{ borderRadius: 1 }} />
                                    ))}
                                </Stack>
                            ) : whoIsOutList.length === 0 ? (
                                <Box sx={{ py: 4, textAlign: 'center' }}>
                                    <Box sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 1,
                                        bgcolor: alpha('#10B981', 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mx: 'auto',
                                        mb: 1.5,
                                    }}>
                                        <TickCircle size={24} color="#10B981" variant="Bold" />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        ทุกคนมาทำงานวันนี้
                                    </Typography>
                                </Box>
                            ) : (
                                <Stack spacing={1.5}>
                                    {whoIsOutList.slice(0, 5).map((person, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                p: 1.5,
                                                borderRadius: 1,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                            }}
                                        >
                                            <Avatar
                                                src={person.avatar}
                                                sx={{
                                                    width: 36,
                                                    height: 36,
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                    color: 'primary.main',
                                                }}
                                            >
                                                {person.name.charAt(0)}
                                            </Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={600} noWrap>
                                                    {person.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {person.status}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </Box>
                    </Paper>

                    {/* System Health */}
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden',
                        }}
                    >
                        <Box sx={{
                            px: 2.5,
                            py: 2,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                        }}>
                            <Box sx={{
                                width: 32,
                                height: 32,
                                borderRadius: 1,
                                bgcolor: alpha('#10B981', 0.12),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <TickCircle size={16} color={theme.palette.success.main} variant="Bold" />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={700}>
                                    สถานะระบบ
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    ติดตาม cron / integration ล่าสุด
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ p: 2.5 }}>
                            {loading ? (
                                <Stack spacing={1.5}>
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} height={54} sx={{ borderRadius: 1 }} />
                                    ))}
                                </Stack>
                            ) : (
                                <Stack spacing={1.5}>
                                    {systemHealthItems.map((item) => {
                                        const token = systemHealthStatusTokens[item.status];
                                        return (
                                            <Box
                                                key={item.id}
                                                sx={{
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 1,
                                                    p: 1.5,
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {item.label}
                                                    </Typography>
                                                    <Chip
                                                        label={token.label}
                                                        size="small"
                                                        sx={{
                                                            height: 22,
                                                            borderRadius: 1,
                                                            fontWeight: 600,
                                                            bgcolor: alpha(token.color, 0.12),
                                                            color: token.color,
                                                        }}
                                                    />
                                                </Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.detail}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    อัปเดต {item.updatedAt}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            )}
                        </Box>
                    </Paper>

                    {/* Announcements */}
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden',
                        }}
                    >
                        <Box sx={{
                            px: 2.5,
                            py: 2,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 1,
                                    bgcolor: alpha('#F97316', 0.12),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <DocumentText size={16} color="#F97316" variant="Bold" />
                                </Box>
                                <Typography variant="subtitle2" fontWeight={700}>
                                    ประกาศ / แจ้งเตือน
                                </Typography>
                            </Box>
                            <Button
                                size="small"
                                onClick={() => router.push('/admin/notifications')}
                                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1 }}
                            >
                                ดูเพิ่มเติม
                            </Button>
                        </Box>
                        <Box sx={{ p: 2.5 }}>
                            {loading ? (
                                <Stack spacing={1.5}>
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} height={52} sx={{ borderRadius: 1 }} />
                                    ))}
                                </Stack>
                            ) : announcementFeed.length === 0 ? (
                                <Typography variant="caption" color="text.secondary">
                                    ไม่มีประกาศใหม่
                                </Typography>
                            ) : (
                                <Stack spacing={1.5}>
                                    {announcementFeed.map((announcement) => (
                                        <Box key={announcement.id}>
                                            <Typography variant="body2" fontWeight={600}>
                                                {announcement.title}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {announcement.description}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                {announcement.date}{announcement.author ? ` • ${announcement.author}` : ''}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </Box>
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
}
