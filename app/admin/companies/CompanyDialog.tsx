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
} from '@mui/material';
import { Building2 } from 'lucide-react';

interface Company {
  id: number;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
}

interface CompanyDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  company?: Company;
}

export default function CompanyDialog({
  open,
  onClose,
  onSave,
  company,
}: CompanyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (company) {
      setFormData({
        code: company.code || '',
        name: company.name || '',
        address: company.address || '',
        phone: company.phone || '',
        isActive: company.isActive ?? true,
      });
    } else {
      setFormData({
        code: '',
        name: '',
        address: '',
        phone: '',
        isActive: true,
      });
    }
    setErrors({});
  }, [company, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) {
      newErrors.code = 'กรุณากรอกรหัสบริษัท';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'กรุณากรอกชื่อบริษัท';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const url = company
        ? `/api/admin/companies/${company.id}`
        : '/api/admin/companies';
      const method = company ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
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
        <Building2 size={24} />
        {company ? 'แก้ไขบริษัท' : 'เพิ่มบริษัทใหม่'}
      </DialogTitle>
      <DialogContent sx={{ p: 2 , mt:2 }}>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {errors.submit && (
            <Box sx={{ color: 'error.main', mb: 1 }}>{errors.submit}</Box>
          )}

          <TextField
            label="รหัสบริษัท"
            name="code"
            value={formData.code}
            onChange={handleChange}
            error={!!errors.code}
            helperText={errors.code || 'เช่น PSC, PS'}
            size="small"
            fullWidth
            required
          />

          <TextField
            label="ชื่อบริษัท"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            size="small"
            fullWidth
            required
          />

          <TextField
            label="ที่อยู่"
            name="address"
            value={formData.address}
            onChange={handleChange}
            size="small"
            fullWidth
            multiline
            rows={2}
          />

          <TextField
            label="เบอร์โทรศัพท์"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            size="small"
            fullWidth
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
