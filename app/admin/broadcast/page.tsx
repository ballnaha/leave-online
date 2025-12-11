'use client';

import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Card,
    CardContent,
    Avatar,
    alpha,
    useTheme,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    CircularProgress,
    Divider,
} from '@mui/material';
import {
    Megaphone,
    Send,
    Users,
    CheckCircle,
    XCircle,
    RefreshCw,
    AlertTriangle,
    Building,
    Briefcase,
    Clock,
} from 'lucide-react';
import { useToastr } from '@/app/components/Toastr';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

interface NotificationLog {
    id: number;
    type: string;
    title: string;
    message: string;
    status: string;
    createdAt: string;
    user: {
        firstName: string;
        lastName: string;
    };
}

interface ConfigStatus {
    appIdConfigured: boolean;
    apiKeyConfigured: boolean;
}

interface LookupItem {
    code: string;
    name: string;
}

interface DepartmentItem extends LookupItem {
    companyCode: string;
}

interface SectionItem extends LookupItem {
    departmentCode: string;
    companyCode: string;
}

interface Stats {
    totalSubscribers: number;
    activeSubscribers: number;
    companies: LookupItem[];
    departments: DepartmentItem[];
    sections: SectionItem[];
}

export default function BroadcastPage() {
    const theme = useTheme();
    const toastr = useToastr();
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [recentLogs, setRecentLogs] = useState<NotificationLog[]>([]);
    const [config, setConfig] = useState<ConfigStatus>({ appIdConfigured: false, apiKeyConfigured: false });
    const [stats, setStats] = useState<Stats>({ totalSubscribers: 0, activeSubscribers: 0, companies: [], departments: [], sections: [] });

    const [formData, setFormData] = useState({
        title: '',
        message: '',
        targetType: 'all', // all, company, department, section
        targetCompany: '',
        targetDepartment: '',
        targetSection: '',
        url: '', // Optional URL to open when clicked
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/broadcast');
            if (!res.ok) throw new Error('Failed to fetch data');
            const data = await res.json();
            setRecentLogs(data.recentLogs || []);
            setConfig(data.config || { appIdConfigured: false, apiKeyConfigured: false });
            setStats(data.stats || { totalSubscribers: 0, activeSubscribers: 0, companies: [], departments: [], sections: [] });
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name as string]: value }));
    };

    const handleSend = async () => {
        if (!formData.title.trim()) {
            toastr.error('กรุณากรอกหัวข้อประกาศ');
            return;
        }
        if (!formData.message.trim()) {
            toastr.error('กรุณากรอกเนื้อหาประกาศ');
            return;
        }

        setSending(true);
        try {
            const res = await fetch('/api/admin/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json().catch(() => ({ error: 'เกิดข้อผิดพลาด' }));

            if (res.ok && data.success) {
                toastr.success(`ส่งประกาศสำเร็จ! (${data.recipients || 0} คน)`);
                setFormData(prev => ({ ...prev, title: '', message: '', url: '' }));
                fetchData(); // Refresh logs
            } else {
                toastr.error(data.error || 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            toastr.error('เกิดข้อผิดพลาดในการส่ง');
        } finally {
            setSending(false);
        }
    };

    const getTargetLabel = () => {
        switch (formData.targetType) {
            case 'all':
                return `พนักงานทุกคน (${stats.activeSubscribers} คน)`;
            case 'company': {
                const company = stats.companies.find(c => c.code === formData.targetCompany);
                return company ? `บริษัท: ${company.name}` : 'เลือกบริษัท';
            }
            case 'department': {
                const dept = stats.departments.find(d => d.code === formData.targetDepartment);
                return dept ? `ฝ่าย: ${dept.name}` : 'เลือกฝ่าย';
            }
            case 'section': {
                const section = stats.sections.find(s => s.code === formData.targetSection);
                return section ? `แผนก: ${section.name}` : 'เลือกแผนก';
            }
            default:
                return '';
        }
    };

    // Filter sections based on selected department
    const filteredSections = formData.targetDepartment
        ? stats.sections.filter(s => s.departmentCode === formData.targetDepartment)
        : formData.targetCompany
            ? stats.sections.filter(s => s.companyCode === formData.targetCompany)
            : stats.sections;

    // Filter departments based on selected company
    const filteredDepartments = formData.targetCompany
        ? stats.departments.filter(d => d.companyCode === formData.targetCompany)
        : stats.departments;

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
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: 'primary.main',
                            }}
                        >
                            <Megaphone size={24} />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" component="h1" fontWeight={700}>
                                📢 ส่งประกาศ
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                ส่งข่าวสารและประกาศให้พนักงานทุกคนผ่าน Push Notification
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<RefreshCw size={18} />}
                    onClick={fetchData}
                    disabled={loading}
                >
                    รีเฟรช
                </Button>
            </Box>

            {/* Config Status */}
            {!config.appIdConfigured || !config.apiKeyConfigured ? (
                <Alert severity="warning" sx={{ mb: 3 }} icon={<AlertTriangle size={20} />}>
                    <Typography variant="subtitle2" fontWeight={600}>
                        OneSignal ยังไม่ได้ตั้งค่าครบถ้วน
                    </Typography>
                    <Typography variant="body2">
                        {!config.appIdConfigured && '- ONESIGNAL_APP_ID ยังไม่ได้ตั้งค่า\n'}
                        {!config.apiKeyConfigured && '- ONESIGNAL_REST_API_KEY ยังไม่ได้ตั้งค่า'}
                    </Typography>
                </Alert>
            ) : null}

            {/* Stats Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), width: 40, height: 40 }}>
                                <Users size={20} color={theme.palette.success.main} />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" fontWeight={700} color="success.main">
                                    {stats.activeSubscribers}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    ผู้รับทั้งหมด
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
                <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), width: 40, height: 40 }}>
                                <Building size={20} color={theme.palette.info.main} />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" fontWeight={700} color="info.main">
                                    {stats.companies.length}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    บริษัท
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
                <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), width: 40, height: 40 }}>
                                <Briefcase size={20} color={theme.palette.warning.main} />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" fontWeight={700} color="warning.main">
                                    {stats.departments.length}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    ฝ่าย/แผนก
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
                <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), width: 40, height: 40 }}>
                                <Clock size={20} color={theme.palette.primary.main} />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" fontWeight={700} color="primary.main">
                                    {recentLogs.length}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    ประกาศล่าสุด
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {/* Send Form */}
            <Card sx={{ mb: 3, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Send size={20} />
                        สร้างประกาศใหม่
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <TextField
                            label="หัวข้อประกาศ"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            fullWidth
                            placeholder="เช่น 📢 ประกาศหยุดวันหยุดพิเศษ"
                            helperText="หัวข้อที่จะแสดงในการแจ้งเตือน"
                        />

                        <TextField
                            label="เนื้อหาประกาศ"
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            fullWidth
                            multiline
                            rows={4}
                            placeholder="รายละเอียดของประกาศที่ต้องการส่งถึงพนักงาน..."
                            helperText="เนื้อหาที่จะแสดงในการแจ้งเตือน"
                        />

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel>ส่งไปยัง</InputLabel>
                                <Select
                                    name="targetType"
                                    value={formData.targetType}
                                    label="ส่งไปยัง"
                                    onChange={(e) => handleChange(e as any)}
                                >
                                    <MenuItem value="all">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Users size={18} />
                                            พนักงานทุกคน ({stats.activeSubscribers} คน)
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="company">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Building size={18} />
                                            เลือกตามบริษัท
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="department">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Briefcase size={18} />
                                            เลือกตามฝ่าย
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="section">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Briefcase size={18} />
                                            เลือกตามแผนก
                                        </Box>
                                    </MenuItem>
                                </Select>
                            </FormControl>

                            {formData.targetType === 'company' && (
                                <FormControl fullWidth>
                                    <InputLabel>เลือกบริษัท</InputLabel>
                                    <Select
                                        name="targetCompany"
                                        value={formData.targetCompany}
                                        label="เลือกบริษัท"
                                        onChange={(e) => handleChange(e as any)}
                                    >
                                        {stats.companies.map(company => (
                                            <MenuItem key={company.code} value={company.code}>{company.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}

                            {formData.targetType === 'department' && (
                                <>
                                    <FormControl fullWidth>
                                        <InputLabel>เลือกบริษัท (กรอง)</InputLabel>
                                        <Select
                                            name="targetCompany"
                                            value={formData.targetCompany}
                                            label="เลือกบริษัท (กรอง)"
                                            onChange={(e) => {
                                                handleChange(e as any);
                                                setFormData(prev => ({ ...prev, targetDepartment: '', targetSection: '' }));
                                            }}
                                        >
                                            <MenuItem value="">ทั้งหมด</MenuItem>
                                            {stats.companies.map(company => (
                                                <MenuItem key={company.code} value={company.code}>{company.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth>
                                        <InputLabel>เลือกฝ่าย</InputLabel>
                                        <Select
                                            name="targetDepartment"
                                            value={formData.targetDepartment}
                                            label="เลือกฝ่าย"
                                            onChange={(e) => handleChange(e as any)}
                                        >
                                            {filteredDepartments.map(dept => (
                                                <MenuItem key={dept.code} value={dept.code}>{dept.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </>
                            )}

                            {formData.targetType === 'section' && (
                                <>
                                    <FormControl fullWidth>
                                        <InputLabel>เลือกบริษัท (กรอง)</InputLabel>
                                        <Select
                                            name="targetCompany"
                                            value={formData.targetCompany}
                                            label="เลือกบริษัท (กรอง)"
                                            onChange={(e) => {
                                                handleChange(e as any);
                                                setFormData(prev => ({ ...prev, targetDepartment: '', targetSection: '' }));
                                            }}
                                        >
                                            <MenuItem value="">ทั้งหมด</MenuItem>
                                            {stats.companies.map(company => (
                                                <MenuItem key={company.code} value={company.code}>{company.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth>
                                        <InputLabel>เลือกฝ่าย (กรอง)</InputLabel>
                                        <Select
                                            name="targetDepartment"
                                            value={formData.targetDepartment}
                                            label="เลือกฝ่าย (กรอง)"
                                            onChange={(e) => {
                                                handleChange(e as any);
                                                setFormData(prev => ({ ...prev, targetSection: '' }));
                                            }}
                                        >
                                            <MenuItem value="">ทั้งหมด</MenuItem>
                                            {filteredDepartments.map(dept => (
                                                <MenuItem key={dept.code} value={dept.code}>{dept.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth>
                                        <InputLabel>เลือกแผนก</InputLabel>
                                        <Select
                                            name="targetSection"
                                            value={formData.targetSection}
                                            label="เลือกแผนก"
                                            onChange={(e) => handleChange(e as any)}
                                        >
                                            {filteredSections.map(section => (
                                                <MenuItem key={section.code} value={section.code}>{section.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </>
                            )}
                        </Box>

                        <TextField
                            label="ลิงก์ (ไม่บังคับ)"
                            name="url"
                            value={formData.url}
                            onChange={handleChange}
                            fullWidth
                            placeholder="https://leave.poonsubcan.co.th/..."
                            helperText="เมื่อกดการแจ้งเตือนจะเปิดไปยังลิงก์นี้"
                        />

                        <Divider />

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    จะส่งไปยัง: <strong>{getTargetLabel()}</strong>
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
                                onClick={handleSend}
                                disabled={sending || !config.appIdConfigured || !config.apiKeyConfigured || !formData.title || !formData.message}
                                sx={{ minWidth: 180 }}
                            >
                                {sending ? 'กำลังส่ง...' : '📢 ส่งประกาศ'}
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Recent Broadcasts */}
            <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                        📋 ประกาศที่ส่งล่าสุด
                    </Typography>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : recentLogs.length === 0 ? (
                        <Alert severity="info">ยังไม่มีประกาศ</Alert>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>เวลา</TableCell>
                                        <TableCell>หัวข้อ</TableCell>
                                        <TableCell>เนื้อหา</TableCell>
                                        <TableCell align="center">สถานะ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {recentLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                <Typography variant="caption">
                                                    {dayjs(log.createdAt).format('DD MMM YYYY HH:mm')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {log.title}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{
                                                        maxWidth: 300,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {log.message}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    icon={log.status === 'sent' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                                    label={log.status === 'sent' ? 'สำเร็จ' : 'ล้มเหลว'}
                                                    size="small"
                                                    color={log.status === 'sent' ? 'success' : 'error'}
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
