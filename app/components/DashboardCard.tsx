'use client';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Paper, IconButton, Select, MenuItem, Divider, Chip, Tooltip as MuiTooltip, ClickAwayListener } from '@mui/material';
import { Drawer } from 'vaul';
import { Health, Briefcase, Sun1, ArrowRight, DocumentText, Calendar, Clock, Archive, Building4, Lovely, Car, MessageQuestion, Shield, Heart, People, Profile2User, CloseCircle, TickCircle, Timer, Forbidden2, MoneySend } from 'iconsax-react';
import { useLocale } from '../providers/LocaleProvider';
import { HelpCircle, X } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import LeaveDetailDrawer from './LeaveDetailDrawer';
import { LeaveRequest } from '@/types/leave';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface LeaveType {
    id: number;
    code: string;
    name: string;
    description: string | null;
    maxDaysPerYear: number | null;
    isPaid: boolean;
    isActive: boolean;
}

interface DashboardCardProps {
    leaveTypes: LeaveType[];
    leaveRequests: LeaveRequest[];
    year: number;
    onYearChange: (year: number) => void;
}

// Config for icons and colors (copied from page.tsx or shared)
const leaveTypeConfig: Record<string, { icon: any; color: string }> = {
    sick: { icon: Health, color: '#5E72E4' },
    personal: { icon: Briefcase, color: '#8965E0' },
    vacation: { icon: Sun1, color: '#11CDEF' },
    annual: { icon: Sun1, color: '#2DCECC' },
    maternity: { icon: Lovely, color: '#F5365C' },
    ordination: { icon: Building4, color: '#FB6340' },
    work_outside: { icon: Car, color: '#2DCECC' },
    absent: { icon: MessageQuestion, color: '#F5365C' },
    military: { icon: Shield, color: '#5E72E4' },
    marriage: { icon: Heart, color: '#F3A4B5' },
    funeral: { icon: People, color: '#8898AA' },
    paternity: { icon: Profile2User, color: '#11CDEF' },
    sterilization: { icon: Health, color: '#2DCECC' },
    business: { icon: Car, color: '#8965E0' },
    unpaid: { icon: MoneySend, color: '#8898AA' },
    other: { icon: HelpCircle, color: '#5E72E4' },
    default: { icon: MessageQuestion, color: '#8898AA' },
};

