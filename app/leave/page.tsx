'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Card,
    IconButton,
    CircularProgress,
    Chip,
    Stack,
    Fade,
    useMediaQuery,
    Button,
    Menu,
    MenuItem,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Heart,
    Briefcase,
    Umbrella,
    HelpCircle,
    Clock,
    Baby,
    Church,
    Home,
    Car,
    Shield,
    Users,
    Stethoscope,
    Sun,
    CalendarDays,
    ArrowLeft,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/app/components/BottomNav';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

// กำหนด icon และสีสำหรับแต่ละประเภทการลา (สีแบบ balloon)
const leaveTypeConfig: Record<string, { icon: any; color: string; lightColor: string; label: string }> = {
    sick: { icon: Heart, color: '#FF6B6B', lightColor: '#FFE8E8', label: 'ลาป่วย' },
    personal: { icon: Briefcase, color: '#845EF7', lightColor: '#F3EFFF', label: 'ลากิจ' },
    vacation: { icon: Umbrella, color: '#FFD43B', lightColor: '#FFF9DB', label: 'ลาพักร้อน' },
    maternity: { icon: Baby, color: '#F783AC', lightColor: '#FFDEEB', label: 'ลาคลอด' },
    other: { icon: HelpCircle, color: '#748FFC', lightColor: '#EDF2FF', label: 'อื่นๆ' },
    default: { icon: Clock, color: '#868E96', lightColor: '#F1F3F5', label: 'การลา' },
};

interface LeaveRequest {
    id: number;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    status: string;
    createdAt: string;
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

export default function LeavePage() {
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [loading, setLoading] = useState(true);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [yearAnchorEl, setYearAnchorEl] = useState<null | HTMLElement>(null);

    // Generate years for dropdown dynamically
    // Shows current year and all previous years from 2024 (พ.ศ. 2567)
    const currentYear = dayjs().year();
    const startYear = 2025; // ปี ค.ศ. 2024 = พ.ศ. 2567
    const availableYears = Array.from(
        { length: currentYear - startYear + 1 },
        (_, i) => currentYear - i
    ); // เรียงจากปีปัจจุบันลงไป

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [typesRes, leavesRes] = await Promise.all([
                fetch('/api/leave-types'),
                fetch(`/api/my-leaves?year=${currentDate.year()}&month=${currentDate.month() + 1}`),
            ]);

            if (typesRes.ok) {
                const typesData = await typesRes.json();
                setLeaveTypes(typesData);
            }

            if (leavesRes.ok) {
                const leavesData = await leavesRes.json();
                setMyLeaves(leavesData.data || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calendar logic - Mon to Sun with Today label
    const daysOfWeekFull = ['Mon', 'Tue', 'Today', 'Thu', 'Fri', 'Sat', 'Sun'];
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDayOfWeek = startOfMonth.day() === 0 ? 6 : startOfMonth.day() - 1;

    const calendarDays = useMemo(() => {
        const days: (dayjs.Dayjs | null)[] = [];

        // Empty cells before month start
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }

        // Days of the month
        for (let d = 1; d <= endOfMonth.date(); d++) {
            days.push(currentDate.date(d));
        }

        return days;
    }, [currentDate, startDayOfWeek, endOfMonth]);

    // Map leave dates for highlighting
    const leaveDatesMap = useMemo(() => {
        const map: Record<string, LeaveRequest[]> = {};
        myLeaves.forEach((leave) => {
            const start = dayjs(leave.startDate);
            const end = dayjs(leave.endDate);
            let current = start;
            while (current.isBefore(end) || current.isSame(end, 'day')) {
                const key = current.format('YYYY-MM-DD');
                if (!map[key]) map[key] = [];
                map[key].push(leave);
                current = current.add(1, 'day');
            }
        });
        return map;
    }, [myLeaves]);

    const handlePrevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'));
    const handleNextMonth = () => setCurrentDate(currentDate.add(1, 'month'));

    const handleYearClick = (event: React.MouseEvent<HTMLElement>) => {
        setYearAnchorEl(event.currentTarget);
    };

    const handleYearClose = () => {
        setYearAnchorEl(null);
    };

    const handleYearSelect = (year: number) => {
        setCurrentDate(currentDate.year(year));
        setYearAnchorEl(null);
    };

    const handleSelectLeaveType = (code: string) => {
        router.push(`/leave/${code}`);
    };

    const getLeaveConfig = (code: string) => leaveTypeConfig[code] || leaveTypeConfig.default;

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'approved':
                return { label: 'อนุมัติแล้ว', color: 'success' as const };
            case 'rejected':
                return { label: 'ไม่อนุมัติ', color: 'error' as const };
            default:
                return { label: 'รออนุมัติ', color: 'warning' as const };
        }
    };

