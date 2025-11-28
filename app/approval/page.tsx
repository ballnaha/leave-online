'use client';

import React, { useEffect, useState } from 'react';
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
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  User,
  FileText,
  Menu,
  AlertCircle,
  Paperclip,
  Building2,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';

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

const leaveTypeNames: Record<string, string> = {
  sick: 'ลาป่วย',
  personal: 'ลากิจ',
  vacation: 'ลาพักร้อน',
  maternity: 'ลาคลอด',
  ordination: 'ลาบวช',
  military: 'ลาเกณฑ์ทหาร',
  unpaid: 'ลาไม่รับค่าจ้าง',
  marriage: 'ลาแต่งงาน',
  funeral: 'ลางานศพ',
  paternity: 'ลาคลอดบุตร (บิดา)',
  sterilization: 'ลาทำหมัน',
  business: 'ลาไปธุระ',
};

const statusConfig: Record<string, { label: string; color: 'warning' | 'success' | 'error' | 'info' | 'default' }> = {
  pending: { label: 'รออนุมัติ', color: 'warning' },
  approved: { label: 'อนุมัติแล้ว', color: 'success' },
  rejected: { label: 'ปฏิเสธ', color: 'error' },
  skipped: { label: 'ข้ามขั้น', color: 'default' },
};

