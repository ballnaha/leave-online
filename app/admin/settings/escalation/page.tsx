'use client';

import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    TextField,
    Card,
    CardContent,
    Avatar,
    alpha,
    useTheme,
    Alert,
    Chip,
    CircularProgress,
    Divider,
    Switch,
    FormControlLabel,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Paper,
    Tabs,
    Tab,
} from '@mui/material';
import {
    Timer,
    Clock,
    AlertTriangle,
    CheckCircle,
    RefreshCw,
    Play,
    Settings,
    Bell,
    Send,
    Users,
    Calendar,
    Copy,
    Rocket,
    Tag,
    Eye,
} from 'lucide-react';
import { useToastr } from '@/app/components/Toastr';
import {
    DocumentText,
    Clock as ClockIcon,
    TickCircle,
    CloseCircle,
    InfoCircle,
    Calendar as CalendarIcon,
    User as UserIcon,
    Call,
    CloseSquare,
    Image as ImageIconsax,
    Paperclip2,
    ArrowRight2,
} from 'iconsax-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.locale('th');
dayjs.extend(relativeTime);

interface EscalationConfig {
    escalationHours: number;
    reminderHours: number;
    enabled: boolean;
    lastRun: string | null;
    cronConfigured: boolean;
}

interface EscalationLog {
    id: number;
    leaveRequestId: number;
    leaveCode: string; // Added leaveCode
    employeeName: string;
    leaveType: string;
    escalatedTo: string;
    escalatedAt: string;
    status: string;
}

interface PendingEscalation {
    id: number;
    leaveCode: string;
    employeeName: string;
    leaveType: string;
    createdAt: string;
    deadline: string;
    hoursRemaining: number;
    currentApprover: string;
}

interface LeaveDetail {
    id: number;
    leaveCode: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    status: string;
    user: {
        firstName: string;
        lastName: string;
        department: string;
        position: string;
        phone?: string;
    };
    attachments: any[];
    approvals: any[];
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

const statusConfig: Record<string, { label: string; color: 'warning' | 'success' | 'error' | 'default'; icon: React.ReactElement }> = {
    pending: { label: 'รออนุมัติ', color: 'warning', icon: <ClockIcon size={14} variant="Bold" color="currentColor" /> },
    approved: { label: 'อนุมัติแล้ว', color: 'success', icon: <TickCircle size={14} variant="Bold" color="currentColor" /> },
    rejected: { label: 'ไม่อนุมัติ', color: 'error', icon: <CloseCircle size={14} variant="Bold" color="currentColor" /> },
    cancelled: { label: 'ยกเลิก', color: 'default', icon: <InfoCircle size={14} variant="Bold" color="currentColor" /> },
    skipped: { label: 'ข้าม', color: 'default', icon: <InfoCircle size={14} variant="Bold" color="currentColor" /> },
};

const formatDate = (dateStr: string) => dayjs(dateStr).format('DD MMM YYYY');
const formatDateTime = (dateStr: string) => dayjs(dateStr).format('DD MMM YYYY HH:mm');


export default function EscalationSettingsPage() {
    const theme = useTheme();
    const toastr = useToastr();
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);

    const [config, setConfig] = useState<EscalationConfig>({
        escalationHours: 48,
        reminderHours: 24,
        enabled: true,
        lastRun: null,
        cronConfigured: false,
    });

