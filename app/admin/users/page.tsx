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
  Tabs,
  Tab,
  Badge,
  Divider,
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
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  const handleCreate = () => {
    setSelectedUser(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (user: UserData) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleView = (user: UserData) => {
    setViewUser(user);
    setViewDialogOpen(true);
  };

  const handleDelete = (user: UserData) => {
    setDeleteTarget(user);
    setConfirmOpen(true);
  };

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

  const handleSave = () => {
    setDialogOpen(false);
    toastr.success(selectedUser ? 'แก้ไขข้อมูลผู้ใช้งานสำเร็จ' : 'เพิ่มผู้ใช้งานสำเร็จ');
    fetchUsers();
  };

  // Get unique values for filters
  const uniqueCompanies = [...new Set(users.map((u) => u.company))].filter(Boolean);
  const uniqueDepartments = [...new Set(users.map((u) => u.department))].filter(Boolean);

  // Create department code to name map
  const departmentNameMap = new Map(users.map((u) => [u.department, u.departmentName]));

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

  // Count users by role
  const roleUserCounts = {
    all: users.length,
    employee: users.filter(u => u.role === 'employee').length,
    admin: users.filter(u => u.role === 'admin').length,
    hr_manager: users.filter(u => u.role === 'hr_manager').length,
    hr: users.filter(u => u.role === 'hr').length,
    dept_manager: users.filter(u => u.role === 'dept_manager').length,
    section_head: users.filter(u => u.role === 'section_head').length,
    shift_supervisor: users.filter(u => u.role === 'shift_supervisor').length,
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesCompany = companyFilter === 'all' || user.company === companyFilter;
    const matchesDepartment = departmentFilter === 'all' || user.department === departmentFilter;
    const matchesRole = roleTab === 'all' || user.role === roleTab;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);

    return matchesSearch && matchesCompany && matchesDepartment && matchesRole && matchesStatus;
  });

  // Paginated users
  const paginatedUsers = filteredUsers.slice(
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
  }, [searchQuery, companyFilter, departmentFilter, roleTab, statusFilter]);

  // Stats
  const activeUsers = users.filter((u) => u.isActive).length;
  const inactiveUsers = users.filter((u) => !u.isActive).length;
  const totalUsers = users.length;
  const newUsersThisMonth = users.filter((u) => dayjs(u.startDate).isSame(dayjs(), 'month')).length;

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
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(2, 1fr)', md: '2fr 1fr 1fr 1fr auto auto' }, 
          gap: 1.5, 
          alignItems: 'center' 
        }}>
          <TextField
            placeholder="ค้นหาชื่อ, รหัสพนักงาน..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              gridColumn: { xs: '1 / -1', md: 'auto' },
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

      {/* Mobile Card View (Visible on xs, sm) */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
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

      {/* Table */}
      <Fade in={true} timeout={500}>
        <TableContainer
          component={Paper}
          sx={{
            display: { xs: 'none', md: 'block' },
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
