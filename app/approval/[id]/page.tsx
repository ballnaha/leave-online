'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination as SwiperPagination, Zoom } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/zoom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  Dialog,
  TextField,
  Skeleton,
  IconButton,
  Divider,
  Alert,
  Paper,
} from '@mui/material';
import {
  TickCircle,
  CloseCircle,
  Clock,
  Calendar,
  User,
  DocumentText,
  InfoCircle,
  Paperclip2,
  Building,
  Briefcase,
  Forbidden2,
  Health,
  Sun1,
  Sun,
  People,
  Shield,
  Heart,
  Profile2User,
  Car,
  MoneySend,
  ArrowLeft,
} from 'iconsax-react';
import BottomNav from '../../components/BottomNav';
import Sidebar from '../../components/Sidebar';
import { useLocale } from '@/app/providers/LocaleProvider';

// สีหลักของระบบ
const PRIMARY_COLOR = '#6C63FF';
const PRIMARY_LIGHT = '#EAF2F8';

// กำหนด icon และสีสำหรับแต่ละประเภทการลา
const leaveTypeConfig: Record<string, { icon: any; color: string; lightColor: string }> = {
  sick: { icon: Health, color: '#D32F2F', lightColor: '#FFEBEE' },
  personal: { icon: Briefcase, color: '#1976D2', lightColor: '#E3F2FD' },
  vacation: { icon: Sun1, color: '#ED6C02', lightColor: '#FFF3E0' },
  annual: { icon: Sun, color: '#ED6C02', lightColor: '#FFF3E0' },
  maternity: { icon: People, color: '#9C27B0', lightColor: '#F3E5F5' },
  ordination: { icon: Building, color: '#ED6C02', lightColor: '#FFF3E0' },
  work_outside: { icon: Car, color: '#0288D1', lightColor: '#E1F5FE' },
  military: { icon: Shield, color: '#2E7D32', lightColor: '#E8F5E9' },
  marriage: { icon: Heart, color: '#E91E63', lightColor: '#FCE4EC' },
  funeral: { icon: Profile2User, color: '#424242', lightColor: '#F5F5F5' },
  paternity: { icon: User, color: '#1976D2', lightColor: '#E3F2FD' },
  sterilization: { icon: Health, color: '#D32F2F', lightColor: '#FFEBEE' },
  business: { icon: Car, color: '#0288D1', lightColor: '#E1F5FE' },
  unpaid: { icon: MoneySend, color: '#757575', lightColor: '#EEEEEE' },
  other: { icon: InfoCircle, color: '#607D8B', lightColor: '#ECEFF1' },
  default: { icon: InfoCircle, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
};

const statusConfig: Record<string, { label: string; color: string; bgcolor: string; icon: any }> = {
  pending: { label: 'รออนุมัติ', color: '#ED6C02', bgcolor: '#FFF3E0', icon: Clock },
  approved: { label: 'อนุมัติแล้ว', color: '#2E7D32', bgcolor: '#E8F5E9', icon: TickCircle },
  rejected: { label: 'ปฏิเสธ', color: '#D32F2F', bgcolor: '#FFEBEE', icon: CloseCircle },
  cancelled: { label: 'ยกเลิกแล้ว', color: '#757575', bgcolor: '#F5F5F5', icon: Forbidden2 },
  skipped: { label: 'ข้ามขั้น', color: '#757575', bgcolor: '#F5F5F5', icon: Clock },
  in_progress: { label: 'กำลังดำเนินการ', color: '#ED6C02', bgcolor: '#FFF3E0', icon: Clock },
};

interface LeaveDetail {
  id: number;
  leaveCode?: string;
  leaveType: string;
  startDate: string;
  startTime?: string;
  endDate: string;
  endTime?: string;
  totalDays: number;
  reason: string;
  status: string;
  currentLevel: number;
  createdAt: string;
  cancelReason?: string;
  cancelledAt?: string;
  user: {
    id: number;
    employeeId: string;
    firstName: string;
    lastName: string;
    position?: string;
    department: string;
    section?: string;
    shift?: string;
    avatar?: string;
  };
  attachments: Array<{ id: number; fileName: string; filePath: string }>;
  approvalHistory: Array<{
    level: number;
    status: string;
    comment?: string;
    actionAt?: string;
    approver: {
      id: number;
      firstName: string;
      lastName: string;
      position?: string;
    };
    actedBy?: {
      id: number;
      firstName: string;
      lastName: string;
      position?: string;
      role?: string;
    } | null;
  }>;
}

export default function ApprovalDetailPage() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const leaveId = params?.id as string;
  const actionParam = searchParams?.get('action') as 'approve' | 'reject' | null;

  const [loading, setLoading] = useState(true);
  const [leaveDetail, setLeaveDetail] = useState<LeaveDetail | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>(actionParam || 'approve');
  const [canApprove, setCanApprove] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // Image modal state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentAttachments, setCurrentAttachments] = useState<Array<{ id: number; fileName: string; filePath: string }>>([]);

  useEffect(() => {
    if (actionParam) {
      setActionType(actionParam);
    }
  }, [actionParam]);

  useEffect(() => {
    if (leaveId && session?.user) {
      fetchLeaveDetail();
    }
  }, [leaveId, session]);

  const fetchLeaveDetail = async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const response = await fetch(`/api/leaves/${leaveId}`);

      // Check for access denied
      if (response.status === 403) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch leave detail');
      }
      const data = await response.json();
      setLeaveDetail(data);

      // Check if user can approve this leave
      const userId = parseInt(session?.user?.id || '0');
      const userRole = session?.user?.role;

      // Admin can view and approve all
      const isAdmin = (userRole || '') === 'admin';

      // Check if leave status is pending or in_progress
      const isPendingOrInProgress = ['pending', 'in_progress'].includes(data.status);

      // Find if user is in approval list and their approval is still pending
      const isInApprovalList = data.approvalHistory?.some(
        (h: any) => h.approver?.id === userId && h.status === 'pending'
      );

      // Debug logging
      console.log('=== Approval Check ===', {
        leaveStatus: data.status,
        userId,
        userRole,
        isAdmin,
        isPendingOrInProgress,
        isInApprovalList,
        approvalHistory: data.approvalHistory?.map((h: any) => ({
          approverId: h.approver?.id,
          status: h.status,
          level: h.level
        }))
      });

      setCanApprove(isPendingOrInProgress && (isAdmin || isInApprovalList));
    } catch (error) {
      console.error('Error fetching leave detail:', error);
      setError('ไม่สามารถโหลดข้อมูลใบลาได้');
    } finally {
      setLoading(false);
    }
  };

  const isImageFile = (fileName: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const handleFileClick = (file: { fileName: string; filePath: string }, e: React.MouseEvent, attachments?: Array<{ id: number; fileName: string; filePath: string }>) => {
    e.stopPropagation();
    if (isImageFile(file.fileName)) {
      const imageFiles = attachments?.filter(f => isImageFile(f.fileName)) || [{ id: 0, fileName: file.fileName, filePath: file.filePath }];
      const clickedIndex = imageFiles.findIndex(f => f.filePath === file.filePath);
      setCurrentAttachments(imageFiles);
      setCurrentImageIndex(clickedIndex >= 0 ? clickedIndex : 0);
      setSelectedImage(file.filePath);
      setImageModalOpen(true);
    } else {
      window.open(file.filePath, '_blank');
    }
  };

  const handleSubmitAction = async () => {
    if (!leaveDetail) return;

    if (actionType === 'reject' && !comment.trim()) {
      setError('กรุณาระบุเหตุผลในการปฏิเสธ');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/leaves/${leaveDetail.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          comment: comment.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'เกิดข้อผิดพลาด' }));
        setError(data.error || 'เกิดข้อผิดพลาด');
        return;
      }

      setSubmitSuccess(true);
      // Redirect after success
      setTimeout(() => {
        router.push('/approval');
      }, 2000);
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', pb: 10 }}>
        {/* Header Skeleton */}
        <Box sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'grey.200', position: 'sticky', top: 0, zIndex: 100 }}>
          <Container maxWidth="md">
            <Box sx={{ display: 'flex', alignItems: 'center', py: 2, gap: 2 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="text" width={150} height={32} />
              <Box sx={{ flex: 1 }} />
              <Skeleton variant="rounded" width={80} height={24} />
            </Box>
          </Container>
        </Box>

        <Container maxWidth="md" sx={{ pt: 3 }}>
          {/* Action Toggle Skeleton */}
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <Skeleton variant="rounded" height={52} sx={{ flex: 1, borderRadius: 1 }} />
            <Skeleton variant="rounded" height={52} sx={{ flex: 1, borderRadius: 1 }} />
          </Box>

          {/* Confirmation Header Skeleton */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Skeleton variant="circular" width={70} height={70} sx={{ mx: 'auto', mb: 2 }} />
            <Skeleton variant="text" width={180} height={28} sx={{ mx: 'auto' }} />
            <Skeleton variant="text" width={280} height={20} sx={{ mx: 'auto', mt: 0.5 }} />
          </Box>

          {/* Employee Info Card Skeleton */}
          <Box sx={{ mb: 2, p: 2.5, bgcolor: 'white', borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            {/* User Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Skeleton variant="circular" width={50} height={50} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width={150} height={24} />
                <Skeleton variant="text" width={200} height={18} />
              </Box>
            </Box>

            <Skeleton variant="rectangular" height={1} sx={{ my: 2 }} />

            {/* Leave Type */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Skeleton variant="rounded" width={40} height={40} />
              <Box>
                <Skeleton variant="text" width={80} height={16} />
                <Skeleton variant="text" width={100} height={20} />
              </Box>
            </Box>

            {/* Date Range */}
            <Box sx={{ bgcolor: '#F8FAFC', p: 2, borderRadius: 1.5, mb: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Skeleton variant="text" width={60} height={14} />
                  <Skeleton variant="text" width={120} height={20} />
                </Box>
                <Box>
                  <Skeleton variant="text" width={60} height={14} />
                  <Skeleton variant="text" width={120} height={20} />
                </Box>
              </Box>
              <Skeleton variant="rectangular" height={1} sx={{ my: 1.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton variant="text" width={80} height={18} />
                <Skeleton variant="text" width={60} height={22} />
              </Box>
            </Box>

            {/* Reason */}
            <Skeleton variant="text" width={100} height={16} sx={{ mb: 0.5 }} />
            <Skeleton variant="rounded" height={60} sx={{ borderRadius: 1 }} />
          </Box>

          {/* Approval History Skeleton */}
          <Box sx={{ mb: 2, p: 2.5, bgcolor: 'white', borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Skeleton variant="text" width={150} height={24} sx={{ mb: 2 }} />
            <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 1.5, p: 2 }}>
              {[1, 2].map((i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, mb: i === 1 ? 2 : 0 }}>
                  <Skeleton variant="circular" width={22} height={22} />
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Skeleton variant="text" width={120} height={20} />
                      <Skeleton variant="rounded" width={60} height={20} />
                    </Box>
                    <Skeleton variant="text" width={80} height={14} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Action Card Skeleton */}
          <Box sx={{ p: 2.5, bgcolor: 'white', borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Skeleton variant="rounded" height={80} sx={{ mb: 2, borderRadius: 1.5 }} />
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Skeleton variant="rounded" height={48} sx={{ flex: 1, borderRadius: 1.5 }} />
              <Skeleton variant="rounded" height={48} sx={{ flex: 1, borderRadius: 1.5 }} />
            </Box>
          </Box>
        </Container>
      </Box>
    );
  }

  // Access Denied Screen
  if (accessDenied) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', pb: 10 }}>
        <Container maxWidth="sm" sx={{ pt: 8 }}>
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 1 }}>
            <Box sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: '#FFEBEE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3
            }}>
              <Forbidden2 size={40} color="#D32F2F" variant="Bold" />
            </Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              {t('access_denied', 'ไม่มีสิทธิ์เข้าถึง')}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              {t('no_view_permission', 'คุณไม่มีสิทธิ์ดูข้อมูลใบลานี้ เฉพาะเจ้าของใบลา, ผู้อนุมัติที่เกี่ยวข้อง และ HR/Admin เท่านั้นที่สามารถเข้าถึงได้')}
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/approval')}
              sx={{
                bgcolor: PRIMARY_COLOR,
                '&:hover': { bgcolor: '#5B52E0' },
                borderRadius: 1,
                px: 4
              }}
            >
              {t('back_to_approval', 'กลับหน้ารายการ')}
            </Button>
          </Paper>
        </Container>
        <BottomNav />
      </Box>
    );
  }

  if (!leaveDetail) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', pb: 10 }}>
        <Container maxWidth="sm" sx={{ pt: 3 }}>
          <Alert severity="error" sx={{ borderRadius: 1 }}>
            ไม่พบข้อมูลใบลา
          </Alert>
          <Button
            variant="outlined"
            startIcon={<ArrowLeft size={20} color={PRIMARY_COLOR} />}
            onClick={() => router.push('/approval')}
            sx={{ mt: 2 }}
          >
            กลับหน้ารายการ
          </Button>
        </Container>
      </Box>
    );
  }

  const leaveConfig = leaveTypeConfig[leaveDetail.leaveType] || leaveTypeConfig.default;
  const LeaveIcon = leaveConfig.icon;
  const statusInfo = statusConfig[leaveDetail.status] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;

  // If already submitted successfully
  if (submitSuccess) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="sm">
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 1 }}>
            <Box sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: actionType === 'approve' ? '#E8F5E9' : '#FFEBEE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3
            }}>
              {actionType === 'approve'
                ? <TickCircle size={50} variant="Bold" color="#4CAF50" />
                : <CloseCircle size={50} variant="Bold" color="#F44336" />}
            </Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              {actionType === 'approve' ? 'อนุมัติสำเร็จ' : 'ปฏิเสธสำเร็จ'}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              กำลังกลับไปยังหน้ารายการ...
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', pb: 10 }}>
      {/* Header */}
      <Box sx={{
        bgcolor: 'white',
        borderBottom: '1px solid',
        borderColor: 'grey.200',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', py: 2, gap: 2 }}>
            <IconButton onClick={() => router.push('/approval')} sx={{ ml: -1 }}>
              <ArrowLeft size={24} color="#334155" />
            </IconButton>
            <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
              {canApprove ? (actionType === 'approve' ? 'อนุมัติใบลา' : 'ปฏิเสธใบลา') : 'รายละเอียดใบลา'}
            </Typography>
            <Chip
              label={statusInfo.label}
              size="small"
              sx={{
                bgcolor: statusInfo.bgcolor,
                color: statusInfo.color,
                fontWeight: 600,
                fontSize: '0.75rem'
              }}
            />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ pt: 3 }}>
        {/* Action Type Toggle (only when can approve) */}
        {canApprove && (
          <Box sx={{ mb: 3 }}>
            <Box
              sx={{
                bgcolor: '#F1F5F9',
                p: 0.5,
                borderRadius: 3,
                display: 'flex',
                position: 'relative',
                isolation: 'isolate'
              }}
            >
              {/* Sliding Background */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 4,
                  bottom: 4,
                  left: 4,
                  width: 'calc(50% - 4px)',
                  bgcolor: 'white',
                  borderRadius: 2.5,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
                  transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: actionType === 'approve' ? 'translateX(0)' : 'translateX(100%)',
                  zIndex: 0
                }}
              />

              <Box
                onClick={() => setActionType('approve')}
                sx={{
                  flex: 1,
                  py: 1.25,
                  borderRadius: 2.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  position: 'relative',
                  zIndex: 1,
                  transition: 'color 0.2s',
                  color: actionType === 'approve' ? '#2E7D32' : '#64748B',
                }}
              >
                <TickCircle
                  size={20}
                  variant={actionType === 'approve' ? 'Bold' : 'Linear'}
                  color={actionType === 'approve' ? '#2E7D32' : '#64748B'}
                  style={{ transition: 'all 0.2s' }}
                />
                <Typography fontWeight={actionType === 'approve' ? 700 : 500} fontSize="0.95rem" sx={{ transition: 'font-weight 0.2s' }}>
                  อนุมัติ
                </Typography>
              </Box>

              <Box
                onClick={() => setActionType('reject')}
                sx={{
                  flex: 1,
                  py: 1.25,
                  borderRadius: 2.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  position: 'relative',
                  zIndex: 1,
                  transition: 'color 0.2s',
                  color: actionType === 'reject' ? '#D32F2F' : '#64748B',
                }}
              >
                <CloseCircle
                  size={20}
                  variant={actionType === 'reject' ? 'Bold' : 'Linear'}
                  color={actionType === 'reject' ? '#D32F2F' : '#64748B'}
                  style={{ transition: 'all 0.2s' }}
                />
                <Typography fontWeight={actionType === 'reject' ? 700 : 500} fontSize="0.95rem" sx={{ transition: 'font-weight 0.2s' }}>
                  ปฏิเสธ
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Confirmation Header */}
        {canApprove && (
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              bgcolor: actionType === 'approve' ? '#E8F5E9' : '#FFEBEE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2
            }}>
              {actionType === 'approve'
                ? <TickCircle size={45} variant="Bold" color="#4CAF50" />
                : <CloseCircle size={45} variant="Bold" color="#F44336" />}
            </Box>
            <Typography variant="h6" fontWeight={700}>
              {actionType === 'approve' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการปฏิเสธ'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {actionType === 'approve'
                ? 'คุณต้องการอนุมัติคำขอลาของพนักงานใช่หรือไม่?'
                : 'คุณต้องการปฏิเสธคำขอลาของพนักงานใช่หรือไม่?'}
            </Typography>
          </Box>
        )}

        {/* Employee Info Card */}
        <Card sx={{ mb: 2, borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar
                src={leaveDetail.user.avatar}
                sx={{
                  width: 50,
                  height: 50,
                  bgcolor: PRIMARY_COLOR
                }}
              >
                {leaveDetail.user.firstName?.[0]}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={700} sx={{ fontSize: '1rem' }}>
                  {leaveDetail.user.firstName} {leaveDetail.user.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {leaveDetail.user.employeeId} • {leaveDetail.user.position || '-'}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Leave Details */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                bgcolor: leaveConfig.lightColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <LeaveIcon size={22} color={leaveConfig.color} variant="Bold" />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">ประเภทการลา</Typography>
                <Typography fontWeight={600}>{t(`leave_${leaveDetail.leaveType}`, leaveDetail.leaveType)}</Typography>
                {leaveDetail.leaveCode && (
                  <Typography variant="body2" sx={{ color: '#64748B', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    #{leaveDetail.leaveCode}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ bgcolor: '#F8FAFC', p: 2, borderRadius: 1, mb: 2 }}>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">วันที่ส่งใบลา</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatDate(leaveDetail.createdAt)} {new Date(leaveDetail.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                </Typography>
              </Box>
              <Divider sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">วันที่เริ่ม</Typography>
                  <Typography variant="body2" fontWeight={600}>{formatDate(leaveDetail.startDate)}</Typography>
                  {leaveDetail.startTime && (
                    <Typography variant="caption" color="text.secondary">{leaveDetail.startTime} น.</Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">วันที่สิ้นสุด</Typography>
                  <Typography variant="body2" fontWeight={600}>{formatDate(leaveDetail.endDate)}</Typography>
                  {leaveDetail.endTime && (
                    <Typography variant="caption" color="text.secondary">{leaveDetail.endTime} น.</Typography>
                  )}
                </Box>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">จำนวนวันลา</Typography>
                <Typography variant="body1" fontWeight={700} color={PRIMARY_COLOR}>
                  {leaveDetail.totalDays} วัน
                </Typography>
              </Box>
            </Box>

            {/* Department & Section */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">ฝ่าย</Typography>
                <Typography variant="body2" fontWeight={500}>{leaveDetail.user.department || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">แผนก</Typography>
                <Typography variant="body2" fontWeight={500}>{leaveDetail.user.section || '-'}</Typography>
              </Box>
            </Box>

            {/* Reason */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <DocumentText size={14} color="#64748B" /> เหตุผลการลา
              </Typography>
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 1 }}>
                <Typography variant="body2">{leaveDetail.reason || '-'}</Typography>
              </Paper>
            </Box>

            {/* Cancel Reason */}
            {leaveDetail.status === 'cancelled' && leaveDetail.cancelReason && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Forbidden2 size={14} color="#D32F2F" /> เหตุผลที่ยกเลิก
                </Typography>
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#FFEBEE', borderRadius: 1 }}>
                  <Typography variant="body2" color="error.dark">{leaveDetail.cancelReason}</Typography>
                </Paper>
              </Box>
            )}

            {/* Attachments */}
            {leaveDetail.attachments && leaveDetail.attachments.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <Paperclip2 size={14} color="#64748B" /> ไฟล์แนบ ({leaveDetail.attachments.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {leaveDetail.attachments.map((file) => (
                    <Box
                      key={file.id}
                      onClick={(e) => handleFileClick(file, e, leaveDetail.attachments)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        bgcolor: '#F8FAFC',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'grey.200',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: PRIMARY_COLOR,
                        }
                      }}
                    >
                      {isImageFile(file.fileName) ? (
                        <Box
                          component="img"
                          src={file.filePath}
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 0.5,
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <Box sx={{ width: 36, height: 36, borderRadius: 0.5, bgcolor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <DocumentText size={20} color="#64748B" />
                        </Box>
                      )}
                      <Typography variant="caption" sx={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.fileName}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Approval History */}
        {leaveDetail.approvalHistory && leaveDetail.approvalHistory.length > 0 && (
          <Card sx={{ mb: 2, borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Clock size={18} color={PRIMARY_COLOR} variant="Bold" /> ประวัติการอนุมัติ
              </Typography>

              <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 1, p: 2 }}>
                {leaveDetail.approvalHistory.map((hist, idx) => (
                  <Box key={idx} sx={{ position: 'relative', pb: idx === leaveDetail.approvalHistory.length - 1 ? 0 : 2 }}>
                    {idx !== leaveDetail.approvalHistory.length - 1 && (
                      <Box sx={{ position: 'absolute', left: 10, top: 24, bottom: 0, width: 2, bgcolor: '#E2E8F0' }} />
                    )}

                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        bgcolor: statusConfig[hist.status]?.bgcolor || '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1
                      }}>
                        {hist.status === 'approved' && <TickCircle size={14} color={statusConfig.approved.color} variant="Bold" />}
                        {hist.status === 'rejected' && <CloseCircle size={14} color={statusConfig.rejected.color} variant="Bold" />}
                        {hist.status === 'pending' && <Clock size={14} color={statusConfig.pending.color} variant="Bold" />}
                        {hist.status === 'cancelled' && <Forbidden2 size={14} color={statusConfig.cancelled.color} variant="Bold" />}
                        {hist.status === 'skipped' && <Clock size={14} color="#9e9e9e" variant="Bold" />}
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {hist.actedBy
                              ? `${hist.actedBy.firstName} ${hist.actedBy.lastName}`
                              : `${hist.approver.firstName} ${hist.approver.lastName}`}
                            {hist.actedBy && (
                              <Typography component="span" sx={{ ml: 1, color: 'text.secondary', fontSize: '0.85rem' }}>
                                ({t('approved_on_behalf', 'อนุมัติแทน')} {hist.approver.firstName} {hist.approver.lastName})
                              </Typography>
                            )}
                          </Typography>
                          <Chip
                            label={statusConfig[hist.status]?.label || hist.status}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: statusConfig[hist.status]?.bgcolor,
                              color: statusConfig[hist.status]?.color,
                              fontWeight: 600
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {hist.approver.position || 'ผู้อนุมัติ'}
                        </Typography>

                        {hist.comment && (
                          <Paper elevation={0} sx={{ mt: 1, p: 1.5, bgcolor: 'white', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontStyle="italic">
                              "{hist.comment}"
                            </Typography>
                          </Paper>
                        )}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Comment Input & Action Buttons */}
        {canApprove && (
          <Card sx={{ borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 2.5 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
                  {error}
                </Alert>
              )}

              <TextField
                label={actionType === 'approve' ? 'ความคิดเห็นเพิ่มเติม (ถ้ามี)' : 'เหตุผลในการปฏิเสธ *'}
                multiline
                rows={3}
                fullWidth
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                error={actionType === 'reject' && !comment.trim() && !!error}
                placeholder={actionType === 'approve' ? 'ระบุความคิดเห็น...' : 'กรุณาระบุเหตุผล...'}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                  }
                }}
              />

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  onClick={() => router.push('/approval')}
                  disabled={submitting}
                  size="large"
                  sx={{ flex: 1, borderRadius: 1, py: 1.25, borderColor: 'grey.300', color: 'text.primary' }}
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmitAction}
                  disabled={submitting}
                  size="large"
                  sx={{
                    flex: 1,
                    borderRadius: 1,
                    py: 1.25,
                    bgcolor: actionType === 'approve' ? '#4CAF50' : '#F44336',
                    boxShadow: actionType === 'approve' ? '0 4px 12px rgba(76, 175, 80, 0.3)' : '0 4px 12px rgba(244, 67, 54, 0.3)',
                    '&:hover': {
                      bgcolor: actionType === 'approve' ? '#43A047' : '#D32F2F',
                    }
                  }}
                >
                  {submitting ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* View Only Mode - Back Button */}
        {!canApprove && (
          <Button
            variant="outlined"
            fullWidth
            startIcon={<ArrowLeft size={20} color={PRIMARY_COLOR} />}
            onClick={() => router.push('/approval')}
            sx={{ borderRadius: 1, py: 1.25 }}
          >
            กลับหน้ารายการ
          </Button>
        )}
      </Container>

      {/* Image Modal */}
      <Dialog
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0,0,0,0.95)',
            borderRadius: { xs: 0, sm: 2 },
            maxHeight: '100vh',
            m: { xs: 0, sm: 2 },
          }
        }}
      >
        <IconButton
          onClick={() => setImageModalOpen(false)}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            bgcolor: 'rgba(255,255,255,0.1)',
            color: 'white',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
          }}
        >
          <CloseCircle size={28} color="white" />
        </IconButton>

        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: { xs: '100vh', sm: '80vh' },
          p: 2,
        }}>
          {currentAttachments.length > 1 ? (
            <Swiper
              modules={[Navigation, SwiperPagination, Zoom]}
              navigation
              pagination={{ clickable: true }}
              zoom={{ maxRatio: 3 }}
              initialSlide={currentImageIndex}
              style={{ width: '100%', height: '100%' }}
            >
              {currentAttachments.map((file, idx) => (
                <SwiperSlide key={idx}>
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    p: 2,
                  }}>
                    <Box
                      component="img"
                      src={file.filePath}
                      className="swiper-zoom-container"
                      sx={{
                        maxWidth: '100%',
                        maxHeight: '80vh',
                        objectFit: 'contain',
                      }}
                    />
                  </Box>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <Box
              component="img"
              src={selectedImage}
              sx={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
              }}
            />
          )}
        </Box>
      </Dialog>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <BottomNav />
    </Box>
  );
}
