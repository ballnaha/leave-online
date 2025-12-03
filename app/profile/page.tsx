'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Avatar, Paper, IconButton, Chip, Switch, Divider, Dialog, DialogTitle, DialogContent, List, ListItemButton, ListItemText, Skeleton, CircularProgress, Button, Stack } from '@mui/material';
import { localeLabel, useLocale } from '../providers/LocaleProvider';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/types/user-role';
import { useOneSignal } from '../providers/OneSignalProvider';
import { useUser, type UserProfile } from '../providers/UserProvider';
import { APP_VERSION } from '@/lib/version';
import {
    Edit2,
    Logout,
    Sms,
    Call,
    Location,
    Calendar,
    Award,
    Notification,
    Moon,
    Global,
    Lock,
    Shield,
    MessageQuestion,
    DocumentText,
    ArrowRight2,
    User,
    Profile2User,
    Mobile,
    Briefcase,
    Building,
    HashtagSquare,
    Icon as IconsaxIcon,
} from 'iconsax-react';
import { Share, PlusSquare } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { signOut, useSession } from 'next-auth/react';
import { useToastr } from '@/app/components/Toastr';
import { usePWA } from '../providers/PWAProvider';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import 'dayjs/locale/en';
import 'dayjs/locale/my';



// Type definitions for settings items
interface SettingsItemBase {
    id?: string;
    icon: IconsaxIcon;
    label: string;
    color: string;
    subtitle?: string;
}

interface SettingsItemWithLink extends SettingsItemBase {
    link: string;
    toggle?: never;
    value?: never;
    onChange?: never;
}

interface SettingsItemWithToggle extends SettingsItemBase {
    toggle: true;
    value: boolean;
    onChange: (value: boolean) => void;
    link?: never;
}

type SettingsItem = SettingsItemWithLink | SettingsItemWithToggle;

interface SettingsSection {
    title: string;
    items: SettingsItem[];
}

