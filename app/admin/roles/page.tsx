'use client';

import React from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    alpha,
    useTheme,
    Button,
    Card,
    CardContent,
    Avatar,
} from '@mui/material';
import { ShieldTick, ArrowLeft, InfoCircle, User, People, Hierarchy, SecuritySafe, Profile2User, ProfileCircle, Monitor, Flash, Timer } from 'iconsax-react';
import { useRouter } from 'next/navigation';

// ข้อมูล Roles และสิทธิ์ พร้อมระบุไอคอนที่เหมาะสม
const ROLES_INFO = [
    { role: 'admin', label: 'Admin (IT)', weight: 10, icon: <SecuritySafe size={24} variant="Bold" />, color: 'error', description: 'ผู้ดูแลระบบสูงสุด จัดการทุกส่วนของระบบได้' },
    { role: 'hr_manager', label: 'HR Manager', weight: 6, icon: <Profile2User size={24} variant="Bold" />, color: 'warning', description: 'ผู้จัดการสาขา/ผู้จัดการ HR รับผิดชอบเคสที่มีการส่งต่อ (Escalation)' },
    { role: 'hr', label: 'HR', weight: 5, icon: <ProfileCircle size={24} variant="Bold" />, color: 'info', description: 'เจ้าหน้าที่บุคคล จัดการข้อมูลพนักงานและใบลาได้' },
    { role: 'dept_manager', label: 'Dept Manager', weight: 4, icon: <Hierarchy size={24} variant="Bold" />, color: 'success', description: 'ผู้จัดการฝ่าย/ส่วน อนุมัติใบลาของลูกน้องในฝ่าย' },
    { role: 'section_head', label: 'Section Head', weight: 3, icon: <People size={24} variant="Bold" />, color: 'secondary', description: 'หัวหน้าแผนก อนุมัติใบลาภายในแผนก' },
    { role: 'shift_supervisor', label: 'Supervisor', weight: 2, icon: <Profile2User size={24} variant="Bold" />, color: 'warning', description: 'หัวหน้ากะ อนุมัติใบลาเบื้องต้น' },
    { role: 'employee', label: 'Employee', weight: 1, icon: <User size={24} variant="Bold" />, color: 'grey', description: 'พนักงานทั่วไป สามารถยื่นใบลาและดูข้อมูลส่วนตัว' },
];

const PERMISSIONS_LIST = [
    { id: 'CAN_ACCESS_ADMIN', label: 'เข้า Admin Panel', roles: ['admin', 'hr', 'hr_manager'] },
    { id: 'CAN_MANAGE_USERS', label: 'จัดการข้อมูลพนักงาน', roles: ['admin', 'hr', 'hr_manager'] },
    { id: 'CAN_VIEW_ALL_LEAVES', label: 'ดูใบลาทั้งบริษัท', roles: ['admin', 'hr', 'hr_manager'] },
    { id: 'CAN_APPROVE_LEAVES', label: 'อนุมัติใบลา', roles: ['admin', 'hr_manager', 'hr', 'dept_manager', 'section_head', 'shift_supervisor'] },
    { id: 'CAN_RECEIVE_ESCALATION', label: 'รับส่งต่อใบลา (Auto-Escalation)', roles: ['hr_manager'] },
    { id: 'CAN_VIEW_REPORTS', label: 'ดูรายงานสรุปสถิติ', roles: ['admin', 'hr_manager', 'hr', 'dept_manager'] },
];

