'use client';
import React, { useState } from 'react';
import { Drawer, Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Avatar, Divider, IconButton, CircularProgress, Skeleton } from '@mui/material';
import { Home, Calendar, Settings, LogOut, User, X } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useToastr } from '@/app/components/Toastr';
import { useUser } from '@/app/providers/UserProvider';
import { usePathname, useRouter } from 'next/navigation';

interface SidebarProps {
    open: boolean;
    onClose: () => void;
}

const Sidebar = ({ open, onClose }: SidebarProps) => {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const toastr = useToastr();
    const { user, loading } = useUser();
    const router = useRouter();
    const pathname = usePathname();

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

    const menuItems = [
        { text: 'แดชบอร์ด', icon: <Home size={20} />, path: '/' },
        { text: 'จัดการใบลา', icon: <Calendar size={20} />, path: '/approval' },
        { text: 'การลาของฉัน', icon: <Calendar size={20} />, path: '/leave' },
        { text: 'โปรไฟล์', icon: <User size={20} />, path: '/profile' },
        { text: 'ตั้งค่า', icon: <Settings size={20} />, path: '/settings' },
    ];

    if (user?.role === 'admin') {
        menuItems.push({ text: 'ตั้งค่าผู้อนุมัติ', icon: <Settings size={20} />, path: '/admin/approval-workflows' });
    }

    const handleNavigate = (path: string) => {
        if (path) {
            router.push(path);
            onClose();
        }
    };

    return (
        <Drawer
            anchor="left"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: 280,
                    borderTopRightRadius: 30,
                    borderBottomRightRadius: 30,
                    boxShadow: '4px 0 24px rgba(0,0,0,0.05)',
                    border: 'none',
                }
            }}
        >
            <Box role="presentation" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header of Sidebar */}
                <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {loading ? (
                            <Skeleton variant="circular" width={48} height={48} />
                        ) : (
                            <Avatar
                                src={user?.avatar || undefined}
                                sx={{ width: 48, height: 48, boxShadow: 1, bgcolor: 'primary.main' }}
                            >
                                {user?.firstName?.charAt(0)?.toUpperCase()}
                            </Avatar>
                        )}
                        <Box>
                            {loading ? (
                                <>
                                    <Skeleton variant="text" width={80} height={24} />
                                    <Skeleton variant="text" width={60} height={16} />
                                </>
                            ) : (
                                <>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        {user?.firstName} {user?.lastName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {user?.role === 'admin' ? 'ผู้ดูแลระบบ' : user?.role === 'hr' ? 'HR' : 'พนักงาน'}
                                    </Typography>
                                </>
                            )}
                        </Box>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <X size={20} />
                    </IconButton>
                </Box>

                <Divider sx={{ mx: 3, opacity: 0.5 }} />

                <List sx={{ px: 2, py: 3, flex: 1 }}>
                    {menuItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                                <ListItemButton
                                    onClick={() => handleNavigate(item.path)}
                                    sx={{
                                        borderRadius: 3,
                                        bgcolor: isActive ? 'primary.main' : 'transparent',
                                        color: isActive ? 'white' : 'text.primary',
                                        '&:hover': {
                                            bgcolor: isActive ? 'primary.dark' : 'grey.100',
                                        }
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 40, color: isActive ? 'white' : 'text.secondary' }}>
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.text}
                                        primaryTypographyProps={{
                                            fontSize: '0.95rem',
                                            fontWeight: isActive ? 600 : 400
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>

                <Box sx={{ p: 3 }}>
                    <ListItemButton
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        sx={{
                            borderRadius: 3,
                            color: 'error.main',
                            bgcolor: 'error.light',
                            '&:hover': { bgcolor: '#ffcdd2' },
                            '&.Mui-disabled': {
                                bgcolor: 'error.light',
                                opacity: 0.7,
                            },
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
                            {isLoggingOut ? <CircularProgress size={20} color="error" /> : <LogOut size={20} />}
                        </ListItemIcon>
                        <ListItemText 
                            primary={isLoggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'} 
                            primaryTypographyProps={{ fontWeight: 600 }} 
                        />
                    </ListItemButton>
                </Box>
            </Box>
        </Drawer>
    );
};

export default Sidebar;
