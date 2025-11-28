'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Avatar, Paper, IconButton, Chip, Switch, Divider, Dialog, DialogTitle, List, ListItemButton, ListItemText, Skeleton, CircularProgress } from '@mui/material';
import { localeLabel, useLocale } from '../providers/LocaleProvider';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/types/user-role';
import {
    Edit2,
    LogOut,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Award,
    TrendingUp,
    Bell,
    Moon,
    Globe,
    Lock,
    Shield,
    HelpCircle,
    FileText,
    ChevronRight,
    User,
    Smartphone,
    LucideIcon,
    Briefcase,
    Building2,
    Hash,
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { signOut, useSession } from 'next-auth/react';
import { useToastr } from '@/app/components/Toastr';

// Type definitions for user profile
interface UserProfile {
    id: number;
    employeeId: string;
    email: string | null;
    firstName: string;
    lastName: string;
    avatar: string | null;
    company: string;
    companyName: string;
    employeeType: string;
    department: string;
    departmentName: string;
    section: string | null;
    sectionName: string | null;
    shift: string | null;
    startDate: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
}

// Type definitions for settings items
interface SettingsItemBase {
    icon: LucideIcon;
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
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [emailNotif, setEmailNotif] = useState(true);
    const [openLanguage, setOpenLanguage] = useState(false);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const languageOptions: Array<{ code: 'th' | 'en' | 'my'; label: string }> = [
        { code: 'th', label: localeLabel.th },
        { code: 'en', label: localeLabel.en },
        { code: 'my', label: localeLabel.my },
    ];

    // Fetch profile data
    const fetchProfile = useCallback(async () => {
        try {
            const res = await fetch('/api/profile');
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            } else {
                console.error('Failed to fetch profile');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleLogout = async () => {
        setIsLoggingOut(true);

        try {
            // Clear localStorage
            localStorage.clear();

            // Clear sessionStorage
            sessionStorage.clear();

            // Clear all cookies via API
            await fetch('/api/auth/logout', { method: 'POST' });

            // Clear cookies on client side
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                const eqPos = cookie.indexOf('=');
                const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                document.cookie = name.trim() + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            }

            // Clear cache if supported
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }

            toastr.success('ออกจากระบบสำเร็จ');

            // Sign out from NextAuth and redirect to login
            await signOut({
                callbackUrl: '/login',
                redirect: true,
            });

        } catch (error) {
            console.error('Logout error:', error);
            toastr.error('เกิดข้อผิดพลาดในการออกจากระบบ');
            setIsLoggingOut(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchProfile();
    }, [fetchProfile]);
    
    // Get initials for avatar
    const getInitials = () => {
        if (profile) {
            const firstInitial = profile.firstName.charAt(0);
            const lastInitial = profile.lastName.charAt(0);
            return `${firstInitial}${lastInitial}`;
        }
        return '';
    };

    // Format date to Thai format
    const formatThaiDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 
                       'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        const month = months[date.getMonth()];
        const year = date.getFullYear() + 543; // Convert to Buddhist Era
        return `${day} ${month} ${year}`;
    };

    // Get employee type label
    const getEmployeeTypeLabel = (type: string) => {
        switch (type) {
            case 'monthly':
                return 'พนักงานรายเดือน';
            case 'daily':
                return 'พนักงานรายวัน';
            default:
                return type;
        }
    };
    
    // Prevent hydration mismatch by always showing loading state until mounted
    const showLoading = !mounted || loading;

    const settingsSections: SettingsSection[] = [
        {
            title: 'บัญชี',
            items: [
                { icon: User, label: 'แก้ไขโปรไฟล์', color: '#667eea', link: '/profile/edit' },
                
            ],
        },
        {
            title: 'การแจ้งเตือน',
            items: [
                { icon: Bell, label: 'การแจ้งเตือนแบบพุช', color: '#FFD93D', toggle: true, value: notifications, onChange: setNotifications },
                
            ],
        },
        {
            title: 'การตั้งค่าทั่วไป',
            items: [
                
                { icon: Globe, label: 'ภาษา', color: '#1976D2', subtitle: localeLabel[locale], link: '#' },
            ],
        },
        {
            title: 'ช่วยเหลือและข้อมูล',
            items: [
                { icon: HelpCircle, label: 'ศูนย์ช่วยเหลือ', color: '#00ACC1', link: '#' },
                
            ],
        },
    ];

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#F8F9FA', pb: 10 }}>
            {/* Header with Gradient */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    pt: 3,
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
                        {isLoggingOut ? <CircularProgress size={20} color="inherit" /> : <LogOut size={20} />}
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
                                <Edit2 size={14} />
                            </IconButton>
                        </Box>
                        <Box sx={{ ml: 2, flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {profile ? `${profile.firstName} ${profile.lastName}` : '-'}
                            </Typography>
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
                                <Hash size={18} color="#673AB7" />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                    รหัสพนักงาน
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
                                <Building2 size={18} color="#1976D2" />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                    บริษัท
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
                                <Briefcase size={18} color="#F57C00" />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                    ฝ่าย
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
                                    <MapPin size={18} color="#E91E63" />
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                        แผนก
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
                                <Calendar size={18} color="#388E3C" />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                    {t('profile_started', 'วันที่เริ่มงาน')}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {profile ? formatThaiDate(profile.startDate) : '-'}
                                </Typography>
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
                                    <Mail size={18} color="#9C27B0" />
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
                                                        if (item.label === 'ภาษา') {
                                                            setOpenLanguage(true);
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
                                                        <Icon size={20} color={item.color} />
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
                                                        <Switch
                                                            checked={item.value}
                                                            onChange={(e) => item.onChange?.(e.target.checked)}
                                                            sx={{
                                                                '& .MuiSwitch-switchBase.Mui-checked': {
                                                                    color: item.color,
                                                                },
                                                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                                                    bgcolor: item.color,
                                                                },
                                                            }}
                                                        />
                                                    ) : (
                                                        <ChevronRight size={20} color="#999" />
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
                                sx={{
                                    p: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': { bgcolor: '#FFF5F5' },
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
                                    <LogOut size={20} color="#D32F2F" />
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#D32F2F', flex: 1 }}>
                                    ออกจากระบบ
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
                            {t('version', 'เวอร์ชัน')} 1.0.0
                        </Typography>
                    )}
                </Box>
            </Box>
            
            {/* Language Selector Dialog */}
            <Dialog open={openLanguage} onClose={() => setOpenLanguage(false)} fullWidth maxWidth="xs">
                <DialogTitle>เลือกภาษา</DialogTitle>
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

            {/* Bottom Navigation */}
            <BottomNav activePage="profile" />
        </Box>
    );
}
