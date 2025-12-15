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
    Collapse,
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
    ShieldSearch,
} from 'iconsax-react';
import { ChevronDown, ChevronUp, Bell, History, Users, Send, Timer, FileText } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useUser } from '@/app/providers/UserProvider';
import { useToastr } from '@/app/components/Toastr';
import { CalendarDays } from 'lucide-react';

const drawerWidth = 280;
const collapsedDrawerWidth = 72;

interface MenuItem {
    text: string;
    icon: Icon | React.FC<{ size?: number; color?: string }>;
    iconColor: string;
    path?: string;
    children?: SubMenuItem[];
}

interface SubMenuItem {
    text: string;
    icon: React.FC<{ size?: number; color?: string }>;
    iconColor: string;
    path: string;
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
                children: [
                    {
                        text: 'รายการใบลา',
                        icon: FileText,
                        iconColor: '#6C63FF',
                        path: '/admin/leaves',
                    },
                    {
                        text: 'ส่งต่อใบลา',
                        icon: Timer,
                        iconColor: '#FF9800',
                        path: '/admin/leaves/escalation',
                    },
                ],
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
            {
                text: 'โครงสร้างองค์กร',
                icon: People,
                iconColor: '#6C63FF',
                path: '/admin/organization-structure',
            },
        ],
    },

    {
        groupLabel: 'Banner',
        items: [
            {
                text: 'Banner',
                icon: Gallery,
                iconColor: '#6C63FF',
                path: '/admin/banners',
            },

        ],
    },
    {
        groupLabel: 'รายงาน',
        items: [
            {
                text: 'รายงานใบลา',
                icon: DocumentText1,
                iconColor: '#6C63FF',
                path: '/admin/leave-reports',
            },
        ],
    },

    {
        groupLabel: 'Admin',
        items: [
            {
                text: 'ประเภทการลา',
                icon: CalendarDays,
                iconColor: '#6C63FF',
                path: '/admin/leave-types',
            },
            {
                text: 'วันหยุด',
                icon: Calendar,
                iconColor: '#6C63FF',
                path: '/admin/holidays',
            },
            {
                text: 'บริษัท',
                icon: Building,
                iconColor: '#6C63FF',
                path: '/admin/companies',
            },
            {
                text: 'ฝ่าย',
                icon: ShieldSearch,
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
        groupLabel: 'ระบบ',
        items: [
            {
                text: 'Notifications',
                icon: Notification,
                iconColor: '#6C63FF',
                children: [
                    {
                        text: 'Dashboard',
                        icon: Bell,
                        iconColor: '#6C63FF',
                        path: '/admin/notifications',
                    },
                    {
                        text: 'Broadcast',
                        icon: Send,
                        iconColor: '#6C63FF',
                        path: '/admin/broadcast',
                    },
                    {
                        text: 'ประวัติแจ้งเตือน',
                        icon: History,
                        iconColor: '#6C63FF',
                        path: '/admin/notifications/logs',
                    },
                    {
                        text: 'Subscribers',
                        icon: Users,
                        iconColor: '#6C63FF',
                        path: '/admin/notifications/subscribers',
                    },
                ],
            },
        ],
    },
    {
        groupLabel: 'ตั้งค่า',
        items: [
            {
                text: 'Auto Escalation',
                icon: Timer,
                iconColor: '#F59E0B',
                path: '/admin/settings/escalation',
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
    const [collapsedState, setCollapsedState] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]); // Default collapsed

    // Derived collapsed state: Always false (expanded) on mobile
    const collapsed = isMobile ? false : collapsedState;

    // Toggle submenu expand/collapse
    const toggleSubmenu = (menuText: string) => {
        setExpandedMenus(prev =>
            prev.includes(menuText)
                ? prev.filter(m => m !== menuText)
                : [...prev, menuText]
        );
    };

    // Check if any child is active - moved below isActiveRoute definition
    // const hasActiveChild = ... see below after isActiveRoute

    // Admin roles that can access admin pages
    const ADMIN_ROLES = ['admin', 'hr', 'hr_manager'];
    const isAdminRole = (role: string | undefined) => ADMIN_ROLES.includes(role || '');

    // Check access and redirect if not authorized
    useEffect(() => {
        if (!userLoading && user && !isAdminRole(user.role)) {
            router.replace('/unauthorized');
        }
    }, [user, userLoading, router]);

    // Load collapsed state from localStorage and set loading complete
    useEffect(() => {
        const savedCollapsed = localStorage.getItem('admin-sidebar-collapsed');
        if (savedCollapsed !== null) {
            setCollapsedState(savedCollapsed === 'true');
        }
        // Small delay to ensure smooth transition
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Save collapsed state to localStorage
    const handleToggleCollapsed = () => {
        const newCollapsed = !collapsedState;
        setCollapsedState(newCollapsed);
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

    const isActiveRoute = (path?: string, exactMatch: boolean = false) => {
        if (!path) return false;
        // สำหรับ /admin ให้ตรวจสอบ exact match เท่านั้น
        if (path === '/admin') {
            return pathname === '/admin';
        }
        // Exact match for submenu items
        if (exactMatch) {
            return pathname === path;
        }
        return pathname === path || pathname.startsWith(path + '/');
    };

    // Check if any child is active (use exact match for children)
    const hasActiveChild = (children?: SubMenuItem[]) => {
        if (!children) return false;
        return children.some(child => isActiveRoute(child.path, true));
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
            <List sx={{ flex: 1, px: collapsed ? 0.5 : 2, py: 2, transition: 'padding 0.35s cubic-bezier(0.4, 0, 0.2, 1)', overflowY: 'auto' }}>
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
                            <React.Fragment key={item.text}>
                                {/* Parent menu item */}
                                <ListItem disablePadding sx={{ mb: 0.75, position: 'relative' }}>
                                    <Tooltip title={collapsed ? item.text : ''} placement="right">
                                        <ListItemButton
                                            onClick={() => {
                                                if (item.children) {
                                                    toggleSubmenu(item.text);
                                                } else if (item.path) {
                                                    handleNavigate(item.path);
                                                }
                                            }}
                                            sx={{
                                                borderRadius: 3,
                                                justifyContent: collapsed ? 'center' : 'flex-start',
                                                px: collapsed ? 1 : 2,
                                                py: 1,
                                                bgcolor: (item.path && isActiveRoute(item.path)) || hasActiveChild(item.children)
                                                    ? item.children ? 'action.selected' : 'primary.main'
                                                    : 'transparent',
                                                color: (item.path && isActiveRoute(item.path)) ? 'white' : 'text.primary',
                                                boxShadow: (item.path && isActiveRoute(item.path)) ? '0 4px 12px rgba(108, 99, 255, 0.4)' : 'none',
                                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                                '&:hover': {
                                                    bgcolor: (item.path && isActiveRoute(item.path)) ? 'primary.dark' : 'action.hover',
                                                    transform: 'translateX(2px)',
                                                },
                                            }}
                                        >
                                            <ListItemIcon
                                                sx={{
                                                    minWidth: collapsed ? 'auto' : 40,
                                                    justifyContent: 'center',
                                                    color: (item.path && isActiveRoute(item.path)) ? 'white' : 'text.secondary',
                                                    transition: 'all 0.25s ease',
                                                    transform: (item.path && isActiveRoute(item.path)) ? 'scale(1.1)' : 'scale(1)',
                                                }}
                                            >
                                                {'variant' in item.icon ? (
                                                    <item.icon
                                                        size={20}
                                                        variant="Outline"
                                                        color={(item.path && isActiveRoute(item.path)) ? '#ffffff' : item.iconColor}
                                                    />
                                                ) : (
                                                    <item.icon
                                                        size={18}
                                                        color={(item.path && isActiveRoute(item.path)) ? '#ffffff' : item.iconColor}
                                                    />
                                                )}
                                            </ListItemIcon>
                                            <Box
                                                sx={{
                                                    opacity: collapsed ? 0 : 1,
                                                    width: collapsed ? 0 : 'auto',
                                                    overflow: 'hidden',
                                                    whiteSpace: 'nowrap',
                                                    transition: 'opacity 0.25s ease, width 0.35s ease',
                                                    flex: collapsed ? 'none' : 1,
                                                    display: collapsed ? 'none' : 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                }}
                                            >
                                                <ListItemText
                                                    primary={item.text}
                                                    primaryTypographyProps={{
                                                        fontSize: '0.95rem',
                                                        fontWeight: (item.path && isActiveRoute(item.path)) || hasActiveChild(item.children) ? 600 : 400,
                                                    }}
                                                />
                                                {item.children && !collapsed && (
                                                    expandedMenus.includes(item.text)
                                                        ? <ChevronUp size={16} />
                                                        : <ChevronDown size={16} />
                                                )}
                                            </Box>
                                        </ListItemButton>
                                    </Tooltip>
                                </ListItem>

                                {/* Submenu items */}
                                {item.children && !collapsed && (
                                    <Collapse in={expandedMenus.includes(item.text)} timeout="auto" unmountOnExit>
                                        <List component="div" disablePadding sx={{ pl: 2.5 }}>
                                            {item.children.map((child) => (
                                                <ListItem key={child.path} disablePadding sx={{ mb: 0.5 }}>
                                                    <ListItemButton
                                                        onClick={() => handleNavigate(child.path)}
                                                        sx={{
                                                            borderRadius: 2,
                                                            py: 0.75,
                                                            pl: 2,
                                                            bgcolor: isActiveRoute(child.path, true) ? 'primary.main' : 'transparent',
                                                            color: isActiveRoute(child.path, true) ? 'white' : 'text.primary',
                                                            boxShadow: isActiveRoute(child.path, true) ? '0 4px 12px rgba(108, 99, 255, 0.4)' : 'none',
                                                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            '&:hover': {
                                                                bgcolor: isActiveRoute(child.path, true) ? 'primary.dark' : 'action.hover',
                                                                transform: 'translateX(2px)',
                                                            },
                                                        }}
                                                    >
                                                        <ListItemIcon
                                                            sx={{
                                                                minWidth: 32,
                                                                color: isActiveRoute(child.path, true) ? 'white' : 'text.secondary',
                                                            }}
                                                        >
                                                            <child.icon
                                                                size={18}
                                                                color={isActiveRoute(child.path, true) ? '#ffffff' : child.iconColor}
                                                            />
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary={child.text}
                                                            primaryTypographyProps={{
                                                                fontSize: '0.875rem',
                                                                fontWeight: isActiveRoute(child.path, true) ? 600 : 400,
                                                            }}
                                                        />
                                                    </ListItemButton>
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Collapse>
                                )}
                            </React.Fragment>
                        ))}
                    </React.Fragment>
                ))}
            </List>

            <Divider sx={{ mx: collapsed ? 0.5 : 1.5, transition: 'margin 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }} />

            {/* Back to Main App */}
            <Box sx={{ p: collapsed ? 0.5 : 2, transition: 'padding 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <ListItemButton
                    onClick={() => router.push('/')}
                    sx={{
                        borderRadius: 3,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        px: collapsed ? 1 : 2,
                        py: 1,
                        bgcolor: 'grey.100',
                        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            bgcolor: 'grey.200',
                        },
                    }}
                >
                    <ListItemIcon sx={{
                        minWidth: collapsed ? 'auto' : 40,
                        justifyContent: 'center',
                        transition: 'min-width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}>
                        <Home2 size={20} variant="Outline" color="#6C63FF" />
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
                                fontSize: '0.95rem',
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
