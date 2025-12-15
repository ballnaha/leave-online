'use client';
import React from 'react';
import { Box, Typography, Chip, alpha } from '@mui/material';
import { useLocale } from '../providers/LocaleProvider';
import { Calendar, ArrowRight2, CalendarTick, Clock } from 'iconsax-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

interface LeaveTimelineItem {
    id: number;
    leaveCode?: string;
    title: string;
    date: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason?: string;
    createdAt?: string;
    status: 'Approved' | 'Pending' | 'Rejected' | 'Cancelled';
    icon: React.ReactNode;
    iconColor: string;
    approvalStatus?: string;
    waitingForApprover?: string;
    currentLevel?: number;
    totalLevels?: number;
    onClick?: () => void;
}

interface LeaveTimelineProps {
    items: LeaveTimelineItem[];
    displayMode?: 'list' | 'swiper';
}

const LeaveTimeline = ({ items, displayMode = 'list' }: LeaveTimelineProps) => {
    const { t } = useLocale();

    const statusConfig = {
        Approved: {
            color: '#10B981',
            bgColor: 'rgba(16, 185, 129, 0.12)',
            label: 'อนุมัติแล้ว',
            gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
        },
        Pending: {
            color: '#F59E0B',
            bgColor: 'rgba(245, 158, 11, 0.12)',
            label: 'รออนุมัติ',
            gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
        },
        Rejected: {
            color: '#EF4444',
            bgColor: 'rgba(239, 68, 68, 0.12)',
            label: 'ไม่อนุมัติ',
            gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
        },
        Cancelled: {
            color: '#6B7280',
            bgColor: 'rgba(107, 114, 128, 0.12)',
            label: 'ยกเลิก',
            gradient: 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
        },
    };

    // Helper function to format date for left side display (with year)
    const formatDateForDisplay = (startDate: string) => {
        const date = new Date(startDate);
        const day = date.getDate().toString();
        const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const month = monthNames[date.getMonth()];
        const year = (date.getFullYear() + 543).toString().slice(-2); // ปี พ.ศ. 2 หลัก

        return { day, month, year };
    };

    // Format date range to short format
    const formatDateRange = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

        if (start.getTime() === end.getTime()) {
            return start.toLocaleDateString('th-TH', options);
        }
        return `${start.toLocaleDateString('th-TH', options)} - ${end.toLocaleDateString('th-TH', options)}`;
    };

    // Format createdAt date
    const formatCreatedAt = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    if (items.length === 0) {
        return (
            <Box sx={{
                textAlign: 'center',
                py: 6,
                px: 3,
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.95) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(226, 232, 240, 0.6)',
            }}>
                <Box sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: 'rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2
                }}>
                    <Calendar size={28} color="#6366F1" />
                </Box>
                <Typography variant="body1" sx={{ color: '#64748B', fontWeight: 500 }}>
                    {t('home_no_leave_requests', 'ยังไม่มีคำขอลา')}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8', mt: 0.5, display: 'block' }}>
                    {t('home_no_leave_desc', 'คำขอลาของคุณจะแสดงที่นี่')}
                </Typography>
            </Box>
        );
    }

    const renderItem = (item: LeaveTimelineItem) => {
        const status = statusConfig[item.status] || statusConfig.Pending;
        const dateInfo = formatDateForDisplay(item.startDate);
        const dateRange = formatDateRange(item.startDate, item.endDate);
        const createdAtFormatted = formatCreatedAt(item.createdAt);

        return (
            <Box
                onClick={item.onClick}
                sx={{
                    display: 'flex',
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    '@media (hover: hover)': {
                        transition: 'transform 0.2s ease-out',
                        '&:hover': {
                            transform: 'translateX(4px)',
                        },
                        '&:hover .timeline-card': {
                            boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                        },
                        '&:hover .date-box': {
                            transform: 'scale(1.02)',
                        }
                    },
                    '&:active': {
                        opacity: 0.85,
                    }
                }}
            >
                {/* Left Date Box */}
                <Box
                    className="date-box"
                    sx={{
                        width: 70,
                        minHeight: 100,
                        background: item.iconColor ? `linear-gradient(135deg, ${item.iconColor} 0%, ${alpha(item.iconColor, 0.7)} 100%)` : status.gradient,
                        borderRadius: '16px 0 0 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        flexShrink: 0,
                        boxShadow: `0 4px 20px ${alpha(item.iconColor || status.color, 0.3)}`,
                        '@media (hover: hover)': {
                            transition: 'transform 0.2s ease-out',
                        },
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: '0.65rem',
                            fontWeight: 500,
                            opacity: 0.9,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}
                    >
                        {dateInfo.month}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            lineHeight: 1.1,
                            mt: 0.25
                        }}
                    >
                        {dateInfo.day}
                    </Typography>
                    {/* Year */}
                    <Typography
                        sx={{
                            fontSize: '0.65rem',
                            fontWeight: 500,
                            opacity: 0.85,
                            mt: 0.25
                        }}
                    >
                        {'\''}{dateInfo.year}
                    </Typography>

                    {/* Total Days Badge */}
                    <Box
                        sx={{
                            mt: 0.75,
                            px: 1,
                            py: 0.25,
                            bgcolor: 'rgba(255,255,255,0.25)',
                            borderRadius: '8px',
                            backdropFilter: 'blur(4px)',
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                letterSpacing: '0.3px'
                            }}
                        >
                            {item.totalDays} {t('days', 'วัน')}
                        </Typography>
                    </Box>
                </Box>

                {/* Right Content Card */}
                <Box
                    className="timeline-card"
                    sx={{
                        flex: 1,
                        bgcolor: 'white',
                        borderRadius: '0 16px 16px 0',
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                        '@media (hover: hover)': {
                            transition: 'box-shadow 0.2s ease-out',
                        },
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Created At - Top Right */}
                    {createdAtFormatted && (
                        <Typography
                            sx={{
                                position: 'absolute',
                                top: 8,
                                right: 12,
                                fontSize: '0.65rem',
                                color: '#94A3B8',
                                fontWeight: 500,
                            }}
                        >
                            {t('submitted_at', 'ยื่นเมื่อ')} {createdAtFormatted}
                        </Typography>
                    )}

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0, mt: createdAtFormatted ? 1.5 : 0 }}>
                        {/* Title with Leave Code */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, minWidth: 0 }}>
                            <Typography
                                sx={{
                                    fontWeight: 600,
                                    fontSize: '0.95rem',
                                    color: '#1E293B',
                                    lineHeight: 1.3,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {item.title}
                            </Typography>

                            {item.leaveCode && (
                                <Typography sx={{
                                    fontSize: '0.75rem',
                                    color: '#64748B',
                                    fontFamily: 'monospace',
                                    bgcolor: '#F1F5F9',
                                    px: 0.5,
                                    borderRadius: 0.5
                                }}>
                                    #{item.leaveCode}
                                </Typography>
                            )}
                        </Box>

                        {/* Date Range */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <CalendarTick size={14} color="#94A3B8" />
                            <Typography
                                sx={{
                                    fontSize: '0.75rem',
                                    color: '#64748B',
                                    fontWeight: 500
                                }}
                            >
                                {dateRange}
                            </Typography>
                        </Box>

                        {/* Reason */}
                        {item.reason && (
                            <Typography
                                sx={{
                                    fontSize: '0.8rem',
                                    color: '#000',
                                    fontWeight: 400,
                                    mb: 0.75,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontStyle: 'italic',
                                }}
                            >
                                "{item.reason}"
                            </Typography>
                        )}

                        {/* Status and Waiting Info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                                icon={
                                    <Box
                                        sx={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            bgcolor: status.color,
                                            ml: 0.5
                                        }}
                                    />
                                }
                                label={t(`status_${item.status.toLowerCase()}`, status.label)}
                                size="medium"
                                sx={{
                                    height: 22,
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    bgcolor: status.bgColor,
                                    color: status.color,
                                    border: 'none',
                                    '& .MuiChip-label': {
                                        px: 0.75,
                                    },
                                    '& .MuiChip-icon': {
                                        ml: 0.5,
                                        mr: -0.5
                                    }
                                }}
                            />

                            {item.status === 'Pending' && item.waitingForApprover && (
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    bgcolor: 'rgba(245, 158, 11, 0.08)',
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: '6px'
                                }}>
                                    <Clock size={12} color="#F59E0B" />
                                    <Typography
                                        sx={{
                                            fontSize: '0.75rem',
                                            color: '#D97706',
                                            fontWeight: 500,
                                            maxWidth: 100,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {t('waiting_for', 'รอ')} {item.waitingForApprover}
                                    </Typography>
                                </Box>
                            )}

                            {item.totalLevels && item.totalLevels > 0 && item.status === 'Pending' && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                                    {Array.from({ length: Math.min(item.totalLevels, 4) }).map((_, i) => (
                                        <Box
                                            key={i}
                                            sx={{
                                                width: 7,
                                                height: 7,
                                                borderRadius: '50%',
                                                bgcolor: i < (item.currentLevel || 0) ? '#10B981' : '#E2E8F0',
                                                transition: 'background-color 0.3s',
                                            }}
                                        />
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {/* Arrow Icon */}
                    <Box
                        sx={{
                            color: '#CBD5E1',
                            display: 'flex',
                            alignItems: 'center',
                            '@media (hover: hover)': {
                                transition: 'all 0.2s ease-out',
                                '.timeline-card:hover &': {
                                    transform: 'translateX(4px)',
                                    color: '#94A3B8'
                                }
                            }
                        }}
                    >
                        <ArrowRight2 size={20} color="currentColor" />
                    </Box>
                </Box>
            </Box>
        );
    };

    if (displayMode === 'swiper') {
        return (
            <Box
                sx={{
                    width: 'calc(100% + 40px)',
                    ml: -2.5,
                    overflowX: 'clip',
                    overflowY: 'visible',
                }}
            >
                <Swiper
                    spaceBetween={12}
                    slidesPerView={1.05}
                    style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 8, paddingBottom: 16 }}
                >
                    {items.map((item) => (
                        <SwiperSlide key={item.id}>
                            {renderItem(item)}
                        </SwiperSlide>
                    ))}
                </Swiper>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {items.map((item) => (
                <React.Fragment key={item.id}>{renderItem(item)}</React.Fragment>
            ))}
        </Box>
    );
};

export default LeaveTimeline;
