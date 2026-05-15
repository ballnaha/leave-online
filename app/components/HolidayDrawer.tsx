'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { CloseCircle, Calendar } from 'iconsax-react';
import { useLocale } from '@/app/providers/LocaleProvider';
import { useUser } from '@/app/providers/UserProvider';
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
    deductFromAnnualLeave?: boolean;
    company?: {
        id: number;
        code: string;
        name: string;
    } | null;
}

interface HolidayDrawerProps {
    open: boolean;
    onClose: () => void;
    initialYear?: number;
}

const asArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value : [];

const drawerEasing = {
    enter: 'cubic-bezier(0.22, 1, 0.36, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
};

const drawerTimeout = {
    enter: 420,
    exit: 240,
};

export default function HolidayDrawer({ open, onClose, initialYear }: HolidayDrawerProps) {
    const { t, locale } = useLocale();
    const { user } = useUser();
    const [selectedYear, setSelectedYear] = useState(initialYear || dayjs().year());
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Swipe to close states
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const startYRef = useRef(0);
    const dragYRef = useRef(0);
    const velocityRef = useRef(0);
    const lastYRef = useRef(0);
    const lastTimeRef = useRef(0);
    const contentRef = useRef<HTMLDivElement>(null);

    // Generate years for dropdown
    const currentYear = dayjs().year();
    const years = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i);

    // Fetch holidays when drawer opens
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
            const res = await fetch(`/api/holidays?year=${selectedYear}&includeCompany=true`);
            if (res.ok) {
                const data = await res.json();
                setHolidays(asArray<Holiday>(data));
            }
        } catch (error) {
            console.error('Error fetching holidays:', error);
        } finally {
            setLoading(false);
        }
    };

    const visibleHolidays = useMemo(() => {
        return holidays.filter((holiday) =>
            holiday.companyId == null || holiday.company?.code === user?.company
        );
    }, [holidays, user?.company]);

    // Group holidays by month
    const holidaysByMonth = useMemo(() => {
        return visibleHolidays.reduce((acc, holiday) => {
            const month = dayjs(holiday.date).month();
            if (!acc[month]) {
                acc[month] = [];
            }
            acc[month].push(holiday);
            return acc;
        }, {} as Record<number, Holiday[]>);
    }, [visibleHolidays]);

    const months = Object.keys(holidaysByMonth).map(Number).sort((a, b) => a - b);

    const setDragOffset = (value: number) => {
        dragYRef.current = value;
        setDragY(value);
    };

    // Handle touch/swipe to close
    const handleTouchStart = (e: React.TouchEvent) => {
        // Check if content is scrolled to top or touching the handle area
        const target = e.target as HTMLElement;
        const isHandle = target.closest('[data-drag-handle]');
        const isScrolledToTop = contentRef.current ? contentRef.current.scrollTop <= 0 : true;
        
        if (isHandle || isScrolledToTop) {
            startYRef.current = e.touches[0].clientY;
            lastYRef.current = e.touches[0].clientY;
            lastTimeRef.current = Date.now();
            velocityRef.current = 0;
            setIsDragging(true);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        
        const currentY = e.touches[0].clientY;
        const currentTime = Date.now();
        const diff = currentY - startYRef.current;
        
        // Calculate velocity for momentum
        const timeDiff = currentTime - lastTimeRef.current;
        if (timeDiff > 0) {
            velocityRef.current = (currentY - lastYRef.current) / timeDiff;
        }
        lastYRef.current = currentY;
        lastTimeRef.current = currentTime;
        
        // Only allow dragging down with resistance effect
        if (diff > 0) {
            // Add rubber band effect - resistance increases as you drag further
            const resistance = 0.55;
            const resistedDiff = diff * resistance;
            setDragOffset(resistedDiff);
            
            // Prevent scroll when dragging
            e.preventDefault();
        }
    };

    const handleTouchEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        
        // Use velocity and distance to determine if should close
        const currentDragY = dragYRef.current;
        const shouldClose = currentDragY > 80 || (velocityRef.current > 0.5 && currentDragY > 30);
        
        if (shouldClose) {
            setIsClosing(true);
            // Let the drawer close first, then call onClose
            requestAnimationFrame(() => {
                onClose();
                // Reset states after a short delay
                setTimeout(() => {
                    setIsClosing(false);
                    setDragOffset(0);
                }, 50);
            });
        } else {
            // Snap back with spring animation
            setDragOffset(0);
        }
    };

    // Reset drag when drawer closes
    useEffect(() => {
        if (!open) {
            setDragOffset(0);
            setIsDragging(false);
            setIsClosing(false);
        }
    }, [open]);

    const handleHandleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClose();
        }
    };

    return (
        <Drawer
            anchor="bottom"
            open={open && !isClosing}
            onClose={onClose}
            transitionDuration={drawerTimeout}
            ModalProps={{
                keepMounted: true,
            }}
            slotProps={{
                backdrop: {
                    sx: {
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        opacity: dragY > 0 ? `${Math.max(0, 1 - dragY / 300)} !important` : undefined,
                        transition: isDragging ? 'none' : `opacity ${drawerTimeout.exit}ms ${drawerEasing.exit}`,
                    },
                },
                transition: {
                    easing: drawerEasing,
                    timeout: drawerTimeout,
                },
            }}
            PaperProps={{
                sx: {
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    maxHeight: '85vh',
                    transform: dragY > 0 ? `translateY(${dragY}px) !important` : undefined,
                    transition: isDragging 
                        ? 'none' 
                        : `transform ${drawerTimeout.enter}ms ${drawerEasing.enter}`,
                    willChange: 'transform',
                    overflow: 'hidden',
                },
            }}
        >
            <Box 
                sx={{ 
                    width: '100%',
                    touchAction: isDragging ? 'none' : 'auto',
                    opacity: open && !isClosing ? 1 : 0,
                    transform: open && !isClosing ? 'translateY(0)' : 'translateY(10px)',
                    transition: isDragging
                        ? 'none'
                        : `opacity 240ms ${drawerEasing.enter} 80ms, transform 300ms ${drawerEasing.enter} 80ms`,
                    willChange: 'opacity, transform',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle */}
                <Box
                    data-drag-handle
                    role="button"
                    tabIndex={0}
                    aria-label={t('close', 'ปิด')}
                    onClick={onClose}
                    onKeyDown={handleHandleKeyDown}
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        pt: 1,
                        pb: 0.5,
                        cursor: 'grab',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                        touchAction: 'none',
                        userSelect: 'none',
                    }}
                >
                    <Box
                        sx={{
                            width: 36,
                            height: 4,
                            borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.4)',
                        }}
                    />
                </Box>
                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        pt: 1,
                        borderBottom: '1px solid #E5E7EB',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Calendar size={24} variant="Bold" />
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
                            <CloseCircle size={22} />
                        </IconButton>
                    </Box>
                </Box>

                {/* Holiday Count Summary */}
                <Box sx={{ p: 2, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Chip
                            icon={<Calendar size={16} color="#DC2626" variant="Bold" />}
                            label={`${t('holiday_type_company', 'วันหยุดบริษัท')} ${visibleHolidays.length} ${t('holiday_days', 'วัน')}`}
                            sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 500 }}
                        />
                    </Box>
                </Box>

                {/* Holiday List */}
                <Box 
                    ref={contentRef}
                    sx={{ 
                        p: 2, 
                        maxHeight: 'calc(85vh - 180px)', 
                        overflowY: 'auto',
                        overscrollBehavior: 'contain',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : months.length === 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                            <Calendar size={48} color="#9CA3AF" variant="Bulk" />
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
                                                    borderRadius: 1,
                                                    bgcolor: isPast ? '#F8FAFC' : 'white',
                                                    border: isPast ? '1px solid #EEF2F7' : '1px solid #E5E7EB',
                                                    opacity: isPast ? 0.55 : 1,
                                                    filter: isPast ? 'grayscale(35%)' : 'none',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        boxShadow: isPast ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
                                                    },
                                                }}
                                            >
                                                {/* Date Badge - สีแดงสำหรับวันหยุดบริษัท */}
                                                <Box
                                                    sx={{
                                                        minWidth: 50,
                                                        height: 50,
                                                        borderRadius: 1,
                                                        bgcolor: isPast ? '#F1F5F9' : '#FEE2E2',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <Typography
                                                        variant="h6"
                                                        sx={{ fontWeight: 700, color: isPast ? '#94A3B8' : '#DC2626', lineHeight: 1 }}
                                                    >
                                                        {holidayDate.format('D')}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{ color: isPast ? '#94A3B8' : '#DC2626', fontSize: '0.65rem', fontWeight: 500 }}
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
                                                            color: isPast ? '#94A3B8' : '#1F2937',
                                                            fontSize: '0.95rem',
                                                        }}
                                                    >
                                                        {holidayName}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                        <Typography variant="caption" sx={{ color: isPast ? '#CBD5E1' : '#9CA3AF' }}>
                                                            {t('holiday_type_company', 'วันหยุดบริษัท')}
                                                            {isWeekend && ` • ${t('holiday_weekend', 'ตรงวันหยุด')}`}
                                                        </Typography>
                                                        {/* แสดง remark เฉพาะบริษัท ถ้าวันหยุดไม่ใช่ของทุกบริษัท */}
                                                        {holiday.companyId != null && holiday.company && (
                                                            <Chip
                                                                size="small"
                                                                label={`${t('only_for', 'เฉพาะ')} ${holiday.company.code}`}
                                                                title={holiday.company.name}
                                                                sx={{
                                                                    height: 18,
                                                                    fontSize: '0.65rem',
                                                                    bgcolor: '#FEF3C7',
                                                                    color: '#92400E',
                                                                    fontWeight: 500,
                                                                }}
                                                            />
                                                        )}
                                                    </Box>
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
