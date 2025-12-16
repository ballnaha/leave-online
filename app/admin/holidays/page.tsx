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
  Divider,
} from '@mui/material';
import {
  Add,
  Edit2,
  Trash,
  Calendar,
  SearchNormal1,
  Refresh2,
  TickCircle,
  CloseCircle,
  Building,
  Global,
} from 'iconsax-react';
import { Wallet2 } from 'iconsax-react';
import HolidayDialog from './HolidayDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToastr } from '@/app/components/Toastr';
import { useLocale } from '@/app/providers/LocaleProvider';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

interface Holiday {
  id: number;
  date: string;
  name: string;
  type: string;
  companyId?: number | null;
  deductFromAnnualLeave?: boolean;
  isActive: boolean;
}

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

function TableSkeleton() {
  return (
    <TableBody>
      {[1, 2, 3, 4, 5].map((row) => (
        <TableRow key={row}>
          <TableCell><Skeleton variant="text" width={80} /></TableCell>
          <TableCell><Skeleton variant="text" width={150} /></TableCell>
          <TableCell><Skeleton variant="text" width={150} /></TableCell>
          <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
          <TableCell><Skeleton variant="text" width={80} /></TableCell>
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

const typeLabels: Record<string, { label: string; color: 'error' | 'warning' | 'info' | 'success' }> = {
  company: { label: 'วันหยุดบริษัท', color: 'success' },
};

export default function HolidaysPage() {
  const theme = useTheme();
  const { t } = useLocale();
  const toastr = useToastr();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);

  // Fetch available years from database
  const fetchAvailableYears = async () => {
    try {
      const res = await fetch('/api/admin/holidays/years');
      if (res.ok) {
        const years = await res.json();
        setAvailableYears(years);
      }
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/holidays?year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setHolidays(data);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
      toastr.error('ไม่สามารถโหลดข้อมูลวันหยุดได้');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedHoliday(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setDialogOpen(true);
  };

  const handleDelete = (holiday: Holiday) => {
    setHolidayToDelete(holiday);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!holidayToDelete) return;

    try {
      const res = await fetch(`/api/admin/holidays/${holidayToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toastr.success('ลบวันหยุดสำเร็จ');
        fetchHolidays();
      } else {
        toastr.error('ไม่สามารถลบวันหยุดได้');
      }
    } catch (error) {
      toastr.error('เกิดข้อผิดพลาด');
    } finally {
      setDeleteDialogOpen(false);
      setHolidayToDelete(null);
    }
  };

  const filteredHolidays = holidays.filter((h) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t(h.name).toLowerCase().includes(query) ||
      h.date.includes(query)
    );
  });

  // Stats
  const stats = {
    total: holidays.length,
    company: holidays.filter((h) => h.type === 'company').length,
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
            }}
          >
            <Calendar size={24} variant="Bold" color="#6C63FF" />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" fontWeight={700}>
              จัดการวันหยุด
            </Typography>
            <Typography variant="body2" color="text.secondary">
              จัดการวันหยุดราชการและวันหยุดบริษัท
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
        <StatCard
          title="วันหยุดบริษัท"
          value={stats.company}
          icon={<Building size={28} variant="Bold" color="#4CAF50" />}
          color="success"
        />
      </Box>

      {/* Toolbar */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 1,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
          <TextField
            placeholder="ค้นหาวันหยุด..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchNormal1 size={18} color="#6C63FF" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>ปี</InputLabel>
            <Select
              value={selectedYear}
              label="ปี"
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {availableYears.map((year) => (
                <MenuItem key={year} value={year}>
                  {year + 543}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh2 size={18} color="#6C63FF" />}
            onClick={fetchHolidays}
            sx={{ borderRadius: 1 }}
          >
            รีเฟรช
          </Button>
          <Button
            variant="contained"
            startIcon={<Add size={18} color="#fff" />}
            onClick={handleAdd}
            sx={{
              borderRadius: 1,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            เพิ่มวันหยุด
          </Button>
        </Box>
      </Paper>

      {/* Mobile Card View (Visible on xs, sm) */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={150} sx={{ borderRadius: 1 }} />
          ))
        ) : filteredHolidays.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Calendar size={48} variant="Bulk" color={theme.palette.text.disabled} />
              <Typography color="text.secondary">
                {searchQuery ? 'ไม่พบวันหยุดที่ค้นหา' : 'ยังไม่มีวันหยุดในปีนี้'}
              </Typography>
              {!searchQuery && (
                <Button
                  variant="contained"
                  startIcon={<Add size={18} color={theme.palette.common.white} />}
                  onClick={handleAdd}
                  sx={{ mt: 2, borderRadius: 1 }}
                >
                  เพิ่มวันหยุด
                </Button>
              )}
            </Box>
          </Paper>
        ) : (
          filteredHolidays.map((holiday) => {
            const typeInfo = typeLabels[holiday.type] || typeLabels.national;
            const holidayDate = dayjs(holiday.date);
            const isPast = holidayDate.isBefore(dayjs(), 'day');

            return (
              <Paper
                key={holiday.id}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  opacity: isPast ? 0.6 : 1,
                }}
              >
                {/* Card Header: Date & Name */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Typography
                      sx={{ fontWeight: 700, fontSize: '1.2rem', color: 'error.main', lineHeight: 1 }}
                    >
                      {holidayDate.date()}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'error.main' }}>
                      {holidayDate.locale('th').format('MMM')}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {t(holiday.name)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {holidayDate.locale('th').format('dddd')}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ borderStyle: 'dashed' }} />

                {/* Details */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">ประเภท</Typography>
                    <Chip
                      label={typeInfo.label}
                      color={typeInfo.color}
                      size="small"
                      sx={{ fontWeight: 500, height: 24 }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">ขอบเขต</Typography>
                    {holiday.companyId ? (
                      <Chip
                        icon={<Building size={14} color="#F57C00" />}
                        label="เฉพาะบริษัท"
                        size="small"
                        variant="outlined"
                        color="warning"
                        sx={{ height: 24, '& .MuiChip-icon': { color: 'inherit' } }}
                      />
                    ) : (
                      <Chip
                        icon={<Global size={14} color="#6C63FF" />}
                        label="ทุกบริษัท"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 24, '& .MuiChip-icon': { color: 'inherit' } }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Forced Annual Leave Badge */}
                {holiday.deductFromAnnualLeave && (
                  <Chip
                    icon={<Wallet2 size={14} color="#D32F2F" />}
                    label="บังคับพักร้อน (หักจากวันลา)"
                    size="small"
                    color="error"
                    variant="outlined"
                    sx={{
                      mt: 1,
                      height: 24,
                      fontWeight: 500,
                      '& .MuiChip-icon': { color: 'inherit' }
                    }}
                  />
                )}

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
                  <Button
                    fullWidth
                    size="small"
                    variant="outlined"
                    startIcon={<Edit2 size={16} color={theme.palette.primary.main} />}
                    onClick={() => handleEdit(holiday)}
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
                    onClick={() => handleDelete(holiday)}
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
      <Fade in>
        <TableContainer
          component={Paper}
          sx={{
            display: { xs: 'none', md: 'block' },
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <TableCell sx={{ fontWeight: 600 }}>วันที่</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>ชื่อวันหยุด</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>ประเภท</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>ขอบเขต</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>หักพักร้อน</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>จัดการ</TableCell>
              </TableRow>
            </TableHead>
            {loading ? (
              <TableSkeleton />
            ) : (
              <TableBody>
                {filteredHolidays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={48} color={theme.palette.text.disabled} variant="Bulk" />
                        <Typography color="text.secondary" sx={{ mt: 2 }}>
                          {searchQuery ? 'ไม่พบวันหยุดที่ค้นหา' : 'ยังไม่มีวันหยุดในปีนี้'}
                        </Typography>
                        {!searchQuery && (
                          <Button
                            variant="contained"
                            startIcon={<Add size={18} color={theme.palette.common.white} />}
                            onClick={handleAdd}
                            sx={{ mt: 2, borderRadius: 1 }}
                          >
                            เพิ่มวันหยุด
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHolidays.map((holiday) => {
                    const typeInfo = typeLabels[holiday.type] || typeLabels.national;
                    const holidayDate = dayjs(holiday.date);
                    const isPast = holidayDate.isBefore(dayjs(), 'day');

                    return (
                      <TableRow
                        key={holiday.id}
                        sx={{
                          opacity: isPast ? 0.6 : 1,
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 1,
                                bgcolor: alpha(theme.palette.error.main, 0.1),
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Typography
                                sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'error.main', lineHeight: 1 }}
                              >
                                {holidayDate.date()}
                              </Typography>
                              <Typography sx={{ fontSize: '0.65rem', color: 'error.main' }}>
                                {holidayDate.locale('th').format('MMM')}
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {holidayDate.locale('th').format('dddd')}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={500}>{t(holiday.name)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={typeInfo.label}
                            color={typeInfo.color}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>
                          {holiday.companyId ? (
                            <Chip
                              icon={<Building size={14} color="#F57C00" />}
                              label="เฉพาะบริษัท"
                              size="small"
                              variant="outlined"
                              color="warning"
                              sx={{ '& .MuiChip-icon': { color: 'inherit' } }}
                            />
                          ) : (
                            <Chip
                              icon={<Global size={14} color="#6C63FF" />}
                              label="ทุกบริษัท"
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ '& .MuiChip-icon': { color: 'inherit' } }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {holiday.deductFromAnnualLeave ? (
                            <Chip
                              icon={<Wallet2 size={14} color="#D32F2F" />}
                              label="หักพักร้อน"
                              size="small"
                              color="error"
                              variant="outlined"
                              sx={{ fontWeight: 500, '& .MuiChip-icon': { color: 'inherit' } }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.disabled">-</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(holiday)}
                              sx={{
                                color: 'primary.main',
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                              }}
                            >
                              <Edit2 size={18} color={theme.palette.primary.main} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(holiday)}
                              sx={{
                                color: 'error.main',
                                '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) },
                              }}
                            >
                              <Trash size={18} color={theme.palette.error.main} />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            )}
          </Table>
        </TableContainer>
      </Fade>

      {/* Holiday Dialog */}
      <HolidayDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={() => {
          setDialogOpen(false);
          fetchHolidays();
          fetchAvailableYears(); // Refresh years in case a new year was added
        }}
        holiday={selectedHoliday}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="ยืนยันการลบ"
        message={`ต้องการลบวันหยุด "${t(holidayToDelete?.name || '')}" หรือไม่?`}
        onConfirm={confirmDelete}
        onClose={() => {
          setDeleteDialogOpen(false);
          setHolidayToDelete(null);
        }}
        type="delete"
      />
    </Box>
  );
}
