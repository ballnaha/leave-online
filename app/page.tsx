'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Button, Card, CardContent, Skeleton, Container } from '@mui/material';
import Header from './components/Header';
import LeaveTypeCard from './components/LeaveTypeCard';
import RecentActivityCard from './components/RecentActivityCard';
import BottomNav from './components/BottomNav';
import { 
  Calendar2, Activity, Briefcase, Heart, Sun1, Lovely,
  Building4, Shield, People, Car, Clock, MessageQuestion, Health,
  Profile2User
} from 'iconsax-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { useLocale } from './providers/LocaleProvider';
import { useRouter } from 'next/navigation';
import { LeaveRequest } from '@/types/leave';
import LeaveDetailDrawer from './components/LeaveDetailDrawer';

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
const leaveTypeConfig: Record<string, { icon: any; color: string }> = {
  sick: { icon: Health, color: '#5E72E4' },
  personal: { icon: Briefcase, color: '#8965E0' },
  vacation: { icon: Sun1, color: '#11CDEF' },
  annual: { icon: Sun1, color: '#2DCECC' },
  maternity: { icon: Lovely, color: '#F3A4B5' },
  ordination: { icon: Building4, color: '#FB6340' },
  military: { icon: Shield, color: '#5E72E4' },
  marriage: { icon: Heart, color: '#F3A4B5' },
  funeral: { icon: People, color: '#8898AA' },
  paternity: { icon: Profile2User, color: '#11CDEF' },
  sterilization: { icon: Health, color: '#2DCECC' },
  business: { icon: Car, color: '#8965E0' },
  unpaid: { icon: Clock, color: '#8898AA' },
  other: { icon: MessageQuestion, color: '#5E72E4' },
  default: { icon: Calendar2, color: '#5E72E4' },
};

export default function Home() {
  const { t } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchLeaveTypes();
    fetchLeaveRequests();
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

  const fetchLeaveTypes = async () => {
    try {
      const response = await fetch('/api/leave-types');
      if (!response.ok) throw new Error('Failed to fetch leave types');
      const data = await response.json();
      // แสดงเฉพาะ 3 ประเภทแรก
      setLeaveTypes(data.slice(0, 3));
    } catch (error) {
      console.error('Error fetching leave types:', error);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const response = await fetch('/api/my-leaves');
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
        return `${t('status_waiting_for', 'รอการอนุมัติจาก')} ${pendingApproval.approver?.firstName || 'หัวหน้างาน'}`;
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

  // Prevent hydration mismatch by always showing loading state until mounted
  const showLoading = !mounted || loading;
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
      <Container maxWidth={false} sx={{ maxWidth: 1200, px: { xs: 2.5, sm: 3, md: 4 } }}>
        <Header />

        {/* Leave Balance Section */}
        <Box sx={{ mt: 1.5, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1.5 }}>
            {showLoading ? (
              <>
                <Skeleton variant="text" width={140} height={28} />
                <Skeleton variant="rounded" width={64} height={24} />
              </>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                    {t('home_leave_types', 'ประเภทการลา')}
                  </Typography>
                  <Box
                    sx={{
                      
                      color: 'primary.main',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      bgcolor: '#E8EAF6'
                    }}
                  >
                    {leaveTypes.length}
                  </Box>
                </Box>
                <Button 
                  size="small" 
                  sx={{ fontWeight: 'medium' }}
                  onClick={() => router.push('/leave')}
                >
                  {t('home_see_all', 'ดูทั้งหมด')}
                </Button>
              </>
            )}
          </Box>

          <Box sx={{ mx: -2.5, px: 2.5 }}>
            {showLoading || leaveTypes.length === 0 ? (
              <Box sx={{ display: 'flex', gap: 1.5, pb: 1.5 }}>
                {[1,2,3].map(i => (
                  <Skeleton key={i} variant="rounded" width={220} height={110} sx={{ borderRadius: 3, flexShrink: 0 }} />
                ))}
              </Box>
            ) : (
              <Swiper
                spaceBetween={12}
                slidesPerView={1.5}
                grabCursor={true}
                style={{ paddingBottom: 12 }}
              >
                {leaveTypes.map((leaveType) => {
                  const config = getLeaveTypeConfig(leaveType.code);
                  const IconComponent = config.icon;
                  return (
                    <SwiperSlide key={leaveType.id}>
                      <Box onClick={() => router.push(`/leave/${leaveType.code}`)} sx={{ cursor: 'pointer' }}>
                        <LeaveTypeCard
                          title={leaveType.name}
                          count={leaveType.maxDaysPerYear ? Math.floor(leaveType.maxDaysPerYear * 0.8) : 0}
                          total={leaveType.maxDaysPerYear || 0}
                          color={config.color}
                          icon={<IconComponent size={24} />}
                        />
                      </Box>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            )}
          </Box>
        </Box>

        {/* Featured/Announcement Card -> Main Purple Card */}
        {showLoading ? (
          <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3, mb: 3 }} />
        ) : (
          <Card
            sx={{
              mb: 3,
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '30px',
              boxShadow: '0 10px 30px rgba(94, 114, 228, 0.3)',
              background: 'linear-gradient(135deg, #5E72E4 0%, #825EE4 100%)',
              color: 'white'
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 20,
                right: 20,
                zIndex: 2
              }}
            >
              <Box sx={{ width: 4, height: 4, bgcolor: 'white', borderRadius: '50%', boxShadow: '6px 0 0 white, -6px 0 0 white' }} />
            </Box>
            
            <CardContent sx={{ position: 'relative', zIndex: 1, p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '1.1rem', maxWidth: '70%' }}>
                    วันลาพักร้อนคงเหลือของคุณ
                  </Typography>
                  <Button
                    variant="contained"
                    sx={{
                      mt: 2,
                      bgcolor: 'white',
                      color: '#5E72E4',
                      borderRadius: '12px',
                      textTransform: 'none',
                      fontWeight: 'bold',
                      boxShadow: 'none',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.9)',
                      }
                    }}
                    onClick={() => router.push('/leave/annual')}
                  >
                    ใช้สิทธิ์ลา
                  </Button>
                </Box>
                
                <Box sx={{ position: 'relative', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="80" height="80" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="white"
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - 0.85)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <Typography sx={{ position: 'absolute', fontWeight: 'bold', fontSize: '1.2rem' }}>
                    85%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Recent Requests Section */}
        <Box>
          {showLoading ? (
            <>
              <Skeleton variant="text" width={160} height={28} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2, mb: 2 }} />
              {[1,2,3].map(i => (
                <Skeleton key={i} variant="rounded" height={82} sx={{ borderRadius: 2, mb: 1.5 }} />
              ))}
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                    {t('home_recent_requests', 'คำขอล่าสุด')}
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
                  
                  return (
                    <Box key={leave.id} onClick={() => handleLeaveClick(leave)}>
                      <RecentActivityCard
                        title={leave.reason || leave.leaveTypeInfo?.name || 'การลา'}
                        date={formatDate(leave.startDate, leave.endDate)}
                        status={mapStatus(leave.status)}
                        image={leave.attachments?.[0]?.filePath}
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
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        leave={selectedLeave} 
      />
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
