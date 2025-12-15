'use client';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Box, Typography, IconButton, Badge, Avatar, Skeleton, Chip } from '@mui/material';
import { Notification, Building, Briefcase, Calendar, User, Profile2User, ArrowRight2 } from 'iconsax-react';
import { Drawer } from 'vaul';
import Sidebar from './Sidebar';
import { useLocale } from '../providers/LocaleProvider';
import { useUser } from '../providers/UserProvider';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import 'dayjs/locale/en';
import 'dayjs/locale/my';

const Header = () => {
    const { t, locale } = useLocale();
    const { user, loading } = useUser();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);

    const dateLocale = useMemo(() => (locale === 'th' ? 'th-TH' : locale === 'my' ? 'my-MM' : 'en-US'), [locale]);
    const currentDate = new Date().toLocaleDateString(dateLocale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    // Fetch unread count only
    const fetchUnreadCount = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch('/api/notifications?limit=1');
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }, [user]);

    useEffect(() => {
        fetchUnreadCount();
        // Refresh every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    const handleNotificationClick = () => {
        router.push('/notifications');
    };

    // Format date for profile drawer
    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        const date = dayjs(dateString).locale(locale);
        const year = locale === 'th' ? date.year() + 543 : date.year();
        return `${date.format('D MMMM')} ${year}`;
    };

    // Get role label
    const getRoleLabel = (role: string): string => {
        const roleLabels: Record<string, string> = {
            employee: t('role_employee', 'พนักงาน'),
            section_head: t('role_section_head', 'หัวหน้าแผนก'),
            shift_supervisor: t('role_shift_supervisor', 'หัวหน้ากะ'),
            dept_manager: t('role_dept_manager', 'ผู้จัดการฝ่าย/ส่วน'),
            hr_manager: t('role_hr_manager', 'ผู้จัดการ HR'),
            admin: t('role_admin', 'ผู้ดูแลระบบ'),
            hr: t('role_hr', 'ฝ่ายทรัพยากรบุคคล'),
        };
        return roleLabels[role] || role;
    };

    // Get employee type label
    const getEmployeeTypeLabel = (type: string) => {
        switch (type) {
            case 'monthly':
                return t('employee_type_monthly', 'พนักงานรายเดือน');
            case 'daily':
                return t('employee_type_daily', 'พนักงานรายวัน');
            default:
                return type;
        }
    };

    // Get gender symbol and color
    const getGenderInfo = (gender: string | undefined) => {
        if (gender === 'male') return { symbol: '♂', color: '#2196F3' };
        if (gender === 'female') return { symbol: '♀', color: '#E91E63' };
        return { symbol: '', color: '#9E9E9E' };
    };

    // Calculate work duration
    const calculateWorkDuration = (startDateString: string | null) => {
        if (!startDateString) return null;
        const startDate = new Date(startDateString);
        const now = new Date();
        let years = now.getFullYear() - startDate.getFullYear();
        let months = now.getMonth() - startDate.getMonth();
        let days = now.getDate() - startDate.getDate();
        if (days < 0) {
            months--;
            const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            days += lastMonth.getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }
        const parts = [];
        if (years > 0) parts.push(`${years} ${t('year', 'ปี')}`);
        if (months > 0) parts.push(`${months} ${t('month', 'เดือน')}`);
        if (days > 0) parts.push(`${days} ${t('day', 'วัน')}`);
        return parts.length > 0 ? parts.join(' ') : `0 ${t('day', 'วัน')}`;
    };

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
                    pl: 2,
                    pr: 0,
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
                                    onClick={() => setProfileDrawerOpen(true)}
                                    alt={user ? `${user.firstName} ${user.lastName}` : 'User'}
                                    src={user?.avatar || undefined}
                                    sx={{
                                        width: 54,
                                        height: 54,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                        border: '2px solid #fff',
                                        bgcolor: 'primary.main',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                        '&:hover': {
                                            transform: 'scale(1.05)',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        },
                                        '&:active': {
                                            transform: 'scale(0.98)',
                                        },
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
                        onClick={handleNotificationClick}
                        sx={{
                            bgcolor: 'white',
                            boxShadow: 'none',
                            width: 40,
                            height: 40,
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                        }}
                    >
                        <Badge 
                            badgeContent={unreadCount > 0 ? unreadCount : undefined}
                            color="error" 
                            overlap="circular"
                            variant={unreadCount > 0 ? "standard" : undefined}
                            sx={{
                                '& .MuiBadge-badge': {
                                    fontSize: '0.65rem',
                                    minWidth: 16,
                                    height: 16,
                                    top: -5,
                                    right: -1,
                                }
                            }}
                        >
                            <Notification size={20} variant="Outline" color="#64748B" />
                        </Badge>
                    </IconButton>
                </Box>
            </Box>

            {/* แสดง Sidebar สำหรับทุกคนยกเว้น employee */}
            {showSidebar && (
                <Sidebar open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            )}

            {/* Profile Drawer */}
            <Drawer.Root
                open={profileDrawerOpen}
                onOpenChange={setProfileDrawerOpen}
                shouldScaleBackground={false}
            >
                <Drawer.Portal>
                    <Drawer.Overlay
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)',
                            zIndex: 1300,
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                        }}
                    />
                    <Drawer.Content
                        style={{
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: '#FAFBFC',
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            maxHeight: '85vh',
                            zIndex: 1300,
                            display: 'flex',
                            flexDirection: 'column',
                            outline: 'none',
                            boxShadow: '0 -10px 50px rgba(0,0,0,0.15)',
                        }}
                    >
                        <Drawer.Title style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
                            {t('profile', 'โปรไฟล์')}
                        </Drawer.Title>
                        <Drawer.Description style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
                            {t('user_profile_info', 'ข้อมูลผู้ใช้งาน')}
                        </Drawer.Description>

                        <Box sx={{ width: '100%', bgcolor: '#FAFBFC', display: 'flex', flexDirection: 'column', maxHeight: '85vh', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
                            {/* Header with Gradient */}
                            <Box
                                sx={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    px: 2.5,
                                    pt: 1.5,
                                    pb: 4,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    borderTopLeftRadius: 24,
                                    borderTopRightRadius: 24,
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: -50,
                                        right: -50,
                                        width: 150,
                                        height: 150,
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(255,255,255,0.1)',
                                    },
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        bottom: -30,
                                        left: -30,
                                        width: 100,
                                        height: 100,
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(255,255,255,0.08)',
                                    },
                                }}
                            >
                                {/* Drag Handle */}
                                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                                    <Drawer.Handle
                                        style={{
                                            width: 48,
                                            height: 5,
                                            borderRadius: 3,
                                            backgroundColor: 'rgba(255,255,255,0.5)',
                                        }}
                                    />
                                </Box>

                                {/* Avatar Section */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 , mb:5 }}>
                                    <Avatar
                                        alt={user ? `${user.firstName} ${user.lastName}` : 'User'}
                                        src={user?.avatar || undefined}
                                        sx={{
                                            width: 120,
                                            height: 120,
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                                            border: '4px solid rgba(255,255,255,0.9)',
                                            bgcolor: 'white',
                                            color: 'primary.main',
                                            fontSize: '3rem',
                                            fontWeight: 600,
                                            '& img': {
                                                objectFit: 'cover',
                                                objectPosition: 'center',
                                            },
                                        }}
                                    >
                                        {user?.firstName?.charAt(0)?.toUpperCase()}
                                    </Avatar>
                                    
                                    {/* Name and Role */}
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            color: 'white',
                                            fontWeight: 700,
                                            mt: 2,
                                            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                        }}
                                    >
                                        {user?.firstName} {user?.lastName}
                                        {user?.gender && (
                                            <Box
                                                component="span"
                                                sx={{
                                                    color: getGenderInfo(user.gender).color,
                                                    fontSize: '1.2rem',
                                                    bgcolor: 'rgba(255,255,255,0.9)',
                                                    borderRadius: '50%',
                                                    width: 28,
                                                    height: 28,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                {getGenderInfo(user.gender).symbol}
                                            </Box>
                                        )}
                                    </Typography>

                                    <Chip
                                        label={user?.role ? getRoleLabel(user.role) : ''}
                                        size="small"
                                        sx={{
                                            mt: 1,
                                            bgcolor: 'rgba(255,255,255,0.2)',
                                            color: 'white',
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                            backdropFilter: 'blur(4px)',
                                        }}
                                    />
                                </Box>
                            </Box>

                            {/* Content */}
                            <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
                                {/* Employee Info Card */}
                                <Box
                                    sx={{
                                        bgcolor: 'white',
                                        borderRadius: 1,
                                        p: 2,
                                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                                        mb: 2,
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 2, fontWeight: 600 }}>
                                        {t('employee_info', 'ข้อมูลพนักงาน')}
                                    </Typography>

                                    {/* Employee ID */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Box sx={{ 
                                            width: 40, 
                                            height: 40, 
                                            borderRadius: 2, 
                                            bgcolor: '#EEF2FF', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center' 
                                        }}>
                                            <User size={20} color="#667eea" variant="Bold" />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {t('employee_id', 'รหัสพนักงาน')}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {user?.employeeId || '-'}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Company */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Box sx={{ 
                                            width: 40, 
                                            height: 40, 
                                            borderRadius: 2, 
                                            bgcolor: '#FEF3C7', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center' 
                                        }}>
                                            <Building size={20} color="#F59E0B" variant="Bold" />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {t('company', 'บริษัท')}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {user?.companyName || '-'}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Department / Section */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Box sx={{ 
                                            width: 40, 
                                            height: 40, 
                                            borderRadius: 2, 
                                            bgcolor: '#DCFCE7', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center' 
                                        }}>
                                            <Profile2User size={20} color="#22C55E" variant="Bold" />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {t('department_section', 'ฝ่าย/แผนก')}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {user?.departmentName || '-'}{user?.sectionName ? ` / ${user.sectionName}` : ''}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Position */}
                                    {user?.position && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Box sx={{ 
                                                width: 40, 
                                                height: 40, 
                                                borderRadius: 2, 
                                                bgcolor: '#FCE7F3', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center' 
                                            }}>
                                                <Briefcase size={20} color="#EC4899" variant="Bold" />
                                            </Box>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                    {t('position', 'ตำแหน่ง')}
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {user.position}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}

                                    {/* Employee Type */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{ 
                                            width: 40, 
                                            height: 40, 
                                            borderRadius: 2, 
                                            bgcolor: '#E0E7FF', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center' 
                                        }}>
                                            <Briefcase size={20} color="#6366F1" variant="Bold" />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {t('employee_type', 'ประเภทพนักงาน')}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {user?.employeeType ? getEmployeeTypeLabel(user.employeeType) : '-'}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Start Date */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                                        <Box sx={{ 
                                            width: 40, 
                                            height: 40, 
                                            borderRadius: 2, 
                                            bgcolor: '#DBEAFE', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center' 
                                        }}>
                                            <Calendar size={20} color="#3B82F6" variant="Bold" />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {t('start_date', 'วันที่เริ่มงาน')}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {formatDate(user?.startDate || null)}
                                                {user?.startDate && (
                                                    <Typography component="span" variant="caption" sx={{ color: 'primary.main', ml: 1 }}>
                                                        ({calculateWorkDuration(user.startDate)})
                                                    </Typography>
                                                )}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* View Full Profile Button */}
                                <Box
                                    onClick={() => {
                                        setProfileDrawerOpen(false);
                                        router.push('/profile');
                                    }}
                                    sx={{
                                        bgcolor: 'white',
                                        borderRadius: 3,
                                        p: 2,
                                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            bgcolor: '#F8FAFC',
                                            transform: 'translateX(4px)',
                                        },
                                        '&:active': {
                                            transform: 'scale(0.98)',
                                        },
                                    }}
                                >
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                        {t('view_full_profile', 'ดูโปรไฟล์ทั้งหมด')}
                                    </Typography>
                                    <ArrowRight2 size={20} color="#667eea" />
                                </Box>
                            </Box>
                        </Box>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </>
    );
};

export default Header;
