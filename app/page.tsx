'use client';
import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Card, CardContent, Skeleton, Container } from '@mui/material';
import Header from './components/Header';
import LeaveTypeCard from './components/LeaveTypeCard';
import RecentActivityCard from './components/RecentActivityCard';
import BottomNav from './components/BottomNav';
import { Calendar, Activity, Briefcase } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { useLocale } from './providers/LocaleProvider';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { t } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                  {t('home_leave_types', 'ประเภทการลา')}
                </Typography>
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
            {showLoading ? (
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
                <SwiperSlide>
                  <LeaveTypeCard
                    title="ลาพักร้อน"
                    count={10}
                    total={15}
                    color="secondary.main"
                    icon={<Calendar size={24} />}
                  />
                </SwiperSlide>
                <SwiperSlide>
                  <LeaveTypeCard
                    title="ลาป่วย"
                    count={28}
                    total={30}
                    color="primary.main"
                    icon={<Activity size={24} />}
                  />
                </SwiperSlide>
                <SwiperSlide>
                  <LeaveTypeCard
                    title="ลากิจ"
                    count={5}
                    total={7}
                    color="#AB47BC"
                    icon={<Briefcase size={24} />}
                  />
                </SwiperSlide>
              </Swiper>
            )}
          </Box>
        </Box>

        {/* Featured/Announcement Card */}
        {showLoading ? (
          <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3, mb: 3 }} />
        ) : (
          <Card
            sx={{
              mb: 3,
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: -32,
                right: -32,
                width: 128,
                height: 128,
                bgcolor: 'warning.light',
                borderRadius: '0 0 0 100px',
                zIndex: 0
              }}
            />
            <CardContent sx={{ position: 'relative', zIndex: 1, p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
                <Box
                  sx={{
                    bgcolor: 'warning.light',
                    color: 'warning.main',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 50,
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}
                >
                  เร็วๆ นี้
                </Box>
                <HeartIcon />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.25, fontSize: '1.05rem' }}>
                สัมมนาบริษัท
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                14 วิดีโอคอร์ส (ตัวอย่าง)
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', ml: 1 }}>
                  {[1, 2, 3, 4].map(i => (
                    <Box
                      key={i}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: '2px solid white',
                        bgcolor: 'grey.300',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.625rem',
                        color: 'grey.600',
                        ml: -1
                      }}
                    >
                      U{i}
                    </Box>
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                  เข้าร่วมทีม!
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Recent Requests Section */}
        <Box>
          {showLoading ? (
            <>
              <Skeleton variant="text" width={160} height={28} sx={{ mb: 1 }} />
              {[1,2,3].map(i => (
                <Skeleton key={i} variant="rounded" height={82} sx={{ borderRadius: 2, mb: 1.5 }} />
              ))}
            </>
          ) : (
            <>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1.5, color: 'text.primary' }}>
                {t('home_recent_requests', 'คำขอล่าสุด')}
              </Typography>
              <RecentActivityCard
                title="ไปเที่ยวบาหลี"
                date="20 - 25 พ.ย. 2025"
                status="Approved"
                image="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=200&q=80"
              />
              <RecentActivityCard
                title="ตรวจสุขภาพ"
                date="12 พ.ย. 2025"
                status="Pending"
              />
              <RecentActivityCard
                title="ธุระส่วนตัว"
                date="01 พ.ย. 2025"
                status="Rejected"
              />
            </>
          )}
        </Box>
      </Container>

      <BottomNav activePage="home" />
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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </Box>
  )
}
