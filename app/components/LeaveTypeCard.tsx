import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

interface LeaveTypeCardProps {
    title: string;
    count: number;
    total: number;
    color: string; // Expecting hex code or MUI palette color
    icon?: React.ReactNode;
}

const LeaveTypeCard = ({ title, count, total, color, icon }: LeaveTypeCardProps) => {
    // Helper to determine if color is a hex code or palette key
    const isHex = color.startsWith('#');
    const mainColor = isHex ? color : `${color}.main`;
    const lightColor = isHex ? `${color}20` : `${color}.light`; // Fallback opacity for hex

    return (
        <Card
            sx={{
                minWidth: 150,
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                }
            }}
        >
            {/* Decorative Background Circle */}
            <Box
                sx={{
                    position: 'absolute',
                    right: -16,
                    top: -16,
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    opacity: 0.1,
                    bgcolor: mainColor,
                }}
            />

            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box
                        sx={{
                            width: 42,
                            height: 42,
                            borderRadius: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            bgcolor: mainColor,
                            boxShadow: 2,
                        }}
                    >
                        {icon}
                    </Box>
                    <Box
                        sx={{
                            px: 1.25,
                            py: 0.4,
                            borderRadius: 50,
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            bgcolor: lightColor,
                            color: mainColor,
                        }}
                    >
                        {count}/{total} วัน
                    </Box>
                </Box>

                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.2, mb: 0.4, fontSize: '0.95rem' }}>
                        {title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        วันลาคงเหลือ
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
};

export default LeaveTypeCard;
