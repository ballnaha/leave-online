'use client';
import React from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import { Download, X } from 'lucide-react';
import { usePWA } from '../providers/PWAProvider';

export default function PWAInstallPrompt() {
    const { isInstallPromptVisible, isStandalone, installPWA, hideInstallPrompt } = usePWA();

    if (!isInstallPromptVisible || isStandalone) return null;

    return (
        <Box
sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        p: 2,
        zIndex: 2000,

        bgcolor: 'rgba(255, 255, 255, 0.25)',   // โปร่งใส
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.3)',

        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',

        animation: 'slideUp 0.3s ease-out',
        '@keyframes slideUp': {
            from: { transform: 'translateY(100%)' },
            to: { transform: 'translateY(0)' }
        },
        pb: 'calc(env(safe-area-inset-bottom, 20px) + 16px)',
    }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: '#1b194b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                    }}
                >
                    <Download size={20} />
                </Box>
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1b194b' }}>
                        ติดตั้งแอปพลิเคชัน
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                        เพื่อการใช้งานที่ดียิ่งขึ้น
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                    variant="contained"
                    size="small"
                    onClick={installPWA}
                    sx={{
                        bgcolor: '#1b194b',
                        color: 'white',
                        textTransform: 'none',
                        borderRadius: 2,
                        '&:hover': {
                            bgcolor: '#2d2a6e'
                        }
                    }}
                >
                    ติดตั้ง
                </Button>
                <IconButton 
                    size="small" 
                    onClick={hideInstallPrompt}
                    sx={{ color: '#999' }}
                >
                    <X size={20} />
                </IconButton>
            </Box>
        </Box>
    );
}
