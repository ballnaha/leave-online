'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Skeleton,
  IconButton,
  Divider,
  Alert,
  Paper,
  Collapse,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  ArrowDown2,
  ArrowUp2,
  Forbidden2,
  Health,
  Sun1,
  Sun,
  People,
  Shield,
  Heart,
  Profile2User,
  Car,
  Warning2,
} from 'iconsax-react';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';
import { useLocale } from '@/app/providers/LocaleProvider';

// สีหลักของระบบ (ตาม theme.ts)
const PRIMARY_COLOR = '#6C63FF'; // Soft Purple/Blue from the design
const PRIMARY_LIGHT = '#EAF2F8'; // Light blueish background

// กำหนด icon และสีสำหรับแต่ละประเภทการลา
const leaveTypeConfig: Record<string, { icon: any; color: string; lightColor: string }> = {
    sick: { icon: Health, color: '#D32F2F', lightColor: '#FFEBEE' }, // แดง
    personal: { icon: Briefcase, color: '#1976D2', lightColor: '#E3F2FD' }, // น้ำเงิน
    vacation: { icon: Sun1, color: '#ED6C02', lightColor: '#FFF3E0' }, // ส้ม
    annual: { icon: Sun, color: '#ED6C02', lightColor: '#FFF3E0' }, // ส้ม
    maternity: { icon: People, color: '#9C27B0', lightColor: '#F3E5F5' }, // ม่วง
    ordination: { icon: Building, color: '#ED6C02', lightColor: '#FFF3E0' }, // ส้ม
    work_outside: { icon: Car, color: '#0288D1', lightColor: '#E1F5FE' }, // ฟ้า
    absent: { icon: Warning2, color: '#D32F2F', lightColor: '#FFEBEE' }, // แดง
    military: { icon: Shield, color: '#2E7D32', lightColor: '#E8F5E9' }, // เขียว
    marriage: { icon: Heart, color: '#E91E63', lightColor: '#FCE4EC' }, // ชมพู
    funeral: { icon: Profile2User, color: '#424242', lightColor: '#F5F5F5' }, // เทา
    paternity: { icon: User, color: '#1976D2', lightColor: '#E3F2FD' }, // น้ำเงิน
    sterilization: { icon: Health, color: '#D32F2F', lightColor: '#FFEBEE' }, // แดง
    business: { icon: Car, color: '#0288D1', lightColor: '#E1F5FE' }, // ฟ้า
    unpaid: { icon: Clock, color: '#757575', lightColor: '#EEEEEE' }, // เทา
    default: { icon: InfoCircle, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
};

interface ApprovalItem {
  approvalId: number;
  level: number;
  status: string;
  leaveRequest: {
    id: number;
    leaveType: string;
    startDate: string;
    startTime?: string;
    endDate: string;
    endTime?: string;
    totalDays: number;
    reason: string;
    status: string;
    currentLevel: number;
    escalationDeadline: string;
    isEscalated: boolean;
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
    }>;
  };
}

const statusConfig: Record<string, { label: string; color: string; bgcolor: string; icon: any }> = {
  pending: { label: 'รออนุมัติ', color: '#ED6C02', bgcolor: '#FFF3E0', icon: Clock },
  approved: { label: 'อนุมัติแล้ว', color: '#2E7D32', bgcolor: '#E8F5E9', icon: TickCircle },
  rejected: { label: 'ปฏิเสธ', color: '#D32F2F', bgcolor: '#FFEBEE', icon: CloseCircle },
  cancelled: { label: 'ยกเลิกแล้ว', color: '#757575', bgcolor: '#F5F5F5', icon: Forbidden2 },
  skipped: { label: 'ข้ามขั้น', color: '#757575', bgcolor: '#F5F5F5', icon: Clock },
};

