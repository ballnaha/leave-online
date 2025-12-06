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
  Chip,
  Avatar,
  alpha,
  useTheme,
  Skeleton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Button,
  Card,
  CardContent,
  Grid,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search,
  RefreshCw,
  ChevronLeft,
  Smartphone,
  Monitor,
  Trash2,
  Power,
  PowerOff,
  Users,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToastr } from '@/app/components/Toastr';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

interface UserDevice {
  id: number;
  userId: number;
  playerId: string;
  deviceType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    employeeId: string;
    firstName: string;
    lastName: string;
    department: string;
    company: string;
    avatar: string | null;
    isActive: boolean;
  };
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  byType: { type: string; count: number }[];
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'error';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const theme = useTheme();

  const colorMap = {
    primary: { main: theme.palette.primary.main, light: alpha(theme.palette.primary.main, 0.1) },
    success: { main: theme.palette.success.main, light: alpha(theme.palette.success.main, 0.1) },
    warning: { main: theme.palette.warning.main, light: alpha(theme.palette.warning.main, 0.1) },
    error: { main: theme.palette.error.main, light: alpha(theme.palette.error.main, 0.1) },
  };

  return (
    <Card sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ color: colorMap[color].main }}>
              {value}
            </Typography>
          </Box>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: colorMap[color].light,
              color: colorMap[color].main,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

// Device type icon
function getDeviceIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'web':
      return <Monitor size={18} />;
    case 'mobile':
    case 'android':
    case 'ios':
      return <Smartphone size={18} />;
    default:
      return <Monitor size={18} />;
  }
}

// Table Skeleton
function TableSkeleton() {
  return (
    <TableBody>
      {[1, 2, 3, 4, 5].map((row) => (
        <TableRow key={row}>
          <TableCell><Skeleton variant="circular" width={40} height={40} /></TableCell>
          <TableCell><Skeleton variant="text" width={150} /></TableCell>
          <TableCell><Skeleton variant="text" width={100} /></TableCell>
          <TableCell><Skeleton variant="text" width={200} /></TableCell>
          <TableCell><Skeleton variant="rounded" width={60} height={24} /></TableCell>
          <TableCell><Skeleton variant="text" width={100} /></TableCell>
          <TableCell><Skeleton variant="circular" width={36} height={36} /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export default function SubscribersPage() {
  const theme = useTheme();
  const router = useRouter();
  const toastr = useToastr();
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialog
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; device: UserDevice | null; action: 'activate' | 'deactivate' }>({
    open: false,
    device: null,
    action: 'deactivate',
  });

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        status: statusFilter,
      });
      
      if (search) params.append('search', search);

      const res = await fetch(`/api/admin/notifications/subscribers?${params}`);
      const data = await res.json();
      
      setDevices(data.devices || []);
      setTotal(data.pagination?.total || 0);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toastr.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleToggleDevice = async () => {
    if (!confirmDialog.device) return;
    
    try {
      const res = await fetch('/api/admin/notifications/subscribers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: confirmDialog.device.id,
          isActive: confirmDialog.action === 'activate',
        }),
      });

      if (res.ok) {
        toastr.success(confirmDialog.action === 'activate' ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว');
        fetchDevices();
      } else {
        toastr.error('เกิดข้อผิดพลาด');
      }
    } catch (error) {
      toastr.error('เกิดข้อผิดพลาด');
    } finally {
      setConfirmDialog({ open: false, device: null, action: 'deactivate' });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.push('/admin/notifications')}>
            <ChevronLeft />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              👥 Subscribers
            </Typography>
            <Typography variant="body2" color="text.secondary">
              จัดการอุปกรณ์ที่ลงทะเบียนรับการแจ้งเตือน
            </Typography>
          </Box>
        </Box>
        <Tooltip title="รีเฟรช">
          <IconButton onClick={fetchDevices} disabled={loading}>
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="ทั้งหมด"
            value={stats?.total || 0}
            icon={<Users size={22} />}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Active"
            value={stats?.active || 0}
            icon={<CheckCircle size={22} />}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Inactive"
            value={stats?.inactive || 0}
            icon={<XCircle size={22} />}
            color="error"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Web"
            value={stats?.byType?.find(t => t.type === 'web')?.count || 0}
            icon={<Monitor size={22} />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Search & Filters */}
      <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ pb: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="ค้นหาชื่อ, รหัสพนักงาน, Player ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>สถานะ</InputLabel>
              <Select
                value={statusFilter}
                label="สถานะ"
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                <MenuItem value="active">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle size={16} color={theme.palette.success.main} />
                    Active
                  </Box>
                </MenuItem>
                <MenuItem value="inactive">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <XCircle size={16} color={theme.palette.error.main} />
                    Inactive
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableCell sx={{ fontWeight: 600 }}>ผู้ใช้</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>ฝ่าย</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Player ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>อุปกรณ์</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>สถานะ</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>อัพเดทล่าสุด</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 100 }}>จัดการ</TableCell>
            </TableRow>
          </TableHead>
          {loading ? (
            <TableSkeleton />
          ) : (
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        src={device.user?.avatar || undefined}
                        sx={{ width: 40, height: 40, bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                      >
                        {device.user?.firstName?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {device.user?.firstName} {device.user?.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {device.user?.employeeId}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {device.user?.department || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        bgcolor: alpha(theme.palette.grey[500], 0.1),
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        display: 'inline-block',
                        maxWidth: 180,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {device.playerId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getDeviceIcon(device.deviceType) as any}
                      label={device.deviceType}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={device.isActive ? 'Active' : 'Inactive'}
                      color={device.isActive ? 'success' : 'default'}
                      size="small"
                      icon={device.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {dayjs(device.updatedAt).format('DD MMM YYYY HH:mm')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={device.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
                      <IconButton
                        size="small"
                        color={device.isActive ? 'error' : 'success'}
                        onClick={() => setConfirmDialog({
                          open: true,
                          device,
                          action: device.isActive ? 'deactivate' : 'activate',
                        })}
                      >
                        {device.isActive ? <PowerOff size={18} /> : <Power size={18} />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {devices.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Users size={48} color={theme.palette.text.disabled} />
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                      ไม่พบข้อมูล
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          )}
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="แสดง"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} จาก ${count}`}
        />
      </TableContainer>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogTitle>
          {confirmDialog.action === 'activate' ? 'เปิดใช้งานอุปกรณ์' : 'ปิดใช้งานอุปกรณ์'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            คุณต้องการ{confirmDialog.action === 'activate' ? 'เปิด' : 'ปิด'}ใช้งานอุปกรณ์ของ{' '}
            <strong>{confirmDialog.device?.user?.firstName} {confirmDialog.device?.user?.lastName}</strong> ใช่หรือไม่?
          </Typography>
          {confirmDialog.action === 'deactivate' && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              ผู้ใช้จะไม่ได้รับการแจ้งเตือนบนอุปกรณ์นี้
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            color={confirmDialog.action === 'activate' ? 'success' : 'error'}
            onClick={handleToggleDevice}
          >
            {confirmDialog.action === 'activate' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
