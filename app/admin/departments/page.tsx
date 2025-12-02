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
  Grid,
  Avatar,
  alpha,
  useTheme,
  Fade,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Plus,
  Pencil,
  Trash2,
  Layers,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Building2,
  FolderTree,
  Filter,
  Hash,
} from 'lucide-react';
import DepartmentDialog from './DepartmentDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToastr } from '@/app/components/Toastr';

interface Section {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

interface Department {
  id: number;
  code: string;
  name: string;
  company: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  sections: Section[];
  _count?: {
    sections: number;
  };
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
          <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
          <TableCell><Skeleton variant="text" width={60} /></TableCell>
          <TableCell align="center"><Skeleton variant="rounded" width={80} height={24} /></TableCell>
          <TableCell align="right">
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="circular" width={32} height={32} />
            </Box>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export default function DepartmentsPage() {
  const theme = useTheme();
  const toastr = useToastr();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Section Dialog State
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [selectedDepartmentForSections, setSelectedDepartmentForSections] = useState<Department | null>(null);

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/departments');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch departments');
      }
      const data = await res.json();
      setDepartments(data);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreate = () => {
    setSelectedDepartment(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    setDialogOpen(true);
  };

  const handleDelete = (department: Department) => {
    setDeleteTarget(department);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/departments/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to delete' }));
        throw new Error(data.error || 'Failed to delete');
      }
      toastr.success('ลบฝ่ายสำเร็จ');
      fetchDepartments();
    } catch (err: any) {
      toastr.error(err.message || 'เกิดข้อผิดพลาดในการลบฝ่าย');
    } finally {
      setDeleteLoading(false);
      setConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleSave = () => {
    setDialogOpen(false);
    toastr.success(selectedDepartment ? 'แก้ไขฝ่ายสำเร็จ' : 'เพิ่มฝ่ายสำเร็จ');
    fetchDepartments();
  };

  const handleViewSections = (department: Department) => {
    setSelectedDepartmentForSections(department);
    setSectionDialogOpen(true);
  };

  // Get unique companies for filter dropdown
  const uniqueCompanies = [...new Set(departments.map((d) => d.company))];

  // Filter departments based on search and filters
  const filteredDepartments = departments.filter((department) => {
    const matchesSearch =
      department.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      department.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      department.company.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCompany = companyFilter === 'all' || department.company === companyFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && department.isActive) ||
      (statusFilter === 'inactive' && !department.isActive);
    
    return matchesSearch && matchesCompany && matchesStatus;
  });

