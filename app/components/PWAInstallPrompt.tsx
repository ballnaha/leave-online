'use client';
import React, { useState } from 'react';
import { Box, Typography, Button, IconButton, Stack, Dialog, DialogContent, DialogTitle } from '@mui/material';
import { X, Share, PlusSquare } from 'lucide-react';
import { usePWA } from '../providers/PWAProvider';

const GooglePlayIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20">
        <path fill="currentColor" d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
    </svg>
);

const AppleIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20">
        <path fill="currentColor" d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.69C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.89,2C16,3.17 15.6,4.23 14.9,5.08C14.21,6.04 13.04,6.45 12.04,6.43C11.8,5.27 12.21,4.26 13,3.5Z" />
    </svg>
);

export default function PWAInstallPrompt() {
    const { isInstallPromptVisible, isStandalone, installPWA, hideInstallPrompt, isIOS } = usePWA();
    const [openIOSInstructions, setOpenIOSInstructions] = useState(false);

    if (!isInstallPromptVisible || isStandalone) return null;

    const handleIOSClick = () => {
        setOpenIOSInstructions(true);
    };

    return (
        <>
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: 2,
                    zIndex: 2000,
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    animation: 'slideUp 0.3s ease-out',
                    '@keyframes slideUp': {
                        from: { transform: 'translateY(100%)' },
                        to: { transform: 'translateY(0)' }
                    },
                    pb: 'calc(env(safe-area-inset-bottom, 20px) + 16px)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1b194b' }}>
                            ติดตั้งแอปพลิเคชัน
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                            เพื่อประสบการณ์การใช้งานที่ดียิ่งขึ้น
                        </Typography>
                    </Box>
                    <IconButton 
                        size="small" 
                        onClick={hideInstallPrompt}
                        sx={{ color: '#999' }}
                    >
                        <X size={24} />
                    </IconButton>
                </Box>

                <Stack direction="row" spacing={1.5} sx={{ width: '100%', overflowX: 'auto', pb: 0.5 }}>
                    {/* Show Android button if NOT iOS */}
                    {!isIOS && (
                        <Button
                            variant="contained"
                            onClick={installPWA}
                            sx={{
                                flex: 1,
                                bgcolor: 'black',
                                color: 'white',
                                textTransform: 'none',
                                borderRadius: 2,
                                py: 0.75,
                                px: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 1,
                                minWidth: 'fit-content',
                                '&:hover': { bgcolor: '#333' }
                            }}
                        >
                            <GooglePlayIcon />
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
                                <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.9, letterSpacing: 0.5 }}>Install on</Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Android</Typography>
                            </Box>
                        </Button>
                    )}

                    {/* Show iOS button if iOS or if we want to show both (but let's be smart) */}
                    {/* Actually, let's show both if we are not sure, or just the relevant one. 
                        If isIOS is true, show iOS button. If false, show Android button.
                        If we are on desktop, maybe show both? 
                        For now, let's stick to showing the relevant one to avoid confusion.
                    */}
                    {isIOS && (
                        <Button
                            variant="contained"
                            onClick={handleIOSClick}
                            sx={{
                                flex: 1,
                                bgcolor: 'black',
                                color: 'white',
                                textTransform: 'none',
                                borderRadius: 2,
                                py: 0.75,
                                px: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 1,
                                minWidth: 'fit-content',
                                '&:hover': { bgcolor: '#333' }
                            }}
                        >
                            <AppleIcon />
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
                                <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.9, letterSpacing: 0.5 }}>Install on</Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>iOS</Typography>
                            </Box>
                        </Button>
                    )}
                </Stack>
            </Box>

            {/* iOS Instructions Dialog */}
            <Dialog 
                open={openIOSInstructions} 
                onClose={() => setOpenIOSInstructions(false)}
                PaperProps={{
                    sx: { borderRadius: 3, maxWidth: 320 }
                }}
            >
                <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', pb: 1 }}>
                    Install on iOS
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: '50%' }}>
                                <Share size={24} color="#007AFF" />
                            </Box>
                            <Typography variant="body2">
                                1. Tap the <b>Share</b> button in the menu bar.
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: '50%' }}>
                                <PlusSquare size={24} color="#000" />
                            </Box>
                            <Typography variant="body2">
                                2. Scroll down and select <b>Add to Home Screen</b>.
                            </Typography>
                        </Box>
                    </Stack>
                </DialogContent>
                <Box sx={{ p: 2, pt: 0 }}>
                    <Button 
                        fullWidth 
                        variant="contained" 
                        onClick={() => setOpenIOSInstructions(false)}
                        sx={{ borderRadius: 2, bgcolor: '#007AFF' }}
                    >
                        Got it
                    </Button>
                </Box>
            </Dialog>
        </>
    );
}
