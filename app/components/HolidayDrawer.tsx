'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Drawer,
    IconButton,
    Chip,
    FormControl,
    Select,
    MenuItem,
    CircularProgress,
} from '@mui/material';
import { X, Calendar, Star, Sun } from 'lucide-react';
import { useLocale } from '@/app/providers/LocaleProvider';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import 'dayjs/locale/en';
import 'dayjs/locale/my';

interface Holiday {
    id: number;
    date: string; // YYYY-MM-DD
    name: string;
    type: string;
    companyId?: number | null;
}

interface HolidayDrawerProps {
    open: boolean;
    onClose: () => void;
    initialYear?: number;
}

export default function HolidayDrawer({ open, onClose, initialYear }: HolidayDrawerProps) {
    const { t, locale } = useLocale();
    const [selectedYear, setSelectedYear] = useState(initialYear || dayjs().year());
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(false);

    // Generate years for dropdown
    const currentYear = dayjs().year();
    const years = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i);

    // Fetch holidays when year changes or drawer opens
    useEffect(() => {
        if (open) {
            fetchHolidays();
        }
    }, [open, selectedYear]);

    // Update selected year when initialYear changes
    useEffect(() => {
        if (initialYear) {
            setSelectedYear(initialYear);
        }
    }, [initialYear]);

    const fetchHolidays = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/holidays?year=${selectedYear}`);
            if (res.ok) {
                const data = await res.json();
                setHolidays(data);
            }
        } catch (error) {
            console.error('Error fetching holidays:', error);
        } finally {
            setLoading(false);
        }
    };

    // Group holidays by month
    const holidaysByMonth = useMemo(() => {
        return holidays.reduce((acc, holiday) => {
            const month = dayjs(holiday.date).month();
            if (!acc[month]) {
                acc[month] = [];
            }
            acc[month].push(holiday);
            return acc;
        }, {} as Record<number, Holiday[]>);
    }, [holidays]);

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'company':
                return { bg: '#D1FAE5', text: '#DC2626' };
            default:
                return { bg: '#F3F4F6', text: '#6B7280' };
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'company':
                return t('holiday_type_company', 'วันหยุดบริษัท');
            default:
                return '';
        }
    };

    const months = Object.keys(holidaysByMonth).map(Number).sort((a, b) => a - b);

    // Stats
    const stats = {
        company: holidays.filter((h) => h.type === 'company').length,
    };

    return (
        <Drawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    maxHeight: '85vh',
                },
            }}
        >
            <Box sx={{ width: '100%' }}>
                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        borderBottom: '1px solid #E5E7EB',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Calendar size={24} />
                        <Typography variant="h6" fontWeight={600}>
                            {t('holiday_title', 'วันหยุดประจำปี')}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {/* Year Selector */}
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <Select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                sx={{
                                    color: 'white',
                                    fontWeight: 600,
                                    '.MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(255,255,255,0.3)',
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(255,255,255,0.5)',
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'white',
                                    },
                                    '.MuiSvgIcon-root': {
                                        color: 'white',
                                    },
                                }}
                            >
                                {years.map((year) => (
                                    <MenuItem key={year} value={year}>
                                        {locale === 'th' ? year + 543 : year}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
                            <X size={22} />
                        </IconButton>
                    </Box>
                </Box>

                {/* Holiday Count Summary */}
                <Box sx={{ p: 2, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Chip
                            icon={<Calendar size={16} color="#DC2626" />}
                            label={`${t('holiday_company_count', 'วันหยุดบริษัท')} ${holidays.length} ${t('holiday_days', 'วัน')}`}
                            sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 500 }}
                        />
                    </Box>
                </Box>

                {/* Holiday List */}
                <Box sx={{ p: 2, maxHeight: 'calc(85vh - 180px)', overflowY: 'auto' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : months.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Calendar size={48} color="#9CA3AF" />
                            <Typography color="text.secondary" sx={{ mt: 2 }}>
                                {t('holiday_no_data', 'ไม่มีข้อมูลวันหยุดสำหรับปีนี้')}
                            </Typography>
                        </Box>
                    ) : (
                        months.map((month) => (
                            <Box key={month} sx={{ mb: 3 }}>
                                {/* Month Header */}
                                <Typography
                                    variant="subtitle1"
                                    sx={{
                                        fontWeight: 600,
                                        color: '#667eea',
                                        mb: 1.5,
                                        pb: 0.5,
                                        borderBottom: '2px solid #667eea',
                                        display: 'inline-block',
                                    }}
                                >
                                    {dayjs().month(month).locale(locale).format('MMMM')}
                                </Typography>

                                {/* Holidays in this month */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {holidaysByMonth[month].map((holiday) => {
                                        const holidayDate = dayjs(holiday.date);
                                        const isWeekend = holidayDate.day() === 0 || holidayDate.day() === 6;
                                        const isPast = holidayDate.isBefore(dayjs(), 'day');
                                        
                                        // แปลชื่อวันหยุด
                                        const holidayName = t(holiday.name, holiday.name);

                                        return (
                                            <Box
                                                key={holiday.id}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 2,
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: isPast ? '#F9FAFB' : 'white',
                                                    border: '1px solid #E5E7EB',
                                                    opacity: isPast ? 0.7 : 1,
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                                    },
                                                }}
                                            >
                                                {/* Date Badge - สีแดงสำหรับวันหยุดบริษัท */}
                                                <Box
                                                    sx={{
                                                        minWidth: 50,
                                                        height: 50,
                                                        borderRadius: 2,
                                                        bgcolor: '#FEE2E2',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <Typography
                                                        variant="h6"
                                                        sx={{ fontWeight: 700, color: '#DC2626', lineHeight: 1 }}
                                                    >
                                                        {holidayDate.format('D')}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{ color: '#DC2626', fontSize: '0.65rem', fontWeight: 500 }}
                                                    >
                                                        {holidayDate.locale(locale).format('ddd')}
                                                    </Typography>
                                                </Box>

                                                {/* Holiday Info */}
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            fontWeight: 500,
                                                            color: '#1F2937',
                                                            fontSize: '0.95rem',
                                                        }}
                                                    >
                                                        {holidayName}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                                                        {t('holiday_type_company', 'วันหยุดบริษัท')}
                                                        {isWeekend && ` • ${t('holiday_weekend', 'ตรงวันหยุด')}`}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>
                        ))
                    )}
                </Box>
            </Box>
        </Drawer>
    );
}

export type { Holiday };
