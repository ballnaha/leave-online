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
    Collapse,
    Tooltip,
    Badge,
    CircularProgress,
    Fade,
} from '@mui/material';
import {
    Menu as MenuIcon,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    Bell,
    GitBranch,
    Building2,
    Layers,
    Calendar,
    FileText,
    Shield,
    User,
    Home,
    PanelLeftClose,
    PanelLeftOpen,
    Image as ImageIcon,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useUser } from '@/app/providers/UserProvider';
import { useToastr } from '@/app/components/Toastr';

const drawerWidth = 280;
const collapsedDrawerWidth = 72;

interface MenuItem {
    text: string;
    icon: React.ReactNode;
    path?: string;
    children?: MenuItem[];
}

const menuItems: MenuItem[] = [
    {
        text: 'แดชบอร์ด',
        icon: <LayoutDashboard size={20} />,
        path: '/admin',
    },
    {
        text: 'ใบลาทั้งหมด',
        icon: <FileText size={20} />,
        path: '/admin/leaves',
    },
    {
        text: 'จัดการผู้ใช้',
        icon: <Users size={20} />,
        path: '/admin/users',
    },
    {
        text: 'การอนุมัติ',
        icon: <GitBranch size={20} />,
        children: [
            {
                text: 'Workflow การอนุมัติ',
                icon: <Layers size={20} />,
                path: '/admin/approval-workflows',
            },
            {
                text: 'ระบุผู้อนุมัติรายบุคคล',
                icon: <User size={20} />,
                path: '/admin/user-approval-flow',
            },
        ],
    },
    {
        text: 'จัดการองค์กร',
        icon: <Building2 size={20} />,
        children: [
            {
                text: 'บริษัท',
                icon: <Building2 size={20} />,
                path: '/admin/companies',
            },
            {
                text: 'ฝ่าย',
                icon: <Layers size={20} />,
                path: '/admin/departments',
            },
            {
                text: 'แผนก',
                icon: <Layers size={20} />,
                path: '/admin/sections',
            },
        ],
    },
    {
        text: 'ประเภทการลา',
        icon: <Calendar size={20} />,
        path: '/admin/leave-types',
    },
    {
        text: 'Banner/ข่าวสาร',
        icon: <ImageIcon size={20} />,
        path: '/admin/banners',
    },
    {
        text: 'รายงาน',
        icon: <FileText size={20} />,
        path: '/admin/reports',
    },
    {
        text: 'ทดสอบ Push',
        icon: <Bell size={20} />,
        path: '/admin/test-notification',
    },
    {
        text: 'ตั้งค่าระบบ',
        icon: <Settings size={20} />,
        path: '/admin/settings',
    },
];

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
    const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
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

    const handleSubMenuToggle = (text: string) => {
        setOpenSubMenus((prev) => ({
            ...prev,
            [text]: !prev[text],
        }));
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

    const isParentActive = (item: MenuItem) => {
        if (item.path) return isActiveRoute(item.path);
        if (item.children) {
            return item.children.some((child) => isActiveRoute(child.path));
        }
        return false;
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
                    <Shield size={collapsed ? 28 : 32} color="white" />
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
            <List sx={{ flex: 1, px: collapsed ? 1 : 2, py: 2, transition: 'padding 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                {menuItems.map((item) => (
                    <React.Fragment key={item.text}>
                        {item.children ? (
                            <>
                                <ListItem disablePadding sx={{ mb: 0.5, position: 'relative' }}>
                                    <Tooltip title={collapsed ? item.text : ''} placement="right">
                                        <ListItemButton
                                            onClick={() => collapsed 
                                                ? (item.children?.[0]?.path && handleNavigate(item.children[0].path))
                                                : handleSubMenuToggle(item.text)
                                            }
                                            sx={{
                                                borderRadius: 1,
                                                justifyContent: collapsed ? 'center' : 'flex-start',
                                                px: collapsed ? 1 : 2,
                                                py: 1.25,
                                                bgcolor: isParentActive(item) ? 'rgba(108, 99, 255, 0.08)' : 'transparent',
                                                color: isParentActive(item) ? 'primary.main' : 'text.primary',
                                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                                '&:hover': {
                                                    bgcolor: isParentActive(item) ? 'rgba(108, 99, 255, 0.12)' : 'action.hover',
                                                    transform: 'translateX(2px)',
                                                },
                                            }}
                                        >
                                            <ListItemIcon
                                                sx={{
                                                    minWidth: collapsed ? 'auto' : 40,
                                                    color: isParentActive(item) ? 'primary.main' : 'text.secondary',
                                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    transform: isParentActive(item) ? 'scale(1.1)' : 'scale(1)',
                                                }}
                                            >
                                                {item.icon}
                                            </ListItemIcon>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    flex: 1,
                                                    opacity: collapsed ? 0 : 1,
                                                    width: collapsed ? 0 : 'auto',
                                                    overflow: 'hidden',
                                                    whiteSpace: 'nowrap',
                                                    transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                                                }}
                                            >
                                                <ListItemText
                                                    primary={item.text}
                                                    primaryTypographyProps={{
                                                        fontSize: '0.9rem',
                                                        fontWeight: isParentActive(item) ? 600 : 500,
                                                    }}
                                                />
                                                {openSubMenus[item.text] ? (
                                                    <ChevronUp size={18} />
                                                ) : (
                                                    <ChevronDown size={18} />
                                                )}
                                            </Box>
                                        </ListItemButton>
                                    </Tooltip>
                                </ListItem>
                                {!collapsed && (
                                    <Collapse in={openSubMenus[item.text]} timeout="auto" unmountOnExit>
                                        <List component="div" disablePadding>
                                            {item.children.map((child) => (
                                                <ListItemButton
                                                    key={child.text}
                                                    onClick={() => child.path && handleNavigate(child.path)}
                                                    sx={{
                                                        pl: 6,
                                                        py: 1,
                                                        borderRadius: 1,
                                                        mb: 0.5,
                                                        position: 'relative',
                                                        bgcolor: isActiveRoute(child.path) ? 'primary.main' : 'transparent',
                                                        color: isActiveRoute(child.path) ? 'white' : 'text.secondary',
                                                        boxShadow: isActiveRoute(child.path) ? '0 2px 8px rgba(108, 99, 255, 0.35)' : 'none',
                                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        '&:hover': {
                                                            bgcolor: isActiveRoute(child.path) ? 'primary.dark' : 'action.hover',
                                                            transform: 'translateX(4px)',
                                                        },
                                                        '&::before': isActiveRoute(child.path) ? {
                                                            content: '""',
                                                            position: 'absolute',
                                                            left: 24,
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            width: 6,
                                                            height: 6,
                                                            borderRadius: '50%',
                                                            bgcolor: 'white',
                                                        } : {},
                                                    }}
                                                >
                                                    <ListItemIcon
                                                        sx={{
                                                            minWidth: 32,
                                                            color: isActiveRoute(child.path) ? 'white' : 'text.secondary',
                                                        }}
                                                    >
                                                        {child.icon}
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={child.text}
                                                        primaryTypographyProps={{
                                                            fontSize: '0.85rem',
                                                            fontWeight: isActiveRoute(child.path) ? 600 : 400,
                                                        }}
                                                    />
                                                </ListItemButton>
                                            ))}
                                        </List>
                                    </Collapse>
                                )}
                            </>
                        ) : (
                            <ListItem disablePadding sx={{ mb: 0.5, position: 'relative' }}>
                                <Tooltip title={collapsed ? item.text : ''} placement="right">
                                    <ListItemButton
                                        onClick={() => item.path && handleNavigate(item.path)}
                                        sx={{
                                            borderRadius: 1,
                                            justifyContent: collapsed ? 'center' : 'flex-start',
                                            px: collapsed ? 1 : 2,
                                            py: 1.25,
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
                                                minWidth: collapsed ? 'auto' : 40,
                                                color: isActiveRoute(item.path) ? 'white' : 'text.secondary',
                                                transition: 'all 0.25s ease',
                                                transform: isActiveRoute(item.path) ? 'scale(1.1)' : 'scale(1)',
                                            }}
                                        >
                                            {item.icon}
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
                                                    fontSize: '0.9rem',
                                                    fontWeight: isActiveRoute(item.path) ? 600 : 500,
                                                }}
                                            />
                                        </Box>
                                    </ListItemButton>
                                </Tooltip>
                            </ListItem>
                        )}
                    </React.Fragment>
                ))}
            </List>

            <Divider sx={{ mx: collapsed ? 1 : 2, transition: 'margin 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }} />

            {/* Back to Main App */}
            <Box sx={{ p: collapsed ? 1 : 2, transition: 'padding 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <ListItemButton
                    onClick={() => router.push('/')}
                    sx={{
                        borderRadius: 1,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        px: collapsed ? 1 : 2,
                        bgcolor: 'grey.100',
                        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            bgcolor: 'grey.200',
                        },
                    }}
                >
                    <ListItemIcon sx={{ 
                        minWidth: collapsed ? 'auto' : 40,
                        transition: 'min-width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}>
                        <Home size={20} />
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
                                fontSize: '0.9rem',
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
                    <Shield size={40} color="#6C63FF" />
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
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2, display: { md: 'none' }, color: 'text.primary' }}
                        >
                            <MenuIcon size={24} />
                        </IconButton>
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
                                    <Bell size={22} />
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
                            <ChevronDown size={18} color={theme.palette.text.secondary} />
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
                                    <User size={18} />
                                </ListItemIcon>
                                <ListItemText>โปรไฟล์</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={() => { handleMenuClose(); router.push('/admin/settings'); }}>
                                <ListItemIcon>
                                    <Settings size={18} />
                                </ListItemIcon>
                                <ListItemText>ตั้งค่า</ListItemText>
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                                <ListItemIcon>
                                    <LogOut size={18} color={theme.palette.error.main} />
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
