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
} from '@mui/material';
import {
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
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
    return { label: 'ปิดใช้งาน', color: 'default', icon: <XCircle size={14} /> };
  }
  
  const now = new Date();
  const start = banner.startDate ? new Date(banner.startDate) : null;
  const end = banner.endDate ? new Date(banner.endDate) : null;
  
  if (start && now < start) {
    return { label: 'รอเปิด', color: 'warning', icon: <Clock size={14} /> };
  }
  if (end && now > end) {
    return { label: 'หมดเวลา', color: 'error', icon: <XCircle size={14} /> };
  }
  
  return { label: 'เปิดใช้งาน', color: 'success', icon: <CheckCircle size={14} /> };
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
              <ImageIcon size={24} />
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
          startIcon={<Plus size={18} />}
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
          icon={<ImageIcon size={26} />}
          color="primary"
          subtitle="ในระบบ"
        />
        <StatCard
          title="กำลังแสดง"
          value={activeBanners}
          icon={<CheckCircle size={26} />}
          color="success"
          subtitle="แสดงอยู่ตอนนี้"
        />
        <StatCard
          title="รอเปิด"
          value={scheduledBanners}
          icon={<Clock size={26} />}
          color="warning"
          subtitle="ตั้งเวลาไว้"
        />
        <StatCard
          title="ปิดใช้งาน"
          value={inactiveBanners}
          icon={<XCircle size={26} />}
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
                  <Search size={18} color={theme.palette.text.secondary} />
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
              <RefreshCw 
                size={20} 
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

      {/* Table */}
      <Fade in={true} timeout={500}>
        <TableContainer 
          component={Paper} 
          sx={{ 
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
                    <ArrowUpDown size={14} />
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
                        <ImageIcon size={40} />
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
                          startIcon={<Plus size={18} />}
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
                            borderRadius: 1,
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
                            <Calendar size={14} color={theme.palette.text.secondary} />
                            <Typography variant="body2" color="text.secondary">
                              เริ่ม: {formatDate(banner.startDate)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Calendar size={14} color={theme.palette.text.secondary} />
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
                              <Pencil size={18} />
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
                              <Trash2 size={18} />
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
