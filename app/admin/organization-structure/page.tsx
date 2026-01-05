'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Badge,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  SearchNormal1,
  Building,
  Building4,
  Layer,
  People,
  ArrowDown2,
  Profile2User,
  Hierarchy,
  Grid1,
  RowVertical,
  CloseCircle,
  UserSquare,
} from 'iconsax-react';
import { Drawer as VaulDrawer } from 'vaul';

const PRIMARY_COLOR = '#6C63FF';

interface Subordinate {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string;
  role: string;
  roleName: string;
  avatar: string | null;
  company: string;
  companyName: string;
  department: string;
  departmentName: string;
  section: string | null;
  sectionName: string | null;
}

interface Approver {
  level: number;
  approver: {
    id: number;
    employeeId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    position: string;
    role: string;
    roleName: string;
    avatar: string | null;
  };
}

interface UserData {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  position: string;
  role: string;
  roleName: string;
  company: string;
  companyName: string;
  department: string;
  departmentName: string;
  section: string | null;
  sectionName: string | null;
  shift: string | null;
  avatar: string | null;
  approvers: Approver[];
  hasApprover: boolean;
  subordinates: Subordinate[];
  subordinateCount: number;
}

interface FilterOption {
  code: string;
  name: string;
}

interface Stats {
  totalUsers: number;
  usersWithApprover: number;
  usersWithoutApprover: number;
  byRole: Record<string, number>;
}

const roleColors: Record<string, { bg: string; color: string }> = {
  admin: { bg: '#FFEBEE', color: '#D32F2F' },
  hr_manager: { bg: '#E3F2FD', color: '#1976D2' },
  hr: { bg: '#E3F2FD', color: '#1976D2' },
  dept_manager: { bg: '#E8F5E9', color: '#2E7D32' },
  section_head: { bg: '#FFF3E0', color: '#E65100' },
  shift_supervisor: { bg: '#F3E5F5', color: '#7B1FA2' },
  employee: { bg: '#F5F5F5', color: '#616161' },
};

