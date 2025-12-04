'use client';
import React, { useMemo, useState } from 'react';
import { Box, Typography, IconButton, Badge, Avatar, Skeleton } from '@mui/material';
import { Notification } from 'iconsax-react';
import Sidebar from './Sidebar';
import ImageSlider from './ImageSlider';
import { useLocale } from '../providers/LocaleProvider';
import { useUser } from '../providers/UserProvider';

const Header = () => {
    const { t, locale } = useLocale();
    const { user, loading } = useUser();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const dateLocale = useMemo(() => (locale === 'th' ? 'th-TH' : locale === 'my' ? 'my-MM' : 'en-US'), [locale]);
    const currentDate = new Date().toLocaleDateString(dateLocale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    // แสดง Sidebar สำหรับทุกคนยกเว้น employee
    const showSidebar = !!user && user.role !== 'employee';

    return (
        <>
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2, 
                pt: 3, 
                pb: 1,
                
                mx: { xs: -2, md: 0 },
                px: 2,
                borderBottom: '1px solid #f0f0f0',
                width: { xs: '100vw', md: '100%' },
                position: 'relative',
                left: { xs: '50%', md: 'auto' },
                transform: { xs: 'translateX(-50%)', md: 'none' },
            }}>
                {/* Top Row: Menu, Avatar, Date/Greeting, Notification */}
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 50,
                    maxWidth: 1200,
                    mx: 'auto',
                    width: '100%',
                    px: 2,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {/* แสดง Hamburger Menu สำหรับทุกคนยกเว้น employee */}
                        {showSidebar && (
                            <IconButton
                                onClick={() => setIsSidebarOpen(true)}
                                sx={{ 
                                    color: 'text.primary',
                                    width: 40,
                                    height: 40,
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        width: 20,
                                        height: 16,
                                        position: 'relative',
                                        '& span': {
                                            display: 'block',
                                            position: 'absolute',
                                            height: 2,
                                            bgcolor: 'primary.main',
                                            borderRadius: 1,
                                            transition: 'all 0.3s ease',
                                        },
                                    }}
                                >
                                    <Box
                                        component="span"
                                        sx={{
                                            width: 20,
                                            top: 0,
                                        }}
                                    />
                                    <Box
                                        component="span"
                                        sx={{
                                            width: 14,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            left: 0,
                                        }}
                                    />
                                    <Box
                                        component="span"
                                        sx={{
                                            width: 20,
                                            bottom: 0,
                                            left: 0,
                                        }}
                                    />
                                </Box>
                            </IconButton>
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {loading ? (
                                <Skeleton variant="circular" width={54} height={54} />
                            ) : (
                                <Avatar
                                    alt={user ? `${user.firstName} ${user.lastName}` : 'User'}
                                    src={user?.avatar || undefined}
                                    sx={{
                                        width: 54,
                                        height: 54,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                        border: '2px solid #fff',
                                        bgcolor: 'primary.main',
                                        '& img': {
                                            objectFit: 'cover',
                                            objectPosition: 'center',
                                        },
                                    }}
                                >
                                    {user?.firstName?.charAt(0)?.toUpperCase()}
                                </Avatar>
                            )}
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25, fontSize: '0.7rem' }}>
                                    {currentDate}
                                </Typography>
                                {loading ? (
                                    <Skeleton variant="text" width={100} height={24} />
                                ) : (
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1, color: 'text.primary', fontSize: '1rem' }}>
                                        {user?.firstName || 'ผู้ใช้'}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    <IconButton
                        sx={{
                            bgcolor: 'white',
                            boxShadow: 'none',
                            width: 40,
                            height: 40,
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                        }}
                    >
                        <Badge variant="dot" color="error" overlap="circular">
                            <Notification size={20} variant="Outline" color="#64748B" />
                        </Badge>
                    </IconButton>
                </Box>
            </Box>

            {/* แสดง Sidebar สำหรับทุกคนยกเว้น employee */}
            {showSidebar && (
                <Sidebar open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            )}
        </>
    );
};

export default Header;