export default function ApprovalPage() {
  const { t } = useLocale();
  
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, cancelled: 0, total: 0 });
  
  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Filter month/year
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  
  // Toggle expanded cards
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  
  // Image modal state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentAttachments, setCurrentAttachments] = useState<Array<{ id: number; fileName: string; filePath: string }>>([]);
  
  // Dialog state
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApprovals();
  }, [tabValue]);
  
  // Reset page when tab changes
  useEffect(() => {
    setPage(1);
    setExpandedCards(new Set());
  }, [tabValue]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      // Always fetch all to get correct counts
      const response = await fetch(`/api/leaves/pending?status=all`);
      if (!response.ok) throw new Error('Failed to fetch approvals');
      const data = await response.json();
      setApprovals(data.data);
      setCounts(data.counts);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to check if file is an image
  const isImageFile = (fileName: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };
  
  const handleFileClick = (file: { fileName: string; filePath: string }, e: React.MouseEvent, attachments?: Array<{ id: number; fileName: string; filePath: string }>) => {
    e.stopPropagation();
    if (isImageFile(file.fileName)) {
      // Filter only image files for the gallery
      const imageFiles = attachments?.filter(f => isImageFile(f.fileName)) || [{ id: 0, fileName: file.fileName, filePath: file.filePath }];
      const clickedIndex = imageFiles.findIndex(f => f.filePath === file.filePath);
      setCurrentAttachments(imageFiles);
      setCurrentImageIndex(clickedIndex >= 0 ? clickedIndex : 0);
      setSelectedImage(file.filePath);
      setImageModalOpen(true);
    } else {
      // Open PDF or other files in new tab
      window.open(file.filePath, '_blank');
    }
  };
  
  const toggleCard = (id: number) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleOpenDialog = (approval: ApprovalItem, action: 'approve' | 'reject') => {
    setSelectedApproval(approval);
    setActionType(action);
    setComment('');
    setError('');
    setDialogOpen(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedApproval) return;

    if (actionType === 'reject' && !comment.trim()) {
      setError('กรุณาระบุเหตุผลในการปฏิเสธ');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/leaves/${selectedApproval.leaveRequest.id}/approve`, {
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

      setDialogOpen(false);
      fetchApprovals();
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateFull = (dateString: string, timeString?: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('th-TH', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return timeString ? `${dateStr} ${timeString} น.` : dateStr;
  };

  const filteredApprovals = (() => {
    let filtered: ApprovalItem[];
    switch (tabValue) {
      case 0: // รออนุมัติ
        // ต้องตรวจสอบว่า leaveRequest ไม่ถูกยกเลิก และ approval status ยังเป็น pending
        filtered = approvals.filter(a => 
          a.status === 'pending' && 
          a.leaveRequest.status !== 'cancelled' && 
          a.leaveRequest.status !== 'approved' && 
          a.leaveRequest.status !== 'rejected'
        );
        break;
      case 1: // อนุมัติแล้ว
        filtered = approvals.filter(a => a.status === 'approved' || a.leaveRequest.status === 'approved');
        break;
      case 2: // ปฏิเสธ
        filtered = approvals.filter(a => a.status === 'rejected' || a.leaveRequest.status === 'rejected');
        break;
      case 3: // ยกเลิก
        filtered = approvals.filter(a => a.status === 'cancelled' || a.leaveRequest.status === 'cancelled');
        break;
      default:
        filtered = approvals;
    }
    
    // Apply month/year filter
    if (filterMonth !== 'all' || filterYear) {
      filtered = filtered.filter(a => {
        const startDate = new Date(a.leaveRequest.startDate);
        const yearMatch = startDate.getFullYear() === filterYear;
        const monthMatch = filterMonth === 'all' || startDate.getMonth() + 1 === filterMonth;
        return yearMatch && monthMatch;
      });
    }
    
    return filtered;
  })();
  
  // Pagination logic
  const totalPages = Math.ceil(filteredApprovals.length / itemsPerPage);
  const paginatedApprovals = filteredApprovals.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#EAF2F8', pb: 10 }}>
      {/* Header - White with centered text */}
      <Box
        sx={{
          bgcolor: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Container maxWidth={false} sx={{ maxWidth: 1200 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 2, position: 'relative' }}>
            {/* Custom Hamburger Icon - Same as Header.tsx */}
            <IconButton 
              onClick={() => setSidebarOpen(true)} 
              sx={{ 
                position: 'absolute',
                left: 8,
                color: 'text.primary',
                width: 40,
                height: 40,
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 20,
                  height: 16,
                  position: 'relative',
                  '& span': {
                    display: 'block',
                    position: 'absolute',
                    height: 2,
                    bgcolor: 'primary.main',
                    borderRadius: 1,
                    transition: 'all 0.3s ease',
                  },
                }}
              >
                <Box component="span" sx={{ width: 20, top: 0 }} />
                <Box component="span" sx={{ width: 14, top: '50%', transform: 'translateY(-50%)', left: 0 }} />
                <Box component="span" sx={{ width: 20, bottom: 0, left: 0 }} />
              </Box>
            </IconButton>
            
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2, color: 'text.primary' }}>
                {t('approval_title', 'รายการรออนุมัติ')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('approval_subtitle', 'จัดการคำขอลาของพนักงาน')}
              </Typography>
            </Box>
          </Box>
          
          {/* Tabs */}
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant="fullWidth"
            sx={{
              minHeight: 48,
              '& .MuiTabs-indicator': { 
                height: 3,
                borderRadius: '3px 3px 0 0',
                bgcolor: PRIMARY_COLOR 
              },
            }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Clock size={18} variant={tabValue === 0 ? "Bold" : "Linear"} />
                  <span style={{ fontWeight: tabValue === 0 ? 600 : 400 }}>รออนุมัติ</span>
                  {counts.pending > 0 && (
                    <Chip 
                      label={counts.pending} 
                      size="small" 
                      sx={{ 
                        height: 20, 
                        minWidth: 20,
                        bgcolor: tabValue === 0 ? PRIMARY_COLOR : '#f5f5f5',
                        color: tabValue === 0 ? 'white' : '#666',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        '& .MuiChip-label': { px: 0.5 }
                      }} 
                    />
                  )}
                </Box>
              }
              sx={{ textTransform: 'none', color: '#64748B', '&.Mui-selected': { color: PRIMARY_COLOR } }}
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TickCircle size={18} variant={tabValue === 1 ? "Bold" : "Linear"} />
                  <span style={{ fontWeight: tabValue === 1 ? 600 : 400 }}>อนุมัติ</span>
                </Box>
              }
              sx={{ textTransform: 'none', color: '#64748B', '&.Mui-selected': { color: PRIMARY_COLOR } }}
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CloseCircle size={18} variant={tabValue === 2 ? "Bold" : "Linear"} />
                  <span style={{ fontWeight: tabValue === 2 ? 600 : 400 }}>ปฏิเสธ</span>
                </Box>
              }
              sx={{ textTransform: 'none', color: '#64748B', '&.Mui-selected': { color: PRIMARY_COLOR } }}
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Forbidden2 size={18} variant={tabValue === 3 ? "Bold" : "Linear"} />
                  <span style={{ fontWeight: tabValue === 3 ? 600 : 400 }}>ยกเลิก</span>
                </Box>
              }
              sx={{ textTransform: 'none', color: '#64748B', '&.Mui-selected': { color: PRIMARY_COLOR } }}
            />
          </Tabs>
        </Container>
      </Box>

      <Container maxWidth={false} sx={{ maxWidth: 1200, px: { xs: 2, sm: 3 }, py: 3 }}>
        {/* Month/Year Filter */}
        {!loading && (
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            mb: 3,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>เดือน</InputLabel>
              <Select
                value={filterMonth}
                label="เดือน"
                onChange={(e) => {
                  setFilterMonth(e.target.value as number | 'all');
                  setPage(1);
                }}
                sx={{ bgcolor: 'white', borderRadius: 2 }}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                <MenuItem value={1}>มกราคม</MenuItem>
                <MenuItem value={2}>กุมภาพันธ์</MenuItem>
                <MenuItem value={3}>มีนาคม</MenuItem>
                <MenuItem value={4}>เมษายน</MenuItem>
                <MenuItem value={5}>พฤษภาคม</MenuItem>
                <MenuItem value={6}>มิถุนายน</MenuItem>
                <MenuItem value={7}>กรกฎาคม</MenuItem>
                <MenuItem value={8}>สิงหาคม</MenuItem>
                <MenuItem value={9}>กันยายน</MenuItem>
                <MenuItem value={10}>ตุลาคม</MenuItem>
                <MenuItem value={11}>พฤศจิกายน</MenuItem>
                <MenuItem value={12}>ธันวาคม</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>ปี</InputLabel>
              <Select
                value={filterYear}
                label="ปี"
                onChange={(e) => {
                  setFilterYear(e.target.value as number);
                  setPage(1);
                }}
                sx={{ bgcolor: 'white', borderRadius: 2 }}
              >
                {[...Array(5)].map((_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <MenuItem key={year} value={year}>
                      {year + 543}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Box>
        )}

        {/* Status Count Cards - Redesigned */}
        {!loading && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, 
            gap: 2, 
            mb: 3 
          }}>
            {/* Pending Card */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 1,
                background: tabValue === 0 
                  ? `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #8B7CF7 100%)` 
                  : 'linear-gradient(135deg, #F8F9FA 0%, #FFFFFF 100%)',
                border: tabValue === 0 ? 'none' : '1px solid #E2E8F0',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': { 
                  transform: 'translateY(-2px)',
                  boxShadow: tabValue === 0 
                    ? '0 8px 25px rgba(108, 99, 255, 0.35)' 
                    : '0 8px 25px rgba(0,0,0,0.08)',
                }
              }}
              onClick={() => setTabValue(0)}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: 2, 
                    bgcolor: tabValue === 0 ? 'rgba(255,255,255,0.2)' : '#EDE7F6',
                  }}>
                    <Clock size={20} color={tabValue === 0 ? 'white' : PRIMARY_COLOR} variant="Bold" />
                  </Box>
                </Box>
                <Typography 
                  variant="h4" 
                  fontWeight={800} 
                  sx={{ color: tabValue === 0 ? 'white' : PRIMARY_COLOR, mb: 0.5 }}
                >
                  {counts.pending}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ color: tabValue === 0 ? 'rgba(255,255,255,0.9)' : '#64748B', fontWeight: 500 }}
                >
                  รออนุมัติ
                </Typography>
              </Box>
              {/* Decorative circle */}
              <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: tabValue === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(108,99,255,0.05)',
              }} />
            </Paper>

            {/* Approved Card */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 1,
                background: tabValue === 1 
                  ? 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)' 
                  : 'linear-gradient(135deg, #F8F9FA 0%, #FFFFFF 100%)',
                border: tabValue === 1 ? 'none' : '1px solid #E2E8F0',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': { 
                  transform: 'translateY(-2px)',
                  boxShadow: tabValue === 1 
                    ? '0 8px 25px rgba(46, 125, 50, 0.35)' 
                    : '0 8px 25px rgba(0,0,0,0.08)',
                }
              }}
              onClick={() => setTabValue(1)}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: 2, 
                    bgcolor: tabValue === 1 ? 'rgba(255,255,255,0.2)' : '#E8F5E9',
                  }}>
                    <TickCircle size={20} color={tabValue === 1 ? 'white' : '#2E7D32'} variant="Bold" />
                  </Box>
                </Box>
                <Typography 
                  variant="h4" 
                  fontWeight={800} 
                  sx={{ color: tabValue === 1 ? 'white' : '#2E7D32', mb: 0.5 }}
                >
                  {counts.approved}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ color: tabValue === 1 ? 'rgba(255,255,255,0.9)' : '#64748B', fontWeight: 500 }}
                >
                  อนุมัติแล้ว
                </Typography>
              </Box>
              <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: tabValue === 1 ? 'rgba(255,255,255,0.1)' : 'rgba(46, 125, 50, 0.05)',
              }} />
            </Paper>

            {/* Rejected Card */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 1,
                background: tabValue === 2 
                  ? 'linear-gradient(135deg, #D32F2F 0%, #EF5350 100%)' 
                  : 'linear-gradient(135deg, #F8F9FA 0%, #FFFFFF 100%)',
                border: tabValue === 2 ? 'none' : '1px solid #E2E8F0',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': { 
                  transform: 'translateY(-2px)',
                  boxShadow: tabValue === 2 
                    ? '0 8px 25px rgba(211, 47, 47, 0.35)' 
                    : '0 8px 25px rgba(0,0,0,0.08)',
                }
              }}
              onClick={() => setTabValue(2)}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: 2, 
                    bgcolor: tabValue === 2 ? 'rgba(255,255,255,0.2)' : '#FFEBEE',
                  }}>
                    <CloseCircle size={20} color={tabValue === 2 ? 'white' : '#D32F2F'} variant="Bold" />
                  </Box>
                </Box>
                <Typography 
                  variant="h4" 
                  fontWeight={800} 
                  sx={{ color: tabValue === 2 ? 'white' : '#D32F2F', mb: 0.5 }}
                >
                  {counts.rejected}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ color: tabValue === 2 ? 'rgba(255,255,255,0.9)' : '#64748B', fontWeight: 500 }}
                >
                  ปฏิเสธ
                </Typography>
              </Box>
              <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: tabValue === 2 ? 'rgba(255,255,255,0.1)' : 'rgba(211, 47, 47, 0.05)',
              }} />
            </Paper>

            {/* Cancelled Card */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 1,
                background: tabValue === 3 
                  ? 'linear-gradient(135deg, #616161 0%, #9E9E9E 100%)' 
                  : 'linear-gradient(135deg, #F8F9FA 0%, #FFFFFF 100%)',
                border: tabValue === 3 ? 'none' : '1px solid #E2E8F0',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': { 
                  transform: 'translateY(-2px)',
                  boxShadow: tabValue === 3 
                    ? '0 8px 25px rgba(97, 97, 97, 0.35)' 
                    : '0 8px 25px rgba(0,0,0,0.08)',
                }
              }}
              onClick={() => setTabValue(3)}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: 2, 
                    bgcolor: tabValue === 3 ? 'rgba(255,255,255,0.2)' : '#F5F5F5',
                  }}>
                    <Forbidden2 size={20} color={tabValue === 3 ? 'white' : '#757575'} variant="Bold" />
                  </Box>
                </Box>
                <Typography 
                  variant="h4" 
                  fontWeight={800} 
                  sx={{ color: tabValue === 3 ? 'white' : '#757575', mb: 0.5 }}
                >
                  {counts.cancelled}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ color: tabValue === 3 ? 'rgba(255,255,255,0.9)' : '#64748B', fontWeight: 500 }}
                >
                  ยกเลิก
                </Typography>
              </Box>
              <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: tabValue === 3 ? 'rgba(255,255,255,0.1)' : 'rgba(117, 117, 117, 0.05)',
              }} />
            </Paper>
          </Box>
        )}

        {/* Items per page selector */}
        {!loading && filteredApprovals.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              ทั้งหมด {filteredApprovals.length} รายการ
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">แสดง</Typography>
              <Select
                size="small"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setPage(1);
                }}
                sx={{ 
                  height: 32,
                  bgcolor: 'white',
                  fontSize: '0.85rem',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: PRIMARY_COLOR },
                }}
              >
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
              </Select>
              <Typography variant="caption" color="text.secondary">รายการ/หน้า</Typography>
            </Box>
          </Box>
        )}

        {/* List */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[1, 2, 3].map((i) => (
              <Paper 
                key={i} 
                elevation={0}
                sx={{ 
                  p: 2, 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  bgcolor: 'white',
                }}
              >
                {/* Row 1: Avatar + Name + Status */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="50%" height={20} sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width="30%" height={16} />
                  </Box>
                  <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="circular" width={20} height={20} />
                </Box>
                
                {/* Row 2: Department */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <Skeleton variant="circular" width={14} height={14} />
                  <Skeleton variant="text" width="40%" height={16} />
                </Box>
                
                {/* Row 3: Leave Type and Days Chips */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Skeleton variant="rounded" width={90} height={24} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="rounded" width={50} height={24} sx={{ borderRadius: 2 }} />
                </Box>
                
                {/* Row 4: Date Box */}
                <Skeleton 
                  variant="rounded" 
                  width="100%" 
                  height={48} 
                  sx={{ borderRadius: 2 }} 
                />
              </Paper>
            ))}
          </Box>
        ) : filteredApprovals.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, opacity: 0.7 }}>
            <Box sx={{ 
              bgcolor: '#f5f5f5', 
              width: 100, 
              height: 100, 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              mx: 'auto', 
              mb: 3 
            }}>
              {tabValue === 0 ? <Clock size={48} color="#9e9e9e" variant="Bulk" /> : 
               tabValue === 1 ? <TickCircle size={48} color="#9e9e9e" variant="Bulk" /> : 
               tabValue === 2 ? <CloseCircle size={48} color="#9e9e9e" variant="Bulk" /> :
               <Forbidden2 size={48} color="#9e9e9e" variant="Bulk" />}
            </Box>
            <Typography variant="h6" color="text.secondary" fontWeight={600} gutterBottom>
              {tabValue === 0 ? 'ไม่มีรายการรออนุมัติ' : 
               tabValue === 1 ? 'ยังไม่มีรายการที่อนุมัติ' : 
               tabValue === 2 ? 'ไม่มีรายการที่ถูกปฏิเสธ' :
               'ไม่มีรายการที่ยกเลิก'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tabValue === 0 ? 'คุณจัดการรายการทั้งหมดเรียบร้อยแล้ว' : 'รายการจะแสดงที่นี่เมื่อมีการดำเนินการ'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {paginatedApprovals.map((approval) => {
              const isExpanded = expandedCards.has(approval.approvalId);
              const isPending = approval.status === 'pending' || approval.leaveRequest.status === 'pending' || approval.leaveRequest.status === 'in_progress';
              const config = leaveTypeConfig[approval.leaveRequest.leaveType] || leaveTypeConfig.default;
              const LeaveIcon = config.icon;
              const statusInfo = statusConfig[approval.leaveRequest.status] || statusConfig[approval.status] || statusConfig.pending;
              const StatusIcon = statusInfo.icon;
              
              return (
                <Paper 
                  key={approval.approvalId} 
                  elevation={0}
                  sx={{ 
                    borderRadius: 1, 
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: isExpanded ? PRIMARY_COLOR : 'grey.200',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: PRIMARY_COLOR,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    }
                  }}
                >
                  {/* Escalated banner */}
                  {approval.leaveRequest.isEscalated && (
                    <Box sx={{ bgcolor: '#FFF3E0', color: '#E65100', px: 2, py: 0.75, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px dashed #FFCC80' }}>
                      <InfoCircle size={16} variant="Bold" />
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>ส่งต่อจากผู้อนุมัติอื่น</Typography>
                    </Box>
                  )}

                  {/* Header - Clickable */}
                  <Box 
                    onClick={() => toggleCard(approval.approvalId)}
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      bgcolor: 'white',
                    }}
                  >
                    {/* Row 1: Avatar + Name + Status */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Avatar
                        src={approval.leaveRequest.user.avatar}
                        sx={{ 
                          width: 40, 
                          height: 40, 
                          bgcolor: config.lightColor,
                          color: config.color,
                          fontSize: '1rem',
                          fontWeight: 600,
                          border: `2px solid ${config.lightColor}`,
                          flexShrink: 0
                        }}
                      >
                        {approval.leaveRequest.user.firstName[0]}
                      </Avatar>
                      
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#1E293B', lineHeight: 1.2 }}>
                          {approval.leaveRequest.user.firstName} {approval.leaveRequest.user.lastName}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.2 }}>
                          {approval.leaveRequest.user.position || '-'}
                        </Typography>
                      </Box>
                      
                      <Chip 
                        label={statusInfo.label}
                        size="small"
                        icon={<StatusIcon size={14} color={statusInfo.color} variant="Bold" />}
                        sx={{ 
                          bgcolor: statusInfo.bgcolor, 
                          color: statusInfo.color,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          height: 24,
                          flexShrink: 0,
                          '& .MuiChip-icon': { ml: 0.5 }
                        }}
                      />
                      
                      <Box sx={{ flexShrink: 0 }}>
                        {isExpanded ? 
                          <ArrowUp2 size={20} color="#94A3B8" /> : 
                          <ArrowDown2 size={20} color="#94A3B8" />
                        }
                      </Box>
                    </Box>
                    
                    {/* Row 2: Department / Section - Full width, left aligned */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      <Building size={14} color="#94A3B8" variant="Bold" />
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>
                        {approval.leaveRequest.user.department || '-'} {approval.leaveRequest.user.section ? `/ ${approval.leaveRequest.user.section}` : ''}
                      </Typography>
                    </Box>
                    
                    {/* Row 3: Leave Type and Days */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                      <Chip 
                        label={t(`leave_${approval.leaveRequest.leaveType}`, approval.leaveRequest.leaveType)}
                        size="small"
                        icon={<LeaveIcon size={14} color={config.color} variant="Bold" />}
                        sx={{ 
                          bgcolor: config.lightColor, 
                          color: config.color,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          height: 24,
                          border: '1px solid',
                          borderColor: 'transparent',
                        }}
                      />
                      <Chip 
                        label={`${approval.leaveRequest.totalDays} วัน`}
                        size="small"
                        sx={{ 
                          bgcolor: '#F1F5F9', 
                          color: '#475569',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          height: 24,
                        }}
                      />
                    </Box>
                    
                    {/* Row 4: Date/Time Display - Full width */}
                    <Box sx={{ 
                      bgcolor: '#F8FAFC', 
                      borderRadius: 2, 
                      p: 1.5,
                      border: '1px solid #E2E8F0'
                    }}>
                      {/* Single Day Leave */}
                      {approval.leaveRequest.startDate === approval.leaveRequest.endDate ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ 
                            bgcolor: '#4CAF50', 
                            borderRadius: 1, 
                            p: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Calendar size={14} color="white" variant="Bold" />
                          </Box>
                          <Typography sx={{ fontSize: '0.8rem', color: '#1E293B', fontWeight: 600 }}>
                            {new Date(approval.leaveRequest.startDate).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}
                          </Typography>
                          {(approval.leaveRequest.startTime || approval.leaveRequest.endTime) && (
                            <Typography sx={{ fontSize: '0.8rem', color: '#1E293B' , fontWeight: 600 }}>
                              ({approval.leaveRequest.startTime || '08:00'} - {approval.leaveRequest.endTime || '17:00'})
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        /* Multiple Days Leave - Compact inline style */
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Box sx={{ 
                            bgcolor: '#4CAF50', 
                            borderRadius: 1, 
                            p: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Calendar size={14} color="white" variant="Bold" />
                          </Box>
                          <Typography sx={{ fontSize: '0.8rem', color: '#1E293B', fontWeight: 600 }}>
                            {new Date(approval.leaveRequest.startDate).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}
                            {approval.leaveRequest.startTime && ` (${approval.leaveRequest.startTime})`}
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>→</Typography>
                          <Typography sx={{ fontSize: '0.8rem', color: '#1E293B', fontWeight: 600 }}>
                            {new Date(approval.leaveRequest.endDate).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}
                            {approval.leaveRequest.endTime && ` (${approval.leaveRequest.endTime})`}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Expandable Content */}
                  <Collapse in={isExpanded}>
                    <Divider sx={{ borderStyle: 'dashed' }} />
                    <Box sx={{ p: 2, bgcolor: '#FAFAFA' }}>
                      {/* Employee Info Grid */}
                      <Box sx={{ mb: 2, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'grey.100' }}>
                        <Typography sx={{ fontSize: '0.8rem', color: '#64748B', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          <User size={16} variant="Bold" color={PRIMARY_COLOR} /> ข้อมูลพนักงาน
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                          <Box>
                            <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>ฝ่าย</Typography>
                            <Typography sx={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>
                              {approval.leaveRequest.user.department || '-'}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>แผนก</Typography>
                            <Typography sx={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>
                              {approval.leaveRequest.user.section || '-'}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>ตำแหน่ง</Typography>
                            <Typography sx={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>
                              {approval.leaveRequest.user.position || '-'}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>กะการทำงาน</Typography>
                            <Typography sx={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>
                              {approval.leaveRequest.user.shift || '-'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Reason */}
                      <Box sx={{ mb: 2 }}>
                        <Typography sx={{ fontSize: '0.8rem', color: '#64748B', mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <DocumentText size={16} variant="Bold" color={PRIMARY_COLOR} /> เหตุผลการลา
                        </Typography>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                          <Typography sx={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.6 }}>
                            {approval.leaveRequest.reason}
                          </Typography>
                        </Paper>
                      </Box>

                      {/* Cancel Reason */}
                      {approval.leaveRequest.status === 'cancelled' && approval.leaveRequest.cancelReason && (
                        <Box sx={{ mb: 2 }}>
                          <Typography sx={{ fontSize: '0.8rem', color: '#D32F2F', mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Forbidden2 size={16} variant="Bold" /> เหตุผลที่ยกเลิก
                          </Typography>
                          <Paper elevation={0} sx={{ p: 2, bgcolor: '#FFEBEE', borderRadius: 1, border: '1px solid', borderColor: '#FFCDD2' }}>
                            <Typography sx={{ fontSize: '0.95rem', color: '#B71C1C', lineHeight: 1.6 }}>
                              {approval.leaveRequest.cancelReason}
                            </Typography>
                          </Paper>
                        </Box>
                      )}

                      {/* Attachments */}
                      {approval.leaveRequest.attachments && approval.leaveRequest.attachments.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography sx={{ fontSize: '0.8rem', color: '#64748B', mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Paperclip2 size={16} variant="Bold" color={PRIMARY_COLOR} /> ไฟล์แนบ ({approval.leaveRequest.attachments.length})
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                            {approval.leaveRequest.attachments.map((file) => (
                              <Box 
                                key={file.id}
                                onClick={(e) => handleFileClick(file, e, approval.leaveRequest.attachments)}
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 1.5, 
                                  p: 1.5, 
                                  bgcolor: 'white', 
                                  borderRadius: 1,
                                  border: '1px solid',
                                  borderColor: 'grey.200',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  '&:hover': { 
                                    borderColor: PRIMARY_COLOR,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                  }
                                }}
                              >
                                {isImageFile(file.fileName) ? (
                                  <Box 
                                    component="img" 
                                    src={file.filePath} 
                                    sx={{ 
                                      width: 40, 
                                      height: 40, 
                                      borderRadius: 1, 
                                      objectFit: 'cover' 
                                    }} 
                                  />
                                ) : (
                                  <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <DocumentText size={24} color="#64748B" />
                                  </Box>
                                )}
                                <Box>
                                  <Typography sx={{ 
                                    fontSize: '0.85rem', 
                                    color: '#334155',
                                    fontWeight: 500,
                                    maxWidth: 150, 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap' 
                                  }}>
                                    {file.fileName}
                                  </Typography>
                                  <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                                    คลิกเพื่อดูไฟล์
                                  </Typography>
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* Approval History */}
                      {approval.leaveRequest.approvalHistory && approval.leaveRequest.approvalHistory.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography sx={{ fontSize: '0.8rem', color: '#64748B', mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Clock size={16} variant="Bold" color={PRIMARY_COLOR} /> ประวัติการอนุมัติ
                          </Typography>
                          <Box sx={{ bgcolor: 'white', borderRadius: 1, p: 2, border: '1px solid', borderColor: 'grey.200' }}>
                            {approval.leaveRequest.approvalHistory.map((hist, idx) => (
                              <Box key={idx} sx={{ position: 'relative', pb: idx === approval.leaveRequest.approvalHistory.length - 1 ? 0 : 2 }}>
                                {/* Timeline line */}
                                {idx !== approval.leaveRequest.approvalHistory.length - 1 && (
                                  <Box sx={{ 
                                    position: 'absolute', 
                                    left: 10, 
                                    top: 24, 
                                    bottom: 0, 
                                    width: 2, 
                                    bgcolor: '#F1F5F9' 
                                  }} />
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
                                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                                        {hist.approver.firstName} {hist.approver.lastName}
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
                                    <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                      {hist.approver.position || 'ผู้อนุมัติ'}
                                    </Typography>
                                    
                                    {hist.comment && (
                                      <Paper elevation={0} sx={{ mt: 1, p: 1.5, bgcolor: '#F8FAFC', borderRadius: 1 }}>
                                        <Typography sx={{ fontSize: '0.8rem', color: '#475569', fontStyle: 'italic' }}>
                                          "{hist.comment}"
                                        </Typography>
                                      </Paper>
                                    )}
                                  </Box>
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                    
                    {/* Actions - only for pending */}
                    {isPending && (
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: '#FAFAFA', 
                        borderTop: '1px solid',
                        borderColor: 'grey.200',
                        display: 'flex', 
                        gap: 2,
                      }}>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(approval, 'reject');
                          }}
                          sx={{ 
                            bgcolor: '#D32F2F',
                            color: 'white',
                            borderRadius: 1,
                            py: 1.5,
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            textTransform: 'none',
                            boxShadow: '0 4px 12px rgba(211, 47, 47, 0.25)',
                            '&:hover': { 
                              bgcolor: '#B71C1C',
                              boxShadow: '0 6px 16px rgba(211, 47, 47, 0.35)',
                            }
                          }}
                          startIcon={<CloseCircle size={20} color="#ffffff" variant="Bold" />}
                        >
                          ปฏิเสธ
                        </Button>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(approval, 'approve');
                          }}
                          sx={{ 
                            bgcolor: '#2E7D32', 
                            color: 'white',
                            borderRadius: 1,
                            py: 1.5,
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            textTransform: 'none',
                            boxShadow: '0 4px 12px rgba(46, 125, 50, 0.25)',
                            '&:hover': { 
                              bgcolor: '#1B5E20',
                              boxShadow: '0 6px 16px rgba(46, 125, 50, 0.35)',
                            }
                          }}
                          startIcon={<TickCircle size={20} color="#ffffff" variant="Bold" />}
                        >
                          อนุมัติ
                        </Button>
                      </Box>
                    )}
                  </Collapse>
                </Paper>
              );
            })}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={(_, value) => {
                  setPage(value);
                  setExpandedCards(new Set());
                }}
                color="primary"
                shape="rounded"
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontWeight: 600,
                  }
                }}
              />
            </Box>
          )}
        </Box>
        )}
      </Container>

      {/* Confirm Dialog - Fullscreen on mobile */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="xs" 
        fullWidth
        fullScreen
        PaperProps={{
          sx: { 
            borderRadius: 0,
            display: 'flex',
            flexDirection: 'column',
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 2 }}>
          <Box sx={{ 
            width: 60, 
            height: 60, 
            borderRadius: '50%', 
            bgcolor: actionType === 'approve' ? '#E8F5E9' : '#FFEBEE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2
          }}>
            {actionType === 'approve' 
              ? <TickCircle size={40} variant="Bold" color="#4CAF50" /> 
              : <CloseCircle size={40} variant="Bold" color="#F44336" />}
          </Box>
          <Typography variant="h6" component="span" fontWeight={700} sx={{ display: 'block' }}>
            {actionType === 'approve' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการปฏิเสธ'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', px: 3 }}>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
            {actionType === 'approve' 
              ? 'คุณต้องการอนุมัติคำขอลาของพนักงานใช่หรือไม่?' 
              : 'คุณต้องการปฏิเสธคำขอลาของพนักงานใช่หรือไม่?'}
          </Typography>

          {selectedApproval && (
            <Box sx={{ mb: 3, bgcolor: '#F8FAFC', p: 2.5, borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary">พนักงาน</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedApproval.leaveRequest.user.firstName} {selectedApproval.leaveRequest.user.lastName}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary">ประเภท</Typography>
                <Typography variant="body2" fontWeight={600}>{t(`leave_${selectedApproval.leaveRequest.leaveType}`, selectedApproval.leaveRequest.leaveType)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' , mb: 1.5}}>
                <Typography variant="body2" color="text.secondary">ตั้งแต่วันที่</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {new Date(selectedApproval.leaveRequest.startDate).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' , mb: 1.5}}>
                <Typography variant="body2" color="text.secondary">ถึงวันที่</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {new Date(selectedApproval.leaveRequest.endDate).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">จำนวนวัน</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedApproval.leaveRequest.totalDays} วัน</Typography>
              </Box>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label={actionType === 'approve' ? 'ความคิดเห็นเพิ่มเติม (ถ้ามี)' : 'เหตุผลในการปฏิเสธ *'}
            multiline
            rows={4}
            fullWidth
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            error={actionType === 'reject' && !comment.trim() && !!error}
            placeholder={actionType === 'approve' ? 'ระบุความคิดเห็น...' : 'กรุณาระบุเหตุผล...'}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
              }
            }}
          />
          
          {/* Spacer to push buttons to bottom */}
          <Box sx={{ flex: 1 }} />
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1.5, flexDirection: 'column' }}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmitAction}
            disabled={submitting}
            size="large"
            sx={{ 
              borderRadius: 2,
              py: 1.5,
              fontSize: '1rem',
              bgcolor: actionType === 'approve' ? '#4CAF50' : '#F44336',
              boxShadow: actionType === 'approve' ? '0 4px 12px rgba(76, 175, 80, 0.3)' : '0 4px 12px rgba(244, 67, 54, 0.3)',
              '&:hover': {
                bgcolor: actionType === 'approve' ? '#43A047' : '#D32F2F',
              }
            }}
          >
            {submitting ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
          </Button>
          <Button 
            fullWidth
            variant="outlined"
            onClick={() => setDialogOpen(false)} 
            disabled={submitting}
            size="large"
            sx={{ borderRadius: 2, py: 1.5, fontSize: '1rem', borderColor: 'grey.300', color: 'text.primary' }}
          >
            ยกเลิก
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Preview Modal with Swiper - Fullscreen */}
      <Dialog
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        fullScreen
        PaperProps={{
          sx: { 
            bgcolor: 'rgba(0,0,0,0.95)',
            overflow: 'hidden',
          }
        }}
      >
        <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <IconButton
            onClick={() => setImageModalOpen(false)}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              zIndex: 10,
            }}
          >
            <CloseCircle size={28} color="white" variant='Outline'/>
          </IconButton>
          
          {currentAttachments.length > 1 ? (
            <Swiper
              modules={[Navigation, SwiperPagination, Zoom]}
              navigation
              pagination={{ clickable: true }}
              zoom={{ maxRatio: 5 }}
              initialSlide={currentImageIndex}
              spaceBetween={10}
              style={{ 
                width: '100%',
                height: '100%',
              }}
            >
              {currentAttachments.map((file) => (
                <SwiperSlide key={file.id}>
                  <Box 
                    className="swiper-zoom-container"
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      height: '100vh',
                      p: 2,
                    }}
                  >
                    <Box
                      component="img"
                      src={file.filePath}
                      alt={file.fileName}
                      sx={{
                        maxWidth: '100%',
                        maxHeight: '95vh',
                        objectFit: 'contain',
                      }}
                    />
                  </Box>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              p: 2,
            }}>
              <Box
                component="img"
                src={selectedImage}
                sx={{
                  maxWidth: '100%',
                  maxHeight: '95vh',
                  objectFit: 'contain',
                }}
              />
            </Box>
          )}
          
          {currentAttachments.length > 1 && (
            <Typography sx={{ 
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center', 
              color: 'white', 
              fontSize: '0.85rem',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              bgcolor: 'rgba(0,0,0,0.5)',
              px: 2,
              py: 0.5,
              borderRadius: 2,
            }}>
              เลื่อนซ้าย-ขวาเพื่อดูรูปภาพอื่น • กดค้างเพื่อซูม
            </Typography>
          )}
        </Box>
      </Dialog>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <BottomNav />
    </Box>
  );
}