export default function ApprovalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  
  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  
  // Toggle expanded cards
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  
  // Image modal state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  
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
      if (response.ok) {
        const data = await response.json();
        setApprovals(data.data);
        setCounts(data.counts);
      }
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
  
  const handleFileClick = (file: { fileName: string; filePath: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isImageFile(file.fileName)) {
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

      const data = await response.json();

      if (response.ok) {
        setDialogOpen(false);
        fetchApprovals();
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
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

  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();
    
    if (diff <= 0) return { text: 'หมดเวลา', isUrgent: true };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) {
      return { text: `เหลือ ${hours} ชม.`, isUrgent: true };
    }
    
    const days = Math.floor(hours / 24);
    return { text: `เหลือ ${days} วัน`, isUrgent: false };
  };

  const filteredApprovals = (() => {
    switch (tabValue) {
      case 0: // รออนุมัติ
        return approvals.filter(a => a.status === 'pending' || a.leaveRequest.status === 'pending' || a.leaveRequest.status === 'in_progress');
      case 1: // อนุมัติแล้ว
        return approvals.filter(a => a.status === 'approved' || a.leaveRequest.status === 'approved');
      case 2: // ปฏิเสธ
        return approvals.filter(a => a.status === 'rejected' || a.leaveRequest.status === 'rejected');
      default:
        return approvals;
    }
  })();
  
  // Pagination logic
  const totalPages = Math.ceil(filteredApprovals.length / itemsPerPage);
  const paginatedApprovals = filteredApprovals.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 10 }}>
      {/* Header with Gradient */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          pt: 1.5,
          pb: 6,
          px: 2,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton 
            onClick={() => setSidebarOpen(true)} 
            sx={{ 
              color: 'white', 
              mr: 1,
              p: 0.5,
            }}
          >
            <Menu size={24} />
          </IconButton>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white', flex: 1 }}>
            จัดการใบลา
          </Typography>
        </Box>

        {/* Stats Cards - Compact for mobile */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                py: 1.5,
                px: 1,
                textAlign: 'center',
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.2)',
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'white', lineHeight: 1.2 }}>{counts.pending}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.65rem' }}>รอดำเนินการ</Typography>
            </Box>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                py: 1.5,
                px: 1,
                textAlign: 'center',
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.2)',
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'white', lineHeight: 1.2 }}>{counts.approved}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.65rem' }}>อนุมัติ</Typography>
            </Box>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                py: 1.5,
                px: 1,
                textAlign: 'center',
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.2)',
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'white', lineHeight: 1.2 }}>{counts.rejected}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.65rem' }}>ปฏิเสธ</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 2, mt: -3 }}>
        {/* Tabs - Compact for mobile */}
        <Paper 
          elevation={0}
          sx={{ 
            borderRadius: 3, 
            mb: 2, 
            p: 0.5, 
            bgcolor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant="fullWidth"
            sx={{
              minHeight: 40,
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Clock size={14} />
                  <span>รอ</span>
                  {counts.pending > 0 && (
                    <Box 
                      sx={{ 
                        minWidth: 18,
                        height: 18,
                        borderRadius: '50%',
                        bgcolor: tabValue === 0 ? 'white' : '#ff9800',
                        color: tabValue === 0 ? '#667eea' : 'white',
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }} 
                    >
                      {counts.pending}
                    </Box>
                  )}
                </Box>
              }
              sx={{
                borderRadius: 2,
                minHeight: 40,
                minWidth: 0,
                px: 1,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                color: '#888',
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                },
                transition: 'all 0.2s',
              }}
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CheckCircle size={14} />
                  <span>อนุมัติ</span>
                  {counts.approved > 0 && (
                    <Box 
                      sx={{ 
                        minWidth: 18,
                        height: 18,
                        borderRadius: '50%',
                        bgcolor: tabValue === 1 ? 'white' : '#4CAF50',
                        color: tabValue === 1 ? '#667eea' : 'white',
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }} 
                    >
                      {counts.approved}
                    </Box>
                  )}
                </Box>
              }
              sx={{
                borderRadius: 2,
                minHeight: 40,
                minWidth: 0,
                px: 1,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                color: '#888',
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                },
                transition: 'all 0.2s',
              }}
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <XCircle size={14} />
                  <span>ปฏิเสธ</span>
                  {counts.rejected > 0 && (
                    <Box 
                      sx={{ 
                        minWidth: 18,
                        height: 18,
                        borderRadius: '50%',
                        bgcolor: tabValue === 2 ? 'white' : '#f44336',
                        color: tabValue === 2 ? '#667eea' : 'white',
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }} 
                    >
                      {counts.rejected}
                    </Box>
                  )}
                </Box>
              }
              sx={{
                borderRadius: 2,
                minHeight: 40,
                minWidth: 0,
                px: 1,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                color: '#888',
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                },
                transition: 'all 0.2s',
              }}
            />
          </Tabs>
        </Paper>
        
        {/* Items per page selector */}
        {!loading && filteredApprovals.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              {paginatedApprovals.length}/{filteredApprovals.length} รายการ
            </Typography>
            <Select
              size="small"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setPage(1);
              }}
              sx={{ 
                borderRadius: 1.5,
                bgcolor: 'white',
                minWidth: 60,
                '& .MuiSelect-select': { py: 0.5, px: 1, fontSize: '0.75rem' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' }
              }}
            >
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
            </Select>
          </Box>
        )}

        {/* List */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[1, 2, 3, 4,5,6,7].map((i) => (
              <Box 
                key={i} 
                sx={{ 
                  bgcolor: 'white', 
                  borderRadius: 1, 
                  p: 1.5,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                {/* Header skeleton */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={20} sx={{ mb: 0.5 }} />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Skeleton variant="rounded" width={50} height={16} sx={{ borderRadius: 1 }} />
                      <Skeleton variant="text" width={30} height={16} />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    <Skeleton variant="rounded" width={60} height={20} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="circular" width={16} height={16} />
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        ) : filteredApprovals.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, opacity: 0.6 }}>
            <Box sx={{ bgcolor: '#f0f0f0', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              {tabValue === 0 ? <Clock size={40} color="#9e9e9e" /> : 
               tabValue === 1 ? <CheckCircle size={40} color="#9e9e9e" /> : 
               <XCircle size={40} color="#9e9e9e" />}
            </Box>
            <Typography variant="h6" color="text.secondary" fontWeight={600}>
              {tabValue === 0 ? 'ไม่มีรายการรออนุมัติ' : 
               tabValue === 1 ? 'ยังไม่มีรายการที่อนุมัติ' : 
               'ไม่มีรายการที่ถูกปฏิเสธ'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tabValue === 0 ? 'คุณจัดการรายการทั้งหมดเรียบร้อยแล้ว' : 'ประวัติจะแสดงที่นี่'}
            </Typography>
          </Box>
        ) : (
          <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {paginatedApprovals.map((approval) => {
              const isExpanded = expandedCards.has(approval.approvalId);
              const isPending = approval.status === 'pending' || approval.leaveRequest.status === 'pending' || approval.leaveRequest.status === 'in_progress';
              
              return (
                <Card 
                  key={approval.approvalId} 
                  elevation={0}
                  sx={{ 
                    borderRadius: 0, 
                    overflow: 'hidden',
                    bgcolor: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                >
                  {/* Escalated banner */}
                  {approval.leaveRequest.isEscalated && (
                    <Box sx={{ bgcolor: '#fff8e1', color: '#f57c00', px: 1.5, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AlertCircle size={14} />
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>ส่งต่อจากผู้อนุมัติอื่น</Typography>
                    </Box>
                  )}

                  {/* Compact Header - Always visible, clickable to expand */}
                  <Box 
                    onClick={() => toggleCard(approval.approvalId)}
                    sx={{ 
                      p: 1.5, 
                      cursor: 'pointer',
                      bgcolor: isExpanded ? '#fafafa' : 'white',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        src={approval.leaveRequest.user.avatar}
                        sx={{ 
                          width: 40, 
                          height: 40, 
                          bgcolor: '#667eea',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                        }}
                      >
                        {approval.leaveRequest.user.firstName[0]}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.3 }} noWrap>
                          {approval.leaveRequest.user.firstName} {approval.leaveRequest.user.lastName}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                          <Box 
                            sx={{ 
                              px: 0.75, 
                              py: 0.2, 
                              borderRadius: 1, 
                              bgcolor: '#e8eaf6', 
                              color: '#5c6bc0',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                            }}
                          >
                            {leaveTypeNames[approval.leaveRequest.leaveType] || approval.leaveRequest.leaveType}
                          </Box>
                          <Typography sx={{ fontSize: '0.8rem', color: '#999' }}>
                            {approval.leaveRequest.totalDays}วัน
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                        <Box
                          sx={{
                            px: 1,
                            py: 0.3,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            bgcolor: isPending ? '#fff3e0' : 
                                     (approval.leaveRequest.status === 'approved' || approval.status === 'approved') ? '#e8f5e9' : '#ffebee',
                            color: isPending ? '#ef6c00' : 
                                   (approval.leaveRequest.status === 'approved' || approval.status === 'approved') ? '#4CAF50' : '#f44336',
                          }}
                        >
                          {statusConfig[approval.leaveRequest.status]?.label || statusConfig[approval.status]?.label || approval.status}
                        </Box>
                        <ChevronDown 
                          size={16} 
                          style={{ 
                            color: '#bbb',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                          }} 
                        />
                      </Box>
                    </Box>
                  </Box>

                  {/* Expandable Content */}
                  <Collapse in={isExpanded}>
                    <Box sx={{ borderTop: '1px solid #f0f0f0' }} />
                    <Box sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      {/* Employee Info */}
                      <Box sx={{ mb: 1.5, p: 1.5, bgcolor: 'white', borderRadius: 1 }}>
                        <Typography sx={{ fontSize: '0.8rem', color: '#666', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 500 }}>
                          <User size={14} /> ข้อมูลพนักงาน
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                          <Box>
                            <Typography sx={{ fontSize: '0.7rem', color: '#999' }}>ฝ่าย</Typography>
                            <Typography sx={{ fontSize: '0.85rem', color: '#333', fontWeight: 500 }}>
                              {approval.leaveRequest.user.department || '-'}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: '0.7rem', color: '#999' }}>แผนก</Typography>
                            <Typography sx={{ fontSize: '0.85rem', color: '#333', fontWeight: 500 }}>
                              {approval.leaveRequest.user.section || '-'}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: '0.7rem', color: '#999' }}>ตำแหน่ง</Typography>
                            <Typography sx={{ fontSize: '0.85rem', color: '#333', fontWeight: 500 }}>
                              {approval.leaveRequest.user.position || '-'}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: '0.7rem', color: '#999' }}>กะ</Typography>
                            <Typography sx={{ fontSize: '0.85rem', color: '#333', fontWeight: 500 }}>
                              {approval.leaveRequest.user.shift || '-'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Leave Details */}
                      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: 1, minWidth: 100, p: 1.5, bgcolor: 'white', borderRadius: 1 }}>
                          <Typography sx={{ fontSize: '0.75rem', color: '#999', mb: 0.5 }}>วันที่ลา</Typography>
                          <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>
                            {formatDate(approval.leaveRequest.startDate)}
                            {approval.leaveRequest.startDate !== approval.leaveRequest.endDate && 
                              ` - ${formatDate(approval.leaveRequest.endDate)}`}
                          </Typography>
                        </Box>
                        <Box sx={{ minWidth: 70, p: 1.5, bgcolor: 'white', borderRadius: 1, textAlign: 'center' }}>
                          <Typography sx={{ fontSize: '0.75rem', color: '#999', mb: 0.5 }}>จำนวน</Typography>
                          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#667eea' }}>
                            {approval.leaveRequest.totalDays} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>วัน</span>
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ mb: 1.5 }}>
                        <Typography sx={{ fontSize: '0.8rem', color: '#666', mb: 0.5, fontWeight: 500 }}>เหตุผล</Typography>
                        <Typography sx={{ fontSize: '0.9rem', color: '#333', bgcolor: 'white', p: 1.5, borderRadius: 1, lineHeight: 1.5 }}>
                          {approval.leaveRequest.reason}
                        </Typography>
                      </Box>

                      {/* Attachments */}
                      {approval.leaveRequest.attachments && approval.leaveRequest.attachments.length > 0 && (
                        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'white', borderRadius: 1 }}>
                          <Typography sx={{ fontSize: '0.8rem', color: '#666', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 500 }}>
                            <Paperclip size={14} /> ไฟล์แนบ ({approval.leaveRequest.attachments.length})
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {approval.leaveRequest.attachments.map((file) => (
                              <Box 
                                key={file.id}
                                onClick={(e) => handleFileClick(file, e)}
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 0.75, 
                                  px: 1.5, 
                                  py: 1, 
                                  bgcolor: isImageFile(file.fileName) ? '#e3f2fd' : '#fff3e0', 
                                  borderRadius: 1,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  '&:hover': { 
                                    bgcolor: isImageFile(file.fileName) ? '#bbdefb' : '#ffe0b2',
                                    transform: 'scale(1.02)'
                                  }
                                }}
                              >
                                {isImageFile(file.fileName) ? (
                                  <Box 
                                    component="img" 
                                    src={file.filePath} 
                                    sx={{ 
                                      width: 28, 
                                      height: 28, 
                                      borderRadius: 1, 
                                      objectFit: 'cover' 
                                    }} 
                                  />
                                ) : (
                                  <FileText size={16} color="#ef6c00" />
                                )}
                                <Typography sx={{ 
                                  fontSize: '0.85rem', 
                                  color: isImageFile(file.fileName) ? '#1565c0' : '#ef6c00',
                                  fontWeight: 500,
                                  maxWidth: 100, 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis', 
                                  whiteSpace: 'nowrap' 
                                }}>
                                  {file.fileName}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* Approval history */}
                      {approval.leaveRequest.approvalHistory && approval.leaveRequest.approvalHistory.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography sx={{ fontSize: '0.8rem', color: '#666', mb: 0.75, fontWeight: 500 }}>ผู้อนุมัติ</Typography>
                          <Box sx={{ bgcolor: 'white', borderRadius: 1, p: 1.5 }}>
                            {approval.leaveRequest.approvalHistory.map((hist, idx) => (
                              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  {hist.status === 'approved' && <CheckCircle size={14} color="#4CAF50" />}
                                  {hist.status === 'rejected' && <XCircle size={14} color="#f44336" />}
                                  {hist.status === 'pending' && <Clock size={14} color="#ff9800" />}
                                  {hist.status === 'skipped' && <Clock size={14} color="#9e9e9e" />}
                                  <Typography sx={{ fontSize: '0.85rem', color: '#333' }}>
                                    {hist.approver.firstName} {hist.approver.lastName}
                                  </Typography>
                                </Box>
                                <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>
                                  {statusConfig[hist.status]?.label || hist.status}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                    
                    {/* Actions - only for pending - separated section */}
                    {isPending && (
                      <Box sx={{ 
                        p: 1.5, 
                        bgcolor: 'white', 
                        borderTop: '1px solid #f0f0f0',
                        display: 'flex', 
                        gap: 1.5 
                      }}>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(approval, 'approve');
                          }}
                          sx={{ 
                            bgcolor: '#4CAF50', 
                            color: 'white',
                            borderRadius: 1,
                            py: 1,
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                            '&:hover': { bgcolor: '#43A047' }
                          }}
                          startIcon={<CheckCircle size={16} />}
                        >
                          อนุมัติ
                        </Button>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(approval, 'reject');
                          }}
                          sx={{ 
                            bgcolor: '#f44336', 
                            color: 'white',
                            borderRadius: 1,
                            py: 1,
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            boxShadow: '0 2px 8px rgba(244, 67, 54, 0.3)',
                            '&:hover': { bgcolor: '#d32f2f' }
                          }}
                          startIcon={<XCircle size={16} />}
                        >
                          ปฏิเสธ
                        </Button>
                      </Box>
                    )}
                  </Collapse>
                </Card>
              );
            })}
          </Box>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={(_, value) => {
                  setPage(value);
                  setExpandedCards(new Set());
                }}
                size="small"
                shape="rounded"
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontWeight: 500,
                    fontSize: '0.8rem',
                    minWidth: 28,
                    height: 28,
                  },
                  '& .Mui-selected': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important',
                    color: 'white',
                  }
                }}
              />
            </Box>
          )}
          </>
        )}
      </Box>

      {/* Confirm Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 1 }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #eee', pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ 
              bgcolor: actionType === 'approve' ? '#e8f5e9' : '#ffebee', 
              p: 1, 
              borderRadius: '50%',
              display: 'flex'
            }}>
              {actionType === 'approve' ? <CheckCircle color="#4CAF50" /> : <XCircle color="#f44336" />}
            </Box>
            <Typography variant="h6" fontWeight={700}>
              {actionType === 'approve' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการปฏิเสธ'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedApproval && (
            <Box sx={{ mb: 3, bgcolor: '#f8f9fa', p: 2, borderRadius: 1, mt:1 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                สรุปรายการ
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                พนักงาน: <strong>{selectedApproval.leaveRequest.user.firstName} {selectedApproval.leaveRequest.user.lastName}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                ประเภท: {leaveTypeNames[selectedApproval.leaveRequest.leaveType]}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                วันที่: {formatDate(selectedApproval.leaveRequest.startDate)} ({selectedApproval.leaveRequest.totalDays} วัน)
              </Typography>
            </Box>
          )}

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
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button 
            onClick={() => setDialogOpen(false)} 
            disabled={submitting}
            sx={{ borderRadius: 1, color: '#666' }}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitAction}
            disabled={submitting}
            sx={{ 
              borderRadius: 1,
              bgcolor: actionType === 'approve' ? '#4CAF50' : '#FF5252',
              '&:hover': {
                bgcolor: actionType === 'approve' ? '#43A047' : '#E53935',
              }
            }}
          >
            {submitting ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 3,
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
          }
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={() => setImageModalOpen(false)}
            sx={{
              position: 'absolute',
              top: -40,
              right: 0,
              bgcolor: 'rgba(255,255,255,0.9)',
              color: '#333',
              '&:hover': { bgcolor: 'white' },
              zIndex: 1,
            }}
          >
            <XCircle size={24} />
          </IconButton>
          <Box
            component="img"
            src={selectedImage}
            sx={{
              width: '100%',
              maxHeight: '80vh',
              objectFit: 'contain',
              borderRadius: 0,
              bgcolor: 'white',
            }}
          />
        </Box>
      </Dialog>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <BottomNav />
    </Box>
  );
}
