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
} from '@mui/material';
import {
  Plus,
  Pencil,
  Trash2,
  FolderTree,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Building2,
  Layers,
  Filter,
} from 'lucide-react';
import SectionDialog from './SectionDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToastr } from '@/app/components/Toastr';

interface Department {
  id: number;
  code: string;
  name: string;
  company: string;
}

interface Section {
  id: number;
  code: string;
  name: string;
  departmentId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  department: Department;
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
          <TableCell><Skeleton variant="rounded" width={100} height={24} /></TableCell>
          <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
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

export default function SectionsPage() {
  const theme = useTheme();
  const toastr = useToastr();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchSections = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/sections');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch sections');
      }
      const data = await res.json();
      setSections(data);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const handleCreate = () => {
    setSelectedSection(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (section: Section) => {
    setSelectedSection(section);
    setDialogOpen(true);
  };

  const handleDelete = (section: Section) => {
    setDeleteTarget(section);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/sections/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toastr.success('ลบหน่วยงานสำเร็จ');
      fetchSections();
    } catch (err: any) {
      toastr.error(err.message || 'เกิดข้อผิดพลาดในการลบหน่วยงาน');
    } finally {
      setDeleteLoading(false);
      setConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleSave = () => {
    setDialogOpen(false);
    toastr.success(selectedSection ? 'แก้ไขหน่วยงานสำเร็จ' : 'เพิ่มหน่วยงานสำเร็จ');
    fetchSections();
  };

  // Get unique companies and departments for filter dropdowns
  const uniqueCompanies = [...new Set(sections.map((s) => s.department.company))];
  const uniqueDepartments = [...new Set(sections.map((s) => JSON.stringify({ id: s.department.id, name: s.department.name, company: s.department.company })))].map((s) => JSON.parse(s));

  // Filter departments based on selected company
  const filteredDepartmentOptions = companyFilter === 'all' 
    ? uniqueDepartments 
    : uniqueDepartments.filter((d) => d.company === companyFilter);

  // Filter sections based on search and filters
  const filteredSections = sections.filter((section) => {
    const matchesSearch =
      section.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.department.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.department.company.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCompany = companyFilter === 'all' || section.department.company === companyFilter;
    const matchesDepartment = departmentFilter === 'all' || section.department.id.toString() === departmentFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && section.isActive) ||
      (statusFilter === 'inactive' && !section.isActive);
    
    return matchesSearch && matchesCompany && matchesDepartment && matchesStatus;
  });

  // Paginated sections
  const paginatedSections = filteredSections.slice(
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

  // Reset page and department filter when filters change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, companyFilter, departmentFilter, statusFilter]);

  // Reset department filter when company changes
  useEffect(() => {
    setDepartmentFilter('all');
  }, [companyFilter]);

  // Stats
  const activeSections = sections.filter((s) => s.isActive).length;
  const inactiveSections = sections.filter((s) => !s.isActive).length;
  const totalDepartments = [...new Set(sections.map((s) => s.departmentId))].length;

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
              <FolderTree size={24} />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={700}>
                จัดการหน่วยงาน
              </Typography>
              <Typography variant="body2" color="text.secondary">
                เพิ่ม แก้ไข และจัดการข้อมูลหน่วยงานในระบบ
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
          เพิ่มหน่วยงาน
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="หน่วยงานทั้งหมด"
            value={sections.length}
            icon={<FolderTree size={26} />}
            color="primary"
            subtitle="ในระบบ"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="เปิดใช้งาน"
            value={activeSections}
            icon={<CheckCircle size={26} />}
            color="success"
            subtitle="พร้อมใช้งาน"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="ปิดใช้งาน"
            value={inactiveSections}
            icon={<XCircle size={26} />}
            color="secondary"
            subtitle="ไม่ได้ใช้งาน"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="แผนก"
            value={totalDepartments}
            icon={<Layers size={26} />}
            color="warning"
            subtitle="ที่มีหน่วยงาน"
          />
        </Grid>
      </Grid>

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
            placeholder="ค้นหาหน่วยงาน..."
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
          <FormControl size="small" sx={{ minWidth: 140 }}>
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

          {/* Department Filter */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Layers size={16} />
                แผนก
              </Box>
            </InputLabel>
            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              label="แผนก"
              sx={{
                borderRadius: 1,
                bgcolor: 'background.default',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: departmentFilter !== 'all' ? 'primary.main' : 'divider',
                },
              }}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              {filteredDepartmentOptions.map((dept) => (
                <MenuItem key={dept.id} value={dept.id.toString()}>
                  {dept.name}
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
            label={`${filteredSections.length} รายการ`}
            size="small"
            sx={{ 
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              fontWeight: 600,
            }}
          />
          <Tooltip title="รีเฟรชข้อมูล">
            <IconButton 
              onClick={fetchSections} 
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
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>ชื่อหน่วยงาน</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>แผนก</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>บริษัท</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }} align="center">สถานะ</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }} align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            {loading ? (
              <TableSkeleton />
            ) : filteredSections.length === 0 ? (
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
                        <FolderTree size={40} />
                      </Avatar>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          {searchQuery || companyFilter !== 'all' || departmentFilter !== 'all' || statusFilter !== 'all' 
                            ? 'ไม่พบหน่วยงานที่ค้นหา' 
                            : 'ยังไม่มีข้อมูลหน่วยงาน'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {searchQuery || companyFilter !== 'all' || departmentFilter !== 'all' || statusFilter !== 'all'
                            ? 'ลองค้นหาด้วยคำค้นอื่น หรือเปลี่ยนตัวกรอง' 
                            : 'เริ่มต้นใช้งานโดยการเพิ่มหน่วยงานใหม่'}
                        </Typography>
                      </Box>
                      {!searchQuery && companyFilter === 'all' && departmentFilter === 'all' && statusFilter === 'all' && (
                        <Button
                          variant="contained"
                          startIcon={<Plus size={18} />}
                          onClick={handleCreate}
                          sx={{ mt: 1, borderRadius: 1 }}
                        >
                          เพิ่มหน่วยงานแรก
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : (
              <TableBody>
                {paginatedSections.map((section) => (
                  <TableRow
                    key={section.id}
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
                        label={section.code}
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
                        {section.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<Layers size={14} />}
                        label={section.department.name}
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
                        icon={<Building2 size={14} />}
                        label={section.department.company}
                        size="small"
                        sx={{ 
                          bgcolor: alpha(theme.palette.info?.main || '#2196f3', 0.1),
                          color: theme.palette.info?.main || '#2196f3',
                          fontWeight: 500,
                          borderRadius: 1,
                          '& .MuiChip-icon': {
                            color: 'inherit',
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={section.isActive 
                          ? <CheckCircle size={14} /> 
                          : <XCircle size={14} />
                        }
                        label={section.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        size="small"
                        sx={{
                          fontWeight: 500,
                          bgcolor: section.isActive 
                            ? theme.palette.success.light 
                            : alpha(theme.palette.text.secondary, 0.1),
                          color: section.isActive 
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
                            onClick={() => handleEdit(section)}
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
                            onClick={() => handleDelete(section)}
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
      {filteredSections.length > 0 && (
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
            count={filteredSections.length}
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

      {/* Section Dialog */}
      <SectionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        section={selectedSection}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบหน่วยงาน"
        message={`คุณต้องการลบหน่วยงาน "${deleteTarget?.name}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
        type="delete"
        confirmText="ลบ"
        loading={deleteLoading}
      />
    </Box>
  );
}
