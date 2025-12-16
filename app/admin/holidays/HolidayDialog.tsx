'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Typography,
  IconButton,
  alpha,
  useTheme,
  useMediaQuery,
  Autocomplete,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { Calendar, CloseCircle } from 'iconsax-react';
import { useToastr } from '@/app/components/Toastr';
import { useLocale } from '@/app/providers/LocaleProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
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

interface Company {
  id: number;
  code: string;
  name: string;
}

interface HolidayDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  holiday?: Holiday;
}

const holidayKeys = [
  'holiday_new_year',
  'holiday_chinese_new_year',
  'holiday_makha_bucha',
  'holiday_chakri',
  'holiday_songkran',
  'holiday_labor',
  'holiday_coronation',
  'holiday_visakha_bucha',
  'holiday_queen_suthida',
  'holiday_asalha_bucha',
  'holiday_buddhist_lent',
  'holiday_king_rama_10',
  'holiday_queen_mother',
  'holiday_king_rama_9_memorial',
  'holiday_chulalongkorn',
  'holiday_father_day',
  'holiday_constitution',
  'holiday_new_year_eve',
  'holiday_company',
];

export default function HolidayDialog({
  open,
  onClose,
  onSave,
  holiday,
}: HolidayDialogProps) {
  const { t } = useLocale();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const toastr = useToastr();
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dateValue, setDateValue] = useState<Dayjs | null>(null);
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    type: 'company',
    companyId: '',
    deductFromAnnualLeave: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch companies when dialog opens
  useEffect(() => {
    if (open) {
      fetchCompanies();
    }
  }, [open]);

  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const res = await fetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    if (open) {
      if (holiday) {
        setFormData({
          date: holiday.date,
          name: holiday.name,
          type: holiday.type,
          companyId: holiday.companyId?.toString() || '',
          deductFromAnnualLeave: holiday.deductFromAnnualLeave || false,
        });
        setDateValue(dayjs(holiday.date));
      } else {
        setFormData({
          date: '',
          name: '',
          type: 'company',
          companyId: '',
          deductFromAnnualLeave: false,
        });
        setDateValue(null);
      }
      setErrors({});
    }
  }, [open, holiday]);

  const handleChange = (field: string, value: string | boolean) => {
    const processedValue = field === 'deductFromAnnualLeave'
      ? (value === 'true' || value === true)
      : value;
    setFormData((prev) => ({ ...prev, [field]: processedValue }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.date) newErrors.date = 'กรุณาเลือกวันที่';
    if (!formData.name.trim()) newErrors.name = 'กรุณากรอกชื่อวันหยุด';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const url = holiday
        ? `/api/admin/holidays/${holiday.id}`
        : '/api/admin/holidays';
      const method = holiday ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          name: formData.name.trim(),
          type: formData.type,
          companyId: formData.companyId ? parseInt(formData.companyId) : null,
          deductFromAnnualLeave: formData.deductFromAnnualLeave,
        }),
      });

      if (res.ok) {
        toastr.success(holiday ? 'อัปเดตวันหยุดสำเร็จ' : 'เพิ่มวันหยุดสำเร็จ');
        onSave();
      } else {
        const error = await res.json();
        toastr.error(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      toastr.error('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 1,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            pb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={22} color={theme.palette.primary.main} variant="Bold" />
            </Box>
            <Typography variant="h6" fontWeight={600}>
              {holiday ? 'แก้ไขวันหยุด' : 'เพิ่มวันหยุด'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseCircle size={22} color="#9e9e9e" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Date */}
            <DatePicker
              label="วันที่ *"
              value={dateValue}
              onChange={(newValue) => {
                setDateValue(newValue);
                if (newValue && newValue.isValid()) {
                  setFormData((prev) => ({ ...prev, date: newValue.format('YYYY-MM-DD') }));
                  if (errors.date) {
                    setErrors((prev) => ({ ...prev, date: '' }));
                  }
                } else {
                  setFormData((prev) => ({ ...prev, date: '' }));
                }
              }}
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                  error: !!errors.date,
                  helperText: errors.date,
                },
              }}
            />

            {/* Name */}
            <Autocomplete
              freeSolo
              options={holidayKeys}
              getOptionLabel={(option) => t(option)}
              value={formData.name}
              onChange={(_event: any, newValue: string | null) => {
                handleChange('name', newValue || '');
              }}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label={t('name', 'ชื่อวันหยุด *')} // Fallback until I add 'name' to common or just use hardcoded
                  error={!!errors.name}
                  helperText={errors.name}
                  size="small"
                />
              )}
            />

            {/* Type */}
            <FormControl fullWidth size="small">
              <InputLabel>ประเภทวันหยุด</InputLabel>
              <Select
                value={formData.type}
                label="ประเภทวันหยุด"
                onChange={(e) => handleChange('type', e.target.value)}
              >

                <MenuItem value="company">วันหยุดบริษัท</MenuItem>
              </Select>
            </FormControl>

            {/* Company (Optional - for company-specific holidays) */}
            {formData.type === 'company' && (
              <FormControl fullWidth size="small">
                <InputLabel>บริษัท (ถ้าเฉพาะบริษัท)</InputLabel>
                <Select
                  value={formData.companyId}
                  label="บริษัท (ถ้าเฉพาะบริษัท)"
                  onChange={(e) => handleChange('companyId', e.target.value)}
                  disabled={loadingCompanies}
                >
                  <MenuItem value="">
                    <em>ทุกบริษัท</em>
                  </MenuItem>
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id.toString()}>
                      {company.code} - {company.name}
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
                  เลือก &quot;ทุกบริษัท&quot; หากต้องการให้ใช้กับทุกบริษัท
                </Typography>
              </FormControl>
            )}

            {/* บังคับพักร้อน */}
            <FormControlLabel
              control={
                <Switch
                  checked={formData.deductFromAnnualLeave}
                  onChange={(e) => handleChange('deductFromAnnualLeave', e.target.checked ? 'true' : 'false')}
                  color="warning"
                />
              }
              label={
                <Typography variant="body2" fontWeight={500}>
                  บังคับพักร้อน (หักจากวันลาพักร้อน)
                </Typography>
              }
              sx={{ mt: 1 }}
            />

            {formData.deductFromAnnualLeave && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  ระบบจะสร้างใบลาพักร้อนอัตโนมัติสำหรับพนักงานทุกคน{formData.companyId ? ' ในบริษัทที่เลือก' : ''} และหักจากโควตาวันลาพักร้อน
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={onClose} disabled={loading} sx={{ borderRadius: 1 }}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            sx={{
              borderRadius: 1,
              minWidth: 100,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : holiday ? 'บันทึก' : 'เพิ่ม'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
