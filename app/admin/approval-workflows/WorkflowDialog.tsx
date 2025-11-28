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
} from '@mui/material';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

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
  { value: 'shift_supervisor', label: 'Shift Supervisor (หัวหน้ากะ)' },
  { value: 'section_head', label: 'Section Head (หัวหน้าแผนก)' },
  { value: 'dept_manager', label: 'Department Manager (ผจก.ฝ่าย)' },
  { value: 'hr_manager', label: 'HR Manager (ผจก.บุคคล)' },
  { value: 'admin', label: 'Admin' },
];

export default function WorkflowDialog({ open, onClose, onSave, workflow }: WorkflowDialogProps) {
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{workflow ? 'Edit Workflow' : 'Create New Workflow'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <Box>
            <TextField
              label="Workflow Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Box>
          <Box>
            <TextField
              label="Description"
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
            />
          </Box>
          
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, mt: 1 }}>Scope (Optional)</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Define where this workflow applies. Leave blank for broader scope.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
            <Box sx={{ flex: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Company</InputLabel>
                <Select
                  value={company}
                  label="Company"
                  onChange={(e) => {
                    setCompany(e.target.value);
                    setDepartment('');
                    setSection('');
                  }}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {companies.map((c) => (
                    <MenuItem key={c.id} value={c.code}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormControl fullWidth disabled={!company && filteredDepartments.length === 0}>
                <InputLabel>Department</InputLabel>
                <Select
                  value={department}
                  label="Department"
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setSection('');
                  }}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {filteredDepartments.map((d) => (
                    <MenuItem key={d.id} value={d.code}>{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormControl fullWidth disabled={!department}>
                <InputLabel>Section</InputLabel>
                <Select
                  value={section}
                  label="Section"
                  onChange={(e) => setSection(e.target.value)}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {filteredSections.map((s) => (
                    <MenuItem key={s.id} value={s.code}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Approval Steps</Typography>
          <Button startIcon={<Plus />} onClick={handleAddStep} variant="outlined" size="small">
            Add Step
          </Button>
        </Box>

        {steps.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            No steps defined. Add a step to define the approval process.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {steps.map((step, index) => (
              <Card key={index} variant="outlined">
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: '8%', display: 'flex', justifyContent: 'center' }}>
                      <Typography variant="subtitle1" align="center" sx={{ fontWeight: 'bold' }}>
                        {index + 1}
                      </Typography>
                    </Box>
                    <Box sx={{ width: '25%' }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={step.type}
                          label="Type"
                          onChange={(e) => handleStepChange(index, 'type', e.target.value)}
                        >
                          <MenuItem value="role">Role Based</MenuItem>
                          <MenuItem value="user">Specific User</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      {step.type === 'user' ? (
                         <Autocomplete
                            options={users}
                            getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.department})`}
                            value={step.approver || null}
                            onChange={(_, newValue) => {
                                handleStepChange(index, 'approverId', newValue ? newValue.id : null);
                            }}
                            renderInput={(params) => <TextField {...params} label="Select User" size="small" />}
                         />
                      ) : (
                        <FormControl fullWidth size="small">
                          <InputLabel>Role</InputLabel>
                          <Select
                            value={step.approverRole || ''}
                            label="Role"
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
                    <Box sx={{ width: 'auto', display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleMoveStep(index, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp size={18} />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleMoveStep(index, 'down')}
                        disabled={index === steps.length - 1}
                      >
                        <ArrowDown size={18} />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleRemoveStep(index)}>
                        <Trash2 size={18} />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading || !name || steps.length === 0}>
          {loading ? 'Saving...' : 'Save Workflow'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
