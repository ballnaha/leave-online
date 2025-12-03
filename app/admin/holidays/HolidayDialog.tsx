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
} from '@mui/material';
import { Calendar, CloseCircle } from 'iconsax-react';
import { useToastr } from '@/app/components/Toastr';
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
  isActive: boolean;
}

interface HolidayDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  holiday?: Holiday;
}

export default function HolidayDialog({
  open,
  onClose,
  onSave,
  holiday,
}: HolidayDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const toastr = useToastr();
  const [loading, setLoading] = useState(false);
  const [dateValue, setDateValue] = useState<Dayjs | null>(null);
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    type: 'national',
    companyId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (holiday) {
        setFormData({
          date: holiday.date,
          name: holiday.name,
          type: holiday.type,
          companyId: holiday.companyId?.toString() || '',
        });
        setDateValue(dayjs(holiday.date));
      } else {
        setFormData({
          date: '',
          name: '',
          type: 'national',
          companyId: '',
        });
        setDateValue(null);
      }
      setErrors({});
    }
  }, [open, holiday]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
            borderRadius: isMobile ? 0 : 2,
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
          <FormControl fullWidth size="small" error={!!errors.name}>
            <InputLabel>ชื่อวันหยุด *</InputLabel>
            <Select
              value={formData.name}
              label="ชื่อวันหยุด *"
              onChange={(e) => handleChange('name', e.target.value)}
            >
              <MenuItem value="New Year's Day">วันขึ้นปีใหม่ (New Year's Day)</MenuItem>
              <MenuItem value="Makha Bucha Day">วันมาฆบูชา (Makha Bucha Day)</MenuItem>
              <MenuItem value="Chakri Memorial Day">วันจักรี (Chakri Memorial Day)</MenuItem>
              <MenuItem value="Songkran Festival">วันสงกรานต์ (Songkran Festival)</MenuItem>
              <MenuItem value="Labor Day">วันแรงงานแห่งชาติ (Labor Day)</MenuItem>
              <MenuItem value="Coronation Day">วันฉัตรมงคล (Coronation Day)</MenuItem>
              <MenuItem value="Visakha Bucha Day">วันวิสาขบูชา (Visakha Bucha Day)</MenuItem>
              <MenuItem value="H.M. Queen Suthida's Birthday">วันเฉลิมพระชนมพรรษาพระราชินี (H.M. Queen Suthida's Birthday)</MenuItem>
              <MenuItem value="Asalha Bucha Day">วันอาสาฬหบูชา (Asalha Bucha Day)</MenuItem>
              <MenuItem value="Buddhist Lent Day">วันเข้าพรรษา (Buddhist Lent Day)</MenuItem>
              <MenuItem value="H.M. King Maha Vajiralongkorn's Birthday">วันเฉลิมพระชนมพรรษา ร.10 (H.M. King Maha Vajiralongkorn's Birthday)</MenuItem>
              <MenuItem value="H.M. Queen Sirikit The Queen Mother's Birthday">วันแม่แห่งชาติ (H.M. Queen Sirikit The Queen Mother's Birthday)</MenuItem>
              <MenuItem value="H.M. King Bhumibol Adulyadej The Great Memorial Day">วันคล้ายวันสวรรคต ร.9 (H.M. King Bhumibol Adulyadej The Great Memorial Day)</MenuItem>
              <MenuItem value="Chulalongkorn Day">วันปิยมหาราช (Chulalongkorn Day)</MenuItem>
              <MenuItem value="H.M. King Bhumibol Adulyadej The Great's Birthday">วันพ่อแห่งชาติ (H.M. King Bhumibol Adulyadej The Great's Birthday)</MenuItem>
              <MenuItem value="Constitution Day">วันรัฐธรรมนูญ (Constitution Day)</MenuItem>
              <MenuItem value="New Year's Eve">วันสิ้นปี (New Year's Eve)</MenuItem>
              <MenuItem value="Company Holiday">วันหยุดบริษัท (Company Holiday)</MenuItem>
            </Select>
            {errors.name && <Typography variant="caption" color="error">{errors.name}</Typography>}
          </FormControl>

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
            <TextField
              label="รหัสบริษัท (ถ้าเฉพาะบริษัท)"
              type="number"
              value={formData.companyId}
              onChange={(e) => handleChange('companyId', e.target.value)}
              placeholder="เว้นว่างไว้สำหรับทุกบริษัท"
              size="small"
              fullWidth
              helperText="เว้นว่างไว้หากต้องการให้ใช้กับทุกบริษัท"
            />
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
