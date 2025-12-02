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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Typography,
} from '@mui/material';
import { Layers } from 'lucide-react';

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
  isActive: boolean;
}

interface DepartmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  department?: Department;
}

// Prefix mapping for each company
const COMPANY_PREFIXES: Record<string, string> = {
  'PSC': '2',   // พูนทรัพย์แคน
  'PS': '3', // พูนทรัพย์โลหะการพิมพ์
};

const getCompanyPrefix = (companyCode: string): string => {
  return COMPANY_PREFIXES[companyCode] || '';
};

export default function DepartmentDialog({
  open,
  onClose,
  onSave,
  department,
}: DepartmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    company: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (department) {
      setFormData({
        code: department.code || '',
        name: department.name || '',
        company: department.company || '',
        isActive: department.isActive ?? true,
      });
    } else {
      setFormData({
        code: '',
        name: '',
        company: '',
        isActive: true,
      });
    }
    setErrors({});
  }, [department, open]);

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies');
      if (!res.ok) throw new Error('Failed to fetch companies');
      const data = await res.json();
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    
    // ป้องกันการลบ prefix ออกจากรหัสฝ่าย
    if (name === 'code' && formData.company) {
      const prefix = getCompanyPrefix(formData.company);
      // ถ้าค่าใหม่ไม่ขึ้นต้นด้วย prefix ให้ใส่ prefix กลับไป
      if (prefix && !value.startsWith(prefix)) {
        // ถ้าพยายามลบ prefix ออก ให้คง prefix ไว้
        const newValue = prefix + value.replace(/^\d*/, '');
        setFormData((prev) => ({
          ...prev,
          [name]: newValue || prefix,
        }));
        return;
      }
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    
    if (name === 'company') {
      const prefix = getCompanyPrefix(value);
      // ถ้าเป็นการสร้างใหม่ ให้ใส่ prefix อัตโนมัติ
      if (!department) {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          code: prefix,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) {
      newErrors.code = 'กรุณากรอกรหัสแผนก';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'กรุณากรอกชื่อแผนก';
    }
    if (!formData.company) {
      newErrors.company = 'กรุณาเลือกบริษัท';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const url = department
        ? `/api/admin/departments/${department.id}`
        : '/api/admin/departments';
      const method = department ? 'PUT' : 'POST';

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
        <Layers size={24} />
        {department ? 'แก้ไขฝ่าย' : 'เพิ่มฝ่ายใหม่'}
      </DialogTitle>
      <DialogContent sx={{ p: 2 ,mt:2 }}>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {errors.submit && (
            <Box sx={{ color: 'error.main', mb: 1 }}>{errors.submit}</Box>
          )}

          <FormControl size="small" fullWidth error={!!errors.company} required>
            <InputLabel>บริษัท</InputLabel>
            <Select
              name="company"
              value={formData.company}
              onChange={handleSelectChange}
              label="บริษัท"
            >
              {companies.map((company) => (
                <MenuItem key={company.id} value={company.code}>
                  {company.name} ({company.code})
                </MenuItem>
              ))}
            </Select>
            {errors.company && (
              <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>
                {errors.company}
              </Box>
            )}
          </FormControl>

          <TextField
            label="รหัสฝ่าย"
            name="code"
            value={formData.code}
            onChange={handleChange}
            error={!!errors.code}
            helperText={errors.code || `เช่น ${getCompanyPrefix(formData.company) || '?'}1100, ${getCompanyPrefix(formData.company) || '?'}3800 (ขึ้นต้นด้วย ${getCompanyPrefix(formData.company) || 'เลือกบริษัทก่อน'})`}
            size="small"
            fullWidth
            required
            InputProps={{
              startAdornment: formData.company ? (
                <InputAdornment position="start">
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'primary.main', 
                      fontWeight: 600,
                      bgcolor: 'primary.50',
                      px: 1,
                      py: 0.25,
                      borderRadius: 0.5,
                      mr: 0.5,
                    }}
                  >
                    {formData.company === 'PSC' ? 'PSC' : 'PS'}
                  </Typography>
                </InputAdornment>
              ) : null,
            }}
          />

          <TextField
            label="ชื่อฝ่าย"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            size="small"
            fullWidth
            required
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