const DashboardCard: React.FC<DashboardCardProps> = ({ leaveTypes, leaveRequests, year, onYearChange }) => {
    const { t, locale } = useLocale();
    const [selectedCode, setSelectedCode] = useState<string>('');
    const [drilldownOpen, setDrilldownOpen] = useState(false);
    const [drilldownStatus, setDrilldownStatus] = useState<'approved' | 'pending' | 'rejected' | 'cancelled' | null>(null);

    // State for LeaveDetailDrawer
    const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

    // State for chart tooltip
    const [activeTooltip, setActiveTooltip] = useState<'approved' | 'pending' | 'remaining' | null>(null);

    // Generate year options (current year - 2 to current year + 1)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 4 }, (_, i) => currentYear - 2 + i);

    // Set default selected code when leaveTypes are loaded
    useEffect(() => {
        if (leaveTypes.length > 0 && !selectedCode) {
            // Prefer sick, then vacation, then first available
            if (leaveTypes.find(l => l.code === 'sick')) setSelectedCode('sick');
            else if (leaveTypes.find(l => l.code === 'vacation')) setSelectedCode('vacation');
            else setSelectedCode(leaveTypes[0].code);
        }
    }, [leaveTypes, selectedCode]);

    // Calculate balances for all leave types
    const balances = useMemo(() => {
        const result: Record<string, { total: number; used: number; approved: number; pending: number; rejected: number; cancelled: number; remaining: number; name: string; isPaid: boolean }> = {};

        leaveTypes.forEach(type => {
            const maxDays = type.maxDaysPerYear || 0; // If null (unlimited), treat as 0 or handle specifically

            // Calculate used days for this type in selected year
            // Use leaveType field (which contains the leave type code like 'personal', 'sick', etc.)
            const requests = leaveRequests.filter(req => req.leaveType === type.code);

            const approved = requests
                .filter(req => req.status === 'approved')
                .reduce((sum, req) => sum + req.totalDays, 0);

            // Include both 'pending' and 'in_progress' as pending status
            const pending = requests
                .filter(req => ['pending', 'in_progress'].includes(req.status))
                .reduce((sum, req) => sum + req.totalDays, 0);

            // Rejected leaves
            const rejected = requests
                .filter(req => req.status === 'rejected')
                .reduce((sum, req) => sum + req.totalDays, 0);

            // Cancelled leaves
            const cancelled = requests
                .filter(req => req.status === 'cancelled')
                .reduce((sum, req) => sum + req.totalDays, 0);

            // Only approved and pending count towards used days
            const totalUsed = approved + pending;

            result[type.code] = {
                total: maxDays,
                used: totalUsed,
                approved: approved,
                pending: pending,
                rejected: rejected,
                cancelled: cancelled,
                remaining: maxDays - totalUsed,
                name: type.name,
                isPaid: type.isPaid
            };
        });
        return result;
    }, [leaveTypes, leaveRequests, year]);

    // Get filtered requests for drilldown
    const drilldownRequests = useMemo(() => {
        if (!drilldownStatus || !selectedCode) return [];

        return leaveRequests.filter(req => {
            const matchType = req.leaveType === selectedCode;
            let matchStatus = false;

            if (drilldownStatus === 'pending') {
                matchStatus = ['pending', 'in_progress'].includes(req.status);
            } else {
                matchStatus = req.status === drilldownStatus;
            }

            return matchType && matchStatus;
        });
    }, [leaveRequests, selectedCode, drilldownStatus]);

    // Format date for display
    const formatDate = (startDate: string, endDate: string) => {
        dayjs.locale(locale === 'th' ? 'th' : locale === 'my' ? 'my' : 'en');
        const start = dayjs(startDate);
        const end = dayjs(endDate);

        if (start.isSame(end, 'day')) {
            return start.format('D MMM YYYY');
        }
        return `${start.format('D MMM')} - ${end.format('D MMM YYYY')}`;
    };

    // Handle drilldown click
    const handleDrilldownClick = (status: 'approved' | 'pending' | 'rejected' | 'cancelled') => {
        setDrilldownStatus(status);
        setDrilldownOpen(true);
    };

    // Handle leave item click to open detail drawer
    const handleLeaveItemClick = (leave: LeaveRequest) => {
        setSelectedLeave(leave);
        setDetailDrawerOpen(true);
    };

    // Get status config
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'approved':
                return { label: t('status_approved', 'อนุมัติแล้ว'), color: '#4CAF50', bgColor: '#E8F5E9', icon: TickCircle };
            case 'pending':
            case 'in_progress':
                return { label: t('status_pending', 'รออนุมัติ'), color: '#FFC107', bgColor: '#FFF8E1', icon: Timer };
            case 'rejected':
                return { label: t('status_rejected', 'ไม่อนุมัติ'), color: '#FF8FA3', bgColor: '#FCE4EC', icon: Forbidden2 };
            case 'cancelled':
                return { label: t('status_cancelled', 'ยกเลิก'), color: '#9E9E9E', bgColor: '#F5F5F5', icon: CloseCircle };
            default:
                return { label: status, color: '#9E9E9E', bgColor: '#F5F5F5', icon: Clock };
        }
    };

    const currentBalance = balances[selectedCode] || { total: 0, used: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0, remaining: 0, name: '', isPaid: true };
    const isUnlimited = currentBalance.total === 0;

    // Calculate percentage for graph
    let approvedPercentage = 0;
    let pendingPercentage = 0;
    let isOverLimit = false;

    if (!isUnlimited) {
        if (currentBalance.remaining < 0) {
            approvedPercentage = 100;
            isOverLimit = true;
        } else {
            approvedPercentage = (currentBalance.approved / currentBalance.total) * 100;
            pendingPercentage = (currentBalance.pending / currentBalance.total) * 100;
        }
    } else {
        approvedPercentage = 0;
    }

    // Color logic - Multi-ring colors like the reference image
    const config = leaveTypeConfig[selectedCode] || leaveTypeConfig.default;
    const ringColors = {
        approved: '#2ECC71',    // Green (outer ring)
        pending: '#F39C12',     // Orange (middle ring)  
        remaining: '#5DADE2',   // Blue (inner ring)
        background: 'rgba(255, 255, 255, 0.15)', // Semi-transparent for unused portion
    };

    // Calculate percentages for multi-ring display
    const calculatePercentage = useMemo(() => {
        if (isUnlimited) {
            // For unlimited leave types, remaining is always 100% (unlimited availability)
            const totalUsed = currentBalance.approved + currentBalance.pending;
            if (totalUsed === 0) {
                // No usage at all - remaining is still 100% (unlimited)
                return { approved: 0, pending: 0, remaining: 100, total: 0 };
            }
            // Show actual usage, remaining always 100% for unlimited
            return {
                approved: currentBalance.approved,
                pending: currentBalance.pending,
                remaining: 100, // Unlimited = always 100% remaining
                total: totalUsed
            };
        }
        if (currentBalance.total === 0) {
            return { approved: 0, pending: 0, remaining: 0, total: 0 };
        }
        const approvedPct = (currentBalance.approved / currentBalance.total) * 100;
        const pendingPct = (currentBalance.pending / currentBalance.total) * 100;
        const remainingPct = Math.max((currentBalance.remaining / currentBalance.total) * 100, 0);
        // Total percentage shows usage rate
        const totalUsagePct = Math.min(Math.round(((currentBalance.approved + currentBalance.pending) / currentBalance.total) * 100), 100);
        return { approved: approvedPct, pending: pendingPct, remaining: remainingPct, total: totalUsagePct };
    }, [currentBalance, isUnlimited]);

    // Chart.js Doughnut data - Multi-ring style
    const chartData = useMemo(() => {
        if (isOverLimit) {
            // Over limit - show all rings as full in warning colors
            return {
                datasets: [
                    {
                        data: [100],
                        backgroundColor: ['#E74C3C'],
                        borderWidth: 0,
                        cutout: '82%',
                        borderRadius: 20,
                    },
                    {
                        data: [100],
                        backgroundColor: ['#E74C3C'],
                        borderWidth: 0,
                        cutout: '82%',
                        borderRadius: 20,
                    },
                    {
                        data: [100],
                        backgroundColor: ['#E74C3C'],
                        borderWidth: 0,
                        cutout: '82%',
                        borderRadius: 20,
                    }
                ]
            };
        }

        // Multi-ring chart: each status gets its own ring
        const approved = calculatePercentage.approved;
        const pending = calculatePercentage.pending;
        const remaining = calculatePercentage.remaining;

        return {
            datasets: [
                // Outer ring - Approved (Green)
                {
                    data: [approved, 100 - approved],
                    backgroundColor: [ringColors.approved, ringColors.background],
                    borderWidth: 0,
                    cutout: '78%',
                    borderRadius: 20,
                    rotation: -90,
                },
                // Middle ring - Pending (Orange)
                {
                    data: [pending, 100 - pending],
                    backgroundColor: [ringColors.pending, ringColors.background],
                    borderWidth: 0,
                    cutout: '78%',
                    borderRadius: 20,
                    rotation: -90,
                },
                // Inner ring - Remaining (Blue)
                {
                    data: [remaining, 100 - remaining],
                    backgroundColor: [ringColors.remaining, ringColors.background],
                    borderWidth: 0,
                    cutout: '78%',
                    borderRadius: 20,
                    rotation: -90,
                },
            ]
        };
    }, [currentBalance, isUnlimited, isOverLimit, calculatePercentage]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                enabled: false,
            },
        },
        animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1000,
            easing: 'easeOutQuart' as const,
        },
        spacing: 4,
    }), []);

    return (
        <Box sx={{ mb: { xs: 0, sm: 3 }, maxWidth: 1200, mx: 'auto' }}>
            <Paper
                elevation={0}
                sx={{
                    background: 'linear-gradient(135deg, #6C63FF 0%, #5A52E0 100%)',
                    borderRadius: { xs: 0, sm: 1 },
                    p: { xs: 2.5, sm: 3 },
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: { xs: 'none', sm: '0 10px 30px rgba(108, 99, 255, 0.25)' },
                }}
            >
                {/* Decorative Circles */}
                <Box sx={{
                    position: 'absolute',
                    top: -25,
                    right: -25,
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    pointerEvents: 'none',
                }} />
                <Box sx={{
                    position: 'absolute',
                    bottom: -45,
                    left: -45,
                    width: 180,
                    height: 180,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    pointerEvents: 'none',
                }} />

                {/* Header: Leave Type Name + Year Selector */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                    position: 'relative',
                    zIndex: 10
                }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.95rem', color: '#FFFFFF;' }}>
                        {t(`leave_${selectedCode}`, currentBalance.name)}
                    </Typography>
                    <Select
                        value={year}
                        onChange={(e) => onYearChange(Number(e.target.value))}
                        variant="standard"
                        disableUnderline
                        sx={{
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            '.MuiSelect-icon': { color: 'rgba(255,255,255,0.7)' },
                            '& .MuiSelect-select': { py: 0.5, pr: '24px !important' }
                        }}
                        MenuProps={{
                            PaperProps: {
                                sx: {
                                    bgcolor: 'rgba(255, 255, 255, 0.95)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: 0.5,
                                    mt: 1,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                }
                            }
                        }}
                    >
                        {years.map((y) => (
                            <MenuItem key={y} value={y} sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                {y + 543} {/* Show Buddhist Year */}
                            </MenuItem>
                        ))}
                    </Select>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                    {/* Left Side: Multi-ring Circular Progress */}
                    <Box sx={{ width: '45%', display: 'flex', justifyContent: 'center' }}>
                        <ClickAwayListener onClickAway={() => setActiveTooltip(null)}>
                            <Box sx={{ position: 'relative', width: 160, height: 160 }}>
                                {/* Multi-ring Chart using nested circles */}
                                <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                                    {/* Outer ring - Approved (Green) */}
                                    <MuiTooltip
                                        open={activeTooltip === 'approved'}
                                        title={
                                            <Box sx={{ p: 0.5 }}>
                                                <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#2ECC71' }}>
                                                    {t('dashboard_approved_title', 'อนุมัติแล้ว')}
                                                </Typography>
                                                <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)' }}>
                                                    {currentBalance.approved} {t('days', 'วัน')} ({Math.round(calculatePercentage.approved)}%)
                                                </Typography>
                                            </Box>
                                        }
                                        placement="top"
                                        arrow
                                        componentsProps={{
                                            tooltip: {
                                                sx: {
                                                    bgcolor: 'rgba(0, 0, 0, 0.85)',
                                                    color: '#fff',
                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                                                    borderRadius: 1,
                                                    '& .MuiTooltip-arrow': {
                                                        color: 'rgba(0, 0, 0, 0.85)',
                                                    },
                                                },
                                            },
                                        }}
                                    >
                                        <svg
                                            viewBox="0 0 100 100"
                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)', cursor: 'pointer' }}
                                            onClick={() => setActiveTooltip(activeTooltip === 'approved' ? null : 'approved')}
                                        >
                                            {/* Background circle */}
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
                                            {/* Progress circle */}
                                            <circle
                                                cx="50" cy="50" r="45"
                                                fill="none"
                                                stroke="#2ECC71"
                                                strokeWidth="8"
                                                strokeLinecap="round"
                                                strokeDasharray={`${calculatePercentage.approved * 2.83} 283`}
                                                style={{
                                                    transition: 'stroke-dasharray 0.8s ease-out',
                                                    filter: 'drop-shadow(0 0 8px rgba(46, 204, 113, 0.8))'
                                                }}
                                            />
                                        </svg>
                                    </MuiTooltip>
                                    {/* Middle ring - Pending (Orange) */}
                                    <MuiTooltip
                                        open={activeTooltip === 'pending'}
                                        title={
                                            <Box sx={{ p: 0.5 }}>
                                                <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#F39C12' }}>
                                                    {t('dashboard_pending_title', 'รออนุมัติ')}
                                                </Typography>
                                                <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)' }}>
                                                    {currentBalance.pending} {t('days', 'วัน')} ({Math.round(calculatePercentage.pending)}%)
                                                </Typography>
                                            </Box>
                                        }
                                        placement="top"
                                        arrow
                                        componentsProps={{
                                            tooltip: {
                                                sx: {
                                                    bgcolor: 'rgba(0, 0, 0, 0.85)',
                                                    color: '#fff',
                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                                                    borderRadius: 1,
                                                    '& .MuiTooltip-arrow': {
                                                        color: 'rgba(0, 0, 0, 0.85)',
                                                    },
                                                },
                                            },
                                        }}
                                    >
                                        <svg
                                            viewBox="0 0 100 100"
                                            style={{ position: 'absolute', top: '12%', left: '12%', width: '76%', height: '76%', transform: 'rotate(-90deg)', cursor: 'pointer' }}
                                            onClick={() => setActiveTooltip(activeTooltip === 'pending' ? null : 'pending')}
                                        >
                                            {/* Background circle */}
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
                                            {/* Progress circle */}
                                            <circle
                                                cx="50" cy="50" r="45"
                                                fill="none"
                                                stroke="#F39C12"
                                                strokeWidth="10"
                                                strokeLinecap="round"
                                                strokeDasharray={`${calculatePercentage.pending * 2.83} 283`}
                                                style={{
                                                    transition: 'stroke-dasharray 0.8s ease-out',
                                                    filter: 'drop-shadow(0 0 8px rgba(243, 156, 18, 0.8))'
                                                }}
                                            />
                                        </svg>
                                    </MuiTooltip>
                                    {/* Inner ring - Remaining (Blue) */}
                                    <MuiTooltip
                                        open={activeTooltip === 'remaining'}
                                        title={
                                            <Box sx={{ p: 0.5 }}>
                                                <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: isOverLimit ? '#E74C3C' : '#5DADE2' }}>
                                                    {isOverLimit ? t('dashboard_exceeded_title', 'เกินสิทธิ์') : t('dashboard_remaining_title', 'คงเหลือ')}
                                                </Typography>
                                                <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)' }}>
                                                    {isOverLimit ? Math.abs(currentBalance.remaining) : currentBalance.remaining} {t('days', 'วัน')} ({Math.round(calculatePercentage.remaining)}%)
                                                </Typography>
                                            </Box>
                                        }
                                        placement="top"
                                        arrow
                                        componentsProps={{
                                            tooltip: {
                                                sx: {
                                                    bgcolor: 'rgba(0, 0, 0, 0.85)',
                                                    color: '#fff',
                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                                                    borderRadius: 1,
                                                    '& .MuiTooltip-arrow': {
                                                        color: 'rgba(0, 0, 0, 0.85)',
                                                    },
                                                },
                                            },
                                        }}
                                    >
                                        <svg
                                            viewBox="0 0 100 100"
                                            style={{ position: 'absolute', top: '24%', left: '24%', width: '52%', height: '52%', transform: 'rotate(-90deg)', cursor: 'pointer' }}
                                            onClick={() => setActiveTooltip(activeTooltip === 'remaining' ? null : 'remaining')}
                                        >
                                            {/* Background circle */}
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="12" />
                                            {/* Progress circle */}
                                            <circle
                                                cx="50" cy="50" r="45"
                                                fill="none"
                                                stroke="#5DADE2"
                                                strokeWidth="12"
                                                strokeLinecap="round"
                                                strokeDasharray={`${calculatePercentage.remaining * 2.83} 283`}
                                                style={{
                                                    transition: 'stroke-dasharray 0.8s ease-out',
                                                    filter: isOverLimit
                                                        ? 'drop-shadow(0 0 8px rgba(231, 76, 60, 0.8))'
                                                        : 'drop-shadow(0 0 8px rgba(93, 173, 226, 0.8))'
                                                }}
                                            />
                                        </svg>
                                    </MuiTooltip>
                                </Box>

                                {/* Text Content Overlay - Days Remaining */}
                                <Box sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#333',
                                    zIndex: 1,
                                    pointerEvents: 'none'
                                }}>
                                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'white', mb: -0.5 }}>
                                        {isOverLimit ? t('dashboard_over_limit', 'เกินสิทธิ์') : t('dashboard_remaining', 'คงเหลือ')}
                                    </Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: isOverLimit ? '#E74C3C' : 'white', fontSize: '2.2rem' }}>
                                        {isOverLimit ? Math.abs(currentBalance.remaining) : (isUnlimited ? '∞' : currentBalance.remaining)}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>
                                        {isUnlimited ? t('dashboard_unlimited', 'ไม่จำกัด') : t('dashboard_from_total', 'จาก {{total}} วัน').replace('{{total}}', String(currentBalance.total))}
                                    </Typography>
                                </Box>
                            </Box>
                        </ClickAwayListener>
                    </Box>

                    {/* Right Side: Stats */}
                    <Box sx={{ width: '55%' }}>
                        {/* Quota Display - Polished inline style */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 0.5,
                            mb: 1,
                            py: 0.625,
                            px: 2,
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)',
                            borderRadius: 1,
                            border: '1px solid rgba(255,255,255,0.12)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                        }}>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 500, opacity: 0.9 }}>
                                {t('dashboard_quota_short', 'สิทธิ์:')}
                            </Typography>
                            <Typography sx={{
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                color: isOverLimit ? '#FF6B6B' : '#fff',
                                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                minWidth: 16,
                                textAlign: 'center'
                            }}>
                                {isUnlimited ? '∞' : Math.max(0, currentBalance.remaining)}
                            </Typography>
                            <Typography sx={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 500 }}>
                                {isUnlimited
                                    ? t('dashboard_unlimited_short', 'ไม่จำกัด')
                                    : `/ ${currentBalance.total} ${t('days_short', 'วัน')}`
                                }
                            </Typography>
                            {!isUnlimited && (
                                <Box sx={{
                                    width: '100%',
                                    height: 4,
                                    borderRadius: 2,
                                    bgcolor: 'rgba(255,255,255,0.15)',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                    
                                }}>
                                    <Box sx={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        height: '100%',
                                        width: `${Math.min(((currentBalance.approved + currentBalance.pending) / currentBalance.total) * 100, 100)}%`,
                                        background: currentBalance.remaining > 0
                                            ? 'linear-gradient(90deg, #2ECC71 0%, #27AE60 100%)'
                                            : 'linear-gradient(90deg, #E74C3C 0%, #C0392B 100%)',
                                        borderRadius: 2,
                                        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: currentBalance.remaining > 0
                                            ? '0 0 8px rgba(46, 204, 113, 0.6)'
                                            : '0 0 8px rgba(231, 76, 60, 0.6)'
                                    }} />
                                </Box>
                            )}
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {/* อนุมัติแล้ว - Green outer ring */}
                            <Box
                                onClick={() => currentBalance.approved > 0 && handleDrilldownClick('approved')}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.25,
                                    cursor: currentBalance.approved > 0 ? 'pointer' : 'default',
                                    py: 0.375,
                                    px: 0.5,
                                    mx: -0.5,
                                    borderRadius: 0.5,
                                    transition: 'background-color 0.2s',
                                    '&:hover': currentBalance.approved > 0 ? { bgcolor: 'rgba(255,255,255,0.1)' } : {}
                                }}
                            >
                                <Box sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: '#2ECC71',
                                    boxShadow: '0 0 6px rgba(46, 204, 113, 0.6)',
                                    flexShrink: 0
                                }} />
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', flex: 1 }}>
                                    {t('dashboard_approved', 'อนุมัติแล้ว {{days}} วัน').replace('{{days}}', currentBalance.approved > 0 ? String(currentBalance.approved) : '-')}
                                </Typography>
                                {currentBalance.approved > 0 && <ArrowRight size={15} color="rgba(255,255,255,0.5)" />}
                            </Box>
                            {/* รออนุมัติ - Orange middle ring */}
                            <Box
                                onClick={() => currentBalance.pending > 0 && handleDrilldownClick('pending')}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.25,
                                    cursor: currentBalance.pending > 0 ? 'pointer' : 'default',
                                    py: 0.375,
                                    px: 0.5,
                                    mx: -0.5,
                                    borderRadius: 0.5,
                                    transition: 'background-color 0.2s',
                                    '&:hover': currentBalance.pending > 0 ? { bgcolor: 'rgba(255,255,255,0.1)' } : {}
                                }}
                            >
                                <Box sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: '#F39C12',
                                    boxShadow: '0 0 6px rgba(243, 156, 18, 0.6)',
                                    flexShrink: 0
                                }} />
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', flex: 1 }}>
                                    {t('dashboard_pending', 'รออนุมัติ {{days}} วัน').replace('{{days}}', currentBalance.pending > 0 ? String(currentBalance.pending) : '-')}
                                </Typography>
                                {currentBalance.pending > 0 && <ArrowRight size={15} color="rgba(255,255,255,0.5)" />}
                            </Box>
                            {/* เหลือ / เกินสิทธิ์ - Blue inner ring */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.375, px: 0.5, mx: -0.5 }}>
                                <Box sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: isOverLimit ? '#E74C3C' : '#5DADE2',
                                    boxShadow: isOverLimit
                                        ? '0 0 6px rgba(231, 76, 60, 0.6)'
                                        : '0 0 6px rgba(93, 173, 226, 0.6)',
                                    flexShrink: 0
                                }} />
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                    {isOverLimit
                                        ? t('dashboard_exceeded', 'เกิน {{days}} วัน').replace('{{days}}', String(Math.abs(currentBalance.remaining)))
                                        : t('dashboard_left', 'เหลือ {{days}} วัน').replace('{{days}}', isUnlimited ? '-' : String(currentBalance.remaining))
                                    }
                                </Typography>
                            </Box>
                            {/* ไม่อนุมัติ */}
                            <Box
                                onClick={() => currentBalance.rejected > 0 && handleDrilldownClick('rejected')}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.25,
                                    cursor: currentBalance.rejected > 0 ? 'pointer' : 'default',
                                    py: 0.375,
                                    px: 0.5,
                                    mx: -0.5,
                                    borderRadius: 0.5,
                                    transition: 'background-color 0.2s',
                                    '&:hover': currentBalance.rejected > 0 ? { bgcolor: 'rgba(255,255,255,0.1)' } : {}
                                }}
                            >
                                <Box sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: '#E74C3C',
                                    boxShadow: '0 0 6px rgba(231, 76, 60, 0.6)',
                                    flexShrink: 0
                                }} />
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', flex: 1 }}>
                                    {t('dashboard_rejected', 'ไม่อนุมัติ {{days}} วัน').replace('{{days}}', currentBalance.rejected > 0 ? String(currentBalance.rejected) : '-')}
                                </Typography>
                                {currentBalance.rejected > 0 && <ArrowRight size={15} color="rgba(255,255,255,0.5)" />}
                            </Box>
                            {/* ยกเลิก */}
                            <Box
                                onClick={() => currentBalance.cancelled > 0 && handleDrilldownClick('cancelled')}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.25,
                                    cursor: currentBalance.cancelled > 0 ? 'pointer' : 'default',
                                    py: 0.375,
                                    px: 0.5,
                                    mx: -0.5,
                                    borderRadius: 0.5,
                                    transition: 'background-color 0.2s',
                                    '&:hover': currentBalance.cancelled > 0 ? { bgcolor: 'rgba(255,255,255,0.1)' } : {}
                                }}
                            >
                                <Box sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: '#9B59B6',
                                    boxShadow: '0 0 6px rgba(155, 89, 182, 0.6)',
                                    flexShrink: 0
                                }} />
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', flex: 1 }}>
                                    {t('dashboard_cancelled', 'ยกเลิก {{days}} วัน').replace('{{days}}', currentBalance.cancelled > 0 ? String(currentBalance.cancelled) : '-')}
                                </Typography>
                                {currentBalance.cancelled > 0 && <ArrowRight size={15} color="rgba(255,255,255,0.5)" />}
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {/* Bottom: Quick Actions (Leave Types) */}
                <Box sx={{ mt: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            {t('dashboard_leave_types', 'ประเภทการลา')}
                        </Typography>
                    </Box>

                    <Box sx={{
                        display: 'flex',
                        gap: 2,
                        overflowX: 'auto',
                        pb: 0.5,
                        '::-webkit-scrollbar': { display: 'none' },
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                    }}>
                        {leaveTypes.map((type) => {
                            const typeConfig = leaveTypeConfig[type.code] || leaveTypeConfig.default;
                            const Icon = typeConfig.icon;
                            const isSelected = selectedCode === type.code;

                            return (
                                <Box
                                    key={type.id}
                                    onClick={() => setSelectedCode(type.code)}
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 0.75,
                                        cursor: 'pointer',
                                        minWidth: 56,
                                        opacity: isSelected ? 1 : 0.7,
                                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                        touchAction: 'manipulation',
                                        WebkitTapHighlightColor: 'transparent',
                                        '@media (hover: hover)': {
                                            transition: 'all 0.2s',
                                        },
                                    }}
                                >
                                    <Box sx={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: '11px',
                                        bgcolor: isSelected ? 'white' : 'rgba(255, 255, 255, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backdropFilter: 'blur(5px)',
                                    }}>
                                        <Icon
                                            size={20}
                                            color={isSelected ? '#6C63FF' : 'white'}
                                            variant="Bold"
                                        />
                                    </Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontSize: '0.7rem',
                                            textAlign: 'center',
                                            whiteSpace: 'nowrap',
                                            maxWidth: 56,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}
                                    >
                                        {t(`leave_${type.code}`, type.name)}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            </Paper>

            {/* Drilldown Drawer */}
            <Drawer.Root
                open={drilldownOpen && !isImageViewerOpen}
                onOpenChange={(isOpen) => {
                    if (!isOpen && !isImageViewerOpen) {
                        setDrilldownOpen(false);
                    }
                }}
                shouldScaleBackground={false}
                preventScrollRestoration={true}
            >
                <Drawer.Portal>
                    <Drawer.Overlay
                        className="vaul-overlay"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)',
                            zIndex: 1300,
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                        }}
                    />
                    <Drawer.Content
                        className="vaul-content"
                        style={{
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: '#FAFBFC',
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            maxHeight: '85vh',
                            zIndex: 1300,
                            display: 'flex',
                            flexDirection: 'column',
                            outline: 'none',
                            boxShadow: '0 -10px 50px rgba(0,0,0,0.15)',
                        }}
                    >
                        {/* Hidden Title for accessibility */}
                        <Drawer.Title style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
                            {drilldownStatus ? getStatusConfig(drilldownStatus).label : t('leave_details', 'รายละเอียดการลา')}
                        </Drawer.Title>
                        <Drawer.Description style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
                            {t(`leave_${selectedCode}`, currentBalance.name)}
                        </Drawer.Description>
                        <Box sx={{ width: '100%', bgcolor: '#FAFBFC', display: 'flex', flexDirection: 'column', maxHeight: '85vh', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
                            {drilldownStatus && (() => {
                                const statusConfig = getStatusConfig(drilldownStatus);
                                const StatusIcon = statusConfig.icon;
                                const typeConfig = leaveTypeConfig[selectedCode] || leaveTypeConfig.default;
                                const TypeIcon = typeConfig.icon;
                                const gradientColor = statusConfig.color;

                                return (
                                    <>
                                        {/* Drag Handle - Premium glass style */}
                                        <Box sx={{
                                            pt: 1.5,
                                            pb: 1,
                                            display: 'flex',
                                            justifyContent: 'center',
                                            background: `linear-gradient(135deg, ${gradientColor} 0%, ${gradientColor}DD 100%)`,
                                        }}>
                                            <Drawer.Handle
                                                style={{
                                                    width: 48,
                                                    height: 5,
                                                    borderRadius: 3,
                                                    backgroundColor: 'rgba(255,255,255,0.5)',
                                                }}
                                            />
                                        </Box>

                                        {/* Header with Gradient */}
                                        <Box
                                            sx={{
                                                background: `linear-gradient(135deg, ${gradientColor} 0%, ${gradientColor}DD 100%)`,
                                                px: 2.5,
                                                pt: 1,
                                                pb: 3,
                                                position: 'relative',
                                                overflow: 'hidden',
                                                '&::before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    top: -30,
                                                    right: -30,
                                                    width: 100,
                                                    height: 100,
                                                    borderRadius: '50%',
                                                    background: 'rgba(255,255,255,0.1)',
                                                },
                                                '&::after': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    bottom: -20,
                                                    left: -20,
                                                    width: 80,
                                                    height: 80,
                                                    borderRadius: '50%',
                                                    background: 'rgba(255,255,255,0.08)',
                                                },
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Box
                                                        sx={{
                                                            width: 52,
                                                            height: 52,
                                                            borderRadius: 2,
                                                            bgcolor: 'rgba(255,255,255,0.2)',
                                                            backdropFilter: 'blur(10px)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                                        }}
                                                    >
                                                        <StatusIcon size={26} color="white" variant="Bold" />
                                                    </Box>
                                                    <Box>
                                                        <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', color: 'white', mb: 0.5, textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                                            {statusConfig.label}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Chip
                                                                icon={<TypeIcon size={12} color={typeConfig.color} />}
                                                                label={t(`leave_${selectedCode}`, currentBalance.name)}
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: 'white',
                                                                    color: typeConfig.color,
                                                                    fontSize: '0.7rem',
                                                                    height: 22,
                                                                    fontWeight: 600,
                                                                    '& .MuiChip-icon': { ml: 0.5 },
                                                                }}
                                                            />
                                                            <Chip
                                                                label={`${drilldownRequests.length} ${t('items', 'รายการ')}`}
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: 'rgba(255,255,255,0.2)',
                                                                    color: 'white',
                                                                    fontSize: '0.7rem',
                                                                    height: 22,
                                                                    fontWeight: 600,
                                                                    backdropFilter: 'blur(5px)',
                                                                }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                </Box>
                                                <IconButton
                                                    onClick={() => setDrilldownOpen(false)}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: 'rgba(255,255,255,0.2)',
                                                        backdropFilter: 'blur(10px)',
                                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                                                    }}
                                                >
                                                    <CloseCircle size={24} color="white" />
                                                </IconButton>
                                            </Box>
                                        </Box>
                                    </>
                                );
                            })()}

                            {/* Content */}
                            <Box
                                sx={{
                                    px: 2.5,
                                    py: 2,
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    flex: 1,
                                    overscrollBehavior: 'contain'
                                }}
                            >

                                {/* List of leaves */}
                                {drilldownRequests.length > 0 ? (
                                    drilldownRequests.map((leave, index) => {
                                        const statusConfig = getStatusConfig(leave.status);
                                        const typeConfig = leaveTypeConfig[selectedCode] || leaveTypeConfig.default;
                                        return (
                                            <Box
                                                key={leave.id}
                                                onClick={() => handleLeaveItemClick(leave)}
                                                sx={{
                                                    p: 2,
                                                    mb: 2,
                                                    bgcolor: 'white',
                                                    borderRadius: 1,
                                                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    touchAction: 'manipulation',
                                                    WebkitTapHighlightColor: 'transparent',
                                                    '@media (hover: hover)': {
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                                            transform: 'translateY(-2px)'
                                                        },
                                                    },
                                                    '&:active': {
                                                        opacity: 0.85,
                                                    }
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Box
                                                        sx={{
                                                            width: 48,
                                                            height: 48,
                                                            borderRadius: 2,
                                                            bgcolor: `${typeConfig.color}15`,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        <Calendar size={22} color={typeConfig.color} />
                                                    </Box>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography sx={{ fontWeight: 700, color: '#1E293B', fontSize: '0.95rem' }}>
                                                            {formatDate(leave.startDate, leave.endDate)}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                            {leave.leaveCode && (
                                                                <Chip
                                                                    label={leave.leaveCode}
                                                                    size="small"
                                                                    sx={{
                                                                        bgcolor: '#F1F5F9',
                                                                        color: '#64748B',
                                                                        fontSize: '0.65rem',
                                                                        height: 20,
                                                                        fontWeight: 600,
                                                                    }}
                                                                />
                                                            )}

                                                        </Box>
                                                    </Box>
                                                    <Box
                                                        sx={{
                                                            px: 1.5,
                                                            py: 0.75,
                                                            borderRadius: 2,
                                                            bgcolor: `${typeConfig.color}15`,
                                                            textAlign: 'center',
                                                        }}
                                                    >
                                                        <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: typeConfig.color, lineHeight: 1 }}>
                                                            {leave.totalDays}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.55rem', color: typeConfig.color, mt: 0.25 }}>
                                                            {t('days', 'วัน')}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                {leave.reason && (
                                                    <Box sx={{
                                                        mt: 1.5,
                                                        pt: 1.5,
                                                        borderTop: '1px solid #F1F5F9',
                                                    }}>
                                                        <Typography sx={{ color: '#64748B', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                                            {leave.reason.length > 80 ? `${leave.reason.substring(0, 80)}...` : leave.reason}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        );
                                    })
                                ) : (
                                    <Box sx={{ textAlign: 'center', py: 6, color: '#64748B' }}>
                                        <Archive size={48} color="#CBD5E1" />
                                        <Typography sx={{ mt: 2, fontWeight: 500, color: '#94A3B8' }}>
                                            {t('no_leave_records', 'ไม่มีรายการ')}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* Leave Detail Drawer */}
            <LeaveDetailDrawer
                open={detailDrawerOpen}
                onClose={() => setDetailDrawerOpen(false)}
                leave={selectedLeave}
                onImageViewerOpenChange={setIsImageViewerOpen}
            />
        </Box>
    );
};

export default DashboardCard;
