'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Avatar,
    alpha,
    useTheme,
    Skeleton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Chip,
    Card,
    CardContent,
    Divider,
    Alert,
    TextField,
    InputAdornment,
    Stepper,
    Step,
    StepLabel,
    StepConnector,
    stepConnectorClasses,
    styled,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    CircularProgress,
    Tooltip,
    IconButton,
} from '@mui/material';
import {
    Hierarchy,
    UserSquare,
    Building,
    Layer,
    People,
    SearchNormal1,
    ArrowRight2,
    TickCircle,
    CloseCircle,
    Timer,
    Refresh2,
    DocumentText,
    Flash,
    Crown,
    Send2,
    Play,
    InfoCircle,
} from 'iconsax-react';
import { useToastr } from '@/app/components/Toastr';

// Custom Step Connector
const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
    [`&.${stepConnectorClasses.alternativeLabel}`]: {
        top: 22,
    },
    [`&.${stepConnectorClasses.active}`]: {
        [`& .${stepConnectorClasses.line}`]: {
            backgroundImage: 'linear-gradient(95deg, #6C63FF 0%, #00C9A7 100%)',
        },
    },
    [`&.${stepConnectorClasses.completed}`]: {
        [`& .${stepConnectorClasses.line}`]: {
            backgroundImage: 'linear-gradient(95deg, #22C55E 0%, #00C9A7 100%)',
        },
    },
    [`& .${stepConnectorClasses.line}`]: {
        height: 3,
        border: 0,
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
        borderRadius: 1,
    },
}));

// Custom Step Icon
const ColorlibStepIconRoot = styled('div')<{
    ownerState: { completed?: boolean; active?: boolean; level: number; roleColor?: string };
}>(({ theme, ownerState }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#ccc',
    zIndex: 1,
    color: '#fff',
    width: 50,
    height: 50,
    display: 'flex',
    borderRadius: '50%',
    justifyContent: 'center',
    alignItems: 'center',
    ...(ownerState.active && {
        '& svg': { color: '#fff !important' },
        backgroundImage: 'linear-gradient(136deg, #6C63FF 0%, #845EF7 100%)',
        boxShadow: '0 4px 10px 0 rgba(108, 99, 255, 0.25)',
        ...(ownerState.roleColor && {
            backgroundImage: `linear-gradient(136deg, ${ownerState.roleColor} 0%, ${alpha(ownerState.roleColor, 0.6)} 100%)`,
            boxShadow: `0 4px 10px 0 ${alpha(ownerState.roleColor, 0.25)}`,
        }),
    }),
    ...(ownerState.completed && {
        '& svg': { color: '#fff !important' },
        backgroundImage: 'linear-gradient(136deg, #22C55E 0%, #00C9A7 100%)',
    }),
}));




interface User {
    id: number;
    employeeId: string;
    firstName: string;
    lastName: string;
    role: string;
    company: string;
    department: string;
    section?: string;
    shift?: string;
    position?: string;
}

interface ApprovalFlow {
    level: number;
    approverId: number;
    approverName: string;
    approverRole: string;
    approverPosition?: string;
    isRequired: boolean;
    source: 'user_flow' | 'workflow' | 'fallback';
}

interface SimulationResult {
    userId: number;
    userName: string;
    userRole: string;
    approvalSteps: ApprovalFlow[];
    message?: string;
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
}

// Role hierarchy information
const roleInfo = [
    { role: 'employee', name: 'พนักงาน', level: 1, color: '#64748B', icon: <UserSquare size={20} variant="Bold" color="#64748B" /> },
    { role: 'shift_supervisor', name: 'หัวหน้ากะ', level: 2, color: '#0EA5E9', icon: <People size={20} variant="Bold" color="#0EA5E9" /> },
    { role: 'section_head', name: 'หัวหน้าแผนก', level: 3, color: '#8B5CF6', icon: <Layer size={20} variant="Bold" color="#8B5CF6" /> },
    { role: 'dept_manager', name: 'ผู้จัดการฝ่าย', level: 4, color: '#F59E0B', icon: <Building size={20} variant="Bold" color="#F59E0B" /> },
    { role: 'hr_manager', name: 'ผู้จัดการ HR', level: 5, color: '#22C55E', icon: <Crown size={20} variant="Bold" color="#22C55E" /> },
    { role: 'admin', name: 'Admin', level: 6, color: '#EF4444', icon: <Flash size={20} variant="Bold" color="#EF4444" /> },
];

