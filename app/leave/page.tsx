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
    Drawer,
    Divider,
    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
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
    X,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    Paperclip,
    Phone,
    MapPin,
    User,
    Ban,
    Trash2,
    AlertTriangle,
    Search,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/app/components/BottomNav';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { LeaveRequest, LeaveApproval, LeaveAttachment } from '@/types/leave';
import LeaveDetailDrawer from '@/app/components/LeaveDetailDrawer';

dayjs.locale('th');

// กำหนด icon และสีสำหรับแต่ละประเภทการลา (สีแบบ balloon)
const leaveTypeConfig: Record<string, { icon: any; color: string; lightColor: string; label: string }> = {
    sick: { icon: Stethoscope, color: '#5E72E4', lightColor: '#E9ECFF', label: 'ลาป่วย' },
    personal: { icon: Briefcase, color: '#8965E0', lightColor: '#F0E9FF', label: 'ลากิจ' },
    vacation: { icon: Umbrella, color: '#11CDEF', lightColor: '#E3F9FC', label: 'ลาพักร้อน' },
    maternity: { icon: Baby, color: '#F3A4B5', lightColor: '#FDEEF1', label: 'ลาคลอด' },
    other: { icon: HelpCircle, color: '#5E72E4', lightColor: '#E9ECFF', label: 'อื่นๆ' },
    default: { icon: Clock, color: '#8898AA', lightColor: '#F0F3F5', label: 'การลา' },
};

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
    const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

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
            } else {
                console.error('Failed to fetch leave types');
            }

            if (leavesRes.ok) {
                const leavesData = await leavesRes.json();
                setMyLeaves(leavesData.data || []);
            } else {
                console.error('Failed to fetch leaves');
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
                return { label: 'อนุมัติแล้ว', color: 'success' as const, icon: CheckCircle, bgColor: '#ECFDF5', textColor: '#059669' };
            case 'rejected':
                return { label: 'ไม่อนุมัติ', color: 'error' as const, icon: XCircle, bgColor: '#FEF2F2', textColor: '#DC2626' };
            case 'cancelled':
                return { label: 'ยกเลิกแล้ว', color: 'warning' as const, icon: Ban, bgColor: '#FFF7ED', textColor: '#EA580C' };
            default:
                return { label: 'รออนุมัติ', color: 'warning' as const, icon: Clock, bgColor: '#FFFBEB', textColor: '#D97706' };
        }
    };

    const handleOpenDetail = (leave: LeaveRequest) => {
        setSelectedLeave(leave);
        setDrawerOpen(true);
    };

    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setTimeout(() => setSelectedLeave(null), 300);
    };

    const handleCancelLeave = async () => {
        if (!selectedLeave) return;
        
        if (!cancelReason.trim()) {
            alert('กรุณาระบุเหตุผลการยกเลิก');
            return;
        }

        setCancelling(true);
        try {
            const res = await fetch(`/api/leaves/${selectedLeave.id}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cancelReason: cancelReason.trim() }),
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({ error: 'ไม่สามารถยกเลิกใบลาได้' }));
                alert(error.error || 'ไม่สามารถยกเลิกใบลาได้');
                return;
            }
            
            // อัพเดท state
            setMyLeaves((prev) =>
                prev.map((leave) =>
                    leave.id === selectedLeave.id 
                        ? { ...leave, status: 'cancelled', cancelReason: cancelReason.trim(), cancelledAt: new Date().toISOString() } 
                        : leave
                )
            );
            setSelectedLeave({ 
                ...selectedLeave, 
                    status: 'cancelled', 
                    cancelReason: cancelReason.trim(),
                    cancelledAt: new Date().toISOString()
                });
                setCancelDialogOpen(false);
                setCancelReason('');
        } catch (error) {
            console.error('Error cancelling leave:', error);
            alert('เกิดข้อผิดพลาดในการยกเลิกใบลา');
        } finally {
            setCancelling(false);
        }
    };

    // Filter leaves based on search query
    const filteredLeaves = useMemo(() => {
        if (!searchQuery.trim()) {
            return myLeaves;
        }
        
        const query = searchQuery.toLowerCase();
        return myLeaves.filter(leave => {
            const reasonMatch = leave.reason?.toLowerCase().includes(query);
            const typeMatch = leave.leaveTypeInfo?.name?.toLowerCase().includes(query) || 
                             leave.leaveType?.toLowerCase().includes(query);
            const statusMatch = getStatusLabel(leave.status).label.toLowerCase().includes(query);
            return reasonMatch || typeMatch || statusMatch;
        });
    }, [myLeaves, searchQuery]);

    const recentLeaves = filteredLeaves.slice(0, 10);
    const today = dayjs();

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
                            const leaveColors = leavesOnDay.map((l) => getLeaveConfig(l.leaveType || l.leaveCode || 'default').color);
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
                                            ? '#667eea' 
                                            : hasLeave 
                                                ? 'white' 
                                                : 'transparent',
                                        border: hasLeave && !isToday 
                                            ? `2px solid ${primaryColor}` 
                                            : 'none',
                                        cursor: hasLeave ? 'pointer' : 'default',
                                        transition: 'all 0.15s ease',
                                        '&:hover': hasLeave || isToday
                                            ? { transform: 'scale(1.08)', boxShadow: `0 4px 12px ${hasLeave ? `${primaryColor}40` : 'rgba(102,126,234,0.3)'}` }
                                            : {},
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontWeight: isToday || hasLeave ? 600 : 400,
                                            color: isToday ? 'white' : hasLeave ? primaryColor : '#475569',
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
                                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#667eea' }} />
                                <Typography variant="caption" sx={{ color: '#64748B' }}>วันนี้</Typography>
                            </Box>
                            {Object.entries(leaveTypeConfig)
                                .filter(([key]) => key !== 'default')
                                .map(([key, config]) => (
                                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'white', border: `2px solid ${config.color}` }} />
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
                            ประวัติการลา ({currentDate.format('MMMM')} {currentDate.year() + 543})
                        </Typography>
                        <Box
                            sx={{
                                bgcolor: '#E8EAF6',
                                color: '#5E72E4',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 2,
                                fontSize: '0.8rem',
                                fontWeight: 600,
                            }}
                        >
                            {filteredLeaves.length} รายการ
                        </Box>
                    </Box>

                    {/* Search Box */}
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="ค้นหาใบลา..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <Box sx={{ display: 'flex', alignItems: 'center', pl: 1, pr: 0.5 }}>
                                    <Search size={18} color="#94A3B8" />
                                </Box>
                            ),
                            sx: {
                                borderRadius: 2,
                                bgcolor: 'white',
                                '& fieldset': { borderColor: '#E2E8F0' },
                                '&:hover fieldset': { borderColor: '#CBD5E1 !important' },
                                '&.Mui-focused fieldset': { borderColor: '#667eea !important' },
                            }
                        }}
                        sx={{ mb: 2 }}
                    />

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
                                {searchQuery ? 'ไม่พบใบลาที่ตรงกับการค้นหา' : 'ยังไม่มีประวัติการลาในเดือนนี้'}
                            </Typography>
                        </Card>
                    ) : (
                        <Fade in>
                            <Stack spacing={1.5}>
                                {recentLeaves.map((leave) => {
                                    const config = getLeaveConfig(leave.leaveType || leave.leaveCode || 'default');
                                    const startDate = dayjs(leave.startDate);
                                    const statusInfo = getStatusLabel(leave.status);
                                    const StatusIcon = statusInfo.icon;

                                    return (
                                        <Card
                                            key={leave.id}
                                            onClick={() => handleOpenDetail(leave)}
                                            sx={{
                                                borderRadius: 1,
                                                p: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 2,
                                                transition: 'all 0.15s ease',
                                                border: '1px solid #F1F5F9',
                                                boxShadow: 'none',
                                                cursor: 'pointer',
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
                                                    borderRadius: 1,
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
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                                                    <Typography 
                                                        sx={{ 
                                                            fontWeight: 600, 
                                                            color: '#1E293B',
                                                            fontSize: '0.95rem',
                                                        }} 
                                                        noWrap
                                                    >
                                                        {config.label}
                                                    </Typography>
                                                    {/* Status Badge */}
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            px: 1,
                                                            py: 0.25,
                                                            borderRadius: 1,
                                                            bgcolor: statusInfo.bgColor,
                                                        }}
                                                    >
                                                        <StatusIcon size={12} color={statusInfo.textColor} />
                                                        <Typography
                                                            sx={{
                                                                fontSize: '0.7rem',
                                                                fontWeight: 600,
                                                                color: statusInfo.textColor,
                                                            }}
                                                        >
                                                            {statusInfo.label}
                                                        </Typography>
                                                    </Box>
                                                </Box>
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

                                            {/* Arrow indicator */}
                                            <ChevronRight size={18} color="#94A3B8" />
                                        </Card>
                                    );
                                })}
                            </Stack>
                        </Fade>
                    )}
                </Box>
            </Box>

            <BottomNav activePage="leave" />

            {/* Leave Detail Drawer */}
            <LeaveDetailDrawer
                open={drawerOpen}
                onClose={handleCloseDrawer}
                leave={selectedLeave}
                onCancel={() => setCancelDialogOpen(true)}
            />


            {/* Cancel Confirmation Dialog */}
            <Dialog
                open={cancelDialogOpen}
                onClose={() => {
                    if (!cancelling) {
                        setCancelDialogOpen(false);
                        setCancelReason('');
                    }
                }}
                PaperProps={{
                    sx: {
                        borderRadius: 1,
                        maxWidth: 400,
                        width: '90%',
                    },
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 1,
                                bgcolor: '#FEF2F2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <AlertTriangle size={22} color="#DC2626" />
                        </Box>
                        <Typography sx={{ fontWeight: 700, color: '#1E293B' }}>
                            ยืนยันการยกเลิกใบลา
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: '#64748B', fontSize: '0.95rem', mb: 2 }}>
                        กรุณาระบุเหตุผลที่ต้องการยกเลิกใบลา
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="ระบุเหตุผล..."
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        disabled={cancelling}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 1,
                            },
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button
                        onClick={() => {
                            setCancelDialogOpen(false);
                            setCancelReason('');
                        }}
                        disabled={cancelling}
                        sx={{
                            borderRadius: 1,
                            color: '#64748B',
                            fontWeight: 500,
                        }}
                    >
                        ยกเลิก
                    </Button>
                    <Button
                        onClick={handleCancelLeave}
                        variant="contained"
                        color="error"
                        disabled={cancelling || !cancelReason.trim()}
                        sx={{
                            borderRadius: 1,
                            fontWeight: 600,
                            bgcolor: '#DC2626',
                            '&:hover': { bgcolor: '#B91C1C' },
                        }}
                    >
                        {cancelling ? (
                            <CircularProgress size={20} color="inherit" />
                        ) : (
                            'ยืนยันยกเลิก'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
