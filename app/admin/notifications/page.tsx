'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Avatar,
  alpha,
  useTheme,
  Skeleton,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  IconButton,
  Tooltip,
  Menu,
} from '@mui/material';
import {
  Bell,
  Send,
  CheckCircle,
  XCircle,
  Eye,
  Users,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Smartphone,
  Monitor,
  Clock,
  BarChart3,
  X,
  Cloud,
  Database,
  RefreshCcw,
  AlertCircle,
  Download,
  Upload,
  CheckSquare,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToastr } from '@/app/components/Toastr';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('th');

interface NotificationStats {
  summary: {
    totalNotifications: number;
    sentCount: number;
    deliveredCount: number;
    openedCount: number;
    failedCount: number;
    dismissedCount: number;
    deliveryRate: number;
    openRate: number;
  };
  subscribers: {
    total: number;
    active: number;
    inactive: number;
  };
  recentNotifications: any[];
  dailyStats: any[];
  typeBreakdown: { type: string; count: number }[];
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
  subtitle?: string;
  trend?: number;
}

function StatCard({ title, value, icon, color, subtitle, trend }: StatCardProps) {
  const theme = useTheme();

  const colorMap = {
    primary: { main: theme.palette.primary.main, light: alpha(theme.palette.primary.main, 0.1) },
    success: { main: theme.palette.success.main, light: alpha(theme.palette.success.main, 0.1) },
    warning: { main: theme.palette.warning.main, light: alpha(theme.palette.warning.main, 0.1) },
    error: { main: theme.palette.error.main, light: alpha(theme.palette.error.main, 0.1) },
    info: { main: theme.palette.info.main, light: alpha(theme.palette.info.main, 0.1) },
  };

  return (
    <Card
      sx={{
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
              {title}
            </Typography>
            <Typography variant="h3" fontWeight={700} sx={{ color: colorMap[color].main }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: colorMap[color].light,
              color: colorMap[color].main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

// Status chip helper
function getStatusChip(status: string) {
  const statusConfig: Record<string, { label: string; color: 'success' | 'info' | 'warning' | 'error' | 'default' }> = {
    sent: { label: 'ส่งแล้ว', color: 'info' },
    delivered: { label: 'ถึงแล้ว', color: 'success' },
    opened: { label: 'เปิดอ่าน', color: 'success' },
    dismissed: { label: 'ปิด', color: 'warning' },
    failed: { label: 'ล้มเหลว', color: 'error' },
    pending: { label: 'รอส่ง', color: 'default' },
  };

  const config = statusConfig[status] || { label: status, color: 'default' };
  return <Chip label={config.label} color={config.color} size="small" />;
}

// Type label helper
function getTypeLabel(type: string): string {
  const typeLabels: Record<string, string> = {
    leave_request: 'ขออนุมัติลา',
    leave_approved: 'อนุมัติลา',
    leave_rejected: 'ไม่อนุมัติลา',
    leave_cancelled: 'ยกเลิกใบลา',
    approval_pending: 'รออนุมัติ',
    test: 'ทดสอบ',
  };
  return typeLabels[type] || type;
}

interface OneSignalStats {
  configured: boolean;
  error?: string;
  note?: string;
  onesignal?: {
    appName?: string;
    appId?: string;
    players: number;
    messageable_players: number;
  };
  database?: {
    total: number;
    active: number;
    inactive: number;
  };
  comparison?: {
    onesignalPlayers: number;
    dbDevices: number;
    difference: number;
    syncStatus: string;
  };
}

export default function NotificationsPage() {
  const theme = useTheme();
  const router = useRouter();
  const toastr = useToastr();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [days, setDays] = useState(30);

  // OneSignal stats
  const [onesignalStats, setOnesignalStats] = useState<OneSignalStats | null>(null);
  const [onesignalLoading, setOnesignalLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/notifications/stats?days=${days}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOneSignalStats = async () => {
    setOnesignalLoading(true);
    try {
      const res = await fetch('/api/admin/notifications/onesignal-stats', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch OneSignal stats');
      }
      const data = await res.json();
      setOnesignalStats(data);
    } catch (error) {
      console.error('Error fetching OneSignal stats:', error);
    } finally {
      setOnesignalLoading(false);
    }
  };

  const syncWithOneSignal = async (mode: 'validate' | 'import' | 'full' = 'validate') => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/notifications/onesignal-stats', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (data.success) {
        toastr.success(data.message);
        // Refresh stats after sync
        fetchOneSignalStats();
        fetchStats();
      } else {
        toastr.error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toastr.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Sync menu state
  const [syncMenuAnchor, setSyncMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    fetchStats();
    fetchOneSignalStats();
  }, [days]);

  if (loading && !stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={40} />
        <Box
          sx={{
            mt: 2,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 3,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <Box key={i}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            📊 Notification Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ภาพรวมการแจ้งเตือนและสถิติ
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>ช่วงเวลา</InputLabel>
            <Select value={days} label="ช่วงเวลา" onChange={(e) => setDays(Number(e.target.value))}>
              <MenuItem value={7}>7 วัน</MenuItem>
              <MenuItem value={30}>30 วัน</MenuItem>
              <MenuItem value={90}>90 วัน</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="รีเฟรช">
            <IconButton onClick={fetchStats} disabled={loading}>
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Summary Stats */}
      <Box
        sx={{
          mb: 4,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 3,
        }}
      >
        <Box>
          <StatCard
            title="การแจ้งเตือนทั้งหมด"
            value={stats?.summary?.totalNotifications || 0}
            icon={<Bell size={28} />}
            color="primary"
            subtitle={`${days} วันที่ผ่านมา`}
          />
        </Box>
        <Box>
          <StatCard
            title="ส่งสำเร็จ"
            value={`${stats?.summary?.deliveryRate || 0}%`}
            icon={<CheckCircle size={28} />}
            color="success"
            subtitle="Delivery Rate"
          />
        </Box>
        <Box>
          <StatCard
            title="เปิดอ่าน"
            value={`${stats?.summary?.openRate || 0}%`}
            icon={<Eye size={28} />}
            color="info"
            subtitle="Open Rate"
          />
        </Box>
        <Box>
          <StatCard
            title="Subscribers"
            value={stats?.subscribers?.active || 0}
            icon={<Users size={28} />}
            color="warning"
            subtitle={`จาก ${stats?.subscribers?.total || 0} ทั้งหมด`}
          />
        </Box>
      </Box>

      {/* OneSignal Stats Section */}
      <Card sx={{ mb: 4, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Cloud size={24} color={theme.palette.info.main} />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  OneSignal Status
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {onesignalStats?.onesignal?.appName || 'เชื่อมต่อกับ OneSignal'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="รีเฟรช">
                <IconButton onClick={fetchOneSignalStats} disabled={onesignalLoading}>
                  <RefreshCw size={18} className={onesignalLoading ? 'animate-spin' : ''} />
                </IconButton>
              </Tooltip>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshCcw size={16} />}
                onClick={(e) => setSyncMenuAnchor(e.currentTarget)}
                disabled={syncing || !onesignalStats?.configured}
              >
                {syncing ? 'กำลัง Sync...' : 'Sync'}
              </Button>
              <Menu
                anchorEl={syncMenuAnchor}
                open={Boolean(syncMenuAnchor)}
                onClose={() => setSyncMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem
                  onClick={() => {
                    setSyncMenuAnchor(null);
                    syncWithOneSignal('validate');
                  }}
                >
                  <ListItemIcon><CheckSquare size={18} /></ListItemIcon>
                  <ListItemText
                    primary="ตรวจสอบ Devices"
                    secondary="ตรวจสอบว่า devices ยังอยู่ใน OneSignal"
                  />
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setSyncMenuAnchor(null);
                    syncWithOneSignal('import');
                  }}
                >
                  <ListItemIcon><Download size={18} /></ListItemIcon>
                  <ListItemText
                    primary="นำเข้าจาก OneSignal"
                    secondary="ดึง players ใหม่จาก OneSignal มา DB"
                  />
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    setSyncMenuAnchor(null);
                    syncWithOneSignal('full');
                  }}
                >
                  <ListItemIcon><RefreshCcw size={18} /></ListItemIcon>
                  <ListItemText
                    primary="Full Sync"
                    secondary="ตรวจสอบ + นำเข้าทั้งหมด"
                  />
                </MenuItem>
              </Menu>
            </Box>
          </Box>

          {onesignalLoading ? (
            <Box sx={{ display: 'flex', gap: 3 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" width={200} height={100} sx={{ borderRadius: 2 }} />
              ))}
            </Box>
          ) : !onesignalStats?.configured ? (
            <Box sx={{ p: 3, textAlign: 'center', bgcolor: alpha(theme.palette.warning.main, 0.1), borderRadius: 2 }}>
              <AlertCircle size={40} color={theme.palette.warning.main} />
              <Typography variant="body1" sx={{ mt: 1 }}>
                OneSignal ยังไม่ได้ตั้งค่า
              </Typography>
              <Typography variant="body2" color="text.secondary">
                กรุณาตั้งค่า ONESIGNAL_APP_ID และ ONESIGNAL_REST_API_KEY ใน .env
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                gap: 3,
              }}
            >
              {/* OneSignal Players */}
              <Box>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: onesignalStats?.error
                      ? alpha(theme.palette.warning.main, 0.05)
                      : alpha(theme.palette.info.main, 0.05),
                    border: '1px solid',
                    borderColor: onesignalStats?.error
                      ? alpha(theme.palette.warning.main, 0.2)
                      : alpha(theme.palette.info.main, 0.2),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Cloud size={18} color={onesignalStats?.error ? theme.palette.warning.main : theme.palette.info.main} />
                    <Typography variant="body2" color="text.secondary">
                      OneSignal
                    </Typography>
                  </Box>
                  {onesignalStats?.error ? (
                    <>
                      <Typography variant="body2" color="warning.main" fontWeight={600}>
                        ไม่สามารถดึงข้อมูลได้
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {onesignalStats?.note || 'REST API Key ไม่มีสิทธิ์'}
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Typography variant="h4" fontWeight={700} color="info.main">
                        {onesignalStats?.onesignal?.players?.toLocaleString() || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Players
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2">
                        <strong>{onesignalStats?.onesignal?.messageable_players?.toLocaleString() || 0}</strong> รับข้อความได้
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>

              {/* Database Devices */}
              <Box>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.success.main, 0.05),
                    border: '1px solid',
                    borderColor: alpha(theme.palette.success.main, 0.2),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Database size={18} color={theme.palette.success.main} />
                    <Typography variant="body2" color="text.secondary">
                      Database
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {onesignalStats?.database?.total?.toLocaleString() || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Devices
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="success.main">
                      <strong>{onesignalStats?.database?.active || 0}</strong> active
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      <strong>{onesignalStats?.database?.inactive || 0}</strong> inactive
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Sync Status */}
              <Box>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: alpha(
                      onesignalStats?.comparison?.syncStatus === 'synced'
                        ? theme.palette.success.main
                        : theme.palette.warning.main,
                      0.05
                    ),
                    border: '1px solid',
                    borderColor: alpha(
                      onesignalStats?.comparison?.syncStatus === 'synced'
                        ? theme.palette.success.main
                        : theme.palette.warning.main,
                      0.2
                    ),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {onesignalStats?.comparison?.syncStatus === 'synced' ? (
                      <CheckCircle size={18} color={theme.palette.success.main} />
                    ) : (
                      <AlertCircle size={18} color={theme.palette.warning.main} />
                    )}
                    <Typography variant="body2" color="text.secondary">
                      Sync Status
                    </Typography>
                  </Box>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    color={onesignalStats?.comparison?.syncStatus === 'synced' ? 'success.main' : 'warning.main'}
                  >
                    {onesignalStats?.comparison?.syncStatus === 'synced' ? 'ซิงค์แล้ว' : 'ไม่ตรงกัน'}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    ความต่าง:{' '}
                    <strong
                      style={{
                        color:
                          onesignalStats?.comparison?.difference === 0
                            ? theme.palette.success.main
                            : theme.palette.warning.main,
                      }}
                    >
                      {onesignalStats?.comparison?.difference || 0}
                    </strong>{' '}
                    รายการ
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Charts & Details Row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
          alignItems: 'stretch',
        }}
      >
        {/* Status Breakdown */}
        <Box>
          <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                สถานะการส่ง
              </Typography>
              <Box sx={{ mt: 2 }}>
                {[
                  { label: 'ส่งแล้ว', value: stats?.summary?.sentCount || 0, color: theme.palette.info.main },
                  { label: 'ถึงแล้ว', value: stats?.summary?.deliveredCount || 0, color: theme.palette.success.main },
                  { label: 'เปิดอ่าน', value: stats?.summary?.openedCount || 0, color: theme.palette.primary.main },
                  { label: 'ปิด', value: stats?.summary?.dismissedCount || 0, color: theme.palette.warning.main },
                  { label: 'ล้มเหลว', value: stats?.summary?.failedCount || 0, color: theme.palette.error.main },
                ].map((item, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {item.value}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={stats?.summary?.totalNotifications ? (item.value / stats.summary.totalNotifications) * 100 : 0}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: alpha(item.color, 0.1),
                        '& .MuiLinearProgress-bar': {
                          bgcolor: item.color,
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Type Breakdown */}
        <Box>
          <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                ประเภทการแจ้งเตือน
              </Typography>
              <List dense>
                {stats?.typeBreakdown?.slice(0, 6).map((item, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemText
                      primary={getTypeLabel(item.type)}
                      secondary={`${item.count} รายการ`}
                    />
                    <Chip
                      label={item.count}
                      size="small"
                      sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}
                    />
                  </ListItem>
                ))}
                {(!stats?.typeBreakdown || stats.typeBreakdown.length === 0) && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    ไม่มีข้อมูล
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Box>

        {/* Subscribers Stats */}
        <Box>
          <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Subscribers
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: alpha(theme.palette.success.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Smartphone size={24} color={theme.palette.success.main} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700} color="success.main">
                      {stats?.subscribers?.active || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Devices
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={600}>
                      {stats?.subscribers?.total || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ทั้งหมด
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={600} color="error.main">
                      {stats?.subscribers?.inactive || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ไม่ active
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 3 }}
                endIcon={<ArrowRight size={18} />}
                onClick={() => router.push('/admin/notifications/subscribers')}
              >
                ดูรายละเอียด
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Recent Notifications */}
      <Card sx={{ mt: 3, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              การแจ้งเตือนล่าสุด
            </Typography>
            <Button
              size="small"
              endIcon={<ArrowRight size={16} />}
              onClick={() => router.push('/admin/notifications/logs')}
            >
              ดูทั้งหมด
            </Button>
          </Box>
          <List>
            {stats?.recentNotifications?.map((notif, index) => (
              <React.Fragment key={notif.id}>
                <ListItem sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bell size={20} color={theme.palette.primary.main} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography component="span" variant="body2" fontWeight={500}>
                          {notif.title}
                        </Typography>
                        {getStatusChip(notif.status)}
                      </Box>
                    }
                    secondary={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography component="span" variant="caption" color="text.secondary">
                          {notif.user?.firstName} {notif.user?.lastName}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary">•</Typography>
                        <Typography component="span" variant="caption" color="text.secondary">
                          {dayjs(notif.createdAt).fromNow()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < (stats?.recentNotifications?.length || 0) - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
            {(!stats?.recentNotifications || stats.recentNotifications.length === 0) && (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  ไม่มีการแจ้งเตือน
                </Typography>
              </Box>
            )}
          </List>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<BarChart3 size={18} />}
          onClick={() => router.push('/admin/notifications/logs')}
        >
          ดูประวัติทั้งหมด
        </Button>
        <Button
          variant="outlined"
          startIcon={<Users size={18} />}
          onClick={() => router.push('/admin/notifications/subscribers')}
        >
          จัดการ Subscribers
        </Button>
        <Button
          variant="outlined"
          startIcon={<Send size={18} />}
          onClick={() => router.push('/admin/test-notification')}
        >
          ทดสอบส่ง Notification
        </Button>
      </Box>
    </Box>
  );
}
