'use client';

import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
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
  Tabs,
  Tab,
  Badge,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Add,
  Edit2,
  Trash,
  User,
  SearchNormal1,
  Refresh2,
  TickCircle,
  CloseCircle,
  Building,
  Layer,
  Filter,
  ShieldTick,
  People,
  Eye,
  ArrowDown2,
  Building4,
  RowVertical,
  Hierarchy,
  DocumentUpload,
} from 'iconsax-react';
import UserDialog from './UserDialog';
import UserViewDialog from './UserViewDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToastr } from '@/app/components/Toastr';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

interface UserData {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  gender: string;
  company: string;
  department: string;
  departmentName: string;
  section: string | null;
  sectionName: string | null;
  position: string | null;
  shift: string | null;
  employeeType: string;
  role: string;
  startDate: string;
  isActive: boolean;
  avatar: string | null;
  managedDepartments?: string | null;
  managedSections?: string | null;
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'error' | 'secondary';
  subtitle?: string;
}

const StatCard = memo(function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
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
});
StatCard.displayName = 'StatCard';

// Table Skeleton
function TableSkeleton() {
  return (
    <TableBody>
      {[1, 2, 3, 4, 5].map((row) => (
        <TableRow key={row}>
          <TableCell><Skeleton variant="circular" width={40} height={40} /></TableCell>
          <TableCell><Skeleton variant="text" width={100} /></TableCell>
          <TableCell><Skeleton variant="text" width={150} /></TableCell>
          <TableCell><Skeleton variant="text" width={120} /></TableCell>
          <TableCell><Skeleton variant="text" width={100} /></TableCell>
          <TableCell align="center"><Skeleton variant="rounded" width={80} height={24} /></TableCell>
          <TableCell align="right">
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Skeleton variant="circular" width={36} height={36} />
              <Skeleton variant="circular" width={36} height={36} />
              <Skeleton variant="circular" width={36} height={36} />
            </Box>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export default function UsersPage() {
  const theme = useTheme();
  const toastr = useToastr();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  // Role Tab
  const [roleTab, setRoleTab] = useState<string>('all');

  // Filters
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // View Mode: 'list' (table/card) or 'tree' (accordion)
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // View Dialog State
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewUser, setViewUser] = useState<UserData | null>(null);

  // Departments and Sections for display
  const [departments, setDepartments] = useState<{ code: string; name: string; company: string }[]>([]);
  const [sections, setSections] = useState<{ code: string; name: string; departmentCode: string; departmentName: string }[]>([]);

  const fetchDepartmentsAndSections = async () => {
    try {
      const [deptRes, sectRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/sections'),
      ]);

      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(deptData);
      } else {
        console.error('Failed to fetch departments');
      }

      if (sectRes.ok) {
        const sectData = await sectRes.json();
        setSections(sectData);
      } else {
        console.error('Failed to fetch sections');
      }
    } catch (err) {
      console.error('Error fetching departments/sections:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartmentsAndSections();
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedUser(undefined);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((user: UserData) => {
    setSelectedUser(user);
    setDialogOpen(true);
  }, []);

  const handleView = useCallback((user: UserData) => {
    setViewUser(user);
    setViewDialogOpen(true);
  }, []);

  const handleDelete = useCallback((user: UserData) => {
    setDeleteTarget(user);
    setConfirmOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to delete' }));
        throw new Error(data.error || 'Failed to delete');
      }
      toastr.success('ลบผู้ใช้งานสำเร็จ');
      fetchUsers();
    } catch (err: any) {
      toastr.error(err.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน');
    } finally {
      setDeleteLoading(false);
      setConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleSave = useCallback(() => {
    setDialogOpen(false);
    toastr.success(selectedUser ? 'แก้ไขข้อมูลผู้ใช้งานสำเร็จ' : 'เพิ่มผู้ใช้งานสำเร็จ');
    fetchUsers();
  }, [selectedUser, toastr]);

  // Get unique values for filters - memoized
  const uniqueCompanies = useMemo(() =>
    [...new Set(users.map((u) => u.company))].filter(Boolean), [users]);
  const uniqueDepartments = useMemo(() =>
    [...new Set(users.map((u) => u.department))].filter(Boolean), [users]);

  // Get unique sections (filtered by department if selected) - memoized
  const uniqueSections = useMemo(() => [...new Set(
    users
      .filter((u) => departmentFilter === 'all' || u.department === departmentFilter)
      .map((u) => u.section)
  )].filter(Boolean) as string[], [users, departmentFilter]);

  // Create department code to name map - memoized
  const departmentNameMap = useMemo(() =>
    new Map(users.map((u) => [u.department, u.departmentName])), [users]);

  // Create section code to name map - memoized
  const sectionNameMap = useMemo(() =>
    new Map(users.map((u) => [u.section, u.sectionName])), [users]);

  // Role tabs configuration
  const roleTabs = [
    { value: 'all', label: 'ทั้งหมด', color: 'primary' },
    { value: 'employee', label: 'พนักงาน', color: 'default' },
    { value: 'admin', label: 'Admin', color: 'error' },
    { value: 'hr_manager', label: 'HR Manager', color: 'warning' },
    { value: 'hr', label: 'HR', color: 'info' },
    { value: 'dept_manager', label: 'ผจก.ฝ่าย', color: 'success' },
    { value: 'section_head', label: 'หัวหน้าแผนก', color: 'secondary' },
    { value: 'shift_supervisor', label: 'หัวหน้ากะ', color: 'warning' },
  ] as const;

  // Count users by role - memoized
  const roleUserCounts = useMemo(() => ({
    all: users.length,
    employee: users.filter(u => u.role === 'employee').length,
    admin: users.filter(u => u.role === 'admin').length,
    hr_manager: users.filter(u => u.role === 'hr_manager').length,
    hr: users.filter(u => u.role === 'hr').length,
    dept_manager: users.filter(u => u.role === 'dept_manager').length,
    section_head: users.filter(u => u.role === 'section_head').length,
    shift_supervisor: users.filter(u => u.role === 'shift_supervisor').length,
  }), [users]);

  // Filter users (memoized to prevent unnecessary re-renders)
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesCompany = companyFilter === 'all' || user.company === companyFilter;
      const matchesDepartment = departmentFilter === 'all' || user.department === departmentFilter;
      const matchesSection = sectionFilter === 'all' || user.section === sectionFilter;
      const matchesRole = roleTab === 'all' || user.role === roleTab;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.isActive) ||
        (statusFilter === 'inactive' && !user.isActive);

      return matchesSearch && matchesCompany && matchesDepartment && matchesSection && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, companyFilter, departmentFilter, sectionFilter, roleTab, statusFilter]);

  // Paginated users
  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Group filtered users by Company > Department > Section for Tree View
  const groupedData = useMemo(() => {
    const grouped: Map<string, {
      company: string;
      companyName: string;
      departments: Map<string, {
        department: string;
        departmentName: string;
        sections: Map<string | null, {
          section: string | null;
          sectionName: string | null;
          users: UserData[];
        }>;
        usersWithoutSection: UserData[];
      }>;
    }> = new Map();

    filteredUsers.forEach(user => {
      if (!grouped.has(user.company)) {
        grouped.set(user.company, {
          company: user.company,
          companyName: user.company,
          departments: new Map(),
        });
      }
      const companyGroup = grouped.get(user.company)!;

      if (!companyGroup.departments.has(user.department)) {
        companyGroup.departments.set(user.department, {
          department: user.department,
          departmentName: user.departmentName || user.department,
          sections: new Map(),
          usersWithoutSection: [],
        });
      }
      const deptGroup = companyGroup.departments.get(user.department)!;

      // Group by section within department
      if (user.section) {
        if (!deptGroup.sections.has(user.section)) {
          deptGroup.sections.set(user.section, {
            section: user.section,
            sectionName: user.sectionName || user.section,
            users: [],
          });
        }
        deptGroup.sections.get(user.section)!.users.push(user);
      } else {
        deptGroup.usersWithoutSection.push(user);
      }
    });

    // Sort by company then by department then by section
    return Array.from(grouped.values())
      .sort((a, b) => a.company.localeCompare(b.company))
      .map(c => ({
        ...c,
        departments: Array.from(c.departments.values())
          .sort((a, b) => a.departmentName.localeCompare(b.departmentName))
          .map(d => ({
            ...d,
            sections: Array.from(d.sections.values())
              .sort((a, b) => (a.sectionName || '').localeCompare(b.sectionName || '')),
          })),
      }));
  }, [filteredUsers]);

  // Toggle Company expand/collapse
  // Toggle Company expand/collapse - memoized
  const toggleCompany = useCallback((company: string) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(company)) {
        newSet.delete(company);
      } else {
        newSet.add(company);
      }
      return newSet;
    });
  }, []);

  // Toggle Department expand/collapse - memoized
  const toggleDepartment = useCallback((key: string) => {
    setExpandedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  // Toggle Section expand/collapse - memoized
  const toggleSection = useCallback((key: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  // Expand all companies, departments and sections when switching to tree view
  // Only run when viewMode changes, not when groupedData changes
  useEffect(() => {
    if (viewMode === 'tree') {
      // Start with only companies expanded, sections/departments collapsed for better performance
      const companies = new Set(filteredUsers.map(u => u.company));
      setExpandedCompanies(companies);
      setExpandedDepartments(new Set());
      setExpandedSections(new Set());
    }
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle page change - memoized
  const handleChangePage = useCallback((_event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  // Handle rows per page change - memoized
  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, companyFilter, departmentFilter, sectionFilter, roleTab, statusFilter]);

  // Reset section filter when department changes
  useEffect(() => {
    setSectionFilter('all');
  }, [departmentFilter]);

  // Stats - memoized for performance
  const { activeUsers, inactiveUsers, totalUsers, newUsersThisMonth } = useMemo(() => ({
    activeUsers: users.filter((u) => u.isActive).length,
    inactiveUsers: users.filter((u) => !u.isActive).length,
    totalUsers: users.length,
    newUsersThisMonth: users.filter((u) => dayjs(u.startDate).isSame(dayjs(), 'month')).length,
  }), [users]);

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
              <People size={24} color={theme.palette.primary.main} variant="Bold" />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={700}>
                จัดการผู้ใช้งาน
              </Typography>
              <Typography variant="body2" color="text.secondary">
                เพิ่ม แก้ไข และจัดการข้อมูลพนักงานในระบบ
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<DocumentUpload size={18} color={theme.palette.primary.main} />}
            onClick={() => window.location.href = '/admin/users/import'}
            sx={{
              borderRadius: 1,
              px: 3,
              py: 1.25,
            }}
          >
            นำเข้า Excel
          </Button>
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
            เพิ่มผู้ใช้งาน
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 3 }}>
        <StatCard
          title="พนักงานทั้งหมด"
          value={totalUsers}
          icon={<People size={26} color={theme.palette.primary.main} variant="Bold" />}
          color="primary"
          subtitle="ในระบบ"
        />
        <StatCard
          title="พนักงานใหม่"
          value={newUsersThisMonth}
          icon={<User size={26} color={theme.palette.success.main} variant="Bold" />}
          color="success"
          subtitle="เดือนนี้"
        />
        <StatCard
          title="เปิดใช้งาน"
          value={activeUsers}
          icon={<TickCircle size={26} color={theme.palette.warning.main} variant="Bold" />}
          color="warning"
          subtitle="Active Users"
        />
        <StatCard
          title="ปิดใช้งาน"
          value={inactiveUsers}
          icon={<CloseCircle size={26} color={theme.palette.secondary.main} variant="Bold" />}
          color="secondary"
          subtitle="Inactive Users"
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
          onChange={(_e, newValue) => setRoleTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            bgcolor: alpha(theme.palette.background.default, 0.5),
            '& .MuiTab-root': {
              minHeight: 56,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.875rem',
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          {roleTabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tab.label}
                  <Chip
                    label={roleUserCounts[tab.value as keyof typeof roleUserCounts]}
                    size="small"
                    sx={{
                      height: 22,
                      minWidth: 28,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      bgcolor: roleTab === tab.value
                        ? alpha(theme.palette.primary.main, 0.15)
                        : alpha(theme.palette.text.secondary, 0.1),
                      color: roleTab === tab.value
                        ? 'primary.main'
                        : 'text.secondary',
                    }}
                  />
                </Box>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {/* Search & Filters */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
        }}
      >
        {/* Row 1: Search + Company + Department */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: '2fr 1fr 1fr' },
          gap: 1.5,
          alignItems: 'center',
          mb: { xs: 1.5, md: 1.5 }
        }}>
          <TextField
            placeholder="ค้นหาชื่อ, รหัสพนักงาน..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              gridColumn: { xs: '1 / -1', sm: '1 / -1', md: 'auto' },
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

          {/* Company Filter */}
          <FormControl size="small" fullWidth>
            <InputLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Building size={16} color={theme.palette.text.secondary} />
                บริษัท
              </Box>
            </InputLabel>
            <Select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              label="บริษัท"
              sx={{ borderRadius: 1 }}
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
          <FormControl size="small" fullWidth>
            <InputLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Layer size={16} color={theme.palette.text.secondary} />
                ฝ่าย
              </Box>
            </InputLabel>
            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              label="ฝ่าย"
              sx={{ borderRadius: 1 }}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              {uniqueDepartments.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {departmentNameMap.get(dept) || dept}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Row 2: Section + Status + Count + Refresh */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(2, 1fr)', md: '1fr 1fr auto auto' },
          gap: 1.5,
          alignItems: 'center'
        }}>
          {/* Section Filter */}
          <FormControl size="small" fullWidth>
            <InputLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Layer size={16} color={theme.palette.text.secondary} />
                แผนก
              </Box>
            </InputLabel>
            <Select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              label="แผนก"
              sx={{ borderRadius: 1 }}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              {uniqueSections.map((section) => (
                <MenuItem key={section} value={section}>
                  {sectionNameMap.get(section) || section}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Status Filter */}
          <FormControl size="small" fullWidth>
            <InputLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Filter size={16} color={theme.palette.text.secondary} />
                สถานะ
              </Box>
            </InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="สถานะ"
              sx={{ borderRadius: 1 }}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              <MenuItem value="active">เปิดใช้งาน</MenuItem>
              <MenuItem value="inactive">ปิดใช้งาน</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            gridColumn: { xs: '1 / -1', md: 'auto' },
            justifyContent: { xs: 'flex-end', md: 'flex-start' }
          }}>
            {/* View Mode Toggle */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_e, v) => v && setViewMode(v)}
              size="small"
              sx={{
                display: { xs: 'none', md: 'flex' },
                '& .MuiToggleButton-root': {
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                  },
                },
              }}
            >
              <ToggleButton value="list">
                <Tooltip title="รายการ">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <RowVertical size={18} color={viewMode === 'list' ? theme.palette.primary.main : theme.palette.text.secondary} />
                  </Box>
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="tree">
                <Tooltip title="โครงสร้าง">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Hierarchy size={18} color={viewMode === 'tree' ? theme.palette.primary.main : theme.palette.text.secondary} />
                  </Box>
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            <Chip
              label={`${filteredUsers.length} รายการ`}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                fontWeight: 600,
              }}
            />
            <Tooltip title="รีเฟรชข้อมูล">
              <IconButton
                onClick={fetchUsers}
                disabled={loading}
                size="small"
                sx={{
                  bgcolor: 'background.default',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                }}
              >
                <Refresh2
                  size={20}
                  color={theme.palette.text.secondary}
                  style={{
                    transition: 'transform 0.3s ease',
                    transform: loading ? 'rotate(360deg)' : 'rotate(0deg)',
                  }}
                />
              </IconButton>
            </Tooltip>
          </Box>
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

      {/* Tree View (Table Row Group) - แสดงเมื่อ viewMode === 'tree' */}
      {viewMode === 'tree' && (
        <Box>
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={150} sx={{ borderRadius: 1 }} />
              ))}
            </Box>
          ) : filteredUsers.length === 0 ? (
            <Paper
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <People size={64} color={theme.palette.text.disabled} variant="Bulk" />
              <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                ไม่พบข้อมูลผู้ใช้งาน
              </Typography>
            </Paper>
          ) : (
            <>
              {/* Desktop Table with Row Grouping */}
              <TableContainer
                component={Paper}
                sx={{
                  display: { xs: 'none', md: 'block' },
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 'none',
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', color: 'text.secondary', width: 40 }} />
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', color: 'text.secondary' }}>พนักงาน</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', color: 'text.secondary' }}>แผนก</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', color: 'text.secondary' }}>ตำแหน่ง</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', color: 'text.secondary' }}>สิทธิ์</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', color: 'text.secondary' }} align="center">สถานะ</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', color: 'text.secondary' }} align="right">จัดการ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groupedData.map((companyGroup, companyIndex) => {
                      const isCompanyExpanded = expandedCompanies.has(companyGroup.company);
                      const companyUserCount = companyGroup.departments.reduce((sum, d) =>
                        sum + d.sections.reduce((s, sec) => s + sec.users.length, 0) + d.usersWithoutSection.length, 0);
                      // สลับสีพื้นหลังบริษัท
                      const companyBgColor = companyGroup.company === 'PSC'
                        ? '#EEF2FF'
                        : companyIndex % 2 === 0 ? '#FFF7ED' : '#F0FDF4';

                      return (
                        <React.Fragment key={companyGroup.company}>
                          {/* Company Header Row */}
                          <TableRow
                            onClick={() => toggleCompany(companyGroup.company)}
                            sx={{
                              cursor: 'pointer',
                              bgcolor: companyBgColor,
                              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                            }}
                          >
                            <TableCell sx={{ py: 1.5 }}>
                              <IconButton size="small" sx={{ p: 0.5 }}>
                                <ArrowDown2
                                  size={18}
                                  color={theme.palette.primary.main}
                                  style={{
                                    transform: isCompanyExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                    transition: 'transform 0.2s ease',
                                  }}
                                />
                              </IconButton>
                            </TableCell>
                            <TableCell colSpan={6} sx={{ py: 1.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Building size={22} color={theme.palette.primary.main} variant="Bold" />
                                <Typography fontWeight={700} color="primary.main">
                                  {companyGroup.companyName}
                                </Typography>
                                <Chip
                                  label={`${companyUserCount} คน`}
                                  size="small"
                                  sx={{
                                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                                    color: theme.palette.primary.main,
                                    fontWeight: 600,
                                    height: 24,
                                  }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                  ({companyGroup.departments.length} ฝ่าย)
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>

                          {/* Department, Section and Users - แสดงเมื่อ Company expanded */}
                          {isCompanyExpanded && companyGroup.departments.map((deptGroup, deptIndex) => {
                            const isDeptExpanded = expandedDepartments.has(`${companyGroup.company}-${deptGroup.department}`);
                            const deptUserCount = deptGroup.sections.reduce((sum, sec) => sum + sec.users.length, 0) + deptGroup.usersWithoutSection.length;
                            // สลับสีพื้นหลังฝ่าย
                            const deptBgColor = deptIndex % 2 === 0
                              ? alpha(theme.palette.info.main, 0.04)
                              : alpha(theme.palette.secondary.main, 0.04);

                            return (
                              <React.Fragment key={`${companyGroup.company}-${deptGroup.department}`}>
                                {/* Department Header Row */}
                                <TableRow
                                  onClick={() => toggleDepartment(`${companyGroup.company}-${deptGroup.department}`)}
                                  sx={{
                                    cursor: 'pointer',
                                    bgcolor: deptBgColor,
                                    '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.1) },
                                  }}
                                >
                                  <TableCell sx={{ py: 1, pl: 3 }}>
                                    <IconButton size="small" sx={{ p: 0.25 }}>
                                      <ArrowDown2
                                        size={16}
                                        color={theme.palette.text.secondary}
                                        style={{
                                          transform: isDeptExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                          transition: 'transform 0.2s ease',
                                        }}
                                      />
                                    </IconButton>
                                  </TableCell>
                                  <TableCell colSpan={6} sx={{ py: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1 }}>
                                      <Building4 size={18} color={theme.palette.info.main} />
                                      <Typography fontWeight={600} color="text.primary" fontSize="0.875rem">
                                        {deptGroup.departmentName}
                                      </Typography>
                                      <Chip
                                        label={`${deptUserCount} คน`}
                                        size="small"
                                        sx={{
                                          bgcolor: alpha(theme.palette.info.main, 0.1),
                                          color: theme.palette.info.main,
                                          fontWeight: 600,
                                          height: 22,
                                          fontSize: '0.7rem',
                                        }}
                                      />
                                      {deptGroup.sections.length > 0 && (
                                        <Typography variant="caption" color="text.secondary">
                                          ({deptGroup.sections.length} แผนก)
                                        </Typography>
                                      )}
                                    </Box>
                                  </TableCell>
                                </TableRow>

                                {/* Section and Users - แสดงเมื่อ Department expanded */}
                                {isDeptExpanded && (
                                  <>
                                    {/* Sections with users */}
                                    {deptGroup.sections.map((sectionGroup, sectionIndex) => {
                                      const isSectionExpanded = expandedSections.has(`${companyGroup.company}-${deptGroup.department}-${sectionGroup.section}`);
                                      const sectionBgColor = sectionIndex % 2 === 0
                                        ? alpha(theme.palette.warning.main, 0.04)
                                        : alpha(theme.palette.success.main, 0.04);

                                      return (
                                        <React.Fragment key={`${companyGroup.company}-${deptGroup.department}-${sectionGroup.section}`}>
                                          {/* Section Header Row */}
                                          <TableRow
                                            onClick={() => toggleSection(`${companyGroup.company}-${deptGroup.department}-${sectionGroup.section}`)}
                                            sx={{
                                              cursor: 'pointer',
                                              bgcolor: sectionBgColor,
                                              '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.1) },
                                            }}
                                          >
                                            <TableCell sx={{ py: 0.75, pl: 5 }}>
                                              <IconButton size="small" sx={{ p: 0.25 }}>
                                                <ArrowDown2
                                                  size={14}
                                                  color={theme.palette.warning.dark}
                                                  style={{
                                                    transform: isSectionExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                                    transition: 'transform 0.2s ease',
                                                  }}
                                                />
                                              </IconButton>
                                            </TableCell>
                                            <TableCell colSpan={6} sx={{ py: 0.75 }}>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 2 }}>
                                                <Layer size={16} color={theme.palette.warning.dark} />
                                                <Typography fontWeight={500} color="text.primary" fontSize="0.8rem">
                                                  {sectionGroup.sectionName}
                                                </Typography>
                                                <Chip
                                                  label={`${sectionGroup.users.length} คน`}
                                                  size="small"
                                                  sx={{
                                                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                                                    color: theme.palette.warning.dark,
                                                    fontWeight: 600,
                                                    height: 20,
                                                    fontSize: '0.65rem',
                                                  }}
                                                />
                                              </Box>
                                            </TableCell>
                                          </TableRow>

                                          {/* User Rows within Section */}
                                          {isSectionExpanded && sectionGroup.users.map(user => (
                                            <TableRow
                                              key={user.id}
                                              hover
                                              sx={{
                                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                              }}
                                            >
                                              <TableCell />
                                              <TableCell sx={{ pl: 6 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                  <Avatar
                                                    src={user.avatar || undefined}
                                                    sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, fontSize: '0.875rem' }}
                                                  >
                                                    {user.firstName.charAt(0)}
                                                  </Avatar>
                                                  <Box>
                                                    <Typography variant="body2" fontWeight={600}>
                                                      {user.firstName} {user.lastName}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                      {user.employeeId}
                                                    </Typography>
                                                  </Box>
                                                </Box>
                                              </TableCell>
                                              <TableCell>
                                                <Typography variant="body2" fontSize="0.8rem" color="text.secondary">
                                                  -
                                                </Typography>
                                              </TableCell>
                                              <TableCell>
                                                <Typography variant="body2" fontSize="0.8rem">
                                                  {user.position || '-'}
                                                </Typography>
                                              </TableCell>
                                              <TableCell>
                                                <Chip
                                                  label={user.role}
                                                  size="small"
                                                  sx={{
                                                    bgcolor: alpha(theme.palette.info.main, 0.1),
                                                    color: theme.palette.info.main,
                                                    fontWeight: 500,
                                                    borderRadius: 1,
                                                    textTransform: 'capitalize',
                                                    height: 22,
                                                    fontSize: '0.7rem',
                                                  }}
                                                />
                                              </TableCell>
                                              <TableCell align="center">
                                                <Chip
                                                  icon={user.isActive
                                                    ? <TickCircle size={12} color={theme.palette.success.main} variant="Bold" />
                                                    : <CloseCircle size={12} color={theme.palette.text.secondary} variant="Bold" />
                                                  }
                                                  label={user.isActive ? 'Active' : 'Inactive'}
                                                  size="small"
                                                  sx={{
                                                    fontWeight: 500,
                                                    bgcolor: user.isActive
                                                      ? alpha(theme.palette.success.main, 0.1)
                                                      : alpha(theme.palette.text.secondary, 0.1),
                                                    color: user.isActive
                                                      ? theme.palette.success.main
                                                      : 'text.secondary',
                                                    '& .MuiChip-icon': { color: 'inherit' },
                                                    height: 22,
                                                    fontSize: '0.7rem',
                                                  }}
                                                />
                                              </TableCell>
                                              <TableCell align="right">
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                                  <Tooltip title="ดูรายละเอียด">
                                                    <IconButton
                                                      onClick={(e) => { e.stopPropagation(); handleView(user); }}
                                                      size="small"
                                                      sx={{
                                                        color: 'info.main',
                                                        bgcolor: alpha(theme.palette.info.main, 0.1),
                                                        '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.2) },
                                                      }}
                                                    >
                                                      <Eye size={14} color={theme.palette.info.main} />
                                                    </IconButton>
                                                  </Tooltip>
                                                  <Tooltip title="แก้ไข">
                                                    <IconButton
                                                      onClick={(e) => { e.stopPropagation(); handleEdit(user); }}
                                                      size="small"
                                                      sx={{
                                                        color: 'primary.main',
                                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                                                      }}
                                                    >
                                                      <Edit2 size={14} color={theme.palette.primary.main} />
                                                    </IconButton>
                                                  </Tooltip>
                                                  <Tooltip title="ลบ">
                                                    <IconButton
                                                      onClick={(e) => { e.stopPropagation(); handleDelete(user); }}
                                                      size="small"
                                                      sx={{
                                                        color: 'error.main',
                                                        bgcolor: alpha(theme.palette.error.main, 0.1),
                                                        '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) },
                                                      }}
                                                    >
                                                      <Trash size={14} color={theme.palette.error.main} />
                                                    </IconButton>
                                                  </Tooltip>
                                                </Box>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </React.Fragment>
                                      );
                                    })}

                                    {/* Users without section (directly under department) */}
                                    {deptGroup.usersWithoutSection.map(user => (
                                      <TableRow
                                        key={user.id}
                                        hover
                                        sx={{
                                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                        }}
                                      >
                                        <TableCell />
                                        <TableCell sx={{ pl: 5 }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar
                                              src={user.avatar || undefined}
                                              sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, fontSize: '0.875rem' }}
                                            >
                                              {user.firstName.charAt(0)}
                                            </Avatar>
                                            <Box>
                                              <Typography variant="body2" fontWeight={600}>
                                                {user.firstName} {user.lastName}
                                              </Typography>
                                              <Typography variant="caption" color="text.secondary">
                                                {user.employeeId}
                                              </Typography>
                                            </Box>
                                          </Box>
                                        </TableCell>
                                        <TableCell>
                                          <Typography variant="body2" fontSize="0.8rem" color="text.secondary">
                                            -
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Typography variant="body2" fontSize="0.8rem">
                                            {user.position || '-'}
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Chip
                                            label={user.role}
                                            size="small"
                                            sx={{
                                              bgcolor: alpha(theme.palette.info.main, 0.1),
                                              color: theme.palette.info.main,
                                              fontWeight: 500,
                                              borderRadius: 1,
                                              textTransform: 'capitalize',
                                              height: 22,
                                              fontSize: '0.7rem',
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell align="center">
                                          <Chip
                                            icon={user.isActive
                                              ? <TickCircle size={12} color={theme.palette.success.main} variant="Bold" />
                                              : <CloseCircle size={12} color={theme.palette.text.secondary} variant="Bold" />
                                            }
                                            label={user.isActive ? 'Active' : 'Inactive'}
                                            size="small"
                                            sx={{
                                              fontWeight: 500,
                                              bgcolor: user.isActive
                                                ? alpha(theme.palette.success.main, 0.1)
                                                : alpha(theme.palette.text.secondary, 0.1),
                                              color: user.isActive
                                                ? theme.palette.success.main
                                                : 'text.secondary',
                                              '& .MuiChip-icon': { color: 'inherit' },
                                              height: 22,
                                              fontSize: '0.7rem',
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell align="right">
                                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                            <Tooltip title="ดูรายละเอียด">
                                              <IconButton
                                                onClick={(e) => { e.stopPropagation(); handleView(user); }}
                                                size="small"
                                                sx={{
                                                  color: 'info.main',
                                                  bgcolor: alpha(theme.palette.info.main, 0.1),
                                                  '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.2) },
                                                }}
                                              >
                                                <Eye size={14} color={theme.palette.info.main} />
                                              </IconButton>
                                            </Tooltip>
                                            <Tooltip title="แก้ไข">
                                              <IconButton
                                                onClick={(e) => { e.stopPropagation(); handleEdit(user); }}
                                                size="small"
                                                sx={{
                                                  color: 'primary.main',
                                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                                                }}
                                              >
                                                <Edit2 size={14} color={theme.palette.primary.main} />
                                              </IconButton>
                                            </Tooltip>
                                            <Tooltip title="ลบ">
                                              <IconButton
                                                onClick={(e) => { e.stopPropagation(); handleDelete(user); }}
                                                size="small"
                                                sx={{
                                                  color: 'error.main',
                                                  bgcolor: alpha(theme.palette.error.main, 0.1),
                                                  '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) },
                                                }}
                                              >
                                                <Trash size={14} color={theme.palette.error.main} />
                                              </IconButton>
                                            </Tooltip>
                                          </Box>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Mobile Card View for Tree Mode */}
              <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                {groupedData.map((companyGroup, companyIndex) => {
                  const isCompanyExpanded = expandedCompanies.has(companyGroup.company);
                  const companyUserCount = companyGroup.departments.reduce((sum, d) =>
                    sum + d.sections.reduce((s, sec) => s + sec.users.length, 0) + d.usersWithoutSection.length, 0);
                  const companyBgColor = companyGroup.company === 'PSC'
                    ? '#EEF2FF'
                    : companyIndex % 2 === 0 ? '#FFF7ED' : '#F0FDF4';

                  return (
                    <Paper
                      key={companyGroup.company}
                      elevation={0}
                      sx={{
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Company Header */}
                      <Box
                        onClick={() => toggleCompany(companyGroup.company)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.5,
                          bgcolor: companyBgColor,
                          cursor: 'pointer',
                        }}
                      >
                        <ArrowDown2
                          size={18}
                          color={theme.palette.primary.main}
                          style={{
                            transform: isCompanyExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                        <Building size={20} color={theme.palette.primary.main} variant="Bold" />
                        <Typography fontWeight={700} color="primary.main" sx={{ flex: 1 }} fontSize="0.9rem">
                          {companyGroup.companyName}
                        </Typography>
                        <Chip
                          label={`${companyUserCount} คน`}
                          size="small"
                          sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.15),
                            color: theme.palette.primary.main,
                            fontWeight: 600,
                            height: 22,
                            fontSize: '0.7rem',
                          }}
                        />
                      </Box>

                      {/* Departments */}
                      {isCompanyExpanded && companyGroup.departments.map((deptGroup, deptIndex) => {
                        const isDeptExpanded = expandedDepartments.has(`${companyGroup.company}-${deptGroup.department}`);
                        const deptUserCount = deptGroup.sections.reduce((sum, sec) => sum + sec.users.length, 0) + deptGroup.usersWithoutSection.length;
                        const deptBgColor = deptIndex % 2 === 0
                          ? alpha(theme.palette.info.main, 0.04)
                          : alpha(theme.palette.secondary.main, 0.04);

                        return (
                          <Box key={`${companyGroup.company}-${deptGroup.department}`}>
                            {/* Department Header */}
                            <Box
                              onClick={() => toggleDepartment(`${companyGroup.company}-${deptGroup.department}`)}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                py: 1,
                                px: 1.5,
                                pl: 3,
                                bgcolor: deptBgColor,
                                borderTop: '1px solid',
                                borderColor: 'divider',
                                cursor: 'pointer',
                              }}
                            >
                              <ArrowDown2
                                size={16}
                                color={theme.palette.text.secondary}
                                style={{
                                  transform: isDeptExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                  transition: 'transform 0.2s ease',
                                }}
                              />
                              <Building4 size={16} color={theme.palette.info.main} />
                              <Typography fontWeight={600} fontSize="0.85rem" sx={{ flex: 1 }}>
                                {deptGroup.departmentName}
                              </Typography>
                              <Chip
                                label={`${deptUserCount}`}
                                size="small"
                                sx={{
                                  bgcolor: alpha(theme.palette.info.main, 0.1),
                                  color: theme.palette.info.main,
                                  fontWeight: 600,
                                  height: 20,
                                  fontSize: '0.65rem',
                                  minWidth: 28,
                                }}
                              />
                            </Box>

                            {/* Sections and Users */}
                            {isDeptExpanded && (
                              <>
                                {/* Sections with users */}
                                {deptGroup.sections.map((sectionGroup, sectionIndex) => {
                                  const isSectionExpanded = expandedSections.has(`${companyGroup.company}-${deptGroup.department}-${sectionGroup.section}`);
                                  const sectionBgColor = sectionIndex % 2 === 0
                                    ? alpha(theme.palette.warning.main, 0.04)
                                    : alpha(theme.palette.success.main, 0.04);

                                  return (
                                    <Box key={`${companyGroup.company}-${deptGroup.department}-${sectionGroup.section}`}>
                                      {/* Section Header */}
                                      <Box
                                        onClick={() => toggleSection(`${companyGroup.company}-${deptGroup.department}-${sectionGroup.section}`)}
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 1,
                                          py: 0.75,
                                          px: 1.5,
                                          pl: 5,
                                          bgcolor: sectionBgColor,
                                          borderTop: '1px solid',
                                          borderColor: alpha(theme.palette.divider, 0.5),
                                          cursor: 'pointer',
                                        }}
                                      >
                                        <ArrowDown2
                                          size={14}
                                          color={theme.palette.warning.dark}
                                          style={{
                                            transform: isSectionExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                            transition: 'transform 0.2s ease',
                                          }}
                                        />
                                        <Layer size={14} color={theme.palette.warning.dark} />
                                        <Typography fontWeight={500} fontSize="0.8rem" sx={{ flex: 1 }}>
                                          {sectionGroup.sectionName}
                                        </Typography>
                                        <Chip
                                          label={`${sectionGroup.users.length}`}
                                          size="small"
                                          sx={{
                                            bgcolor: alpha(theme.palette.warning.main, 0.1),
                                            color: theme.palette.warning.dark,
                                            fontWeight: 600,
                                            height: 18,
                                            fontSize: '0.6rem',
                                            minWidth: 24,
                                          }}
                                        />
                                      </Box>

                                      {/* Users in Section */}
                                      {isSectionExpanded && (
                                        <Box sx={{ px: 1.5, py: 0.5, bgcolor: 'background.paper' }}>
                                          {sectionGroup.users.map(user => (
                                            <Box
                                              key={user.id}
                                              sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                py: 0.75,
                                                pl: 4,
                                                borderBottom: '1px solid',
                                                borderColor: alpha(theme.palette.divider, 0.3),
                                                '&:last-child': { borderBottom: 'none' },
                                              }}
                                            >
                                              <Avatar
                                                src={user.avatar || undefined}
                                                sx={{ width: 28, height: 28, bgcolor: theme.palette.primary.main, fontSize: '0.7rem' }}
                                              >
                                                {user.firstName.charAt(0)}
                                              </Avatar>
                                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={600} noWrap fontSize="0.8rem">
                                                  {user.firstName} {user.lastName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap fontSize="0.65rem">
                                                  {user.employeeId} • {user.position || user.role}
                                                </Typography>
                                              </Box>
                                              <Box sx={{ display: 'flex', gap: 0.25 }}>
                                                <IconButton
                                                  onClick={() => handleView(user)}
                                                  size="small"
                                                  sx={{ p: 0.25, color: 'info.main' }}
                                                >
                                                  <Eye size={14} />
                                                </IconButton>
                                                <IconButton
                                                  onClick={() => handleEdit(user)}
                                                  size="small"
                                                  sx={{ p: 0.25, color: 'primary.main' }}
                                                >
                                                  <Edit2 size={14} />
                                                </IconButton>
                                              </Box>
                                            </Box>
                                          ))}
                                        </Box>
                                      )}
                                    </Box>
                                  );
                                })}

                                {/* Users without section (directly under department) */}
                                {deptGroup.usersWithoutSection.length > 0 && (
                                  <Box sx={{ px: 1.5, py: 0.5, bgcolor: 'background.paper' }}>
                                    {deptGroup.usersWithoutSection.map(user => (
                                      <Box
                                        key={user.id}
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 1.5,
                                          py: 0.75,
                                          pl: 3,
                                          borderBottom: '1px solid',
                                          borderColor: alpha(theme.palette.divider, 0.3),
                                          '&:last-child': { borderBottom: 'none' },
                                        }}
                                      >
                                        <Avatar
                                          src={user.avatar || undefined}
                                          sx={{ width: 28, height: 28, bgcolor: theme.palette.primary.main, fontSize: '0.7rem' }}
                                        >
                                          {user.firstName.charAt(0)}
                                        </Avatar>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                          <Typography variant="body2" fontWeight={600} noWrap fontSize="0.8rem">
                                            {user.firstName} {user.lastName}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" noWrap fontSize="0.65rem">
                                            {user.employeeId} • {user.position || user.role}
                                          </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 0.25 }}>
                                          <IconButton
                                            onClick={() => handleView(user)}
                                            size="small"
                                            sx={{ p: 0.25, color: 'info.main' }}
                                          >
                                            <Eye size={14} />
                                          </IconButton>
                                          <IconButton
                                            onClick={() => handleEdit(user)}
                                            size="small"
                                            sx={{ p: 0.25, color: 'primary.main' }}
                                          >
                                            <Edit2 size={14} />
                                          </IconButton>
                                        </Box>
                                      </Box>
                                    ))}
                                  </Box>
                                )}
                              </>
                            )}
                          </Box>
                        );
                      })}
                    </Paper>
                  );
                })}
              </Box>
            </>
          )}
        </Box>
      )}
      {/* Mobile Card View (Visible on xs, sm) - แสดงเมื่อ viewMode === 'list' */}
      <Box sx={{ display: viewMode === 'list' ? { xs: 'flex', md: 'none' } : 'none', flexDirection: 'column', gap: 2 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={220} sx={{ borderRadius: 1 }} />
          ))
        ) : filteredUsers.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <People size={48} variant="Bold" color={theme.palette.text.disabled} />
              <Typography variant="body1" fontWeight={600} color="text.secondary">
                {searchQuery ? 'ไม่พบผู้ใช้งานที่ค้นหา' : 'ยังไม่มีข้อมูลผู้ใช้งาน'}
              </Typography>
            </Box>
          </Paper>
        ) : (
          paginatedUsers.map((user) => (
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
              {/* Card Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Avatar
                    src={user.avatar || undefined}
                    alt={`${user.firstName} ${user.lastName}`}
                    sx={{ width: 48, height: 48, bgcolor: theme.palette.primary.main }}
                  >
                    {user.firstName.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {user.firstName} {user.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.employeeId}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  icon={user.isActive
                    ? <TickCircle size={14} color={theme.palette.success.main} variant="Bold" />
                    : <CloseCircle size={14} color={theme.palette.text.secondary} variant="Bold" />
                  }
                  label={user.isActive ? 'Active' : 'Inactive'}
                  size="small"
                  sx={{
                    height: 24,
                    fontWeight: 500,
                    bgcolor: user.isActive
                      ? alpha(theme.palette.success.main, 0.1)
                      : alpha(theme.palette.text.secondary, 0.1),
                    color: user.isActive
                      ? theme.palette.success.main
                      : 'text.secondary',
                    '& .MuiChip-icon': { color: 'inherit' },
                  }}
                />
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              {/* Details */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">สังกัด</Typography>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" fontWeight={600}>{user.departmentName}</Typography>
                    <Typography variant="caption" color="text.secondary">{user.company}</Typography>
                    {user.sectionName && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {user.sectionName}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">ตำแหน่ง</Typography>
                  <Typography variant="body2" fontWeight={600}>{user.position || '-'}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">สิทธิ์การใช้งาน</Typography>
                  <Chip
                    label={user.role}
                    size="small"
                    sx={{
                      height: 24,
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      color: theme.palette.info.main,
                      fontWeight: 500,
                      borderRadius: 1,
                      textTransform: 'capitalize',
                    }}
                  />
                </Box>
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, pt: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  color="info"
                  startIcon={<Eye size={16} color={theme.palette.info.main} />}
                  onClick={() => handleView(user)}
                  sx={{ borderRadius: 1 }}
                >
                  ดูข้อมูล
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Edit2 size={16} color={theme.palette.primary.main} />}
                  onClick={() => handleEdit(user)}
                  sx={{ borderRadius: 1 }}
                >
                  แก้ไข
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<Trash size={16} color={theme.palette.error.main} />}
                  onClick={() => handleDelete(user)}
                  sx={{ borderRadius: 1 }}
                >
                  ลบ
                </Button>
              </Box>
            </Paper>
          ))
        )}
      </Box>

      {/* Table - แสดงเมื่อ viewMode === 'list' */}
      <Fade in={viewMode === 'list'} timeout={500}>
        <TableContainer
          component={Paper}
          sx={{
            display: viewMode === 'list' ? { xs: 'none', md: 'block' } : 'none',
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
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }} align="center">สถานะ</TableCell>
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
                          color: 'text.secondary',
                        }}
                      >
                        <People size={40} color={theme.palette.text.secondary} />
                      </Avatar>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          {searchQuery || companyFilter !== 'all' || departmentFilter !== 'all' || roleTab !== 'all' || statusFilter !== 'all'
                            ? 'ไม่พบผู้ใช้งานที่ค้นหา'
                            : 'ยังไม่มีข้อมูลผู้ใช้งาน'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {searchQuery || companyFilter !== 'all' || departmentFilter !== 'all' || roleTab !== 'all' || statusFilter !== 'all'
                            ? 'ลองค้นหาด้วยคำค้นอื่น หรือเปลี่ยนตัวกรอง'
                            : 'เริ่มต้นใช้งานโดยการเพิ่มผู้ใช้งานใหม่'}
                        </Typography>
                      </Box>
                      {!searchQuery && companyFilter === 'all' && departmentFilter === 'all' && roleTab === 'all' && statusFilter === 'all' && (
                        <Button
                          variant="contained"
                          startIcon={<Add size={18} color="#fff" />}
                          onClick={handleCreate}
                          sx={{ mt: 1, borderRadius: 1 }}
                        >
                          เพิ่มผู้ใช้งานแรก
                        </Button>
                      )}
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
                          {user.departmentName}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            label={user.company}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                          {user.sectionName && (
                            <Typography variant="caption" color="text.secondary">
                              • {user.sectionName}
                            </Typography>
                          )}
                        </Box>
                        {/* แสดงฝ่าย/แผนกที่ดูแลเพิ่มเติม */}
                        {(user.managedDepartments || user.managedSections) && (
                          <Box sx={{ mt: 0.5 }}>
                            {user.managedDepartments && (() => {
                              try {
                                const depts: string[] = JSON.parse(user.managedDepartments);
                                if (depts.length > 0) {
                                  return (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                      <Typography variant="caption" color="warning.main" fontWeight={600}>
                                        เพิ่มเติมฝ่าย:
                                      </Typography>
                                      {depts.map((code) => (
                                        <Chip
                                          key={code}
                                          label={code}
                                          size="small"
                                          color="warning"
                                          variant="outlined"
                                          sx={{ height: 18, fontSize: '0.6rem' }}
                                        />
                                      ))}
                                    </Box>
                                  );
                                }
                              } catch (e) { }
                              return null;
                            })()}
                            {user.managedSections && (() => {
                              try {
                                const sects: string[] = JSON.parse(user.managedSections);
                                if (sects.length > 0) {
                                  return (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
                                      <Typography variant="caption" color="info.main" fontWeight={600}>
                                        แผนก:
                                      </Typography>
                                      {sects.map((code) => (
                                        <Chip
                                          key={code}
                                          label={code}
                                          size="small"
                                          color="info"
                                          variant="outlined"
                                          sx={{ height: 18, fontSize: '0.6rem' }}
                                        />
                                      ))}
                                    </Box>
                                  );
                                }
                              } catch (e) { }
                              return null;
                            })()}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.position || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        size="small"
                        sx={{
                          bgcolor: alpha(theme.palette.info.main, 0.1),
                          color: theme.palette.info.main,
                          fontWeight: 500,
                          borderRadius: 1,
                          textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={user.isActive
                          ? <TickCircle size={14} color={theme.palette.success.main} variant="Bold" />
                          : <CloseCircle size={14} color={theme.palette.text.secondary} variant="Bold" />
                        }
                        label={user.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          fontWeight: 500,
                          bgcolor: user.isActive
                            ? theme.palette.success.light
                            : alpha(theme.palette.text.secondary, 0.1),
                          color: user.isActive
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
                        <Tooltip title="ดูรายละเอียด">
                          <IconButton
                            onClick={() => handleView(user)}
                            size="medium"
                            sx={{
                              color: 'info.main',
                              bgcolor: alpha(theme.palette.info.main, 0.1),
                              '&:hover': {
                                bgcolor: alpha(theme.palette.info.main, 0.2),
                              },
                            }}
                          >
                            <Eye size={18} color={theme.palette.info.main} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="แก้ไข">
                          <IconButton
                            onClick={() => handleEdit(user)}
                            size="medium"
                            sx={{
                              color: 'primary.main',
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                              },
                            }}
                          >
                            <Edit2 size={18} color={theme.palette.primary.main} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ลบ">
                          <IconButton
                            onClick={() => handleDelete(user)}
                            size="medium"
                            sx={{
                              color: 'error.main',
                              bgcolor: alpha(theme.palette.error.main, 0.1),
                              '&:hover': {
                                bgcolor: alpha(theme.palette.error.main, 0.2),
                              },
                            }}
                          >
                            <Trash size={18} color={theme.palette.error.main} />
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

      {/* Pagination - แสดงเมื่อ viewMode === 'list' */}
      {viewMode === 'list' && filteredUsers.length > 0 && (
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

      {/* User Dialog */}
      <UserDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        user={selectedUser}
      />

      {/* User View Dialog */}
      <UserViewDialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setViewUser(null);
        }}
        user={viewUser}
        departments={departments}
        sections={sections}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบผู้ใช้งาน"
        message={`คุณต้องการลบผู้ใช้งาน "${deleteTarget?.firstName} ${deleteTarget?.lastName}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
        type="delete"
        confirmText="ลบ"
        loading={deleteLoading}
      />
    </Box>
  );
}
