'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
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
    Tooltip,
    Tabs,
    Tab,
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
    Calendar,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/app/components/BottomNav';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import 'dayjs/locale/en';
import 'dayjs/locale/my';
import { LeaveRequest, LeaveApproval, LeaveAttachment } from '@/types/leave';
import LeaveDetailDrawer from '@/app/components/LeaveDetailDrawer';
import HolidayDrawer, { Holiday } from '@/app/components/HolidayDrawer';
import LeaveTimeline from '@/app/components/LeaveTimeline';
import { useLocale } from '@/app/providers/LocaleProvider';

// กำหนด icon และสีสำหรับแต่ละประเภทการลา (สีแบบ balloon)
const leaveTypeConfig: Record<string, { icon: any; color: string; lightColor: string; label: string }> = {
    sick: { icon: Stethoscope, color: '#5E72E4', lightColor: '#E9ECFF', label: 'ลาป่วย' },
    personal: { icon: Briefcase, color: '#8965E0', lightColor: '#F0E9FF', label: 'ลากิจ' },
    vacation: { icon: Umbrella, color: '#11CDEF', lightColor: '#E3F9FC', label: 'ลาพักร้อน' },
    maternity: { icon: Baby, color: '#F3A4B5', lightColor: '#FDEEF1', label: 'ลาคลอด' },
    ordination: { icon: Church, color: '#FB6340', lightColor: '#FFF0EB', label: 'ลาบวช' },
    work_outside: { icon: Car, color: '#2DCECC', lightColor: '#E0F7FA', label: 'ทำงานนอกสถานที่' },
    absent: { icon: XCircle, color: '#F5365C', lightColor: '#FEE2E2', label: 'ขาดงาน' },
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
    const { t, locale } = useLocale();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [loading, setLoading] = useState(true);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [yearAnchorEl, setYearAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [holidayDrawerOpen, setHolidayDrawerOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
    const [showAllLegends, setShowAllLegends] = useState(false);
    const [currentTab, setCurrentTab] = useState('all');

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
            const [typesRes, leavesRes, holidaysRes] = await Promise.all([
                fetch(`/api/leave-types?year=${currentDate.year()}`),
                fetch(`/api/my-leaves?year=${currentDate.year()}&month=${currentDate.month() + 1}`),
                fetch(`/api/holidays?year=${currentDate.year()}`),
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

            if (holidaysRes.ok) {
                const holidaysData = await holidaysRes.json();
                setHolidays(holidaysData);
            } else {
                console.error('Failed to fetch holidays');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calendar logic - Mon to Sun with Today label
    const daysOfWeekFull = [t('day_mon'), t('day_tue'), t('leave_today'), t('day_thu'), t('day_fri'), t('day_sat'), t('day_sun')];
    const daysOfWeek = [t('day_mon'), t('day_tue'), t('day_wed'), t('day_thu'), t('day_fri'), t('day_sat'), t('day_sun')];
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

    // Map holidays for the current year
    const holidaysMap = useMemo(() => {
        const map: Record<string, Holiday> = {};
        holidays.forEach((holiday) => {
            const dateKey = dayjs(holiday.date).format('YYYY-MM-DD');
            map[dateKey] = holiday;
        });
        return map;
    }, [holidays]);

    const handlePrevMonth = () => {
        setCurrentDate(currentDate.subtract(1, 'month'));
        setSelectedCalendarDate(null); // Clear filter when changing month
    };
    const handleNextMonth = () => {
        setCurrentDate(currentDate.add(1, 'month'));
        setSelectedCalendarDate(null); // Clear filter when changing month
    };

    const handleYearClick = (event: React.MouseEvent<HTMLElement>) => {
        setYearAnchorEl(event.currentTarget);
    };

    const handleYearClose = () => {
        setYearAnchorEl(null);
    };

    const handleYearSelect = (year: number) => {
        setCurrentDate(currentDate.year(year));
        setSelectedCalendarDate(null); // Clear filter when changing year
        setYearAnchorEl(null);
    };

    // Handle click on calendar date to filter leaves
    const handleCalendarDateClick = (dateKey: string, hasLeave: boolean) => {
        if (hasLeave) {
            // Toggle: if same date clicked, clear filter; otherwise set filter
            if (selectedCalendarDate === dateKey) {
                setSelectedCalendarDate(null);
            } else {
                setSelectedCalendarDate(dateKey);
            }
        }
    };

    const handleSelectLeaveType = (code: string) => {
        router.push(`/leave/${code}`);
    };

    const getLeaveConfig = (code: string) => leaveTypeConfig[code] || leaveTypeConfig.default;

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'approved':
                return { label: t('status_approved', 'อนุมัติแล้ว'), color: 'success' as const, icon: CheckCircle, bgColor: '#ECFDF5', textColor: '#059669' };
            case 'rejected':
                return { label: t('status_rejected', 'ไม่อนุมัติ'), color: 'error' as const, icon: XCircle, bgColor: '#FEF2F2', textColor: '#DC2626' };
            case 'cancelled':
                return { label: t('status_cancelled', 'ยกเลิกแล้ว'), color: 'warning' as const, icon: Ban, bgColor: '#FFF7ED', textColor: '#EA580C' };
            default:
                return { label: t('status_pending', 'รออนุมัติ'), color: 'warning' as const, icon: Clock, bgColor: '#FFFBEB', textColor: '#D97706' };
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
            alert(t('cancel_reason_required'));
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
                const error = await res.json().catch(() => ({ error: t('cancel_failed') }));
                alert(error.error || t('cancel_failed'));
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
            alert(t('cancel_error'));
        } finally {
            setCancelling(false);
        }
    };

    // Helper functions for LeaveTimeline
    const formatDate = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

        if (start.getTime() === end.getTime()) {
            return start.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', options);
        }
        return `${start.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', options)}`;
    };

    const mapStatus = (status: string): 'Approved' | 'Pending' | 'Rejected' | 'Cancelled' => {
        const statusLower = status.toLowerCase();
        switch (statusLower) {
            case 'approved': return 'Approved';
            case 'rejected': return 'Rejected';
            case 'cancelled': return 'Cancelled';
            default: return 'Pending';
        }
    };

    const getApprovalStatusText = (leave: LeaveRequest) => {
        const status = leave.status.toLowerCase();
        if (status === 'approved') return t('status_approved', 'อนุมัติแล้ว');
        if (status === 'rejected') return t('status_rejected', 'ถูกปฏิเสธ');
        if (status === 'cancelled') return t('status_cancelled', 'ยกเลิกแล้ว');

        if (leave.approvals && leave.approvals.length > 0) {
            const pendingApproval = leave.approvals.find(a => a.status === 'pending');
            if (pendingApproval) {
                return `${t('status_waiting_for', 'รอการอนุมัติจาก')} ${pendingApproval.approver?.firstName || t('supervisor', 'หัวหน้างาน')}`;
            }
        }

        return t('status_pending', 'รอการอนุมัติ');
    };

    // Get unique leave types from myLeaves for tabs
    const availableLeaveTypes = useMemo(() => {
        const types = new Set<string>();
        myLeaves.forEach(leave => {
            const type = leave.leaveType || leave.leaveCode;
            if (type) types.add(type);
        });
        return Array.from(types).sort(); // Sort alphabetically or by some criteria
    }, [myLeaves]);

    // Calculate counts for each tab
    const leaveCounts = useMemo(() => {
        const counts: Record<string, number> = { all: myLeaves.length };
        myLeaves.forEach(leave => {
            const type = leave.leaveType || leave.leaveCode || 'default';
            counts[type] = (counts[type] || 0) + 1;
        });
        return counts;
    }, [myLeaves]);

    const filteredLeaves = useMemo(() => {
        let filtered = myLeaves;

        // Filter by selected calendar date - show leaves that START on this date
        if (selectedCalendarDate) {
            filtered = filtered.filter(leave => {
                const startDate = dayjs(leave.startDate).format('YYYY-MM-DD');
                return startDate === selectedCalendarDate;
            });
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(leave => {
                const reasonMatch = leave.reason?.toLowerCase().includes(query);
                const typeMatch = leave.leaveTypeInfo?.name?.toLowerCase().includes(query) ||
                    leave.leaveType?.toLowerCase().includes(query);
                const statusMatch = getStatusLabel(leave.status).label.toLowerCase().includes(query);
                const codeMatch = (leave.leaveCode || '').toLowerCase().includes(query);
                return reasonMatch || typeMatch || statusMatch || codeMatch;
            });
        }

        // Filter by tab
        if (currentTab !== 'all') {
            filtered = filtered.filter(leave => {
                const leaveType = leave.leaveType || leave.leaveCode || 'default';
                return leaveType === currentTab;
            });
        }

        return filtered;
    }, [myLeaves, searchQuery, selectedCalendarDate, currentTab]);

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
                            {t('leave_history_title', 'ประวัติการลา')}
                        </Typography>
                    </Box>
                    <Tooltip title={t('holiday_title', 'วันหยุดประจำปี')}>
                        <IconButton
                            onClick={() => setHolidayDrawerOpen(true)}
                            sx={{
                                color: 'white',
                                bgcolor: 'rgba(255,255,255,0.15)',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                            }}
                        >
                            <Calendar size={22} />
                        </IconButton>
                    </Tooltip>
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
                                {currentDate.locale(locale).format('MMMM')}
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
                                {locale === 'th' ? currentDate.year() + 543 : currentDate.year()}
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
                                        {locale === 'th' ? year + 543 : year}
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
                            const holiday = holidaysMap[dateKey];
                            const isHoliday = !!holiday;
                            const isSelected = selectedCalendarDate === dateKey;

                            // Get leave colors for this day
                            const leaveColors = leavesOnDay.map((l) => getLeaveConfig(l.leaveType || l.leaveCode || 'default').color);
                            const primaryColor = hasLeave ? leaveColors[0] : isHoliday ? '#DC2626' : null;

                            return (
                                <Tooltip
                                    key={dateKey}
                                    title={isHoliday ? holiday.name : hasLeave ? t('click_to_filter', 'คลิกเพื่อดูใบลา') : ''}
                                    arrow
                                    placement="top"
                                    disableHoverListener={!isHoliday && !hasLeave}
                                >
                                    <Box
                                        onClick={() => handleCalendarDateClick(dateKey, hasLeave)}
                                        sx={{
                                            aspectRatio: '1',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: 2.5,
                                            position: 'relative',
                                            bgcolor: isSelected
                                                ? primaryColor
                                                : isToday
                                                    ? '#667eea'
                                                    : hasLeave
                                                        ? 'white'
                                                        : 'transparent',
                                            border: isSelected
                                                ? `2px solid ${primaryColor}`
                                                : hasLeave && !isToday
                                                    ? `2px solid ${primaryColor}`
                                                    : 'none',
                                            cursor: hasLeave ? 'pointer' : 'default',
                                            transition: 'all 0.15s ease',
                                            boxShadow: isSelected ? `0 4px 12px ${primaryColor}60` : 'none',
                                            '&:hover': hasLeave || isToday || isHoliday
                                                ? { transform: 'scale(1.08)', boxShadow: `0 4px 12px ${hasLeave ? `${primaryColor}40` : isHoliday ? 'rgba(220,38,38,0.2)' : 'rgba(102,126,234,0.3)'}` }
                                                : {},
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontWeight: isToday || hasLeave || isSelected ? 600 : 400,
                                                color: isSelected ? 'white' : isToday ? 'white' : hasLeave ? primaryColor : '#475569',
                                                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                                            }}
                                        >
                                            {day.date()}
                                        </Typography>
                                        {/* Holiday indicator */}
                                        {isHoliday && !hasLeave && !isToday && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: 2,
                                                    width: 4,
                                                    height: 4,
                                                    borderRadius: '50%',
                                                    bgcolor: '#DC2626',
                                                }}
                                            />
                                        )}
                                        {/* Badge for multiple leaves */}
                                        {leavesOnDay.length > 1 && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: -8,
                                                    right: 0,
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: '50%',
                                                    bgcolor: '#FF6B6B',
                                                    color: 'white',
                                                    fontSize: '0.6rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 600,
                                                    border: '2px solid white',
                                                }}
                                            >
                                                +{leavesOnDay.length - 1}
                                            </Box>
                                        )}
                                    </Box>
                                </Tooltip>
                            );
                        })}
                    </Box>

                    {/* Legend - Color meanings */}
                    <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #F1F5F9' }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                mb: showAllLegends ? 1 : 0
                            }}
                            onClick={() => setShowAllLegends(!showAllLegends)}
                        >
                            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 500 }}>
                                {t('leave_legend', 'คำอธิบายสี')}
                            </Typography>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                color: '#94A3B8',
                                transition: 'transform 0.2s',
                                transform: showAllLegends ? 'rotate(180deg)' : 'rotate(0deg)'
                            }}>
                                <ChevronDown size={16} />
                            </Box>
                        </Box>

                        {/* First row - always visible */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#667eea' }} />
                                <Typography variant="caption" sx={{ color: '#64748B' }}>{t('leave_today', 'วันนี้')}</Typography>
                            </Box>
                            {Object.entries(leaveTypeConfig)
                                .filter(([key]) => key !== 'default')
                                .slice(0, 3)
                                .map(([key, config]) => (
                                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'white', border: `2px solid ${config.color}` }} />
                                        <Typography variant="caption" sx={{ color: '#64748B' }}>{t(`leave_${key}`, config.label)}</Typography>
                                    </Box>
                                ))}
                            {!showAllLegends && (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: '#667eea',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                        '&:hover': { textDecoration: 'underline' }
                                    }}
                                    onClick={() => setShowAllLegends(true)}
                                >
                                    +{Object.entries(leaveTypeConfig).filter(([key]) => key !== 'default').length - 3} {t('more', 'เพิ่มเติม')}
                                </Typography>
                            )}
                        </Box>

                        {/* Remaining legends - collapsible */}
                        {showAllLegends && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
                                {Object.entries(leaveTypeConfig)
                                    .filter(([key]) => key !== 'default')
                                    .slice(3)
                                    .map(([key, config]) => (
                                        <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'white', border: `2px solid ${config.color}` }} />
                                            <Typography variant="caption" sx={{ color: '#64748B' }}>{t(`leave_${key}`, config.label)}</Typography>
                                        </Box>
                                    ))}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#DC2626' }} />
                                    <Typography variant="caption" sx={{ color: '#64748B' }}>{t('leave_holiday', 'วันหยุด')}</Typography>
                                </Box>
                            </Box>
                        )}
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
                            {t('leave_history_title', 'ประวัติการลา')} ({currentDate.format('MMMM')} {locale === 'th' ? currentDate.year() + 543 : currentDate.year()})
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
                            {filteredLeaves.length} {t('leave_items', 'รายการ')}
                        </Box>
                    </Box>

                    {/* Date Filter Chip - Show when a calendar date is selected */}
                    {selectedCalendarDate && (
                        <Chip
                            icon={<CalendarDays size={16} />}
                            label={`${t('filter_date', 'กรองวันที่')}: ${dayjs(selectedCalendarDate).locale(locale).format('D MMMM')} ${locale === 'th' ? dayjs(selectedCalendarDate).year() + 543 : dayjs(selectedCalendarDate).year()}`}
                            onDelete={() => setSelectedCalendarDate(null)}
                            deleteIcon={<X size={16} />}
                            sx={{
                                mb: 2,
                                bgcolor: '#667eea',
                                color: 'white',
                                fontWeight: 500,
                                '& .MuiChip-icon': { color: 'white' },
                                '& .MuiChip-deleteIcon': {
                                    color: 'white',
                                    '&:hover': { color: 'rgba(255,255,255,0.7)' }
                                },
                            }}
                        />
                    )}

                    {/* Tabs for Leave Types - Minimal Design with Underline */}
                    <Box sx={{
                        mb: 3,
                        mx: { xs: -2, sm: 0 },
                        width: { xs: 'calc(100% + 32px)', sm: '100%' },
                        bgcolor: 'white',
                        borderRadius: { xs: 0, sm: 2 },
                        boxShadow: { xs: 'none', sm: '0 1px 3px rgba(0,0,0,0.05)' },
                        border: '1px solid #E2E8F0',
                        borderLeft: { xs: 'none', sm: '1px solid #E2E8F0' },
                        borderRight: { xs: 'none', sm: '1px solid #E2E8F0' },
                    }}>
                        <Tabs
                            value={currentTab}
                            onChange={(_, newValue) => setCurrentTab(newValue)}
                            variant="scrollable"
                            scrollButtons={false}
                            sx={{
                                minHeight: 48,
                                '& .MuiTabs-indicator': {
                                    height: 3,
                                    borderRadius: '3px 3px 0 0',
                                    bgcolor: currentTab === 'all'
                                        ? '#667eea'
                                        : (leaveTypeConfig[currentTab]?.color || '#667eea'),
                                    // NOTE: overriding `transition` replaces MUI's default left/width animations.
                                    // Keep the underline movement smooth when switching tabs.
                                    transition: 'left 0.25s ease, width 0.25s ease, background-color 0.3s ease',
                                },
                                '& .MuiTabs-scroller': {
                                    scrollBehavior: 'smooth',
                                    '&::-webkit-scrollbar': {
                                        display: 'none',
                                    },
                                    msOverflowStyle: 'none',
                                    scrollbarWidth: 'none',
                                },
                                '& .MuiTabs-flexContainer': {
                                    gap: { xs: 2.5, sm: 3.5 },
                                    px: { xs: 2.5, sm: 3 },
                                    // Add space after last tab
                                    '&::after': {
                                        content: '""',
                                        minWidth: { xs: 2, sm: 2 },
                                        flexShrink: 0,
                                    },
                                },
                            }}
                        >
                            <Tab
                                value="all"
                                disableRipple
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <span>{t('all', 'ทั้งหมด')}</span>
                                        <Box
                                            component="span"
                                            sx={{
                                                bgcolor: currentTab === 'all' ? '#667eea' : '#E2E8F0',
                                                color: currentTab === 'all' ? 'white' : '#64748B',
                                                px: 0.75,
                                                py: 0.25,
                                                borderRadius: 1,
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                minWidth: 20,
                                                textAlign: 'center',
                                            }}
                                        >
                                            {leaveCounts['all'] || 0}
                                        </Box>
                                    </Box>
                                }
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: currentTab === 'all' ? 600 : 500,
                                    fontSize: { xs: '0.875rem', sm: '0.95rem' },
                                    color: currentTab === 'all' ? '#1E293B' : '#64748B',
                                    minHeight: 44,
                                    px: 0,
                                    minWidth: 'auto',
                                    '&:hover': {
                                        color: '#1E293B',
                                        bgcolor: 'transparent',
                                    },
                                    '&.Mui-selected': {
                                        color: '#1E293B',
                                    },
                                }}
                            />
                            {availableLeaveTypes.map((type) => {
                                const config = leaveTypeConfig[type] || leaveTypeConfig.default;
                                const leaveSample = myLeaves.find(l => (l.leaveType || l.leaveCode) === type);
                                const label = t(`leave_${type}`, leaveSample?.leaveTypeInfo?.name || config.label);
                                const count = leaveCounts[type] || 0;
                                const isSelected = currentTab === type;

                                return (
                                    <Tab
                                        key={type}
                                        value={type}
                                        disableRipple
                                        label={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                <span>{label}</span>
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        bgcolor: isSelected ? config.color : '#E2E8F0',
                                                        color: isSelected ? 'white' : '#64748B',
                                                        px: 0.75,
                                                        py: 0.25,
                                                        borderRadius: 1,
                                                        fontSize: '0.7rem',
                                                        fontWeight: 600,
                                                        minWidth: 20,
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    {count}
                                                </Box>
                                            </Box>
                                        }
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: isSelected ? 600 : 500,
                                            fontSize: { xs: '0.875rem', sm: '0.95rem' },
                                            color: isSelected ? '#1E293B' : '#64748B',
                                            minHeight: 44,
                                            px: 0,
                                            minWidth: 'auto',
                                            '&:hover': {
                                                color: '#1E293B',
                                                bgcolor: 'transparent',
                                            },
                                            '&.Mui-selected': {
                                                color: '#1E293B',
                                            },
                                        }}
                                    />
                                );
                            })}
                        </Tabs>
                    </Box>

                    {/* Search Box */}
                    <TextField
                        fullWidth
                        size="small"
                        placeholder={t('leave_search_placeholder', 'ค้นหาใบลา...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <Box sx={{ display: 'flex', alignItems: 'center', pl: 1, pr: 0.5 }}>
                                    <Search size={18} color="#94A3B8" />
                                </Box>
                            ),
                            endAdornment: searchQuery ? (
                                <IconButton
                                    size="small"
                                    onClick={() => setSearchQuery('')}
                                    sx={{ mr: 0.5, p: 0.5 }}
                                >
                                    <X size={16} color="#94A3B8" />
                                </IconButton>
                            ) : null,
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
                                {searchQuery ? t('leave_not_found', 'ไม่พบใบลาที่ตรงกับการค้นหา') : t('leave_no_history', 'ยังไม่มีประวัติการลาในเดือนนี้')}
                            </Typography>
                        </Card>
                    ) : (
                        <LeaveTimeline
                            items={recentLeaves.map((leave) => {
                                const config = getLeaveConfig(leave.leaveType || leave.leaveCode || 'default');
                                const IconComponent = config.icon;
                                const totalLevels = leave.approvals?.length || 0;
                                const approvedCount = leave.approvals?.filter(a => a.status === 'approved').length || 0;

                                // หา approver ที่กำลังรออนุมัติ
                                const pendingApproval = leave.approvals?.find(a => a.status === 'pending');
                                const waitingForApprover = pendingApproval?.approver?.firstName || undefined;

                                return {
                                    id: leave.id,
                                    leaveCode: leave.leaveCode || undefined,
                                    title: t(`leave_${leave.leaveType || leave.leaveCode}`, leave.leaveTypeInfo?.name || config.label),
                                    date: formatDate(leave.startDate, leave.endDate),
                                    startDate: leave.startDate,
                                    endDate: leave.endDate,
                                    totalDays: leave.totalDays || 1,
                                    reason: leave.reason || undefined,
                                    createdAt: leave.createdAt || undefined,
                                    status: mapStatus(leave.status),
                                    icon: <IconComponent size={22} color={config.color} />,
                                    iconColor: config.color,
                                    approvalStatus: getApprovalStatusText(leave),
                                    waitingForApprover: waitingForApprover,
                                    currentLevel: approvedCount,
                                    totalLevels: totalLevels,
                                    onClick: () => handleOpenDetail(leave),
                                };
                            })}
                        />

                    )
                    }
                </Box >
            </Box >

            <BottomNav activePage="leave" />

            {/* Leave Detail Drawer */}
            <LeaveDetailDrawer
                open={drawerOpen && !cancelDialogOpen}
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
                sx={{ zIndex: 1400 }}
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
                            {t('cancel_leave_title', 'ยืนยันการยกเลิกใบลา')}
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: '#64748B', fontSize: '0.95rem', mb: 2 }}>
                        {t('cancel_leave_desc', 'กรุณาระบุเหตุผลที่ต้องการยกเลิกใบลา')}
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder={t('cancel_leave_placeholder', 'ระบุเหตุผล...')}
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
                        {t('cancel', 'ยกเลิก')}
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
                            t('cancel_leave_confirm', 'ยืนยันยกเลิก')
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Holiday Drawer */}
            <HolidayDrawer
                open={holidayDrawerOpen}
                onClose={() => setHolidayDrawerOpen(false)}
                initialYear={currentDate.year()}
            />
        </Box >
    );
}
