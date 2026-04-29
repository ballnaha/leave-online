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
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fade,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
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
  RowVertical,
  ArrowDown2,
  RowHorizontal,
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
  roleNames?: string[];
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

const formatDateShort = (iso: string | undefined) => {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getStepLabel = (step: ApprovalWorkflowStep) => {
  const roleLabel = step.approverRole ? formatRole(step.approverRole) : '';
  const names = step.roleNames && step.roleNames.length > 0
    ? ` (${step.roleNames.join(', ')})`
    : '';

  if (step.approverRole) return `${roleLabel}${names}`;
  if (step.approver) return `${step.approver.firstName}`;
  return '?';
};

const getWorkflowStepsPreview = (steps: ApprovalWorkflowStep[]) => {
  if (!steps || steps.length === 0) return '-';
  return steps
    .slice()
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
    .map(getStepLabel)
    .join(' → ');
};

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
        '@media (hover: none)': {
          '&:hover': {
            transform: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          },
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
              {title}
            </Typography>
            <Typography
              variant="h3"
              fontWeight={700}
              sx={{
                color: colorMap[color].main,
                fontSize: { xs: '1.6rem', sm: '2.125rem', md: '3rem' },
                lineHeight: 1.15,
              }}
            >
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
              width: { xs: 48, sm: 56 },
              height: { xs: 48, sm: 56 },
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
          <TableCell align="center"><Skeleton variant="rounded" width={120} height={24} /></TableCell>
          <TableCell><Skeleton variant="rounded" width={90} height={24} /></TableCell>
          <TableCell><Skeleton variant="text" width={90} /></TableCell>
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
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  // View Mode: 'list' or 'tree'
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApprovalWorkflow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);

  const handleToggleActive = async (workflow: ApprovalWorkflow) => {
    const nextActive = !workflow.isActive;
    setToggleLoadingId(workflow.id);
    try {
      const res = await fetch(`/api/admin/approval-workflows/${workflow.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: nextActive }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(data.error || 'Failed to update status');
      }

      toastr.success(nextActive ? 'เปิดใช้งาน Workflow แล้ว' : 'ปิดใช้งาน Workflow แล้ว');
      fetchWorkflows();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ';
      toastr.error(message);
    } finally {
      setToggleLoadingId(null);
    }
  };

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch workflows';
      setError(message);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบ';
      toastr.error(message);
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
    const departmentName = getDepartmentName(workflow.department) || '';
    const sectionName = getSectionName(workflow.section) || '';

    const matchesSearch =
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (workflow.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      departmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sectionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (workflow.department?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesCompany = companyFilter === 'all' || workflow.company === companyFilter;
    const matchesDept = deptFilter === 'all' || workflow.department === deptFilter;
    const matchesSection = sectionFilter === 'all' || workflow.section === sectionFilter;

    return matchesSearch && matchesCompany && matchesDept && matchesSection;
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
  }, [searchQuery, companyFilter, deptFilter, sectionFilter]);

  // Cascading filter logic
  const handleCompanyChange = (value: string) => {
    setCompanyFilter(value);
    setDeptFilter('all');
    setSectionFilter('all');
  };

  const handleDeptChange = (value: string) => {
    setDeptFilter(value);
    setSectionFilter('all');
  };

  const filteredDepts = departments.filter(d => companyFilter === 'all' || d.company === companyFilter);
  const filteredSects = sections.filter(s => {
    if (deptFilter !== 'all') {
      return s.departmentCode === deptFilter;
    }
    if (companyFilter !== 'all') {
      return s.companyCode === companyFilter;
    }
    return true;
  });

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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_e, val) => val && setViewMode(val)}
            size="small"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              '& .MuiToggleButton-root': {
                border: 'none',
                px: 2,
                '&.Mui-selected': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                  },
                },
              },
            }}
          >
            <ToggleButton value="list">
              <RowVertical size={18} variant="Bold" color="#6C63FF" style={{ marginRight: 8 }} />
              รายการ
            </ToggleButton>
            <ToggleButton value="tree">
              <Hierarchy size={18} variant="Bold" color="#6C63FF" style={{ marginRight: 8 }} />
              แบ่งกลุ่ม
            </ToggleButton>
          </ToggleButtonGroup>

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
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: { xs: 2, sm: 3 },
          mb: { xs: 3, sm: 4 },
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
          p: { xs: 2, sm: 2.5 },
          mb: 3,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: '1.5fr 1fr 1fr 1fr auto'
            },
            gap: 2,
            alignItems: 'center',
          }}
        >
          <TextField
            placeholder="ค้นหาชื่อ หรือรายละเอียด..."
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
              onChange={(e) => handleCompanyChange(e.target.value)}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              {companies.map((company) => (
                <MenuItem key={company.code} value={company.code}>{company.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth disabled={companyFilter === 'all' && filteredDepts.length === 0}>
            <InputLabel>ฝ่าย</InputLabel>
            <Select
              value={deptFilter}
              label="ฝ่าย"
              onChange={(e) => handleDeptChange(e.target.value)}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              {filteredDepts.map((dept) => (
                <MenuItem key={dept.code} value={dept.code}>{dept.code} - {dept.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth disabled={deptFilter === 'all'}>
            <InputLabel>แผนก</InputLabel>
            <Select
              value={sectionFilter}
              label="แผนก"
              onChange={(e) => setSectionFilter(e.target.value)}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              {filteredSects.map((section) => (
                <MenuItem key={section.code} value={section.code}>{section.code} - {section.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="รีเฟรช">
            <IconButton
              onClick={() => {
                fetchWorkflows();
                setSearchQuery('');
                setCompanyFilter('all');
                setDeptFilter('all');
                setSectionFilter('all');
              }}
              disabled={loading}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                width: 40,
                height: 40,
                ml: { md: 1 }
              }}
            >
              <Refresh2 size={18} color="#6C63FF" className={loading ? 'animate-spin' : ''} />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Tree View - Grouped by structure */}
      {viewMode === 'tree' && (
        <Fade in={viewMode === 'tree'}>
          <Box sx={{ mb: 4 }}>
            {/* Global Workflows Section */}
            {filteredWorkflows.filter(w => !w.company && !w.department && !w.section).length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <People size={20} variant="Bold" />
                  Global Workflows (ใช้ทั้งองค์กร)
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
                  {filteredWorkflows.filter(w => !w.company && !w.department && !w.section).map(workflow => (
                    <WorkflowSmallCard
                      key={workflow.id}
                      workflow={workflow}
                      onEdit={() => handleEdit(workflow)}
                      onDelete={() => handleDelete(workflow)}
                      onToggle={() => handleToggleActive(workflow)}
                      isLoading={toggleLoadingId === workflow.id}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Grouped by Company > Dept */}
            {companies
              .filter(c => companyFilter === 'all' || c.code === companyFilter)
              .map(company => {
                const companyWorkflows = filteredWorkflows.filter(w => w.company === company.code);
                if (companyWorkflows.length === 0) return null;

                return (
                  <Accordion
                    key={company.code}
                    sx={{
                      mb: 2,
                      borderRadius: 1,
                      overflow: 'hidden',
                      '&:before': { display: 'none' },
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: 'none',
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ArrowDown2 size={20} variant="Bold" color="#6C63FF" />}
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.03),
                        '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1 }
                      }}
                    >
                      <Building size={20} color={theme.palette.primary.main} variant="Bold" />
                      <Typography fontWeight={700}>
                        {company.name} ({company.code})
                      </Typography>
                      <Chip
                        label={`${companyWorkflows.length} Workflows`}
                        size="small"
                        sx={{ ml: 2, height: 20, fontSize: '0.7rem', bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}
                      />
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 2 }}>
                      {/* Workflows directly for this company */}
                      {companyWorkflows.filter(w => !w.department).length > 0 && (
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600} gutterBottom display="block">
                            แบบร่างระดับบริษัท
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
                            {companyWorkflows.filter(w => !w.department).map(workflow => (
                              <WorkflowSmallCard
                                key={workflow.id}
                                workflow={workflow}
                                onEdit={() => handleEdit(workflow)}
                                onDelete={() => handleDelete(workflow)}
                                onToggle={() => handleToggleActive(workflow)}
                                isLoading={toggleLoadingId === workflow.id}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* Grouped by Departments */}
                      {departments
                        .filter(d => d.company === company.code)
                        .map(dept => {
                          const deptWorkflows = companyWorkflows.filter(w => w.department === dept.code);
                          if (deptWorkflows.length === 0) return null;

                          return (
                            <Box key={dept.code} sx={{ mb: 3, pl: { md: 2 } }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <Layer size={18} color={theme.palette.secondary.main} variant="Bold" />
                                <Typography variant="subtitle2" fontWeight={700} color="secondary.main">
                                  ฝ่าย: {dept.name} ({dept.code})
                                </Typography>
                              </Box>

                              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2, ml: { md: 3 } }}>
                                {deptWorkflows.map(workflow => (
                                  <WorkflowSmallCard
                                    key={workflow.id}
                                    workflow={workflow}
                                    onEdit={() => handleEdit(workflow)}
                                    onDelete={() => handleDelete(workflow)}
                                    onToggle={() => handleToggleActive(workflow)}
                                    isLoading={toggleLoadingId === workflow.id}
                                  />
                                ))}
                              </Box>
                            </Box>
                          );
                        })}
                    </AccordionDetails>
                  </Accordion>
                );
              })}
          </Box>
        </Fade>
      )}

      {/* Mobile/Tablet Card View (Visible on xs, sm when list mode) */}
      <Box
        sx={{
          display: viewMode === 'list' ? { xs: 'grid', md: 'none' } : 'none',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          gap: 2,
        }}
      >
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={150} sx={{ borderRadius: 1 }} />
          ))
        ) : filteredWorkflows.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Hierarchy size={48} color={theme.palette.text.disabled} />
              <Typography color="text.secondary">
                {searchQuery || companyFilter !== 'all'
                  ? 'ไม่พบข้อมูลที่ค้นหา'
                  : 'ยังไม่มี Workflow กรุณาเพิ่มใหม่'}
              </Typography>
            </Box>
          </Paper>
        ) : (
          paginatedWorkflows.map((workflow) => (
            <Paper
              key={workflow.id}
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {/* Card Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {workflow.name}
                  </Typography>
                  {workflow.description && (
                    <Typography variant="caption" color="text.secondary">
                      {workflow.description}
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Tooltip title={workflow.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
                    <Switch
                      size="small"
                      checked={workflow.isActive}
                      disabled={toggleLoadingId === workflow.id}
                      onChange={() => handleToggleActive(workflow)}
                      inputProps={{ 'aria-label': 'toggle workflow active' }}
                    />
                  </Tooltip>
                  <Chip
                    label={`${workflow.steps.length} ขั้น`}
                    size="small"
                    sx={{ borderRadius: 1, height: 24, fontSize: '0.7rem' }}
                  />
                </Stack>
              </Box>

              {/* Scope Chips */}
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: -1 }}>
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

              {/* Steps */}
              <Box sx={{ bgcolor: alpha(theme.palette.background.default, 0.5), p: 1.5, borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  ขั้นตอนการอนุมัติ: <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>{getWorkflowStepsPreview(workflow.steps)}</Box>
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  {workflow.steps.map((step, index) => (
                    <React.Fragment key={step.id}>
                      {index > 0 && (
                        <ArrowRight2 size={12} color={theme.palette.primary.main} variant="Bold" />
                      )}
                      <Chip
                        label={
                          getStepLabel(step)
                        }
                        size="small"
                        sx={{
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                          height: 24,
                          fontSize: '0.75rem',
                        }}
                      />
                    </React.Fragment>
                  ))}
                </Stack>
              </Box>

              {/* Updated */}
              <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                อัปเดตล่าสุด: {formatDateShort(workflow.updatedAt)}
              </Typography>

              {/* Actions */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<Edit2 size={16} color="#6C63FF" />}
                  onClick={() => handleEdit(workflow)}
                  sx={{ borderRadius: 1 }}
                >
                  แก้ไข
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<Trash size={16} color="#DC2626" />}
                  onClick={() => handleDelete(workflow)}
                  sx={{ borderRadius: 1 }}
                >
                  ลบ
                </Button>
              </Box>
            </Paper>
          ))
        )}
      </Box>

      {/* Desktop Table View (Hidden on xs, sm when list mode) */}
      <Paper
        sx={{
          display: viewMode === 'list' ? { xs: 'none', md: 'block' } : 'none',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <TableCell sx={{ fontWeight: 600 }}>ชื่อ Workflow</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>ขอบเขต</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>ขั้นตอนอนุมัติ</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>จำนวนขั้น</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>สถานะ</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>อัปเดตล่าสุด</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, pr: 3 }}>จัดการ</TableCell>
              </TableRow>
            </TableHead>
            {loading ? (
              <TableSkeleton />
            ) : (
              <TableBody>
                {paginatedWorkflows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
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
                        <Stack direction="column" spacing={0.5} alignItems="flex-start">
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
                      <TableCell sx={{ py: 2, minWidth: 300 }}>
                        <Stack spacing={1}>
                          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                            {workflow.steps
                              .slice()
                              .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
                              .map((step, index) => (
                                <React.Fragment key={step.id}>
                                  {index > 0 && (
                                    <ArrowRight2 size={14} color={theme.palette.primary.main} variant="Bold" />
                                  )}
                                  <Typography variant="body2" fontWeight={700} sx={{ color: 'primary.main' }}>
                                    {step.approverRole ? formatRole(step.approverRole) : (step.approver?.firstName ?? '?')}
                                  </Typography>
                                </React.Fragment>
                              ))}
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                            {workflow.steps
                              .slice()
                              .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
                              .map((step) => {
                                if (!step.roleNames || step.roleNames.length === 0) return null;
                                return (
                                  <Typography
                                    key={step.id}
                                    variant="body2"
                                    sx={{
                                      color: 'text.secondary',
                                      lineHeight: 1.4,
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: 0.5,
                                      fontSize: '0.875rem',
                                    }}
                                  >
                                    <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>•</Box>
                                    <Box component="span">
                                      <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                        {step.approverRole ? formatRole(step.approverRole) : 'ผู้อนุมัติ'}:
                                      </Box> {step.roleNames.join(', ')}
                                    </Box>
                                  </Typography>
                                );
                              })}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={workflow.steps.length}
                          size="small"
                          color="default"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Tooltip title={workflow.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
                            <Switch
                              size="small"
                              checked={workflow.isActive}
                              disabled={toggleLoadingId === workflow.id}
                              onChange={() => handleToggleActive(workflow)}
                              inputProps={{ 'aria-label': 'toggle workflow active' }}
                            />
                          </Tooltip>
                          <Typography
                            variant="body2"
                            sx={{
                              color: workflow.isActive ? 'success.main' : 'text.secondary',
                              fontWeight: 600,
                            }}
                          >
                            {workflow.isActive ? 'ใช้งาน' : 'ปิด'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDateShort(workflow.updatedAt)}
                        </Typography>
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
// Small Card for Tree View
function WorkflowSmallCard({
  workflow,
  onEdit,
  onDelete,
  onToggle,
  isLoading
}: {
  workflow: ApprovalWorkflow;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  isLoading: boolean;
}) {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box sx={{ maxWidth: 'calc(100% - 40px)' }}>
          <Typography variant="body2" fontWeight={700} sx={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {workflow.name}
          </Typography>
          {workflow.section && (
            <Chip
              label={`แผนก: ${workflow.section}`}
              size="small"
              variant="outlined"
              sx={{ height: 18, fontSize: '0.65rem', mt: 0.5 }}
            />
          )}
        </Box>
        <Switch
          size="small"
          checked={workflow.isActive}
          disabled={isLoading}
          onChange={onToggle}
        />
      </Box>

      <Box sx={{ bgcolor: alpha(theme.palette.background.default, 0.5), p: 1.5, borderRadius: 1, mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
          ลำดับการอนุมัติ:
        </Typography>
        <Stack spacing={0.5}>
          {workflow.steps
            .slice()
            .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
            .map((step) => (
              <Box key={step.id}>
                <Typography variant="caption" fontWeight={700} color="primary.main" display="block">
                  {step.approverRole ? formatRole(step.approverRole) : (step.approver?.firstName ?? '?')}
                </Typography>
                {step.roleNames && step.roleNames.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block', pl: 1, borderLeft: '1px solid', borderColor: 'divider', ml: 0.5 }}>
                    {step.roleNames.join(', ')}
                  </Typography>
                )}
              </Box>
            ))}
        </Stack>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <IconButton size="small" onClick={onEdit} sx={{ color: 'primary.main' }}>
          <Edit2 size={16} />
        </IconButton>
        <IconButton size="small" onClick={onDelete} sx={{ color: 'error.main' }}>
          <Trash size={16} />
        </IconButton>
      </Box>
    </Paper>
  );
}
