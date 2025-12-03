'use client';
import React from 'react';
import { Box, Typography, Card, Chip, CircularProgress } from '@mui/material';
import { useLocale } from '../providers/LocaleProvider';

interface RecentActivityCardProps {
    title: string;
    date: string;
    status: 'Approved' | 'Pending' | 'Rejected' | 'Cancelled';
    image?: string;
    icon?: React.ReactNode;
    iconColor?: string;
    approvalStatus?: string;
    currentLevel?: number;  // ลำดับที่อนุมัติถึงปัจจุบัน
    totalLevels?: number;   // จำนวนขั้นตอนทั้งหมด
}

const RecentActivityCard = ({ title, date, status, image, icon, iconColor = '#5E72E4', approvalStatus, currentLevel, totalLevels }: RecentActivityCardProps) => {
    const { t } = useLocale();

    // คำนวณ progress จาก workflow จริง
    const calculateProgress = () => {
        if (status === 'Approved') return 100;
        if (status === 'Rejected' || status === 'Cancelled') return 0;
        
        // ถ้ามีข้อมูล workflow ให้คำนวณจาก level จริง
        if (currentLevel !== undefined && totalLevels && totalLevels > 0) {
            // currentLevel = จำนวนที่อนุมัติแล้ว, totalLevels = ขั้นตอนทั้งหมด
            return Math.round((currentLevel / totalLevels) * 100);
        }
        
        // fallback สำหรับ pending ที่ไม่มีข้อมูล workflow
        return 50;
    };

    const progress = calculateProgress();

    const statusColors = {
        Approved: { color: '#00C853', bgcolor: '#E8F5E9', label: t('status_approved', 'อนุมัติแล้ว') },
        Pending: { color: '#FFAB00', bgcolor: '#FFF8E1', label: t('status_pending', 'รออนุมัติ') },
        Rejected: { color: '#FF1744', bgcolor: '#FFEBEE', label: t('status_rejected', 'ไม่อนุมัติ') },
        Cancelled: { color: '#9E9E9E', bgcolor: '#F5F5F5', label: t('status_cancelled', 'ยกเลิก') },
    };

    const currentStatus = statusColors[status] || statusColors.Pending;
    
    // สร้างสีพื้นหลังอ่อนจากสี icon
    const lightBgColor = iconColor ? `${iconColor}15` : '#F4F7FE';

    return (
        <Card
            sx={{
                p: 2,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
                borderRadius: '20px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.05)',
                }
            }}
        >
            <Box
                sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    bgcolor: image ? 'transparent' : lightBgColor,
                    color: iconColor,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                }}
            >
                {image ? (
                    <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                ) : icon ? (
                    icon
                ) : (
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {title.charAt(0)}
                    </Typography>
                )}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                    variant="subtitle1" 
                    sx={{ 
                        fontWeight: 'bold', 
                        lineHeight: 1.3, 
                        mb: 0.5, 
                        fontSize: '1rem', 
                        color: '#2B3674',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {title}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.8rem' }}>
                    {date}
                </Typography>
                {approvalStatus && (
                    <Typography variant="caption" sx={{ fontSize: '0.75rem', color: currentStatus.color, fontWeight: 'medium' }}>
                        {approvalStatus}
                    </Typography>
                )}
            </Box>

            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress 
                    variant="determinate" 
                    value={100} 
                    size={40} 
                    thickness={4} 
                    sx={{ color: '#E9EDF7', position: 'absolute' }} 
                />
                <CircularProgress 
                    variant="determinate" 
                    value={progress} 
                    size={40} 
                    thickness={4} 
                    sx={{ color: currentStatus.color }} 
                />
                <Box
                    sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Typography variant="caption" component="div" color="text.secondary" sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>
                        {progress}%
                    </Typography>
                </Box>
            </Box>
        </Card>
    );
};

export default RecentActivityCard;
