import React from 'react';
import { Box, Typography, Card, CardContent, LinearProgress } from '@mui/material';

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
    
    const percentage = total > 0 ? (count / total) * 100 : 0;

    return (
        <Card
            sx={{
                minWidth: 150,
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
                borderRadius: '20px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                bgcolor: '#F4F7FE', // Light background like in the image
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                }
            }}
        >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box
                        sx={{
                            width: 42,
                            height: 42,
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: mainColor,
                            bgcolor: 'white',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                        }}
                    >
                        {icon}
                    </Box>
                    <Box
                        sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'white',
                            color: '#FF4081', // Pinkish color for delete/action icon
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                        }}
                    >
                        {/* Using a generic dot or icon here */}
                        <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'currentColor' }} />
                    </Box>
                </Box>

                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.2, mb: 0.4, fontSize: '0.95rem', color: '#2B3674' }}>
                        {title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 1, display: 'block' }}>
                        เหลือ {count} วัน
                    </Typography>
                    
                    <LinearProgress 
                        variant="determinate" 
                        value={percentage} 
                        sx={{ 
                            height: 6, 
                            borderRadius: 3,
                            bgcolor: '#E9EDF7',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: mainColor,
                                borderRadius: 3,
                            }
                        }} 
                    />
                </Box>
            </CardContent>
        </Card>
    );
};

export default LeaveTypeCard;
