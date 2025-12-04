'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Paper, IconButton, Select, MenuItem } from '@mui/material';
import { Health, Briefcase, Sun1, ArrowRight, DocumentText, Calendar, Clock, Archive, Building4, Lovely, Car, MessageQuestion, Shield, Heart, People, Profile2User } from 'iconsax-react';
import { useLocale } from '../providers/LocaleProvider';
import { HelpCircle } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

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

interface LeaveRequest {
    id: number;
    leaveCode: string | null;
    leaveType: string;
    totalDays: number;
    status: string;
    startDate: string;
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
    const { t } = useLocale();
    const [selectedCode, setSelectedCode] = useState<string>('');

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
            // Over limit - show full circle in red
            return {
                datasets: [{
                    data: [100],
                    backgroundColor: ['#FF4D4D'],
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
                    borderRadius: { xs: 0, sm: 2 },
                    p: 3,
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: { xs: 'none', sm: '0 10px 30px rgba(108, 99, 255, 0.25)' },
                }}
            >
                {/* Decorative Circles */}
                <Box sx={{
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    width: 150,
                    height: 150,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                }} />
                <Box sx={{
                    position: 'absolute',
                    bottom: -40,
                    left: -40,
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                }} />

                {/* Year Selector */}
                <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
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

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Left Side: Circular Progress with Chart.js */}
                    <Box sx={{ width: '40%', display: 'flex', justifyContent: 'center' }}>
                        <Box sx={{ position: 'relative', width: 120, height: 120 }}>
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
                                <Typography variant="h4" sx={{ fontWeight: 'bold', color: isOverLimit ? '#FF4D4D' : 'white' }}>
                                    {isOverLimit ? Math.abs(currentBalance.remaining) : currentBalance.remaining}
                                </Typography>
                                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>
                                    {isUnlimited ? t('dashboard_unlimited', 'ไม่จำกัด') : t('dashboard_from_total', 'จาก {{total}} วัน').replace('{{total}}', String(currentBalance.total))}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Right Side: Stats */}
                    <Box sx={{ width: '60%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.85rem', fontWeight: 600 }}>
                                {t(`leave_${selectedCode}`, currentBalance.name)}
                            </Typography>
                            
                        </Box>
                        
                        {/* แสดงสิทธิ์คงเหลือในปีนี้ */}
                        <Typography variant="caption" sx={{ display: 'block', mb: 1.5, opacity: 0.8, fontSize: '0.75rem' }}>
                            {isUnlimited 
                                ? t('dashboard_unlimited_quota', 'สิทธิ์ลาไม่จำกัด')
                                : t('dashboard_remaining_quota', 'สิทธิ์คงเหลือปี {{year}}: {{remaining}}/{{total}} วัน')
                                    .replace('{{year}}', String(year + 543))
                                    .replace('{{remaining}}', String(Math.max(0, currentBalance.remaining)))
                                    .replace('{{total}}', String(currentBalance.total))
                            }
                        </Typography>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ 
                                    width: 8, 
                                    height: 8, 
                                    borderRadius: '50%', 
                                    bgcolor: '#4CAF50' 
                                }} />
                                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                    {t('dashboard_approved', 'อนุมัติแล้ว {{days}} วัน').replace('{{days}}', String(currentBalance.approved))}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ 
                                    width: 8, 
                                    height: 8, 
                                    borderRadius: '50%', 
                                    bgcolor: isOverLimit ? '#FF4D4D' : 'rgba(255,255,255,0.5)' 
                                }} />
                                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                    {isOverLimit 
                                        ? t('dashboard_exceeded', 'เกิน {{days}} วัน').replace('{{days}}', String(Math.abs(currentBalance.remaining)))
                                        : t('dashboard_left', 'เหลือ {{days}} วัน').replace('{{days}}', String(currentBalance.remaining))
                                    }
                                </Typography>
                            </Box>
                            {currentBalance.pending > 0 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ 
                                        width: 8, 
                                        height: 8, 
                                        borderRadius: '50%', 
                                        bgcolor: '#FFC107'
                                    }} />
                                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                        {t('dashboard_pending', 'รออนุมัติ {{days}} วัน').replace('{{days}}', String(currentBalance.pending))}
                                    </Typography>
                                </Box>
                            )}
                            {currentBalance.rejected > 0 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ 
                                        width: 8, 
                                        height: 8, 
                                        borderRadius: '50%', 
                                        bgcolor: '#FF5252'
                                    }} />
                                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                        {t('dashboard_rejected', 'ไม่อนุมัติ {{days}} วัน').replace('{{days}}', String(currentBalance.rejected))}
                                    </Typography>
                                </Box>
                            )}
                            {currentBalance.cancelled > 0 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ 
                                        width: 8, 
                                        height: 8, 
                                        borderRadius: '50%', 
                                        bgcolor: '#9E9E9E'
                                    }} />
                                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                        {t('dashboard_cancelled', 'ยกเลิก {{days}} วัน').replace('{{days}}', String(currentBalance.cancelled))}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>

                {/* Bottom: Quick Actions (Leave Types) */}
                <Box sx={{ mt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {t('dashboard_leave_types', 'ประเภทการลา')}
                        </Typography>
                    </Box>

                    <Box sx={{ 
                        display: 'flex', 
                        gap: 2, 
                        overflowX: 'auto', 
                        pb: 1,
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
                                        gap: 1,
                                        cursor: 'pointer',
                                        minWidth: 60,
                                        opacity: isSelected ? 1 : 0.7,
                                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Box sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '12px',
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
                                            maxWidth: 60,
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
        </Box>
    );
};

export default DashboardCard;
