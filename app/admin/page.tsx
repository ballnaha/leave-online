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

interface DashboardData {
    stats: DashboardStats;
    pendingLeaves: PendingLeave[];
    whoIsOut: WhoIsOut[];
    departmentStats: DepartmentStat[];
    leaveTypeStats: LeaveTypeStat[];
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
        },
        {
            label: 'รอดำเนินการ',
            value: data?.stats.pending || 0,
            icon: Timer,
            color: '#F59E0B',
        },
        {
            label: 'อนุมัติวันนี้',
            value: data?.stats.approvedToday || 0,
            icon: TickCircle,
            color: '#10B981',
        },
        {
            label: 'อัตราเข้างาน',
            value: `${attendanceRate}%`,
            icon: StatusUp,
            color: '#EC4899',
        },
    ];

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
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
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 2,
                mb: 3,
            }}>
                {statsConfig.map((stat) => (
                    <Paper
                        key={stat.label}
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                    {stat.label}
                                </Typography>
                                {loading ? (
                                    <Skeleton width={60} height={36} />
                                ) : (
                                    <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                                        {stat.value}
                                    </Typography>
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
                        ) : data?.pendingLeaves.length === 0 ? (
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
                                {data?.pendingLeaves.slice(0, 5).map((leave) => (
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

                    {/* Leave Type Stats */}
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
                                    {data?.leaveTypeStats.slice(0, 5).map((item) => {
                                        const color = typeColors[item.label] || typeColors.default;
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
                            ) : data?.whoIsOut.length === 0 ? (
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
                                    {data?.whoIsOut.slice(0, 5).map((person, index) => (
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

                    {/* Quick Links */}
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
                        }}>
                            <Typography variant="subtitle2" fontWeight={700}>
                                เมนูลัด
                            </Typography>
                        </Box>
                        <Stack spacing={0} divider={<Divider />}>
                            {[
                                { label: 'จัดการใบลา', icon: DocumentText, path: '/admin/leaves', color: '#6366F1' },
                                { label: 'พนักงาน', icon: People, path: '/admin/users', color: '#10B981' },
                                { label: 'วันหยุด', icon: Calendar, path: '/admin/holidays', color: '#F59E0B' },
                                { label: 'ฝ่ายงาน', icon: Building, path: '/admin/departments', color: '#EC4899' },
                            ].map((item) => (
                                <Box
                                    key={item.label}
                                    onClick={() => router.push(item.path)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        px: 2.5,
                                        py: 1.5,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        '&:hover': {
                                            bgcolor: alpha(item.color, 0.04),
                                        }
                                    }}
                                >
                                    <Box sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 1,
                                        bgcolor: alpha(item.color, 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <item.icon size={16} color={item.color} variant="Bold" />
                                    </Box>
                                    <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                                        {item.label}
                                    </Typography>
                                    <ArrowRight2 size={14} color={theme.palette.text.secondary} />
                                </Box>
                            ))}
                        </Stack>
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
}
