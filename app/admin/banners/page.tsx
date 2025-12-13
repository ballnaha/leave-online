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
  Image,
  SearchNormal1,
  Refresh2,
  TickCircle,
  CloseCircle,
  Calendar,
  Clock,
  ArrangeVertical,
} from 'iconsax-react';
import BannerDialog from './BannerDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToastr } from '@/app/components/Toastr';

interface Banner {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  startDate?: string;
  endDate?: string;
  displayOrder: number;
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
          <TableCell><Skeleton variant="rounded" width={80} height={45} /></TableCell>
          <TableCell><Skeleton variant="text" width={150} /></TableCell>
          <TableCell><Skeleton variant="text" width={120} /></TableCell>
          <TableCell><Skeleton variant="text" width={50} /></TableCell>
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

// Helper function to check if banner is currently active
function isBannerCurrentlyActive(banner: Banner): boolean {
  if (!banner.isActive) return false;

  const now = new Date();
  const start = banner.startDate ? new Date(banner.startDate) : null;
  const end = banner.endDate ? new Date(banner.endDate) : null;

  if (start && now < start) return false;
  if (end && now > end) return false;

  return true;
}

// Helper function to get banner status
function getBannerStatus(banner: Banner): { label: string; color: 'success' | 'warning' | 'error' | 'default'; icon: React.ReactNode } {
  if (!banner.isActive) {
    return { label: 'ปิดใช้งาน', color: 'default', icon: <CloseCircle size={14} variant="Bold" color="#9e9e9e" /> };
  }

  const now = new Date();
  const start = banner.startDate ? new Date(banner.startDate) : null;
  const end = banner.endDate ? new Date(banner.endDate) : null;

  if (start && now < start) {
    return { label: 'รอเปิด', color: 'warning', icon: <Clock size={14} variant="Bold" color="#ed6c02" /> };
  }
  if (end && now > end) {
    return { label: 'หมดเวลา', color: 'error', icon: <CloseCircle size={14} variant="Bold" color="#d32f2f" /> };
  }

  return { label: 'เปิดใช้งาน', color: 'success', icon: <TickCircle size={14} variant="Bold" color="#2e7d32" /> };
}

// Format date for display
function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BannersPage() {
  const theme = useTheme();
  const toastr = useToastr();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<Banner | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/banners');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch banners');
      }
      const data = await res.json();
      setBanners(data);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleCreate = () => {
    setSelectedBanner(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (banner: Banner) => {
    setSelectedBanner(banner);
    setDialogOpen(true);
  };

  const handleDelete = (banner: Banner) => {
    setDeleteTarget(banner);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/banners/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toastr.success('ลบ Banner สำเร็จ');
      fetchBanners();
    } catch (err: any) {
      toastr.error(err.message || 'เกิดข้อผิดพลาดในการลบ Banner');
    } finally {
      setDeleteLoading(false);
      setConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleSave = () => {
    setDialogOpen(false);
    toastr.success(selectedBanner ? 'แก้ไข Banner สำเร็จ' : 'เพิ่ม Banner สำเร็จ');
    fetchBanners();
  };

  // Filter banners based on search
  const filteredBanners = banners.filter(
    (banner) =>
      banner.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      banner.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const activeBanners = banners.filter((b) => isBannerCurrentlyActive(b)).length;
  const scheduledBanners = banners.filter((b) => {
    if (!b.isActive) return false;
    const now = new Date();
    const start = b.startDate ? new Date(b.startDate) : null;
    return start && now < start;
  }).length;
  const inactiveBanners = banners.filter((b) => !b.isActive).length;

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
              <Image size={24} variant="Bold" color={theme.palette.primary.main} />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={700}>
                จัดการ Banner/ข่าวสาร
              </Typography>
              <Typography variant="body2" color="text.secondary">
                เพิ่ม แก้ไข และจัดการ Banner สไลด์ข่าวสาร พร้อมตั้งเวลาเปิด-ปิด
              </Typography>
            </Box>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add size={18} color="white" />}
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
          เพิ่ม Banner
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <StatCard
          title="Banner ทั้งหมด"
          value={banners.length}
          icon={<Image size={26} variant="Bold" color={theme.palette.primary.main} />}
          color="primary"
          subtitle="ในระบบ"
        />
        <StatCard
          title="กำลังแสดง"
          value={activeBanners}
          icon={<TickCircle size={26} variant="Bold" color={theme.palette.success.main} />}
          color="success"
          subtitle="แสดงอยู่ตอนนี้"
        />
        <StatCard
          title="รอเปิด"
          value={scheduledBanners}
          icon={<Clock size={26} variant="Bold" color={theme.palette.warning.main} />}
          color="warning"
          subtitle="ตั้งเวลาไว้"
        />
        <StatCard
          title="ปิดใช้งาน"
          value={inactiveBanners}
          icon={<CloseCircle size={26} variant="Bold" color={theme.palette.secondary.main} />}
          color="secondary"
          subtitle="ไม่ได้แสดง"
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
            placeholder="ค้นหา Banner..."
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
                  <SearchNormal1 size={18} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
            }}
          />
          <Chip
            label={`${filteredBanners.length} รายการ`}
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              fontWeight: 600,
            }}
          />
          <Tooltip title="รีเฟรชข้อมูล">
            <IconButton
              onClick={fetchBanners}
              disabled={loading}
              sx={{
                bgcolor: 'background.default',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
              }}
            >
              <Refresh2
                size={20}
                color={theme.palette.primary.main}
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
            <Skeleton key={i} variant="rounded" height={200} sx={{ borderRadius: 1 }} />
          ))
        ) : filteredBanners.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Image size={48} variant="Bold" color={theme.palette.text.disabled} />
              <Typography variant="body1" fontWeight={600} color="text.secondary">
                {searchQuery ? 'ไม่พบ Banner ที่ค้นหา' : 'ยังไม่มี Banner'}
              </Typography>
            </Box>
          </Paper>
        ) : (
          filteredBanners.map((banner) => {
            const status = getBannerStatus(banner);
            return (
              <Paper
                key={banner.id}
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
                {/* Image */}
                <Box
                  component="img"
                  src={banner.imageUrl}
                  alt={banner.title}
                  sx={{
                    width: '100%',
                    height: 160,
                    objectFit: 'cover',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />

                {/* Content */}
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    {banner.title}
                  </Typography>
                  {banner.description && (
                    <Typography variant="body2" color="text.secondary" noWrap gutterBottom>
                      {banner.description}
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ borderStyle: 'dashed' }} />

                {/* Details */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">ลำดับการแสดง</Typography>
                    <Chip
                      label={banner.displayOrder}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.info.main, 0.1),
                        color: 'info.main',
                        fontWeight: 600,
                        height: 24
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">สถานะ</Typography>
                    <Chip
                      icon={status.icon as React.ReactElement}
                      label={status.label}
                      size="small"
                      color={status.color}
                      variant="outlined"
                      sx={{ height: 24, '& .MuiChip-icon': { color: 'inherit' } }}
                    />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Calendar size={14} color={theme.palette.primary.main} />
                    <Typography variant="caption" color="text.secondary">
                      เริ่ม: {formatDate(banner.startDate)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Calendar size={14} color={theme.palette.error.main} />
                    <Typography variant="caption" color="text.secondary">
                      สิ้นสุด: {formatDate(banner.endDate)}
                    </Typography>
                  </Box>
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
                  <Button
                    fullWidth
                    size="small"
                    variant="outlined"
                    startIcon={<Edit2 size={16} color={theme.palette.primary.main} />}
                    onClick={() => handleEdit(banner)}
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
                    onClick={() => handleDelete(banner)}
                    sx={{ borderRadius: 1 }}
                  >
                    ลบ
                  </Button>
                </Box>
              </Paper>
            );
          })
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
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, width: 100 }}>รูปภาพ</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>ชื่อ Banner</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>ช่วงเวลาแสดง</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, width: 80 }} align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <ArrangeVertical size={14} color={theme.palette.text.secondary} />
                    ลำดับ
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }} align="center">สถานะ</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }} align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            {loading ? (
              <TableSkeleton />
            ) : filteredBanners.length === 0 ? (
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
                        <Image size={40} variant="Bold" color={theme.palette.text.secondary} />
                      </Avatar>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          {searchQuery ? 'ไม่พบ Banner ที่ค้นหา' : 'ยังไม่มี Banner'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {searchQuery
                            ? 'ลองค้นหาด้วยคำค้นอื่น'
                            : 'เริ่มต้นใช้งานโดยการเพิ่ม Banner ใหม่'}
                        </Typography>
                      </Box>
                      {!searchQuery && (
                        <Button
                          variant="contained"
                          startIcon={<Add size={18} color={theme.palette.common.white} />}
                          onClick={handleCreate}
                          sx={{ mt: 1, borderRadius: 1 }}
                        >
                          เพิ่ม Banner แรก
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : (
              <TableBody>
                {filteredBanners.map((banner) => {
                  const status = getBannerStatus(banner);
                  return (
                    <TableRow
                      key={banner.id}
                      sx={{
                        transition: 'background-color 0.2s ease',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.04),
                        },
                        '&:last-child td': { border: 0 },
                      }}
                    >
                      <TableCell>
                        <Box
                          component="img"
                          src={banner.imageUrl}
                          alt={banner.title}
                          sx={{
                            width: 80,
                            height: 45,
                            objectFit: 'cover',
                            borderRadius: 0.25,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {banner.title}
                        </Typography>
                        {banner.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              maxWidth: 250,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {banner.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Calendar size={14} color={theme.palette.primary.main} />
                            <Typography variant="body2" color="text.secondary">
                              เริ่ม: {formatDate(banner.startDate)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Calendar size={14} color={theme.palette.error.main} />
                            <Typography variant="body2" color="text.secondary">
                              สิ้นสุด: {formatDate(banner.endDate)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={banner.displayOrder}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            minWidth: 40,
                            bgcolor: alpha(theme.palette.info.main, 0.1),
                            color: 'info.main',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={status.icon as React.ReactElement}
                          label={status.label}
                          size="small"
                          color={status.color}
                          sx={{
                            fontWeight: 500,
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
                              onClick={() => handleEdit(banner)}
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
                              onClick={() => handleDelete(banner)}
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
                  );
                })}
              </TableBody>
            )}
          </Table>
        </TableContainer>
      </Fade>

      {/* Banner Dialog */}
      <BannerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        banner={selectedBanner}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ Banner"
        message={`คุณต้องการลบ Banner "${deleteTarget?.title}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
        type="delete"
        confirmText="ลบ"
        loading={deleteLoading}
      />
    </Box>
  );
}
