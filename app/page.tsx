'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Button, Card, CardContent, Skeleton, Container } from '@mui/material';
import Header from './components/Header';
import ImageSlider from './components/ImageSlider';
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
import { useSession } from 'next-auth/react';
import { LeaveRequest } from '@/types/leave';
import LeaveDetailDrawer from './components/LeaveDetailDrawer';
import { HelpCircle } from 'lucide-react';

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
  const { status } = useSession();
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
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const loadData = async () => {
      try {
        await Promise.all([
          fetchLeaveTypes(),
          fetchLeaveRequests()
        ]);
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
  const showLoading = !mounted || loading || dataLoading;

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8F9FA' }}>
        <Skeleton variant="circular" width={80} height={80} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
      <Container maxWidth={false} sx={{ maxWidth: 1200, px: { xs: 2.5, sm: 3, md: 4 } }}>
        <Header />

        {/* Quick Actions Section */}
        <Box sx={{ mt: 1.5, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
              {t('home_quick_actions', 'ลาด่วน')}
            </Typography>
            
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
            {[
              { label: t('leave_sick', 'ลาป่วย'), icon: Health, color: '#5E72E4', gradient: 'linear-gradient(135deg, #5E72E4 0%, #825EE4 100%)', path: '/leave/sick' },
              { label: t('leave_personal', 'ลากิจ'), icon: Briefcase, color: '#8965E0', gradient: 'linear-gradient(135deg, #8965E0 0%, #BC65E0 100%)', path: '/leave/personal' },
              { label: t('leave_vacation', 'พักร้อน'), icon: Sun1, color: '#2DCECC', gradient: 'linear-gradient(135deg, #2DCECC 0%, #2D8BCC 100%)', path: '/leave/vacation' },
              { label: t('leave_other', 'ลาอื่นๆ'), icon: HelpCircle, color: '#8898AA', gradient: 'linear-gradient(135deg, #8898AA 0%, #6A7A8A 100%)', path: '/leave/other' },
            ].map((action, index) => (
              <Box 
                key={index} 
                onClick={() => router.push(action.path)}
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
                    background: action.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 16px ${action.color}40`,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      boxShadow: `0 6px 20px ${action.color}50`,
                    }
                  }}
                >
                  <action.icon size={28} color="white" />
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                  {action.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Banner Section */}
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
                  {t('home_featured', 'ประชาสัมพันธ์')}
                </Typography>
                <Button 
                  size="small" 
                  sx={{ fontWeight: 'medium' }}
                  onClick={() => {}} // No action for now or link to all banners
                >
                  {t('home_more', 'เพิ่มเติม')}
                </Button>
              </Box>
              <ImageSlider aspectRatio="16/9" />
            </>
          )}
        </Box>


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
