'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  IconButton,
  Chip,
  Alert,
  Skeleton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Paper,
} from '@mui/material';
import {
  ChevronLeft,
  Plus,
  Trash2,
  ArrowDown,
  User,
  Search,
  Save,
  Users,
  Shield,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/types/user-role';

interface UserOption {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  position?: string;
  department: string;
  role: UserRole;
  company: string;
  avatar?: string;
}

interface ApprovalFlow {
  id: number;
  level: number;
  approverId: number;
  approver: UserOption;
  isRequired: boolean;
}

interface SelectedUser {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  position?: string;
  department: string;
  role: UserRole;
  company: string;
  avatar?: string;
}

const roleLabels: Record<UserRole, string> = {
  employee: 'พนักงาน',
  shift_supervisor: 'หัวหน้ากะ',
  section_head: 'หัวหน้าแผนก',
  dept_manager: 'ผจก.ฝ่าย',
  hr_manager: 'ผจก.บุคคล',
  admin: 'ผู้ดูแลระบบ',
  hr: 'HR',
};

export default function UserApprovalFlowPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [allApprovers, setAllApprovers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [approvalFlows, setApprovalFlows] = useState<ApprovalFlow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState<UserOption | null>(null);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchApprovers();
  }, []);

  const fetchUsers = async () => {
    try {
      // ดึงเฉพาะ employees ที่จะตั้งค่า flow ให้
      const response = await fetch('/api/users?excludeRoles=hr_manager,admin');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovers = async () => {
    try {
      // ดึง users ที่สามารถเป็นผู้อนุมัติได้
      const response = await fetch('/api/users?excludeRoles=employee');
      if (response.ok) {
        const data = await response.json();
        setAllApprovers(data);
      }
    } catch (error) {
      console.error('Error fetching approvers:', error);
    }
  };

  const fetchUserFlow = useCallback(async (userId: number) => {
    try {
      const response = await fetch(`/api/user-approval-flow?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out HR (level 99) for display
        setApprovalFlows(data.filter((f: ApprovalFlow) => f.level !== 99));
      }
    } catch (error) {
      console.error('Error fetching user flow:', error);
    }
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserFlow(selectedUser.id);
    }
  }, [selectedUser, fetchUserFlow]);

  const handleSelectUser = (user: UserOption | null) => {
    setSelectedUser(user);
    setApprovalFlows([]);
    setError('');
    setSuccess('');
  };

  const handleAddApprover = () => {
    if (!selectedApprover) return;
    
    // Check if already exists
    if (approvalFlows.some(f => f.approverId === selectedApprover.id)) {
      setError('ผู้อนุมัตินี้มีอยู่ใน flow แล้ว');
      return;
    }

    const newLevel = approvalFlows.length > 0 
      ? Math.max(...approvalFlows.map(f => f.level)) + 1 
      : 1;

    setApprovalFlows([
      ...approvalFlows,
      {
        id: Date.now(), // temporary id
        level: newLevel,
        approverId: selectedApprover.id,
        approver: selectedApprover,
        isRequired: true,
      },
    ]);

    setSelectedApprover(null);
    setAddDialogOpen(false);
    setError('');
  };

  const handleRemoveApprover = (level: number) => {
    setApprovalFlows(approvalFlows.filter(f => f.level !== level));
  };

  const handleSaveFlow = async () => {
    if (!selectedUser) return;
    
    if (approvalFlows.length === 0) {
      setError('กรุณาเพิ่มผู้อนุมัติอย่างน้อย 1 คน');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/user-approval-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          flows: approvalFlows.map((f, idx) => ({
            level: idx + 1,
            approverId: f.approverId,
            isRequired: f.isRequired,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('บันทึก flow สำเร็จ');
        fetchUserFlow(selectedUser.id);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    searchQuery === '' || 
    u.firstName.includes(searchQuery) || 
    u.lastName.includes(searchQuery) || 
    u.employeeId.includes(searchQuery)
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', pt: 2, pb: 3, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <IconButton onClick={() => router.back()} sx={{ color: 'white', mr: 1 }}>
            <ChevronLeft />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            ตั้งค่า Flow อนุมัติ
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.9, ml: 6 }}>
          กำหนดลำดับผู้อนุมัติสำหรับพนักงานแต่ละคน
        </Typography>
      </Box>

      <Container maxWidth="md" sx={{ mt: 2 }}>
        {/* Search user */}
        <Card sx={{ borderRadius: 3, mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
              <User size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              เลือกพนักงาน
            </Typography>
            
            <Autocomplete
              options={users}
              getOptionLabel={(option) => `${option.employeeId} - ${option.firstName} ${option.lastName}`}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <Box component="li" key={key} {...otherProps} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar src={option.avatar} sx={{ width: 36, height: 36 }}>
                      {option.firstName[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {option.firstName} {option.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.employeeId} • {option.position || option.department}
                      </Typography>
                    </Box>
                  </Box>
                );
              }}
              value={selectedUser}
              onChange={(_, value) => handleSelectUser(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="ค้นหาพนักงาน..."
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <Search size={18} style={{ marginRight: 8, color: '#999' }} />,
                  }}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Selected user info */}
        {selectedUser && (
          <>
            <Card sx={{ borderRadius: 3, mb: 2, bgcolor: 'primary.50' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar src={selectedUser.avatar} sx={{ width: 56, height: 56, mr: 2 }}>
                  {selectedUser.firstName[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedUser.employeeId} • {selectedUser.position || selectedUser.department}
                  </Typography>
                </Box>
                <Chip 
                  label={roleLabels[selectedUser.role] || selectedUser.role} 
                  size="small" 
                  color="primary" 
                />
              </CardContent>
            </Card>

            {/* Approval Flow */}
            <Card sx={{ borderRadius: 3, mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    <Users size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    ลำดับผู้อนุมัติ
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Plus size={16} />}
                    onClick={() => setAddDialogOpen(true)}
                  >
                    เพิ่มผู้อนุมัติ
                  </Button>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                {approvalFlows.length === 0 ? (
                  <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderStyle: 'dashed' }}>
                    <Users size={48} color="#ccc" />
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      ยังไม่มีผู้อนุมัติ
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      คลิก &quot;เพิ่มผู้อนุมัติ&quot; เพื่อกำหนด flow
                    </Typography>
                  </Paper>
                ) : (
                  <List sx={{ p: 0 }}>
                    {approvalFlows.map((flow, idx) => (
                      <React.Fragment key={flow.id}>
                        <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 2, mb: 1 }}>
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mr: 2,
                              fontSize: '0.875rem',
                              fontWeight: 'bold',
                            }}
                          >
                            {idx + 1}
                          </Box>
                          <ListItemAvatar>
                            <Avatar src={flow.approver.avatar}>
                              {flow.approver.firstName[0]}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={`${flow.approver.firstName} ${flow.approver.lastName}`}
                            secondary={
                              <>
                                {flow.approver.position || flow.approver.department}
                                <Chip
                                  label={roleLabels[flow.approver.role] || flow.approver.role}
                                  size="small"
                                  sx={{ ml: 1, height: 20, fontSize: '0.65rem' }}
                                />
                              </>
                            }
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              color="error"
                              onClick={() => handleRemoveApprover(flow.level)}
                            >
                              <Trash2 size={18} />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>

                        {idx < approvalFlows.length - 1 && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.5 }}>
                            <ArrowDown size={20} color="#999" />
                          </Box>
                        )}
                      </React.Fragment>
                    ))}

                    {/* HR Manager (always last) */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                      <ArrowDown size={20} color="#999" />
                    </Box>
                    <ListItem sx={{ bgcolor: 'warning.50', borderRadius: 2, border: '1px dashed', borderColor: 'warning.main' }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: 'warning.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2,
                        }}
                      >
                        <Shield size={16} />
                      </Box>
                      <ListItemText
                        primary="ผู้จัดการฝ่ายบุคคล (HR Manager)"
                        secondary="อนุมัติขั้นสุดท้ายโดยอัตโนมัติ"
                      />
                      <Chip label="บังคับ" size="small" color="warning" />
                    </ListItem>
                  </List>
                )}

                {/* Save button */}
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<Save size={18} />}
                  onClick={handleSaveFlow}
                  disabled={saving || approvalFlows.length === 0}
                  sx={{ mt: 3 }}
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก Flow'}
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Loading state */}
        {loading && (
          <Box sx={{ mt: 2 }}>
            <Skeleton variant="rounded" height={80} sx={{ borderRadius: 3, mb: 2 }} />
            <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
          </Box>
        )}
      </Container>

      {/* Add Approver Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>เพิ่มผู้อนุมัติ</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={allApprovers.filter(a => !approvalFlows.some(f => f.approverId === a.id))}
            getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
            groupBy={(option) => roleLabels[option.role] || option.role}
            renderOption={(props, option) => {
              const { key, ...otherProps } = props;
              return (
                <Box component="li" key={key} {...otherProps} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar src={option.avatar} sx={{ width: 36, height: 36 }}>
                    {option.firstName[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {option.firstName} {option.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.employeeId} • {option.position || option.department}
                    </Typography>
                  </Box>
                </Box>
              );
            }}
            value={selectedApprover}
            onChange={(_, value) => setSelectedApprover(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="เลือกผู้อนุมัติ"
                placeholder="ค้นหา..."
                sx={{ mt: 1 }}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>ยกเลิก</Button>
          <Button 
            variant="contained" 
            onClick={handleAddApprover}
            disabled={!selectedApprover}
          >
            เพิ่ม
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
