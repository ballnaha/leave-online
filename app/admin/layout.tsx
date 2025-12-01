'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    List,
    Typography,
    Divider,
    IconButton,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Avatar,
    Menu,
    MenuItem,
    useMediaQuery,
    useTheme,
    Tooltip,
    Badge,
    CircularProgress,
    Fade,
} from '@mui/material';
import type { Icon } from 'iconsax-react';
import {
    Home2,
    Category2,
    DocumentText,
    Calendar,
    Hierarchy,
    UserTick,
    Building,
    Layer,
    People,
    Gallery,
    DocumentText1,
    Notification,
    Setting2,
    LogoutCurve,
    ArrowDown2,
    HambergerMenu,
    SecuritySafe,
} from 'iconsax-react';
import { signOut } from 'next-auth/react';
import { useUser } from '@/app/providers/UserProvider';
import { useToastr } from '@/app/components/Toastr';

const drawerWidth = 260;
const collapsedDrawerWidth = 68;

interface MenuItem {
    text: string;
    icon: Icon;
    iconColor: string;
    path?: string;
    children?: MenuItem[];
}

interface MenuGroup {
    groupLabel?: string;
    items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
    {
        // กลุ่มหลัก - ไม่มี label
        items: [
            {
                text: 'แดชบอร์ด',
                icon: Category2,
                iconColor: '#6C63FF',
                path: '/admin',
            },
        ],
    },
    {
        groupLabel: 'ใบลา',
        items: [
            {
                text: 'ใบลาทั้งหมด',
                icon: DocumentText,
                iconColor: '#6C63FF',
                path: '/admin/leaves',
            },
            {
                text: 'ประเภทการลา',
                icon: Calendar,
                iconColor: '#6C63FF',
                path: '/admin/leave-types',
            },
        ],
    },
    {
        groupLabel: 'การอนุมัติ',
        items: [
            {
                text: 'Workflow',
                icon: Hierarchy,
                iconColor: '#6C63FF',
                path: '/admin/approval-workflows',
            },
            {
                text: 'ผู้อนุมัติรายบุคคล',
                icon: UserTick,
                iconColor: '#6C63FF',
                path: '/admin/user-approval-flow',
            },
        ],
    },
    {
        groupLabel: 'องค์กร',
        items: [
            {
                text: 'บริษัท',
                icon: Building,
                iconColor: '#6C63FF',
                path: '/admin/companies',
            },
            {
                text: 'ฝ่าย',
                icon: Layer,
                iconColor: '#6C63FF',
                path: '/admin/departments',
            },
            {
                text: 'แผนก',
                icon: Layer,
                iconColor: '#6C63FF',
                path: '/admin/sections',
            },
        ],
    },
    {
        groupLabel: 'ผู้ใช้',
        items: [
            {
                text: 'จัดการผู้ใช้',
                icon: People,
                iconColor: '#6C63FF',
                path: '/admin/users',
            },
        ],
    },
    {
        groupLabel: 'อื่นๆ',
        items: [
            {
                text: 'Banner',
                icon: Gallery,
                iconColor: '#6C63FF',
                path: '/admin/banners',
            },
            {
                text: 'รายงาน',
                icon: DocumentText1,
                iconColor: '#6C63FF',
                path: '/admin/reports',
            },
        ],
    },
    {
        groupLabel: 'ระบบ',
        items: [
            {
                text: 'ทดสอบ Push',
                icon: Notification,
                iconColor: '#6C63FF',
                path: '/admin/test-notification',
            },
            {
                text: 'ตั้งค่า',
                icon: Setting2,
                iconColor: '#6C63FF',
                path: '/admin/settings',
            },
        ],
    },
];

