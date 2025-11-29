'use client';
import React, { useMemo, useState } from 'react';
import { Box, Typography, IconButton, Badge, Avatar, Skeleton } from '@mui/material';
import { Bell, Menu } from 'lucide-react';
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

    // ตรวจสอบว่าเป็น admin, hr หรือ hr_manager ไหม
    const isAdminOrHR = ['admin', 'hr', 'hr_manager'].includes(user?.role || '');

    return (
        <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, pb: 1 }}>
                {/* Top Row: Menu, Avatar, Date/Greeting, Notification */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {/* แสดง Hamburger Menu เฉพาะ admin หรือ hr */}
                        {isAdminOrHR && (
                            <IconButton
                                onClick={() => setIsSidebarOpen(true)}
                                sx={{
                                    bgcolor: 'white',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                    width: 40,
                                    height: 40,
                                    '&:hover': { bgcolor: 'grey.50' }
                                }}
                            >
                                <Menu size={20} className="text-gray-700" />
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
                                        {t('greeting', 'สวัสดี')}, {user?.firstName || 'ผู้ใช้'}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    <IconButton
                        sx={{
                            bgcolor: 'background.paper',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            width: 40,
                            height: 40,
                            '&:hover': { bgcolor: 'background.paper' }
                        }}
                    >
                        <Badge variant="dot" color="error" overlap="circular">
                            <Bell size={20} className="text-gray-600" />
                        </Badge>
                    </IconButton>
                </Box>

                {/* Image Slider */}
                <ImageSlider />
            </Box>

            {/* แสดง Sidebar เฉพาะ admin หรือ hr */}
            {isAdminOrHR && (
                <Sidebar open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            )}
        </>
    );
};

export default Header;
