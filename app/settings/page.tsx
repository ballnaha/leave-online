'use client';
import React, { useState } from 'react';
import { Box, Typography, Paper, Switch, IconButton, Divider, Avatar } from '@mui/material';
import {
    ChevronLeft,
    Bell,
    Moon,
    Globe,
    Lock,
    Shield,
    HelpCircle,
    FileText,
    LogOut,
    ChevronRight,
    User,
    Mail,
    Smartphone,
    LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import NotificationToggle from '../components/NotificationToggle';

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

export default function SettingsPage() {
    const [darkMode, setDarkMode] = useState(false);
    const [emailNotif, setEmailNotif] = useState(true);

    const settingsSections: SettingsSection[] = [
        {
            title: 'บัญชี',
            items: [
                { icon: User, label: 'แก้ไขโปรไฟล์', color: '#667eea', link: '/profile' },
                { icon: Mail, label: 'เปลี่ยนอีเมล', color: '#4ECDC4', link: '#' },
                { icon: Lock, label: 'เปลี่ยนรหัสผ่าน', color: '#FF6B6B', link: '#' },
            ],
        },
        {
            title: 'การแจ้งเตือน',
            items: [
                { icon: Mail, label: 'การแจ้งเตือนทางอีเมล', color: '#9C27B0', toggle: true, value: emailNotif, onChange: setEmailNotif },
                { icon: Smartphone, label: 'การแจ้งเตือน SMS', color: '#FF8ED4', link: '#' },
            ],
        },
        {
            title: 'การตั้งค่าทั่วไป',
            items: [
                { icon: Moon, label: 'โหมดมืด', color: '#424242', toggle: true, value: darkMode, onChange: setDarkMode },
                { icon: Globe, label: 'ภาษา', color: '#1976D2', subtitle: 'ภาษาไทย', link: '#' },
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
            {/* Header */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    pt: 3,
                    pb: 6,
                    px: 2,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
                    <Link href="/profile" style={{ textDecoration: 'none' }}>
                        <IconButton sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' } }}>
                            <ChevronLeft size={24} />
                        </IconButton>
                    </Link>
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                        การตั้งค่า
                    </Typography>
                </Box>
            </Box>

            {/* Profile Summary */}
            <Box sx={{ px: 2, mt: -3, position: 'relative', zIndex: 2, mb: 3 }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: 3,
                        background: 'white',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                        border: '1px solid rgba(0, 0, 0, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                    }}
                >
                    <Avatar
                        sx={{
                            width: 60,
                            height: 60,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            fontSize: '1.5rem',
                            fontWeight: 700,
                        }}
                    >
                        สพ
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5 }}>
                            สมชาย ใจดี
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            somchai.j@company.com
                        </Typography>
                    </Box>
                    <ChevronRight size={20} color="#999" />
                </Paper>
            </Box>

            {/* Push Notification Toggle */}
            <Box sx={{ px: 2, mb: 3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, px: 1, mb: 1, display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                    การแจ้งเตือน Push
                </Typography>
                <NotificationToggle variant="card" />
            </Box>

            {/* Settings Sections */}
            <Box sx={{ px: 2 }}>
                {settingsSections.map((section, sectionIndex) => (
                    <Box key={sectionIndex} sx={{ mb: 3 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, px: 1, mb: 1, display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {section.title}
                        </Typography>
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                background: 'white',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                                border: '1px solid rgba(0, 0, 0, 0.05)',
                                overflow: 'hidden',
                            }}
                        >
                            {section.items.map((item, itemIndex) => {
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
                                                if (item.link && item.link !== '#') {
                                                    window.location.href = item.link;
                                                }
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 2.5,
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
                            })}
                        </Paper>
                    </Box>
                ))}

                {/* Logout Button */}
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        background: 'white',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                        border: '1px solid rgba(0, 0, 0, 0.05)',
                        overflow: 'hidden',
                        mb: 3,
                    }}
                >
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
                                borderRadius: 2.5,
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
                </Paper>

                {/* Version Info */}
                <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', display: 'block', mt: 2 }}>
                    เวอร์ชัน 1.0.0
                </Typography>
            </Box>
        </Box>
    );
}
