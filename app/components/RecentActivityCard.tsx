import React from 'react';
import { Box, Typography, Card, Chip, IconButton } from '@mui/material';
import { ChevronRight } from 'lucide-react';

interface RecentActivityCardProps {
    title: string;
    date: string;
    status: 'Approved' | 'Pending' | 'Rejected';
    image?: string;
}

const RecentActivityCard = ({ title, date, status, image }: RecentActivityCardProps) => {
    const statusColors = {
        Approved: { color: 'success.main', bgcolor: 'success.light', label: 'อนุมัติแล้ว' },
        Pending: { color: 'warning.main', bgcolor: 'warning.light', label: 'รออนุมัติ' },
        Rejected: { color: 'error.main', bgcolor: 'error.light', label: 'ถูกปฏิเสธ' },
    };

    const currentStatus = statusColors[status];

    return (
        <Card
            sx={{
                p: 1.5,
                mb: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
                '&:hover': {
                    boxShadow: 3,
                }
            }}
        >
            <Box
                sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    bgcolor: 'grey.100',
                    overflow: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {image ? (
                    <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.light' }}>
                        {title.charAt(0)}
                    </Typography>
                )}
            </Box>

            <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.2, mb: 0.3, fontSize: '0.9rem' }}>
                    {title}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75, fontSize: '0.7rem' }}>
                    {date}
                </Typography>
                <Chip
                    label={currentStatus.label}
                    size="small"
                    sx={{
                        height: 22,
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        color: currentStatus.color,
                        bgcolor: currentStatus.bgcolor,
                        borderRadius: 1.5
                    }}
                />
            </Box>

            <Box sx={{ color: 'text.secondary' }}>
                <ChevronRight size={18} />
            </Box>
        </Card>
    );
};

export default RecentActivityCard;
