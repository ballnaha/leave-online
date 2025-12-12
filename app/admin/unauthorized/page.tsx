'use client';

import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { SecuritySafe, Home2, Lock1, ArrowLeft } from 'iconsax-react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/app/providers/LocaleProvider';

export default function UnauthorizedPage() {
    const router = useRouter();
    const { t } = useLocale();

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Background decorative elements */}
            <Box
                sx={{
                    position: 'absolute',
                    top: -100,
                    right: -100,
                    width: 300,
                    height: 300,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    bottom: -150,
                    left: -150,
                    width: 400,
                    height: 400,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '10%',
                    width: 150,
                    height: 150,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)',
                }}
            />

            <Container maxWidth="sm">
                <Box
                    sx={{
                        textAlign: 'center',
                        bgcolor: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 4,
                        p: { xs: 4, sm: 6 },
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    {/* Lock Icon with animation effect */}
                    <Box
                        sx={{
                            width: 100,
                            height: 100,
                            mx: 'auto',
                            mb: 3,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A5A 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 10px 30px rgba(238, 90, 90, 0.4)',
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                                '0%': {
                                    transform: 'scale(1)',
                                    boxShadow: '0 10px 30px rgba(238, 90, 90, 0.4)',
                                },
                                '50%': {
                                    transform: 'scale(1.05)',
                                    boxShadow: '0 15px 40px rgba(238, 90, 90, 0.5)',
                                },
                                '100%': {
                                    transform: 'scale(1)',
                                    boxShadow: '0 10px 30px rgba(238, 90, 90, 0.4)',
                                },
                            },
                        }}
                    >
                        <Lock1 size={48} color="white" variant="Bold" />
                    </Box>

                    {/* Error Code */}
                    <Typography
                        sx={{
                            fontSize: '4rem',
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 1,
                            lineHeight: 1,
                        }}
                    >
                        403
                    </Typography>

                    {/* Title */}
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 700,
                            color: '#1E293B',
                            mb: 2,
                        }}
                    >
                        {t('access_denied', 'ไม่มีสิทธิ์เข้าถึง')}
                    </Typography>

                    {/* Description */}
                    <Typography
                        sx={{
                            color: '#64748B',
                            fontSize: '1rem',
                            lineHeight: 1.6,
                            mb: 4,
                            px: { xs: 0, sm: 2 },
                        }}
                    >
                        {t('access_denied_desc', 'ขออภัย คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบหากคุณคิดว่านี่เป็นข้อผิดพลาด')}
                    </Typography>

                    {/* Admin badge info */}
                    <Box
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1,
                            bgcolor: '#FEF3C7',
                            color: '#D97706',
                            px: 2,
                            py: 1,
                            borderRadius: 2,
                            mb: 4,
                        }}
                    >
                        <SecuritySafe size={18} color="#D97706" variant="Bold" />
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            {t('admin_only', 'สำหรับผู้ดูแลระบบเท่านั้น')}
                        </Typography>
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<Home2 size={20} variant="Bold" />}
                            onClick={() => router.push('/')}
                            sx={{
                                py: 1.5,
                                px: 4,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '1rem',
                                background: 'linear-gradient(135deg, #6C63FF 0%, #5A52D5 100%)',
                                boxShadow: '0 4px 15px rgba(108, 99, 255, 0.4)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #5A52D5 0%, #4A42C5 100%)',
                                    boxShadow: '0 6px 20px rgba(108, 99, 255, 0.5)',
                                    transform: 'translateY(-2px)',
                                },
                                transition: 'all 0.3s ease',
                            }}
                        >
                            {t('go_home', 'กลับหน้าหลัก')}
                        </Button>

                        <Button
                            variant="text"
                            size="large"
                            startIcon={<ArrowLeft size={20} />}
                            onClick={() => router.back()}
                            sx={{
                                py: 1,
                                color: '#64748B',
                                textTransform: 'none',
                                fontWeight: 500,
                                '&:hover': {
                                    bgcolor: 'rgba(0,0,0,0.04)',
                                    color: '#475569',
                                },
                            }}
                        >
                            {t('go_back', 'ย้อนกลับ')}
                        </Button>
                    </Box>
                </Box>

                {/* Footer text */}
                <Typography
                    sx={{
                        textAlign: 'center',
                        mt: 4,
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '0.85rem',
                    }}
                >
                    {t('need_help', 'หากต้องการความช่วยเหลือ กรุณาติดต่อ HR')}
                </Typography>
            </Container>
        </Box>
    );
}
