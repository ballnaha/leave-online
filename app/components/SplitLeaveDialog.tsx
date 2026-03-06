import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    IconButton,
    TextField,
    Paper,
    Chip,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Drawer,
    ToggleButton,
    ToggleButtonGroup,
    Alert,
} from '@mui/material';
import {
    CloseCircle,
    Add,
    Trash,
    TickCircle,
    ArrowDown2,
    Calendar,
    Clock,
    User,
    MoneyRecive, // Note: This might be MoneySend in iconsax, check library
    Profile,
    Heart,
    Briefcase,
    Sun1,
    Sun,
    People,
    Building,
    Car,
    Shield,
    Profile2User,
    MoneySend,
    InfoCircle,
    Health,
    Scissor
} from 'iconsax-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useLocale } from '@/app/providers/LocaleProvider';
import { useToastr } from '@/app/components/Toastr';

const PRIMARY_COLOR = '#6C63FF';

// Interface
interface SplitLeaveDialogProps {
    open: boolean;
    onClose: () => void;
    approval: any;
    onSuccess: () => void;
}

interface SplitPart {
    leaveType: string;
    startDate: string;
    endDate: string;
    startPeriod: 'full' | 'half';
    endPeriod: 'full' | 'half';
    totalDays: number;
    reason: string;
}

type IconComponent = React.ElementType;

// Icon mapping
const leaveTypeConfig: Record<string, { icon: IconComponent; color: string; lightColor: string }> = {
    sick: { icon: Health, color: '#D32F2F', lightColor: '#FFEBEE' },
    personal: { icon: Briefcase, color: '#1976D2', lightColor: '#E3F2FD' },
    vacation: { icon: Sun1, color: '#ED6C02', lightColor: '#FFF3E0' },
    annual: { icon: Sun, color: '#ED6C02', lightColor: '#FFF3E0' },
    maternity: { icon: People, color: '#9C27B0', lightColor: '#F3E5F5' },
    ordination: { icon: Building, color: '#ED6C02', lightColor: '#FFF3E0' },
    work_outside: { icon: Car, color: '#0288D1', lightColor: '#E1F5FE' },
    military: { icon: Shield, color: '#2E7D32', lightColor: '#E8F5E9' },
    marriage: { icon: Heart, color: '#E91E63', lightColor: '#FCE4EC' },
    funeral: { icon: Profile2User, color: '#424242', lightColor: '#F5F5F5' },
    paternity: { icon: User, color: '#1976D2', lightColor: '#E3F2FD' },
    sterilization: { icon: Health, color: '#D32F2F', lightColor: '#FFEBEE' },
    business: { icon: Car, color: '#0288D1', lightColor: '#E1F5FE' },
    unpaid: { icon: MoneySend, color: '#757575', lightColor: '#EEEEEE' },
    other: { icon: InfoCircle, color: '#607D8B', lightColor: '#ECEFF1' },
    default: { icon: InfoCircle, color: PRIMARY_COLOR, lightColor: '#EAF2F8' },
};

