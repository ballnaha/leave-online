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
  useMediaQuery,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { Add, Trash, Hierarchy } from 'iconsax-react';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DndContext, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToastr } from '@/app/components/Toastr';

interface UserOption {
  id?: number;
  firstName: string;
  lastName: string;
  department?: string | null;
}

interface CompanyOption {
  id: number;
  code: string;
  name: string;
}

interface DepartmentOption {
  id: number;
  code: string;
  name: string;
  company: string;
}

interface SectionOption {
  id: number;
  code: string;
  name: string;
  departmentId: number;
}

interface WorkflowStepInput {
  id?: number;
  level: number;
  approverRole?: string | null;
  approverId?: number | null;
  approver?: UserOption | null;
}

interface ApprovalWorkflowInput {
  id: number;
  name: string;
  description?: string | null;
  company?: string | null;
  department?: string | null;
  section?: string | null;
  steps: WorkflowStepInput[];
}

interface WorkflowDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  workflow?: ApprovalWorkflowInput;
}

interface Step {
  id: string;
  level: number;
  approverRole: string | null;
  approverId: number | null;
  approver?: UserOption | null;
  type: 'role' | 'user';
}

function makeStepId() {
  try {
    return globalThis.crypto?.randomUUID?.() ?? `step_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  } catch {
    return `step_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

function SortableStepCard({
  step,
  index,
  theme,
  users,
  onStepChange,
  onRemove,
}: {
  step: Step;
  index: number;
  theme: Theme;
  users: UserOption[];
  onStepChange: (index: number, field: keyof Step, value: Step[keyof Step]) => void;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      variant="outlined"
      sx={{
        borderRadius: 1,
        transition: 'all 0.2s',
        opacity: isDragging ? 0.9 : 1,
        bgcolor: isDragging ? alpha(theme.palette.primary.main, 0.03) : undefined,
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.2)}`,
        },
      }}
    >
      <CardContent sx={{ py: 1.5, px: { xs: 1.5, sm: 2 }, '&:last-child': { pb: 1.5 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <IconButton
              size="small"
              ref={setActivatorNodeRef}
              {...listeners}
              {...attributes}
              aria-label="ลากเพื่อจัดลำดับขั้นตอน"
              sx={{
                bgcolor: alpha(theme.palette.grey[500], 0.1),
                '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.2) },
                cursor: 'grab',
                '&:active': { cursor: 'grabbing' },
              }}
            >
              <DragIndicatorIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
            </IconButton>

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

            <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ display: { xs: 'none', sm: 'block' } }}>
              ขั้นตอนที่ {index + 1}
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={() => onRemove(index)}
            aria-label="ลบขั้นตอน"
            sx={{
              color: 'error.main',
              bgcolor: alpha(theme.palette.error.main, 0.1),
              '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) },
              flexShrink: 0,
            }}
          >
            <Trash size={16} color="#EF4444" />
          </IconButton>
        </Box>

        <Box
          sx={{
            mt: 1.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '160px 1fr' },
            gap: 1.5,
            alignItems: 'start',
          }}
        >
          <FormControl size="small" fullWidth>
            <InputLabel>ประเภท</InputLabel>
            <Select
              value={step.type}
              label="ประเภท"
              onChange={(e) => onStepChange(index, 'type', e.target.value as Step['type'])}
            >
              <MenuItem value="role">ตามตำแหน่ง</MenuItem>
              <MenuItem value="user">ระบุคน</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ minWidth: 0 }}>
            {step.type === 'user' ? (
              <Autocomplete
                options={users}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.department || '-'})`}
                value={step.approver || null}
                onChange={(_, newValue) => {
                  onStepChange(index, 'approverId', newValue ? newValue.id : null);
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
                  onChange={(e) => onStepChange(index, 'approverRole', e.target.value)}
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
        </Box>
      </CardContent>
    </Card>
  );
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
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [section, setSection] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);

  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
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
        setSteps(
          workflow.steps.map((s) => ({
            id: String(s.id ?? makeStepId()),
            level: s.level,
            approverRole: s.approverRole ?? null,
            approverId: s.approverId ?? null,
            approver: (s.approver as UserOption | null | undefined) ?? null,
            type: s.approverId ? 'user' : 'role',
          }))
        );
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
    setSteps([
      ...steps,
      {
        id: makeStepId(),
        level: steps.length + 1,
        approverRole: '',
        approverId: null,
        type: 'role',
      },
    ]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSteps((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const moved = arrayMove(prev, oldIndex, newIndex);
      return moved.map((s, i) => ({ ...s, level: i + 1 }));
    });
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Re-index levels
    setSteps(newSteps.map((s, i) => ({ ...s, level: i + 1 })));
  };

  const handleStepChange = (index: number, field: keyof Step, value: Step[keyof Step]) => {
    const newSteps = [...steps];

    if (field === 'type') {
      const nextType = value as Step['type'];
      newSteps[index] = {
        ...newSteps[index],
        type: nextType,
        approverRole: nextType === 'role' ? 'section_head' : null,
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
        const userId = typeof value === 'number' ? value : null;
        const user = userId ? users.find((u) => u.id === userId) : undefined;
        newSteps[index].approver = user ?? null;
      }
    }

    setSteps(newSteps);
  };

  const toastr = useToastr();

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toastr.error('กรุณาระบุชื่อ Workflow');
      return;
    }
    if (steps.length === 0) {
      toastr.error('กรุณาเพิ่มขั้นตอนการอนุมัติอย่างน้อย 1 ขั้นตอน');
      return;
    }
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.type === 'role' && !step.approverRole) {
        toastr.error(`กรุณาระบุตำแหน่งสำหรับขั้นตอนที่ ${i + 1}`);
        return;
      }
      if (step.type === 'user' && !step.approverId) {
        toastr.error(`กรุณาระบุผู้อนุมัติสำหรับขั้นตอนที่ ${i + 1}`);
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
      toastr.error('เกิดข้อผิดพลาดในการบันทึก Workflow');
    } finally {
      setLoading(false);
    }
  };

  // Filter departments based on company
  const filteredDepartments = departments.filter((d) => !company || d.company === company);
  // Filter sections based on department
  const filteredSections = sections.filter(
    (s) =>
      !department ||
      s.departmentId === departments.find((d) => d.code === department)?.id
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 1,
          maxHeight: fullScreen ? '100%' : '90vh',
        }
      }}
    >
      <DialogTitle sx={{
        pb: 1,
        px: { xs: 2, sm: 3 },
        pt: { xs: 2, sm: 2 },
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
          <Hierarchy size={20} color={theme.palette.primary.main} variant="Bold" />
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
      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
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
                  <MenuItem key={d.id} value={d.code}>{d.code} - {d.name}</MenuItem>
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
                  <MenuItem key={s.id} value={s.code}>{s.code} - {s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Steps Section */}
        <Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 2 },
              mb: 2,
            }}
          >
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
              startIcon={<Add size={16} color="#6C63FF" />}
              onClick={handleAddStep}
              variant="outlined"
              size="small"
              fullWidth={fullScreen}
              sx={{ borderRadius: 1, alignSelf: { xs: 'stretch', sm: 'auto' } }}
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
                startIcon={<Add size={16} color="#6C63FF" />}
                onClick={handleAddStep}
                size="small"
                sx={{ mt: 1 }}
              >
                เพิ่มขั้นตอนแรก
              </Button>
            </Box>
          ) : (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {steps.map((step, index) => (
                    <SortableStepCard
                      key={step.id}
                      step={step}
                      index={index}
                      theme={theme}
                      users={users}
                      onStepChange={handleStepChange}
                      onRemove={handleRemoveStep}
                    />
                  ))}
                </Box>
              </SortableContext>
            </DndContext>
          )}
        </Box>

      </DialogContent>
      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 1.5 },
          alignItems: { xs: 'stretch', sm: 'center' },
        }}
      >
        <Button onClick={onClose} fullWidth={fullScreen} sx={{ borderRadius: 1 }}>
          ยกเลิก
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !name || steps.length === 0}
          sx={{
            borderRadius: 1,
            minWidth: { xs: 'auto', sm: 120 },
          }}
          fullWidth={fullScreen}
        >
          {loading ? <CircularProgress size={20} /> : (workflow ? 'บันทึก' : 'สร้าง Workflow')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
