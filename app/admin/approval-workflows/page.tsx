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
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  Add,
  Edit2,
  Trash,
  SearchNormal1,
  Refresh2,
  Hierarchy,
  Building,
  Layer,
  People,
  ArrowRight2,
} from 'iconsax-react';
import WorkflowDialog from './WorkflowDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToastr } from '@/app/components/Toastr';

interface ApprovalWorkflow {
  id: number;
  name: string;
  description?: string;
  company?: string;
  department?: string;
  section?: string;
  steps: ApprovalWorkflowStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApprovalWorkflowStep {
  id: number;
  level: number;
  approverRole?: string;
  approverId?: number;
  approver?: {
    firstName: string;
    lastName: string;
  };
}

interface Company {
  id: number;
  code: string;
  name: string;
}

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
  departmentCode: string;
  companyCode: string;
}

const formatRole = (role: string) => {
  const roles: Record<string, string> = {
    shift_supervisor: 'หัวหน้ากะ',
    section_head: 'หัวหน้าแผนก',
    dept_manager: 'ผจก.ฝ่าย',
    hr_manager: 'ผจก.บุคคล',
    admin: 'Admin',
    hr: 'HR'
  };
  return roles[role] || role;
};

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
          <TableCell><Skeleton variant="text" width={150} /></TableCell>
          <TableCell><Skeleton variant="rounded" width={100} height={24} /></TableCell>
          <TableCell><Skeleton variant="rounded" width={200} height={24} /></TableCell>
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

