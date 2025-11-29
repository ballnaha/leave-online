'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  Chip,
  Divider,
  alpha,
  useTheme,
  IconButton,
} from '@mui/material';
import {
  X,
  User,
  Building2,
  Layers,
  Eye,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface Department {
  code: string;
  name: string;
  company: string;
}

interface Section {
  code: string;
  name: string;
  departmentCode: string;
  departmentName: string;
}

interface UserViewDialogProps {
  open: boolean;
  onClose: () => void;
  user: {
    id: number;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string | null;
    gender: string;
    company: string;
    department: string;
    departmentName: string;
    section: string | null;
    sectionName: string | null;
    position: string | null;
    shift: string | null;
    employeeType: string;
    role: string;
    startDate: string;
    isActive: boolean;
    avatar: string | null;
    managedDepartments?: string | null;
    managedSections?: string | null;
  } | null;
  departments: Department[];
  sections: Section[];
}

// Role display mapping
const roleLabels: { [key: string]: string } = {
  admin: 'ผู้ดูแลระบบ',
  hr: 'HR',
  hr_manager: 'ผู้จัดการ HR',
  dept_manager: 'ผู้จัดการฝ่าย',
  section_head: 'หัวหน้าแผนก',
  shift_supervisor: 'หัวหน้ากะ',
  employee: 'พนักงาน',
};

// Employee type display mapping
const employeeTypeLabels: { [key: string]: string } = {
  monthly: 'รายเดือน',
  daily: 'รายวัน',
};

// Gender display mapping
const genderLabels: { [key: string]: string } = {
  male: 'ชาย',
  female: 'หญิง',
};

// Info Item with larger fonts
function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ py: 0.75, flex: '1 1 45%', minWidth: 140 }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.75rem', lineHeight: 1.3 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.875rem' }}>
        {value || '-'}
      </Typography>
    </Box>
  );
}