// Flatten menu items for search/active check
const menuItems: MenuItem[] = menuGroups.flatMap(group => group.items);

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const theme = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { user, loading: userLoading } = useUser();
    const toastr = useToastr();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    // Admin roles that can access admin pages
    const ADMIN_ROLES = ['admin', 'hr', 'hr_manager'];
    const isAdminRole = (role: string | undefined) => ADMIN_ROLES.includes(role || '');

    // Check access and redirect if not authorized
    useEffect(() => {
        if (!userLoading && user && !isAdminRole(user.role)) {
            toastr.error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            router.push('/');
        }
    }, [user, userLoading, router]);

    // Load collapsed state from localStorage and set loading complete
    useEffect(() => {
        const savedCollapsed = localStorage.getItem('admin-sidebar-collapsed');
        if (savedCollapsed !== null) {
            setCollapsed(savedCollapsed === 'true');
        }
        // Small delay to ensure smooth transition
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Save collapsed state to localStorage
    const handleToggleCollapsed = () => {
        const newCollapsed = !collapsed;
        setCollapsed(newCollapsed);
        localStorage.setItem('admin-sidebar-collapsed', String(newCollapsed));
    };

    const currentDrawerWidth = collapsed ? collapsedDrawerWidth : drawerWidth;

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleNavigate = (path: string) => {
        router.push(path);
        if (isMobile) {
            setMobileOpen(false);
        }
    };

    const handleLogout = async () => {
        handleMenuClose();
        try {
            localStorage.clear();
            sessionStorage.clear();
            await fetch('/api/auth/logout', { method: 'POST' });
            toastr.success('ออกจากระบบสำเร็จ');
            await signOut({ callbackUrl: '/login', redirect: true });
        } catch (error) {
            console.error('Logout error:', error);
            toastr.error('เกิดข้อผิดพลาดในการออกจากระบบ');
        }
    };

    const isActiveRoute = (path?: string) => {
        if (!path) return false;
        // สำหรับ /admin ให้ตรวจสอบ exact match เท่านั้น
        if (path === '/admin') {
            return pathname === '/admin';
        }
        return pathname === path || pathname.startsWith(path + '/');
    };

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Logo / Brand */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 3,
                    px: collapsed ? 1 : 2,
                    background: 'linear-gradient(135deg, #6C63FF 0%, #5A52D5 100%)',
                    minHeight: 80,
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                <Box sx={{ transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                    <SecuritySafe size={collapsed ? 24 : 28} variant="Bold" color="white" />
                </Box>
                <Typography
                    variant="h6"
                    sx={{
                        ml: 1.5,
                        fontWeight: 700,
                        color: 'white',
                        letterSpacing: '0.5px',
                        opacity: collapsed ? 0 : 1,
                        width: collapsed ? 0 : 'auto',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    Admin ใบลา
                </Typography>
            </Box>

            <Divider />

            {/* Menu Items */}
            <List sx={{ flex: 1, px: collapsed ? 0.5 : 1.5, py: 1.5, transition: 'padding 0.35s cubic-bezier(0.4, 0, 0.2, 1)', overflowY: 'auto' }}>
                {menuGroups.map((group, groupIndex) => (
                    <React.Fragment key={group.groupLabel || `group-${groupIndex}`}>
                        {/* Group Label */}
                        {group.groupLabel && !collapsed && (
                            <Typography
                                variant="caption"
                                sx={{
                                    display: 'block',
                                    px: 1.5,
                                    py: 0.5,
                                    mt: groupIndex > 0 ? 1.5 : 0,
                                    mb: 0.25,
                                    color: 'text.disabled',
                                    fontWeight: 600,
                                    fontSize: '0.65rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                {group.groupLabel}
                            </Typography>
                        )}
                        {/* Group Divider for collapsed state */}
                        {group.groupLabel && collapsed && groupIndex > 0 && (
                            <Divider sx={{ my: 0.75 }} />
                        )}
                        {/* Menu Items in Group */}
                        {group.items.map((item) => (
                            <ListItem key={item.text} disablePadding sx={{ mb: 0.25, position: 'relative' }}>
                                <Tooltip title={collapsed ? item.text : ''} placement="right">
                                    <ListItemButton
                                        onClick={() => item.path && handleNavigate(item.path)}
                                        sx={{
                                            borderRadius: 1,
                                            justifyContent: collapsed ? 'center' : 'flex-start',
                                            px: collapsed ? 1 : 1.5,
                                            py: 0.75,
                                            bgcolor: isActiveRoute(item.path) ? 'primary.main' : 'transparent',
                                            color: isActiveRoute(item.path) ? 'white' : 'text.primary',
                                            boxShadow: isActiveRoute(item.path) ? '0 4px 12px rgba(108, 99, 255, 0.4)' : 'none',
                                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                            '&:hover': {
                                                bgcolor: isActiveRoute(item.path) ? 'primary.dark' : 'action.hover',
                                                transform: 'translateX(2px)',
                                            },
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                minWidth: collapsed ? 'auto' : 32,
                                                color: isActiveRoute(item.path) ? 'white' : 'text.secondary',
                                                transition: 'all 0.25s ease',
                                                transform: isActiveRoute(item.path) ? 'scale(1.1)' : 'scale(1)',
                                            }}
                                        >
                                            <item.icon 
                                                size={18} 
                                                variant="Outline" 
                                                color={isActiveRoute(item.path) ? '#ffffff' : item.iconColor} 
                                            />
                                        </ListItemIcon>
                                        <Box
                                            sx={{
                                                opacity: collapsed ? 0 : 1,
                                                width: collapsed ? 0 : 'auto',
                                                overflow: 'hidden',
                                                whiteSpace: 'nowrap',
                                                transition: 'opacity 0.25s ease, width 0.35s ease',
                                            }}
                                        >
                                            <ListItemText
                                                primary={item.text}
                                                primaryTypographyProps={{
                                                    fontSize: '0.825rem',
                                                    fontWeight: isActiveRoute(item.path) ? 600 : 500,
                                                }}
                                            />
                                        </Box>
                                    </ListItemButton>
                                </Tooltip>
                            </ListItem>
                        ))}
                    </React.Fragment>
                ))}
            </List>

            <Divider sx={{ mx: collapsed ? 0.5 : 1.5, transition: 'margin 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }} />

            {/* Back to Main App */}
            <Box sx={{ p: collapsed ? 0.5 : 1.5, transition: 'padding 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <ListItemButton
                    onClick={() => router.push('/')}
                    sx={{
                        borderRadius: 1,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        px: collapsed ? 1 : 1.5,
                        py: 0.75,
                        bgcolor: 'grey.100',
                        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            bgcolor: 'grey.200',
                        },
                    }}
                >
                    <ListItemIcon sx={{ 
                        minWidth: collapsed ? 'auto' : 32,
                        transition: 'min-width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}>
                        <Home2 size={18} variant="Outline" color="#6C63FF" />
                    </ListItemIcon>
                    <Box
                        sx={{
                            opacity: collapsed ? 0 : 1,
                            width: collapsed ? 0 : 'auto',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        <ListItemText
                            primary="กลับหน้าหลัก"
                            primaryTypographyProps={{
                                fontSize: '0.825rem',
                                fontWeight: 500,
                            }}
                        />
                    </Box>
                </ListItemButton>
            </Box>
        </Box>
    );

    // Loading Screen
    if (isLoading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    bgcolor: 'background.default',
                    gap: 2,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        mb: 2,
                    }}
                >
                    <SecuritySafe size={40} variant="Bold" color="#6C63FF" />
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #6C63FF 0%, #5A52D5 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Admin Panel
                    </Typography>
                </Box>
                <CircularProgress size={32} sx={{ color: 'primary.main' }} />
                <Typography variant="body2" color="text.secondary">
                    กำลังโหลด...
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* AppBar */}
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    width: { md: `calc(100% - ${currentDrawerWidth}px)` },
                    ml: { md: `${currentDrawerWidth}px` },
                    bgcolor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {/* Hamburger Toggle Button for Desktop */}
                        <Tooltip title={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}>
                            <IconButton
                                color="inherit"
                                aria-label="toggle sidebar"
                                edge="start"
                                onClick={handleToggleCollapsed}
                                sx={{ 
                                    mr: 2, 
                                    display: { xs: 'none', md: 'flex' }, 
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
                                            bgcolor: 'text.primary',
                                            borderRadius: 1,
                                            transition: 'all 0.3s ease',
                                        },
                                    }}
                                >
                                    <Box
                                        component="span"
                                        sx={{
                                            width: collapsed ? 20 : 20,
                                            top: 0,
                                            transform: collapsed ? 'translateX(0)' : 'translateX(0)',
                                        }}
                                    />
                                    <Box
                                        component="span"
                                        sx={{
                                            width: collapsed ? 14 : 20,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            left: 0,
                                        }}
                                    />
                                    <Box
                                        component="span"
                                        sx={{
                                            width: collapsed ? 20 : 12,
                                            bottom: 0,
                                            left: 0,
                                        }}
                                    />
                                </Box>
                            </IconButton>
                        </Tooltip>
                        
                        {/* Hamburger Menu for Mobile */}
                        <Tooltip title="เปิดเมนู">
                            <IconButton
                                color="inherit"
                                aria-label="open drawer"
                                edge="start"
                                onClick={handleDrawerToggle}
                                sx={{ 
                                    mr: 2, 
                                    display: { xs: 'flex', md: 'none' }, 
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
                        </Tooltip>
                        <Typography variant="h6" noWrap component="div" color="text.primary" fontWeight={600}>
                            {menuItems.find((item) => isActiveRoute(item.path))?.text ||
                                menuItems
                                    .flatMap((item) => item.children || [])
                                    .find((child) => isActiveRoute(child.path))?.text ||
                                'Admin Panel'}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {/* Notifications */}
                        <Tooltip title="การแจ้งเตือน">
                            <IconButton sx={{ color: 'text.secondary' }}>
                                <Badge badgeContent={3} color="error">
                                    <Notification size={22} variant="Bold" color="#6C63FF" />
                                </Badge>
                            </IconButton>
                        </Tooltip>

                        {/* User Menu */}
                        <Box
                            onClick={handleMenuClick}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                cursor: 'pointer',
                                p: 1,
                                borderRadius: 1,
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                },
                            }}
                        >
                            <Avatar
                                src={user?.avatar || undefined}
                                sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}
                            >
                                {user?.firstName?.charAt(0)?.toUpperCase()}
                            </Avatar>
                            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                                <Typography variant="body2" fontWeight={600} color="text.primary">
                                    {user?.firstName} {user?.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 
                                     user?.role === 'hr' ? 'HR' : 
                                     user?.role === 'hr_manager' ? 'HR Manager' : user?.role}
                                </Typography>
                            </Box>
                            <ArrowDown2 size={16} color={theme.palette.text.secondary} />
                        </Box>

                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleMenuClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            PaperProps={{
                                sx: {
                                    mt: 1,
                                    minWidth: 180,
                                    borderRadius: 1,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                },
                            }}
                        >
                            <MenuItem onClick={() => { handleMenuClose(); router.push('/profile'); }}>
                                <ListItemIcon>
                                    <UserTick size={18} color="#6C63FF" />
                                </ListItemIcon>
                                <ListItemText>โปรไฟล์</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={() => { handleMenuClose(); router.push('/admin/settings'); }}>
                                <ListItemIcon>
                                    <Setting2 size={18} color="#6C63FF" />
                                </ListItemIcon>
                                <ListItemText>ตั้งค่า</ListItemText>
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                                <ListItemIcon>
                                    <LogoutCurve size={18} color={theme.palette.error.main} />
                                </ListItemIcon>
                                <ListItemText>ออกจากระบบ</ListItemText>
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Sidebar for mobile */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true, // Better open performance on mobile.
                }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                    },
                }}
            >
                {drawer}
            </Drawer>

            {/* Sidebar for desktop */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: currentDrawerWidth,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                        overflowX: 'hidden',
                    },
                }}
                open
            >
                {drawer}
            </Drawer>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { xs: '100%', md: `calc(100% - ${currentDrawerWidth}px)` },
                    ml: { xs: 0, md: `${currentDrawerWidth}px` },
                    mt: '64px',
                    minHeight: 'calc(100vh - 64px)',
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                <Fade in={!isLoading} timeout={300}>
                    <Box>
                        {children}
                    </Box>
                </Fade>
            </Box>
        </Box>
    );
}