    const recentLeaves = myLeaves.slice(0, 5);
    const today = dayjs();

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#F8F9FA', pb: 12 }}>
            {/* Header with Gradient - Like Profile Page */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    pt: 3,
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        
                        <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                            ประวัติการลา
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Main Content */}
            <Box sx={{ px: 2, mt: -5, position: 'relative', zIndex: 2, maxWidth: 1200, mx: 'auto' }}>
                {/* Calendar Card - Clean like reference */}
                <Card
                    sx={{
                        borderRadius: 1,
                        p: { xs: 2, sm: 3 },
                        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                        border: '1px solid #F1F5F9',
                        mb: 3,
                    }}
                >
                    {/* Month & Year Navigation */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                        <IconButton 
                            onClick={handlePrevMonth} 
                            size="small"
                            sx={{ color: '#94A3B8' }}
                        >
                            <ChevronLeft size={22} />
                        </IconButton>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography 
                                variant="h6" 
                                sx={{ 
                                    fontWeight: 600, 
                                    color: '#1E293B',
                                    fontSize: '1.1rem',
                                }}
                            >
                                {currentDate.format('MMMM')}
                            </Typography>
                            <Button
                                onClick={handleYearClick}
                                size="small"
                                endIcon={<ChevronDown size={16} />}
                                sx={{
                                    color: '#667eea',
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    textTransform: 'none',
                                    minWidth: 'auto',
                                    px: 1,
                                    '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.08)' },
                                }}
                            >
                                {currentDate.year() + 543}
                            </Button>
                            <Menu
                                anchorEl={yearAnchorEl}
                                open={Boolean(yearAnchorEl)}
                                onClose={handleYearClose}
                                PaperProps={{
                                    sx: {
                                        borderRadius: 1,
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                        minWidth: 100,
                                    }
                                }}
                            >
                                {availableYears.map((year) => (
                                    <MenuItem
                                        key={year}
                                        onClick={() => handleYearSelect(year)}
                                        selected={year === currentDate.year()}
                                        sx={{
                                            fontWeight: year === currentDate.year() ? 600 : 400,
                                            color: year === currentDate.year() ? '#667eea' : 'inherit',
                                        }}
                                    >
                                        {year + 543}
                                    </MenuItem>
                                ))}
                            </Menu>
                        </Box>
                        <IconButton 
                            onClick={handleNextMonth} 
                            size="small"
                            sx={{ color: '#94A3B8' }}
                        >
                            <ChevronRight size={22} />
                        </IconButton>
                    </Box>