export default function UserViewDialog({
  open,
  onClose,
  user,
  departments,
  sections,
}: UserViewDialogProps) {
  const theme = useTheme();

  if (!user) return null;

  // Parse managed departments and sections
  let managedDepts: string[] = [];
  let managedSects: string[] = [];

  try {
    if (user.managedDepartments) {
      managedDepts = JSON.parse(user.managedDepartments);
    }
  } catch (e) {}

  try {
    if (user.managedSections) {
      managedSects = JSON.parse(user.managedSections);
    }
  } catch (e) {}

  // Get department names for managed departments
  const managedDepartmentDetails = managedDepts.map((code) => {
    const dept = departments.find((d) => d.code === code);
    return {
      code,
      name: dept?.name || code,
      company: dept?.company || '',
    };
  });

  // Get section names for managed sections
  const managedSectionDetails = managedSects.map((code) => {
    const sect = sections.find((s) => s.code === code);
    return {
      code,
      name: sect?.name || code,
      departmentName: sect?.departmentName || '',
    };
  });

  // Check if user is a manager type
  const isManagerRole = ['dept_manager', 'section_head', 'hr_manager', 'shift_supervisor'].includes(user.role);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius:1,
          overflow: 'hidden',
        },
      }}
    >
      {/* Compact Header */}
      <Box
        sx={{
          bgcolor: alpha(theme.palette.primary.main, 0.06),
          py: 2,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          position: 'relative',
        }}
      >
        <Avatar
          src={user.avatar || undefined}
          alt={`${user.firstName} ${user.lastName}`}
          sx={{
            width: 64,
            height: 64,
            border: '3px solid',
            borderColor: 'background.paper',
            bgcolor: theme.palette.primary.main,
            fontSize: '1.5rem',
            fontWeight: 600,
            boxShadow: `0 2px 10px ${alpha(theme.palette.primary.main, 0.25)}`,
          }}
        >
          {user.firstName.charAt(0)}
        </Avatar>

        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            {user.firstName} {user.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user.employeeId} • {user.position || '-'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label={roleLabels[user.role] || user.role}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                bgcolor: alpha(theme.palette.info.main, 0.1),
                color: theme.palette.info.main,
                fontWeight: 600,
              }}
            />
            <Chip
              icon={user.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
              label={user.isActive ? 'Active' : 'Inactive'}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                bgcolor: user.isActive
                  ? alpha(theme.palette.success.main, 0.1)
                  : alpha(theme.palette.text.secondary, 0.1),
                color: user.isActive ? theme.palette.success.main : 'text.secondary',
                fontWeight: 500,
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          </Box>
        </Box>

        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'text.secondary',
          }}
        >
          <X size={18} />
        </IconButton>
      </Box>

      <DialogContent sx={{ py: 2.5, px: 3 }}>
        {/* 2-Column Layout using Flexbox */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2.5 }}>
          {/* Left Column - Personal & Work Info */}
          <Box sx={{ flex: 1 }}>
            {/* Personal Info */}
            <Typography 
              variant="body2" 
              color="primary" 
              fontWeight={600} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5, 
                mb: 1,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontSize: '0.8rem',
              }}
            >
              <User size={16} />
              ข้อมูลส่วนตัว
            </Typography>
            <Box 
              sx={{ 
                p: 2, 
                mb: 2, 
                borderRadius: 1,
                bgcolor: alpha(theme.palette.background.default, 0.5),
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <InfoItem label="อีเมล" value={user.email} />
                <InfoItem label="เพศ" value={genderLabels[user.gender] || user.gender} />
                <InfoItem 
                  label="วันเริ่มงาน" 
                  value={user.startDate ? new Date(user.startDate).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }) : '-'} 
                />
                <InfoItem label="ประเภท" value={employeeTypeLabels[user.employeeType] || user.employeeType} />
              </Box>
            </Box>

            {/* Work Info */}
            <Typography 
              variant="body2" 
              color="primary" 
              fontWeight={600} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5, 
                mb: 1,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontSize: '0.8rem',
              }}
            >
              <Building2 size={16} />
              ข้อมูลสังกัด
            </Typography>
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: 1,
                bgcolor: alpha(theme.palette.background.default, 0.5),
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <InfoItem label="บริษัท" value={user.company} />
                <InfoItem label="กะ" value={user.shift} />
                <InfoItem label="ฝ่าย" value={`${user.departmentName} (${user.department})`} />
                <InfoItem label="แผนก" value={user.section ? `${user.sectionName || user.section}` : '-'} />
              </Box>
            </Box>
          </Box>

          {/* Right Column - Managed Scope */}
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="body2" 
              color="warning.main" 
              fontWeight={600} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5, 
                mb: 1,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontSize: '0.8rem',
              }}
            >
              <Eye size={16} />
              ขอบเขตการดูแล
            </Typography>
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: 1,
                bgcolor: alpha(theme.palette.warning.main, 0.04),
                border: '1px solid',
                borderColor: alpha(theme.palette.warning.main, 0.2),
                minHeight: isManagerRole ? 'auto' : 100,
              }}
            >
              {/* Special handling for hr_manager */}
              {user.role === 'hr_manager' ? (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    border: '1px solid',
                    borderColor: alpha(theme.palette.success.main, 0.3),
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h6" color="success.main" fontWeight={700} sx={{ mb: 1 }}>
                    🌟 สิทธิ์สูงสุด
                  </Typography>
                  <Typography variant="body2" color="text.primary" sx={{ mb: 1.5 }}>
                    ในฐานะ <strong>ผู้จัดการ HR</strong> มีสิทธิ์อนุมัติใบลาทุกรายการ
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center' }}>
                    <Chip
                      label="ทุกบริษัท"
                      size="small"
                      sx={{
                        height: 28,
                        fontSize: '0.8rem',
                        bgcolor: alpha(theme.palette.success.main, 0.15),
                        color: theme.palette.success.main,
                        fontWeight: 600,
                      }}
                    />
                    <Chip
                      label="ทุกฝ่าย"
                      size="small"
                      sx={{
                        height: 28,
                        fontSize: '0.8rem',
                        bgcolor: alpha(theme.palette.success.main, 0.15),
                        color: theme.palette.success.main,
                        fontWeight: 600,
                      }}
                    />
                    <Chip
                      label="ทุกแผนก"
                      size="small"
                      sx={{
                        height: 28,
                        fontSize: '0.8rem',
                        bgcolor: alpha(theme.palette.success.main, 0.15),
                        color: theme.palette.success.main,
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, fontStyle: 'italic' }}>
                    เป็นผู้อนุมัติคนสุดท้ายในทุก Approval Flow
                  </Typography>
                </Box>
              ) : isManagerRole ? (
                <>
                  {/* Primary */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5, display: 'block' }}>
                      สังกัดหลัก
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
                      <Chip
                        icon={<Building2 size={14} />}
                        label={user.departmentName}
                        size="small"
                        sx={{
                          height: 28,
                          fontSize: '0.8rem',
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                        }}
                      />
                      {user.section && (
                        <Chip
                          icon={<Layers size={14} />}
                          label={user.sectionName || user.section}
                          size="small"
                          sx={{
                            height: 28,
                            fontSize: '0.8rem',
                            bgcolor: alpha(theme.palette.secondary.main, 0.1),
                            color: theme.palette.secondary.main,
                          }}
                        />
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  {/* Managed Departments */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5, display: 'block' }}>
                      ฝ่ายที่ดูแลเพิ่มเติม
                    </Typography>
                    {managedDepartmentDetails.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
                        {managedDepartmentDetails.map((dept) => (
                          <Chip
                            key={dept.code}
                            icon={<Building2 size={14} />}
                            label={`${dept.name} (${dept.code})`}
                            size="small"
                            sx={{
                              height: 28,
                              fontSize: '0.8rem',
                              bgcolor: alpha(theme.palette.warning.main, 0.1),
                              color: theme.palette.warning.main,
                            }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                        ไม่มี
                      </Typography>
                    )}
                  </Box>

                  {/* Managed Sections */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5, display: 'block' }}>
                      แผนกที่ดูแลเพิ่มเติม
                    </Typography>
                    {managedSectionDetails.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
                        {managedSectionDetails.map((sect) => (
                          <Chip
                            key={sect.code}
                            icon={<Layers size={14} />}
                            label={`${sect.name} (${sect.code})`}
                            size="small"
                            sx={{
                              height: 28,
                              fontSize: '0.8rem',
                              bgcolor: alpha(theme.palette.info.main, 0.1),
                              color: theme.palette.info.main,
                            }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                        ไม่มี
                      </Typography>
                    )}
                  </Box>

                  {/* Summary */}
                  {(managedDepartmentDetails.length > 0 || managedSectionDetails.length > 0) && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.success.main, 0.08),
                        border: '1px solid',
                        borderColor: alpha(theme.palette.success.main, 0.2),
                      }}
                    >
                      <Typography variant="body2" color="success.main" fontWeight={500} sx={{ fontSize: '0.8rem' }}>
                        💡 สามารถอนุมัติใบลาของพนักงานในฝ่าย/แผนกหลัก และที่ดูแลเพิ่มเติมได้ทั้งหมด
                      </Typography>
                    </Box>
                  )}
                </>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 60 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    ไม่มีสิทธิ์ในการอนุมัติ
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined" size="small" sx={{ borderRadius: 1 }}>
          ปิด
        </Button>
      </DialogActions>
    </Dialog>
  );
}
