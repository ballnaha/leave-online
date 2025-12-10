'use client';
import React, { useState } from 'react';
import { Drawer, Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Avatar, Divider, IconButton, CircularProgress, Skeleton } from '@mui/material';
import { Home2, Calendar, Setting2, Logout, User, CloseSquare, Task } from 'iconsax-react';
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
        { text: 'หน้าหลัก', icon: <Home2 size={20} variant="Outline" color="#6C63FF" />, activeIcon: <Home2 size={20} variant="Bold" color="#fff" />, path: '/' },
        { text: 'จัดการใบลา', icon: <Task size={20} variant="Outline" color="#6C63FF" />, activeIcon: <Task size={20} variant="Bold" color="#fff" />, path: '/approval' },
    ];

    // Admin roles that can access admin settings
    const adminRoles = ['admin', 'hr', 'hr_manager'];
    const isAdmin = adminRoles.includes(user?.role || '');

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
                                        {user?.role === 'admin' ? 'ผู้ดูแลระบบ' :
                                            user?.role === 'hr' ? 'HR' :
                                                user?.role === 'hr_manager' ? 'HR Manager' :
                                                    user?.role === 'shift_supervisor' ? 'หัวหน้ากะ' :
                                                        user?.role === 'dept_manager' ? 'ผู้จัดการฝ่าย/ส่วน' :
                                                            user?.role === 'section_head' ? 'หัวหน้าแผนก' :
                                                                'พนักงาน'}
                                    </Typography>
                                </>
                            )}
                        </Box>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <CloseSquare size={20} variant="Outline" color="#9E9E9E" />
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
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        {isActive ? item.activeIcon : item.icon}
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

                {/* Bottom Section - Admin & Logout */}
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Divider sx={{ mb: 1, opacity: 0.5 }} />

                    {/* Admin Button */}
                    {isAdmin && (
                        <ListItemButton
                            onClick={() => handleNavigate('/admin')}
                            sx={{
                                borderRadius: 3,
                                bgcolor: pathname.startsWith('/admin') ? 'primary.main' : 'transparent',
                                color: pathname.startsWith('/admin') ? 'white' : 'text.primary',
                                '&:hover': {
                                    bgcolor: pathname.startsWith('/admin') ? 'primary.dark' : 'grey.100',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                <Setting2 size={20} variant={pathname.startsWith('/admin') ? 'Bold' : 'Outline'} color={pathname.startsWith('/admin') ? '#fff' : '#6C63FF'} />
                            </ListItemIcon>
                            <ListItemText
                                primary="Admin Panel"
                                primaryTypographyProps={{
                                    fontSize: '0.95rem',
                                    fontWeight: pathname.startsWith('/admin') ? 600 : 400
                                }}
                            />
                        </ListItemButton>
                    )}

                    {/* Logout Button */}
                    <ListItemButton
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        sx={{
                            borderRadius: 3,
                            color: 'text.secondary',
                            '&:hover': {
                                bgcolor: 'grey.100',
                                color: 'error.main',
                            },
                            '&.Mui-disabled': {
                                opacity: 0.7,
                            },
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            {isLoggingOut ? <CircularProgress size={20} color="inherit" /> : <Logout size={20} variant="Outline" color="#9E9E9E" />}
                        </ListItemIcon>
                        <ListItemText
                            primary={isLoggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
                            primaryTypographyProps={{
                                fontSize: '0.95rem',
                                fontWeight: 400
                            }}
                        />
                    </ListItemButton>
                </Box>
            </Box>
        </Drawer>
    );
};

export default Sidebar;
