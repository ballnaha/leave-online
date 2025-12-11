'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Button, Card, CardContent, Skeleton, Container, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress } from '@mui/material';
import Image from 'next/image';
import Header from './components/Header';
import ImageSlider from './components/ImageSlider';
import LeaveTypeCard from './components/LeaveTypeCard';
import RecentActivityCard from './components/RecentActivityCard';
import BottomNav from './components/BottomNav';
import {
  Calendar2, Activity, Briefcase, Heart, Sun1, Lovely,
  Building4, Shield, People, Car, Clock, MessageQuestion, Health,
  Profile2User, Danger, MoneySend,
  Money
} from 'iconsax-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { useLocale } from './providers/LocaleProvider';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LeaveRequest } from '@/types/leave';
import LeaveDetailDrawer from './components/LeaveDetailDrawer';
import { HelpCircle, AlertTriangle } from 'lucide-react';
import { useUser } from './providers/UserProvider';
import DashboardCard from './components/DashboardCard';

interface LeaveType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  maxDaysPerYear: number | null;
  isPaid: boolean;
  isActive: boolean;
}

// กำหนด icon และสีสำหรับแต่ละประเภทการลา
const leaveTypeConfig: Record<string, { icon: any; color: string; gradient: string; image?: string }> = {
  sick: { icon: Health, color: '#5E72E4', gradient: 'linear-gradient(135deg, #5E72E4 0%, #825EE4 100%)', image: '/images/icon-stechoscope.png' },
  personal: { icon: Briefcase, color: '#8965E0', gradient: 'linear-gradient(135deg, #8965E0 0%, #BC65E0 100%)', image: '/images/icon-business.png' },
  vacation: { icon: Sun1, color: '#11CDEF', gradient: 'linear-gradient(135deg, #11CDEF 0%, #1171EF 100%)', image: '/images/icon-vacation.png' },
  annual: { icon: Sun1, color: '#2DCECC', gradient: 'linear-gradient(135deg, #2DCECC 0%, #2D8BCC 100%)' },
  maternity: { icon: Lovely, color: '#F5365C', gradient: 'linear-gradient(135deg, #F5365C 0%, #F56036 100%)', image: '/images/icon-pregnant.png' },
  ordination: { icon: Building4, color: '#FB6340', gradient: 'linear-gradient(135deg, #FB6340 0%, #FBB140 100%)', image: '/images/icon-monk.png' },
  work_outside: { icon: Car, color: '#2DCECC', gradient: 'linear-gradient(135deg, #2DCECC 0%, #2D8BCC 100%)', image: '/images/icon-workoutside.png' },
  absent: { icon: MessageQuestion, color: '#F5365C', gradient: 'linear-gradient(135deg, #F5365C 0%, #F56036 100%)' },
  military: { icon: Shield, color: '#5E72E4', gradient: 'linear-gradient(135deg, #5E72E4 0%, #5E9BE4 100%)' },
  marriage: { icon: Heart, color: '#F3A4B5', gradient: 'linear-gradient(135deg, #F3A4B5 0%, #D66086 100%)' },
  funeral: { icon: People, color: '#8898AA', gradient: 'linear-gradient(135deg, #8898AA 0%, #6A7A8A 100%)' },
  paternity: { icon: Profile2User, color: '#11CDEF', gradient: 'linear-gradient(135deg, #11CDEF 0%, #1171EF 100%)' },
  sterilization: { icon: Health, color: '#2DCECC', gradient: 'linear-gradient(135deg, #2DCECC 0%, #2D8BCC 100%)' },
  business: { icon: Car, color: '#8965E0', gradient: 'linear-gradient(135deg, #8965E0 0%, #BC65E0 100%)' },
  unpaid: { icon: MoneySend, color: '#8898AA', gradient: 'linear-gradient(135deg, #8898AA 0%, #6A7A8A 100%)', image: '/images/icon-unpaid1.png' },
  other: { icon: HelpCircle, color: '#5E72E4', gradient: 'linear-gradient(135deg, #8898AA 0%, #6A7A8A 100%)', image: '/images/icon-other.png' },
  default: { icon: Calendar2, color: '#5E72E4', gradient: 'linear-gradient(135deg, #5E72E4 0%, #825EE4 100%)' },
};

