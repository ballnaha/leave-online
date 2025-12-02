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
  Chip,
  alpha,
  useTheme,
  InputAdornment,
  Typography,
} from '@mui/material';
import { FolderTree, Building2 } from 'lucide-react';

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
  const theme = useTheme();
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
      if (!res.ok) throw new Error('Failed to fetch departments');
      const data = await res.json();
      // Only get active departments
      setDepartments(data.filter((d: Department & { isActive: boolean }) => d.isActive));
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    
    // ป้องกันการลบ prefix ออกจากรหัสแผนก
    if (name === 'code') {
      const company = getSelectedCompany();
      if (company) {
        const prefix = getCompanyPrefix(company);
        // ถ้าค่าใหม่ไม่ขึ้นต้นด้วย prefix ให้ใส่ prefix กลับไป
        if (prefix && !value.startsWith(prefix)) {
          const newValue = prefix + value.replace(/^\d*/, '');
          setFormData((prev) => ({
            ...prev,
            [name]: newValue || prefix,
          }));
          return;
        }
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
    
    if (name === 'departmentId') {
      // หา company จาก department ที่เลือก
      const selectedDept = departments.find(d => d.id.toString() === value);
      const company = selectedDept?.company || '';
      const prefix = getCompanyPrefix(company);
      
      // ถ้าเป็นการสร้างใหม่ ให้ใส่ prefix อัตโนมัติ
      if (!section) {
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

  // Company display config
  const companyConfig: Record<string, { name: string; color: string }> = {
    'PSC': { name: 'พูนทรัพย์แคน (PSC)', color: theme.palette.primary.main },
    'PS': { name: 'พูนทรัพย์โลหะภัณฑ์ (PS)', color: theme.palette.secondary.main },
  };

  // Prefix mapping for each company
  const COMPANY_PREFIXES: Record<string, string> = {
    'PSC': '2',  // พูนทรัพย์แคน
    'PS': '3',   // พูนทรัพย์โลหะภัณฑ์
  };

  // Get company from selected department
  const getSelectedCompany = (): string => {
    if (!formData.departmentId) return '';
    const dept = departments.find(d => d.id.toString() === formData.departmentId);
    return dept?.company || '';
  };

  const getCompanyPrefix = (company: string): string => {
    return COMPANY_PREFIXES[company] || '';
  };

  // Company order
  const companyOrder = ['PSC', 'PS'];

  // Group departments by company
  const groupedDepartments = departments.reduce((acc, dept) => {
    if (!acc[dept.company]) {
      acc[dept.company] = [];
    }
    acc[dept.company].push(dept);
    return acc;
  }, {} as Record<string, Department[]>);

  // Sort companies by order
  const sortedCompanies = companyOrder.filter(c => groupedDepartments[c]);

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
        <FolderTree size={24} />
        {section ? 'แก้ไขแผนก' : 'เพิ่มแผนกใหม่'}
      </DialogTitle>
      <DialogContent sx={{ p: 2 , mt:2}}>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {errors.submit && (
            <Box sx={{ color: 'error.main', mb: 1 }}>{errors.submit}</Box>
          )}

          <FormControl size="small" fullWidth error={!!errors.departmentId} required>
            <InputLabel>ฝ่าย</InputLabel>
            <Select
              name="departmentId"
              value={formData.departmentId}
              onChange={handleSelectChange}
              label="ฝ่าย"
              MenuProps={{
                PaperProps: {
                  sx: { maxHeight: 400 }
                }
              }}
            >
              {sortedCompanies.map((company, index) => {
                const config = companyConfig[company] || { name: company, color: theme.palette.grey[600] };
                const depts = groupedDepartments[company] || [];
                
                return [
                  <ListSubheader 
                    key={company} 
                    sx={{ 
                      bgcolor: alpha(config.color, 0.08),
                      borderLeft: `4px solid ${config.color}`,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      py: 1.5,
                      lineHeight: 1.5,
                      mt: index > 0 ? 0.5 : 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Building2 size={14} color={config.color} />
                    {config.name}
                    <Chip 
                      label={`${depts.length} ฝ่าย`} 
                      size="small" 
                      sx={{ 
                        ml: 'auto',
                        height: 20,
                        fontSize: '0.7rem',
                        bgcolor: alpha(config.color, 0.15),
                        color: config.color,
                        fontWeight: 600,
                      }} 
                    />
                  </ListSubheader>,
                  ...depts.map((dept) => (
                    <MenuItem 
                      key={dept.id} 
                      value={dept.id.toString()}
                      sx={{
                        pl: 4,
                        borderLeft: `4px solid transparent`,
                        '&:hover': {
                          borderLeftColor: config.color,
                          bgcolor: alpha(config.color, 0.04),
                        },
                        '&.Mui-selected': {
                          borderLeftColor: config.color,
                          bgcolor: alpha(config.color, 0.08),
                          '&:hover': {
                            bgcolor: alpha(config.color, 0.12),
                          },
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Box 
                          sx={{ 
                            width: 6, 
                            height: 6, 
                            borderRadius: '50%', 
                            bgcolor: config.color,
                            opacity: 0.6,
                          }} 
                        />
                        <Box sx={{ flex: 1 }}>
                          <Box component="span" sx={{ fontWeight: 500 }}>
                            {dept.name}
                          </Box>
                          <Box 
                            component="span" 
                            sx={{ 
                              ml: 1, 
                              color: 'text.secondary',
                              fontSize: '0.8rem',
                            }}
                          >
                            ({dept.code})
                          </Box>
                        </Box>
                      </Box>
                    </MenuItem>
                  )),
                ];
              })}
            </Select>
            {errors.departmentId && (
              <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>
                {errors.departmentId}
              </Box>
            )}
          </FormControl>

          <TextField
            label="รหัสแผนก"
            name="code"
            value={formData.code}
            onChange={handleChange}
            error={!!errors.code}
            helperText={errors.code || `เช่น ${getCompanyPrefix(getSelectedCompany()) || '?'}101, ${getCompanyPrefix(getSelectedCompany()) || '?'}102 (ขึ้นต้นด้วย ${getCompanyPrefix(getSelectedCompany()) || 'เลือกฝ่ายก่อน'})`}
            size="small"
            fullWidth
            required
            disabled={!formData.departmentId}
            InputProps={{
              startAdornment: getSelectedCompany() ? (
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
                    {getSelectedCompany()}
                  </Typography>
                </InputAdornment>
              ) : null,
            }}
          />

          <TextField
            label="ชื่อแผนก"
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