const getRoleInfo = (role: string) => roleInfo.find(r => r.role === role) || { name: role, level: 0, color: '#64748B', icon: <UserSquare size={20} /> };

export default function WorkflowTestPage() {
    const theme = useTheme();
    const toastr = useToastr();

    const [users, setUsers] = useState<User[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [loading, setLoading] = useState(true);
    const [simulating, setSimulating] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [companyFilter, setCompanyFilter] = useState<string>('all');
    const [departmentFilter, setDepartmentFilter] = useState<string>('all');
    const [sectionFilter, setSectionFilter] = useState<string>('all');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [submittingLeave, setSubmittingLeave] = useState(false);
    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Fetch users
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error('Error fetching users:', err);
            toastr.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
        } finally {
            setLoading(false);
        }
    }, [toastr]);

    // Fetch companies
    const fetchCompanies = useCallback(async () => {
        try {
            const res = await fetch('/api/companies');
            if (res.ok) {
                setCompanies(await res.json());
            }
        } catch (err) {
            console.error('Error fetching companies:', err);
        }
    }, []);

    // Fetch departments
    const fetchDepartments = useCallback(async () => {
        try {
            const res = await fetch('/api/departments');
            if (res.ok) {
                setDepartments(await res.json());
            }
        } catch (err) {
            console.error('Error fetching departments:', err);
        }
    }, []);

    // Fetch sections
    const fetchSections = useCallback(async () => {
        try {
            const res = await fetch('/api/sections');
            if (res.ok) {
                setSections(await res.json());
            }
        } catch (err) {
            console.error('Error fetching sections:', err);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
        fetchCompanies();
        fetchDepartments();
        fetchSections();
    }, [fetchUsers, fetchCompanies, fetchDepartments, fetchSections]);

    // Simulate approval workflow
    const simulateWorkflow = async (user: User) => {
        setSelectedUser(user);
        setSimulating(true);
        setSimulationResult(null);

        try {
            const res = await fetch(`/api/admin/workflow-test?userId=${user.id}`);
            if (!res.ok) {
                throw new Error('Failed to simulate workflow');
            }
            const data = await res.json();
            setSimulationResult(data);
        } catch (err) {
            console.error('Error simulating workflow:', err);
            toastr.error('ไม่สามารถจำลอง workflow ได้');
        } finally {
            setSimulating(false);
        }
    };

    // Submit test leave request for the selected user
    const handleSubmitTestLeave = async (user: User) => {
        setSubmittingLeave(true);

        try {
            const today = new Date();
            const res = await fetch('/api/admin/workflow-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    leaveType: 'sick',
                    startDate: today.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0],
                    totalDays: 1,
                    reason: `[ทดสอบ Workflow] ใบลาทดสอบสำหรับ ${user.firstName} ${user.lastName}`,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to submit test leave');
            }

            const data = await res.json();
            toastr.success(`ส่งใบลาทดสอบสำเร็จ! รหัสใบลา: ${data.leaveCode || data.id}`);

            // Show the created approval steps
            if (data.approvalSteps) {
                setSimulationResult(prev => prev ? {
                    ...prev,
                    message: `สร้างใบลาแล้ว (${data.leaveCode || data.id}) - มี ${data.approvalSteps.length} ขั้นตอนการอนุมัติ`,
                } : prev);
            }
        } catch (err) {
            console.error('Error submitting test leave:', err);
            toastr.error(err instanceof Error ? err.message : 'ไม่สามารถส่งใบลาทดสอบได้');
        } finally {
            setSubmittingLeave(false);
        }
    };

    // Get company name
    const getCompanyName = (code: string) => {
        const company = companies.find(c => c.code === code);
        return company?.name || code;
    };

    // Get department name
    const getDepartmentName = (code: string) => {
        const department = departments.find(d => d.code === code);
        return department?.name || code;
    };

    // Filter users
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCompany = companyFilter === 'all' || user.company === companyFilter;
        const matchesDepartment = departmentFilter === 'all' || user.department === departmentFilter;
        const matchesSection = sectionFilter === 'all' || user.section === sectionFilter;
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesCompany && matchesDepartment && matchesSection && matchesRole;
    });

    // Paginated users
    const paginatedUsers = filteredUsers.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    // Handle pagination
    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Reset page when filters change
    useEffect(() => {
        setPage(0);
    }, [searchQuery, companyFilter, departmentFilter, sectionFilter, roleFilter]);

    // Get filtered departments based on company
    const filteredDepartments = departments.filter(d =>
        companyFilter === 'all' || d.company === companyFilter
    );

    // Get sections (we don't have direct department-section link in Section interface, 
    // so we filter based on user's sections within filtered department)
    // Get sections based on filtered department
    const availableSections = departmentFilter === 'all'
        ? sections
        : (() => {
            const dept = departments.find(d => d.code === departmentFilter);
            return dept ? sections.filter(s => s.departmentId === dept.id) : [];
        })();

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
                                ทดสอบ Approval Workflow
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                จำลองการส่งใบลาและดู approval flow สำหรับแต่ละ user
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                <Tooltip title="รีเฟรชข้อมูล">
                    <IconButton
                        onClick={() => {
                            fetchUsers();
                            setSimulationResult(null);
                            setSelectedUser(null);
                        }}
                        sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                        }}
                    >
                        <Refresh2 size={20} color="#6C63FF" />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Role Hierarchy Card */}
            <Paper
                sx={{
                    p: 3,
                    mb: 4,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
                }}
            >
                <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Hierarchy size={20} color="#6C63FF" />
                    Role Hierarchy
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    ลำดับการอนุมัติจะเรียงตามระดับของ role โดยเริ่มจากผู้มีอำนาจน้อยไปมาก
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {roleInfo.map((role, index) => (
                        <React.Fragment key={role.role}>
                            <Chip
                                icon={role.icon}
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="caption" fontWeight={600}>{role.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">Lv.{role.level}</Typography>
                                    </Box>
                                }
                                sx={{
                                    bgcolor: alpha(role.color, 0.1),
                                    borderColor: role.color,
                                    '& .MuiChip-icon': { color: role.color },
                                    px: 1,
                                }}
                                variant="outlined"
                            />
                            {index < roleInfo.length - 1 && (
                                <ArrowRight2 size={16} color={theme.palette.text.disabled} style={{ alignSelf: 'center' }} />
                            )}
                        </React.Fragment>
                    ))}
                </Stack>
            </Paper>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                {/* User Selection Panel */}
                <Paper
                    sx={{
                        p: 3,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <UserSquare size={20} color="#6C63FF" />
                        เลือกพนักงานเพื่อทดสอบ
                    </Typography>

                    {/* Filters */}
                    <Stack spacing={2} sx={{ mb: 3 }}>
                        <TextField
                            placeholder="ค้นหาพนักงาน..."
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
                        <Stack direction="row" spacing={1}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>บริษัท</InputLabel>
                                <Select
                                    value={companyFilter}
                                    label="บริษัท"
                                    onChange={(e) => {
                                        setCompanyFilter(e.target.value);
                                        setDepartmentFilter('all');
                                    }}
                                >
                                    <MenuItem value="all">ทั้งหมด</MenuItem>
                                    {companies.map((c) => (
                                        <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel>ฝ่าย</InputLabel>
                                <Select
                                    value={departmentFilter}
                                    label="ฝ่าย"
                                    onChange={(e) => {
                                        setDepartmentFilter(e.target.value);
                                        setSectionFilter('all');
                                    }}
                                >
                                    <MenuItem value="all">ทั้งหมด</MenuItem>
                                    {filteredDepartments.map((d) => (
                                        <MenuItem key={d.code} value={d.code}>{d.code} - {d.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>
                        <Stack direction="row" spacing={1}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>แผนก</InputLabel>
                                <Select
                                    value={sectionFilter}
                                    label="แผนก"
                                    onChange={(e) => setSectionFilter(e.target.value)}
                                >
                                    <MenuItem value="all">ทั้งหมด</MenuItem>
                                    {availableSections.map((s) => (
                                        <MenuItem key={s.code} value={s.code}>{s.code} - {s.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Role</InputLabel>
                                <Select
                                    value={roleFilter}
                                    label="Role"
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                >
                                    <MenuItem value="all">ทั้งหมด</MenuItem>
                                    {roleInfo.map((r) => (
                                        <MenuItem key={r.role} value={r.role}>{r.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>
                    </Stack>

                    {/* User List */}
                    <TableContainer sx={{ flexGrow: 1 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>พนักงาน</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell align="right">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 10 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton width={150} /></TableCell>
                                            <TableCell><Skeleton width={80} /></TableCell>
                                            <TableCell align="right"><Skeleton width={60} /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center">
                                            <Typography color="text.secondary">ไม่พบข้อมูล</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedUsers.map((user) => {
                                        const role = getRoleInfo(user.role);
                                        const isSelected = selectedUser?.id === user.id;
                                        return (
                                            <TableRow
                                                key={user.id}
                                                sx={{
                                                    bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                                }}
                                            >
                                                <TableCell>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {user.firstName} {user.lastName}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {user.employeeId} • {getDepartmentName(user.department)}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={role.name}
                                                        sx={{
                                                            bgcolor: alpha(role.color, 0.1),
                                                            color: role.color,
                                                            fontWeight: 500,
                                                            fontSize: '0.7rem',
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Button
                                                        size="small"
                                                        variant={isSelected ? "contained" : "outlined"}
                                                        onClick={() => simulateWorkflow(user)}
                                                        disabled={simulating}
                                                        sx={{ borderRadius: 1, minWidth: 80 }}
                                                    >
                                                        {isSelected && simulating ? (
                                                            <CircularProgress size={16} color="inherit" />
                                                        ) : (
                                                            'ทดสอบ'
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={filteredUsers.length}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        labelRowsPerPage="แสดง"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} จาก ${count}`}
                        sx={{ borderTop: '1px solid', borderColor: 'divider' }}
                    />
                </Paper>

                {/* Simulation Result Panel */}
                <Paper
                    sx={{
                        p: 3,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        height: '100%',
                    }}
                >
                    <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DocumentText size={20} color="#6C63FF" />
                        ผลการจำลอง Approval Flow
                    </Typography>

                    {!selectedUser && !simulationResult && (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                py: 8,
                                color: 'text.secondary',
                            }}
                        >
                            <Hierarchy size={64} color={theme.palette.text.disabled} />
                            <Typography sx={{ mt: 2 }}>เลือกพนักงานเพื่อดู approval flow</Typography>
                        </Box>
                    )}

                    {simulating && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
                            <CircularProgress size={48} />
                            <Typography sx={{ mt: 2 }} color="text.secondary">กำลังจำลอง workflow...</Typography>
                        </Box>
                    )}

                    {simulationResult && !simulating && (
                        <Box>
                            {/* Selected User Info */}
                            <Card sx={{ mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                                <CardContent>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Avatar sx={{ width: 48, height: 48, bgcolor: alpha(getRoleInfo(simulationResult.userRole).color, 0.2) }}>
                                            {getRoleInfo(simulationResult.userRole).icon}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="subtitle1" fontWeight={600}>
                                                {simulationResult.userName}
                                            </Typography>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip
                                                    size="small"
                                                    label={getRoleInfo(simulationResult.userRole).name}
                                                    sx={{
                                                        bgcolor: alpha(getRoleInfo(simulationResult.userRole).color, 0.1),
                                                        color: getRoleInfo(simulationResult.userRole).color,
                                                    }}
                                                />
                                                {selectedUser && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {getDepartmentName(selectedUser.department)} • {getCompanyName(selectedUser.company)}
                                                    </Typography>
                                                )}
                                            </Stack>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>

                            {simulationResult.message && (
                                <Alert severity="info" sx={{ mb: 3, borderRadius: 1 }}>
                                    {simulationResult.message}
                                </Alert>
                            )}

                            {/* Approval Steps Stepper */}
                            {simulationResult.approvalSteps.length > 0 ? (
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        ลำดับการอนุมัติ ({simulationResult.approvalSteps.length} ขั้นตอน)
                                    </Typography>

                                    <Stepper
                                        alternativeLabel
                                        activeStep={-1}
                                        connector={<ColorlibConnector />}
                                        sx={{ mt: 3, mb: 3 }}
                                    >
                                        {simulationResult.approvalSteps.map((step, index) => (
                                            <Step key={index} completed={false}>
                                                <StepLabel
                                                    StepIconComponent={() => (
                                                        <ColorlibStepIconRoot
                                                            ownerState={{
                                                                active: true,
                                                                level: step.level,
                                                                roleColor: getRoleInfo(step.approverRole).color
                                                            }}
                                                        >
                                                            {step.level === 99 ? (
                                                                <Crown size={24} color="#fff" variant="Bold" />
                                                            ) : (
                                                                React.cloneElement(getRoleInfo(step.approverRole).icon as any, {
                                                                    color: '#fff'
                                                                })
                                                            )}
                                                        </ColorlibStepIconRoot>
                                                    )}
                                                >
                                                    <Box sx={{ textAlign: 'center' }}>
                                                        <Typography variant="caption" fontWeight={600} display="block">
                                                            Level {step.level}
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {step.approverName}
                                                        </Typography>
                                                        <Chip
                                                            size="small"
                                                            label={getRoleInfo(step.approverRole).name}
                                                            sx={{
                                                                mt: 0.5,
                                                                height: 20,
                                                                fontSize: '0.65rem',
                                                                bgcolor: alpha(getRoleInfo(step.approverRole).color, 0.1),
                                                                color: getRoleInfo(step.approverRole).color,
                                                            }}
                                                        />
                                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                                                            {step.source === 'user_flow' && '(User Flow)'}
                                                            {step.source === 'workflow' && '(Workflow)'}
                                                            {step.source === 'fallback' && '(Fallback)'}
                                                        </Typography>
                                                    </Box>
                                                </StepLabel>
                                            </Step>
                                        ))}
                                    </Stepper>

                                    {/* Steps Table */}
                                    <Divider sx={{ my: 3 }} />
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        รายละเอียด
                                    </Typography>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Level</TableCell>
                                                    <TableCell>ผู้อนุมัติ</TableCell>
                                                    <TableCell>Role</TableCell>
                                                    <TableCell>ที่มา</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {simulationResult.approvalSteps.map((step, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>
                                                            <Chip
                                                                size="small"
                                                                label={step.level === 99 ? 'HR' : step.level}
                                                                sx={{
                                                                    bgcolor: step.level === 99
                                                                        ? alpha('#F59E0B', 0.1)
                                                                        : alpha(theme.palette.primary.main, 0.1),
                                                                    color: step.level === 99 ? '#F59E0B' : theme.palette.primary.main,
                                                                    fontWeight: 600,
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight={500}>
                                                                {step.approverName}
                                                            </Typography>
                                                            {step.approverPosition && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {step.approverPosition}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                size="small"
                                                                label={getRoleInfo(step.approverRole).name}
                                                                sx={{
                                                                    bgcolor: alpha(getRoleInfo(step.approverRole).color, 0.1),
                                                                    color: getRoleInfo(step.approverRole).color,
                                                                    fontSize: '0.7rem',
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                size="small"
                                                                variant="outlined"
                                                                label={
                                                                    step.source === 'user_flow' ? 'User Flow' :
                                                                        step.source === 'workflow' ? 'Workflow' : 'Fallback'
                                                                }
                                                                sx={{ fontSize: '0.7rem' }}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>

                                    {/* Simulate Submit Leave Button */}
                                    <Divider sx={{ my: 3 }} />
                                    <Card sx={{ bgcolor: alpha('#22C55E', 0.04), border: '1px dashed', borderColor: '#22C55E' }}>
                                        <CardContent>
                                            <Stack spacing={2}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Send2 size={20} color="#22C55E" variant="Bold" />
                                                    <Typography variant="subtitle1" fontWeight={600}>
                                                        จำลองส่งใบลาจริง
                                                    </Typography>
                                                </Box>
                                                <Alert severity="warning" sx={{ borderRadius: 1 }} icon={<InfoCircle size={20} color="#F59E0B" />}>
                                                    <Typography variant="body2">
                                                        การจำลองนี้จะ<strong>สร้างใบลาจริง</strong>ในระบบ (ลาป่วย 1 วัน วันนี้)
                                                        เพื่อทดสอบว่า approval flow ทำงานถูกต้อง สามารถยกเลิกใบลาได้ภายหลัง
                                                    </Typography>
                                                </Alert>
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    startIcon={<Play size={18} color="#fff" variant="Bold" />}
                                                    onClick={() => handleSubmitTestLeave(selectedUser!)}
                                                    disabled={submittingLeave || !selectedUser}
                                                    sx={{
                                                        borderRadius: 1,
                                                        py: 1.25,
                                                        boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
                                                    }}
                                                >
                                                    {submittingLeave ? (
                                                        <CircularProgress size={20} color="inherit" />
                                                    ) : (
                                                        'ส่งใบลาทดสอบ (ลาป่วย 1 วัน)'
                                                    )}
                                                </Button>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Box>
                            ) : (
                                <Alert severity="warning" sx={{ borderRadius: 1 }}>
                                    ไม่พบ approval flow สำหรับผู้ใช้นี้
                                </Alert>
                            )}
                        </Box>
                    )}
                </Paper>
            </Box>

            {/* Legend / Help Section */}
            <Paper
                sx={{
                    p: 3,
                    mt: 4,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: alpha(theme.palette.info.main, 0.02),
                }}
            >
                <Typography variant="h6" fontWeight={600} gutterBottom>
                    คำอธิบาย
                </Typography>
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            ลำดับการหา Approval Flow:
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Chip label="1. User Flow" size="small" color="primary" />
                            <ArrowRight2 size={16} color={theme.palette.text.disabled} />
                            <Chip label="2. Section Workflow" size="small" color="secondary" />
                            <ArrowRight2 size={16} color={theme.palette.text.disabled} />
                            <Chip label="3. Department Workflow" size="small" color="info" />
                            <ArrowRight2 size={16} color={theme.palette.text.disabled} />
                            <Chip label="4. Company Workflow" size="small" color="warning" />
                            <ArrowRight2 size={16} color={theme.palette.text.disabled} />
                            <Chip label="5. HR Manager (Fallback)" size="small" color="success" />
                        </Stack>
                    </Box>
                    <Divider />
                    <Box>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            กรณีพิเศษ:
                        </Typography>
                        <Stack spacing={1}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TickCircle size={16} color="#22C55E" />
                                <Typography variant="body2">
                                    <strong>Dept Manager</strong> - ส่งตรงไป HR Manager โดยไม่ต้องผ่านขั้นอื่น
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CloseCircle size={16} color="#EF4444" />
                                <Typography variant="body2">
                                    <strong>Self-Approval</strong> - ระบบจะข้ามขั้นตอนที่ผู้ขอลาเป็นผู้อนุมัติเองโดยอัตโนมัติ
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Timer size={16} color="#F59E0B" />
                                <Typography variant="body2">
                                    <strong>Escalation</strong> - หากไม่มีการอนุมัติภายใน 48 ชม. จะส่งต่อไป HR Manager อัตโนมัติ
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>
                </Stack>
            </Paper>
        </Box>
    );
}
