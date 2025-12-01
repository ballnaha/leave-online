'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
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
  Bell,
  Send,
  Smartphone,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useToastr } from '@/app/components/Toastr';

interface Device {
  id: number;
  playerId: string;
  deviceType: string;
  isActive: boolean;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
}

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

export default function TestNotificationPage() {
  const theme = useTheme();
  const toastr = useToastr();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [recentLogs, setRecentLogs] = useState<NotificationLog[]>([]);
  const [config, setConfig] = useState<ConfigStatus>({ appIdConfigured: false, apiKeyConfigured: false });
  
  const [formData, setFormData] = useState({
    title: '🔔 ทดสอบการแจ้งเตือน',
    message: 'นี่คือข้อความทดสอบจากระบบ Leave Online',
    targetType: 'self',
    targetUserId: '',
    playerId: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/test-notification');
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
        setRecentLogs(data.recentLogs || []);
        setConfig(data.config || { appIdConfigured: false, apiKeyConfigured: false });
      }
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
    if (!formData.title || !formData.message) {
      toastr.error('กรุณากรอกหัวข้อและข้อความ');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/admin/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toastr.success(data.message || 'ส่งการแจ้งเตือนสำเร็จ');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const uniqueUsers = Array.from(new Map(devices.map(d => [d.user.id, d.user])).values());

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
              <Bell size={24} />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={700}>
                ทดสอบ Push Notification
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ทดสอบส่งการแจ้งเตือนผ่าน OneSignal Web Push
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
      ) : (
        <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircle size={20} />}>
          OneSignal ตั้งค่าพร้อมใช้งาน
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Send Form */}
        <Card sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Send size={20} />
              ส่งการแจ้งเตือนทดสอบ
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="หัวข้อ"
                name="title"
                value={formData.title}
                onChange={handleChange}
                fullWidth
                size="small"
              />

              <TextField
                label="ข้อความ"
                name="message"
                value={formData.message}
                onChange={handleChange}
                fullWidth
                size="small"
                multiline
                rows={3}
              />

              <FormControl fullWidth size="small">
                <InputLabel>ส่งไปยัง</InputLabel>
                <Select
                  name="targetType"
                  value={formData.targetType}
                  label="ส่งไปยัง"
                  onChange={(e) => handleChange(e as any)}
                >
                  <MenuItem value="self">อุปกรณ์ของฉัน</MenuItem>
                  <MenuItem value="user">ผู้ใช้ที่เลือก</MenuItem>
                  <MenuItem value="all">ทุกอุปกรณ์</MenuItem>
                  <MenuItem value="specific">Player ID เฉพาะ</MenuItem>
                </Select>
              </FormControl>

              {formData.targetType === 'user' && (
                <FormControl fullWidth size="small">
                  <InputLabel>เลือกผู้ใช้</InputLabel>
                  <Select
                    name="targetUserId"
                    value={formData.targetUserId}
                    label="เลือกผู้ใช้"
                    onChange={(e) => handleChange(e as any)}
                  >
                    {uniqueUsers.map(user => (
                      <MenuItem key={user.id} value={user.id.toString()}>
                        {user.firstName} {user.lastName} ({user.employeeId})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {formData.targetType === 'specific' && (
                <TextField
                  label="Player ID"
                  name="playerId"
                  value={formData.playerId}
                  onChange={handleChange}
                  fullWidth
                  size="small"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              )}

              <Button
                variant="contained"
                size="large"
                startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
                onClick={handleSend}
                disabled={sending || !config.appIdConfigured || !config.apiKeyConfigured}
                sx={{ mt: 1 }}
              >
                {sending ? 'กำลังส่ง...' : 'ส่งการแจ้งเตือน'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Registered Devices */}
        <Card sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Smartphone size={20} />
              อุปกรณ์ที่ลงทะเบียน ({devices.length})
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : devices.length === 0 ? (
              <Alert severity="info">ยังไม่มีอุปกรณ์ลงทะเบียน</Alert>
            ) : (
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>ผู้ใช้</TableCell>
                      <TableCell>ประเภท</TableCell>
                      <TableCell>Player ID</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {devices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {device.user.firstName} {device.user.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {device.user.employeeId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={device.deviceType}
                            size="small"
                            color={device.deviceType === 'web' ? 'info' : 'success'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: 'monospace',
                              bgcolor: 'grey.100',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                            }}
                          >
                            {device.playerId.substring(0, 8)}...
                          </Typography>
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

      {/* Recent Logs */}
      <Card sx={{ mt: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
            ประวัติการส่งล่าสุด
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : recentLogs.length === 0 ? (
            <Alert severity="info">ยังไม่มีประวัติการส่ง</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>เวลา</TableCell>
                    <TableCell>ประเภท</TableCell>
                    <TableCell>หัวข้อ</TableCell>
                    <TableCell>ข้อความ</TableCell>
                    <TableCell>ผู้ใช้</TableCell>
                    <TableCell align="center">สถานะ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Typography variant="caption">
                          {formatDate(log.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={log.type} size="small" variant="outlined" />
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
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {log.message}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {log.user.firstName} {log.user.lastName}
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