export default function ApprovalWorkflowsPage() {
  const theme = useTheme();
  const toastr = useToastr();
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ApprovalWorkflow | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApprovalWorkflow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/approval-workflows');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || 'Failed to fetch workflows');
      }
      const data = await res.json();
      setWorkflows(data);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies');
      if (res.ok) {
        setCompanies(await res.json());
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        setDepartments(await res.json());
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchSections = async () => {
    try {
      const res = await fetch('/api/sections');
      if (res.ok) {
        setSections(await res.json());
      }
    } catch (err) {
      console.error('Error fetching sections:', err);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    fetchCompanies();
    fetchDepartments();
    fetchSections();
  }, []);

  const handleCreate = () => {
    setSelectedWorkflow(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (workflow: ApprovalWorkflow) => {
    setSelectedWorkflow(workflow);
    setDialogOpen(true);
  };

  const handleDelete = (workflow: ApprovalWorkflow) => {
    setDeleteTarget(workflow);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/approval-workflows/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toastr.success('ลบ Workflow สำเร็จ');
      fetchWorkflows();
    } catch (err: any) {
      toastr.error(err.message || 'เกิดข้อผิดพลาดในการลบ');
    } finally {
      setDeleteLoading(false);
      setConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleSave = () => {
    setDialogOpen(false);
    toastr.success(selectedWorkflow ? 'แก้ไข Workflow สำเร็จ' : 'เพิ่ม Workflow สำเร็จ');
    fetchWorkflows();
  };

  // Get company name from code
  const getCompanyName = (code: string | undefined) => {
    if (!code) return null;
    const company = companies.find(c => c.code === code);
    return company?.name || code;
  };

  // Get department name from code
  const getDepartmentName = (code: string | undefined) => {
    if (!code) return null;
    const department = departments.find(d => d.code === code);
    return department?.name || code;
  };

  // Get section name from code
  const getSectionName = (code: string | undefined) => {
    if (!code) return null;
    const section = sections.find(s => s.code === code);
    return section?.name || code;
  };

  // Filter workflows based on search and filters
  const filteredWorkflows = workflows.filter((workflow) => {
    const companyName = getCompanyName(workflow.company) || '';
    const matchesSearch =
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (workflow.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (workflow.department?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesCompany = companyFilter === 'all' || workflow.company === companyFilter;
    
    return matchesSearch && matchesCompany;
  });

  // Paginated workflows
  const paginatedWorkflows = filteredWorkflows.slice(
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
  }, [searchQuery, companyFilter]);

  // Stats
  const totalWorkflows = workflows.length;
  const globalWorkflows = workflows.filter((w) => !w.company && !w.department && !w.section).length;
  const companyWorkflows = workflows.filter((w) => w.company && !w.department).length;
  const departmentWorkflows = workflows.filter((w) => w.department).length;

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
              <Hierarchy size={24} variant="Bold" color="#6C63FF" />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={700}>
                Approval Workflows
              </Typography>
              <Typography variant="body2" color="text.secondary">
                จัดการลำดับการอนุมัติใบลา
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
          เพิ่ม Workflow
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: 1 }}
          action={
            <Button color="inherit" size="small" onClick={fetchWorkflows}>
              ลองใหม่
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 3,
          mb: 4,
        }}
      >
        <StatCard
          title="Workflow ทั้งหมด"
          value={totalWorkflows}
          icon={<Hierarchy size={28} variant="Bold" color="#6C63FF" />}
          color="primary"
        />
        <StatCard
          title="Global"
          value={globalWorkflows}
          icon={<People size={28} variant="Bold" color="#22C55E" />}
          color="success"
          subtitle="ใช้ทั้งองค์กร"
        />
        <StatCard
          title="ระดับบริษัท"
          value={companyWorkflows}
          icon={<Building size={28} variant="Bold" color="#F59E0B" />}
          color="warning"
          subtitle="เฉพาะบริษัท"
        />
        <StatCard
          title="ระดับฝ่าย/แผนก"
          value={departmentWorkflows}
          icon={<Layer size={28} variant="Bold" color="#64748B" />}
          color="secondary"
          subtitle="เฉพาะฝ่าย/แผนก"
        />
      </Box>

      {/* Filters */}
      <Paper 
        sx={{ 
          p: 2.5, 
          mb: 3, 
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr auto' },
            gap: 2,
            alignItems: 'center',
          }}
        >
          <TextField
            placeholder="ค้นหา..."
            size="small"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchNormal1 size={18} color="#6C63FF" />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" fullWidth>
            <InputLabel>บริษัท</InputLabel>
            <Select
              value={companyFilter}
              label="บริษัท"
              onChange={(e) => setCompanyFilter(e.target.value)}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              {companies.map((company) => (
                <MenuItem key={company.code} value={company.code}>{company.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="รีเฟรช">
            <IconButton 
              onClick={fetchWorkflows} 
              disabled={loading}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
              }}
            >
              <Refresh2 size={18} color="#6C63FF" className={loading ? 'animate-spin' : ''} />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Table */}
      <Paper 
        sx={{ 
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <TableCell sx={{ fontWeight: 600 }}>ชื่อ Workflow</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>ขอบเขต</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>ขั้นตอนอนุมัติ</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>จำนวนขั้น</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, pr: 3 }}>จัดการ</TableCell>
              </TableRow>
            </TableHead>
            {loading ? (
              <TableSkeleton />
            ) : (
              <TableBody>
                {paginatedWorkflows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <Hierarchy size={48} color={theme.palette.text.disabled} />
                        <Typography color="text.secondary">
                          {searchQuery || companyFilter !== 'all'
                            ? 'ไม่พบข้อมูลที่ค้นหา'
                            : 'ยังไม่มี Workflow กรุณาเพิ่มใหม่'}
                        </Typography>
                        {!searchQuery && companyFilter === 'all' && (
                          <Button
                            variant="outlined"
                            startIcon={<Add size={18} color="#6C63FF" />}
                            onClick={handleCreate}
                          >
                            เพิ่ม Workflow
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedWorkflows.map((workflow) => (
                    <TableRow 
                      key={workflow.id}
                      sx={{ 
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {workflow.name}
                          </Typography>
                          {workflow.description && (
                            <Typography variant="caption" color="text.secondary">
                              {workflow.description}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {workflow.company && (
                            <Chip 
                              label={getCompanyName(workflow.company)} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                              icon={<Building size={12} color="#6C63FF" />}
                            />
                          )}
                          {workflow.department && (
                            <Chip 
                              label={getDepartmentName(workflow.department)} 
                              size="small" 
                              color="secondary" 
                              variant="outlined"
                              icon={<Layer size={12} color="#64748B" />}
                            />
                          )}
                          {workflow.section && (
                            <Chip 
                              label={getSectionName(workflow.section)} 
                              size="small" 
                              color="info" 
                              variant="outlined"
                            />
                          )}
                          {!workflow.company && !workflow.department && !workflow.section && (
                            <Chip 
                              label="Global" 
                              size="small" 
                              color="success"
                              icon={<People size={12} color="#22C55E" />}
                            />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                          {workflow.steps.map((step, index) => (
                            <React.Fragment key={step.id}>
                              {index > 0 && (
                                <ArrowRight2 size={14} color={theme.palette.text.disabled} style={{ flexShrink: 0 }} />
                              )}
                              <Chip
                                label={
                                  step.approverRole
                                    ? formatRole(step.approverRole)
                                    : step.approver
                                    ? `${step.approver.firstName}`
                                    : '?'
                                }
                                size="small"
                                variant="filled"
                                sx={{ 
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                  color: 'primary.main',
                                  fontWeight: 500,
                                }}
                              />
                            </React.Fragment>
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={workflow.steps.length} 
                          size="small"
                          color="default"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title="แก้ไข">
                            <IconButton 
                              onClick={() => handleEdit(workflow)} 
                              size="small"
                              sx={{ 
                                color: 'primary.main',
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                              }}
                            >
                              <Edit2 size={16} color="#6C63FF" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="ลบ">
                            <IconButton 
                              onClick={() => handleDelete(workflow)} 
                              size="small"
                              sx={{ 
                                color: 'error.main',
                                '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) },
                              }}
                            >
                              <Trash size={16} color="#EF4444" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            )}
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        <TablePagination
          component="div"
          count={filteredWorkflows.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="แสดง:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} จาก ${count}`}
          sx={{ borderTop: '1px solid', borderColor: 'divider' }}
        />
      </Paper>

      {/* Workflow Dialog */}
      <WorkflowDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        workflow={selectedWorkflow}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="ยืนยันการลบ Workflow"
        message={`คุณต้องการลบ Workflow "${deleteTarget?.name}" หรือไม่?`}
        confirmText="ลบ"
        cancelText="ยกเลิก"
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
        loading={deleteLoading}
        type="delete"
      />
    </Box>
  );
}
