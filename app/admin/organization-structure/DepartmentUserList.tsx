import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Avatar,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
} from '@mui/material';
import { People } from 'iconsax-react';

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

export interface UserData {
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

// Props for DepartmentUserList
interface DepartmentUserListProps {
    users: UserData[];
    viewMode: 'table' | 'card';
    handleOpenSubordinates: (user: UserData) => void;
    shiftLabels: Record<string, string>;
    roleColors: Record<string, { bg: string; color: string }>;
    PRIMARY_COLOR: string;
}

export default function DepartmentUserList({
    users,
    viewMode,
    handleOpenSubordinates,
    shiftLabels,
    roleColors,
    PRIMARY_COLOR
}: DepartmentUserListProps) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Reset page when users change (e.g., search)
    useEffect(() => {
        setPage(0);
    }, [users]);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paginatedUsers = users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Box>
            {/* Mobile Card Layout - Always show on mobile, or if viewMode is card */}
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
                    {paginatedUsers.map(user => (
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

                                {/* Approver */}
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

                                {/* Subordinates */}
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

            {/* Desktop Table Layout - Show only on md+ and viewMode === 'table' */}
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
                        {paginatedUsers.map(user => (
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
                                                <Box key={a.level} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Avatar
                                                        src={a.approver.avatar || undefined}
                                                        sx={{ width: 20, height: 20, fontSize: '0.6rem', bgcolor: PRIMARY_COLOR }}
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
                                        <Typography variant="body2" color="text.secondary">-</Typography>
                                    )}
                                </TableCell>
                                <TableCell>
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
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination Controls */}
            {users.length > 0 && (
                <TablePagination
                    component="div"
                    count={users.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="แสดงแถวละ:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} จาก ${count}`}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    sx={{ borderTop: '1px solid #E2E8F0' }}
                />
            )}
        </Box>
    );
}