  // Paginated departments
  const paginatedDepartments = filteredDepartments.slice(
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
  }, [searchQuery, companyFilter, statusFilter]);

  // Stats
  const activeDepartments = departments.filter((d) => d.isActive).length;
  const inactiveDepartments = departments.filter((d) => !d.isActive).length;
  const totalSections = departments.reduce((acc, d) => acc + (d._count?.sections || 0), 0);

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
              <Layers size={24} />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={700}>
                จัดการฝ่าย
              </Typography>
              <Typography variant="body2" color="text.secondary">
                เพิ่ม แก้ไข และจัดการข้อมูลฝ่ายในระบบ
              </Typography>
            </Box>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
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
          เพิ่มฝ่าย
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <StatCard
          title="ฝ่ายทั้งหมด"
          value={departments.length}
          icon={<Layers size={26} />}
          color="primary"
          subtitle="ในระบบ"
        />
        <StatCard
          title="เปิดใช้งาน"
          value={activeDepartments}
          icon={<CheckCircle size={26} />}
          color="success"
          subtitle="พร้อมใช้งาน"
        />
        <StatCard
          title="ปิดใช้งาน"
          value={inactiveDepartments}
          icon={<XCircle size={26} />}
          color="secondary"
          subtitle="ไม่ได้ใช้งาน"
        />
        <StatCard
          title="แผนก"
          value={totalSections}
          icon={<FolderTree size={26} />}
          color="warning"
          subtitle="ทั้งหมด"
        />
      </Box>

      {/* Search & Actions */}
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
            placeholder="ค้นหาแผนก..."
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
                  <Search size={18} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
            }}
          />

          {/* Company Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Building2 size={16} />
                บริษัท
              </Box>
            </InputLabel>
            <Select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              label="บริษัท"
              sx={{
                borderRadius: 1,
                bgcolor: 'background.default',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: companyFilter !== 'all' ? 'primary.main' : 'divider',
                },
              }}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              {uniqueCompanies.map((company) => (
                <MenuItem key={company} value={company}>
                  {company}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Status Filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Filter size={16} />
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
                  <CheckCircle size={16} color={theme.palette.success.main} />
                  เปิดใช้งาน
                </Box>
              </MenuItem>
              <MenuItem value="inactive">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <XCircle size={16} color={theme.palette.text.secondary} />
                  ปิดใช้งาน
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <Chip 
            label={`${filteredDepartments.length} รายการ`}
            size="small"
            sx={{ 
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              fontWeight: 600,
            }}
          />
          <Tooltip title="รีเฟรชข้อมูล">
            <IconButton 
              onClick={fetchDepartments} 
              disabled={loading}
              sx={{
                bgcolor: 'background.default',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
              }}
            >
              <RefreshCw 
                size={20} 
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
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>ชื่อฝ่าย</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>บริษัท</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>แผนก</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }} align="center">สถานะ</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }} align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            {loading ? (
              <TableSkeleton />
            ) : filteredDepartments.length === 0 ? (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{
                          width: 80,
                          height: 80,
                          bgcolor: alpha(theme.palette.text.secondary, 0.1),
                          color: 'text.secondary',
                        }}
                      >
                        <Layers size={40} />
                      </Avatar>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          {searchQuery ? 'ไม่พบฝ่ายที่ค้นหา' : 'ยังไม่มีข้อมูลฝ่าย'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {searchQuery 
                            ? 'ลองค้นหาด้วยคำค้นอื่น' 
                            : 'เริ่มต้นใช้งานโดยการเพิ่มฝ่ายใหม่'}
                        </Typography>
                      </Box>
                      {!searchQuery && (
                        <Button
                          variant="contained"
                          startIcon={<Plus size={18} />}
                          onClick={handleCreate}
                          sx={{ mt: 1, borderRadius: 1 }}
                        >
                          เพิ่มฝ่ายแรก
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : (
              <TableBody>
                {paginatedDepartments.map((department) => (
                  <TableRow
                    key={department.id}
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
                        label={department.code}
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
                        {department.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<Building2 size={14} />}
                        label={department.company}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          borderRadius: 1,
                          '& .MuiChip-icon': {
                            color: 'inherit',
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${department.sections?.length || department._count?.sections || 0} แผนก`}
                        size="small"
                        onClick={() => handleViewSections(department)}
                        sx={{ 
                          bgcolor: alpha(theme.palette.warning.main, 0.1),
                          color: theme.palette.warning.main,
                          fontWeight: 500,
                          borderRadius: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.warning.main, 0.2),
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={department.isActive 
                          ? <CheckCircle size={14} /> 
                          : <XCircle size={14} />
                        }
                        label={department.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        size="small"
                        sx={{
                          fontWeight: 500,
                          bgcolor: department.isActive 
                            ? theme.palette.success.light 
                            : alpha(theme.palette.text.secondary, 0.1),
                          color: department.isActive 
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
                            onClick={() => handleEdit(department)}
                            size="medium"
                            sx={{
                              color: 'primary.main',
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                              },
                            }}
                          >
                            <Pencil size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ลบ">
                          <IconButton
                            onClick={() => handleDelete(department)}
                            size="medium"
                            sx={{
                              color: 'error.main',
                              bgcolor: alpha(theme.palette.error.main, 0.1),
                              '&:hover': {
                                bgcolor: alpha(theme.palette.error.main, 0.2),
                              },
                            }}
                          >
                            <Trash2 size={18} />
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
      {filteredDepartments.length > 0 && (
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
            count={filteredDepartments.length}
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

      {/* Department Dialog */}
      <DepartmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        department={selectedDepartment}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบแผนก"
        message={`คุณต้องการลบแผนก "${deleteTarget?.name}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
        type="delete"
        confirmText="ลบ"
        loading={deleteLoading}
      />

      {/* Sections List Dialog */}
      <Dialog
        open={sectionDialogOpen}
        onClose={() => setSectionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderTree size={24} />
          รายชื่อแผนก - {selectedDepartmentForSections?.name}
        </DialogTitle>
        <DialogContent dividers>
          {selectedDepartmentForSections?.sections && selectedDepartmentForSections.sections.length > 0 ? (
            <List>
              {selectedDepartmentForSections.sections.map((section) => (
                <ListItem key={section.id} divider>
                  <ListItemIcon>
                    <Hash size={20} />
                  </ListItemIcon>
                  <ListItemText
                    primary={section.name}
                    secondary={`รหัส: ${section.code} | สถานะ: ${section.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}`}
                  />
                  <Chip
                    label={section.isActive ? 'Active' : 'Inactive'}
                    size="small"
                    color={section.isActive ? 'success' : 'default'}
                    variant="outlined"
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
              <Typography>ไม่มีข้อมูลแผนกในฝ่ายนี้</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSectionDialogOpen(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
