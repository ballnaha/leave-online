'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  useMediaQuery,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Add,
  Trash,
  SearchNormal1,
  Refresh2,
  UserEdit,
  People,
  ArrowDown2,
  TickSquare,
  Shield,
  CloseCircle,
  RotateLeft,
} from 'iconsax-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToastr } from '@/app/components/Toastr';
import type { UserRole } from '@/types/user-role';

interface UserOption {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  position?: string;
  department: string;
  departmentName?: string;
  section?: string;
  sectionName?: string;
  role: UserRole;
  company: string;
  companyName?: string;
  avatar?: string;
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
  departmentId: number;
  departmentCode: string;
  companyCode: string;
}

interface ApprovalFlow {
  id: number;
  level: number;
  approverId: number;
  approver: UserOption;
  isRequired: boolean;
}

const roleLabels: Record<UserRole, string> = {
  employee: 'พนักงาน',
  shift_supervisor: 'หัวหน้ากะ',
  section_head: 'หัวหน้าแผนก',
  dept_manager: 'ผจก.ฝ่าย',
  hr_manager: 'ผจก.HR',
  admin: 'Admin',
  hr: 'HR',
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
    success: { main: theme.palette.success.main, light: alpha(theme.palette.success.main, 0.1) },
    warning: { main: theme.palette.warning.main, light: alpha(theme.palette.warning.main, 0.1) },
    error: { main: theme.palette.error.main, light: alpha(theme.palette.error.main, 0.1) },
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
          <TableCell><Skeleton variant="circular" width={40} height={40} /></TableCell>
          <TableCell><Skeleton variant="text" width={150} /></TableCell>
          <TableCell><Skeleton variant="text" width={100} /></TableCell>
          <TableCell><Skeleton variant="text" width={80} /></TableCell>
          <TableCell align="center"><Skeleton variant="rounded" width={60} height={24} /></TableCell>
          <TableCell align="right">
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Skeleton variant="circular" width={36} height={36} />
            </Box>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export default function UserApprovalFlowPage() {
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('md'));
  const toastr = useToastr();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [allApprovers, setAllApprovers] = useState<UserOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Role Tab
  const [roleTab, setRoleTab] = useState<number>(0);
  const roleTabs: { label: string; roles: UserRole[] }[] = [
    { label: 'ทั้งหมด', roles: [] },
    { label: 'พนักงาน', roles: ['employee'] },
    { label: 'หัวหน้ากะ', roles: ['shift_supervisor'] },
    { label: 'หัวหน้าแผนก', roles: ['section_head'] },
    { label: 'ผจก.ฝ่าย', roles: ['dept_manager'] },
    { label: 'HR', roles: ['hr', 'hr_manager'] },
    { label: 'Admin', roles: ['admin'] },
  ];

  // Filters
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  // Master data for filters
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [approvalFlows, setApprovalFlows] = useState<ApprovalFlow[]>([]);
  const [addApproverDialogOpen, setAddApproverDialogOpen] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState<UserOption | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserOption | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Track users with custom flows
  const [usersWithFlows, setUsersWithFlows] = useState<Set<number>>(new Set());

  const [error, setError] = useState('');

  const fetchMasterData = async () => {
    try {
      const [companiesRes, departmentsRes, sectionsRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/departments'),
        fetch('/api/sections'),
      ]);

      if (companiesRes.ok) {
        const data = await companiesRes.json();
        setCompanies(data);
      } else {
        console.error('Failed to fetch companies');
      }
      if (departmentsRes.ok) {
        const data = await departmentsRes.json();
        setDepartments(data);
      } else {
        console.error('Failed to fetch departments');
      }
      if (sectionsRes.ok) {
        const data = await sectionsRes.json();
        setSections(data);
      } else {
        console.error('Failed to fetch sections');
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      // ดึงข้อมูลพนักงานทุกคน
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch approvers');
      const data = await response.json();
      // Filter to users who can be approvers
      setAllApprovers(data.filter((u: UserOption) => u.role !== 'employee'));
    } catch (error) {
      console.error('Error fetching approvers:', error);
    }
  };

  const fetchAllUsersFlows = useCallback(async () => {
    try {
      // Fetch flows for each user to determine who has custom flows
      const flowSet = new Set<number>();
      for (const user of users) {
        const response = await fetch(`/api/user-approval-flow?userId=${user.id}`);
        if (!response.ok) continue;
        const flows = await response.json();
        // Has custom flow if there are flows other than HR (level 99)
        const customFlows = flows.filter((f: ApprovalFlow) => f.level !== 99);
        if (customFlows.length > 0) {
          flowSet.add(user.id);
        }
      }
      setUsersWithFlows(flowSet);
    } catch (error) {
      console.error('Error fetching users flows:', error);
    }
  }, [users]);

  const fetchUserFlow = useCallback(async (userId: number) => {
    try {
      const response = await fetch(`/api/user-approval-flow?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user flow');
      const data = await response.json();
      setApprovalFlows(data.filter((f: ApprovalFlow) => f.level !== 99));
    } catch (error) {
      console.error('Error fetching user flow:', error);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
    fetchUsers();
    fetchApprovers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      fetchAllUsersFlows();
    }
  }, [users, fetchAllUsersFlows]);

  const handleOpenDialog = (user: UserOption) => {
    setSelectedUser(user);
    setDialogOpen(true);
    setError('');
    fetchUserFlow(user.id);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedUser(null);
    setApprovalFlows([]);
    setError('');
  };

  const handleAddApprover = () => {
    if (!selectedApprover) return;

    if (approvalFlows.some(f => f.approverId === selectedApprover.id)) {
      setError('ผู้อนุมัตินี้มีอยู่ใน flow แล้ว');
      return;
    }

    const newLevel = approvalFlows.length > 0
      ? Math.max(...approvalFlows.map(f => f.level)) + 1
      : 1;

    setApprovalFlows([
      ...approvalFlows,
      {
        id: Date.now(),
        level: newLevel,
        approverId: selectedApprover.id,
        approver: selectedApprover,
        isRequired: true,
      },
    ]);

    setSelectedApprover(null);
    setAddApproverDialogOpen(false);
    setError('');
  };

  const handleRemoveApprover = (level: number) => {
    setApprovalFlows(approvalFlows.filter(f => f.level !== level));
  };

  const handleSaveFlow = async () => {
    if (!selectedUser) return;

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/user-approval-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          flows: approvalFlows.map((f, idx) => ({
            level: idx + 1,
            approverId: f.approverId,
            isRequired: f.isRequired,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'เกิดข้อผิดพลาด' }));
        setError(data.error || 'เกิดข้อผิดพลาด');
        return;
      }

      toastr.success('บันทึก Flow สำเร็จ');
      handleCloseDialog();
      fetchUsers();
      fetchAllUsersFlows();
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteDialog = (user: UserOption) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteFlow = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/user-approval-flow?userId=${userToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toastr.success('ลบ Flow สำเร็จ รีเซ็ตเป็น Default Workflow แล้ว');
        setUsersWithFlows((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userToDelete.id);
          return newSet;
        });
      } else {
        const data = await response.json().catch(() => ({ error: 'เกิดข้อผิดพลาดในการลบ' }));
        toastr.error(data.error || 'เกิดข้อผิดพลาดในการลบ');
      }
    } catch (error) {
      toastr.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  // Handle cascading filter changes
  const handleCompanyChange = (value: string) => {
    setCompanyFilter(value);
    setDepartmentFilter('all');
    setSectionFilter('all');
  };

  const handleDepartmentChange = (value: string) => {
    setDepartmentFilter(value);
    setSectionFilter('all');
  };

  // Get filtered departments based on selected company
  const filteredDepartments = companyFilter === 'all'
    ? departments
    : departments.filter(d => d.company === companyFilter);

  // Get filtered sections based on selected company and department
  const filteredSections = (() => {
    let filtered = sections;

    // Filter by company first
    if (companyFilter !== 'all') {
      filtered = filtered.filter(s => s.companyCode === companyFilter);
    }

    // Then filter by department
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(s => s.departmentCode === departmentFilter);
    }

    return filtered;
  })();

  // Filter users by role tab first, then other filters
  const filteredUsers = users.filter((user) => {
    // Filter by role tab
    const currentRoleTab = roleTabs[roleTab];
    const matchesRole = currentRoleTab.roles.length === 0 || currentRoleTab.roles.includes(user.role);
    if (!matchesRole) return false;

    const matchesSearch =
      user.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCompany = companyFilter === 'all' || user.company === companyFilter;
    const matchesDepartment = departmentFilter === 'all' || user.department === departmentFilter;
    const matchesSection = sectionFilter === 'all' || user.section === sectionFilter;

    return matchesSearch && matchesCompany && matchesDepartment && matchesSection;
  });

  // Paginated users
  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Stats
  const totalUsers = users.length;
  const usersWithCustomFlows = usersWithFlows.size;
  const usersWithDefaultFlow = totalUsers - usersWithCustomFlows;

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
              <UserEdit size={24} variant="Bold" color="#6C63FF" />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={700}>
                User Approval Flow
              </Typography>
              <Typography variant="body2" color="text.secondary">
                กำหนด Flow อนุมัติเฉพาะบุคคล (Override Workflow)
              </Typography>
            </Box>
          </Box>
        </Box>
        <Tooltip title="รีเฟรชข้อมูล">
          <IconButton
            onClick={() => { fetchUsers(); fetchApprovers(); }}
            disabled={loading}
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
              width: { xs: 44, sm: 'auto' },
              height: { xs: 44, sm: 'auto' },
            }}
          >
            <Refresh2 size={20} color="#6C63FF" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stat Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: { xs: 2, sm: 3 },
          mb: { xs: 3, sm: 4 },
        }}
      >
        <StatCard
          title="พนักงานทั้งหมด"
          value={totalUsers}
          icon={<People size={28} variant="Bold" color="#6C63FF" />}
          color="primary"
        />
        <StatCard
          title="มี Custom Flow"
          value={usersWithCustomFlows}
          icon={<UserEdit size={28} variant="Bold" color="#22C55E" />}
          color="success"
          subtitle="พนักงานที่มี flow พิเศษ"
        />
        <StatCard
          title="ใช้ Default Workflow"
          value={usersWithDefaultFlow}
          icon={<Shield size={28} variant="Bold" color="#F59E0B" />}
          color="warning"
          subtitle="ใช้ flow ตาม ฝ่าย/แผนก"
        />
      </Box>

      {/* Role Tabs */}
      <Paper
        sx={{
          mb: 3,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={roleTab}
          onChange={(_, v) => {
            setRoleTab(v);
            setPage(0);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.02),
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              bgcolor: theme.palette.primary.main,
            },
          }}
        >
          {roleTabs.map((tab, index) => {
            const count = tab.roles.length === 0
              ? users.length
              : users.filter(u => tab.roles.includes(u.role)).length;
            return (
              <Tab
                key={index}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{tab.label}</span>
                    <Chip
                      label={count}
                      size="small"
                      sx={{
                        height: 20,
                        minWidth: 20,
                        bgcolor: roleTab === index ? theme.palette.primary.main : alpha(theme.palette.text.secondary, 0.1),
                        color: roleTab === index ? 'white' : 'text.secondary',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  </Box>
                }
                sx={{
                  textTransform: 'none',
                  fontWeight: roleTab === index ? 600 : 400,
                  color: roleTab === index ? 'primary.main' : 'text.secondary',
                  minHeight: 48,
                }}
              />
            );
          })}
        </Tabs>
      </Paper>

      {/* Search and Filters */}
      <Paper
        sx={{
          p: { xs: 2, sm: 2 },
          mb: 3,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: '2fr 1fr 1fr 1fr auto' },
          gap: 2,
          alignItems: 'center',
        }}
      >
        <TextField
          placeholder="ค้นหาพนักงาน..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          fullWidth
          sx={{
            gridColumn: { xs: '1 / -1', sm: '1 / -1', md: 'auto' },
          }}
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
            onChange={(e) => handleCompanyChange(e.target.value)}
            label="บริษัท"
          >
            <MenuItem value="all">ทั้งหมด</MenuItem>
            {companies.map((company) => (
              <MenuItem key={company.code} value={company.code}>{company.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth>
          <InputLabel>ฝ่าย</InputLabel>
          <Select
            value={departmentFilter}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            label="ฝ่าย"
          >
            <MenuItem value="all">ทั้งหมด</MenuItem>
            {filteredDepartments.map((dept) => (
              <MenuItem key={dept.code} value={dept.code}>{dept.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          size="small"
          fullWidth
          sx={{
            gridColumn: { xs: '1 / -1', sm: '1 / -1', md: 'auto' },
          }}
        >
          <InputLabel>แผนก</InputLabel>
          <Select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            label="แผนก"
          >
            <MenuItem value="all">ทั้งหมด</MenuItem>
            {filteredSections.map((section) => (
              <MenuItem key={section.code} value={section.code}>{section.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Chip
          label={`${filteredUsers.length} รายการ`}
          size="small"
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
            fontWeight: 600,
            gridColumn: { xs: '1 / -1', sm: '1 / -1', md: 'auto' },
            justifySelf: { md: 'end' },
          }}
        />
      </Paper>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 2, borderRadius: 1 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>หมายเหตุ:</strong> หน้านี้ใช้สำหรับกำหนดผู้อนุมัติใบลาเฉพาะบุคคล (Custom Flow)
        </Typography>
        <Typography variant="body2" component="div">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>ถ้าไม่กำหนด Custom Flow → ระบบจะใช้ลำดับการอนุมัติตาม ฝ่าย/แผนก โดยอัตโนมัติ</li>
            <li><strong>ผจก.ฝ่าย</strong> → ใบลาจะส่งตรงไปหา <strong>HR Manager</strong> เลย (ไม่ต้องตั้ง Custom Flow)</li>
            <li><strong>พนักงาน/หัวหน้ากะ/หัวหน้าแผนก</strong> → ใบลาจะผ่านผู้อนุมัติตามลำดับขั้นที่กำหนดไว้</li>
          </ul>
        </Typography>
      </Alert>

      {/* Mobile/Tablet Card View (Visible on xs, sm, md) */}
      <Box sx={{ display: { xs: 'flex', lg: 'none' }, flexDirection: 'column', gap: 2 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={150} sx={{ borderRadius: 1 }} />
          ))
        ) : filteredUsers.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <UserEdit size={48} color={theme.palette.text.disabled} variant="Bold" />
              <Typography variant="body1" fontWeight={600} color="text.secondary">
                ไม่พบข้อมูลพนักงาน
              </Typography>
            </Box>
          </Paper>
        ) : (
          paginatedUsers.map((user) => {
            const hasFlow = usersWithFlows.has(user.id);
            return (
              <Paper
                key={user.id}
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
                {/* Card Header: User Info */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Avatar
                      src={user.avatar || undefined}
                      sx={{ width: 40, height: 40, bgcolor: theme.palette.primary.main }}
                    >
                      {user.firstName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {user.firstName} {user.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.employeeId} • {user.position || '-'}
                      </Typography>
                    </Box>
                  </Box>
                  {hasFlow && (
                    <Chip
                      label="Custom Flow"
                      size="small"
                      color="primary"
                      variant="filled"
                      sx={{ borderRadius: 1, height: 20, fontSize: '0.65rem' }}
                    />
                  )}
                </Box>

                <Divider sx={{ borderStyle: 'dashed' }} />

                {/* Card Body: Department/Role */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">สังกัด</Typography>
                    <Typography variant="body2" fontWeight={500}>{user.companyName || user.company}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {user.departmentName || user.department} / {user.sectionName || user.section}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">สิทธิ์</Typography>
                    <Chip
                      label={roleLabels[user.role] || user.role}
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: 1, height: 24 }}
                    />
                  </Box>
                </Box>

                {/* Card Footer: Actions */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<UserEdit size={16} color={theme.palette.text.primary} />}
                    onClick={() => handleOpenDialog(user)}
                    sx={{ borderRadius: 1 }}
                  >
                    จัดการ Flow
                  </Button>
                  {hasFlow && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<RotateLeft size={16} color={theme.palette.text.primary} />}
                      onClick={() => handleOpenDeleteDialog(user)}
                      sx={{ borderRadius: 1 }}
                    >
                      Reset
                    </Button>
                  )}
                </Box>
              </Paper>
            );
          })
        )}
      </Box>

      {/* Desktop Table View (Hidden on mobile/tablet) */}
      <TableContainer
        component={Paper}
        sx={{
          display: { xs: 'none', lg: 'block' },
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
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>พนักงาน</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>สังกัด</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>ตำแหน่ง</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>สิทธิ์</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }} align="center">Custom Flow</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }} align="right">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          {loading ? (
            <TableSkeleton />
          ) : filteredUsers.length === 0 ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: alpha(theme.palette.text.secondary, 0.1),
                      }}
                    >
                      <People size={40} color="#64748B" />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600}>
                      ไม่พบข้อมูลพนักงาน
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow
                  key={user.id}
                  sx={{
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                    },
                    '&:last-child td': { border: 0 },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        src={user.avatar || undefined}
                        alt={`${user.firstName} ${user.lastName}`}
                        sx={{ bgcolor: theme.palette.primary.main }}
                      >
                        {user.firstName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {user.firstName} {user.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.employeeId}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {user.departmentName || user.department}
                        {user.sectionName && ` / ${user.sectionName}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {companies.find(c => c.code === user.company)?.name || user.company}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {user.position || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={roleLabels[user.role] || user.role}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.info.main, 0.1),
                        color: theme.palette.info.main,
                        fontWeight: 500,
                        borderRadius: 1,
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {usersWithFlows.has(user.id) ? (
                      <Chip
                        label="Custom"
                        size="small"
                        sx={{
                          fontWeight: 500,
                          borderRadius: 1,
                          bgcolor: alpha(theme.palette.success.main, 0.1),
                          color: 'success.main',
                        }}
                      />
                    ) : (
                      <Chip
                        label="Default"
                        size="small"
                        variant="outlined"
                        sx={{
                          fontWeight: 500,
                          borderRadius: 1,
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title="ตั้งค่า Flow">
                        <IconButton
                          onClick={() => handleOpenDialog(user)}
                          size="medium"
                          sx={{
                            color: 'primary.main',
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.2),
                            },
                          }}
                        >
                          <UserEdit size={18} color="#6C63FF" />
                        </IconButton>
                      </Tooltip>
                      {usersWithFlows.has(user.id) && (
                        <Tooltip title="รีเซ็ตเป็น Default">
                          <IconButton
                            onClick={() => handleOpenDeleteDialog(user)}
                            size="medium"
                            sx={{
                              color: 'error.main',
                              bgcolor: alpha(theme.palette.error.main, 0.1),
                              '&:hover': {
                                bgcolor: alpha(theme.palette.error.main, 0.2),
                              },
                            }}
                          >
                            <RotateLeft size={18} color="#EF4444" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
      </TableContainer>

      {/* Pagination */}
      {filteredUsers.length > 0 && (
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
            count={filteredUsers.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="แสดงต่อหน้า:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
            }
          />
        </Paper>
      )}

      {/* Edit Flow Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreenDialog}
        scroll="paper"
        PaperProps={{
          sx: {
            borderRadius: fullScreenDialog ? 0 : 1,
            maxHeight: fullScreenDialog ? '100%' : '90vh',
          }
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UserEdit size={20} color="#6C63FF" />
            <Typography variant="h6" fontWeight={600}>
              ตั้งค่า Approval Flow
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleCloseDialog}>
            <CloseCircle size={18} color="#64748B" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Selected User Info */}
          {selectedUser && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, flexWrap: 'wrap' }}>
                <Avatar
                  src={selectedUser.avatar}
                  sx={{ width: 48, height: 48, bgcolor: theme.palette.primary.main }}
                >
                  {selectedUser.firstName[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {selectedUser.firstName} {selectedUser.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedUser.employeeId} • {selectedUser.position || selectedUser.department}
                  </Typography>
                </Box>
                <Chip
                  label={roleLabels[selectedUser.role]}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: 500 }}
                />
              </Box>
            </Paper>
          )}

          {/* Approval Flow List */}
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 2 },
              mb: 2,
            }}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              ลำดับผู้อนุมัติ
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add size={16} color="#6C63FF" />}
              onClick={() => setAddApproverDialogOpen(true)}
              fullWidth={fullScreenDialog}
              sx={{ borderRadius: 1, alignSelf: { xs: 'stretch', sm: 'auto' } }}
            >
              เพิ่มผู้อนุมัติ
            </Button>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>{error}</Alert>}

          {approvalFlows.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                textAlign: 'center',
                borderStyle: 'dashed',
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.background.default, 0.5),
              }}
            >
              <People size={40} color={theme.palette.text.disabled} />
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                ยังไม่มีผู้อนุมัติ (ใช้ Default Workflow)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                คลิก &quot;เพิ่มผู้อนุมัติ&quot; เพื่อกำหนด flow พิเศษ
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {approvalFlows.map((flow, idx) => (
                <React.Fragment key={flow.id}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {idx + 1}
                    </Box>
                    <Avatar src={flow.approver.avatar} sx={{ width: 36, height: 36 }}>
                      {flow.approver.firstName[0]}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {flow.approver.firstName} {flow.approver.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {flow.approver.position || flow.approver.department}
                      </Typography>
                    </Box>
                    <Chip
                      label={roleLabels[flow.approver.role]}
                      size="small"
                      sx={{ height: 22, fontSize: '0.7rem', flexShrink: 0 }}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveApprover(flow.level)}
                      sx={{ flexShrink: 0 }}
                    >
                      <Trash size={16} color="#EF4444" />
                    </IconButton>
                  </Paper>

                  {idx < approvalFlows.length - 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <ArrowDown2 size={18} color={theme.palette.text.disabled} />
                    </Box>
                  )}
                </React.Fragment>
              ))}
            </Box>
          )}

          {/* HR Manager (always last) */}
          <Box sx={{ mt: 2 }}>
            {approvalFlows.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                <ArrowDown2 size={18} color={theme.palette.text.disabled} />
              </Box>
            )}
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                borderColor: alpha(theme.palette.warning.main, 0.5),
                bgcolor: alpha(theme.palette.warning.main, 0.04),
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: 'warning.main',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Shield size={14} color="#fff" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  ผู้จัดการ HR (อนุมัติขั้นสุดท้าย)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ถูกเพิ่มอัตโนมัติในทุก flow
                </Typography>
              </Box>
              <Chip label="บังคับ" size="small" color="warning" sx={{ height: 22, fontSize: '0.7rem' }} />
            </Paper>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 1.5 },
            alignItems: { xs: 'stretch', sm: 'center' },
          }}
        >
          <Button onClick={handleCloseDialog} fullWidth={fullScreenDialog} sx={{ borderRadius: 1 }}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveFlow}
            disabled={saving}
            startIcon={<TickSquare size={16} color="#fff" />}
            fullWidth={fullScreenDialog}
            sx={{ borderRadius: 1 }}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Approver Dialog */}
      <Dialog
        open={addApproverDialogOpen}
        onClose={() => setAddApproverDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreenDialog}
        scroll="paper"
        PaperProps={{
          sx: {
            borderRadius: fullScreenDialog ? 0 : 1,
            maxHeight: fullScreenDialog ? '100%' : '90vh',
          }
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add size={20} color="#6C63FF" />
            เพิ่มผู้อนุมัติ
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Autocomplete
            options={allApprovers.filter(a => !approvalFlows.some(f => f.approverId === a.id))}
            getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
            groupBy={(option) => roleLabels[option.role] || option.role}
            renderOption={(props, option) => {
              const { key, ...otherProps } = props;
              return (
                <Box component="li" key={key} {...otherProps} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar src={option.avatar} sx={{ width: 36, height: 36 }}>
                    {option.firstName[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {option.firstName} {option.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.employeeId} • {option.position || option.department}
                    </Typography>
                  </Box>
                </Box>
              );
            }}
            value={selectedApprover}
            onChange={(_, value) => setSelectedApprover(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="เลือกผู้อนุมัติ"
                placeholder="ค้นหา..."
                size="small"
              />
            )}
          />
        </DialogContent>
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 1.5 },
            alignItems: { xs: 'stretch', sm: 'center' },
          }}
        >
          <Button onClick={() => setAddApproverDialogOpen(false)} fullWidth={fullScreenDialog} sx={{ borderRadius: 1 }}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={handleAddApprover}
            disabled={!selectedApprover}
            fullWidth={fullScreenDialog}
            sx={{ borderRadius: 1 }}
          >
            เพิ่ม
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="รีเซ็ต Flow เป็น Default"
        message={
          userToDelete
            ? `ต้องการรีเซ็ต Flow ของ "${userToDelete.firstName} ${userToDelete.lastName}" เป็น Default Workflow หรือไม่?\n\nการดำเนินการนี้จะลบ Custom Flow ที่กำหนดไว้ และใช้ Approval Workflow ตามฝ่าย/แผนกแทน`
            : ''
        }
        confirmText="รีเซ็ต"
        cancelText="ยกเลิก"
        type="warning"
        loading={deleting}
        onConfirm={handleDeleteFlow}
        onClose={() => {
          setDeleteDialogOpen(false);
          setUserToDelete(null);
        }}
      />
    </Box>
  );
}