export default function RolesPermissionsPage() {
    const theme = useTheme();
    const router = useRouter();

    // Helper function to safely get palette colors
    const getRoleColor = (color: string) => {
        const pal = theme.palette as any;
        return pal[color]?.main || theme.palette.grey[500];
    };

    return (
        <Box sx={{ p: { xs: 1, md: 3 } }}>
            {/* Role Hierarchy Cards Section */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: 'primary.main', mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <ShieldTick size={28} variant="Bold" color={theme.palette.primary.main} />
                    ลำดับชั้นและหน้าที่ (Role Hierarchy)
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2.5 }}>
                    {ROLES_INFO.map((item) => (
                        <Card
                            key={item.role}
                            sx={{
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: `0 8px 24px ${alpha(getRoleColor(item.color), 0.1)}`,
                                    borderColor: alpha(getRoleColor(item.color), 0.3),
                                }
                            }}
                        >
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Avatar
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 1,
                                            bgcolor: alpha(getRoleColor(item.color), 0.1),
                                            color: item.color === 'grey' ? 'grey.700' : `${item.color}.main`,
                                            boxShadow: `0 4px 10px ${alpha(getRoleColor(item.color), 0.2)}`
                                        }}
                                    >
                                        {React.cloneElement(item.icon as React.ReactElement<any>, { color: getRoleColor(item.color) })}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={700}>
                                            {item.label}
                                        </Typography>
                                        <Chip
                                            label={`Lv. ${item.weight}`}
                                            size="small"
                                            sx={{
                                                height: 20,
                                                fontSize: '0.65rem',
                                                fontWeight: 800,
                                                bgcolor: alpha(getRoleColor(item.color), 0.1),
                                                color: item.color === 'grey' ? 'grey.700' : `${item.color}.main`,
                                                border: 'none',
                                                borderRadius: 1
                                            }}
                                        />
                                    </Box>
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                    {item.description}
                                </Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            </Box>

            {/* Permission Table Section */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: 'primary.main', mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Monitor size={28} variant="Bold" color={theme.palette.primary.main} />
                    ตารางสิทธิ์การเข้าถึงเครื่องมือ (Permission Matrix)
                </Typography>
                <TableContainer
                    component={Paper}
                    sx={{
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                        maxHeight: 600
                    }}
                >
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: 700,
                                        bgcolor: alpha(theme.palette.background.default, 0.95),
                                        backdropFilter: 'blur(8px)',
                                        zIndex: 10
                                    }}
                                >
                                    เครื่องมือ / สิทธิ์ระบบ
                                </TableCell>
                                {ROLES_INFO.filter(r => ['admin', 'hr_manager', 'hr', 'dept_manager', 'employee'].includes(r.role)).map(r => (
                                    <TableCell
                                        key={r.role}
                                        align="center"
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            bgcolor: alpha(theme.palette.background.default, 0.95),
                                            backdropFilter: 'blur(8px)',
                                            color: r.color === 'grey' ? 'text.secondary' : `${r.color}.main`
                                        }}
                                    >
                                        {r.label}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {PERMISSIONS_LIST.map((perm) => (
                                <TableRow key={perm.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                                    <TableCell sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'text.primary' }}>
                                        {perm.label}
                                    </TableCell>
                                    {ROLES_INFO.filter(r => ['admin', 'hr_manager', 'hr', 'dept_manager', 'employee'].includes(r.role)).map(r => (
                                        <TableCell key={r.role} align="center">
                                            {perm.roles.includes(r.role) ? (
                                                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                                    <Box sx={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: '50%',
                                                        bgcolor: alpha(theme.palette.success.main, 0.1),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <ShieldTick size={20} variant="Bold" color={theme.palette.success.main} />
                                                    </Box>
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.disabled" fontWeight={700}>-</Typography>
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>

            {/* Auto-Escalation Section */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: 'primary.main', mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Flash size={28} variant="Bold" color={theme.palette.primary.main} />
                    ระบบส่งต่ออัตโนมัติ (Auto-Escalation Logic)
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                    {/* Time Condition Card */}
                    <Paper
                        sx={{
                            p: 3,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: alpha(theme.palette.warning.main, 0.02),
                            height: '100%'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main', borderRadius: 1 }}>
                                <Timer size={24} variant="Bold" color={theme.palette.warning.main} />
                            </Avatar>
                            <Typography variant="subtitle1" fontWeight={700}>
                                เงื่อนไขด้านเวลา
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                            หากใบลาถูกยื่นเข้ามาแล้วผู้มีอำนาจอนุมัติตามลำดับ (Approver) ยังไม่ดำเนินการใดๆ
                            ระบบจะตรวจสอบที่เวลา <strong>13:00 น. ของวันทำงานถัดไป</strong> หากยังค้างอยู่จะถูกส่งต่อให้ HR Manager ทันที
                        </Typography>
                    </Paper>

                    {/* Target Logic Card */}
                    <Paper
                        sx={{
                            p: 3,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: alpha(theme.palette.error.main, 0.02),
                            height: '100%'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main', borderRadius: 1 }}>
                                <SecuritySafe size={24} variant="Bold" color={theme.palette.error.main} />
                            </Avatar>
                            <Typography variant="subtitle1" fontWeight={700}>
                                ปลายทางของการส่งต่อ (Target Role)
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                            เป้าหมายหลักในการรับ Escalation คือพนักงานที่ถือสิทธิ์ <strong>HR Manager</strong> ประจำบริษัทนั้นๆ
                            ซึ่งจะสามารถอนุมัติได้ทุกเลเวลเพื่อแก้ไขคอขวด (Bottleneck) ของกระบวนการลา
                        </Typography>
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
}
