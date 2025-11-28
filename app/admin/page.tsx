'use client';

import React from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    Card,
    CardContent,
    LinearProgress,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Chip,
} from '@mui/material';
import {
    Users,
    FileText,
    CheckCircle,
    Clock,
    TrendingUp,
    Calendar,
    AlertCircle,
} from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: string;
    trendUp?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend, trendUp }) => (
    <Card
        elevation={0}
        sx={{
            height: '100%',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            transition: 'all 0.3s ease',
            '&:hover': {
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                transform: 'translateY(-2px)',
            },
        }}
    >
        <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        {title}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color="text.primary">
                        {value}
                    </Typography>
                    {trend && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <TrendingUp
                                size={14}
                                color={trendUp ? '#4CAF50' : '#F44336'}
                                style={{ transform: trendUp ? 'none' : 'rotate(180deg)' }}
                            />
                            <Typography
                                variant="caption"
                                sx={{ ml: 0.5, color: trendUp ? 'success.main' : 'error.main' }}
                            >
                                {trend}
                            </Typography>
                        </Box>
                    )}
                </Box>
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: `${color}15`,
                        color: color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {icon}
                </Box>
            </Box>
        </CardContent>
    </Card>
);

export default function AdminDashboardPage() {
    // Mock data - ในการใช้จริงควรดึงจาก API
    const stats = [
        {
            title: 'พนักงานทั้งหมด',
            value: 156,
            icon: <Users size={24} />,
            color: '#6C63FF',
            trend: '+12% จากเดือนที่แล้ว',
            trendUp: true,
        },
        {
            title: 'ใบลารอดำเนินการ',
            value: 24,
            icon: <Clock size={24} />,
            color: '#FF9800',
            trend: '-8% จากเดือนที่แล้ว',
            trendUp: false,
        },
        {
            title: 'อนุมัติแล้ววันนี้',
            value: 8,
            icon: <CheckCircle size={24} />,
            color: '#4CAF50',
        },
        {
            title: 'ใบลาทั้งหมดเดือนนี้',
            value: 45,
            icon: <FileText size={24} />,
            color: '#2196F3',
            trend: '+5% จากเดือนที่แล้ว',
            trendUp: true,
        },
    ];

    const recentLeaves = [
        { name: 'สมชาย ใจดี', type: 'ลาป่วย', days: 2, status: 'pending' },
        { name: 'สมหญิง รักษ์ดี', type: 'ลากิจ', days: 1, status: 'approved' },
        { name: 'วิชัย เก่งงาน', type: 'ลาพักร้อน', days: 5, status: 'pending' },
        { name: 'นภา สดใส', type: 'ลาป่วย', days: 1, status: 'rejected' },
    ];

    const departmentStats = [
        { name: 'ฝ่ายบุคคล', pending: 5, approved: 12, total: 20 },
        { name: 'ฝ่ายการเงิน', pending: 3, approved: 8, total: 15 },
        { name: 'ฝ่ายไอที', pending: 8, approved: 15, total: 30 },
        { name: 'ฝ่ายการตลาด', pending: 2, approved: 10, total: 18 },
    ];

    const getStatusChip = (status: string) => {
        const config: Record<string, { label: string; color: 'warning' | 'success' | 'error' }> = {
            pending: { label: 'รอดำเนินการ', color: 'warning' },
            approved: { label: 'อนุมัติแล้ว', color: 'success' },
            rejected: { label: 'ไม่อนุมัติ', color: 'error' },
        };
        const { label, color } = config[status] || config.pending;
        return <Chip label={label} color={color} size="small" />;
    };

    return (
        <Box>
            {/* Stats Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {stats.map((stat, index) => (
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={index}>
                        <StatCard {...stat} />
                    </Grid>
                ))}
            </Grid>

            {/* Main Content Grid */}
            <Grid container spacing={3}>
                {/* Recent Leave Requests */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            height: '100%',
                        }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6" fontWeight={600}>
                                คำขอลาล่าสุด
                            </Typography>
                            <Chip
                                icon={<AlertCircle size={14} />}
                                label="รอดำเนินการ 24 รายการ"
                                color="warning"
                                size="small"
                            />
                        </Box>
                        <List>
                            {recentLeaves.map((leave, index) => (
                                <ListItem
                                    key={index}
                                    sx={{
                                        px: 2,
                                        py: 1.5,
                                        borderRadius: 1,
                                        mb: 1,
                                        bgcolor: 'grey.50',
                                        '&:hover': { bgcolor: 'grey.100' },
                                    }}
                                >
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                                            {leave.name.charAt(0)}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={leave.name}
                                        secondary={`${leave.type} - ${leave.days} วัน`}
                                        primaryTypographyProps={{ fontWeight: 600 }}
                                    />
                                    {getStatusChip(leave.status)}
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>

                {/* Department Statistics */}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            height: '100%',
                        }}
                    >
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                            สถิติแต่ละแผนก
                        </Typography>
                        {departmentStats.map((dept, index) => (
                            <Box key={index} sx={{ mb: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2" fontWeight={500}>
                                        {dept.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {dept.approved}/{dept.total} อนุมัติแล้ว
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={(dept.approved / dept.total) * 100}
                                    sx={{
                                        height: 8,
                                        borderRadius: 1,
                                        bgcolor: 'grey.200',
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 1,
                                            bgcolor: 'primary.main',
                                        },
                                    }}
                                />
                            </Box>
                        ))}
                    </Paper>
                </Grid>

                {/* Quick Actions / Calendar Preview */}
                <Grid size={{ xs: 12 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            background: 'linear-gradient(135deg, #6C63FF10 0%, #5A52D510 100%)',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Calendar size={24} color="#6C63FF" />
                            <Box>
                                <Typography variant="h6" fontWeight={600}>
                                    ภาพรวมวันนี้ - {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    มีพนักงานลา 8 คน | รอดำเนินการ 24 รายการ | อนุมัติวันนี้ 8 รายการ
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
