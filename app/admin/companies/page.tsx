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
  IconButton,
  Chip,
  CircularProgress,
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
  Divider,
} from '@mui/material';
import {
  Add,
  Edit2,
  Trash,
  Building,
  SearchNormal1,
  Call,
  Location,
  Refresh2,
  TickCircle,
  CloseCircle,
} from 'iconsax-react';
import CompanyDialog from './CompanyDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToastr } from '@/app/components/Toastr';

interface Company {
  id: number;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
          <TableCell><Skeleton variant="rounded" width={60} height={24} /></TableCell>
          <TableCell><Skeleton variant="text" width={150} /></TableCell>
          <TableCell><Skeleton variant="text" width={200} /></TableCell>
          <TableCell><Skeleton variant="text" width={100} /></TableCell>
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

export default function CompaniesPage() {
  const theme = useTheme();
  const toastr = useToastr();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/companies');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch companies');
      }
      const data = await res.json();
      setCompanies(data);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreate = () => {
    setSelectedCompany(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setDialogOpen(true);
  };

  const handleDelete = (company: Company) => {
    setDeleteTarget(company);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/companies/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toastr.success('ลบบริษัทสำเร็จ');
      fetchCompanies();
    } catch (err: any) {
      toastr.error(err.message || 'เกิดข้อผิดพลาดในการลบบริษัท');
    } finally {
      setDeleteLoading(false);
      setConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleSave = () => {
    setDialogOpen(false);
    toastr.success(selectedCompany ? 'แก้ไขบริษัทสำเร็จ' : 'เพิ่มบริษัทสำเร็จ');
    fetchCompanies();
  };

  // Filter companies based on search
  const filteredCompanies = companies.filter(
    (company) =>
      company.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const activeCompanies = companies.filter((c) => c.isActive).length;
  const inactiveCompanies = companies.filter((c) => !c.isActive).length;

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
              <Building size={24} variant="Bold" color="#6C63FF" />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={700}>
                จัดการบริษัท
              </Typography>
              <Typography variant="body2" color="text.secondary">
                เพิ่ม แก้ไข และจัดการข้อมูลบริษัทในระบบ
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
          เพิ่มบริษัท
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
        <StatCard
          title="บริษัททั้งหมด"
          value={companies.length}
          icon={<Building size={26} variant="Bold" color="#6C63FF" />}
          color="primary"
          subtitle="ในระบบ"
        />
        <StatCard
          title="เปิดใช้งาน"
          value={activeCompanies}
          icon={<TickCircle size={26} variant="Bold" color="#22C55E" />}
          color="success"
          subtitle="พร้อมใช้งาน"
        />
        <StatCard
          title="ปิดใช้งาน"
          value={inactiveCompanies}
          icon={<CloseCircle size={26} variant="Bold" color="#64748B" />}
          color="secondary"
          subtitle="ไม่ได้ใช้งาน"
        />
      </Box>

      {/* Search & Actions */}
      <Paper
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="ค้นหาบริษัท..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              flex: 1,
              minWidth: 200,
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
                  <SearchNormal1 size={18} color="#6C63FF" />
                </InputAdornment>
              ),
            }}
          />
          <Chip
            label={`${filteredCompanies.length} รายการ`}
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              fontWeight: 600,
            }}
          />
          <Tooltip title="รีเฟรชข้อมูล">
            <IconButton
              onClick={fetchCompanies}
              disabled={loading}
              sx={{
                bgcolor: 'background.default',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
              }}
            >
              <Refresh2
                size={20}
                color="#6C63FF"
                style={{
                  transition: 'transform 0.3s ease',
                  transform: loading ? 'rotate(360deg)' : 'rotate(0deg)',
                }}
              />
            </IconButton>
          </Tooltip>
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
            <Skeleton key={i} variant="rounded" height={180} sx={{ borderRadius: 1 }} />
          ))
        ) : filteredCompanies.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Building size={48} variant="Bold" color={theme.palette.text.disabled} />
              <Typography variant="body1" fontWeight={600} color="text.secondary">
                {searchQuery ? 'ไม่พบบริษัทที่ค้นหา' : 'ยังไม่มีข้อมูลบริษัท'}
              </Typography>
            </Box>
          </Paper>
        ) : (
          filteredCompanies.map((company) => (
            <Paper
              key={company.id}
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
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {company.name}
                    </Typography>
                    <Chip
                      label={company.code}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              {/* Details */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Location size={16} color={theme.palette.text.secondary} />
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {company.address || '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Call size={16} color={theme.palette.text.secondary} />
                  <Typography variant="body2" color="text.secondary">
                    {company.phone || '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">สถานะ:</Typography>
                  <Chip
                    icon={company.isActive
                      ? <TickCircle size={14} color={theme.palette.success.main} />
                      : <CloseCircle size={14} color={theme.palette.text.secondary} />
                    }
                    label={company.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    size="small"
                    sx={{
                      height: 24,
                      fontWeight: 500,
                      bgcolor: company.isActive
                        ? alpha(theme.palette.success.main, 0.1)
                        : alpha(theme.palette.text.secondary, 0.1),
                      color: company.isActive
                        ? theme.palette.success.main
                        : 'text.secondary',
                      '& .MuiChip-icon': { color: 'inherit' },
                    }}
                  />
                </Box>
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  startIcon={<Edit2 size={16} color={theme.palette.primary.main} />}
                  onClick={() => handleEdit(company)}
                  sx={{ borderRadius: 1 }}
                >
                  แก้ไข
                </Button>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<Trash size={16} color={theme.palette.error.main} />}
                  onClick={() => handleDelete(company)}
                  sx={{ borderRadius: 1 }}
                >
                  ลบ
                </Button>
              </Box>
            </Paper>
          ))
        )}
      </Box>

      {/* Table (Hidden on mobile) */}
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
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>รหัส</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>ชื่อบริษัท</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>ที่อยู่</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>เบอร์โทร</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }} align="center">สถานะ</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }} align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            {loading ? (
              <TableSkeleton />
            ) : filteredCompanies.length === 0 ? (
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
                        <Building size={40} variant="Bold" color={theme.palette.text.secondary} />
                      </Avatar>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          {searchQuery ? 'ไม่พบบริษัทที่ค้นหา' : 'ยังไม่มีข้อมูลบริษัท'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {searchQuery
                            ? 'ลองค้นหาด้วยคำค้นอื่น'
                            : 'เริ่มต้นใช้งานโดยการเพิ่มบริษัทใหม่'}
                        </Typography>
                      </Box>
                      {!searchQuery && (
                        <Button
                          variant="contained"
                          startIcon={<Add size={18} color="#fff" />}
                          onClick={handleCreate}
                          sx={{ mt: 1, borderRadius: 1 }}
                        >
                          เพิ่มบริษัทแรก
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : (
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow
                    key={company.id}
                    sx={{
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                      },
                      '&:last-child td': { border: 0 },
                    }}
                  >
                    <TableCell>
                      <Chip
                        label={company.code}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                          borderRadius: 1,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {company.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {company.address ? (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                          <Location size={16} color={theme.palette.text.secondary} style={{ marginTop: 2, flexShrink: 0 }} />
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              maxWidth: 220,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {company.address}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {company.phone ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Call size={16} color={theme.palette.text.secondary} />
                          <Typography variant="body2">{company.phone}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={company.isActive
                          ? <TickCircle size={14} color={theme.palette.success.main} />
                          : <CloseCircle size={14} color={theme.palette.text.secondary} />
                        }
                        label={company.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        size="small"
                        sx={{
                          fontWeight: 500,
                          bgcolor: company.isActive
                            ? alpha(theme.palette.success.main, 0.1)
                            : alpha(theme.palette.text.secondary, 0.1),
                          color: company.isActive
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
                        <Tooltip title="แก้ไข">
                          <IconButton
                            onClick={() => handleEdit(company)}
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
                            onClick={() => handleDelete(company)}
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

      {/* Company Dialog */}
      <CompanyDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        company={selectedCompany}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบบริษัท"
        message={`คุณต้องการลบบริษัท "${deleteTarget?.name}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
        type="delete"
        confirmText="ลบ"
        loading={deleteLoading}
      />
    </Box>
  );
}
