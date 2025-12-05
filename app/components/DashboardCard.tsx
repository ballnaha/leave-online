'use client';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Paper, IconButton, Select, MenuItem, Divider, Chip } from '@mui/material';
import { Drawer } from 'vaul';
import { Health, Briefcase, Sun1, ArrowRight, DocumentText, Calendar, Clock, Archive, Building4, Lovely, Car, MessageQuestion, Shield, Heart, People, Profile2User, CloseCircle, TickCircle, Timer, Forbidden2 } from 'iconsax-react';
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
    unpaid: { icon: Clock, color: '#8898AA' },
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

    // Color logic - Green for approved, Yellow for pending
    const config = leaveTypeConfig[selectedCode] || leaveTypeConfig.default;
    const approvedColor = '#4CAF50'; // Green for approved
    const pendingColor = '#FFC107'; // Yellow for pending
    const remainingColor = 'rgba(255, 255, 255, 0.3)'; // Semi-transparent white for remaining

    // Chart.js Doughnut data
    const chartData = useMemo(() => {
        if (isUnlimited) {
            // For unlimited, show only used vs arbitrary remaining
            return {
                datasets: [{
                    data: [currentBalance.approved, currentBalance.pending, Math.max(10 - currentBalance.used, 1)],
                    backgroundColor: [approvedColor, pendingColor, remainingColor],
                    borderWidth: 0,
                    cutout: '75%',
                    borderRadius: 4,
                }]
            };
        }

        if (isOverLimit) {
            // Over limit - show full circle in coral/salmon color that matches purple bg
            return {
                datasets: [{
                    data: [100],
                    backgroundColor: ['#FF6B9D'],
                    borderWidth: 0,
                    cutout: '75%',
                    borderRadius: 4,
                }]
            };
        }

        // Normal case
        const remaining = Math.max(currentBalance.remaining, 0);
        return {
            datasets: [{
                data: [currentBalance.approved, currentBalance.pending, remaining],
                backgroundColor: [approvedColor, pendingColor, remainingColor],
                borderWidth: 0,
                cutout: '75%',
                borderRadius: 4,
            }]
        };
    }, [currentBalance, isUnlimited, isOverLimit]);

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
            duration: 800,
            easing: 'easeOutQuart' as const,
        },
    }), []);

    return (
        <Box sx={{ mb: { xs: 0, sm: 3 } }}>
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
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.95rem' , color:'#FFFFFF;' }}>
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
                    {/* Left Side: Circular Progress with Chart.js */}
                    <Box sx={{ width: '42%', display: 'flex', justifyContent: 'center' }}>
                        <Box sx={{ position: 'relative', width: 130, height: 130 }}>
                            {/* Chart.js Doughnut */}
                            <Doughnut data={chartData} options={chartOptions} />

                            {/* Text Content Overlay */}
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
                                <Typography variant="h4" sx={{ fontWeight: 'bold', color: isOverLimit ? '#FF6B9D' : 'white', fontSize: '2rem' }}>
                                    {isOverLimit ? Math.abs(currentBalance.remaining) : currentBalance.remaining}
                                </Typography>
                                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>
                                    {isUnlimited ? t('dashboard_unlimited', 'ไม่จำกัด') : t('dashboard_from_total', 'จาก {{total}} วัน').replace('{{total}}', String(currentBalance.total))}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Right Side: Stats */}
                    <Box sx={{ width: '58%' }}>
                        {/* แสดงสิทธิ์คงเหลือในปีนี้ */}
                        <Typography variant="caption" sx={{ display: 'block', mb: 1.25, opacity: 0.8, fontSize: '0.75rem' }}>
                            {isUnlimited 
                                ? t('dashboard_unlimited_quota', 'สิทธิ์ลาไม่จำกัด')
                                : t('dashboard_remaining_quota', 'สิทธิ์คงเหลือ: {{remaining}}/{{total}} วัน')
                                    .replace('{{year}}', String(year + 543))
                                    .replace('{{remaining}}', String(Math.max(0, currentBalance.remaining)))
                                    .replace('{{total}}', String(currentBalance.total))
                            }
                        </Typography>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {/* อนุมัติแล้ว */}
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
                                    width: 7, 
                                    height: 7, 
                                    borderRadius: '50%', 
                                    bgcolor: '#4CAF50',
                                    flexShrink: 0
                                }} />
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', flex: 1 }}>
                                    {t('dashboard_approved', 'อนุมัติแล้ว {{days}} วัน').replace('{{days}}', currentBalance.approved > 0 ? String(currentBalance.approved) : '-')}
                                </Typography>
                                {currentBalance.approved > 0 && <ArrowRight size={15} color="rgba(255,255,255,0.5)" />}
                            </Box>
                            {/* เหลือ / เกินสิทธิ์ */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.375, px: 0.5, mx: -0.5 }}>
                                <Box sx={{ 
                                    width: 7, 
                                    height: 7, 
                                    borderRadius: '50%', 
                                    bgcolor: isOverLimit ? '#FF6B9D' : 'rgba(255,255,255,0.5)',
                                    flexShrink: 0
                                }} />
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                    {isOverLimit 
                                        ? t('dashboard_exceeded', 'เกิน {{days}} วัน').replace('{{days}}', String(Math.abs(currentBalance.remaining)))
                                        : t('dashboard_left', 'เหลือ {{days}} วัน').replace('{{days}}', isUnlimited ? '-' : String(currentBalance.remaining))
                                    }
                                </Typography>
                            </Box>
                            {/* รออนุมัติ */}
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
                                    width: 7, 
                                    height: 7, 
                                    borderRadius: '50%', 
                                    bgcolor: '#FFC107',
                                    flexShrink: 0
                                }} />
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', flex: 1 }}>
                                    {t('dashboard_pending', 'รออนุมัติ {{days}} วัน').replace('{{days}}', currentBalance.pending > 0 ? String(currentBalance.pending) : '-')}
                                </Typography>
                                {currentBalance.pending > 0 && <ArrowRight size={15} color="rgba(255,255,255,0.5)" />}
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
                                    width: 7, 
                                    height: 7, 
                                    borderRadius: '50%', 
                                    bgcolor: '#FF8FA3',
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
                                    width: 7, 
                                    height: 7, 
                                    borderRadius: '50%', 
                                    bgcolor: '#9E9E9E',
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
                                        transition: 'all 0.2s'
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
                open={drilldownOpen} 
                onOpenChange={(isOpen) => !isOpen && setDrilldownOpen(false)}
                shouldScaleBackground={false}
                preventScrollRestoration={true}
            >
                <Drawer.Portal>
                    <Drawer.Overlay 
                        className="vaul-overlay"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 1300,
                            backdropFilter: 'blur(2px)',
                            WebkitBackdropFilter: 'blur(2px)',
                        }}
                    />
                    <Drawer.Content
                        className="vaul-content"
                        style={{
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: 'white',
                            borderTopLeftRadius: 16,
                            borderTopRightRadius: 16,
                            maxHeight: '80vh',
                            zIndex: 1300,
                            display: 'flex',
                            flexDirection: 'column',
                            outline: 'none',
                        }}
                    >
                        {/* Hidden Title for accessibility */}
                        <Drawer.Title style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
                            {drilldownStatus ? getStatusConfig(drilldownStatus).label : t('leave_details', 'รายละเอียดการลา')}
                        </Drawer.Title>
                        <Drawer.Description style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
                            {t(`leave_${selectedCode}`, currentBalance.name)}
                        </Drawer.Description>
                <Box sx={{ width: '100%', bgcolor: 'white', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
                    {/* Drag Handle */}
                    <Drawer.Handle 
                        style={{
                            width: 40,
                            height: 5,
                            borderRadius: 2.5,
                            backgroundColor: '#E2E8F0',
                            margin: '12px auto 8px',
                        }}
                    />

                    {/* Header */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 2.5,
                            py: 1.5,
                            borderBottom: '1px solid #F1F5F9',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {drilldownStatus && (() => {
                                const statusConfig = getStatusConfig(drilldownStatus);
                                const StatusIcon = statusConfig.icon;
                                const typeConfig = leaveTypeConfig[selectedCode] || leaveTypeConfig.default;
                                const TypeIcon = typeConfig.icon;
                                return (
                                    <>
                                        <Box sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 1,
                                            bgcolor: statusConfig.bgColor,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <StatusIcon size={24} color={statusConfig.color} variant="Bold" />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B', fontSize: '1rem' }}>
                                                {statusConfig.label}
                                            </Typography>
                                            <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                                                {t(`leave_${selectedCode}`, currentBalance.name)} • {drilldownRequests.length} {t('items', 'รายการ')}
                                            </Typography>
                                        </Box>
                                    </>
                                );
                            })()}
                        </Box>
                        <IconButton onClick={() => setDrilldownOpen(false)} size="small">
                            <CloseCircle size={32} color="#64748B" />
                        </IconButton>
                    </Box>

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
                                            mb: 1.5, 
                                            bgcolor: '#F8FAFC', 
                                            borderRadius: 1,
                                            border: '1px solid #E2E8F0',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                bgcolor: '#F1F5F9',
                                                borderColor: '#CBD5E1'
                                            },
                                            '&:active': {
                                                transform: 'scale(0.98)',
                                                bgcolor: '#E2E8F0'
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Box sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 1,
                                                    bgcolor: `${typeConfig.color}15`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <Calendar size={16} color={typeConfig.color} />
                                                </Box>
                                                <Box>
                                                    <Typography sx={{ fontWeight: 600, color: '#1E293B', fontSize: '0.9rem' }}>
                                                        {formatDate(leave.startDate, leave.endDate)}
                                                    </Typography>
                                                    {leave.leaveCode && (
                                                        <Typography sx={{ color: '#94A3B8', fontSize: '0.75rem' }}>
                                                            {leave.leaveCode}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                            <Chip 
                                                label={`${leave.totalDays} ${t('days', 'วัน')}`}
                                                size="small"
                                                sx={{ 
                                                    bgcolor: statusConfig.bgColor,
                                                    color: statusConfig.color,
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem',
                                                    height: 24
                                                }}
                                            />
                                        </Box>
                                        {leave.reason && (
                                            <Box sx={{ 
                                                pl: 6, 
                                                borderLeft: `2px solid ${typeConfig.color}30`,
                                                ml: 2
                                            }}>
                                                <Typography sx={{ color: '#64748B', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                                    {leave.reason.length > 100 ? `${leave.reason.substring(0, 100)}...` : leave.reason}
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
            />
        </Box>
    );
};

export default DashboardCard;