export default function ProfilePage() {
    const { locale, setLocale, t } = useLocale();
    const { data: session } = useSession();
    const router = useRouter();
    const toastr = useToastr();
    const { isSupported: pushSupported, isSubscribed: pushSubscribed, isInitialized: pushInitialized, permission: pushPermission, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = useOneSignal();
    const { isStandalone, deferredPrompt, installPWA, isIOS } = usePWA();
    const [pushLoading, setPushLoading] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [emailNotif, setEmailNotif] = useState(true);
    const [openLanguage, setOpenLanguage] = useState(false);
    const [openIOSInstructions, setOpenIOSInstructions] = useState(false);
    const { user: profile, loading: userLoading } = useUser();
    const [mounted, setMounted] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    
    const languageOptions: Array<{ code: 'th' | 'en' | 'my'; label: string }> = [
        { code: 'th', label: localeLabel.th },
        { code: 'en', label: localeLabel.en },
        { code: 'my', label: localeLabel.my },
    ];

    const handleLogout = async () => {
        setIsLoggingOut(true);

        try {
            // 1. Clear localStorage
            localStorage.clear();

            // 2. Clear sessionStorage
            sessionStorage.clear();

            // 3. Clear all cookies via API
            await fetch('/api/auth/logout', { method: 'POST' });

            // 4. Clear cookies on client side (all domains/paths)
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                const eqPos = cookie.indexOf('=');
                const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                const trimmedName = name.trim();
                // Clear with different path variations
                document.cookie = `${trimmedName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                document.cookie = `${trimmedName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
                document.cookie = `${trimmedName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            }

            // 5. Clear all caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }

            // 6. Unregister all Service Workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(
                    registrations.map(registration => registration.unregister())
                );
            }

            // 7. Clear IndexedDB databases
            if ('indexedDB' in window) {
                const databases = await indexedDB.databases?.() || [];
                databases.forEach((db: { name?: string }) => {
                    if (db.name) {
                        indexedDB.deleteDatabase(db.name);
                    }
                });
            }

            toastr.success(t('logout_success', 'ออกจากระบบสำเร็จ'));

            // Sign out from NextAuth and redirect to login
            await signOut({
                callbackUrl: '/login',
                redirect: true,
            });

        } catch (error) {
            console.error('Logout error:', error);
            toastr.error(t('logout_error', 'เกิดข้อผิดพลาดในการออกจากระบบ'));
            setIsLoggingOut(false);
        }
    };

    useEffect(() => {
        setMounted(true);

        // Set theme-color for status bar to match header gradient
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        const originalColor = metaThemeColor?.getAttribute('content') || '#EAF2F8';
        
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', '#667eea');
        } else {
            const newMeta = document.createElement('meta');
            newMeta.name = 'theme-color';
            newMeta.content = '#667eea';
            document.head.appendChild(newMeta);
        }

        // Cleanup: restore original theme-color when leaving page
        return () => {
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) {
                meta.setAttribute('content', originalColor);
            }
        };
    }, []);
    
    // Get initials for avatar
    const getInitials = () => {
        if (profile) {
            const firstInitial = profile.firstName.charAt(0);
            const lastInitial = profile.lastName.charAt(0);
            return `${firstInitial}${lastInitial}`;
        }
        return '';
    };

    // Format date
    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        const date = dayjs(dateString).locale(locale);
        const year = locale === 'th' ? date.year() + 543 : date.year();
        return `${date.format('D MMMM')} ${year}`;
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

    // Get gender symbol
    const getGenderSymbol = (gender: string | undefined) => {
        if (gender === 'male') return '♂';
        if (gender === 'female') return '♀';
        return '';
    };

    // Get gender color
    const getGenderColor = (gender: string | undefined) => {
        if (gender === 'male') return '#2196F3';
        if (gender === 'female') return '#E91E63';
        return '#9E9E9E';
    };

    // Calculate work duration from start date until now
    const calculateWorkDuration = (startDateString: string | null) => {
        if (!startDateString) return null;
        
        const startDate = new Date(startDateString);
        const now = new Date();
        
        let years = now.getFullYear() - startDate.getFullYear();
        let months = now.getMonth() - startDate.getMonth();
        let days = now.getDate() - startDate.getDate();
        
        // Adjust for negative days
        if (days < 0) {
            months--;
            const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            days += lastMonth.getDate();
        }
        
        // Adjust for negative months
        if (months < 0) {
            years--;
            months += 12;
        }
        
        // Build duration string
        const parts = [];
        if (years > 0) parts.push(`${years} ${t('year', 'ปี')}`);
        if (months > 0) parts.push(`${months} ${t('month', 'เดือน')}`);
        if (days > 0) parts.push(`${days} ${t('day', 'วัน')}`);
        
        return parts.length > 0 ? parts.join(' ') : `0 ${t('day', 'วัน')}`;
    };
    
    // Prevent hydration mismatch by always showing loading state until mounted
    // But if we already have profile data from cache, show it immediately
    const showLoading = !mounted && !profile;

    // Handle push notification toggle
    const handlePushToggle = async (value: boolean) => {
        setPushLoading(true);
        try {
            if (value) {
                await pushSubscribe();
                toastr.success(t('push_enabled_success', 'เปิดการแจ้งเตือนสำเร็จ'));
            } else {
                await pushUnsubscribe();
                toastr.info(t('push_disabled_success', 'ปิดการแจ้งเตือนแล้ว'));
            }
        } catch (error: any) {
            console.error('Push toggle error:', error);
            const errorMsg = error?.message || 'เกิดข้อผิดพลาด';
            if (errorMsg.includes('not initialized') || errorMsg.includes('not loaded')) {
                toastr.error(t('push_not_ready', 'ระบบแจ้งเตือนยังไม่พร้อม กรุณารีเฟรชหน้า'));
            } else {
                toastr.error(t('error_retry', 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'));
            }
        } finally {
            setPushLoading(false);
        }
    };

    // Get push notification subtitle based on status
    const getPushSubtitle = () => {
        if (!pushSupported) return t('browser_not_supported', 'เบราว์เซอร์ไม่รองรับ');
        if (!pushInitialized) return t('status_loading', 'กำลังโหลด...');
        if (pushPermission === 'denied') return t('blocked_notifications', 'ถูกบล็อก - กรุณาเปิดในการตั้งค่าเบราว์เซอร์');
        if (pushSubscribed) return t('status_enabled', 'เปิดใช้งาน');
        return t('status_disabled', 'ปิดอยู่');
    };

    const settingsSections: SettingsSection[] = [
        {
            title: t('account', 'บัญชี'),
            items: [
                { icon: Profile2User, label: t('edit_profile', 'แก้ไขโปรไฟล์'), color: '#667eea', link: '/profile/edit' },
                
            ],
        },
        {
            title: t('notifications', 'การแจ้งเตือน'),
            items: [
                { 
                    id: 'notifications',
                    icon: Notification, 
                    label: t('notifications', 'การแจ้งเตือน'), 
                    color: '#FFD93D', 
                    toggle: true, 
                    value: pushSubscribed, 
                    onChange: handlePushToggle,
                    subtitle: getPushSubtitle(),
                } as SettingsItemWithToggle,
                
            ],
        },
        {
            title: t('general_settings', 'การตั้งค่าทั่วไป'),
            items: [
                
                { id: 'language', icon: Global, label: t('common_language', 'ภาษา'), color: '#1976D2', subtitle: localeLabel[locale], link: '#' },
            ],
        },
        {
            title: t('help_info', 'ช่วยเหลือและข้อมูล'),
            items: [
                { icon: MessageQuestion, label: t('help_center', 'ศูนย์ช่วยเหลือ'), color: '#00ACC1', link: '#' },
                ...(!isStandalone ? [{ 
                    icon: Mobile, 
                    label: t('install_app', 'ติดตั้งแอปพลิเคชัน'), 
                    subtitle: isIOS ? t('for_ios', 'สำหรับ iOS') : t('for_android', 'สำหรับ Android'),
                    color: '#4CAF50', 
                    link: '#install' 
                }] : []),
            ],
        },
    ];

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#F8F9FA', pb: 10 }}>
            {/* Header with Gradient */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    pt: 'calc(env(safe-area-inset-top, 0px) + 24px)',
                    pb: 8,
                    px: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: -50,
                        right: -50,
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: -30,
                        left: -30,
                        width: 150,
                        height: 150,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                    },
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, position: 'relative', zIndex: 1 }}>
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                        {t('common_profile', 'โปรไฟล์')}
                    </Typography>
                    <IconButton 
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        sx={{ 
                            bgcolor: 'rgba(255, 255, 255, 0.2)', 
                            color: 'white', 
                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
                            '&.Mui-disabled': {
                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                opacity: 0.7,
                            },
                        }}
                    >
                        {isLoggingOut ? <CircularProgress size={20} color="inherit" /> : <Logout size={20} color="white" />}
                    </IconButton>
                </Box>
            </Box>

            {/* Profile Card */}
            <Box sx={{ px: 2, mt: -5, position: 'relative', zIndex: 2 }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 3,
                        borderRadius: 2,
                        background: 'white',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                        border: '1px solid rgba(0, 0, 0, 0.05)',
                        transition: 'opacity 0.2s ease-in-out',
                        opacity: showLoading ? 0.7 : 1,
                    }}
                >
                    {showLoading ? (
                        <>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                                <Skeleton variant="circular" width={80} height={80} />
                                <Box sx={{ flex: 1 }}>
                                    <Skeleton variant="text" width={160} height={28} />
                                    <Skeleton variant="rounded" width={100} height={24} sx={{ mt: 0.5 }} />
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {[1,2,3,4].map((i) => (
                                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Skeleton variant="rounded" width={36} height={36} sx={{ borderRadius: 1.5 }} />
                                        <Box sx={{ flex: 1 }}>
                                            <Skeleton variant="text" width={120} height={18} />
                                            <Skeleton variant="text" width={200} height={20} />
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </>
                    ) : (
                    <>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Box sx={{ position: 'relative' }}>
                            <Avatar
                                src={profile?.avatar || undefined}
                                sx={{
                                    width: 80,
                                    height: 80,
                                    background: profile?.avatar ? 'transparent' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                                }}
                            >
                                {!profile?.avatar && getInitials()}
                            </Avatar>
                            <IconButton
                                onClick={() => router.push('/profile/edit')}
                                sx={{
                                    position: 'absolute',
                                    bottom: -5,
                                    right: -5,
                                    width: 32,
                                    height: 32,
                                    bgcolor: 'white',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                    '&:hover': { bgcolor: '#f5f5f5' },
                                }}
                            >
                                <Edit2 size={14} variant="Bold" color="#667eea" />
                            </IconButton>
                        </Box>
                        <Box sx={{ ml: 2, flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    {profile ? `${profile.firstName} ${profile.lastName}` : '-'}
                                </Typography>
                                {profile?.gender && (
                                    <Typography 
                                        component="span" 
                                        sx={{ 
                                            fontSize: '1.7rem', 
                                            color: getGenderColor(profile.gender),
                                            fontWeight: 700,
                                        }}
                                    >
                                        {getGenderSymbol(profile.gender)}
                                    </Typography>
                                )}
                            </Box>
                            <Chip
                                label={profile ? getEmployeeTypeLabel(profile.employeeType) : t('role_fulltime', 'พนักงานประจำ')}
                                size="small"
                                sx={{
                                    bgcolor: '#E8F5E9',
                                    color: '#2E7D32',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    height: 24,
                                }}
                            />
                        </Box>
                    </Box>

                    {/* Contact Info */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 1.5,
                                    bgcolor: '#EDE7F6',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <HashtagSquare size={18} variant="Bold" color="#673AB7" />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                    {t('employee_id', 'รหัสพนักงาน')}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {profile?.employeeId || '-'}
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 1.5,
                                    bgcolor: '#E3F2FD',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Building size={18} variant="Bold" color="#1976D2" />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                    {t('company', 'บริษัท')}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {profile?.companyName || '-'}
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 1.5,
                                    bgcolor: '#FFF3E0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Briefcase size={18} variant="Bold" color="#F57C00" />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                    {t('department', 'ฝ่าย')}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {profile?.departmentName || '-'}
                                </Typography>
                            </Box>
                        </Box>

                        {profile?.sectionName && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1.5,
                                        bgcolor: '#FCE4EC',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Location size={18} variant="Bold" color="#E91E63" />
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                        {t('section', 'แผนก')}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {profile.sectionName}
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 1.5,
                                    bgcolor: '#E8F5E9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Calendar size={18} variant="Bold" color="#388E3C" />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                    {t('profile_started', 'วันที่เริ่มงาน')}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {profile ? formatDate(profile.startDate) : '-'}
                                </Typography>
                                {profile?.startDate && (
                                    <Typography variant="caption" sx={{ color: '#388E3C', fontSize: '0.7rem', fontWeight: 500 }}>
                                        ({calculateWorkDuration(profile.startDate)})
                                    </Typography>
                                )}
                            </Box>
                        </Box>

                        {profile?.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1.5,
                                        bgcolor: '#F3E5F5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Sms size={18} variant="Bold" color="#9C27B0" />
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                        {t('profile_email', 'อีเมล')}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {profile.email}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>
                    </>
                    )}
                </Paper>

                {/* Settings Sections */}
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, px: 1 }}>
                        {t('settings', 'การตั้งค่า')}
                    </Typography>

                    {settingsSections.map((section, sectionIndex) => (
                        <Box key={sectionIndex} sx={{ mb: 2.5 }}>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'text.secondary',
                                    fontWeight: 700,
                                    px: 1,
                                    mb: 1,
                                    display: 'block',
                                    fontSize: '0.7rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1,
                                }}
                            >
                                {section.title}
                            </Typography>
                            <Paper
                                elevation={0}
                                sx={{
                                    borderRadius: 1.5,
                                    background: 'white',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                                    border: '1px solid rgba(0, 0, 0, 0.05)',
                                    overflow: 'hidden',
                                }}
                            >
                                {showLoading ? (
                                    <Box sx={{ p: 2 }}>
                                        {[1,2,3].map((i) => (
                                            <Box key={i}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                                                    <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: 1.5 }} />
                                                    <Box sx={{ flex: 1 }}>
                                                        <Skeleton variant="text" width={160} height={20} />
                                                        <Skeleton variant="text" width={120} height={16} />
                                                    </Box>
                                                    <Skeleton variant="rounded" width={32} height={20} />
                                                </Box>
                                                {i < 3 && <Divider sx={{ mx: 0.5 }} />}
                                            </Box>
                                        ))}
                                    </Box>
                                ) : (
                                    section.items.map((item, itemIndex) => {
                                        const Icon = item.icon;
                                        return (
                                            <Box key={itemIndex}>
                                                <Box
                                                    sx={{
                                                        p: 2,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 2,
                                                        cursor: item.link || item.toggle ? 'pointer' : 'default',
                                                        transition: 'all 0.2s',
                                                        '&:hover': item.link ? { bgcolor: '#F8F9FA' } : {},
                                                    }}
                                                    onClick={() => {
                                                        if (item.id === 'language') {
                                                            setOpenLanguage(true);
                                                            return;
                                                        }
                                                        if (item.link === '#install') {
                                                            if (isIOS) {
                                                                setOpenIOSInstructions(true);
                                                            } else if (deferredPrompt) {
                                                                installPWA();
                                                            } else {
                                                                toastr.info(t('pwa_installed_or_unsupported', 'ติดตั้งแล้ว หรือเบราว์เซอร์ไม่รองรับ'));
                                                            }
                                                            return;
                                                        }
                                                        if (item.link && item.link !== '#') {
                                                            window.location.href = item.link;
                                                        }
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 1.5,
                                                            bgcolor: `${item.color}15`,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <Icon size={20} variant="Bold" color={item.color} />
                                                    </Box>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, mb: item.subtitle ? 0.3 : 0 }}>
                                                            {item.label}
                                                        </Typography>
                                                        {item.subtitle && (
                                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                                                {item.subtitle}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                    {item.toggle ? (
                                                        pushLoading && item.id === 'notifications' ? (
                                                            <CircularProgress size={24} sx={{ color: item.color }} />
                                                        ) : (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                {item.id === 'notifications' && !pushSubscribed && pushSupported && (
                                                                    <Chip 
                                                                        label={t('status_disconnected', 'ไม่ได้เชื่อมต่อ')}
                                                                        size="small" 
                                                                        color="error" 
                                                                        variant="outlined" 
                                                                        sx={{ height: 20, fontSize: '0.6rem' }}
                                                                    />
                                                                )}
                                                                <Switch
                                                                    checked={item.value}
                                                                    onChange={(e) => item.onChange?.(e.target.checked)}
                                                                    disabled={!pushSupported || !pushInitialized || pushPermission === 'denied'}
                                                                    sx={{
                                                                        '& .MuiSwitch-switchBase.Mui-checked': {
                                                                            color: item.color,
                                                                        },
                                                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                                                            bgcolor: item.color,
                                                                        },
                                                                    }}
                                                                />
                                                            </Box>
                                                        )
                                                    ) : (
                                                        <ArrowRight2 size={20} variant="Bold" color="#999" />
                                                    )}
                                                </Box>
                                                {itemIndex < section.items.length - 1 && <Divider sx={{ mx: 2 }} />}
                                            </Box>
                                        );
                                    })
                                )}
                            </Paper>
                        </Box>
                    ))}

                    {/* Logout Button */}
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 1.5,
                            background: 'white',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                            overflow: 'hidden',
                            mb: 3,
                        }}
                    >
                        {showLoading ? (
                            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: 1.5 }} />
                                <Skeleton variant="text" width={120} height={20} />
                            </Box>
                        ) : (
                            <Box
                                onClick={handleLogout}
                                sx={{
                                    p: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': { bgcolor: '#FFF5F5' },
                                    opacity: isLoggingOut ? 0.7 : 1,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 1.5,
                                        bgcolor: '#FFEBEE',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {isLoggingOut ? (
                                        <CircularProgress size={20} sx={{ color: '#D32F2F' }} />
                                    ) : (
                                        <Logout size={20} color="#D32F2F" />
                                    )}
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#D32F2F', flex: 1 }}>
                                    {isLoggingOut ? t('logging_out', 'กำลังออกจากระบบ...') : t('logout', 'ออกจากระบบ')}
                                </Typography>
                            </Box>
                        )}
                    </Paper>

                    {/* Version Info */}
                    {showLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                            <Skeleton variant="text" width={100} height={16} />
                        </Box>
                    ) : (
                        <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', display: 'block', mt: 2 }}>
                            {t('version', 'เวอร์ชัน')} {APP_VERSION}
                        </Typography>
                    )}
                </Box>
            </Box>
            
            {/* Language Selector Dialog */}
            <Dialog open={openLanguage} onClose={() => setOpenLanguage(false)} fullWidth maxWidth="xs">
                <DialogTitle>{t('select_language', 'เลือกภาษา')}</DialogTitle>
                <List>
                    {languageOptions.map((opt) => (
                        <ListItemButton
                            key={opt.code}
                            selected={locale === opt.code}
                            onClick={() => {
                                setLocale(opt.code as any);
                                setOpenLanguage(false);
                            }}
                        >
                            <ListItemText primary={opt.label} />
                        </ListItemButton>
                    ))}
                </List>
            </Dialog>

            {/* iOS Instructions Dialog */}
            <Dialog 
                open={openIOSInstructions} 
                onClose={() => setOpenIOSInstructions(false)}
                PaperProps={{
                    sx: { borderRadius: 1, maxWidth: 340, mx: 2 }
                }}
            >
                <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', pb: 1 }}>
                    {t('ios_install_title', 'วิธีติดตั้งบน iPhone')}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2.5}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Box sx={{ 
                                p: 1.5, 
                                bgcolor: '#007AFF15', 
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 44
                            }}>
                                <Share size={24} color="#007AFF" />
                            </Box>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {t('step_1', 'ขั้นตอนที่ 1')}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    {t('press_button', 'กดปุ่ม')} <b>{t('share', 'แชร์')}</b> (Share) {t('at_bottom_safari', 'ที่อยู่ด้านล่างของ Safari')}
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Box sx={{ 
                                p: 1.5, 
                                bgcolor: '#34C75915', 
                                borderRadius: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 44
                            }}>
                                <PlusSquare size={24} color="#34C759" />
                            </Box>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {t('step_2', 'ขั้นตอนที่ 2')}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    {t('scroll_and_press', 'เลื่อนหา แล้วกด')} <b>&quot;{t('add_to_home_screen', 'เพิ่มในหน้าจอโฮม')}&quot;</b> (Add to Home Screen)
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Box sx={{ 
                                p: 1.5, 
                                bgcolor: '#FF950015', 
                                borderRadius: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 44
                            }}>
                                <Typography sx={{ fontSize: 20 }}>✓</Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {t('step_3', 'ขั้นตอนที่ 3')}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    {t('press_button', 'กดปุ่ม')} <b>&quot;{t('add', 'เพิ่ม')}&quot;</b> (Add) {t('at_top_right', 'ที่มุมขวาบน')}
                                </Typography>
                            </Box>
                        </Box>
                    </Stack>
                    <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary', textAlign: 'center' }}>
                        {t('ios_note_safari', 'หมายเหตุ: ต้องเปิดใน Safari เท่านั้น')}
                    </Typography>
                </DialogContent>
                <Box sx={{ p: 2, pt: 0 }}>
                    <Button 
                        fullWidth 
                        variant="contained" 
                        onClick={() => setOpenIOSInstructions(false)}
                        sx={{ borderRadius: 2, bgcolor: '#007AFF', py: 1.2 }}
                    >
                        {t('understood', 'เข้าใจแล้ว')}
                    </Button>
                </Box>
            </Dialog>

            {/* Bottom Navigation */}
            <BottomNav activePage="profile" />
        </Box>
    );
}
