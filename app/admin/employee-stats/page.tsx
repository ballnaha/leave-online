'use client';

import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Avatar,
    Chip,
    Button,
    Stack,
    Skeleton,
    useTheme,
    alpha,
    IconButton,
    Tooltip,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    useMediaQuery,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    InputAdornment,
    TablePagination,
    TableSortLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
} from '@mui/material';
import {
    People,
    Refresh2,
    SearchNormal1,
    FilterEdit,
    Building,
    Hierarchy,
    Layer,
    Calendar,
    DocumentUpload,
} from 'iconsax-react';
import { useRouter } from 'next/navigation';

interface EmployeeLeaveStat {
    id: number;
    employeeId: string;
    name: string;
    department: string;
    section: string;
    avatar: string | null;
    totalDays: number;
    leaveDetails: Record<string, number>;
}

interface FilterOptions {
    companies: { code: string; name: string }[];
    departments: { code: string; name: string; companyCode: string }[];
    sections: { code: string; name: string; departmentCode: string }[];
    availableYears: number[];
}

export default function EmployeeStatsPage() {
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<EmployeeLeaveStat[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<string[]>([]);
    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);

    const [selectedCompany, setSelectedCompany] = useState<string>('all');
    const [selectedDept, setSelectedDept] = useState<string>('all');
    const [selectedSection, setSelectedSection] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

    // Pagination state
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(20);
    const [totalRows, setTotalRows] = useState(0);

    // Sorting state
    const [sortBy, setSortBy] = useState<string>('employeeId');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [selectedDetail, setSelectedDetail] = useState<{
        userName: string;
        leaveType: string;
        leaves: any[];
    } | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [allLeaveTypes, setAllLeaveTypes] = useState<{ code: string; name: string }[]>([]);

    const fetchFilters = async () => {
        try {
            const res = await fetch('/api/admin/dashboard');
            if (res.ok) {
                const result = await res.json();
                setFilterOptions(result.filterOptions);
            }
        } catch (error) {
            console.error('Failed to fetch filter options', error);
        }
    };

    const fetchLeaveTypes = async () => {
        try {
            const res = await fetch('/api/leave-types');
            if (res.ok) {
                const data = await res.json();
                setAllLeaveTypes(data);
            }
        } catch (error) {
            console.error('Failed to fetch leave types', error);
        }
    };

    const fetchStats = async (
        currentPage = page,
        company = selectedCompany,
        dept = selectedDept,
        section = selectedSection,
        year = selectedYear,
        currentSortBy = sortBy,
        currentSortOrder = sortOrder,
        currentSearch = searchQuery
    ) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (company !== 'all') params.append('company', company);
            if (dept !== 'all') params.append('dept', dept);
            if (section !== 'all') params.append('section', section);
            if (currentSearch) params.append('search', currentSearch);
            params.append('year', year.toString());
            params.append('page', (currentPage + 1).toString());
            params.append('limit', rowsPerPage.toString());
            params.append('sortBy', currentSortBy);
            params.append('sortOrder', currentSortOrder);

            const res = await fetch(`/api/admin/dashboard/employee-stats?${params.toString()}`);
            if (res.ok) {
                const result = await res.json();
                setStats(result.data);
                setLeaveTypes(result.leaveTypes);
                setTotalRows(result.pagination.total);
            }
        } catch (error) {
            console.error('Failed to fetch employee stats', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Initial load for filters
    useEffect(() => {
        fetchFilters();
        fetchLeaveTypes();
    }, []);

    // Single source of truth for fetching stats
    useEffect(() => {
        fetchStats(page, selectedCompany, selectedDept, selectedSection, selectedYear, sortBy, sortOrder, debouncedSearch);
    }, [page, selectedCompany, selectedDept, selectedSection, selectedYear, sortBy, sortOrder, debouncedSearch]);

    const handleSort = (property: string) => {
        const isAsc = sortBy === property && sortOrder === 'asc';
        const newOrder = isAsc ? 'desc' : 'asc';
        setSortOrder(newOrder);
        setSortBy(property);
        setPage(0);
    };

    const handleYearChange = (year: number) => {
        setSelectedYear(year);
        setPage(0);
    };

    const handleCompanyChange = (company: string) => {
        setSelectedCompany(company);
        setSelectedDept('all');
        setSelectedSection('all');
        setPage(0);
    };

    const handleDeptChange = (dept: string) => {
        setSelectedDept(dept);
        setSelectedSection('all');
        setPage(0);
    };

    const handleSectionChange = (section: string) => {
        setSelectedSection(section);
        setPage(0);
    };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleOpenDetails = async (stat: EmployeeLeaveStat, typeName: string) => {
        const isAll = typeName === 'all';
        const typeCode = isAll ? 'all' : (allLeaveTypes.find(lt => lt.name === typeName)?.code || typeName);
        
        setSelectedDetail({ userName: stat.name, leaveType: isAll ? 'รายการลาทั้งหมด' : typeName, leaves: [] });
        setDetailModalOpen(true);
        setDetailLoading(true);

        try {
            const params = new URLSearchParams();
            params.append('userId', stat.id.toString());
            if (!isAll) params.append('leaveType', typeCode);
            params.append('startDate', `${selectedYear}-01-01`);
            params.append('endDate', `${selectedYear}-12-31`);
            params.append('status', 'approved');

            const res = await fetch(`/api/admin/leaves?${params.toString()}`);
            if (res.ok) {
                const result = await res.json();
                setSelectedDetail(prev => prev ? { ...prev, leaves: result.leaves } : null);
            }
        } catch (error) {
            console.error('Failed to fetch leave details', error);
        } finally {
            setDetailLoading(false);
        }
    };

    const formatThaiDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH', { 
            day: 'numeric', 
            month: 'short', 
            year: '2-digit' 
        });
    };

    const typeColors: { [key: string]: string } = {
        'ลาป่วย': '#5E72E4',
        'ลากิจ': '#8965E0',
        'พักร้อน': '#11CDEF',
        'ลาคลอด': '#F3A4B5',
        'ลาบวช': '#FB6340',
        'default': '#8898AA'
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800} color="primary.main" gutterBottom>
                        สถิติการลาของพนักงาน
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        สรุปรายการลาสะสมรายบุคคลแยกตามประเภทใบลา ประจำปี {selectedYear + 543}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="contained"
                        startIcon={<DocumentUpload size={18} color="white" />}
                        onClick={() => router.push('/admin/leave-import')}
                        sx={{
                            borderRadius: 1.5,
                            bgcolor: 'success.main',
                            '&:hover': { bgcolor: 'success.dark' },
                            height: 40,
                            px: 2.5
                        }}
                    >
                        นำเข้าข้อมูลย้อนหลัง
                    </Button>
                    <Tooltip title="รีเฟรชข้อมูล">
                        <IconButton onClick={() => fetchStats(page)} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper' }}>
                            <Refresh2 size={24} color={theme.palette.text.secondary} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            {/* Filters Section (Integrated Search) */}
            <Paper elevation={0} sx={{
                p: 2.5,
                mb: 3,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(12px)',
            }}>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '2fr 1fr 1fr 1fr 1fr' },
                    gap: 2,
                    alignItems: 'center'
                }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                                bgcolor: alpha(theme.palette.background.default, 0.5),
                            }
                        }}
                    />

                    <FormControl size="small" fullWidth>
                        <InputLabel>ปีงบประมาณ</InputLabel>
                        <Select
                            value={selectedYear}
                            label="ปีงบประมาณ"
                            onChange={(e) => handleYearChange(Number(e.target.value))}
                        >
                            {filterOptions?.availableYears?.map(year => (
                                <MenuItem key={year} value={year}>{year + 543}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" fullWidth>
                        <InputLabel>บริษัท</InputLabel>
                        <Select
                            value={selectedCompany}
                            label="บริษัท"
                            onChange={(e) => handleCompanyChange(e.target.value)}
                        >
                            <MenuItem value="all">ทุกบริษัท</MenuItem>
                            {filterOptions?.companies?.map(c => (
                                <MenuItem key={c.code} value={c.code}>{c.code} - {c.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" fullWidth>
                        <InputLabel>ฝ่าย</InputLabel>
                        <Select
                            value={selectedDept}
                            label="ฝ่าย"
                            onChange={(e) => handleDeptChange(e.target.value)}
                        >
                            <MenuItem value="all">ทุกฝ่าย</MenuItem>
                            {filterOptions?.departments
                                ?.filter(d => selectedCompany === 'all' || d.companyCode === selectedCompany)
                                .map(d => (
                                    <MenuItem key={d.code} value={d.code}>{d.code} - {d.name}</MenuItem>
                                ))
                            }
                        </Select>
                    </FormControl>

                    <FormControl size="small" fullWidth disabled={selectedDept === 'all'}>
                        <InputLabel>แผนก</InputLabel>
                        <Select
                            value={selectedSection}
                            label="แผนก"
                            onChange={(e) => handleSectionChange(e.target.value)}
                        >
                            <MenuItem value="all">ทุกแผนก</MenuItem>
                            {filterOptions?.sections
                                ?.filter(s => s.departmentCode === selectedDept)
                                .map(s => (
                                    <MenuItem key={s.code} value={s.code}>{s.code} - {s.name}</MenuItem>
                                ))
                            }
                        </Select>
                    </FormControl>
                </Box>
            </Paper>

            {/* Statistics Table */}
            <Paper elevation={0} sx={{
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden'
            }}>
                <TableContainer>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{
                                    fontWeight: 800,
                                    bgcolor: 'background.paper',
                                    py: 2.5,
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 10,
                                    minWidth: 200
                                }}>ข้อมูลพนักงาน</TableCell>
                                <TableCell sx={{
                                    fontWeight: 800,
                                    bgcolor: 'background.paper',
                                    py: 2.5,
                                    position: 'sticky',
                                    left: 200,
                                    zIndex: 10,
                                    minWidth: 200,
                                    borderRight: '1px solid',
                                    borderColor: 'divider'
                                }}>สังกัด / หน่วยงาน</TableCell>
                                {leaveTypes.map(type => (
                                    <TableCell key={type} align="center" sx={{
                                        fontWeight: 800,
                                        bgcolor: 'background.paper',
                                        whiteSpace: 'nowrap',
                                        minWidth: 100
                                    }}>
                                        <TableSortLabel
                                            active={sortBy === type}
                                            direction={sortBy === type ? sortOrder : 'asc'}
                                            onClick={() => handleSort(type)}
                                        >
                                            {type}
                                        </TableSortLabel>
                                    </TableCell>
                                ))}
                                <TableCell align="center" sx={{
                                    fontWeight: 800,
                                    bgcolor: alpha(theme.palette.primary.main, 1),
                                    color: 'white',
                                    minWidth: 120,
                                    position: 'sticky',
                                    right: 0,
                                    zIndex: 10,
                                    '& .MuiTableSortLabel-root': {
                                        color: 'white !important',
                                        '& .MuiTableSortLabel-icon': {
                                            color: 'white !important',
                                        }
                                    }
                                }}>
                                    <TableSortLabel
                                        active={sortBy === 'total'}
                                        direction={sortBy === 'total' ? sortOrder : 'asc'}
                                        onClick={() => handleSort('total')}
                                    >
                                        รวมทุกประเภท
                                    </TableSortLabel>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Skeleton variant="circular" width={40} height={40} />
                                                <Box>
                                                    <Skeleton variant="text" width={120} />
                                                    <Skeleton variant="text" width={80} />
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ position: 'sticky', left: 200, bgcolor: 'background.paper', zIndex: 5, borderRight: '1px solid', borderColor: 'divider' }}>
                                            <Skeleton variant="text" width={150} />
                                        </TableCell>
                                        {leaveTypes.map(type => (
                                            <TableCell key={type}><Skeleton variant="text" /></TableCell>
                                        ))}
                                        <TableCell sx={{ position: 'sticky', right: 0, bgcolor: 'background.paper', zIndex: 5 }}><Skeleton variant="text" /></TableCell>
                                    </TableRow>
                                ))
                            ) : stats.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={leaveTypes.length + 3} align="center" sx={{ py: 10 }}>
                                        <Box sx={{ opacity: 0.5 }}>
                                            <People size={64} variant="Outline" />
                                            <Typography variant="h6" sx={{ mt: 2 }}>ไม่พบข้อมูลพนักงาน</Typography>
                                            <Typography variant="body2">ลองปรับเปลี่ยนตัวกรองหรือคำค้นหาใหม่</Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                stats.map((stat) => (
                                    <TableRow key={stat.id} hover sx={{ transition: 'background 0.2s' }}>
                                        <TableCell sx={{
                                            position: 'sticky',
                                            left: 0,
                                            bgcolor: 'background.paper',
                                            zIndex: 5,
                                            boxShadow: '2px 0 5px rgba(0,0,0,0.05)'
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar
                                                    src={stat.avatar || undefined}
                                                    sx={{
                                                        width: 44,
                                                        height: 44,
                                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                        color: 'primary.main',
                                                        fontWeight: 700
                                                    }}
                                                >
                                                    {stat.name.charAt(0)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={700}>{stat.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">ID: {stat.employeeId}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{
                                            position: 'sticky',
                                            left: 200,
                                            bgcolor: 'background.paper',
                                            zIndex: 5,
                                            borderRight: '1px solid',
                                            borderColor: 'divider'
                                        }}>
                                            <Typography variant="body2" fontWeight={600} gutterBottom>{stat.department}</Typography>
                                            <Typography variant="caption" color="text.secondary">{stat.section}</Typography>
                                        </TableCell>
                                        {leaveTypes.map(type => (
                                            <TableCell key={type} align="center">
                                                {stat.leaveDetails[type] ? (
                                                    <Chip
                                                        label={`${stat.leaveDetails[type]} วัน`}
                                                        size="small"
                                                        onClick={() => handleOpenDetails(stat, type)}
                                                        sx={{
                                                            height: 28,
                                                            fontWeight: 700,
                                                            bgcolor: alpha(typeColors[type] || typeColors.default, 0.12),
                                                            color: typeColors[type] || typeColors.default,
                                                            borderRadius: 1,
                                                            px: 0.5,
                                                            cursor: 'pointer',
                                                            '&:hover': {
                                                                bgcolor: alpha(typeColors[type] || typeColors.default, 0.2),
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <Typography variant="body2" color="text.disabled">-</Typography>
                                                )}
                                            </TableCell>
                                        ))}
                                        <TableCell align="center" sx={{
                                            position: 'sticky',
                                            right: 0,
                                            bgcolor: alpha(theme.palette.background.paper, 0.95),
                                            zIndex: 5,
                                            backdropFilter: 'blur(4px)',
                                            borderLeft: '1px solid',
                                            borderColor: 'divider'
                                        }}>
                                            <Box 
                                                onClick={() => handleOpenDetails(stat, 'all')}
                                                sx={{
                                                    display: 'inline-flex',
                                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                    color: 'primary.main',
                                                    borderRadius: 1,
                                                    px: 2,
                                                    py: 0.75,
                                                    fontWeight: 800,
                                                    fontSize: '0.95rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.primary.main, 0.15),
                                                        transform: 'translateY(-1px)',
                                                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.15)}`
                                                    }
                                                }}
                                            >
                                                {stat.totalDays} วัน
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Pagination & Summary */}
            <Box sx={{
                mt: 2,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2
            }}>
                <Typography variant="body2" color="text.secondary">
                    พบข้อมูลพนักงานทั้งหมด {totalRows} รายการ
                </Typography>
                <TablePagination
                    component="div"
                    count={totalRows}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[20]}
                    labelDisplayedRows={({ from, to, count }) =>
                        `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
                    }
                    sx={{
                        border: 'none',
                        '& .MuiTablePagination-toolbar': {
                            pl: 0
                        }
                    }}
                />
            </Box>

            {/* Leave Details Modal */}
            <Dialog 
                open={detailModalOpen} 
                onClose={() => setDetailModalOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 1.5 }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        {selectedDetail?.leaveType}
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                            พนักงาน: {selectedDetail?.userName} (ปี {selectedYear + 543})
                        </Typography>
                    </Box>
                    {!detailLoading && selectedDetail && (
                        <Chip 
                            label={`รวม ${selectedDetail.leaves.reduce((sum, l) => sum + l.totalDays, 0)} วัน`}
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                        />
                    )}
                </DialogTitle>
                <DialogContent sx={{ minHeight: 400, py: 0, bgcolor: alpha(theme.palette.background.default, 0.4) }}>
                    {detailLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
                            <CircularProgress size={40} thickness={4} />
                        </Box>
                    ) : selectedDetail?.leaves.length === 0 ? (
                        <Box sx={{ py: 12, textAlign: 'center', opacity: 0.5 }}>
                            <DocumentUpload size={64} variant="Outline" />
                            <Typography variant="h6" sx={{ mt: 2 }}>ไม่พบข้อมูลใบลา</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ py: 1 }}>
                            {(() => {
                                const grouped = (selectedDetail?.leaves || []).reduce((acc: Record<string, any[]>, curr: any) => {
                                    const type = curr.leaveTypeName || curr.leaveType;
                                    if (!acc[type]) acc[type] = [];
                                    acc[type].push(curr);
                                    return acc;
                                }, {});

                                return Object.entries(grouped).map(([typeName, leaves], index) => (
                                <Box key={typeName} sx={{ mb: index === Object.keys(leaves).length - 1 ? 0 : 4 }}>
                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, px: 0.5 }}>
                                        <Typography variant="overline" fontSize="0.75rem" fontWeight={800} color="primary" sx={{ letterSpacing: '0.1em' }}>
                                            {typeName}
                                        </Typography>
                                        <Box sx={{ flexGrow: 1, height: '1px', bgcolor: alpha(theme.palette.divider, 0.5) }} />
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            รวม {leaves.reduce((sum, l) => sum + l.totalDays, 0)} วัน
                                        </Typography>
                                    </Stack>

                                    <Table size="small">
                                        <TableBody>
                                            {leaves.map((l: any) => (
                                                <TableRow key={l.id} sx={{ '& td': { border: 0, py: 1.25, px: 0.5 } }}>
                                                    <TableCell sx={{ width: '100px' }}>
                                                        <Typography variant="body2" fontWeight={600} color="text.primary">
                                                            {formatThaiDate(l.startDate)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ width: '120px' }}>
                                                        <Typography variant="caption" sx={{ 
                                                            fontFamily: 'monospace', 
                                                            bgcolor: alpha(theme.palette.text.secondary, 0.05),
                                                            px: 0.8, py: 0.3, borderRadius: 0.5,
                                                            color: 'text.secondary'
                                                        }}>
                                                            {l.leaveCode}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ width: '60px', textAlign: 'center' }}>
                                                        <Typography variant="body2" fontWeight={800} color="primary">
                                                            {l.totalDays}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                                                            {l.reason || '-'}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                            ))})()}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button 
                        onClick={() => setDetailModalOpen(false)}
                        variant="outlined"
                        sx={{ borderRadius: 1.5, textTransform: 'none' }}
                    >
                        ปิดหน้าต่าง
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
