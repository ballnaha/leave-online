'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  IconButton,
  Card,
  CardContent,
  Autocomplete,
  Divider,
  CircularProgress,
  alpha,
  useTheme,
  Chip,
  ListSubheader,
} from '@mui/material';
import { Plus, Trash2, ArrowUp, ArrowDown, GitBranch, Building2, Users } from 'lucide-react';

interface WorkflowDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  workflow?: any;
}

interface Step {
  level: number;
  approverRole: string | null;
  approverId: number | null;
  approver?: any;
  type: 'role' | 'user';
}

const ROLES = [
  { value: 'shift_supervisor', label: 'หัวหน้ากะ (Shift Supervisor)' },
  { value: 'section_head', label: 'หัวหน้าแผนก (Section Head)' },
  { value: 'dept_manager', label: 'ผจก.ฝ่าย (Dept Manager)' },
  { value: 'hr_manager', label: 'ผจก.บุคคล (HR Manager)' },
  { value: 'admin', label: 'Admin' },
];

export default function WorkflowDialog({ open, onClose, onSave, workflow }: WorkflowDialogProps) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [section, setSection] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);
  
  const [companies, setCompanies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchOptions();
      if (workflow) {
        setName(workflow.name);
        setDescription(workflow.description || '');
        setCompany(workflow.company || '');
        setDepartment(workflow.department || '');
        setSection(workflow.section || '');
        setSteps(workflow.steps.map((s: any) => ({
          level: s.level,
          approverRole: s.approverRole,
          approverId: s.approverId,
          approver: s.approver,
          type: s.approverId ? 'user' : 'role'
        })));
      } else {
        resetForm();
      }
    }
  }, [open, workflow]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setCompany('');
    setDepartment('');
    setSection('');
    setSteps([]);
  };

  const fetchOptions = async () => {
    try {
      const [compRes, deptRes, sectRes, userRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/departments'),
        fetch('/api/sections'),
        fetch('/api/users?role=approver')
      ]);

      if (compRes.ok) setCompanies(await compRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (sectRes.ok) setSections(await sectRes.json());
      if (userRes.ok) {
          const userData = await userRes.json();
          setUsers(Array.isArray(userData) ? userData : userData.users || []);
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const handleAddStep = () => {
    setSteps([...steps, { 
      level: steps.length + 1, 
      approverRole: 'section_head', 
      approverId: null, 
      type: 'role' 
    }]);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === steps.length - 1)) return;
    
    const newSteps = [...steps];
    const temp = newSteps[index];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;
    
    // Re-index levels
    setSteps(newSteps.map((s, i) => ({ ...s, level: i + 1 })));
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Re-index levels
    setSteps(newSteps.map((s, i) => ({ ...s, level: i + 1 })));
  };

  const handleStepChange = (index: number, field: keyof Step, value: any) => {
    const newSteps = [...steps];
    
    if (field === 'type') {
        newSteps[index] = {
            ...newSteps[index],
            type: value,
            approverRole: value === 'role' ? 'section_head' : null,
            approverId: null,
            approver: null
        };
    } else {
        newSteps[index] = { ...newSteps[index], [field]: value };
        
        if (field === 'approverRole') {
             newSteps[index].approverId = null;
             newSteps[index].approver = null;
        } else if (field === 'approverId') {
             newSteps[index].approverRole = null;
             const user = users.find(u => u.id === value);
             newSteps[index].approver = user;
        }
    }
    
    setSteps(newSteps);
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      alert('Please enter a workflow name');
      return;
    }
    if (steps.length === 0) {
      alert('Please add at least one approval step');
      return;
    }
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.type === 'role' && !step.approverRole) {
        alert(`Please select a role for step ${i + 1}`);
        return;
      }
      if (step.type === 'user' && !step.approverId) {
        alert(`Please select a user for step ${i + 1}`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        name,
        description,
        company: company || null,
        department: department || null,
        section: section || null,
        steps: steps.map((s, i) => ({
          level: i + 1,
          approverRole: s.type === 'role' ? s.approverRole : null,
          approverId: s.type === 'user' ? s.approverId : null
        }))
      };

      const url = workflow 
        ? `/api/admin/approval-workflows/${workflow.id}`
        : '/api/admin/approval-workflows';
      
      const method = workflow ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save');
      
      onSave();
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Failed to save workflow');
    } finally {
      setLoading(false);
    }
  };

  // Filter departments based on company
  const filteredDepartments = departments.filter(d => !company || d.company === company);
  // Filter sections based on department
  const filteredSections = sections.filter(s => !department || s.departmentId === (departments.find(d => d.code === department)?.id));

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Box sx={{ 
          p: 1, 
          borderRadius: 1, 
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <GitBranch size={20} color={theme.palette.primary.main} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            {workflow ? 'แก้ไข Workflow' : 'สร้าง Workflow ใหม่'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            กำหนดลำดับขั้นตอนการอนุมัติใบลา
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        {/* Basic Info Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 4, height: 16, bgcolor: 'primary.main', borderRadius: 1 }} />
            ข้อมูลทั่วไป
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="ชื่อ Workflow"
              fullWidth
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="เช่น Workflow สำหรับฝ่ายผลิต"
            />
            <TextField
              label="รายละเอียด"
              fullWidth
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
              placeholder="อธิบายเพิ่มเติมเกี่ยวกับ Workflow นี้"
            />
          </Box>
        </Box>
        
        {/* Scope Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 4, height: 16, bgcolor: 'secondary.main', borderRadius: 1 }} />
            ขอบเขตการใช้งาน
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            กำหนดว่า Workflow นี้ใช้กับใคร (เว้นว่างไว้ = ใช้ทั้งองค์กร)
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>บริษัท</InputLabel>
              <Select
                value={company}
                label="บริษัท"
                onChange={(e) => {
                  setCompany(e.target.value);
                  setDepartment('');
                  setSection('');
                }}
              >
                <MenuItem value=""><em>ทั้งหมด</em></MenuItem>
                {companies.map((c) => (
                  <MenuItem key={c.id} value={c.code}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" disabled={!company && filteredDepartments.length === 0}>
              <InputLabel>ฝ่าย</InputLabel>
              <Select
                value={department}
                label="ฝ่าย"
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setSection('');
                }}
              >
                <MenuItem value=""><em>ทั้งหมด</em></MenuItem>
                {filteredDepartments.map((d) => (
                  <MenuItem key={d.id} value={d.code}>{d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" disabled={!department}>
              <InputLabel>แผนก</InputLabel>
              <Select
                value={section}
                label="แผนก"
                onChange={(e) => setSection(e.target.value)}
              >
                <MenuItem value=""><em>ทั้งหมด</em></MenuItem>
                {filteredSections.map((s) => (
                  <MenuItem key={s.id} value={s.code}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Steps Section */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 4, height: 16, bgcolor: 'success.main', borderRadius: 1 }} />
                ขั้นตอนการอนุมัติ
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ลำดับผู้อนุมัติจากขั้นแรกถึงขั้นสุดท้าย
              </Typography>
            </Box>
            <Button 
              startIcon={<Plus size={16} />} 
              onClick={handleAddStep} 
              variant="outlined" 
              size="small"
              sx={{ borderRadius: 1 }}
            >
              เพิ่มขั้นตอน
            </Button>
          </Box>

          {steps.length === 0 ? (
            <Box 
              sx={{ 
                py: 4, 
                textAlign: 'center',
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                borderRadius: 1,
                border: '1px dashed',
                borderColor: 'divider',
              }}
            >
              
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                ยังไม่มีขั้นตอนอนุมัติ
              </Typography>
              <Button 
                startIcon={<Plus size={16} />} 
                onClick={handleAddStep} 
                size="small"
                sx={{ mt: 1 }}
              >
                เพิ่มขั้นตอนแรก
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {steps.map((step, index) => (
                <Card 
                  key={index} 
                  variant="outlined"
                  sx={{ 
                    borderRadius: 1,
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                  }}
                >
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {/* Step Number */}
                      <Box 
                        sx={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </Box>
                      
                      {/* Type Select */}
                      <FormControl size="small" sx={{ minWidth: 130 }}>
                        <InputLabel>ประเภท</InputLabel>
                        <Select
                          value={step.type}
                          label="ประเภท"
                          onChange={(e) => handleStepChange(index, 'type', e.target.value)}
                        >
                          <MenuItem value="role">ตามตำแหน่ง</MenuItem>
                          <MenuItem value="user">ระบุคน</MenuItem>
                        </Select>
                      </FormControl>
                      
                      {/* Role/User Select */}
                      <Box sx={{ flex: 1 }}>
                        {step.type === 'user' ? (
                          <Autocomplete
                            options={users}
                            getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.department || '-'})`}
                            value={step.approver || null}
                            onChange={(_, newValue) => {
                              handleStepChange(index, 'approverId', newValue ? newValue.id : null);
                            }}
                            renderInput={(params) => <TextField {...params} label="เลือกผู้อนุมัติ" size="small" />}
                            size="small"
                          />
                        ) : (
                          <FormControl fullWidth size="small">
                            <InputLabel>ตำแหน่ง</InputLabel>
                            <Select
                              value={step.approverRole || ''}
                              label="ตำแหน่ง"
                              onChange={(e) => handleStepChange(index, 'approverRole', e.target.value)}
                            >
                              {ROLES.map((role) => (
                                <MenuItem key={role.value} value={role.value}>
                                  {role.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Box>
                      
                      {/* Action Buttons */}
                      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleMoveStep(index, 'up')}
                          disabled={index === 0}
                          sx={{ 
                            bgcolor: alpha(theme.palette.grey[500], 0.1),
                            '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.2) },
                          }}
                        >
                          <ArrowUp size={16} />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleMoveStep(index, 'down')}
                          disabled={index === steps.length - 1}
                          sx={{ 
                            bgcolor: alpha(theme.palette.grey[500], 0.1),
                            '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.2) },
                          }}
                        >
                          <ArrowDown size={16} />
                        </IconButton>
                        <IconButton 
                          size="small"
                          onClick={() => handleRemoveStep(index)}
                          sx={{ 
                            color: 'error.main',
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                            '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) },
                          }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>

      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} sx={{ borderRadius: 1 }}>
          ยกเลิก
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || !name || steps.length === 0}
          sx={{ 
            borderRadius: 1,
            minWidth: 120,
          }}
        >
          {loading ? <CircularProgress size={20} /> : (workflow ? 'บันทึก' : 'สร้าง Workflow')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