export default function Home() {
  const { t } = useLocale();
  const { status } = useSession();
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  // Filter leave types based on gender
  const filteredLeaveTypes = useMemo(() => {
    return leaveTypes.filter(leave => {
      // ถ้าเป็นเพศชาย ไม่แสดงลาคลอด (maternity)
      if (user?.gender === 'male' && leave.code === 'maternity') {
        return false;
      }
      // ถ้าเป็นเพศหญิง ไม่แสดงลาบวช (ordination)
      if (user?.gender === 'female' && leave.code === 'ordination') {
        return false;
      }
      return true;
    });
  }, [leaveTypes, user?.gender]);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [hasBanners, setHasBanners] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setMounted(true);

    const loadData = async () => {
      try {
        await fetchLeaveTypes(year);
        // fetchLeaveRequests will be called by the year effect
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();

    const hasLoaded = sessionStorage.getItem('home_loaded') === 'true';

    if (hasLoaded) {
      // Already loaded before, skip loading animation
      setLoading(false);
    } else {
      // First time load, show loading animation
      const timer = setTimeout(() => {
        setLoading(false);
        sessionStorage.setItem('home_loaded', 'true');
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    fetchLeaveRequests(year);
    fetchLeaveTypes(year);
  }, [year]);

  const fetchLeaveTypes = async (selectedYear: number) => {
    try {
      const response = await fetch(`/api/leave-types?year=${selectedYear}`);
      if (!response.ok) throw new Error('Failed to fetch leave types');
      const data = await response.json();
      // แสดงทั้งหมด
      setLeaveTypes(data);
    } catch (error) {
      console.error('Error fetching leave types:', error);
    }
  };

  const fetchLeaveRequests = async (selectedYear: number) => {
    try {
      const response = await fetch(`/api/my-leaves?year=${selectedYear}`);
      if (!response.ok) throw new Error('Failed to fetch leave requests');
      const data = await response.json();
      if (data.success && data.data) {
        setLeaveRequests(data.data);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
  };

  // Format date for display
  const formatDate = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

    if (start.getTime() === end.getTime()) {
      return start.toLocaleDateString('th-TH', options);
    }
    return `${start.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('th-TH', options)}`;
  };

  // Map status to RecentActivityCard format
  const mapStatus = (status: string): 'Approved' | 'Pending' | 'Rejected' | 'Cancelled' => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  };

  // Get approval status text
  const getApprovalStatusText = (leave: LeaveRequest) => {
    const status = leave.status.toLowerCase();
    if (status === 'approved') return t('status_approved', 'อนุมัติแล้ว');
    if (status === 'rejected') return t('status_rejected', 'ถูกปฏิเสธ');
    if (status === 'cancelled') return t('status_cancelled', 'ยกเลิกแล้ว');

    if (leave.approvals && leave.approvals.length > 0) {
      // Find the first pending approval
      const pendingApproval = leave.approvals.find(a => a.status === 'pending');
      if (pendingApproval) {
        return `${t('status_waiting_for', 'รอการอนุมัติจาก')} ${pendingApproval.approver?.firstName || t('supervisor', 'หัวหน้างาน')}`;
      }
    }

    return t('status_pending', 'รอการอนุมัติ');
  };

  // แสดง 5 รายการล่าสุด
  const recentLeaveRequests = useMemo(() => {
    return leaveRequests.slice(0, 5);
  }, [leaveRequests]);

  const getLeaveTypeConfig = (code: string) => {
    return leaveTypeConfig[code] || leaveTypeConfig.default;
  };

  const handleLeaveClick = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedLeave(null), 300);
  };

  const handleCancelLeave = async () => {
    if (!selectedLeave) return;

    if (!cancelReason.trim()) {
      alert(t('cancel_reason_required', 'กรุณาระบุเหตุผลการยกเลิก'));
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch(`/api/leaves/${selectedLeave.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancelReason: cancelReason.trim() }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: t('cancel_failed', 'ยกเลิกไม่สำเร็จ') }));
        alert(error.error || t('cancel_failed', 'ยกเลิกไม่สำเร็จ'));
        return;
      }

      // อัพเดท state
      setLeaveRequests((prev) =>
        prev.map((leave) =>
          leave.id === selectedLeave.id
            ? { ...leave, status: 'cancelled', cancelReason: cancelReason.trim(), cancelledAt: new Date().toISOString() }
            : leave
        )
      );
      setSelectedLeave({
        ...selectedLeave,
        status: 'cancelled',
        cancelReason: cancelReason.trim(),
        cancelledAt: new Date().toISOString()
      });
      setCancelDialogOpen(false);
      setCancelReason('');
    } catch (error) {
      console.error('Error cancelling leave:', error);
      alert(t('cancel_error', 'เกิดข้อผิดพลาด'));
    } finally {
      setCancelling(false);
    }
  };

  // Prevent hydration mismatch by always showing loading state until mounted
  const showLoading = !mounted || loading || dataLoading;

  // FIXME: Remove 'true ||' after testing
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <Box sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F8F9FA',
        gap: 2
      }}>
        <CircularProgress size={48} thickness={4} sx={{ color: '#6C63FF' }} />
        <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500 }}>
          {t('status_loading', 'กำลังโหลด...')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
      <Container maxWidth={false} sx={{ maxWidth: 1200, px: { xs: 2.5, sm: 3, md: 4 } }}>
        <Header />
      </Container>

      {/* DashboardCard - Full Width on Mobile */}
      <Box sx={{ px: { xs: 0, sm: 3, md: 4 } }}>
        <DashboardCard
          leaveTypes={filteredLeaveTypes}
          leaveRequests={leaveRequests}
          year={year}
          onYearChange={setYear}
        />
      </Box>

      <Container maxWidth={false} sx={{ maxWidth: 1200, px: { xs: 2.5, sm: 3, md: 4 } }}>
        {/* Quick Actions Section */}
        <Box sx={{ mt: 1.5, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
              {t('home_categories', 'ประเภทการลา')}
            </Typography>
            <Button
              size="small"
              sx={{ fontWeight: 'medium' }}
              onClick={() => router.push(`/leave-types`)} // No action for now or link to all banners
            >
              {t('home_see_all', 'ดูทั้งหมด')}
            </Button>
          </Box>

          {showLoading ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, px: 1 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Skeleton variant="circular" width={56} height={56} />
                  <Skeleton variant="text" width={40} />
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, px: 1 }}>
              {filteredLeaveTypes.map((type) => {
                const config = getLeaveTypeConfig(type.code);
                const IconComponent = config.icon;

                return (
                  <Box
                    key={type.id}
                    onClick={() => router.push(`/leave/${type.code}`)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer'
                    }}
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: config.image ? 'transparent' : config.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: config.image ? 'none' : `0 4px 16px ${config.color}40`,
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          boxShadow: config.image ? 'none' : `0 6px 20px ${config.color}50`,
                        }
                      }}
                    >
                      {config.image ? (
                        <Image
                          src={config.image}
                          alt={type.name}
                          width={40}
                          height={40}
                          priority
                          style={{ objectFit: 'contain' }}
                        />
                      ) : (
                        <IconComponent size={28} color="white" />
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textAlign: 'center', lineHeight: 1.2 }}>
                      {t(`leave_${type.code}`, type.name)}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        {/* Banner Section - ซ่อนหัวข้อถ้าไม่มี banner */}
        {(showLoading || hasBanners) && (
          <Box sx={{ mb: 3 }}>
            {showLoading ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Skeleton variant="text" width={120} height={28} />
                  <Skeleton variant="text" width={60} height={24} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, mx: -2.5, px: 2.5 }}>
                  <Skeleton variant="rounded" sx={{ width: '60%', height: 120, borderRadius: 2, flexShrink: 0 }} />
                  <Skeleton variant="rounded" sx={{ width: '40%', height: 120, borderRadius: 2, flexShrink: 0 }} />
                </Box>
              </>
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                    {t('home_information', 'ประชาสัมพันธ์')}
                  </Typography>
                  <Button
                    size="small"
                    sx={{ fontWeight: 'medium' }}
                    onClick={() => { }} // No action for now or link to all banners
                  >
                    {t('home_see_all', 'ดูทั้งหมด')}
                  </Button>
                </Box>
                <ImageSlider aspectRatio="16/9" onEmpty={() => setHasBanners(false)} />
              </>
            )}
          </Box>
        )}


        {/* Recent Requests Section */}
        <Box>
          {showLoading ? (
            <>
              <Skeleton variant="text" width={160} height={28} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2, mb: 2 }} />
              {[1, 2, 3].map(i => (
                <Skeleton key={i} variant="rounded" height={82} sx={{ borderRadius: 2, mb: 1.5 }} />
              ))}
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                    {t('home_recent_requests', 'การลาล่าสุด')}
                  </Typography>

                </Box>
                <Button
                  size="small"
                  sx={{ fontWeight: 'medium' }}
                  onClick={() => router.push('/leave')}
                >
                  {t('home_see_all', 'ดูทั้งหมด')}
                </Button>
              </Box>

              {recentLeaveRequests.length > 0 ? (
                recentLeaveRequests.map((leave) => {
                  const config = getLeaveTypeConfig(leave.leaveType || leave.leaveCode || 'default');
                  const IconComponent = config.icon;

                  // คำนวณ progress จาก approvals
                  const totalLevels = leave.approvals?.length || 0;
                  const approvedCount = leave.approvals?.filter(a => a.status === 'approved').length || 0;

                  // ตรวจสอบว่า attachment แรกเป็นรูปภาพหรือไม่
                  const firstAttachment = leave.attachments?.[0];
                  const isImageAttachment = firstAttachment?.mimeType?.startsWith('image/');
                  const imageUrl = isImageAttachment ? firstAttachment.filePath : undefined;

                  return (
                    <Box key={leave.id} onClick={() => handleLeaveClick(leave)}>
                      <RecentActivityCard
                        title={t(`leave_${leave.leaveType || leave.leaveCode}`, leave.leaveTypeInfo?.name || 'การลา')}
                        date={formatDate(leave.startDate, leave.endDate)}
                        status={mapStatus(leave.status)}
                        image={imageUrl}
                        icon={<IconComponent size={24} color={config.color} />}
                        iconColor={config.color}
                        approvalStatus={getApprovalStatusText(leave)}
                        currentLevel={approvedCount}
                        totalLevels={totalLevels}
                      />
                    </Box>
                  );
                })
              ) : (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <Typography variant="body2">
                    {t('home_no_leave_requests', 'ยังไม่มีคำขอลา')}
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      </Container>

      <BottomNav activePage="home" />

      <LeaveDetailDrawer
        open={drawerOpen && !cancelDialogOpen}
        onClose={handleCloseDrawer}
        leave={selectedLeave}
        onCancel={() => setCancelDialogOpen(true)}
      />

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => {
          if (!cancelling) {
            setCancelDialogOpen(false);
            setCancelReason('');
          }
        }}
        sx={{ zIndex: 1400 }}
        PaperProps={{
          sx: {
            borderRadius: 1,
            maxWidth: 400,
            width: '90%',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                bgcolor: '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={22} color="#DC2626" />
            </Box>
            <Typography sx={{ fontWeight: 700, color: '#1E293B' }}>
              {t('cancel_leave_title', 'ยืนยันการยกเลิกใบลา')}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#64748B', fontSize: '0.95rem', mb: 2 }}>
            {t('cancel_leave_desc', 'กรุณาระบุเหตุผลที่ต้องการยกเลิกใบลา')}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder={t('cancel_reason_placeholder', 'ระบุเหตุผล...')}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            disabled={cancelling}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setCancelDialogOpen(false);
              setCancelReason('');
            }}
            disabled={cancelling}
            sx={{ color: '#64748B' }}
          >
            {t('btn_back', 'ย้อนกลับ')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancelLeave}
            disabled={cancelling || !cancelReason.trim()}
            sx={{ borderRadius: 1 }}
          >
            {cancelling ? t('cancelling', 'กำลังยกเลิก...') : t('btn_confirm_cancel', 'ยืนยันยกเลิก')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function HeartIcon() {
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        bgcolor: 'white',
        boxShadow: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'secondary.main'
      }}
    >
      <Heart size={18} variant="Bold" color="#F5365C" />
    </Box>
  )
}
