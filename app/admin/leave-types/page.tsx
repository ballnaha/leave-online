'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
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
  Alert,
  Tooltip,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Avatar,
  alpha,
  useTheme,
  Fade,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add,
  Edit2,
  Trash,
  Calendar,
  SearchNormal1,
  Refresh2,
  TickCircle,
  CloseCircle,
  DollarCircle,
  Filter,
  Clock,
} from 'iconsax-react';
import LeaveTypeDialog from './LeaveTypeDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToastr } from '@/app/components/Toastr';

interface LeaveType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  maxDaysPerYear: number | null;
  isPaid: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'error' | 'secondary';
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const theme = useTheme();
  
  const colorMap = {
    primary: { main: theme.palette.primary.main, light: alpha(theme.palette.primary.main, 0.1) },
    success: { main: theme.palette.success.main, light: theme.palette.success.light },
    warning: { main: theme.palette.warning.main, light: theme.palette.warning.light },
    error: { main: theme.palette.error.main, light: theme.palette.error.light },
    secondary: { main: theme.palette.secondary.main, light: alpha(theme.palette.secondary.main, 0.1) },
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
            }}
          >
            {icon}
          </Avatar>
        </Box>
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
          <TableCell><Skeleton variant="rounded" width={60} height={24} /></TableCell>
          <TableCell><Skeleton variant="text" width={150} /></TableCell>
          <TableCell><Skeleton variant="text" width={200} /></TableCell>
          <TableCell><Skeleton variant="text" width={60} /></TableCell>
          <TableCell align="center"><Skeleton variant="rounded" width={80} height={24} /></TableCell>
          <TableCell align="center"><Skeleton variant="rounded" width={80} height={24} /></TableCell>
          <TableCell align="right">
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Skeleton variant="circular" width={36} height={36} />
              <Skeleton variant="circular" width={36} height={36} />
            </Box>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export default function LeaveTypesPage() {
  const theme = useTheme();
  const toastr = useToastr();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paidFilter, setPaidFilter] = useState<string>('all');
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeaveType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchLeaveTypes = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/leave-types');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch leave types');
      }
      const data = await res.json();
      setLeaveTypes(data);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const handleCreate = () => {
    setSelectedLeaveType(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType);
    setDialogOpen(true);
  };

  const handleDelete = (leaveType: LeaveType) => {
    setDeleteTarget(leaveType);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/leave-types/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to delete' }));
        throw new Error(data.error || 'Failed to delete');
      }
      toastr.success('ลบประเภทการลาสำเร็จ');
      fetchLeaveTypes();
    } catch (err: any) {
      toastr.error(err.message || 'เกิดข้อผิดพลาดในการลบประเภทการลา');
    } finally {
      setDeleteLoading(false);
      setConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleSave = () => {
    setDialogOpen(false);
    toastr.success(selectedLeaveType ? 'แก้ไขประเภทการลาสำเร็จ' : 'เพิ่มประเภทการลาสำเร็จ');
    fetchLeaveTypes();
  };

  // Filter leave types
  const filteredLeaveTypes = leaveTypes.filter((leaveType) => {
    const matchesSearch =
      leaveType.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leaveType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (leaveType.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && leaveType.isActive) ||
      (statusFilter === 'inactive' && !leaveType.isActive);

    const matchesPaid =
      paidFilter === 'all' ||
      (paidFilter === 'paid' && leaveType.isPaid) ||
      (paidFilter === 'unpaid' && !leaveType.isPaid);
    
    return matchesSearch && matchesStatus && matchesPaid;
  });

  // Paginated leave types
  const paginatedLeaveTypes = filteredLeaveTypes.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Handle page change
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, statusFilter, paidFilter]);

  // Stats
  const activeLeaveTypes = leaveTypes.filter((lt) => lt.isActive).length;
  const inactiveLeaveTypes = leaveTypes.filter((lt) => !lt.isActive).length;
  const paidLeaveTypes = leaveTypes.filter((lt) => lt.isPaid).length;

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
              }}
            >
              <Calendar size={24} variant="Bold" color="#6C63FF" />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={700}>
                จัดการประเภทการลา
              </Typography>
              <Typography variant="body2" color="text.secondary">
                เพิ่ม แก้ไข และจัดการประเภทการลาในระบบ
              </Typography>
            </Box>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add size={18} color="#fff" />}
          onClick={handleCreate}
          sx={{ 
            borderRadius: 1,
            px: 3,
            py: 1.25,
            boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`,
            '&:hover': {
              boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.5)}`,
            },
          }}
        >
          เพิ่มประเภทการลา
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <StatCard
          title="ประเภทการลาทั้งหมด"
          value={leaveTypes.length}
          icon={<Calendar size={26} variant="Bold" color="#6C63FF" />}
          color="primary"
          subtitle="ในระบบ"
        />
        <StatCard
          title="เปิดใช้งาน"
          value={activeLeaveTypes}
          icon={<TickCircle size={26} variant="Bold" color="#22C55E" />}
          color="success"
          subtitle="พร้อมใช้งาน"
        />
        <StatCard
          title="ปิดใช้งาน"
          value={inactiveLeaveTypes}
          icon={<CloseCircle size={26} variant="Bold" color="#64748B" />}
          color="secondary"
          subtitle="ไม่ได้ใช้งาน"
        />
        <StatCard
          title="ได้รับค่าจ้าง"
          value={paidLeaveTypes}
          icon={<DollarCircle size={26} variant="Bold" color="#F59E0B" />}
          color="warning"
          subtitle="ประเภทการลา"
        />
      </Box>

      {/* Search & Filters */}
      <Paper 
        sx={{ 
          p: 2.5, 
          mb: 3, 
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="ค้นหาประเภทการลา..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ 
              flex: 1,
              minWidth: 180,
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
                bgcolor: 'background.default',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                },
                '&.Mui-focused': {
                  bgcolor: 'background.paper',
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchNormal1 size={18} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
            }}
          />

          {/* Status Filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Filter size={16} color="#6C63FF" />
                สถานะ
              </Box>
            </InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="สถานะ"
              sx={{
                borderRadius: 1,
                bgcolor: 'background.default',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: statusFilter !== 'all' ? 'primary.main' : 'divider',
                },
              }}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              <MenuItem value="active">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TickCircle size={16} color={theme.palette.success.main} />
                  เปิดใช้งาน
                </Box>
              </MenuItem>
              <MenuItem value="inactive">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CloseCircle size={16} color={theme.palette.text.secondary} />
                  ปิดใช้งาน
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Paid Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DollarCircle size={16} color="#6C63FF" />
                ค่าจ้าง
              </Box>
            </InputLabel>
            <Select
              value={paidFilter}
              onChange={(e) => setPaidFilter(e.target.value)}
              label="ค่าจ้าง"
              sx={{
                borderRadius: 1,
                bgcolor: 'background.default',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: paidFilter !== 'all' ? 'primary.main' : 'divider',
                },
              }}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              <MenuItem value="paid">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DollarCircle size={16} color={theme.palette.success.main} />
                  ได้รับค่าจ้าง
                </Box>
              </MenuItem>
              <MenuItem value="unpaid">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Clock size={16} color={theme.palette.text.secondary} />
                  ไม่ได้รับค่าจ้าง
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <Chip 
            label={`${filteredLeaveTypes.length} รายการ`}
            size="small"
            sx={{ 
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              fontWeight: 600,
            }}
          />
          <Tooltip title="รีเฟรชข้อมูล">
            <IconButton 
              onClick={fetchLeaveTypes} 
              disabled={loading}
              sx={{
                bgcolor: 'background.default',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
              }}
            >
              <Refresh2 
                size={20}
                color="#6C63FF"
                style={{ 
                  transition: 'transform 0.3s ease',
                  transform: loading ? 'rotate(360deg)' : 'rotate(0deg)',
                }} 
              />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3, 
            borderRadius: 1,
            '& .MuiAlert-icon': {
              color: theme.palette.error.main,
            },
          }}
        >
          {error}
        </Alert>
      )}

      {/* Table */}
      <Fade in={true} timeout={500}>
        <TableContainer 
          component={Paper} 
          sx={{ 
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>รหัส</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>ชื่อประเภทการลา</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>คำอธิบาย</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>วันลา/ปี</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }} align="center">ค่าจ้าง</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }} align="center">สถานะ</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }} align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            {loading ? (
              <TableSkeleton />
            ) : filteredLeaveTypes.length === 0 ? (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{
                          width: 80,
                          height: 80,
                          bgcolor: alpha(theme.palette.text.secondary, 0.1),
                        }}
                      >
                        <Calendar size={40} variant="Bold" color="#64748B" />
                      </Avatar>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          {searchQuery || statusFilter !== 'all' || paidFilter !== 'all'
                            ? 'ไม่พบประเภทการลาที่ค้นหา' 
                            : 'ยังไม่มีข้อมูลประเภทการลา'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {searchQuery || statusFilter !== 'all' || paidFilter !== 'all'
                            ? 'ลองค้นหาด้วยคำค้นอื่น หรือเปลี่ยนตัวกรอง' 
                            : 'เริ่มต้นใช้งานโดยการเพิ่มประเภทการลาใหม่'}
                        </Typography>
                      </Box>
                      {!searchQuery && statusFilter === 'all' && paidFilter === 'all' && (
                        <Button
                          variant="contained"
                          startIcon={<Add size={18} color="#fff" />}
                          onClick={handleCreate}
                          sx={{ mt: 1, borderRadius: 1 }}
                        >
                          เพิ่มประเภทการลาแรก
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : (
              <TableBody>
                {paginatedLeaveTypes.map((leaveType) => (
                  <TableRow
                    key={leaveType.id}
                    sx={{
                      transition: 'background-color 0.2s ease',
                      '&:hover': { 
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                      },
                      '&:last-child td': { border: 0 },
                    }}
                  >
                    <TableCell>
                      <Chip
                        label={leaveType.code}
                        size="small"
                        sx={{ 
                          fontWeight: 600,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                          borderRadius: 1,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {leaveType.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          maxWidth: 250,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {leaveType.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={leaveType.maxDaysPerYear ? `${leaveType.maxDaysPerYear} วัน` : 'ไม่จำกัด'}
                        size="small"
                        sx={{ 
                          bgcolor: leaveType.maxDaysPerYear 
                            ? alpha(theme.palette.info?.main || '#2196f3', 0.1)
                            : alpha(theme.palette.text.secondary, 0.1),
                          color: leaveType.maxDaysPerYear 
                            ? theme.palette.info?.main || '#2196f3'
                            : 'text.secondary',
                          fontWeight: 500,
                          borderRadius: 1,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        
                        label={leaveType.isPaid ? 'ได้รับ' : 'ไม่ได้รับ'}
                        size="small"
                        sx={{
                          fontWeight: 500,
                          bgcolor: leaveType.isPaid 
                            ? alpha(theme.palette.success.main, 0.1) 
                            : alpha(theme.palette.text.secondary, 0.1),
                          color: leaveType.isPaid 
                            ? theme.palette.success.main 
                            : 'text.secondary',
                          '& .MuiChip-icon': {
                            color: 'inherit',
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={leaveType.isActive 
                          ? <TickCircle size={14} /> 
                          : <CloseCircle size={14} />
                        }
                        label={leaveType.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        size="small"
                        sx={{
                          fontWeight: 500,
                          bgcolor: leaveType.isActive 
                            ? theme.palette.success.light 
                            : alpha(theme.palette.text.secondary, 0.1),
                          color: leaveType.isActive 
                            ? theme.palette.success.main 
                            : 'text.secondary',
                          '& .MuiChip-icon': {
                            color: 'inherit',
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="แก้ไข">
                          <IconButton
                            onClick={() => handleEdit(leaveType)}
                            size="medium"
                            sx={{
                              color: 'primary.main',
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                              },
                            }}
                          >
                            <Edit2 size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ลบ">
                          <IconButton
                            onClick={() => handleDelete(leaveType)}
                            size="medium"
                            sx={{
                              color: 'error.main',
                              bgcolor: alpha(theme.palette.error.main, 0.1),
                              '&:hover': {
                                bgcolor: alpha(theme.palette.error.main, 0.2),
                              },
                            }}
                          >
                            <Trash size={18} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        </TableContainer>
      </Fade>

      {/* Pagination */}
      {filteredLeaveTypes.length > 0 && (
        <Paper
          sx={{
            mt: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
          }}
        >
          <TablePagination
            component="div"
            count={filteredLeaveTypes.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="แสดงต่อหน้า:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
            }
            sx={{
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                fontWeight: 500,
              },
              '.MuiTablePagination-select': {
                borderRadius: 1,
              },
            }}
          />
        </Paper>
      )}

      {/* LeaveType Dialog */}
      <LeaveTypeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        leaveType={selectedLeaveType}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบประเภทการลา"
        message={`คุณต้องการลบประเภทการลา "${deleteTarget?.name}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
        type="delete"
        confirmText="ลบ"
        loading={deleteLoading}
      />
    </Box>
  );
}