export default function SplitLeaveDialog({ open, onClose, approval, onSuccess }: SplitLeaveDialogProps) {
    const { t } = useLocale();
    const toastr = useToastr();

    const [splitParts, setSplitParts] = useState<SplitPart[]>([]);
    const [splitComment, setSplitComment] = useState('');
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [leaveSummary, setLeaveSummary] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Bottom Sheet State
    const [leaveTypeSheetOpen, setLeaveTypeSheetOpen] = useState(false);
    const [currentEditingPartIndex, setCurrentEditingPartIndex] = useState<number | null>(null);

    // Initialize
    useEffect(() => {
        if (open && approval) {
            setSplitComment('');
            setError('');

            const startDate = new Date(approval.leaveRequest.startDate);
            const endDate = new Date(approval.leaveRequest.endDate);
            const totalDays = approval.leaveRequest.totalDays;

            // Default split logic
            const firstDayEnd = new Date(startDate);
            const secondDayStart = new Date(startDate);
            secondDayStart.setDate(secondDayStart.getDate() + 1);

            setSplitParts([
                {
                    leaveType: approval.leaveRequest.leaveType,
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: firstDayEnd.toISOString().split('T')[0],
                    startPeriod: 'full',
                    endPeriod: 'full',
                    totalDays: 1,
                    reason: approval.leaveRequest.reason || '',
                },
                {
                    leaveType: 'unpaid', // Default to unpaid for the rest
                    startDate: secondDayStart.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    startPeriod: 'full',
                    endPeriod: 'full',
                    totalDays: Math.max(0, totalDays - 1),
                    reason: '',
                },
            ]);

            fetchLeaveSummary(approval.leaveRequest.user.id, startDate.getFullYear());
        }
    }, [open, approval]);

    const fetchLeaveSummary = async (userId: number, year: number) => {
        setLoadingSummary(true);
        try {
            const response = await fetch(`/api/users/${userId}/leave-summary?year=${year}`);
            if (response.ok) {
                const data = await response.json();
                setLeaveSummary(data.summary);
            }
        } catch (error) {
            console.error('Error fetching leave summary:', error);
        } finally {
            setLoadingSummary(false);
        }
    };

    // Helper: Get remaining days (adjusted with original leave days)
    const getQuotaInfo = (leaveTypeCode: string): {
        displayRemaining: number;
        availableForSplit: number;
        isUnlimited: boolean;
        name: string;
        maxDays: number;
        usedDays: number;
    } => {
        const summary = leaveSummary.find(s => s.code === leaveTypeCode);
        if (summary) {
            const originalLeaveType = approval?.leaveRequest.leaveType;
            const originalDays = approval?.leaveRequest.totalDays || 0;

            const displayRemaining = summary.remainingDays;
            let availableForSplit = summary.remainingDays;

            // EXTREMELY Robust check: Compare leaveTypeCode with the original leave type
            // We check against: slug/code, display name (name), ID, and case-insensitive versions
            const isSameType =
                originalLeaveType === leaveTypeCode ||
                originalLeaveType === summary.name ||
                String(originalLeaveType) === String(summary.id) ||
                String(originalLeaveType).toLowerCase() === String(leaveTypeCode).toLowerCase() ||
                String(originalLeaveType).toLowerCase() === String(summary.name).toLowerCase();

            if (isSameType && !summary.isUnlimited) {
                // For validation, we "add back" the days of the leave being split
                // because those days will be redistributed among the split parts.
                availableForSplit = summary.remainingDays + originalDays;
                availableForSplit = Math.max(0, Math.min(availableForSplit, summary.maxDays));
            }

            return {
                displayRemaining,
                availableForSplit,
                isUnlimited: summary.isUnlimited,
                name: summary.name,
                maxDays: summary.maxDays,
                usedDays: summary.usedDays
            };
        }
        return {
            displayRemaining: 999,
            availableForSplit: 999,
            isUnlimited: true,
            name: leaveTypeCode,
            maxDays: 0,
            usedDays: 0
        };
    };

    const getTotalDaysForTypeInSplits = (leaveTypeCode: string): number => {
        return splitParts
            .filter(p => p.leaveType === leaveTypeCode)
            .reduce((sum, p) => sum + p.totalDays, 0);
    };

    const calculateTotalDaysWithPeriod = (startDate: string, endDate: string, startPeriod: string, endPeriod: string): number => {
        const start = dayjs(startDate);
        const end = dayjs(endDate);
        if (!start.isValid() || !end.isValid() || end.isBefore(start)) return 0;

        const daysDiff = end.diff(start, 'day');
        const getPeriodValue = (period: string) => period === 'full' ? 1 : 0.5;

        if (daysDiff === 0) {
            if (startPeriod === 'full' && endPeriod === 'full') return 1;
            if (startPeriod === 'half' && endPeriod === 'half') return 0.5;
            return getPeriodValue(startPeriod);
        }

        const firstDayValue = getPeriodValue(startPeriod);
        const lastDayValue = getPeriodValue(endPeriod);
        const middleDays = Math.max(0, daysDiff - 1);

        return firstDayValue + middleDays + lastDayValue;
    };

    const handleUpdateSplitPart = (index: number, field: string, value: string | number) => {
        setSplitParts(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };

            if (['startDate', 'endDate', 'startPeriod', 'endPeriod'].includes(field)) {
                updated[index].totalDays = calculateTotalDaysWithPeriod(
                    updated[index].startDate,
                    updated[index].endDate,
                    updated[index].startPeriod,
                    updated[index].endPeriod
                );

                // Auto-adjust adjacent parts
                if ((field === 'endDate' || field === 'endPeriod') && index < updated.length - 1) {
                    const currentEndPeriod = updated[index].endPeriod;
                    let nextStartDate = updated[index].endDate;
                    let nextStartPeriod: 'full' | 'half' = 'full';

                    if (currentEndPeriod === 'half') {
                        nextStartPeriod = 'half';
                    } else {
                        nextStartDate = dayjs(updated[index].endDate).add(1, 'day').format('YYYY-MM-DD');
                        nextStartPeriod = 'full';
                    }

                    updated[index + 1] = {
                        ...updated[index + 1],
                        startDate: nextStartDate,
                        startPeriod: nextStartPeriod
                    };
                    updated[index + 1].totalDays = calculateTotalDaysWithPeriod(
                        updated[index + 1].startDate,
                        updated[index + 1].endDate,
                        updated[index + 1].startPeriod,
                        updated[index + 1].endPeriod
                    );
                }

                if ((field === 'startDate' || field === 'startPeriod') && index > 0) {
                    const currentStartPeriod = updated[index].startPeriod;
                    let prevEndDate = updated[index].startDate;
                    let prevEndPeriod: 'full' | 'half' = 'full';

                    if (currentStartPeriod === 'half') {
                        prevEndPeriod = 'half';
                    } else {
                        prevEndDate = dayjs(updated[index].startDate).subtract(1, 'day').format('YYYY-MM-DD');
                        prevEndPeriod = 'full';
                    }

                    updated[index - 1] = {
                        ...updated[index - 1],
                        endDate: prevEndDate,
                        endPeriod: prevEndPeriod
                    };
                    updated[index - 1].totalDays = calculateTotalDaysWithPeriod(
                        updated[index - 1].startDate,
                        updated[index - 1].endDate,
                        updated[index - 1].startPeriod,
                        updated[index - 1].endPeriod
                    );
                }
            }

            return updated;
        });
    };

    const handleAddSplitPart = () => {
        const lastPart = splitParts[splitParts.length - 1];
        const nextDay = new Date(lastPart.endDate);
        nextDay.setDate(nextDay.getDate() + 1);

        setSplitParts(prev => [...prev, {
            leaveType: '',
            startDate: nextDay.toISOString().split('T')[0],
            endDate: nextDay.toISOString().split('T')[0],
            startPeriod: 'full',
            endPeriod: 'full',
            totalDays: 1,
            reason: '',
        }]);
    };

    const handleRemoveSplitPart = (index: number) => {
        setSplitParts(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!approval) return;

        const totalSplitDays = splitParts.reduce((sum, p) => sum + p.totalDays, 0);
        if (Math.abs(totalSplitDays - approval.leaveRequest.totalDays) > 0.01) {
            setError(`จำนวนวันรวมไม่ตรง (เดิม: ${approval.leaveRequest.totalDays} วัน, แยก: ${totalSplitDays} วัน)`);
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const response = await fetch(`/api/leaves/${approval.leaveRequest.id}/split`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    splits: splitParts,
                    comment: splitComment.trim() || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || t('error_occurred', 'เกิดข้อผิดพลาด'));
                toastr.error(data.error || t('error_occurred', 'เกิดข้อผิดพลาด'));
                return;
            }

            toastr.success(t('split_success', 'แยกใบลาสำเร็จ'));
            onSuccess();
            onClose();
        } catch (err) {
            setError(t('connection_error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ'));
            toastr.error(t('connection_error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ'));
        } finally {
            setSubmitting(false);
        }
    };

    const totalOriginalDays = approval?.leaveRequest.totalDays || 0;
    const totalCurrentDays = splitParts.reduce((sum, p) => sum + p.totalDays, 0);
    const isTotalDaysValid = Math.abs(totalCurrentDays - totalOriginalDays) < 0.01;
    const hasQuotaLimit = splitParts.some(p => {
        const info = getQuotaInfo(p.leaveType);
        const total = getTotalDaysForTypeInSplits(p.leaveType);
        return !info.isUnlimited && total > info.availableForSplit;
    });

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 2, height: '90vh', display: 'flex', flexDirection: 'column' }
                }}
            >
                {/* Header */}
                <Box sx={{
                    p: 2,
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: '#f8fafc'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 40, height: 40, borderRadius: '12px', bgcolor: '#EDE7F6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Scissor size={24} color={PRIMARY_COLOR} variant="Bold" />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>
                                แยกใบลา
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {approval?.leaveRequest.user.firstName} {approval?.leaveRequest.user.lastName}
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <CloseCircle size={24} color="#9CA3AF" />
                    </IconButton>
                </Box>

                <DialogContent sx={{ flex: 1, p: 2, overflow: 'auto' }}>
                    {/* Original Leave Info */}
                    {approval && (
                        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 1, bgcolor: 'white', border: '1px solid #E2E8F0' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">ใบลาเดิม</Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                        {t(`leave_${approval.leaveRequest.leaveType}`, approval.leaveRequest.leaveType)}
                                    </Typography>
                                    {approval.leaveRequest.leaveCode && (
                                        <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'monospace' }}>
                                            #{approval.leaveRequest.leaveCode}
                                        </Typography>
                                    )}
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="caption" color="text.secondary">ระยะเวลา</Typography>
                                    <Typography variant="body2" fontWeight={600} color="primary">
                                        {approval.leaveRequest.totalDays} วัน
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="caption" color="text.secondary">วันที่</Typography>
                                    <Typography variant="body2" fontWeight={500}>
                                        {new Date(approval.leaveRequest.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                        {approval.leaveRequest.startDate !== approval.leaveRequest.endDate &&
                                            ` - ${new Date(approval.leaveRequest.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`
                                        }
                                    </Typography>
                                </Box>
                            </Box>
                        </Paper>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Leave Balance Chips */}
                    {!loadingSummary && leaveSummary.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                สิทธิ์วันลาคงเหลือ
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {leaveSummary
                                    .filter(l => l.isActive || l.usedDays > 0)
                                    .map((leave) => {
                                        const info = getQuotaInfo(leave.code);
                                        return (
                                            <Chip
                                                key={leave.code}
                                                label={`${t(`leave_${leave.code}`, leave.name)}: ${info.isUnlimited ? '∞' : info.displayRemaining}`}
                                                size="small"
                                                sx={{
                                                    bgcolor: info.isUnlimited ? '#E3F2FD' : info.displayRemaining > 0 ? '#E8F5E9' : '#FFEBEE',
                                                    color: info.isUnlimited ? '#1976D2' : info.displayRemaining > 0 ? '#2E7D32' : '#D32F2F',
                                                    fontWeight: 600,
                                                    fontSize: '0.7rem',
                                                    height: 26,
                                                }}
                                            />
                                        );
                                    })}
                            </Box>
                        </Box>
                    )}

                    {/* Split Parts */}
                    <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography variant="subtitle2" fontWeight={600}>
                                แบ่งเป็น {splitParts.length} ส่วน
                            </Typography>
                            <Button
                                size="small"
                                onClick={handleAddSplitPart}
                                startIcon={<Add size={16} />}
                                sx={{ color: PRIMARY_COLOR, fontSize: '0.8rem' }}
                            >
                                เพิ่มส่วน
                            </Button>
                        </Box>

                        {splitParts.map((part, index) => {
                            const leaveInfo = getQuotaInfo(part.leaveType);
                            const totalDaysForThisType = getTotalDaysForTypeInSplits(part.leaveType);
                            const isOverLimit = !leaveInfo.isUnlimited && totalDaysForThisType > leaveInfo.availableForSplit;

                            return (
                                <Paper
                                    key={index}
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        mb: 1.5,
                                        borderRadius: 1,
                                        bgcolor: 'white',
                                        border: '2px solid',
                                        borderColor: isOverLimit ? '#FFCDD2' : index === 0 ? '#C8E6C9' : '#FFE0B2',
                                    }}
                                >
                                    {/* Part Header */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                        <Chip
                                            label={`ส่วนที่ ${index + 1}`}
                                            size="small"
                                            sx={{
                                                bgcolor: index === 0 ? '#E8F5E9' : '#FFF3E0',
                                                color: index === 0 ? '#2E7D32' : '#E65100',
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                            }}
                                        />
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="h6" fontWeight={800} color={isOverLimit ? 'error.main' : 'primary.main'}>
                                                {part.totalDays} วัน
                                            </Typography>
                                            {splitParts.length > 1 && (
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleRemoveSplitPart(index)}
                                                    sx={{
                                                        color: '#EF5350',
                                                        p: 0.5,
                                                        ml: 0.5,
                                                        bgcolor: 'rgba(239, 83, 80, 0.05)',
                                                        '&:hover': { bgcolor: 'rgba(239, 83, 80, 0.1)' }
                                                    }}
                                                >
                                                    <Trash size={18} variant="Bold" color="#EF5350" />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </Box>

                                    {/* Leave Type Selector */}
                                    <Box
                                        onClick={() => {
                                            setCurrentEditingPartIndex(index);
                                            setLeaveTypeSheetOpen(true);
                                        }}
                                        sx={{
                                            mb: 2,
                                            p: 1.5,
                                            border: '1px solid #E2E8F0',
                                            borderRadius: 1,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            bgcolor: '#FAFAFA',
                                            '&:hover': { borderColor: PRIMARY_COLOR, bgcolor: 'white' }
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">ประเภทการลา</Typography>
                                            <Typography variant="body2" fontWeight={600}>
                                                {t(`leave_${part.leaveType}`, leaveInfo.name || part.leaveType)}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip
                                                label={leaveInfo.isUnlimited ? '∞' : `เหลือ ${leaveInfo.displayRemaining}`}
                                                size="small"
                                                sx={{
                                                    height: 22,
                                                    fontSize: '0.7rem',
                                                    bgcolor: isOverLimit ? '#FFEBEE' : leaveInfo.isUnlimited ? '#E3F2FD' : '#E8F5E9',
                                                    color: isOverLimit ? '#D32F2F' : leaveInfo.isUnlimited ? '#1976D2' : '#2E7D32',
                                                    fontWeight: 600,
                                                }}
                                            />
                                            <ArrowDown2 size={16} color="#94A3B8" />
                                        </Box>
                                    </Box>

                                    {/* Date Range */}
                                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
                                        <Box sx={{
                                            display: 'grid',
                                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                            gap: 1.5,
                                            mb: 2
                                        }}>
                                            {/* Start Date */}
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>วันเริ่ม</Typography>
                                                <DatePicker
                                                    value={part.startDate ? dayjs(part.startDate) : null}
                                                    onChange={(newValue) => {
                                                        if (newValue && newValue.isValid()) {
                                                            handleUpdateSplitPart(index, 'startDate', newValue.format('YYYY-MM-DD'));
                                                        }
                                                    }}
                                                    format="DD MMM"
                                                    slotProps={{
                                                        textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { bgcolor: 'white' } } }
                                                    }}
                                                />
                                                <ToggleButtonGroup
                                                    value={part.startPeriod}
                                                    exclusive
                                                    onChange={(_, val) => val && handleUpdateSplitPart(index, 'startPeriod', val)}
                                                    size="small"
                                                    fullWidth
                                                    sx={{
                                                        mt: 1,
                                                        '& .MuiToggleButton-root': {
                                                            flex: 1, py: 0.5, fontSize: '0.75rem',
                                                            '&.Mui-selected': { bgcolor: PRIMARY_COLOR, color: 'white', '&:hover': { bgcolor: '#5B52E0' } },
                                                        }
                                                    }}
                                                >
                                                    <ToggleButton value="full">เต็มวัน</ToggleButton>
                                                    <ToggleButton value="half">ครึ่งวัน</ToggleButton>
                                                </ToggleButtonGroup>
                                            </Box>
                                            {/* End Date */}
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>วันสิ้นสุด</Typography>
                                                <DatePicker
                                                    value={part.endDate ? dayjs(part.endDate) : null}
                                                    onChange={(newValue) => {
                                                        if (newValue && newValue.isValid()) {
                                                            handleUpdateSplitPart(index, 'endDate', newValue.format('YYYY-MM-DD'));
                                                        }
                                                    }}
                                                    minDate={part.startDate ? dayjs(part.startDate) : undefined}
                                                    format="DD MMM"
                                                    slotProps={{
                                                        textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { bgcolor: 'white' } } }
                                                    }}
                                                />
                                                <ToggleButtonGroup
                                                    value={part.endPeriod}
                                                    exclusive
                                                    onChange={(_, val) => val && handleUpdateSplitPart(index, 'endPeriod', val)}
                                                    size="small"
                                                    fullWidth
                                                    sx={{
                                                        mt: 1,
                                                        '& .MuiToggleButton-root': {
                                                            flex: 1, py: 0.5, fontSize: '0.75rem',
                                                            '&.Mui-selected': { bgcolor: PRIMARY_COLOR, color: 'white', '&:hover': { bgcolor: '#5B52E0' } },
                                                        }
                                                    }}
                                                >
                                                    <ToggleButton value="full">เต็มวัน</ToggleButton>
                                                    <ToggleButton value="half">ครึ่งวัน</ToggleButton>
                                                </ToggleButtonGroup>
                                            </Box>
                                        </Box>
                                    </LocalizationProvider>

                                    <TextField
                                        placeholder="เหตุผล (ถ้ามี)"
                                        size="small"
                                        fullWidth
                                        value={part.reason}
                                        onChange={(e) => handleUpdateSplitPart(index, 'reason', e.target.value)}
                                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white' } }}
                                    />
                                </Paper>
                            );
                        })}
                    </Box>

                    <TextField
                        label="หมายเหตุการแยกใบลา"
                        placeholder="ระบุเหตุผลในการแยกใบลา..."
                        multiline
                        rows={2}
                        fullWidth
                        value={splitComment}
                        onChange={(e) => setSplitComment(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, bgcolor: 'white' } }}
                    />
                </DialogContent>

                {/* Footer */}
                <Box sx={{ bgcolor: 'white', borderTop: '1px solid #E2E8F0', p: 2 }}>
                    <Box sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, p: 1.5, borderRadius: 1,
                        bgcolor: isTotalDaysValid ? '#E8F5E9' : '#FFEBEE'
                    }}>
                        <Typography variant="body2" fontWeight={600}>รวมทั้งหมด</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" fontWeight={800} color={isTotalDaysValid ? 'success.main' : 'error.main'}>
                                {totalCurrentDays}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">/ {totalOriginalDays} วัน</Typography>
                            {isTotalDaysValid ? <TickCircle size={20} color="#2E7D32" variant="Bold" /> : <CloseCircle size={20} color="#D32F2F" variant="Bold" />}
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button
                            variant="outlined"
                            onClick={onClose}
                            disabled={submitting}
                            sx={{ flex: 1, borderRadius: 1, py: 1.25, borderColor: '#E2E8F0', color: 'text.secondary' }}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={submitting || !isTotalDaysValid || hasQuotaLimit}
                            sx={{
                                flex: 2, borderRadius: 1, py: 1.25, bgcolor: PRIMARY_COLOR,
                                '&:hover': { bgcolor: '#5B52E0' }
                            }}
                        >
                            {submitting ? 'กำลังดำเนินการ...' : 'ยืนยันแยกใบลา'}
                        </Button>
                    </Box>
                </Box>
            </Dialog>

            {/* Bottom Sheet for Leave Type Selection */}
            <Drawer
                anchor="bottom"
                open={leaveTypeSheetOpen}
                onClose={() => {
                    setLeaveTypeSheetOpen(false);
                    setCurrentEditingPartIndex(null);
                }}
                sx={{ zIndex: 1400 }}
                PaperProps={{ sx: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70vh' } }}
            >
                <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                    <Box sx={{ width: 40, height: 4, bgcolor: '#ddd', borderRadius: 1, mx: 'auto', mb: 2 }} />
                    <Typography variant="h6" fontWeight={700} sx={{ textAlign: 'center' }}>{t('select_leave_type', 'เลือกประเภทการลา')}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                        {t('for_part', 'สำหรับส่วนที่')} {currentEditingPartIndex !== null ? currentEditingPartIndex + 1 : ''}
                    </Typography>
                </Box>

                <List sx={{ overflow: 'auto' }}>
                    {loadingSummary ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <Typography variant="body2" color="text.secondary">{t('loading', 'กำลังโหลด...')}</Typography>
                        </Box>
                    ) : leaveSummary.length > 0 ? (
                        leaveSummary.map((leave) => {
                            const adjustedInfo = getQuotaInfo(leave.code);
                            const currentPartLeaveType = currentEditingPartIndex !== null ? splitParts[currentEditingPartIndex]?.leaveType : null;

                            // Calculate how many days of this type are already used in OTHER split parts
                            const daysUsedInOtherParts = splitParts.reduce((sum, p, idx) => {
                                if (idx !== currentEditingPartIndex && p.leaveType === leave.code) {
                                    return sum + p.totalDays;
                                }
                                return sum;
                            }, 0);

                            const isDisabled = !adjustedInfo.isUnlimited &&
                                (adjustedInfo.availableForSplit - daysUsedInOtherParts) <= 0 &&
                                leave.code !== currentPartLeaveType;
                            const isSelected = currentPartLeaveType === leave.code;
                            const config = leaveTypeConfig[leave.code] || leaveTypeConfig.default;
                            const LeaveIcon = config.icon;

                            return (
                                <ListItem key={leave.code} disablePadding>
                                    <ListItemButton
                                        onClick={() => {
                                            if (!isDisabled && currentEditingPartIndex !== null) {
                                                handleUpdateSplitPart(currentEditingPartIndex, 'leaveType', leave.code);
                                                setLeaveTypeSheetOpen(false);
                                                setCurrentEditingPartIndex(null);
                                            }
                                        }}
                                        disabled={isDisabled}
                                        sx={{
                                            py: 1.5,
                                            bgcolor: isSelected ? 'rgba(108, 99, 255, 0.08)' : 'transparent',
                                            '&.Mui-disabled': { opacity: 0.5, bgcolor: 'grey.100' }
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 44 }}>
                                            <Box sx={{
                                                width: 36, height: 36, borderRadius: 1, bgcolor: config.lightColor,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <LeaveIcon size={20} color={config.color} variant="Bold" />
                                            </Box>
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={<Typography variant="body1" fontWeight={isSelected ? 700 : 500}>{t(`leave_${leave.code}`, leave.name)}</Typography>}
                                            secondary={
                                                <Typography variant="caption" color="text.secondary">
                                                    {adjustedInfo.isUnlimited ? t('unlimited_days', 'ไม่จำกัดจำนวนวัน') : t('used_days_format', 'ใช้ไป {{used}} / {{max}} วัน').replace('{{used}}', String(leave.usedDays)).replace('{{max}}', String(leave.maxDays))}
                                                </Typography>
                                            }
                                        />
                                        <Chip
                                            label={adjustedInfo.isUnlimited ? t('unlimited', 'ไม่จำกัด') : t('remaining_days_format', 'เหลือ {{days}} วัน').replace('{{days}}', String(adjustedInfo.displayRemaining))}
                                            size="small"
                                            sx={{
                                                height: 24, fontSize: '0.75rem', fontWeight: 600,
                                                bgcolor: adjustedInfo.isUnlimited ? '#E3F2FD' : adjustedInfo.displayRemaining > 0 ? '#E8F5E9' : '#FFEBEE',
                                                color: adjustedInfo.isUnlimited ? '#1976D2' : adjustedInfo.displayRemaining > 0 ? '#2E7D32' : '#D32F2F',
                                            }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })
                    ) : (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography color="text.secondary">ไม่พบข้อมูลประเภทการลา</Typography>
                        </Box>
                    )}
                </List>
            </Drawer>
        </>
    );
}