// Shift display labels
const shiftLabels: Record<string, string> = {
  shift_a: 'กะ A',
  shift_b: 'กะ B',
  day: 'กะ A',  // backwards compatibility
  night: 'กะ B', // backwards compatibility
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
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              {title}
            </Typography>
            <Typography fontWeight={700} sx={{ color: colorMap[color].main, fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' } }}>
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
              width: { xs: 40, sm: 48, md: 56 },
              height: { xs: 40, sm: 48, md: 56 },
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

export default function OrganizationStructurePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filters, setFilters] = useState<{
    companies: FilterOption[];
    departments: FilterOption[];
    sections: FilterOption[];
    shifts: string[];
  }>({ companies: [], departments: [], sections: [], shifts: [] });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());

  // Dialog for subordinates
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [subordinatesDialogOpen, setSubordinatesDialogOpen] = useState(false);
  const [subordinateSearch, setSubordinateSearch] = useState('');

  // Handle cascading filter reset
  const handleCompanyChange = (value: string) => {
    setCompanyFilter(value);
    setDepartmentFilter('all');
    setSectionFilter('all');
    setShiftFilter('all');
  };

  const handleDepartmentChange = (value: string) => {
    setDepartmentFilter(value);
    setSectionFilter('all');
    setShiftFilter('all');
  };

  const handleSectionChange = (value: string) => {
    setSectionFilter(value);
    setShiftFilter('all');
  };

  useEffect(() => {
    fetchData();
  }, [companyFilter, departmentFilter, sectionFilter, shiftFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (companyFilter !== 'all') params.set('company', companyFilter);
      if (departmentFilter !== 'all') params.set('department', departmentFilter);
      if (sectionFilter !== 'all') params.set('section', sectionFilter);
      if (shiftFilter !== 'all') params.set('shift', shiftFilter);

      const response = await fetch(`/api/admin/organization-structure?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const result = await response.json();
      setData(result.data || []);
      setStats(result.stats || null);
      setFilters(result.filters || { companies: [], departments: [], sections: [], shifts: [] });

      // Expand all by default
      if (result.grouped) {
        setExpandedCompanies(new Set(result.grouped.map((g: { company: string }) => g.company)));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered data
  const filteredData = useMemo(() => {
    let result = data;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        u =>
          u.fullName.toLowerCase().includes(query) ||
          u.employeeId?.toLowerCase().includes(query) ||
          u.position?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [data, searchQuery]);

  // Group filtered data
  const groupedData = useMemo(() => {
    const grouped: Map<string, {
      company: string;
      companyName: string;
      departments: Map<string, {
        department: string;
        departmentName: string;
        users: UserData[];
      }>;
    }> = new Map();

    filteredData.forEach(user => {
      if (!grouped.has(user.company)) {
        grouped.set(user.company, {
          company: user.company,
          companyName: user.companyName,
          departments: new Map(),
        });
      }
      const companyGroup = grouped.get(user.company)!;

      if (!companyGroup.departments.has(user.department)) {
        companyGroup.departments.set(user.department, {
          department: user.department,
          departmentName: user.departmentName,
          users: [],
        });
      }
      companyGroup.departments.get(user.department)!.users.push(user);
    });

    return Array.from(grouped.values()).map(c => ({
      ...c,
      departments: Array.from(c.departments.values()),
    }));
  }, [filteredData]);

  const toggleCompany = (company: string) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(company)) {
        newSet.delete(company);
      } else {
        newSet.add(company);
      }
      return newSet;
    });
  };

  const toggleDepartment = (key: string) => {
    setExpandedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Open subordinates dialog
  const handleOpenSubordinates = (user: UserData) => {
    setSelectedUser(user);
    setSubordinatesDialogOpen(true);
    setSubordinateSearch('');
  };

  // Filtered subordinates
  const filteredSubordinates = useMemo(() => {
    if (!selectedUser) return [];
    if (!subordinateSearch) return selectedUser.subordinates;

    const query = subordinateSearch.toLowerCase();
    return selectedUser.subordinates.filter(
      sub =>
        sub.fullName.toLowerCase().includes(query) ||
        sub.employeeId?.toLowerCase().includes(query) ||
        sub.position?.toLowerCase().includes(query)
    );
  }, [selectedUser, subordinateSearch]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" fontWeight={700} color="#1E293B" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          โครงสร้างองค์กร
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
          แสดงความสัมพันธ์หัวหน้า-ลูกน้อง แยกตามบริษัท ฝ่าย แผนก
        </Typography>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
          <Grid size={{ xs: 6, sm: 4 }}>
            <StatCard
              title="พนักงานทั้งหมด"
              value={stats.totalUsers}
              icon={<People size={28} variant="Bold" color="#6C63FF" />}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <StatCard
              title="บริษัท"
              value={groupedData.length}
              icon={<Hierarchy size={28} variant="Bold" color="#9C27B0" />}
              color="secondary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              title="ฝ่าย/แผนก"
              value={groupedData.reduce((sum, c) => sum + c.departments.length, 0)}
              icon={<Building4 size={28} variant="Bold" color="#22C55E" />}
              color="success"
            />
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 3 }, borderRadius: 1, border: '1px solid #E2E8F0' }}>
        <Grid container spacing={{ xs: 1, sm: 2 }} alignItems="center">
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="ค้นหาชื่อ, รหัสพนักงาน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchNormal1 size={18} color="#94A3B8" />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '0.875rem', sm: '1rem' } } }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>บริษัท</InputLabel>
              <Select
                value={companyFilter}
                label="บริษัท"
                onChange={(e) => handleCompanyChange(e.target.value)}
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                {filters.companies.map(c => (
                  <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>ฝ่าย</InputLabel>
              <Select
                value={departmentFilter}
                label="ฝ่าย"
                onChange={(e) => handleDepartmentChange(e.target.value)}
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                {filters.departments.map(d => (
                  <MenuItem key={d.code} value={d.code}>{d.code} - {d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>แผนก</InputLabel>
              <Select
                value={sectionFilter}
                label="แผนก"
                onChange={(e) => handleSectionChange(e.target.value)}
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                {filters.sections.map(s => (
                  <MenuItem key={s.code} value={s.code}>{s.code} - {s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>กะ</InputLabel>
              <Select
                value={shiftFilter}
                label="กะ"
                onChange={(e) => setShiftFilter(e.target.value)}
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                {filters.shifts.map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* View Mode Toggle - ซ่อนบน mobile เพราะจะแสดง Card เสมอ */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end', alignItems: 'center', mt: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, v) => v && setViewMode(v)}
            size="small"
          >
            <ToggleButton value="table">
              <RowVertical size={18} color={viewMode === 'table' ? PRIMARY_COLOR : '#94A3B8'} />
            </ToggleButton>
            <ToggleButton value="card">
              <Grid1 size={18} color={viewMode === 'card' ? PRIMARY_COLOR : '#94A3B8'} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} variant="rounded" height={200} />
          ))}
        </Box>
      ) : filteredData.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 1, border: '1px solid #E2E8F0' }}>
          <Profile2User size={64} color="#94A3B8" variant="Bulk" />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            ไม่พบข้อมูลพนักงาน
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {groupedData.map(companyGroup => (
            <Accordion
              key={companyGroup.company}
              expanded={expandedCompanies.has(companyGroup.company)}
              onChange={() => toggleCompany(companyGroup.company)}
              elevation={0}
              sx={{
                border: '1px solid #E2E8F0',
                borderRadius: '8px !important',
                '&:before': { display: 'none' },
                overflow: 'hidden',
              }}
            >
              <AccordionSummary
                expandIcon={<ArrowDown2 size={20} />}
                sx={{
                  bgcolor: '#F8FAFC',
                  px: { xs: 1.5, sm: 2 },
                  '& .MuiAccordionSummary-content': { alignItems: 'center', gap: { xs: 1, sm: 2 } },
                }}
              >
                <Building size={24} color={PRIMARY_COLOR} variant="Bold" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={700} color="#1E293B" noWrap sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    {companyGroup.companyName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                    รหัส: {companyGroup.company}
                  </Typography>
                </Box>
                <Chip
                  label={`${companyGroup.departments.reduce((sum, d) => sum + d.users.length, 0)} คน`}
                  size="small"
                  sx={{ bgcolor: '#EEF2FF', color: PRIMARY_COLOR, fontWeight: 600 }}
                />
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                {companyGroup.departments.map(deptGroup => (
                  <Accordion
                    key={`${companyGroup.company}-${deptGroup.department}`}
                    expanded={expandedDepartments.has(`${companyGroup.company}-${deptGroup.department}`)}
                    onChange={() => toggleDepartment(`${companyGroup.company}-${deptGroup.department}`)}
                    elevation={0}
                    sx={{
                      '&:before': { display: 'none' },
                      borderTop: '1px solid #E2E8F0',
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ArrowDown2 size={18} />}
                      sx={{
                        bgcolor: 'white',
                        pl: { xs: 2, sm: 4 },
                        '& .MuiAccordionSummary-content': { alignItems: 'center', gap: { xs: 1, sm: 1.5 } },
                      }}
                    >
                      <Building4 size={20} color="#64748B" />
                      <Typography fontWeight={600} color="#334155" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {deptGroup.departmentName}
                      </Typography>
                      <Chip
                        label={`${deptGroup.users.length} คน`}
                        size="small"
                        sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontWeight: 600, height: 22 }}
                      />
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      {/* Mobile Card Layout - แสดงเสมอบน mobile */}
                      <Box sx={{ display: { xs: 'block', md: viewMode === 'card' ? 'block' : 'none' }, p: { xs: 1.5, sm: 2 } }}>
                        <Box sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            lg: viewMode === 'card' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)'
                          },
                          gap: { xs: 1.5, sm: 2 }
                        }}>
                          {deptGroup.users.map(user => (
                            <Card
                              key={user.id}
                              elevation={0}
                              sx={{
                                border: '1px solid #E2E8F0',
                                borderRadius: 1,
                              }}
                            >
                              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                  <Avatar
                                    src={user.avatar || undefined}
                                    sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, bgcolor: PRIMARY_COLOR }}
                                  >
                                    {user.firstName?.[0]}
                                  </Avatar>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography fontWeight={600} noWrap sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {user.fullName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                      {user.position || user.employeeId}
                                    </Typography>
                                  </Box>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
                                  <Chip
                                    label={user.roleName}
                                    size="small"
                                    sx={{
                                      bgcolor: roleColors[user.role]?.bg || '#F5F5F5',
                                      color: roleColors[user.role]?.color || '#616161',
                                      fontWeight: 600,
                                      fontSize: '0.65rem',
                                      height: 22,
                                    }}
                                  />
                                  {user.sectionName && (
                                    <Chip
                                      label={user.sectionName}
                                      size="small"
                                      sx={{ fontSize: '0.65rem', height: 22 }}
                                    />
                                  )}
                                  {user.shift && (
                                    <Chip
                                      label={shiftLabels[user.shift] || user.shift}
                                      size="small"
                                      sx={{ fontSize: '0.65rem', height: 22 }}
                                    />
                                  )}
                                </Box>

                                {/* หัวหน้า */}
                                <Box sx={{ mb: 1 }}>
                                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                                    หัวหน้า:
                                  </Typography>
                                  {user.hasApprover ? (
                                    <Box sx={{ mt: 0.5 }}>
                                      {user.approvers.map(a => (
                                        <Box key={a.level} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
                                          <Avatar
                                            src={a.approver.avatar || undefined}
                                            sx={{ width: 24, height: 24, fontSize: '0.65rem', bgcolor: PRIMARY_COLOR }}
                                          >
                                            {a.approver.firstName?.[0]}
                                          </Avatar>
                                          <Typography variant="body2" fontSize="0.8rem">
                                            {a.approver.fullName}
                                          </Typography>
                                        </Box>
                                      ))}
                                    </Box>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                      -
                                    </Typography>
                                  )}
                                </Box>

                                {/* ลูกน้อง */}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px solid #F1F5F9' }}>
                                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                                    ลูกน้อง:
                                  </Typography>
                                  {user.subordinateCount > 0 ? (
                                    <Chip
                                      icon={<People size={12} color="#2E7D32" />}
                                      label={`${user.subordinateCount} คน`}
                                      size="small"
                                      onClick={() => handleOpenSubordinates(user)}
                                      sx={{
                                        bgcolor: '#E8F5E9',
                                        color: '#2E7D32',
                                        fontWeight: 600,
                                        fontSize: '0.7rem',
                                        height: 24,
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: '#C8E6C9' },
                                      }}
                                    />
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">-</Typography>
                                  )}
                                </Box>
                              </CardContent>
                            </Card>
                          ))}
                        </Box>
                      </Box>

                      {/* Desktop Table Layout - แสดงเฉพาะบน md+ และ viewMode === 'table' */}
                      <TableContainer sx={{ display: { xs: 'none', md: viewMode === 'table' ? 'block' : 'none' } }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                              <TableCell sx={{ fontWeight: 600, pl: 4 }}>พนักงาน</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>ตำแหน่ง</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>แผนก</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>กะ</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>หัวหน้า</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>ลูกน้อง</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {deptGroup.users.map(user => (
                              <TableRow key={user.id} hover>
                                <TableCell sx={{ pl: 4 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Avatar
                                      src={user.avatar || undefined}
                                      sx={{ width: 36, height: 36, bgcolor: PRIMARY_COLOR }}
                                    >
                                      {user.firstName?.[0]}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="body2" fontWeight={600}>
                                        {user.fullName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {user.employeeId}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">{user.position || '-'}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">{user.sectionName || '-'}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">{user.shift ? shiftLabels[user.shift] || user.shift : '-'}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={user.roleName}
                                    size="small"
                                    sx={{
                                      bgcolor: roleColors[user.role]?.bg || '#F5F5F5',
                                      color: roleColors[user.role]?.color || '#616161',
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      height: 24,
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  {user.hasApprover ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                      {user.approvers.map(a => (
                                        <Box key={a.level} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Avatar
                                            src={a.approver.avatar || undefined}
                                            sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: PRIMARY_COLOR }}
                                          >
                                            {a.approver.firstName?.[0]}
                                          </Avatar>
                                          <Tooltip title={`${a.approver.position || ''} (${a.approver.roleName})`}>
                                            <Typography variant="body2" sx={{ cursor: 'help' }}>
                                              {a.approver.fullName}
                                            </Typography>
                                          </Tooltip>
                                        </Box>
                                      ))}
                                    </Box>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      -
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {user.subordinateCount > 0 ? (
                                    <Chip
                                      icon={<People size={14} />}
                                      label={`${user.subordinateCount} คน`}
                                      size="small"
                                      onClick={() => handleOpenSubordinates(user)}
                                      sx={{
                                        bgcolor: '#E8F5E9',
                                        color: '#2E7D32',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: '#C8E6C9' },
                                      }}
                                    />
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      -
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Subordinates Drawer - Vaul Style */}
      <VaulDrawer.Root
        open={subordinatesDialogOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSubordinatesDialogOpen(false);
            setSelectedUser(null);
            setSubordinateSearch('');
          }
        }}
        shouldScaleBackground={false}
      >
        <VaulDrawer.Portal>
          <VaulDrawer.Overlay
            style={{
              position: 'fixed',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)',
              zIndex: 1300,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />
          <VaulDrawer.Content
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#FAFBFC',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '85vh',
              zIndex: 1300,
              display: 'flex',
              flexDirection: 'column',
              outline: 'none',
              boxShadow: '0 -10px 50px rgba(0,0,0,0.15)',
            }}
          >
            {selectedUser && (
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '85vh' }}>
                {/* Vaul Handle */}
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  pt: 1.5,
                  pb: 1,
                  bgcolor: 'white',
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                }}>
                  <VaulDrawer.Handle
                    style={{
                      width: 48,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: '#E2E8F0',
                    }}
                  />
                </Box>

                {/* Header */}
                <Box sx={{
                  bgcolor: 'white',
                  px: 2.5,
                  pb: 2,
                  borderBottom: '1px solid #F1F5F9',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar
                      src={selectedUser.avatar || undefined}
                      sx={{
                        width: 56,
                        height: 56,
                        fontSize: '1.5rem',
                        bgcolor: PRIMARY_COLOR,
                        boxShadow: '0 4px 12px rgba(108, 99, 255, 0.3)',
                      }}
                    >
                      {selectedUser.firstName?.[0]}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <VaulDrawer.Title asChild>
                        <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, color: '#1E293B' }}>
                          รายชื่อลูกน้องของ {selectedUser.fullName}
                        </Typography>
                      </VaulDrawer.Title>
                      <VaulDrawer.Description asChild>
                        <Typography sx={{ fontSize: '0.85rem', color: '#64748B' }}>
                          {selectedUser.departmentName} {selectedUser.position || selectedUser.roleName} • {selectedUser.subordinateCount} คน
                        </Typography>
                      </VaulDrawer.Description>
                    </Box>
                    <IconButton
                      onClick={() => {
                        setSubordinatesDialogOpen(false);
                        setSelectedUser(null);
                        setSubordinateSearch('');
                      }}
                      sx={{
                        bgcolor: '#F1F5F9',
                        '&:hover': { bgcolor: '#E2E8F0' }
                      }}
                    >
                      <CloseCircle size={22} color="#64748B" />
                    </IconButton>
                  </Box>

                  {/* Search */}
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="ค้นหาชื่อ, รหัสพนักงาน..."
                    value={subordinateSearch}
                    onChange={(e) => setSubordinateSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchNormal1 size={18} color="#94A3B8" />
                        </InputAdornment>
                      ),
                      endAdornment: subordinateSearch && (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setSubordinateSearch('')}
                            sx={{ p: 0.5 }}
                          >
                            <CloseCircle size={18} color="#94A3B8" variant="Bold" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1,
                        bgcolor: '#F8FAFC',
                      }
                    }}
                  />
                </Box>

                {/* Content - Mobile Card / Desktop Table */}
                <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 2 }}>
                  {filteredSubordinates.length > 0 ? (
                    <>
                      {/* Mobile Card Layout */}
                      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                        {filteredSubordinates.map(sub => (
                          <Card key={sub.id} elevation={0} sx={{ borderRadius: 1, border: '1px solid #E2E8F0' }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                <Avatar
                                  src={sub.avatar || undefined}
                                  sx={{ width: 44, height: 44, bgcolor: PRIMARY_COLOR }}
                                >
                                  {sub.firstName?.[0]}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography fontWeight={600} noWrap>
                                    {sub.fullName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {sub.employeeId}
                                  </Typography>
                                </Box>
                                <Chip
                                  label={sub.roleName}
                                  size="small"
                                  sx={{
                                    bgcolor: roleColors[sub.role]?.bg || '#F5F5F5',
                                    color: roleColors[sub.role]?.color || '#616161',
                                    fontWeight: 600,
                                    fontSize: '0.65rem',
                                    height: 22,
                                  }}
                                />
                              </Box>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pl: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Profile2User size={14} color="#64748B" />
                                  <Typography variant="caption" color="text.secondary">
                                    {sub.position || '-'}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Building4 size={14} color="#64748B" />
                                  <Typography variant="caption" color="text.secondary">
                                    {sub.departmentName}{sub.sectionName ? ` • ${sub.sectionName}` : ''}
                                  </Typography>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>

                      {/* Desktop Table Layout */}
                      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 1, border: '1px solid #E2E8F0', display: { xs: 'none', md: 'block' } }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                              <TableCell sx={{ fontWeight: 600 }}>พนักงาน</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>ตำแหน่ง</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>ฝ่าย/แผนก</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {filteredSubordinates.map(sub => (
                              <TableRow key={sub.id} hover>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Avatar
                                      src={sub.avatar || undefined}
                                      sx={{ width: 36, height: 36, bgcolor: PRIMARY_COLOR }}
                                    >
                                      {sub.firstName?.[0]}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="body2" fontWeight={600}>
                                        {sub.fullName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {sub.employeeId}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">{sub.position || '-'}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">{sub.departmentName}</Typography>
                                  {sub.sectionName && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                      {sub.sectionName}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={sub.roleName}
                                    size="small"
                                    sx={{
                                      bgcolor: roleColors[sub.role]?.bg || '#F5F5F5',
                                      color: roleColors[sub.role]?.color || '#616161',
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      height: 24,
                                    }}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  ) : (
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      py: 6,
                      minHeight: 200,
                    }}>
                      <UserSquare size={64} color="#94A3B8" variant="Bulk" />
                      <Typography color="text.secondary" sx={{ mt: 2 }}>
                        {subordinateSearch ? 'ไม่พบผลการค้นหา' : 'ไม่มีลูกน้อง'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </VaulDrawer.Content>
        </VaulDrawer.Portal>
      </VaulDrawer.Root>
    </Box>
  );
}
