'use client';
import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    IconButton,
    Container,
    Grid,
} from '@mui/material';
import { 
    ArrowLeft,
    Heart,
    Briefcase,
    Umbrella,
    HelpCircle,
    ChevronRight,
    Calendar,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/app/components/BottomNav';

// ประเภทการลา
const leaveTypes = [
    {
        code: 'sick',
        name: 'ลาป่วย',
        nameEn: 'Sick Leave',
        icon: Heart,
        color: '#EF5350',
        lightColor: '#FFEBEE',
        description: 'ลาป่วยตามใบรับรองแพทย์',
        remainingDays: 28,
        maxDays: 30,
    },
    {
        code: 'personal',
        name: 'ลากิจ',
        nameEn: 'Personal Leave',
        icon: Briefcase,
        color: '#AB47BC',
        lightColor: '#F3E5F5',
        description: 'ลาเพื่อกิจธุระส่วนตัว',
        remainingDays: 5,
        maxDays: 7,
    },
    {
        code: 'vacation',
        name: 'ลาพักร้อน',
        nameEn: 'Vacation Leave',
        icon: Umbrella,
        color: '#FF7043',
        lightColor: '#FBE9E7',
        description: 'ลาพักผ่อนประจำปี',
        remainingDays: 10,
        maxDays: 15,
    },
    {
        code: 'other',
        name: 'ลาอื่นๆ',
        nameEn: 'Other Leave',
        icon: HelpCircle,
        color: '#5C6BC0',
        lightColor: '#E8EAF6',
        description: 'ลาบวช, ลาคลอด, ลาอื่นๆ',
        remainingDays: null,
        maxDays: null,
    },
];

export default function LeaveTypesPage() {
    const router = useRouter();

    const handleSelectLeaveType = (code: string) => {
        router.push(`/leave/${code}`);
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
            {/* Header */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #6C63FF 0%, #5A54D6 100%)',
                    pt: 2,
                    pb: 4,
                    px: 2.5,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Decorative circles */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: -50,
                        right: -50,
                        width: 150,
                        height: 150,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.1)',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -30,
                        left: -30,
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.08)',
                    }}
                />

                {/* Back button and title */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <IconButton
                        onClick={() => router.back()}
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                        }}
                    >
                        <ArrowLeft size={20} />
                    </IconButton>
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                        เลือกประเภทการลา
                    </Typography>
                </Box>

                {/* Header info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                        sx={{
                            width: 56,
                            height: 56,
                            borderRadius: 3,
                            bgcolor: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Calendar size={28} color="white" />
                    </Box>
                    <Box>
                        <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                            ยื่นคำขอลา
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                            เลือกประเภทการลาที่ต้องการ
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Leave Types List */}
            <Container maxWidth="sm" sx={{ mt: -2, px: 2.5 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {leaveTypes.map((leaveType) => {
                        const IconComponent = leaveType.icon;
                        
                        return (
                            <Card
                                key={leaveType.code}
                                onClick={() => handleSelectLeaveType(leaveType.code)}
                                sx={{
                                    borderRadius: 3,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    border: '1px solid transparent',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: 4,
                                        borderColor: leaveType.color,
                                    },
                                }}
                            >
                                <CardContent sx={{ p: 2.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            {/* Icon */}
                                            <Box
                                                sx={{
                                                    width: 52,
                                                    height: 52,
                                                    borderRadius: 3,
                                                    bgcolor: leaveType.lightColor,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <IconComponent size={26} color={leaveType.color} />
                                            </Box>

                                            {/* Info */}
                                            <Box>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.25 }}>
                                                    {leaveType.name}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                                    {leaveType.description}
                                                </Typography>
                                                {leaveType.remainingDays !== null && (
                                                    <Typography 
                                                        variant="caption" 
                                                        sx={{ 
                                                            color: leaveType.color,
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        คงเหลือ {leaveType.remainingDays}/{leaveType.maxDays} วัน
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>

                                        {/* Arrow */}
                                        <ChevronRight size={24} color="#9e9e9e" />
                                    </Box>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Box>

                {/* Info note */}
                <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.light', borderRadius: 2, opacity: 0.8 }}>
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500, mb: 0.5 }}>
                        📌 หมายเหตุ
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        • ลาป่วยเกิน 3 วัน ต้องมีใบรับรองแพทย์<br/>
                        • ลาพักร้อนควรแจ้งล่วงหน้าอย่างน้อย 3 วัน<br/>
                        • ลากิจควรแจ้งล่วงหน้าอย่างน้อย 1 วัน
                    </Typography>
                </Box>
            </Container>

            <BottomNav />
        </Box>
    );
}