    const [pendingList, setPendingList] = useState<PendingEscalation[]>([]);
    const [recentLogs, setRecentLogs] = useState<EscalationLog[]>([]);
    const [stats, setStats] = useState({
        totalEscalated: 0,
        pendingCount: 0,
        nearDeadline: 0,
    });

    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<LeaveDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailTab, setDetailTab] = useState(0);

    // Confirm Dialog State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTitle, setConfirmTitle] = useState('');
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState<() => void>(() => { });

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmTitle(title);
        setConfirmMessage(message);
        setConfirmAction(() => onConfirm);
        setConfirmOpen(true);
    };

    const handleConfirmClose = () => {
        setConfirmOpen(false);
    };

    const handleConfirmOk = () => {
        setConfirmOpen(false);
        confirmAction();
    };

    const handleViewDetail = async (leaveId: number) => {
        setLoadingDetail(true);
        setDetailModalOpen(true);
        try {
            const res = await fetch(`/api/leaves/${leaveId}`);
            if (!res.ok) throw new Error('Failed to fetch detail');
            const data = await res.json();
            setSelectedLeave(data);
        } catch (error) {
            toastr.error('ไม่สามารถโหลดข้อมูลใบลาได้');
            setDetailModalOpen(false);
        } finally {
            setLoadingDetail(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/settings/escalation');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();

            setConfig(data.config || config);
            setPendingList(data.pending || []);
            setRecentLogs(data.logs || []);
            setStats(data.stats || stats);
        } catch (error) {
            console.error('Error:', error);
            toastr.error('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRunNow = async () => {
        try {
            setRunning(true);
            const res = await fetch('/api/cron/check-escalation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await res.json();

            if (res.ok) {
                toastr.success(`ตรวจสอบเสร็จ: Escalated ${data.escalated || 0}, Reminded ${data.reminded || 0}`);
                fetchData(); // Refresh data
            } else {
                throw new Error(data.error || 'Failed');
            }
        } catch (error) {
            toastr.error('ไม่สามารถรันได้');
        } finally {
            setRunning(false);
        }
    };

    const handleForceRun = async () => {
        showConfirm(
            'ยืนยัน Force Escalate ทั้งหมด',
            'คุณต้องการบังคับ Escalate ทุกใบลาที่ pending โดยไม่สนใจเวลาหรือไม่? (ใช้สำหรับการทดสอบเท่านั้น)',
            async () => {
                try {
                    setRunning(true);
                    const res = await fetch('/api/cron/check-escalation?force=true', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                    });

                    const data = await res.json();

                    if (res.ok) {
                        toastr.success(`Force Run เสร็จสิ้น: Escalated ${data.escalated || 0}`);
                        fetchData();
                    } else {
                        throw new Error(data.error || 'Failed');
                    }
                } catch (error) {
                    toastr.error('Force Run ล้มเหลว');
                } finally {
                    setRunning(false);
                }
            }
        );
    };

    const handleForceEscalateOne = (leaveId: number, leaveCode: string) => {
        showConfirm(
            'ยืนยัน Force Escalate',
            `คุณต้องการ Force Escalate ใบลา ${leaveCode} ทันทีหรือไม่?`,
            async () => {
                try {
                    setRunning(true);
                    const res = await fetch(`/api/cron/check-escalation?force=true&leaveId=${leaveId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                    });

                    const data = await res.json();

                    if (res.ok && (data.escalated > 0 || data.reminded > 0)) {
                        toastr.success(`Escalated ${leaveCode} เรียบร้อยแล้ว`);
                        fetchData();
                    } else if (data.errors && data.errors.length > 0) {
                        toastr.error(`เกิดข้อผิดพลาด: ${data.errors[0]}`);
                    } else {
                        toastr.warning('ไม่สามารถ Escalate ได้ (อาจสถานะเปลี่ยนไปแล้ว)');
                    }
                } catch (error) {
                    toastr.error('ดำเนินการล้มเหลว');
                } finally {
                    setRunning(false);
                }
            }
        );
    };

    const getStatusColor = (hoursRemaining: number) => {
        if (hoursRemaining <= 0) return 'error';
        if (hoursRemaining <= 12) return 'warning';
        return 'info';
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Avatar
                            sx={{
                                width: 48,
                                height: 48,
                                bgcolor: alpha(theme.palette.warning.main, 0.1),
                                color: 'warning.main',
                            }}
                        >
                            <Timer size={24} />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" component="h1" fontWeight={700}>
                                ⏰ Escalation Settings
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                ตั้งค่าการ Escalate ใบลาที่รออนุมัตินานเกินไป
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshCw size={18} />}
                        onClick={fetchData}
                        disabled={loading}
                    >
                        รีเฟรช
                    </Button>

                </Box>
            </Box>

            {/* Stats Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), width: 40, height: 40 }}>
                                <Clock size={20} color={theme.palette.info.main} />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" fontWeight={700} color="info.main">
                                    {stats.pendingCount}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    รออนุมัติทั้งหมด
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
                <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), width: 40, height: 40 }}>
                                <AlertTriangle size={20} color={theme.palette.warning.main} />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" fontWeight={700} color="warning.main">
                                    {stats.nearDeadline}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    ใกล้หมดเวลา
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
                <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), width: 40, height: 40 }}>
                                <Send size={20} color={theme.palette.error.main} />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" fontWeight={700} color="error.main">
                                    {stats.totalEscalated}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    ถูก Escalate แล้ว
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {/* Config Card */}
            <Card sx={{ mb: 3, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Settings size={20} />
                        ตั้งค่า Escalation
                    </Typography>

                    <Alert severity="success" icon={<CheckCircle size={20} />} sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={600}>
                            Auto Escalation เปิดใช้งานเสมอ
                        </Typography>
                    </Alert>

                    <Alert severity="info" icon={<Bell size={20} />}>
                        <Typography variant="body2">
                            <strong>เงื่อนไข:</strong> ใบลาที่รออนุมัติจะถูกส่งต่อไป HR Manager โดยอัตโนมัติ
                            เมื่อถึงเวลา <strong>08:00 น.</strong> ของวันที่ <strong>สร้างใบลา + 2 วัน</strong>
                        </Typography>
                    </Alert>
                </CardContent>
            </Card>

            {/* Cron Status & Generator */}
            <Card sx={{ mb: 3, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Timer size={20} />
                        ตั้งค่า Cron Job (สำหรับ aaPanel)
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Chip
                            icon={config.cronConfigured ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                            label={config.cronConfigured ? 'System Configured' : 'Missing CRON_SECRET'}
                            color={config.cronConfigured ? 'success' : 'warning'}
                            size="small"
                        />
                        {config.lastRun && (
                            <Typography variant="body2" color="text.secondary">
                                รันล่าสุด: {dayjs(config.lastRun).fromNow()}
                            </Typography>
                        )}
                    </Box>

                    {/* aaPanel Access URL Section */}
                    <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            วิธีตั้งค่าใน aaPanel (โหมด Access URL)
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            1. ไปที่เมนู <strong>Cron</strong> ใน aaPanel<br />
                            2. <strong>Type of Task:</strong> เลือก <code>URL Task</code><br />
                            3. <strong>Name of Task:</strong> ตั้งชื่อ (เช่น Leave Escalation)<br />
                            4. <strong>Execution Cycle:</strong> เลือกเวลาตามต้องการ (แนะนำ <code>Every Day</code> เวลา 09:00 และ 18:00)<br />
                            5. <strong>URL Address:</strong> ก็อปปี้ URL ด้านล่างไปวาง
                        </Typography>

                        <Box sx={{ mt: 2 }}>
                            <TextField
                                fullWidth
                                size="small"
                                value={`https://leave.poonsubcan.co.th/api/cron/check-escalation?secret=${process.env.NEXT_PUBLIC_CRON_SECRET || 'YOUR_CRON_SECRET'}`}
                                InputProps={{
                                    readOnly: true,
                                    sx: { fontFamily: 'monospace', bgcolor: 'white', fontSize: '0.85rem' },
                                    endAdornment: (
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <Tooltip title="ทดสอบทำงาน (Run Now)">
                                                <IconButton
                                                    size="small"
                                                    onClick={handleRunNow}
                                                    disabled={running || !config.cronConfigured}
                                                    color="warning"
                                                >
                                                    {running ? <CircularProgress size={16} /> : <Play size={16} />}
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="คัดลอก URL">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`https://leave.poonsubcan.co.th/api/cron/check-escalation?secret=${process.env.NEXT_PUBLIC_CRON_SECRET || 'YOUR_CRON_SECRET'}`);
                                                        toastr.success('คัดลอก URL แล้ว');
                                                    }}
                                                    disabled={!config.cronConfigured}
                                                    color="primary"
                                                >
                                                    <Copy size={16} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    )
                                }}
                            />
                        </Box>
                        {!config.cronConfigured && (
                            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                                * กรุณากำหนด CRON_SECRET ในไฟล์ .env ก่อน
                            </Typography>
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* Pending Escalations */}
            {pendingList.length > 0 && (
                <Card sx={{ mb: 3, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Clock size={20} />
                            ใบลาที่รออนุมัติ ({pendingList.length})
                        </Typography>

                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>รหัสใบลา</TableCell>
                                        <TableCell>พนักงาน</TableCell>
                                        <TableCell>ประเภท</TableCell>
                                        <TableCell>ผู้อนุมัติปัจจุบัน</TableCell>
                                        <TableCell align="center">กำหนด Escalate (HR)</TableCell>
                                        <TableCell>สถานะ</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {pendingList.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Chip
                                                    icon={<Tag size={12} />}
                                                    label={item.leaveCode || `#${item.id}`}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ borderRadius: 1, height: 24, fontSize: '0.75rem', cursor: 'pointer' }}
                                                    onClick={() => handleViewDetail(item.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {item.employeeName}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{item.leaveType}</TableCell>
                                            <TableCell>{item.currentApprover}</TableCell>
                                            <TableCell align="center">
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                                    <Typography variant="caption" fontWeight={600}>
                                                        {dayjs(item.deadline).format('DD MMM HH:mm')}
                                                    </Typography>
                                                    <Chip
                                                        label={item.hoursRemaining <= 0
                                                            ? `เกินมา ${Math.abs(item.hoursRemaining)} ชม.`
                                                            : `อีก ${item.hoursRemaining} ชม.`}
                                                        size="small"
                                                        color={getStatusColor(item.hoursRemaining)}
                                                        variant="filled"
                                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                                    />
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                {item.hoursRemaining <= 0 ? (
                                                    <Chip label="รอ Escalate" size="small" color="error" variant="outlined" />
                                                ) : item.hoursRemaining <= 24 ? (
                                                    <Chip label="ใกล้หมดเวลา" size="small" color="warning" variant="outlined" />
                                                ) : (
                                                    <Chip label="ปกติ" size="small" color="success" variant="outlined" />
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                    <Tooltip title="ดูละเอียด">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleViewDetail(item.id)}
                                                        >
                                                            <Eye size={16} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Force Escalate (ทันที)">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleForceEscalateOne(item.id, item.leaveCode)}
                                                            disabled={running}
                                                        >
                                                            <Rocket size={16} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* Recent Escalations */}
            <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Send size={20} />
                        ประวัติการ Escalate
                    </Typography>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : recentLogs.length === 0 ? (
                        <Alert severity="info">ยังไม่มีประวัติการ Escalate</Alert>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>รหัสใบลา</TableCell>
                                        <TableCell>เวลา</TableCell>
                                        <TableCell>พนักงาน</TableCell>
                                        <TableCell>ประเภท</TableCell>
                                        <TableCell>ส่งต่อให้</TableCell>
                                        <TableCell align="center">สถานะ</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {recentLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                <Chip
                                                    icon={<Tag size={12} />}
                                                    label={log.leaveCode || `#${log.leaveRequestId}`}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ borderRadius: 1, height: 24, fontSize: '0.75rem', cursor: 'pointer' }}
                                                    onClick={() => handleViewDetail(log.leaveRequestId)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption">
                                                    {dayjs(log.escalatedAt).format('DD MMM YYYY HH:mm')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {log.employeeName}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{log.leaveType}</TableCell>
                                            <TableCell>{log.escalatedTo}</TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    icon={<CheckCircle size={14} />}
                                                    label={log.status}
                                                    size="small"
                                                    color="success"
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="ดูละเอียด">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleViewDetail(log.leaveRequestId)}
                                                    >
                                                        <Eye size={16} />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                    )}
                </CardContent>
            </Card>
            {/* Leave Detail Modal */}
            <Dialog
                open={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 1 } }}
            >
                <DialogTitle sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    pb: 2
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                            <DocumentText size={20} variant="Outline" color="#6C63FF" />
                        </Avatar>
                        <Box>
                            <Typography component="div" variant="h6" fontWeight={600}>
                                ใบลา {selectedLeave?.leaveCode || `#${selectedLeave?.id}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                สร้างเมื่อ {selectedLeave && formatDateTime(selectedLeave.startDate)}
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton size="small" onClick={() => setDetailModalOpen(false)}>
                        <CloseSquare size={32} variant="Outline" color="#9E9E9E" />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 0 }}>
                    {loadingDetail ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                            <CircularProgress />
                        </Box>
                    ) : selectedLeave ? (
                        <>
                            <Tabs
                                value={detailTab}
                                onChange={(_, v) => setDetailTab(v)}
                                sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}
                            >
                                <Tab label="ข้อมูลใบลา" />
                                <Tab label={`ขั้นตอนอนุมัติ (${selectedLeave.approvals?.length || 0})`} />
                                {selectedLeave.attachments && selectedLeave.attachments.length > 0 && (
                                    <Tab label={`ไฟล์แนบ (${selectedLeave.attachments.length})`} />
                                )}
                            </Tabs>

                            <Box sx={{ p: 3 }}>
                                {/* Tab 0: Leave Info */}
                                {detailTab === 0 && (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        {/* Status */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Chip
                                                icon={statusConfig[selectedLeave.status]?.icon || <InfoCircle size={14} />}
                                                label={statusConfig[selectedLeave.status]?.label || selectedLeave.status}
                                                color={statusConfig[selectedLeave.status]?.color || 'default'}
                                                sx={{ fontWeight: 600 }}
                                            />
                                        </Box>

                                        {/* Employee Info */}
                                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <UserIcon size={16} variant="Outline" color="#6C63FF" /> ข้อมูลพนักงาน
                                            </Typography>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Avatar sx={{ width: 48, height: 48, bgcolor: theme.palette.primary.main }}>
                                                        {selectedLeave.user.firstName.charAt(0)}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {selectedLeave.user.firstName} {selectedLeave.user.lastName}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {selectedLeave.user.position}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">สังกัด</Typography>
                                                    <Typography variant="body2">
                                                        {selectedLeave.user.department}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Paper>

                                        {/* Leave Details */}
                                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CalendarIcon size={16} variant="Outline" color="#2196F3" /> รายละเอียดการลา
                                            </Typography>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1.5 }}>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">ประเภทการลา</Typography>
                                                    <Typography variant="body2" fontWeight={500}>{selectedLeave.leaveType}</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">จำนวนวัน</Typography>
                                                    <Typography variant="body2" fontWeight={500}>{selectedLeave.totalDays} วัน</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">วันที่เริ่ม</Typography>
                                                    <Typography variant="body2">
                                                        {formatDate(selectedLeave.startDate)}
                                                    </Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">วันที่สิ้นสุด</Typography>
                                                    <Typography variant="body2">
                                                        {formatDate(selectedLeave.endDate)}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ gridColumn: '1 / -1' }}>
                                                    <Typography variant="caption" color="text.secondary">เหตุผล</Typography>
                                                    <Typography variant="body2">{selectedLeave.reason}</Typography>
                                                </Box>
                                            </Box>
                                        </Paper>

                                        {/* Contact Info */}
                                        {selectedLeave.user.phone && (
                                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Call size={16} variant="Outline" color="#4CAF50" /> ข้อมูลติดต่อ
                                                </Typography>
                                                <Box sx={{ mt: 1.5 }}>
                                                    <Typography variant="caption" color="text.secondary">เบอร์โทร</Typography>
                                                    <Typography variant="body2">{selectedLeave.user.phone}</Typography>
                                                </Box>
                                            </Paper>
                                        )}
                                    </Box>
                                )}

                                {/* Tab 1: Approval Steps */}
                                {detailTab === 1 && selectedLeave.approvals && (
                                    <Box sx={{ position: 'relative', pl: 0 }}>
                                        {selectedLeave.approvals.map((approval: any, idx: number) => {
                                            const isPending = approval.status === 'pending';
                                            const isApproved = approval.status === 'approved';
                                            const isRejected = approval.status === 'rejected';
                                            const isCancelled = approval.status === 'cancelled';
                                            const isSkipped = approval.status === 'skipped';
                                            const isLast = idx === (selectedLeave.approvals?.length || 0) - 1;

                                            const getStatusIcon = () => {
                                                if (isApproved) return <TickCircle size={20} variant="Bold" color="white" />;
                                                if (isPending) return <ClockIcon size={20} variant="Bold" color="white" />;
                                                if (isRejected) return <CloseCircle size={20} variant="Bold" color="white" />;
                                                return <InfoCircle size={20} variant="Bold" color="white" />;
                                            };

                                            const getIconBgColor = () => {
                                                if (isApproved) return theme.palette.success.main;
                                                if (isPending) return theme.palette.warning.main;
                                                if (isRejected) return theme.palette.error.main;
                                                return theme.palette.grey[400];
                                            };

                                            return (
                                                <Box key={idx} sx={{ display: 'flex', position: 'relative', mb: isLast ? 0 : 0 }}>
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2.5, position: 'relative' }}>
                                                        <Box sx={{
                                                            width: 44, height: 44, borderRadius: '50%',
                                                            bgcolor: getIconBgColor(),
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            boxShadow: `0 4px 14px ${alpha(getIconBgColor(), 0.4)}`,
                                                            zIndex: 1, flexShrink: 0
                                                        }}>
                                                            {getStatusIcon()}
                                                        </Box>
                                                        {!isLast && <Box sx={{ width: 2, flexGrow: 1, bgcolor: alpha(theme.palette.divider, 0.5), minHeight: 24 }} />}
                                                    </Box>
                                                    <Box sx={{ flex: 1, bgcolor: alpha(theme.palette.grey[500], 0.04), borderRadius: 1, p: 2, mb: isLast ? 0 : 2 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}>
                                                            <Box>
                                                                <Typography variant="subtitle2" fontWeight={700}>
                                                                    {approval.approver?.firstName} {approval.approver?.lastName}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {roleLabels[approval.approver?.role] || approval.approver?.role}
                                                                </Typography>
                                                            </Box>
                                                            <Chip label={`ขั้นที่ ${approval.level}`} size="small" sx={{ height: 22, fontSize: '0.7rem', bgcolor: alpha(getIconBgColor(), 0.15), color: getIconBgColor() }} />
                                                        </Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {approval.approvedAt ? formatDateTime(approval.approvedAt) : (statusConfig[approval.status]?.label || approval.status)}
                                                        </Typography>
                                                        {approval.comment && (
                                                            <Typography variant="body2" sx={{ mt: 1.5, p: 1.5, bgcolor: alpha(theme.palette.common.black, 0.03), borderRadius: 2 }}>
                                                                💬 {approval.comment}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                )}

                                {/* Tab 2: Attachments */}
                                {detailTab === 2 && selectedLeave.attachments && selectedLeave.attachments.length > 0 && (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {selectedLeave.attachments.map((file: any) => (
                                            <Paper
                                                key={file.id}
                                                variant="outlined"
                                                sx={{ p: 2, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                                onClick={() => window.open(file.filePath, '_blank')}
                                            >
                                                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                                                    <Paperclip2 size={20} variant="Outline" color="#6C63FF" />
                                                </Avatar>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="body2" fontWeight={500}>{file.fileName}</Typography>
                                                </Box>
                                                <ArrowRight2 size={18} variant="Outline" color={theme.palette.text.secondary} />
                                            </Paper>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        </>
                    ) : (
                        <Alert severity="error">ไม่พบข้อมูลใบลา</Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2, pb: 2, px: 3 }}>
                    <Button onClick={() => setDetailModalOpen(false)}>ปิดหน้าต่าง</Button>
                </DialogActions>
            </Dialog>

            {/* Confirm Dialog */}
            <Dialog
                open={confirmOpen}
                onClose={handleConfirmClose}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 1 } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AlertTriangle size={24} color="#f57c00" />
                    {confirmTitle}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        {confirmMessage}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleConfirmClose} color="inherit">
                        ยกเลิก
                    </Button>
                    <Button
                        onClick={handleConfirmOk}
                        variant="contained"
                        color="warning"
                        sx={{ borderRadius: 1 }}
                    >
                        ยืนยัน
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
