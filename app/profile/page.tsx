'use client';
import React, { useEffect, useState } from 'react';
import { Box, Typography, Avatar, Paper, IconButton, Chip, Switch, Divider, Dialog, DialogTitle, List, ListItemButton, ListItemText, Skeleton } from '@mui/material';
import { localeLabel, useLocale } from '../providers/LocaleProvider';
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
} from 'lucide-react';
import BottomNav from '../components/BottomNav';

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
    const hasLoadedRef = React.useRef(false);
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [emailNotif, setEmailNotif] = useState(true);
    const [openLanguage, setOpenLanguage] = useState(false);
    const [loading, setLoading] = useState(!hasLoadedRef.current);
    const languageOptions: Array<{ code: 'th' | 'en' | 'my'; label: string }> = [
        { code: 'th', label: localeLabel.th },
        { code: 'en', label: localeLabel.en },
        { code: 'my', label: localeLabel.my },
    ];

    useEffect(() => {
        if (!hasLoadedRef.current) {
            const timer = setTimeout(() => {
                setLoading(false);
                hasLoadedRef.current = true;
            }, 600);
            return () => clearTimeout(timer);
        }
    }, []);

    const settingsSections: SettingsSection[] = [
        {
            title: 'บัญชี',
            items: [
                { icon: User, label: 'แก้ไขโปรไฟล์', color: '#667eea', link: '#' },
                { icon: Mail, label: 'เปลี่ยนอีเมล', color: '#4ECDC4', link: '#' },
                { icon: Lock, label: 'เปลี่ยนรหัสผ่าน', color: '#FF6B6B', link: '#' },
            ],
        },
        {
            title: 'การแจ้งเตือน',
            items: [
                { icon: Bell, label: 'การแจ้งเตือนแบบพุช', color: '#FFD93D', toggle: true, value: notifications, onChange: setNotifications },
                { icon: Mail, label: 'การแจ้งเตือนทางอีเมล', color: '#9C27B0', toggle: true, value: emailNotif, onChange: setEmailNotif },
                { icon: Smartphone, label: 'การแจ้งเตือน SMS', color: '#FF8ED4', link: '#' },
            ],
        },
        {
            title: 'การตั้งค่าทั่วไป',
            items: [
                { icon: Moon, label: 'โหมดมืด', color: '#424242', toggle: true, value: darkMode, onChange: setDarkMode },
                { icon: Globe, label: 'ภาษา', color: '#1976D2', subtitle: localeLabel[locale], link: '#' },
            ],
        },
        {
            title: 'ความปลอดภัย',
            items: [
                { icon: Shield, label: 'การยืนยันตัวตนสองชั้น', color: '#2E7D32', link: '#' },
                { icon: Lock, label: 'ประวัติการเข้าสู่ระบบ', color: '#F57C00', link: '#' },
            ],
        },
        {
            title: 'ช่วยเหลือและข้อมูล',
            items: [
                { icon: HelpCircle, label: 'ศูนย์ช่วยเหลือ', color: '#00ACC1', link: '#' },
                { icon: FileText, label: 'นโยบายความเป็นส่วนตัว', color: '#5E35B1', link: '#' },
                { icon: FileText, label: 'ข้อกำหนดการใช้งาน', color: '#6D4C41', link: '#' },
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
                    <IconButton sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' } }}>
                        <LogOut size={20} />
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
                    {loading ? (
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
                                sx={{
                                    width: 80,
                                    height: 80,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                                }}
                            >
                                สพ
                            </Avatar>
                            <IconButton
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
                                สมชาย ใจดี
                            </Typography>
                            <Chip
                                label={t('role_fulltime', 'พนักงานประจำ')}
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
                                    somchai.j@company.com
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
                                <Phone size={18} color="#1976D2" />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                    {t('profile_phone', 'เบอร์โทร')}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    081-234-5678
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
                                <MapPin size={18} color="#F57C00" />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                    {t('profile_department', 'แผนก')}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    ฝ่ายพัฒนาระบบ
                                </Typography>
                            </Box>
                        </Box>

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
                                    1 มกราคม 2020
                                </Typography>
                            </Box>
                        </Box>
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
                                {loading ? (
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
                        {loading ? (
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
                    {loading ? (
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
