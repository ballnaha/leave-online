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
  FormControlLabel,
  Switch,
  CircularProgress,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import { Calendar } from 'iconsax-react';

// ตัวเลือก leave type ที่กำหนดไว้ในระบบ
const leaveTypeOptions = [
  { code: 'sick', name: 'ลาป่วย' },
  { code: 'personal', name: 'ลากิจ' },
  { code: 'vacation', name: 'ลาพักร้อน' },
  { code: 'annual', name: 'ลาพักผ่อนประจำปี' },
  { code: 'maternity', name: 'ลาคลอด' },
  { code: 'ordination', name: 'ลาอุปสมบท' },
  { code: 'military', name: 'ลารับราชการทหาร' },
  { code: 'marriage', name: 'ลาสมรส' },
  { code: 'funeral', name: 'ลางานศพ' },
  { code: 'paternity', name: 'ลาดูแลภรรยาคลอด' },
  { code: 'sterilization', name: 'ลาทำหมัน' },
  { code: 'business', name: 'ลาไปราชการ' },
  { code: 'unpaid', name: 'ลาไม่รับค่าจ้าง' },
  { code: 'other', name: 'อื่นๆ' },
];

interface LeaveType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  maxDaysPerYear: number | null;
  isPaid: boolean;
  isActive: boolean;
}

interface LeaveTypeDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  leaveType?: LeaveType;
}

export default function LeaveTypeDialog({
  open,
  onClose,
  onSave,
  leaveType,
}: LeaveTypeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    maxDaysPerYear: '',
    isPaid: true,
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (leaveType) {
      setFormData({
        code: leaveType.code || '',
        name: leaveType.name || '',
        description: leaveType.description || '',
        maxDaysPerYear: leaveType.maxDaysPerYear?.toString() || '',
        isPaid: leaveType.isPaid ?? true,
        isActive: leaveType.isActive ?? true,
      });
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        maxDaysPerYear: '',
        isPaid: true,
        isActive: true,
      });
    }
    setErrors({});
  }, [leaveType, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) {
      newErrors.code = 'กรุณากรอกรหัสประเภทการลา';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'กรุณากรอกชื่อประเภทการลา';
    }
    if (formData.maxDaysPerYear && isNaN(parseFloat(formData.maxDaysPerYear))) {
      newErrors.maxDaysPerYear = 'กรุณากรอกตัวเลข';
    }
    if (formData.maxDaysPerYear && parseFloat(formData.maxDaysPerYear) < 0) {
      newErrors.maxDaysPerYear = 'จำนวนวันต้องไม่ติดลบ';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const url = leaveType
        ? `/api/admin/leave-types/${leaveType.id}`
        : '/api/admin/leave-types';
      const method = leaveType ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'เกิดข้อผิดพลาด' }));
        throw new Error(data.error || 'เกิดข้อผิดพลาด');
      }

      onSave();
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1,
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        pb: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Calendar size={24} variant="Bold" color="#6C63FF" />
        {leaveType ? 'แก้ไขประเภทการลา' : 'เพิ่มประเภทการลาใหม่'}
      </DialogTitle>
      <DialogContent sx={{ p: 2 }}>
        <Box sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {errors.submit && (
            <Box sx={{ color: 'error.main', mb: 1 }}>{errors.submit}</Box>
          )}

          <FormControl size="small" fullWidth error={!!errors.code} required>
            <InputLabel>รหัสประเภทการลา</InputLabel>
            <Select
              name="code"
              value={formData.code}
              onChange={(e) => {
                const selectedCode = e.target.value;
                const selectedOption = leaveTypeOptions.find(opt => opt.code === selectedCode);
                setFormData((prev) => ({
                  ...prev,
                  code: selectedCode,
                  name: selectedOption?.name || prev.name,
                }));
                if (errors.code) {
                  setErrors((prev) => ({ ...prev, code: '' }));
                }
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: '' }));
                }
              }}
              label="รหัสประเภทการลา"
            >
              {leaveTypeOptions.map((option) => (
                <MenuItem key={option.code} value={option.code}>
                  {option.code.toUpperCase()}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{errors.code || 'เลือกรหัสประเภทการลา'}</FormHelperText>
          </FormControl>

          <FormControl size="small" fullWidth error={!!errors.name} required>
            <InputLabel>ชื่อประเภทการลา</InputLabel>
            <Select
              name="name"
              value={formData.name}
              onChange={(e) => {
                const selectedName = e.target.value;
                const selectedOption = leaveTypeOptions.find(opt => opt.name === selectedName);
                setFormData((prev) => ({
                  ...prev,
                  name: selectedName,
                  code: selectedOption?.code || prev.code,
                }));
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: '' }));
                }
                if (errors.code) {
                  setErrors((prev) => ({ ...prev, code: '' }));
                }
              }}
              label="ชื่อประเภทการลา"
            >
              {leaveTypeOptions.map((option) => (
                <MenuItem key={option.code} value={option.name}>
                  {option.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{errors.name || 'เลือกชื่อประเภทการลา'}</FormHelperText>
          </FormControl>

          <TextField
            label="คำอธิบาย"
            name="description"
            value={formData.description}
            onChange={handleChange}
            multiline
            rows={2}
            size="small"
            fullWidth
          />

          <TextField
            label="จำนวนวันลาสูงสุดต่อปี"
            name="maxDaysPerYear"
            value={formData.maxDaysPerYear}
            onChange={handleChange}
            error={!!errors.maxDaysPerYear}
            helperText={errors.maxDaysPerYear || 'เว้นว่างหากไม่จำกัด'}
            type="number"
            size="small"
            fullWidth
            InputProps={{
              endAdornment: <InputAdornment position="end">วัน</InputAdornment>,
            }}
            inputProps={{ min: 0, step: 0.5 }}
          />

          <Box sx={{ display: 'flex', gap: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPaid}
                  onChange={handleChange}
                  name="isPaid"
                  color="primary"
                />
              }
              label="ได้รับค่าจ้าง"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={handleChange}
                  name="isActive"
                  color="primary"
                />
              }
              label="เปิดใช้งาน"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          ยกเลิก
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
