'use client';
import React, { useMemo, useState } from 'react';
import { Box, Typography, IconButton, InputBase, Paper, Badge, Avatar } from '@mui/material';
import { Search, Bell, SlidersHorizontal, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { useLocale } from '../providers/LocaleProvider';

const Header = () => {
    const { t, locale } = useLocale();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const dateLocale = useMemo(() => (locale === 'th' ? 'th-TH' : locale === 'my' ? 'my-MM' : 'en-US'), [locale]);
    const currentDate = new Date().toLocaleDateString(dateLocale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });

    return (
        <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, pb: 1 }}>
                {/* Top Row: Menu, Avatar, Date/Greeting, Notification */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                                alt="User Profile"
                                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"
                                sx={{
                                    width: 44,
                                    height: 44,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                    border: '2px solid #fff',
                                    display: { xs: 'none', sm: 'block' }
                                }}
                            />
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25, fontSize: '0.7rem' }}>
                                    {currentDate}
                                </Typography>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1, color: 'text.primary', fontSize: '1rem' }}>
                                    {t('greeting', 'สวัสดี')}, บอล
                                </Typography>
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

                {/* Search Bar */}
                <Box sx={{ position: 'relative' }}>
                    <Paper
                        component="form"
                        elevation={0}
                        sx={{
                            p: '2px 4px',
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            height: 44,
                            borderRadius: 3,
                            boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
                            bgcolor: 'background.paper'
                        }}
                    >
                        <Box sx={{ p: '8px', color: 'text.disabled', display: 'flex' }}>
                            <Search size={18} />
                        </Box>
                        <InputBase
                            sx={{ ml: 0.5, flex: 1, fontSize: '0.875rem', fontWeight: 500 }}
                            placeholder={t('search_placeholder', 'ค้นหาประวัติการลา...')}
                            inputProps={{ 'aria-label': 'search leave history' }}
                        />
                        <IconButton
                            sx={{
                                p: '6px',
                                mr: 0.5,
                                bgcolor: 'primary.main',
                                color: 'white',
                                borderRadius: 2,
                                '&:hover': { bgcolor: 'primary.dark' },
                                boxShadow: '0 2px 8px rgba(108, 99, 255, 0.3)'
                            }}
                        >
                            <SlidersHorizontal size={16} />
                        </IconButton>
                    </Paper>
                </Box>
            </Box>

            <Sidebar open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        </>
    );
};

export default Header;
