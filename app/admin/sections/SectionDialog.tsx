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
  ListSubheader,
} from '@mui/material';
import { FolderTree } from 'lucide-react';

interface Department {
  id: number;
  code: string;
  name: string;
  company: string;
}

interface Section {
  id: number;
  code: string;
  name: string;
  departmentId: number;
  isActive: boolean;
  department?: Department;
}

interface SectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  section?: Section;
}

export default function SectionDialog({
  open,
  onClose,
  onSave,
  section,
}: SectionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    departmentId: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (section) {
      setFormData({
        code: section.code || '',
        name: section.name || '',
        departmentId: section.departmentId?.toString() || '',
        isActive: section.isActive ?? true,
      });
    } else {
      setFormData({
        code: '',
        name: '',
        departmentId: '',
        isActive: true,
      });
    }
    setErrors({});
  }, [section, open]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/admin/departments');
      if (res.ok) {
        const data = await res.json();
        // Only get active departments
        setDepartments(data.filter((d: Department & { isActive: boolean }) => d.isActive));
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

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

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) {
      newErrors.code = 'กรุณากรอกรหัสหน่วยงาน';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'กรุณากรอกชื่อหน่วยงาน';
    }
    if (!formData.departmentId) {
      newErrors.departmentId = 'กรุณาเลือกแผนก';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const url = section
        ? `/api/admin/sections/${section.id}`
        : '/api/admin/sections';
      const method = section ? 'PUT' : 'POST';

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

  // Group departments by company
  const groupedDepartments = departments.reduce((acc, dept) => {
    if (!acc[dept.company]) {
      acc[dept.company] = [];
    }
    acc[dept.company].push(dept);
    return acc;
  }, {} as Record<string, Department[]>);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FolderTree size={24} />
        {section ? 'แก้ไขหน่วยงาน' : 'เพิ่มหน่วยงานใหม่'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {errors.submit && (
            <Box sx={{ color: 'error.main', mb: 1 }}>{errors.submit}</Box>
          )}

          <FormControl fullWidth error={!!errors.departmentId} required>
            <InputLabel>แผนก</InputLabel>
            <Select
              name="departmentId"
              value={formData.departmentId}
              onChange={handleSelectChange}
              label="แผนก"
            >
              {Object.entries(groupedDepartments).map(([company, depts]) => [
                <ListSubheader key={company} sx={{ bgcolor: 'background.paper', fontWeight: 600 }}>
                  {company}
                </ListSubheader>,
                ...depts.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id.toString()}>
                    {dept.name} ({dept.code})
                  </MenuItem>
                )),
              ])}
            </Select>
            {errors.departmentId && (
              <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>
                {errors.departmentId}
              </Box>
            )}
          </FormControl>

          <TextField
            label="รหัสหน่วยงาน"
            name="code"
            value={formData.code}
            onChange={handleChange}
            error={!!errors.code}
            helperText={errors.code || 'เช่น SEC001, HR-01, IT-DEV'}
            fullWidth
            required
            inputProps={{ style: { textTransform: 'uppercase' } }}
          />

          <TextField
            label="ชื่อหน่วยงาน"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
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
