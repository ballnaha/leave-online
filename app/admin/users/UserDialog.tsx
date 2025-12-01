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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Typography,
  Chip,
  alpha,
  useTheme,
  Autocomplete,
  Checkbox,
} from '@mui/material';
import { useToastr } from '@/app/components/Toastr';
import { User, Eye, EyeOff, LoaderCircle, UserPlus, UserCog, CheckSquare, Square } from 'lucide-react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

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
}

interface Section {
  id: number;
  code: string;
  name: string;
  departmentId: number;
}

interface UserData {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  gender: string;
  company: string;
  department: string;
  section: string | null;
  position: string | null;
  shift: string | null;
  employeeType: string;
  role: string;
  startDate: string;
  isActive: boolean;
  managedDepartments?: string | null;
  managedSections?: string | null;
}

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  user?: UserData;
}

export default function UserDialog({
  open,
  onClose,
  onSave,
  user,
}: UserDialogProps) {
  const theme = useTheme();
  const toastr = useToastr();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    gender: 'male',
    company: '',
    department: '',
    section: '',
    position: '',
    shift: '',
    employeeType: 'monthly',
    role: 'employee',
    startDate: dayjs(),
    isActive: true,
    managedDepartments: [] as string[],
    managedSections: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (user) {
      // Parse JSON strings to arrays
      let managedDepts: string[] = [];
      let managedSects: string[] = [];
      
      try {
        if (user.managedDepartments) {
          managedDepts = JSON.parse(user.managedDepartments);
        }
        if (user.managedSections) {
          managedSects = JSON.parse(user.managedSections);
        }
      } catch (e) {
        console.error('Error parsing managed departments/sections:', e);
      }

      setFormData({
        employeeId: user.employeeId || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        password: '',
        gender: user.gender || 'male',
        company: user.company || '',
        department: user.department || '',
        section: user.section || '',
        position: user.position || '',
        shift: user.shift || '',
        employeeType: user.employeeType || 'monthly',
        role: user.role || 'employee',
        startDate: user.startDate ? dayjs(user.startDate) : dayjs(),
        isActive: user.isActive ?? true,
        managedDepartments: managedDepts,
        managedSections: managedSects,
      });
    } else {
      setFormData({
        employeeId: '',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        gender: 'male',
        company: '',
        department: '',
        section: '',
        position: '',
        shift: '',
        employeeType: 'monthly',
        role: 'employee',
        startDate: dayjs(),
        isActive: true,
        managedDepartments: [],
        managedSections: [],
      });
    }
    setErrors({});
    setShowPassword(false);
  }, [user, open]);

  const fetchOptions = async () => {
    try {
      const [companiesRes, departmentsRes, sectionsRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/departments'),
        fetch('/api/sections'),
      ]);

      if (companiesRes.ok) setCompanies(await companiesRes.json());
      if (departmentsRes.ok) setDepartments(await departmentsRes.json());
      if (sectionsRes.ok) setSections(await sectionsRes.json());
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  // Roles ที่ต้องดูแลฝ่าย/แผนกเพิ่มเติมได้
  const MANAGER_ROLES = ['dept_manager', 'section_head', 'hr_manager', 'shift_supervisor'];

  const handleChange = (e: any) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    if (name === 'company') {
      setFormData((prev) => ({ ...prev, department: '', section: '' }));
    }
    if (name === 'department') {
      setFormData((prev) => ({ ...prev, section: '' }));
    }
    
    // Reset managedDepartments/managedSections เมื่อเปลี่ยน role เป็น role ที่ไม่ต้องดูแลฝ่าย
    if (name === 'role' && !MANAGER_ROLES.includes(value)) {
      setFormData((prev) => ({ 
        ...prev, 
        managedDepartments: [],
        managedSections: [],
      }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.employeeId.trim()) newErrors.employeeId = 'กรุณากรอกรหัสพนักงาน';
    if (!formData.firstName.trim()) newErrors.firstName = 'กรุณากรอกชื่อจริง';
    if (!formData.lastName.trim()) newErrors.lastName = 'กรุณากรอกนามสกุล';
    if (!user && !formData.password) newErrors.password = 'กรุณากรอกรหัสผ่าน';
    if (!formData.company) newErrors.company = 'กรุณาเลือกบริษัท';
    if (!formData.department) newErrors.department = 'กรุณาเลือกฝ่าย';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const url = user
        ? `/api/admin/users/${user.id}`
        : '/api/admin/users';
      const method = user ? 'PUT' : 'POST';

      const payload: Record<string, any> = {
        ...formData,
        startDate: formData.startDate.toISOString(),
        // Convert arrays to JSON strings
        managedDepartments: formData.managedDepartments.length > 0 
          ? JSON.stringify(formData.managedDepartments) 
          : null,
        managedSections: formData.managedSections.length > 0 
          ? JSON.stringify(formData.managedSections) 
          : null,
      };

      // สำหรับการสร้าง user ใหม่ ต้องมี password
      // สำหรับการแก้ไข user ถ้าไม่กรอก password จะไม่ส่งไป
      if (!user) {
        // สร้างใหม่ - ต้องมี password
        payload.password = formData.password;
      } else if (formData.password) {
        // แก้ไข - ส่ง password เฉพาะเมื่อกรอก
        payload.password = formData.password;
      } else {
        // แก้ไข - ไม่กรอก password ให้ลบออกจาก payload
        delete payload.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'เกิดข้อผิดพลาด');
      }

      onSave();
    } catch (error: any) {
      toastr.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = departments.filter(
    (d) => !formData.company || d.company === formData.company
  );

  const selectedDepartmentObj = departments.find(d => d.code === formData.department || d.name === formData.department);
  
  const filteredSections = sections.filter(
    (s) => !selectedDepartmentObj || s.departmentId === selectedDepartmentObj.id
  );

  // Section Header Component
  const SectionHeader = ({ title, color = 'primary' }: { title: string; color?: 'primary' | 'secondary' | 'success' | 'warning' }) => (
    <Box sx={{ 
      gridColumn: '1 / -1',
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      py: 0.5,
      borderBottom: '2px solid',
      borderColor: `${color}.main`,
      mb: 0.5,
    }}>
      <Typography 
        variant="caption" 
        fontWeight={700} 
        sx={{ 
          color: `${color}.main`,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {title}
      </Typography>
    </Box>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            maxHeight: '90vh',
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          pb: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.primary.main, 0.04),
        }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: user ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.success.main, 0.1),
            color: user ? 'warning.main' : 'success.main',
          }}>
            {user ? <UserCog size={22} /> : <UserPlus size={22} />}
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              {user ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
            </Typography>
            {user && (
              <Typography variant="caption" color="text.secondary">
                {user.employeeId} - {user.firstName} {user.lastName}
              </Typography>
            )}
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
            gap: 2,
            mt:2,
          }}>
            {/* Personal Info Section */}
            <SectionHeader title="ข้อมูลส่วนตัว" color="primary" />
            
            <TextField
              label="รหัสพนักงาน"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              error={!!errors.employeeId}
              helperText={errors.employeeId}
              size="small"
              fullWidth
              required
            />
            <FormControl size="small" fullWidth>
              <InputLabel>เพศ</InputLabel>
              <Select
                name="gender"
                value={formData.gender}
                label="เพศ"
                onChange={handleChange}
              >
                <MenuItem value="male">ชาย</MenuItem>
                <MenuItem value="female">หญิง</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="ชื่อจริง"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              error={!!errors.firstName}
              helperText={errors.firstName}
              size="small"
              fullWidth
              required
            />
            <TextField
              label="นามสกุล"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              error={!!errors.lastName}
              helperText={errors.lastName}
              size="small"
              fullWidth
              required
            />
            <TextField
              label="อีเมล"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              size="small"
              fullWidth
            />
            <TextField
              label={user ? "รหัสผ่านใหม่" : "รหัสผ่าน"}
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={user ? "เว้นว่างหากไม่เปลี่ยน" : errors.password}
              size="small"
              fullWidth
              required={!user}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            {/* Organization Section */}
            <SectionHeader title="ข้อมูลสังกัด" color="secondary" />
            
            <FormControl size="small" fullWidth error={!!errors.company} required>
              <InputLabel>บริษัท</InputLabel>
              <Select
                name="company"
                value={formData.company}
                label="บริษัท"
                onChange={handleChange}
              >
                {companies.map((c) => (
                  <MenuItem key={c.id} value={c.code}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth error={!!errors.department} required>
              <InputLabel>ฝ่าย</InputLabel>
              <Select
                name="department"
                value={formData.department}
                label="ฝ่าย"
                onChange={handleChange}
                disabled={!formData.company}
              >
                {filteredDepartments.map((d) => (
                  <MenuItem key={d.id} value={d.code}>{d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>แผนก</InputLabel>
              <Select
                name="section"
                value={formData.section}
                label="แผนก"
                onChange={handleChange}
                disabled={!formData.department}
              >
                <MenuItem value="">- ไม่ระบุ -</MenuItem>
                {filteredSections.map((s) => (
                  <MenuItem key={s.id} value={s.code}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="ตำแหน่ง"
              name="position"
              value={formData.position}
              onChange={handleChange}
              size="small"
              fullWidth
            />
            
            {/* Employment Section */}
            <SectionHeader title="ข้อมูลการจ้างงาน" color="success" />
            
            <FormControl size="small" fullWidth>
              <InputLabel>กะการทำงาน</InputLabel>
              <Select
                name="shift"
                value={formData.shift}
                label="กะการทำงาน"
                onChange={handleChange}
              >
                <MenuItem value="">ไม่มีกะ</MenuItem>
                <MenuItem value="day">กะกลางวัน</MenuItem>
                <MenuItem value="night">กะกลางคืน</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>ประเภทพนักงาน</InputLabel>
              <Select
                name="employeeType"
                value={formData.employeeType}
                label="ประเภทพนักงาน"
                onChange={handleChange}
              >
                <MenuItem value="daily">รายวัน</MenuItem>
                <MenuItem value="monthly">รายเดือน</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>สิทธิ์การใช้งาน</InputLabel>
              <Select
                name="role"
                value={formData.role}
                label="สิทธิ์การใช้งาน"
                onChange={handleChange}
              >
                <MenuItem value="employee">พนักงานทั่วไป</MenuItem>
                <MenuItem value="shift_supervisor">หัวหน้ากะ</MenuItem>
                <MenuItem value="section_head">หัวหน้าแผนก</MenuItem>
                <MenuItem value="dept_manager">ผู้จัดการฝ่าย/ส่วน</MenuItem>
                <MenuItem value="hr_manager">ผู้จัดการ HR</MenuItem>
                <MenuItem value="hr">เจ้าหน้าที่ HR</MenuItem>
                <MenuItem value="admin">ผู้ดูแลระบบ</MenuItem>
              </Select>
            </FormControl>
            <DatePicker
              label="วันที่เริ่มงาน"
              value={formData.startDate}
              onChange={(newValue) => {
                if (newValue) {
                  setFormData((prev) => ({ ...prev, startDate: newValue }));
                }
              }}
              slotProps={{ 
                textField: { 
                  size: 'small',
                  fullWidth: true,
                } 
              }}
            />

            {/* Managed Departments/Sections - แสดงเฉพาะ role ที่เป็นหัวหน้า */}
            {MANAGER_ROLES.includes(formData.role) && (
              <>
                <SectionHeader title="ฝ่าย/แผนกที่ดูแลเพิ่มเติม" color="warning" />
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    เลือกฝ่ายที่ต้องดูแลนอกเหนือจากฝ่ายของตัวเอง (สำหรับ Cross-department approval)
                  </Typography>
                  <Autocomplete
                    multiple
                    size="small"
                    options={departments.filter(d => d.code !== formData.department)}
                    getOptionLabel={(option) => `${option.name} (${option.code})`}
                    value={departments.filter(d => formData.managedDepartments.includes(d.code))}
                    onChange={(_, newValue) => {
                      const newDeptCodes = newValue.map(d => d.code);
                      // หา department IDs ที่เลือก
                      const selectedDeptIds = newValue.map(d => d.id);
                      // Filter managedSections ให้เหลือเฉพาะแผนกที่อยู่ในฝ่ายที่เลือก
                      const validSections = formData.managedSections.filter(sCode => {
                        const section = sections.find(s => s.code === sCode);
                        return section && selectedDeptIds.includes(section.departmentId);
                      });
                      
                      setFormData(prev => ({
                        ...prev,
                        managedDepartments: newDeptCodes,
                        managedSections: validSections,
                      }));
                    }}
                    groupBy={(option) => option.company}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="ฝ่ายที่ดูแลเพิ่มเติม"
                        placeholder="เลือกฝ่าย..."
                      />
                    )}
                    renderOption={(props, option, { selected }) => {
                      const { key, ...otherProps } = props as any;
                      return (
                        <li key={key} {...otherProps}>
                          <Checkbox
                            icon={<Square size={16} />}
                            checkedIcon={<CheckSquare size={16} />}
                            style={{ marginRight: 8 }}
                            checked={selected}
                          />
                          {option.name} ({option.code})
                        </li>
                      );
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => {
                        const { key, ...tagProps } = getTagProps({ index });
                        return (
                          <Chip
                            key={key}
                            label={`${option.name}`}
                            size="small"
                            color={option.company === 'PSC' ? 'primary' : 'secondary'}
                            variant="outlined"
                            {...tagProps}
                          />
                        );
                      })
                    }
                    renderGroup={(params) => (
                      <li key={params.key}>
                        <Box
                          sx={{
                            px: 2,
                            py: 0.5,
                            bgcolor: params.group === 'PSC' 
                              ? alpha(theme.palette.primary.main, 0.1)
                              : alpha(theme.palette.secondary.main, 0.1),
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography variant="caption" fontWeight={700}>
                            {params.group}
                          </Typography>
                        </Box>
                        <ul style={{ padding: 0 }}>{params.children}</ul>
                      </li>
                    )}
                  />
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  {/* แสดงเฉพาะเมื่อมีฝ่ายที่ดูแลเพิ่มเติม */}
                  {formData.managedDepartments.length > 0 ? (
                    <Autocomplete
                      multiple
                      size="small"
                      options={sections.filter(s => {
                        // แสดงเฉพาะแผนกที่อยู่ในฝ่ายที่เลือกไว้
                        const dept = departments.find(d => d.id === s.departmentId);
                        return dept && formData.managedDepartments.includes(dept.code) && s.code !== formData.section;
                      })}
                      getOptionLabel={(option) => `${option.name} (${option.code})`}
                      value={sections.filter(s => formData.managedSections.includes(s.code))}
                      onChange={(_, newValue) => {
                        setFormData(prev => ({
                          ...prev,
                          managedSections: newValue.map(s => s.code)
                        }));
                      }}
                      groupBy={(option) => {
                        const dept = departments.find(d => d.id === option.departmentId);
                        return dept ? `${dept.name} (${dept.code})` : 'ไม่ระบุฝ่าย';
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="แผนกที่ดูแลเพิ่มเติม (เฉพาะในฝ่ายที่เลือก)"
                          placeholder="เลือกแผนก..."
                        />
                      )}
                      renderOption={(props, option, { selected }) => {
                        const { key, ...otherProps } = props as any;
                        return (
                          <li key={key} {...otherProps}>
                            <Checkbox
                              icon={<Square size={16} />}
                              checkedIcon={<CheckSquare size={16} />}
                              style={{ marginRight: 8 }}
                              checked={selected}
                            />
                            {option.name} ({option.code})
                          </li>
                        );
                      }}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                          const { key, ...tagProps } = getTagProps({ index });
                          return (
                            <Chip
                              key={key}
                              label={`${option.name}`}
                              size="small"
                              color="info"
                              variant="outlined"
                              {...tagProps}
                            />
                          );
                        })
                      }
                      renderGroup={(params) => (
                        <li key={params.key}>
                          <Box
                            sx={{
                              px: 2,
                              py: 0.5,
                              bgcolor: alpha(theme.palette.info.main, 0.1),
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            <Typography variant="caption" fontWeight={700} color="info.main">
                              {params.group}
                            </Typography>
                          </Box>
                          <ul style={{ padding: 0 }}>{params.children}</ul>
                        </li>
                      )}
                    />
                  ) : (
                    <TextField
                      label="แผนกที่ดูแลเพิ่มเติม"
                      size="small"
                      fullWidth
                      disabled
                      placeholder="กรุณาเลือกฝ่ายก่อน"
                      helperText="เลือกฝ่ายที่ดูแลเพิ่มเติมก่อน จึงจะเลือกแผนกได้"
                    />
                  )}
                </Box>
              </>
            )}
            
            {/* Status */}
            <Box sx={{ 
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.5,
              bgcolor: formData.isActive ? alpha(theme.palette.success.main, 0.08) : alpha(theme.palette.error.main, 0.08),
              borderRadius: 1,
              border: '1px solid',
              borderColor: formData.isActive ? 'success.light' : 'error.light',
            }}>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  สถานะการใช้งาน
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formData.isActive ? 'ผู้ใช้สามารถเข้าสู่ระบบได้' : 'ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้'}
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={handleChange}
                    name="isActive"
                    color={formData.isActive ? 'success' : 'error'}
                  />
                }
                label={
                  <Chip 
                    label={formData.isActive ? 'Active' : 'Inactive'} 
                    size="small"
                    color={formData.isActive ? 'success' : 'error'}
                    variant="filled"
                  />
                }
                labelPlacement="start"
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          px: 2, 
          py: 1.5, 
          borderTop: '1px solid', 
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.grey[500], 0.04),
        }}>
          <Button onClick={onClose} color="inherit">
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <LoaderCircle size={18} className="animate-spin" /> : null}
            sx={{ minWidth: 100 }}
          >
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
