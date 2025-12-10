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
  IconButton,
  Chip,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Zoom } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/zoom';
import {
  SearchNormal1,
  Refresh2,
  DocumentText,
  Clock as ClockIcon,
  TickCircle,
  CloseCircle,
  InfoCircle,
  Calendar as CalendarIcon,
  User as UserIcon,
  Eye as EyeIcon,
  CloseSquare,
  Call,
  Paperclip2,
  ArrowRight2,
  Image as ImageIconsax,
  DocumentDownload,
} from 'iconsax-react';
import { useToastr } from '@/app/components/Toastr';

// Thai date formatter
const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const formatThaiDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
};
const formatThaiDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const hours = date.getHours().toString().padStart(2, '0');
  const mins = date.getMinutes().toString().padStart(2, '0');
  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543} ${hours}:${mins}`;
};

interface UserInfo {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  company: string;
  department: string;
  departmentName?: string;
  section?: string;
  sectionName?: string;
  position?: string;
  avatar?: string;
}

interface Approver {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Approval {
  id: number;
  level: number;
  status: string;
  approvedAt?: string;
  comment?: string;
  approver: Approver;
}

interface Attachment {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

interface LeaveRequest {
  id: number;
  leaveCode: string;
  userId: number;
  leaveType: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  totalDays: number;
  reason: string;
  status: string;
  rejectReason?: string;
  currentLevel: number;
  contactPhone?: string;
  contactAddress?: string;
  createdAt: string;
  user: UserInfo;
  approvals: Approval[];
  attachments: Attachment[];
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

interface LeaveType {
  id: number;
  code: string;
  name: string;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

const statusConfig: Record<string, { label: string; color: 'warning' | 'success' | 'error' | 'default'; icon: React.ReactElement }> = {
  pending: { label: 'รออนุมัติ', color: 'warning', icon: <ClockIcon size={14} variant="Bold" color="currentColor" /> },
  approved: { label: 'อนุมัติแล้ว', color: 'success', icon: <TickCircle size={14} variant="Bold" color="currentColor" /> },
  rejected: { label: 'ไม่อนุมัติ', color: 'error', icon: <CloseCircle size={14} variant="Bold" color="currentColor" /> },
  cancelled: { label: 'ยกเลิก', color: 'default', icon: <InfoCircle size={14} variant="Bold" color="currentColor" /> },
};

const roleLabels: Record<string, string> = {
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
  onClick?: () => void;
  isActive?: boolean;
}

function StatCard({ title, value, icon, color, onClick, isActive }: StatCardProps) {
  const theme = useTheme();

  const colorMap = {
    primary: {
      main: theme.palette.primary.main,
      bg: alpha(theme.palette.primary.main, 0.1),
    },
    success: {
      main: theme.palette.success.main,
      bg: alpha(theme.palette.success.main, 0.1),
    },
    warning: {
      main: theme.palette.warning.main,
      bg: alpha(theme.palette.warning.main, 0.1),
    },
    error: {
      main: theme.palette.error.main,
      bg: alpha(theme.palette.error.main, 0.1),
    },
    secondary: {
      main: theme.palette.secondary.main,
      bg: alpha(theme.palette.secondary.main, 0.1),
    },
  };

  const currentColor = colorMap[color];

  return (
    <Card
      onClick={onClick}
      elevation={0}
      sx={{
        borderRadius: 1, // Standard border radius
        border: '1px solid',
        borderColor: isActive ? currentColor.main : 'divider',
        bgcolor: isActive ? alpha(currentColor.main, 0.04) : 'background.paper',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        '&:hover': onClick ? {
          borderColor: currentColor.main,
          bgcolor: alpha(currentColor.main, 0.02),
        } : {},
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              bgcolor: currentColor.bg,
              color: currentColor.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
        <Typography variant="h4" fontWeight={600} sx={{ color: 'text.primary' }}>
          {value}
        </Typography>
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
          <TableCell><Skeleton variant="text" width={80} /></TableCell>
          <TableCell><Skeleton variant="circular" width={40} height={40} /></TableCell>
          <TableCell><Skeleton variant="text" width={100} /></TableCell>
          <TableCell><Skeleton variant="text" width={120} /></TableCell>
          <TableCell><Skeleton variant="text" width={60} /></TableCell>
          <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
          <TableCell><Skeleton variant="text" width={100} /></TableCell>
          <TableCell align="right"><Skeleton variant="circular" width={36} height={36} /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export default function AdminLeavesPage() {
  const theme = useTheme();
  const toastr = useToastr();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  // Month/Year filters - Start from year 2568 (2025)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = all months
  const [selectedYear, setSelectedYear] = useState<number>(currentYear); // Default current year

  // Generate year options (from 2568/2025 to current year + 543 in Buddhist Era)
  const startYear = 2025; // Start from 2025 (พ.ศ. 2568)
  const yearOptions = Array.from(
    { length: currentYear - startYear + 1 },
    (_, i) => startYear + i
  ).reverse(); // Most recent year first

  const monthOptions = [
    { value: 0, label: 'ทุกเดือน' },
    { value: 1, label: 'มกราคม' },
    { value: 2, label: 'กุมภาพันธ์' },
    { value: 3, label: 'มีนาคม' },
    { value: 4, label: 'เมษายน' },
    { value: 5, label: 'พฤษภาคม' },
    { value: 6, label: 'มิถุนายน' },
    { value: 7, label: 'กรกฎาคม' },
    { value: 8, label: 'สิงหาคม' },
    { value: 9, label: 'กันยายน' },
    { value: 10, label: 'ตุลาคม' },
    { value: 11, label: 'พฤศจิกายน' },
    { value: 12, label: 'ธันวาคม' },
  ];

  // Status tab
  const [statusTab, setStatusTab] = useState<number>(0);
  const statusTabMap = ['all', 'pending', 'approved', 'rejected', 'cancelled'];

  // Master data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [detailTab, setDetailTab] = useState(0);

  // Image modal
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [initialSlide, setInitialSlide] = useState(0);

  // Helper to check if file is an image
  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  // Handle file click
  const handleFileClick = (file: Attachment) => {
    if (isImageFile(file.mimeType)) {
      const imageAttachments = selectedLeave?.attachments.filter(a => isImageFile(a.mimeType)) || [];
      const index = imageAttachments.findIndex(a => a.id === file.id);
      setInitialSlide(index >= 0 ? index : 0);
      setImageModalOpen(true);
    } else {
      window.open(file.filePath, '_blank');
    }
  };

  const fetchMasterData = async () => {
    try {
      const [companiesRes, departmentsRes, sectionsRes, leaveTypesRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/departments'),
        fetch('/api/sections'),
        fetch('/api/leave-types'),
      ]);

      if (companiesRes.ok) setCompanies(await companiesRes.json());
      if (departmentsRes.ok) setDepartments(await departmentsRes.json());
      if (sectionsRes.ok) setSections(await sectionsRes.json());
      if (leaveTypesRes.ok) setLeaveTypes(await leaveTypesRes.json());
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  // Calculate date range based on selected month/year
  const getDateRange = useCallback(() => {
    // If selectedMonth is 0 (all months), filter by year only
    if (selectedMonth === 0) {
      const yearStart = new Date(selectedYear, 0, 1);
      const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      return { start: yearStart.toISOString(), end: yearEnd.toISOString() };
    } else {
      // Filter by specific month
      const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
      const monthEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
      return { start: monthStart.toISOString(), end: monthEnd.toISOString() };
    }
  }, [selectedMonth, selectedYear]);

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (leaveTypeFilter !== 'all') params.append('leaveType', leaveTypeFilter);
      if (companyFilter !== 'all') params.append('company', companyFilter);
      if (departmentFilter !== 'all') params.append('department', departmentFilter);
      if (sectionFilter !== 'all') params.append('section', sectionFilter);
      if (searchQuery) params.append('search', searchQuery);

      const dateRange = getDateRange();
      if (dateRange) {
        params.append('startDate', dateRange.start);
        params.append('endDate', dateRange.end);
      }

      const response = await fetch(`/api/admin/leaves?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch leaves');
      const data = await response.json();
      setLeaves(data.leaves);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching leaves:', error);
      toastr.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, leaveTypeFilter, companyFilter, departmentFilter, sectionFilter, searchQuery, getDateRange, toastr]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  // Cascading filters
  const handleCompanyChange = (value: string) => {
    setCompanyFilter(value);
    setDepartmentFilter('all');
    setSectionFilter('all');
  };

  const handleDepartmentChange = (value: string) => {
    setDepartmentFilter(value);
    setSectionFilter('all');
  };

  const filteredDepartments = companyFilter === 'all'
    ? departments
    : departments.filter(d => d.company === companyFilter);

  const filteredSections = (() => {
    let filtered = sections;
    if (companyFilter !== 'all') {
      filtered = filtered.filter(s => s.companyCode === companyFilter);
    }
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(s => s.departmentCode === departmentFilter);
    }
    return filtered;
  })();

  // Paginated leaves
  const paginatedLeaves = leaves.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleOpenDetail = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setDetailTab(0);
    setDetailDialogOpen(true);
  };

  const formatDate = (date: string) => {
    return formatThaiDate(date);
  };

  const formatDateTime = (date: string) => {
    return formatThaiDateTime(date);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <DocumentText size={24} variant="Bulk" color={theme.palette.primary.main} />
            </Box>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={700}>
                จัดการใบลา
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ภาพรวมและประวัติการลางานทั้งหมด
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Refresh2 size={18} color={theme.palette.primary.main} />}
            onClick={fetchLeaves}
            disabled={loading}
            sx={{
              borderRadius: 1,
              textTransform: 'none',
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.04)
              }
            }}
          >
            รีเฟรช
          </Button>
        </Box>
      </Box>

      {/* Stat Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <StatCard
          title="ทั้งหมด"
          value={stats.total}
          icon={<DocumentText size={20} variant="Bold" color="currentColor" />}
          color="primary"
          onClick={() => { setStatusFilter('all'); setStatusTab(0); }}
          isActive={statusFilter === 'all'}
        />
        <StatCard
          title="รออนุมัติ"
          value={stats.pending}
          icon={<ClockIcon size={20} variant="Bold" color="currentColor" />}
          color="warning"
          onClick={() => { setStatusFilter('pending'); setStatusTab(1); }}
          isActive={statusFilter === 'pending'}
        />
        <StatCard
          title="อนุมัติแล้ว"
          value={stats.approved}
          icon={<TickCircle size={20} variant="Bold" color="currentColor" />}
          color="success"
          onClick={() => { setStatusFilter('approved'); setStatusTab(2); }}
          isActive={statusFilter === 'approved'}
        />
        <StatCard
          title="ไม่อนุมัติ"
          value={stats.rejected}
          icon={<CloseCircle size={20} variant="Bold" color="currentColor" />}
          color="error"
          onClick={() => { setStatusFilter('rejected'); setStatusTab(3); }}
          isActive={statusFilter === 'rejected'}
        />
        <StatCard
          title="ยกเลิก"
          value={stats.cancelled}
          icon={<InfoCircle size={20} variant="Bold" color="currentColor" />}
          color="secondary"
          onClick={() => { setStatusFilter('cancelled'); setStatusTab(4); }}
          isActive={statusFilter === 'cancelled'}
        />
      </Box>

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <SearchNormal1 size={18} color={theme.palette.text.secondary} />
          <Typography variant="subtitle1" fontWeight={600}>
            ตัวกรองข้อมูล
          </Typography>
        </Box>

        {/* Top Filters: Date & Search */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' },
            gap: 2,
            mb: 2,
          }}
        >
          <TextField
            placeholder="ค้นหาชื่อ, รหัสพนักงาน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchNormal1 size={18} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
              }
            }}
          />

          <FormControl fullWidth size="small">
            <InputLabel>เดือน</InputLabel>
            <Select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                setPage(0);
              }}
              label="เดือน"
              sx={{ borderRadius: 1 }}
            >
              {monthOptions.map((month) => (
                <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>ปี</InputLabel>
            <Select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setPage(0);
              }}
              label="ปี"
              sx={{ borderRadius: 1 }}
            >
              {yearOptions.map((year) => (
                <MenuItem key={year} value={year}>พ.ศ. {year + 543}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />

        {/* Detailed Filters */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          <FormControl size="small" fullWidth>
            <InputLabel>ประเภทลา</InputLabel>
            <Select
              value={leaveTypeFilter}
              onChange={(e) => setLeaveTypeFilter(e.target.value)}
              label="ประเภทลา"
              sx={{ borderRadius: 1 }}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              {leaveTypes.map((lt) => (
                <MenuItem key={lt.code} value={lt.code}>{lt.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>บริษัท</InputLabel>
            <Select
              value={companyFilter}
              onChange={(e) => handleCompanyChange(e.target.value)}
              label="บริษัท"
              sx={{ borderRadius: 1 }}
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
              sx={{ borderRadius: 1 }}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              {filteredDepartments.map((dept) => (
                <MenuItem key={dept.code} value={dept.code}>{dept.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>แผนก</InputLabel>
            <Select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              label="แผนก"
              sx={{ borderRadius: 1 }}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              {filteredSections.map((section) => (
                <MenuItem key={section.code} value={section.code}>{section.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>
      {/* Mobile Card View (Visible on xs, sm) */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={200} sx={{ borderRadius: 1 }} />
          ))
        ) : leaves.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 60, height: 60, bgcolor: alpha(theme.palette.text.secondary, 0.1), color: 'text.secondary' }}>
                <DocumentText size={30} variant="Outline" />
              </Avatar>
              <Typography variant="body1" fontWeight={600} color="text.secondary">
                ไม่พบข้อมูลใบลา
              </Typography>
            </Box>
          </Paper>
        ) : (
          paginatedLeaves.map((leave) => {
            const statusInfo = statusConfig[leave.status] || statusConfig.pending;
            const pendingApproval = leave.approvals.find(a => a.status === 'pending');
            const currentApprover = pendingApproval?.approver;

            return (
              <Paper
                key={leave.id}
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
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Avatar
                      src={leave.user.avatar || undefined}
                      sx={{ width: 40, height: 40, bgcolor: theme.palette.primary.main }}
                    >
                      {leave.user.firstName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {leave.user.firstName} {leave.user.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {leave.user.employeeId} • {leave.user.departmentName || leave.user.department}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={leave.leaveCode || `#${leave.id}`}
                    size="small"
                    sx={{ borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', fontWeight: 600, fontSize: '0.7rem' }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    ส่งเมื่อ {formatThaiDate(leave.createdAt)}
                  </Typography>
                </Box>

                <Divider sx={{ borderStyle: 'dashed' }} />

                {/* Card Body */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">ประเภท</Typography>
                    <Typography variant="body2" fontWeight={500}>{leave.leaveTypeName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">จำนวน</Typography>
                    <Typography variant="body2" fontWeight={500}>{leave.totalDays} วัน</Typography>
                  </Box>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="caption" color="text.secondary">ช่วงเวลา</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                    </Typography>
                  </Box>
                </Box>

                {/* Card Footer */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Chip
                    icon={statusInfo.icon}
                    label={statusInfo.label}
                    size="small"
                    color={statusInfo.color}
                    sx={{ fontWeight: 500, borderRadius: 1 }}
                  />

                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleOpenDetail(leave)}
                    endIcon={<EyeIcon size={16} color={theme.palette.primary.main} />}
                    sx={{ borderRadius: 1 }}
                  >
                    รายละเอียด
                  </Button>
                </Box>

                {leave.status === 'pending' && currentApprover && (
                  <Box sx={{ bgcolor: alpha(theme.palette.warning.main, 0.05), p: 1, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ClockIcon size={14} color={theme.palette.warning.main} variant="Bold" />
                    <Typography variant="body2" color="text.secondary">
                      รออนุมัติ: <strong>{currentApprover.firstName} {currentApprover.lastName}</strong> ({roleLabels[currentApprover.role]}) (ขั้นที่ {leave.currentLevel})
                    </Typography>
                  </Box>
                )}
              </Paper>
            );
          })
        )}
      </Box>

      {/* Desktop Table View */}
      {/* Desktop Table View */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          display: { xs: 'none', md: 'block' },
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableCell sx={{ fontWeight: 600, py: 1.5, pl: 3, fontSize: '0.85rem' }}>ลำดับ</TableCell>
              <TableCell sx={{ fontWeight: 600, py: 1.5, fontSize: '0.85rem' }}>รหัสใบลา</TableCell>
              <TableCell sx={{ fontWeight: 600, py: 1.5, fontSize: '0.85rem' }}>พนักงาน</TableCell>
              <TableCell sx={{ fontWeight: 600, py: 1.5, fontSize: '0.85rem' }}>ประเภท</TableCell>
              <TableCell sx={{ fontWeight: 600, py: 1.5, fontSize: '0.85rem' }}>วันที่ลา</TableCell>
              <TableCell sx={{ fontWeight: 600, py: 1.5, fontSize: '0.85rem' }}>จำนวน</TableCell>
              <TableCell sx={{ fontWeight: 600, py: 1.5, fontSize: '0.85rem' }}>สถานะ</TableCell>
              <TableCell sx={{ fontWeight: 600, py: 1.5, fontSize: '0.85rem' }}>ขั้นตอนปัจจุบัน</TableCell>
              <TableCell sx={{ fontWeight: 600, py: 1.5, pr: 3, fontSize: '0.85rem' }} align="right">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          {loading ? (
            <TableSkeleton />
          ) : leaves.length === 0 ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette.text.secondary, 0.05),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <DocumentText size={40} variant="Bulk" color={theme.palette.text.secondary} />
                    </Box>
                    <Typography variant="h6" fontWeight={600} color="text.secondary">
                      ไม่พบข้อมูลใบลา
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ลองปรับเปลี่ยนตัวกรองเพื่อค้นหาใหม่
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <TableBody>
              {paginatedLeaves.map((leave, index) => {
                const statusInfo = statusConfig[leave.status] || statusConfig.pending;
                const pendingApproval = leave.approvals.find(a => a.status === 'pending');
                const currentApprover = pendingApproval?.approver;

                return (
                  <TableRow
                    key={leave.id}
                    hover
                    onClick={() => handleOpenDetail(leave)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.02),
                      },
                    }}
                  >
                    <TableCell sx={{ py: 2, pl: 3 }}>
                      <Typography variant="body2" fontWeight={600} color="text.secondary">
                        {page * rowsPerPage + index + 1}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Box>
                        <Chip
                          label={leave.leaveCode || `#${leave.id}`}
                          size="small"
                          sx={{
                            borderRadius: 1,
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            color: 'primary.main',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            height: 24
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          {formatThaiDate(leave.createdAt)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          src={leave.user.avatar || undefined}
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: theme.palette.primary.main,
                            fontSize: '1rem',
                            fontWeight: 600,
                            border: `2px solid ${theme.palette.background.paper}`,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                          }}
                        >
                          {leave.user.firstName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {leave.user.firstName} {leave.user.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                            <UserIcon size={14} color={theme.palette.text.secondary} /> {leave.user.departmentName || '-'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {leave.leaveTypeName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDate(leave.startDate)}
                        </Typography>
                        {leave.startDate !== leave.endDate && (
                          <Typography variant="caption" color="text.secondary">
                            ถึง {formatDate(leave.endDate)}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {leave.totalDays} วัน
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Chip
                        icon={statusInfo.icon}
                        label={statusInfo.label}
                        size="small"
                        color={statusInfo.color}
                        variant={leave.status === 'pending' ? 'filled' : 'outlined'}
                        sx={{
                          fontWeight: 600,
                          borderRadius: 1,
                          borderWidth: leave.status === 'pending' ? 0 : 1,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      {leave.status === 'pending' && currentApprover ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: alpha(theme.palette.warning.main, 0.2), color: 'warning.main', fontWeight: 'bold' }}
                          >
                            {leave.currentLevel}
                          </Avatar>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              รออนุมัติ
                            </Typography>
                            <Typography variant="caption" fontWeight={600}>
                              {currentApprover.firstName}
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2, pr: 3 }}>
                      <IconButton
                        size="small"
                        sx={{
                          color: 'primary.main',
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                          },
                        }}
                      >
                        <ArrowRight2 size={18} color="currentColor" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          )}
        </Table>
      </TableContainer>

      {/* Pagination */}
      {leaves.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mt: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            p: 1,
          }}
        >
          <TablePagination
            component="div"
            count={leaves.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="แสดงต่อหน้า:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
            }
            sx={{
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontWeight: 500,
                color: 'text.secondary',
              },
            }}
          />
        </Paper>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1 } }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
              <DocumentText size={20} variant="Outline" color="#6C63FF" />
            </Avatar>
            <Box>
              <Typography component="div" variant="h6" fontWeight={600}>
                ใบลา {selectedLeave?.leaveCode || `#${selectedLeave?.id}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                สร้างเมื่อ {selectedLeave && formatDateTime(selectedLeave.createdAt)}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setDetailDialogOpen(false)}>
            <CloseSquare size={32} variant="Outline" color="#9E9E9E" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {selectedLeave && (
            <>
              <Tabs
                value={detailTab}
                onChange={(_, v) => setDetailTab(v)}
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  px: 3,
                }}
              >
                <Tab label="ข้อมูลใบลา" />
                <Tab label={`ขั้นตอนอนุมัติ (${selectedLeave.approvals.length})`} />
                {selectedLeave.attachments.length > 0 && (
                  <Tab label={`ไฟล์แนบ (${selectedLeave.attachments.length})`} />
                )}
              </Tabs>

              <Box sx={{ p: 3 }}>
                {/* Tab 0: Leave Info */}
                {detailTab === 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Status */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        icon={statusConfig[selectedLeave.status]?.icon}
                        label={statusConfig[selectedLeave.status]?.label}
                        color={statusConfig[selectedLeave.status]?.color}
                        sx={{ fontWeight: 600 }}
                      />
                      {selectedLeave.status === 'rejected' && selectedLeave.rejectReason && (
                        <Typography variant="body2" color="error.main">
                          เหตุผล: {selectedLeave.rejectReason}
                        </Typography>
                      )}
                    </Box>

                    {/* Employee Info */}
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <UserIcon size={16} variant="Outline" color="#6C63FF" /> ข้อมูลพนักงาน
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            src={selectedLeave.user.avatar || undefined}
                            sx={{ width: 48, height: 48, bgcolor: theme.palette.primary.main }}
                          >
                            {selectedLeave.user.firstName.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {selectedLeave.user.firstName} {selectedLeave.user.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {selectedLeave.user.employeeId}
                            </Typography>
                          </Box>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">สังกัด</Typography>
                          <Typography variant="body2">
                            {selectedLeave.user.departmentName || selectedLeave.user.department}
                            {selectedLeave.user.sectionName && ` / ${selectedLeave.user.sectionName}`}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>

                    {/* Leave Details */}
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarIcon size={16} variant="Outline" color="#2196F3" /> รายละเอียดการลา
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1.5 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">ประเภทการลา</Typography>
                          <Typography variant="body2" fontWeight={500}>{selectedLeave.leaveTypeName}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">จำนวนวัน</Typography>
                          <Typography variant="body2" fontWeight={500}>{selectedLeave.totalDays} วัน</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">วันที่เริ่ม</Typography>
                          <Typography variant="body2">
                            {formatDate(selectedLeave.startDate)}
                            {selectedLeave.startTime && ` ${selectedLeave.startTime}`}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">วันที่สิ้นสุด</Typography>
                          <Typography variant="body2">
                            {formatDate(selectedLeave.endDate)}
                            {selectedLeave.endTime && ` ${selectedLeave.endTime}`}
                          </Typography>
                        </Box>
                        <Box sx={{ gridColumn: '1 / -1' }}>
                          <Typography variant="caption" color="text.secondary">เหตุผล</Typography>
                          <Typography variant="body2">{selectedLeave.reason}</Typography>
                        </Box>
                      </Box>
                    </Paper>

                    {/* Contact Info */}
                    {(selectedLeave.contactPhone || selectedLeave.contactAddress) && (
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Call size={16} variant="Outline" color="#4CAF50" /> ข้อมูลติดต่อ
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1.5 }}>
                          {selectedLeave.contactPhone && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">เบอร์โทร</Typography>
                              <Typography variant="body2">{selectedLeave.contactPhone}</Typography>
                            </Box>
                          )}
                          {selectedLeave.contactAddress && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">ที่อยู่</Typography>
                              <Typography variant="body2">{selectedLeave.contactAddress}</Typography>
                            </Box>
                          )}
                        </Box>
                      </Paper>
                    )}
                  </Box>
                )}

                {/* Tab 1: Approval Steps - Timeline Design */}
                {detailTab === 1 && (
                  <Box sx={{ position: 'relative', pl: 0 }}>
                    {selectedLeave.approvals.map((approval, idx) => {
                      const isPending = approval.status === 'pending';
                      const isApproved = approval.status === 'approved';
                      const isRejected = approval.status === 'rejected';
                      const isCancelled = approval.status === 'cancelled';
                      const isSkipped = approval.status === 'skipped';
                      const isLast = idx === selectedLeave.approvals.length - 1;

                      // Status icon and colors
                      const getStatusIcon = () => {
                        if (isApproved) return <TickCircle size={20} variant="Bold" color="white" />;
                        if (isPending) return <ClockIcon size={20} variant="Bold" color="white" />;
                        if (isRejected) return <CloseCircle size={20} variant="Bold" color="white" />;
                        if (isCancelled) return <InfoCircle size={20} variant="Bold" color="white" />;
                        return <InfoCircle size={20} variant="Bold" color="white" />;
                      };

                      const getStatusLabel = () => {
                        if (isPending) return 'รออนุมัติ';
                        if (isApproved) return 'อนุมัติแล้ว';
                        if (isCancelled) return 'ยกเลิก';
                        if (isSkipped) return 'ข้าม';
                        return 'ไม่อนุมัติ';
                      };

                      const getIconBgColor = () => {
                        if (isApproved) return theme.palette.success.main;
                        if (isPending) return theme.palette.warning.main;
                        if (isRejected) return theme.palette.error.main;
                        if (isCancelled) return theme.palette.grey[400];
                        return theme.palette.grey[400];
                      };

                      const getCardBgColor = () => {
                        if (isApproved) return alpha(theme.palette.success.main, 0.06);
                        if (isPending) return alpha(theme.palette.warning.main, 0.06);
                        if (isRejected) return alpha(theme.palette.error.main, 0.06);
                        return alpha(theme.palette.grey[500], 0.04);
                      };

                      const getTimeColor = () => {
                        if (isApproved) return theme.palette.success.main;
                        if (isPending) return theme.palette.warning.main;
                        if (isRejected) return theme.palette.error.main;
                        return theme.palette.text.secondary;
                      };

                      return (
                        <Box
                          key={approval.id}
                          sx={{
                            display: 'flex',
                            position: 'relative',
                            mb: isLast ? 0 : 0,
                          }}
                        >
                          {/* Timeline Container (Left Side) */}
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              mr: 2.5,
                              position: 'relative',
                            }}
                          >
                            {/* Status Circle */}
                            <Box
                              sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                bgcolor: getIconBgColor(),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: `0 4px 14px ${alpha(getIconBgColor(), 0.4)}`,
                                zIndex: 1,
                                flexShrink: 0,
                              }}
                            >
                              {getStatusIcon()}
                            </Box>
                            {/* Connecting Line */}
                            {!isLast && (
                              <Box
                                sx={{
                                  width: 2,
                                  flexGrow: 1,
                                  bgcolor: alpha(theme.palette.divider, 0.5),
                                  minHeight: 24,
                                }}
                              />
                            )}
                          </Box>

                          {/* Content Card (Right Side) */}
                          <Box
                            sx={{
                              flex: 1,
                              bgcolor: getCardBgColor(),
                              borderRadius: 1,
                              p: 2,
                              mb: isLast ? 0 : 2,
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {/* Header: Name and Role */}
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}>
                              <Box>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'text.primary', lineHeight: 1.3 }}>
                                  {approval.approver.firstName} {approval.approver.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {roleLabels[approval.approver.role] || approval.approver.role}
                                </Typography>
                              </Box>
                              <Chip
                                label={`ขั้นที่ ${approval.level}`}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  bgcolor: alpha(getIconBgColor(), 0.15),
                                  color: getIconBgColor(),
                                  border: 'none',
                                }}
                              />
                            </Box>

                            {/* Time and Status */}
                            <Typography
                              variant="caption"
                              sx={{
                                color: getTimeColor(),
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              {approval.approvedAt ? formatDateTime(approval.approvedAt) : getStatusLabel()}
                              {isPending && (
                                <Box
                                  component="span"
                                  sx={{
                                    display: 'inline-block',
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    bgcolor: theme.palette.warning.main,
                                    ml: 0.5,
                                    animation: 'pulse 1.5s infinite',
                                    '@keyframes pulse': {
                                      '0%': { opacity: 1 },
                                      '50%': { opacity: 0.4 },
                                      '100%': { opacity: 1 },
                                    },
                                  }}
                                />
                              )}
                            </Typography>

                            {/* Comment */}
                            {approval.comment && (
                              <Typography
                                variant="body2"
                                sx={{
                                  mt: 1.5,
                                  p: 1.5,
                                  bgcolor: alpha(theme.palette.common.black, 0.03),
                                  borderRadius: 2,
                                  color: 'text.secondary',
                                  fontSize: '0.8rem',
                                }}
                              >
                                💬 {approval.comment}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}

                {/* Tab 2: Attachments */}
                {detailTab === 2 && selectedLeave.attachments.length > 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {selectedLeave.attachments.map((file) => (
                      <Paper
                        key={file.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                        onClick={() => handleFileClick(file)}
                      >
                        {isImageFile(file.mimeType) ? (
                          <Avatar
                            src={file.filePath}
                            variant="rounded"
                            sx={{ width: 48, height: 48 }}
                          >
                            <ImageIconsax size={20} variant="Outline" color="#E91E63" />
                          </Avatar>
                        ) : (
                          <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                            <Paperclip2 size={20} variant="Outline" color="#6C63FF" />
                          </Avatar>
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={500}>{file.fileName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(file.fileSize / 1024).toFixed(1)} KB
                            {isImageFile(file.mimeType) && ' • คลิกเพื่อดูรูปขนาดเต็ม'}
                          </Typography>
                        </Box>
                        {isImageFile(file.mimeType) ? (
                          <EyeIcon size={18} variant="Outline" color={theme.palette.text.secondary} />
                        ) : (
                          <ArrowRight2 size={18} variant="Outline" color={theme.palette.text.secondary} />
                        )}
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setDetailDialogOpen(false)} sx={{ borderRadius: 1 }}>
            ปิด
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Modal (Swiper) */}
      <Dialog
        fullScreen
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: 'black',
            backgroundImage: 'none',
          }
        }}
      >
        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* Close Button */}
          <IconButton
            onClick={() => setImageModalOpen(false)}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 1500,
              color: 'white',
              bgcolor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.6)'
              },
              width: 48,
              height: 48,
            }}
          >
            <CloseSquare size={32} variant="Outline" color="white" />
          </IconButton>

          <Swiper
            modules={[Navigation, Pagination, Zoom]}
            navigation
            pagination={{ clickable: true }}
            zoom
            initialSlide={initialSlide}
            spaceBetween={0}
            slidesPerView={1}
            style={{ width: '100%', height: '100%', '--swiper-navigation-color': '#fff', '--swiper-pagination-color': '#fff' } as any}
          >
            {(selectedLeave?.attachments || []).filter(file => isImageFile(file.mimeType)).map((image) => (
              <SwiperSlide key={image.id}>
                <div className="swiper-zoom-container">
                  <img src={image.filePath} alt={image.fileName} style={{ maxHeight: '100vh', maxWidth: '100vw' }} />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </Box>
      </Dialog>
    </Box >
  );
}
