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
} from 'lucide-react';
import { useToastr } from '@/app/components/Toastr';
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
    employeeName: string;
    leaveType: string;
    escalatedTo: string;
    escalatedAt: string;
    status: string;
}

interface PendingEscalation {
    id: number;
    employeeName: string;
    leaveType: string;
    createdAt: string;
    deadline: string;
    hoursRemaining: number;
    currentApprover: string;
}

export default function EscalationSettingsPage() {
    const theme = useTheme();
    const toastr = useToastr();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await fetch('/api/admin/settings/escalation', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    escalationHours: config.escalationHours,
                    reminderHours: config.reminderHours,
                    enabled: config.enabled,
                }),
            });

            if (res.ok) {
                toastr.success('บันทึกการตั้งค่าสำเร็จ');
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            toastr.error('ไม่สามารถบันทึกได้');
        } finally {
            setSaving(false);
        }
    };

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
                    <Button
                        variant="contained"
                        color="warning"
                        startIcon={running ? <CircularProgress size={18} color="inherit" /> : <Play size={18} />}
                        onClick={handleRunNow}
                        disabled={running || !config.enabled}
                    >
                        {running ? 'กำลังรัน...' : 'รันตอนนี้'}
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

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={config.enabled}
                                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                                    color="warning"
                                />
                            }
                            label={
                                <Box>
                                    <Typography variant="body1" fontWeight={600}>
                                        เปิดใช้งาน Auto Escalation
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        ใบลาที่รออนุมัตินานเกินกำหนดจะถูกส่งต่อไป HR Manager โดยอัตโนมัติ
                                    </Typography>
                                </Box>
                            }
                        />

                        <Divider />

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                            <TextField
                                label="เวลา Escalation (ชั่วโมง)"
                                type="number"
                                value={config.escalationHours}
                                onChange={(e) => setConfig({ ...config, escalationHours: parseInt(e.target.value) || 48 })}
                                helperText="หลังจากเวลานี้จะ Escalate ไป HR Manager (ค่าเริ่มต้น: 48 ชม. = 2 วัน)"
                                disabled={!config.enabled}
                                InputProps={{ inputProps: { min: 1, max: 168 } }}
                            />
                            <TextField
                                label="เวลาเตือน (ชั่วโมง)"
                                type="number"
                                value={config.reminderHours}
                                onChange={(e) => setConfig({ ...config, reminderHours: parseInt(e.target.value) || 24 })}
                                helperText="ส่งเตือนผู้อนุมัติก่อนหมดเวลา (ค่าเริ่มต้น: 24 ชม.)"
                                disabled={!config.enabled}
                                InputProps={{ inputProps: { min: 1, max: 72 } }}
                            />
                        </Box>

                        <Alert severity="info" icon={<Bell size={20} />}>
                            <Typography variant="body2">
                                <strong>การทำงาน:</strong> เมื่อใบลารออนุมัติครบ {config.escalationHours} ชั่วโมง จะถูก Escalate ไป HR Manager โดยอัตโนมัติ
                                และจะส่งเตือนผู้อนุมัติเมื่อเหลือเวลา {config.reminderHours} ชั่วโมง
                            </Typography>
                        </Alert>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button
                                variant="contained"
                                onClick={handleSave}
                                disabled={saving}
                                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <CheckCircle size={18} />}
                            >
                                {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                            </Button>
                        </Box>
                    </Box>
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
                                        <TableCell>พนักงาน</TableCell>
                                        <TableCell>ประเภท</TableCell>
                                        <TableCell>ผู้อนุมัติปัจจุบัน</TableCell>
                                        <TableCell align="center">เวลาที่เหลือ</TableCell>
                                        <TableCell>สถานะ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {pendingList.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {item.employeeName}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{item.leaveType}</TableCell>
                                            <TableCell>{item.currentApprover}</TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={item.hoursRemaining <= 0 ? 'หมดเวลา' : `${item.hoursRemaining} ชม.`}
                                                    size="small"
                                                    color={getStatusColor(item.hoursRemaining)}
                                                />
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
                                        <TableCell>เวลา</TableCell>
                                        <TableCell>พนักงาน</TableCell>
                                        <TableCell>ประเภท</TableCell>
                                        <TableCell>ส่งต่อให้</TableCell>
                                        <TableCell align="center">สถานะ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {recentLogs.map((log) => (
                                        <TableRow key={log.id}>
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
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