                    {/* Days of Week Header - Like reference with Today */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: 0.5,
                            mb: 1.5,
                        }}
                    >
                        {daysOfWeek.map((day, index) => {
                            const todayDayOfWeek = today.day() === 0 ? 6 : today.day() - 1;
                            const isCurrentDay = index === todayDayOfWeek && currentDate.month() === today.month() && currentDate.year() === today.year();
                            return (
                                <Typography
                                    key={day}
                                    variant="caption"
                                    sx={{
                                        textAlign: 'center',
                                        fontWeight: isCurrentDay ? 600 : 500,
                                        color: isCurrentDay ? '#6366F1' : '#94A3B8',
                                        py: 0.5,
                                        fontSize: '0.75rem',
                                    }}
                                >
                                    {isCurrentDay ? day : day}
                                </Typography>
                            );
                        })}
                    </Box>

                    {/* Calendar Grid - Cleaner rounded cells like reference */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: { xs: 0.5, sm: 1 },
                        }}
                    >
                        {calendarDays.map((day, idx) => {
                            if (!day) {
                                return (
                                    <Box 
                                        key={`empty-${idx}`} 
                                        sx={{ 
                                            aspectRatio: '1',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }} 
                                    >
                                        <Typography sx={{ color: '#E2E8F0', fontSize: '0.85rem' }}>
                                            {startOfMonth.subtract(startDayOfWeek - idx, 'day').date()}
                                        </Typography>
                                    </Box>
                                );
                            }

                            const dateKey = day.format('YYYY-MM-DD');
                            const leavesOnDay = leaveDatesMap[dateKey] || [];
                            const isToday = day.isSame(today, 'day');
                            const hasLeave = leavesOnDay.length > 0;

                            // Get leave colors for this day
                            const leaveColors = leavesOnDay.map((l) => getLeaveConfig(l.leaveType).color);
                            const primaryColor = hasLeave ? leaveColors[0] : null;

                            return (
                                <Box
                                    key={dateKey}
                                    sx={{
                                        aspectRatio: '1',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 2.5,
                                        position: 'relative',
                                        bgcolor: isToday 
                                            ? '#6366F1' 
                                            : hasLeave 
                                                ? primaryColor 
                                                : 'transparent',
                                        cursor: hasLeave ? 'pointer' : 'default',
                                        transition: 'all 0.15s ease',
                                        '&:hover': hasLeave || isToday
                                            ? { transform: 'scale(1.08)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }
                                            : {},
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontWeight: isToday || hasLeave ? 600 : 400,
                                            color: isToday || hasLeave ? 'white' : '#475569',
                                            fontSize: { xs: '0.8rem', sm: '0.9rem' },
                                        }}
                                    >
                                        {day.date()}
                                    </Typography>
                                    {/* Badge for multiple leaves */}
                                    {leavesOnDay.length > 1 && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                right: 0,
                                                width: 16,
                                                height: 16,
                                                borderRadius: '50%',
                                                bgcolor: '#FF6B6B',
                                                color: 'white',
                                                fontSize: '0.6rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 700,
                                                border: '2px solid white',
                                            }}
                                        >
                                            +{leavesOnDay.length - 1}
                                        </Box>
                                    )}
                                </Box>
                            );
                        })}
                    </Box>

                    {/* Legend - Color meanings */}
                    <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #F1F5F9' }}>
                        <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 500, mb: 1, display: 'block' }}>
                            คำอธิบายสี
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#6366F1' }} />
                                <Typography variant="caption" sx={{ color: '#64748B' }}>วันนี้</Typography>
                            </Box>
                            {Object.entries(leaveTypeConfig)
                                .filter(([key]) => key !== 'default')
                                .map(([key, config]) => (
                                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: config.color }} />
                                        <Typography variant="caption" sx={{ color: '#64748B' }}>{config.label}</Typography>
                                    </Box>
                                ))}
                        </Box>
                    </Box>
                </Card>

                {/* Upcoming Leaves - Like reference */}
                <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography 
                            variant="subtitle1" 
                            sx={{ 
                                fontWeight: 600, 
                                color: '#1E293B',
                                fontSize: '1rem',
                            }}
                        >
                            ประวัติการลา
                        </Typography>
                        <Button
                            size="small"
                            sx={{ 
                                textTransform: 'none', 
                                color: '#6366F1',
                                fontWeight: 500,
                                fontSize: '0.85rem',
                            }}
                            onClick={() => router.push('/leave/history')}
                        >
                            See all
                        </Button>
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : recentLeaves.length === 0 ? (
                        <Card
                            sx={{
                                borderRadius: 1,
                                p: 3,
                                textAlign: 'center',
                                bgcolor: 'grey.50',
                                border: '1px dashed',
                                borderColor: 'grey.200',
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                ยังไม่มีประวัติการลาในเดือนนี้
                            </Typography>
                        </Card>
                    ) : (
                        <Fade in>
                            <Stack spacing={1.5}>
                                {recentLeaves.map((leave) => {
                                    const config = getLeaveConfig(leave.leaveType);
                                    const startDate = dayjs(leave.startDate);

                                    return (
                                        <Card
                                            key={leave.id}
                                            sx={{
                                                borderRadius: 1,
                                                p: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 2,
                                                transition: 'all 0.15s ease',
                                                border: '1px solid #F1F5F9',
                                                boxShadow: 'none',
                                                '&:hover': {
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                                    borderColor: '#E2E8F0',
                                                },
                                            }}
                                        >
                                            {/* Date Badge - Like reference */}
                                            <Box
                                                sx={{
                                                    minWidth: 50,
                                                    textAlign: 'center',
                                                    py: 1,
                                                    px: 1.5,
                                                    borderRadius: 2.5,
                                                    bgcolor: config.lightColor,
                                                    borderLeft: `3px solid ${config.color}`,
                                                }}
                                            >
                                                <Typography
                                                    sx={{ 
                                                        fontSize: '1.25rem',
                                                        fontWeight: 700,
                                                        color: config.color, 
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    {startDate.date()}
                                                </Typography>
                                                <Typography
                                                    sx={{ 
                                                        color: config.color, 
                                                        fontWeight: 500,
                                                        fontSize: '0.7rem',
                                                        textTransform: 'uppercase',
                                                    }}
                                                >
                                                    {startDate.format('MMM')}
                                                </Typography>
                                            </Box>

                                            {/* Content */}
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography 
                                                    sx={{ 
                                                        fontWeight: 600, 
                                                        color: '#1E293B',
                                                        fontSize: '0.95rem',
                                                        mb: 0.3,
                                                    }} 
                                                    noWrap
                                                >
                                                    {config.label}
                                                </Typography>
                                                <Typography 
                                                    sx={{ 
                                                        color: '#94A3B8',
                                                        fontSize: '0.8rem',
                                                    }} 
                                                    noWrap
                                                >
                                                    {leave.totalDays} วัน • {leave.reason}
                                                </Typography>
                                            </Box>
                                        </Card>
                                    );
                                })}
                            </Stack>
                        </Fade>
                    )}
                </Box>
            </Box>

            <BottomNav activePage="leave" />
        </Box>
    );
}
