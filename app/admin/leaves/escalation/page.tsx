'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
    TablePagination,
    IconButton,
    Chip,
    Tooltip,
    TextField,
    InputAdornment,
    Card,
    CardContent,
    Avatar,
    alpha,
    useTheme,
    Skeleton,
    Button,
    Checkbox,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    CircularProgress,
} from '@mui/material';
import {
    SearchNormal1,
    Refresh2,
    DocumentText,
    Clock as ClockIcon,
    Timer1,
    Warning2,
    Danger,
    Send2,
    ArrowRight2,
    Eye as EyeIcon,
    CloseSquare,
    Call,
    Paperclip2,
    Image as ImageIconsax,
    DocumentDownload,
    Calendar as CalendarIcon,
    User as UserIcon,
} from 'iconsax-react';
import { useToastr } from '@/app/components/Toastr';

// Thai date formatter
const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const formatThaiDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
};
const formatThaiDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543} ${hours}:${mins}`;
};

interface UserInfo {
    id: number;
    employeeId: string;
    firstName: string;
    lastName: string;
    company: string;
    department: string;
    departmentName?: string;
    section?: string;
    sectionName?: string;
    position?: string;
    avatar?: string;
}

interface Approver {
    id: number;
    employeeId: string;
    firstName: string;
    lastName: string;
    role: string;
}

interface Approval {
    id: number;
    level: number;
    status: string;
    approvedAt?: string;
    comment?: string;
    approver: Approver;
}

interface Attachment {
    id: number;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
}

interface LeaveRequest {
    id: number;
    leaveCode: string;
    userId: number;
    leaveType: string;
    leaveTypeName: string;
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
    totalDays: number;
    reason: string;
    status: string;
    rejectReason?: string;
    currentLevel: number;
    contactPhone?: string;
    contactAddress?: string;
    createdAt: string;
    user: UserInfo;
    approvals: Approval[];
    attachments: Attachment[];
    pendingDays: number;
    currentApprover: Approver | null;
}

interface Stats {
    total: number;
    overdue2Days: number;
    overdue3Days: number;
    overdue7Days: number;
}

const roleLabels: Record<string, string> = {
    employee: 'พนักงาน',
    shift_supervisor: 'หัวหน้ากะ',
    section_head: 'หัวหน้าแผนก',
    dept_manager: 'ผจก.ฝ่าย',
    hr_manager: 'ผจก.HR',
    admin: 'Admin',
    hr: 'HR',
};

// Stat Card Component
interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: 'primary' | 'success' | 'warning' | 'error' | 'secondary';
    isActive?: boolean;
}

function StatCard({ title, value, icon, color, isActive }: StatCardProps) {
    const theme = useTheme();

    const colorMap = {
        primary: {
            main: theme.palette.primary.main,
            bg: alpha(theme.palette.primary.main, 0.1),
        },
        success: {
            main: theme.palette.success.main,
            bg: alpha(theme.palette.success.main, 0.1),
        },
        warning: {
            main: theme.palette.warning.main,
            bg: alpha(theme.palette.warning.main, 0.1),
        },
        error: {
            main: theme.palette.error.main,
            bg: alpha(theme.palette.error.main, 0.1),
        },
        secondary: {
            main: theme.palette.secondary.main,
            bg: alpha(theme.palette.secondary.main, 0.1),
        },
    };

    const currentColor = colorMap[color];

    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: 1,
                border: '1px solid',
                borderColor: isActive ? currentColor.main : 'divider',
                bgcolor: isActive ? alpha(currentColor.main, 0.04) : 'background.paper',
                transition: 'all 0.2s ease',
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        {title}
                    </Typography>
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1,
                            bgcolor: currentColor.bg,
                            color: currentColor.main,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {icon}
                    </Box>
                </Box>
                <Typography variant="h4" fontWeight={600} sx={{ color: 'text.primary' }}>
                    {value}
                </Typography>
            </CardContent>
        </Card>
    );
}

// Table Skeleton
function TableSkeleton() {
    return (
        <TableBody>
            {[1, 2, 3, 4, 5].map((row) => (
                <TableRow key={row}>
                    <TableCell padding="checkbox"><Skeleton variant="rectangular" width={20} height={20} /></TableCell>
                    <TableCell><Skeleton variant="text" width={80} /></TableCell>
                    <TableCell><Skeleton variant="circular" width={40} height={40} /></TableCell>
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="text" width={60} /></TableCell>
                    <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                    <TableCell align="right"><Skeleton variant="circular" width={36} height={36} /></TableCell>
                </TableRow>
            ))}
        </TableBody>
    );
}

export default function EscalationPage() {
    const theme = useTheme();
    const toastr = useToastr();
    const [loading, setLoading] = useState(true);
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [stats, setStats] = useState<Stats>({ total: 0, overdue2Days: 0, overdue3Days: 0, overdue7Days: 0 });
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Selection
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [selectAll, setSelectAll] = useState(false);

    // Escalation
    const [isEscalating, setIsEscalating] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    // Detail dialog
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);

    // Image modal
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);

    // Helper to check if file is an image
    const isImageFile = (mimeType: string) => {
        return mimeType.startsWith('image/');
    };

    // Handle file click
    const handleFileClick = (file: Attachment) => {
        if (isImageFile(file.mimeType)) {
            setSelectedImage({ url: file.filePath, name: file.fileName });
            setImageModalOpen(true);
        } else {
            window.open(file.filePath, '_blank');
        }
    };

    const fetchLeaves = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/leaves/escalatable');
            if (!response.ok) throw new Error('Failed to fetch leaves');
            const data = await response.json();
            setLeaves(data.leaves);
            setStats(data.stats);
        } catch (error) {
            console.error('Error fetching leaves:', error);
            toastr.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            setLoading(false);
        }
    }, [toastr]);

    useEffect(() => {
        fetchLeaves();
    }, [fetchLeaves]);

    // Filter by search
    const filteredLeaves = leaves.filter(leave => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            leave.user.firstName.toLowerCase().includes(query) ||
            leave.user.lastName.toLowerCase().includes(query) ||
            leave.user.employeeId.toLowerCase().includes(query) ||
            leave.leaveCode.toLowerCase().includes(query)
        );
    });

    // Paginated leaves
    const paginatedLeaves = filteredLeaves.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    // Selection handlers
    const handleSelectAll = (checked: boolean) => {
        setSelectAll(checked);
        if (checked) {
            setSelectedIds(filteredLeaves.map(l => l.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id));
            setSelectAll(false);
        }
    };

    // Escalate handler
    const handleEscalate = async () => {
        if (selectedIds.length === 0) {
            toastr.warning('กรุณาเลือกใบลาที่ต้องการส่งต่อ');
            return;
        }

        try {
            setIsEscalating(true);
            const response = await fetch('/api/admin/leaves/escalatable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leaveIds: selectedIds }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to escalate');
            }

            toastr.success(data.message || `ส่งต่อใบลา ${data.success} ใบสำเร็จ`);
            setSelectedIds([]);
            setSelectAll(false);
            setConfirmDialogOpen(false);
            fetchLeaves();
        } catch (error: any) {
            console.error('Error escalating:', error);
            toastr.error(error.message || 'เกิดข้อผิดพลาดในการส่งต่อใบลา');
        } finally {
            setIsEscalating(false);
        }
    };

    const handleEscalateAll = async () => {
        if (filteredLeaves.length === 0) {
            toastr.warning('ไม่มีใบลาที่ต้องส่งต่อ');
            return;
        }

        setSelectedIds(filteredLeaves.map(l => l.id));
        setConfirmDialogOpen(true);
    };

    const handleOpenDetail = (leave: LeaveRequest) => {
        setSelectedLeave(leave);
        setDetailDialogOpen(true);
    };

    const getPendingDaysColor = (days: number) => {
        if (days >= 7) return 'error';
        if (days >= 3) return 'warning';
        return 'primary';
    };

    const getPendingDaysIcon = (days: number) => {
        if (days >= 7) return <Danger size={16} variant="Bold" color={theme.palette.error.main} />;
        if (days >= 3) return <Warning2 size={16} variant="Bold" color={theme.palette.warning.main} />;
        return <Timer1 size={16} variant="Bold" color={theme.palette.primary.main} />;
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 1,
                                bgcolor: alpha(theme.palette.warning.main, 0.1),
                                color: 'warning.main',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Timer1 size={24} variant="Bulk" color={theme.palette.warning.main} />
                        </Box>
                        <Box>
                            <Typography variant="h4" component="h1" fontWeight={700}>
                                ส่งต่อใบลา (Escalation)
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                ใบลาที่รอดำเนินการเกิน 2 วัน - ส่งต่อไป HR Manager เพื่ออนุมัติ
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button
                            variant="outlined"
                            startIcon={<Refresh2 size={18} color={theme.palette.primary.main} />}
                            onClick={fetchLeaves}
                            disabled={loading}
                            sx={{
                                borderRadius: 1,
                                textTransform: 'none',
                                borderColor: 'divider',
                                color: 'text.primary',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: alpha(theme.palette.primary.main, 0.04)
                                }
                            }}
                        >
                            รีเฟรช
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<Send2 size={18} color="#fff" />}
                            onClick={handleEscalateAll}
                            disabled={loading || filteredLeaves.length === 0}
                            sx={{
                                borderRadius: 1,
                                textTransform: 'none',
                                bgcolor: 'warning.main',
                                '&:hover': {
                                    bgcolor: 'warning.dark',
                                }
                            }}
                        >
                            ส่งต่อทั้งหมด ({filteredLeaves.length})
                        </Button>
                    </Box>
                </Box>
            </Box>

            {/* Stat Cards */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                    gap: 2,
                    mb: 4,
                }}
            >
                <StatCard
                    title="ทั้งหมด"
                    value={stats.total}
                    icon={<DocumentText size={20} variant="Bold" color="currentColor" />}
                    color="primary"
                />
                <StatCard
                    title="รอเกิน 2 วัน"
                    value={stats.overdue2Days}
                    icon={<ClockIcon size={20} variant="Bold" color="currentColor" />}
                    color="warning"
                />
                <StatCard
                    title="รอเกิน 3 วัน"
                    value={stats.overdue3Days}
                    icon={<Warning2 size={20} variant="Bold" color="currentColor" />}
                    color="warning"
                />
                <StatCard
                    title="รอเกิน 7 วัน"
                    value={stats.overdue7Days}
                    icon={<Danger size={20} variant="Bold" color="currentColor" />}
                    color="error"
                />
            </Box>

            {/* Search & Actions */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                        placeholder="ค้นหาชื่อ, รหัสพนักงาน, รหัสใบลา..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="small"
                        sx={{ minWidth: 300 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchNormal1 size={18} color={theme.palette.text.secondary} />
                                </InputAdornment>
                            ),
                        }}
                    />
                    {selectedIds.length > 0 && (
                        <Button
                            variant="contained"
                            color="warning"
                            startIcon={<Send2 size={18} color="#fff" />}
                            onClick={() => setConfirmDialogOpen(true)}
                            disabled={isEscalating}
                            sx={{ borderRadius: 1, textTransform: 'none' }}
                        >
                            ส่งต่อที่เลือก ({selectedIds.length})
                        </Button>
                    )}
                </Box>
            </Paper>

            {/* Table - Desktop */}
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                    display: { xs: 'none', md: 'block' },
                }}
            >
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={selectAll}
                                        indeterminate={selectedIds.length > 0 && selectedIds.length < filteredLeaves.length}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        disabled={loading || filteredLeaves.length === 0}
                                    />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>รหัสใบลา</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>พนักงาน</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>ประเภทลา</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>วันที่ลา</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>จำนวน</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>รอดำเนินการ</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>ผู้อนุมัติปัจจุบัน</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>จัดการ</TableCell>
                            </TableRow>
                        </TableHead>
                        {loading ? (
                            <TableSkeleton />
                        ) : filteredLeaves.length === 0 ? (
                            <TableBody>
                                <TableRow>
                                    <TableCell colSpan={9} sx={{ py: 8, textAlign: 'center' }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                            <Avatar sx={{ width: 60, height: 60, bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main' }}>
                                                <DocumentText size={30} variant="Outline" color='green' />
                                            </Avatar>
                                            <Typography variant="body1" fontWeight={600} color="text.secondary">
                                                ไม่มีใบลาที่ต้องส่งต่อ
                                            </Typography>
                                            <Typography variant="body2" color="text.disabled">
                                                ใบลาทั้งหมดได้รับการดำเนินการแล้ว หรือยังไม่เกิน 2 วัน
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        ) : (
                            <TableBody>
                                {paginatedLeaves.map((leave) => (
                                    <TableRow
                                        key={leave.id}
                                        hover
                                        selected={selectedIds.includes(leave.id)}
                                        sx={{
                                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                                            bgcolor: leave.pendingDays >= 7 ? alpha(theme.palette.error.main, 0.04) : 'inherit',
                                        }}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={selectedIds.includes(leave.id)}
                                                onChange={(e) => handleSelectOne(leave.id, e.target.checked)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box>
                                                <Chip
                                                    label={leave.leaveCode}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                        color: 'primary.main',
                                                        fontWeight: 600,
                                                        fontSize: '0.75rem',
                                                    }}
                                                />
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                                    {formatThaiDate(leave.createdAt)}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar
                                                    src={leave.user.avatar || undefined}
                                                    sx={{ width: 36, height: 36, bgcolor: theme.palette.primary.main }}
                                                >
                                                    {leave.user.firstName.charAt(0)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {leave.user.firstName} {leave.user.lastName}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {leave.user.employeeId}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{leave.leaveTypeName}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {formatThaiDate(leave.startDate)} - {formatThaiDate(leave.endDate)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${leave.totalDays} วัน`}
                                                size="small"
                                                sx={{
                                                    bgcolor: alpha(theme.palette.info.main, 0.1),
                                                    color: 'info.main',
                                                    fontWeight: 600,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={getPendingDaysIcon(leave.pendingDays)}
                                                label={`${leave.pendingDays} วัน`}
                                                size="small"
                                                color={getPendingDaysColor(leave.pendingDays) as any}
                                                variant="outlined"
                                                sx={{ fontWeight: 600 }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {leave.currentApprover ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'grey.400' }}>
                                                        {leave.currentApprover.firstName.charAt(0)}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="caption" fontWeight={600}>
                                                            {leave.currentApprover.firstName} {leave.currentApprover.lastName}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" display="block">
                                                            {roleLabels[leave.currentApprover.role] || leave.currentApprover.role}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            ) : (
                                                <Typography variant="caption" color="text.disabled">-</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="ดูรายละเอียด">
                                                <IconButton size="small" onClick={() => handleOpenDetail(leave)}>
                                                    <EyeIcon size={18} color={theme.palette.primary.main} />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        )}
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={filteredLeaves.length}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage="แสดง"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} จาก ${count}`}
                />
            </Paper>

            {/* Mobile Card View */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} variant="rounded" height={200} sx={{ borderRadius: 1 }} />
                    ))
                ) : filteredLeaves.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 1, bgcolor: alpha(theme.palette.success.main, 0.04) }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ width: 60, height: 60, bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main' }}>
                                <DocumentText size={30} variant="Outline" />
                            </Avatar>
                            <Typography variant="body1" fontWeight={600} color="text.secondary">
                                ไม่มีใบลาที่ต้องส่งต่อ
                            </Typography>
                        </Box>
                    </Paper>
                ) : (
                    paginatedLeaves.map((leave) => (
                        <Paper
                            key={leave.id}
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: selectedIds.includes(leave.id) ? 'warning.main' : 'divider',
                                bgcolor: leave.pendingDays >= 7 ? alpha(theme.palette.error.main, 0.04) : 'background.paper',
                            }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                    <Checkbox
                                        checked={selectedIds.includes(leave.id)}
                                        onChange={(e) => handleSelectOne(leave.id, e.target.checked)}
                                        size="small"
                                    />
                                    <Avatar
                                        src={leave.user.avatar || undefined}
                                        sx={{ width: 40, height: 40, bgcolor: theme.palette.primary.main }}
                                    >
                                        {leave.user.firstName.charAt(0)}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            {leave.user.firstName} {leave.user.lastName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {leave.user.employeeId}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Chip
                                    icon={getPendingDaysIcon(leave.pendingDays)}
                                    label={`รอ ${leave.pendingDays} วัน`}
                                    size="small"
                                    color={getPendingDaysColor(leave.pendingDays) as any}
                                    variant="outlined"
                                />
                            </Box>

                            <Divider sx={{ my: 1.5 }} />

                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1.5 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">ประเภทลา</Typography>
                                    <Typography variant="body2" fontWeight={600}>{leave.leaveTypeName}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">จำนวน</Typography>
                                    <Typography variant="body2" fontWeight={600}>{leave.totalDays} วัน</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">วันที่ส่ง</Typography>
                                    <Typography variant="body2" fontWeight={600}>{formatThaiDate(leave.createdAt)}</Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mb: 1.5 }}>
                                <Typography variant="caption" color="text.secondary">วันที่ลา</Typography>
                                <Typography variant="body2">{formatThaiDate(leave.startDate)} - {formatThaiDate(leave.endDate)}</Typography>
                            </Box>

                            {leave.currentApprover && (
                                <Box sx={{ mb: 1.5 }}>
                                    <Typography variant="caption" color="text.secondary">ผู้อนุมัติปัจจุบัน</Typography>
                                    <Typography variant="body2">
                                        {leave.currentApprover.firstName} {leave.currentApprover.lastName} ({roleLabels[leave.currentApprover.role]})
                                    </Typography>
                                </Box>
                            )}

                            <Button
                                fullWidth
                                variant="outlined"
                                size="small"
                                startIcon={<EyeIcon size={16} color={theme.palette.primary.main} />}
                                onClick={() => handleOpenDetail(leave)}
                                sx={{ borderRadius: 1, textTransform: 'none' }}
                            >
                                ดูรายละเอียด
                            </Button>
                        </Paper>
                    ))
                )}

                {filteredLeaves.length > 0 && (
                    <TablePagination
                        component="div"
                        count={filteredLeaves.length}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 25]}
                        labelRowsPerPage="แสดง"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} จาก ${count}`}
                    />
                )}
            </Box>

            {/* Confirm Dialog */}
            <Dialog
                open={confirmDialogOpen}
                onClose={() => !isEscalating && setConfirmDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 1 } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                        sx={{
                            p: 1,
                            borderRadius: 1,
                            bgcolor: alpha(theme.palette.warning.main, 0.1),
                        }}
                    >
                        <Send2 size={24} variant="Bold" color={theme.palette.warning.main} />
                    </Box>
                    <Typography variant="h6" component="span" fontWeight={700}>
                        ยืนยันการส่งต่อใบลา
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        คุณต้องการส่งต่อใบลาจำนวน <strong>{selectedIds.length}</strong> ใบ ไปให้ HR Manager พิจารณาหรือไม่?
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.warning.main, 0.08), borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            <strong>หมายเหตุ:</strong> การดำเนินการนี้จะข้ามผู้อนุมัติปัจจุบัน และส่งใบลาไปให้ HR Manager โดยตรง
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, pt: 1 }}>
                    <Button
                        onClick={() => setConfirmDialogOpen(false)}
                        disabled={isEscalating}
                        sx={{ borderRadius: 1, textTransform: 'none' }}
                    >
                        ยกเลิก
                    </Button>
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={handleEscalate}
                        disabled={isEscalating}
                        startIcon={isEscalating ? <CircularProgress size={16} color="inherit" /> : <Send2 size={18} color="#fff" />}
                        sx={{ borderRadius: 1, textTransform: 'none' }}
                    >
                        {isEscalating ? 'กำลังส่ง...' : 'ยืนยันส่งต่อ'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog
                open={detailDialogOpen}
                onClose={() => setDetailDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 1 } }}
            >
                {selectedLeave && (
                    <>
                        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <DocumentText size={24} variant="Bold" color={theme.palette.primary.main} />
                                <Typography variant="h6" component="span" fontWeight={700}>
                                    รายละเอียดใบลา
                                </Typography>
                            </Box>
                            <IconButton size="small" onClick={() => setDetailDialogOpen(false)}>
                                <CloseSquare size={20} color={theme.palette.text.secondary} />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent dividers>
                            {/* Employee Info */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                <Avatar
                                    src={selectedLeave.user.avatar || undefined}
                                    sx={{ width: 56, height: 56, bgcolor: theme.palette.primary.main }}
                                >
                                    {selectedLeave.user.firstName.charAt(0)}
                                </Avatar>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        {selectedLeave.user.firstName} {selectedLeave.user.lastName}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {selectedLeave.user.employeeId} • {selectedLeave.user.departmentName || selectedLeave.user.department}
                                        {selectedLeave.user.sectionName && ` / ${selectedLeave.user.sectionName}`}
                                    </Typography>
                                </Box>
                            </Box>

                            <Divider sx={{ mb: 2 }} />

                            {/* Leave Details */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">รหัสใบลา</Typography>
                                    <Typography variant="body2" fontWeight={600}>{selectedLeave.leaveCode}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">ประเภทลา</Typography>
                                    <Typography variant="body2" fontWeight={600}>{selectedLeave.leaveTypeName}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">วันที่เริ่ม</Typography>
                                    <Typography variant="body2">{formatThaiDate(selectedLeave.startDate)}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">วันที่สิ้นสุด</Typography>
                                    <Typography variant="body2">{formatThaiDate(selectedLeave.endDate)}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">จำนวนวันลา</Typography>
                                    <Typography variant="body2" fontWeight={600}>{selectedLeave.totalDays} วัน</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">รอดำเนินการ</Typography>
                                    <Chip
                                        icon={getPendingDaysIcon(selectedLeave.pendingDays)}
                                        label={`${selectedLeave.pendingDays} วัน`}
                                        size="small"
                                        color={getPendingDaysColor(selectedLeave.pendingDays) as any}
                                        variant="outlined"
                                    />
                                </Box>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary">เหตุผลการลา</Typography>
                                <Typography variant="body2">{selectedLeave.reason || '-'}</Typography>
                            </Box>

                            {selectedLeave.contactPhone && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="caption" color="text.secondary">เบอร์ติดต่อ</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Call size={16} color={theme.palette.text.secondary} />
                                        <Typography variant="body2">{selectedLeave.contactPhone}</Typography>
                                    </Box>
                                </Box>
                            )}

                            {/* Current Approver */}
                            {selectedLeave.currentApprover && (
                                <Box sx={{ p: 2, bgcolor: alpha(theme.palette.warning.main, 0.08), borderRadius: 1, mb: 2 }}>
                                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                                        ผู้อนุมัติปัจจุบัน (รอดำเนินการ)
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'grey.400' }}>
                                            {selectedLeave.currentApprover.firstName.charAt(0)}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" fontWeight={600}>
                                                {selectedLeave.currentApprover.firstName} {selectedLeave.currentApprover.lastName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {roleLabels[selectedLeave.currentApprover.role] || selectedLeave.currentApprover.role}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            )}

                            {/* Attachments */}
                            {selectedLeave.attachments && selectedLeave.attachments.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Paperclip2 size={16} color={theme.palette.text.secondary} />
                                        เอกสารแนบ ({selectedLeave.attachments.length})
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {selectedLeave.attachments.map((file) => (
                                            <Paper
                                                key={file.id}
                                                variant="outlined"
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    cursor: 'pointer',
                                                    '&:hover': { bgcolor: 'action.hover' },
                                                }}
                                                onClick={() => handleFileClick(file)}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    {isImageFile(file.mimeType) ? (
                                                        <ImageIconsax size={20} color={theme.palette.info.main} />
                                                    ) : (
                                                        <DocumentDownload size={20} color={theme.palette.text.secondary} />
                                                    )}
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={500}>{file.fileName}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {(file.fileSize / 1024).toFixed(1)} KB
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <ArrowRight2 size={16} color={theme.palette.text.secondary} />
                                            </Paper>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ p: 2.5 }}>
                            <Button
                                onClick={() => setDetailDialogOpen(false)}
                                sx={{ borderRadius: 1, textTransform: 'none' }}
                            >
                                ปิด
                            </Button>
                            {!selectedIds.includes(selectedLeave.id) && (
                                <Button
                                    variant="contained"
                                    color="warning"
                                    startIcon={<Send2 size={18} color="#fff" />}
                                    onClick={() => {
                                        setSelectedIds([selectedLeave.id]);
                                        setDetailDialogOpen(false);
                                        setConfirmDialogOpen(true);
                                    }}
                                    sx={{ borderRadius: 1, textTransform: 'none' }}
                                >
                                    ส่งต่อใบลานี้
                                </Button>
                            )}
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Image Modal */}
            <Dialog
                open={imageModalOpen}
                onClose={() => setImageModalOpen(false)}
                maxWidth="lg"
                PaperProps={{ sx: { borderRadius: 1 } }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" component="span" fontWeight={600}>{selectedImage?.name}</Typography>
                    <IconButton size="small" onClick={() => setImageModalOpen(false)}>
                        <CloseSquare size={20} color={theme.palette.text.secondary} />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {selectedImage && (
                        <img
                            src={selectedImage.url}
                            alt={selectedImage.name}
                            style={{ width: '100%', height: 'auto', display: 'block' }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
}
