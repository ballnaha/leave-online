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
  Collapse,
} from '@mui/material';
import {
  Search,
  RefreshCw,
  Filter,
  Download,
  Calendar,
  Bell,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

interface NotificationLog {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  data: any;
  oneSignalId: string | null;
  status: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  user: {
    id: number;
    employeeId: string;
    firstName: string;
    lastName: string;
    department: string;
    avatar: string | null;
  };
}

// Status chip helper
function getStatusChip(status: string) {
  const statusConfig: Record<string, { label: string; color: 'success' | 'info' | 'warning' | 'error' | 'default'; icon: React.ReactNode }> = {
    sent: { label: 'ส่งแล้ว', color: 'info', icon: <Clock size={14} /> },
    delivered: { label: 'ถึงแล้ว', color: 'success', icon: <CheckCircle size={14} /> },
    opened: { label: 'เปิดอ่าน', color: 'success', icon: <Eye size={14} /> },
    dismissed: { label: 'ปิด', color: 'warning', icon: <X size={14} /> },
    failed: { label: 'ล้มเหลว', color: 'error', icon: <XCircle size={14} /> },
    pending: { label: 'รอส่ง', color: 'default', icon: <Clock size={14} /> },
  };

  const config = statusConfig[status] || { label: status, color: 'default', icon: null };
  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      icon={config.icon as any}
      sx={{ '& .MuiChip-icon': { ml: 0.5 } }}
    />
  );
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

// Table Skeleton
function TableSkeleton() {
  return (
    <TableBody>
      {[1, 2, 3, 4, 5].map((row) => (
        <TableRow key={row}>
          <TableCell><Skeleton variant="text" width={80} /></TableCell>
          <TableCell><Skeleton variant="text" width={150} /></TableCell>
          <TableCell><Skeleton variant="text" width={200} /></TableCell>
          <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
          <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
          <TableCell><Skeleton variant="text" width={120} /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export default function NotificationLogsPage() {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter options
  const [types, setTypes] = useState<string[]>([]);
  const statuses = ['sent', 'delivered', 'opened', 'dismissed', 'failed'];

  // Expanded row
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
      });
      
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/admin/notifications/logs?${params}`);
      const data = await res.json();
      
      setLogs(data.logs || []);
      setTotal(data.pagination?.total || 0);
      if (data.filters?.types) {
        setTypes(data.filters.types);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter, typeFilter, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  const hasFilters = search || statusFilter !== 'all' || typeFilter !== 'all' || startDate || endDate;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
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
                ประวัติการแจ้งเตือน
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ทั้งหมด {total.toLocaleString()} รายการ
              </Typography>
            </Box>
          </Box>
        </Box>
        <Tooltip title="รีเฟรช">
          <IconButton 
            onClick={fetchLogs} 
            disabled={loading}
            sx={{ 
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
            }}
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Search & Filters */}
      <Card sx={{ mb: 3, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="ค้นหา..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 250 }}
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
                {statuses.map((s) => (
                  <MenuItem key={s} value={s}>{getStatusChip(s)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>ประเภท</InputLabel>
              <Select
                value={typeFilter}
                label="ประเภท"
                onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                {types.map((t) => (
                  <MenuItem key={t} value={t}>{getTypeLabel(t)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant={showFilters ? 'contained' : 'outlined'}
              size="small"
              startIcon={<Filter size={16} />}
              onClick={() => setShowFilters(!showFilters)}
            >
              ตัวกรอง
            </Button>
            {hasFilters && (
              <Button size="small" color="error" onClick={clearFilters}>
                ล้างตัวกรอง
              </Button>
            )}
          </Box>
          
          {/* Advanced Filters */}
          <Collapse in={showFilters}>
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                type="date"
                label="จากวันที่"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150 }}
              />
              <TextField
                size="small"
                type="date"
                label="ถึงวันที่"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150 }}
              />
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableCell sx={{ fontWeight: 600 }}>ผู้รับ</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>หัวข้อ</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>ประเภท</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>สถานะ</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>วันที่</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 50 }}></TableCell>
            </TableRow>
          </TableHead>
          {loading ? (
            <TableSkeleton />
          ) : (
            <TableBody>
              {logs.map((log) => (
                <React.Fragment key={log.id}>
                  <TableRow
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          src={log.user?.avatar || undefined}
                          sx={{ width: 36, height: 36, bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                        >
                          {log.user?.firstName?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {log.user?.firstName} {log.user?.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {log.user?.employeeId}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 250 }}>
                        {log.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getTypeLabel(log.type)}
                        size="small"
                        sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main' }}
                      />
                    </TableCell>
                    <TableCell>
                      {getStatusChip(log.status)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {dayjs(log.createdAt).format('DD MMM YYYY HH:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        {expandedRow === log.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  {/* Expanded Details */}
                  <TableRow>
                    <TableCell colSpan={6} sx={{ py: 0 }}>
                      <Collapse in={expandedRow === log.id}>
                        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.grey[500], 0.04), borderRadius: 1, my: 1 }}>
                          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' }, gap: 2 }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">ข้อความ</Typography>
                              <Typography variant="body2" sx={{ mt: 0.5 }}>{log.message}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">OneSignal ID</Typography>
                              <Typography variant="body2" sx={{ mt: 0.5, wordBreak: 'break-all' }}>
                                {log.oneSignalId || '-'}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">อ่านเมื่อ</Typography>
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {log.readAt ? dayjs(log.readAt).format('DD MMM YYYY HH:mm') : '-'}
                              </Typography>
                            </Box>
                          </Box>
                          {log.data && Object.keys(log.data).length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" color="text.secondary">Data</Typography>
                              <Box
                                component="pre"
                                sx={{
                                  mt: 0.5,
                                  p: 1,
                                  bgcolor: alpha(theme.palette.grey[900], 0.04),
                                  borderRadius: 1,
                                  fontSize: 12,
                                  overflow: 'auto',
                                }}
                              >
                                {JSON.stringify(log.data, null, 2)}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
              {logs.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Bell size={48} color={theme.palette.text.disabled} />
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
    </Box>
  );
}
