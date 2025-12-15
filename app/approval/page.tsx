'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
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
  Scissor,
  Add,
  Minus,
  Trash,
  MoneySend,
  Monitor,
  Mobile,
  Eye,
  Grid1,
  RowVertical,
  Category,
  FilterSearch,
  DirectboxNotif,
  Hierarchy,
  ArrowRight2,
  Setting4,
  CloseSquare,
} from 'iconsax-react';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';
import { useLocale } from '@/app/providers/LocaleProvider';
import { Drawer as VaulDrawer } from 'vaul';

// สีหลักของระบบ (ตาม theme.ts)
const PRIMARY_COLOR = '#6C63FF'; // Soft Purple/Blue from the design
const PRIMARY_LIGHT = '#EAF2F8'; // Light blueish background

type IconComponent = React.ElementType;

// กำหนด icon และสีสำหรับแต่ละประเภทการลา
const leaveTypeConfig: Record<string, { icon: IconComponent; color: string; lightColor: string }> = {
  sick: { icon: Health, color: '#D32F2F', lightColor: '#FFEBEE' }, // แดง
  personal: { icon: Briefcase, color: '#1976D2', lightColor: '#E3F2FD' }, // น้ำเงิน
  vacation: { icon: Sun1, color: '#ED6C02', lightColor: '#FFF3E0' }, // ส้ม
  annual: { icon: Sun, color: '#ED6C02', lightColor: '#FFF3E0' }, // ส้ม
  maternity: { icon: People, color: '#9C27B0', lightColor: '#F3E5F5' }, // ม่วง
  ordination: { icon: Building, color: '#ED6C02', lightColor: '#FFF3E0' }, // ส้ม
  work_outside: { icon: Car, color: '#0288D1', lightColor: '#E1F5FE' }, // ฟ้า
  military: { icon: Shield, color: '#2E7D32', lightColor: '#E8F5E9' }, // เขียว
  marriage: { icon: Heart, color: '#E91E63', lightColor: '#FCE4EC' }, // ชมพู
  funeral: { icon: Profile2User, color: '#424242', lightColor: '#F5F5F5' }, // เทา
  paternity: { icon: User, color: '#1976D2', lightColor: '#E3F2FD' }, // น้ำเงิน
  sterilization: { icon: Health, color: '#D32F2F', lightColor: '#FFEBEE' }, // แดง
  business: { icon: Car, color: '#0288D1', lightColor: '#E1F5FE' }, // ฟ้า
  unpaid: { icon: MoneySend, color: '#757575', lightColor: '#EEEEEE' }, // เทา
  other: { icon: InfoCircle, color: '#607D8B', lightColor: '#ECEFF1' }, // เทาฟ้า - ลาอื่นๆ
  default: { icon: InfoCircle, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
};

interface ApprovalItem {
  approvalId: number;
  level: number;
  status: string;
  leaveRequest: {
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
      company: string;
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
      actedBy?: {
        id: number;
        firstName: string;
        lastName: string;
        position?: string;
      } | null;
      approver: {
        id: number;
        firstName: string;
        lastName: string;
        position?: string;
      };
    }>;
  };
}

const getStatusConfig = (t: (key: string, fallback?: string) => string): Record<string, { label: string; color: string; bgcolor: string; icon: IconComponent }> => ({
  pending: { label: t('status_pending', 'รออนุมัติ'), color: '#ED6C02', bgcolor: '#FFF3E0', icon: Clock },
  approved: { label: t('status_approved', 'อนุมัติแล้ว'), color: '#2E7D32', bgcolor: '#E8F5E9', icon: TickCircle },
  rejected: { label: t('status_rejected', 'ปฏิเสธ'), color: '#D32F2F', bgcolor: '#FFEBEE', icon: CloseCircle },
  cancelled: { label: t('status_cancelled', 'ยกเลิกแล้ว'), color: '#757575', bgcolor: '#F5F5F5', icon: Forbidden2 },
  skipped: { label: t('status_skipped', 'ข้ามขั้น'), color: '#757575', bgcolor: '#F5F5F5', icon: Clock },
  in_progress: { label: t('status_in_progress', 'กำลังดำเนินการ'), color: '#ED6C02', bgcolor: '#FFF3E0', icon: Clock },
});

export default function ApprovalPage() {
  const { t, locale } = useLocale();
  const { data: session, status } = useSession();
  const statusConfig = getStatusConfig(t);
  const theme = useTheme();
  const isMobileDevice = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();

  // Roles that can access approval page
  const allowedRoles = ['admin', 'hr_manager', 'hr', 'dept_manager', 'shift_supervisor', 'section_head'];
  const userRole = session?.user?.role;
  const hasApprovalAccess = userRole && allowedRoles.includes(userRole);

  // Check if user is hr_manager
  const isHrManager = session?.user?.role === 'hr_manager';

  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, cancelled: 0, total: 0 });

  // View mode: 'mobile' or 'desktop'
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');

  // Auto-set view mode based on device on first load
  useEffect(() => {
    setViewMode(isMobileDevice ? 'mobile' : 'desktop');
  }, []);

  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter month/year
  const [filterMonth, setFilterMonth] = useState<number | 'all'>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  // Filter department/section (for HR Manager)
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterSection, setFilterSection] = useState<string>('all');

  // Group view mode (for HR Manager): 'list' or 'group'
  const [groupViewMode, setGroupViewMode] = useState<'list' | 'group'>('list');

  // Mobile filter panel toggle
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

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

  // Split Dialog state
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitParts, setSplitParts] = useState<Array<{
    leaveType: string;
    startDate: string;
    endDate: string;
    startPeriod: 'full' | 'half';
    endPeriod: 'full' | 'half';
    totalDays: number;
    reason: string;
  }>>([]);
  const [splitComment, setSplitComment] = useState('');

  // Leave summary state (วันลาคงเหลือของ user)
  const [leaveSummary, setLeaveSummary] = useState<Array<{
    code: string;
    name: string;
    maxDays: number;
    usedDays: number;
    remainingDays: number;
    isUnlimited: boolean;
  }>>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Bottom sheet state for leave type selector
  const [leaveTypeSheetOpen, setLeaveTypeSheetOpen] = useState(false);
  const [currentEditingPartIndex, setCurrentEditingPartIndex] = useState<number | null>(null);

  // Team History state
  const [teamHistory, setTeamHistory] = useState<Array<{
    id: number;
    leaveCode?: string;
    leaveType: string;
    leaveTypeName: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    status: string;
    createdAt: string;
    user: {
      id: number;
      employeeId: string;
      firstName: string;
      lastName: string;
      position?: string;
      company: string;
      department: string;
      section?: string;
      avatar?: string;
    };
    attachments: Array<{ id: number; fileName: string; filePath: string }>;
    approvalHistory: Array<{
      level: number;
      status: string;
      comment?: string;
      actionAt?: string;
    }>;
  }>>([]);
  const [teamHistoryLoading, setTeamHistoryLoading] = useState(false);
  const [teamHistoryCounts, setTeamHistoryCounts] = useState({ total: 0, approved: 0, rejected: 0, pending: 0, cancelled: 0 });
  const [teamHistorySummary, setTeamHistorySummary] = useState<Array<{ code: string; name: string; totalDays: number; count: number }>>([]);
  const [teamHistoryEmployeeSummary, setTeamHistoryEmployeeSummary] = useState<Array<{
    user: { id: number; firstName: string; lastName: string; department: string; section?: string; position?: string; avatar?: string };
    totalDays: number;
    leaveCount: number;
    byType: Record<string, number>;
  }>>([]);
  const [teamHistoryFilterStatus, setTeamHistoryFilterStatus] = useState<string>('all');

  // Employee detail dialog state
  const [employeeDetailOpen, setEmployeeDetailOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{
    user: { id: number; firstName: string; lastName: string; department: string; section?: string; position?: string; avatar?: string };
    totalDays: number;
    leaveCount: number;
    byType: Record<string, number>;
  } | null>(null);

  // โหลดข้อมูลครั้งแรกเมื่อ mount เท่านั้น (เพราะ fetch all แล้ว filter client-side)
  useEffect(() => {
    fetchApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset page when tab changes (ไม่ต้อง fetch ใหม่)
  useEffect(() => {
    setPage(1);
    setExpandedCards(new Set());
    // Fetch team history when tab 4 is selected
    if (tabValue === 4 && teamHistory.length === 0 && !teamHistoryLoading) {
      fetchTeamHistory();
    }
  }, [tabValue]);

  // Fetch team history when filters change (year, month only - not status)
  useEffect(() => {
    if (tabValue === 4) {
      fetchTeamHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterYear, filterMonth]);

  // Reset expanded cards when view mode changes
  useEffect(() => {
    setExpandedCards(new Set());
  }, [viewMode]);

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

  // Fetch team history (ประวัติการลาของลูกน้องทั้งหมด)
  const fetchTeamHistory = async () => {
    setTeamHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('year', filterYear.toString());
      if (filterMonth !== 'all') {
        params.set('month', filterMonth.toString());
      }
      // Always fetch all status - filter on frontend
      // params.set('status', 'all'); // default is all

      const response = await fetch(`/api/leaves/team-history?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch team history');
      const data = await response.json();
      setTeamHistory(data.data || []);
      setTeamHistoryCounts(data.counts || { total: 0, approved: 0, rejected: 0, pending: 0, cancelled: 0 });
      setTeamHistorySummary(data.summary || []);
      // employeeSummary will be calculated on frontend based on filter
      setTeamHistoryEmployeeSummary(data.employeeSummary || []);
    } catch (error) {
      console.error('Error fetching team history:', error);
    } finally {
      setTeamHistoryLoading(false);
    }
  };

  // Filter team history data based on selected status (frontend filtering)
  const filteredTeamHistory = useMemo(() => {
    if (teamHistoryFilterStatus === 'all') {
      return teamHistory;
    }
    if (teamHistoryFilterStatus === 'pending') {
      return teamHistory.filter(item => ['pending', 'in_progress'].includes(item.status));
    }
    return teamHistory.filter(item => item.status === teamHistoryFilterStatus);
  }, [teamHistory, teamHistoryFilterStatus]);

  // Calculate employee summary based on filtered data
  const filteredEmployeeSummary = useMemo(() => {
    const employeeMap: Record<number, {
      user: typeof filteredTeamHistory[0]['user'];
      totalDays: number;
      leaveCount: number;
      byType: Record<string, number>;
    }> = {};

    filteredTeamHistory.forEach(item => {
      if (!employeeMap[item.user.id]) {
        employeeMap[item.user.id] = {
          user: item.user,
          totalDays: 0,
          leaveCount: 0,
          byType: {},
        };
      }
      employeeMap[item.user.id].totalDays += item.totalDays;
      employeeMap[item.user.id].leaveCount += 1;
      employeeMap[item.user.id].byType[item.leaveType] = 
        (employeeMap[item.user.id].byType[item.leaveType] || 0) + item.totalDays;
    });

    return Object.values(employeeMap).sort((a, b) => b.totalDays - a.totalDays);
  }, [filteredTeamHistory]);

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

  // Fetch leave summary for a user
  const fetchLeaveSummary = async (userId: number, year: number) => {
    setLoadingSummary(true);
    try {
      const response = await fetch(`/api/users/${userId}/leave-summary?year=${year}`);
      if (response.ok) {
        const data = await response.json();
        setLeaveSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching leave summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Split Leave Functions
  const handleOpenSplitDialog = async (approval: ApprovalItem) => {
    setSelectedApproval(approval);
    setSplitComment('');
    setError('');
    setLeaveSummary([]);

    // Initialize with 2 parts - first day as original type, rest as new type
    const startDate = new Date(approval.leaveRequest.startDate);
    const endDate = new Date(approval.leaveRequest.endDate);
    const totalDays = approval.leaveRequest.totalDays;

    if (totalDays <= 1) {
      setError(t('split_cannot_single_day', 'ไม่สามารถแยกใบลาที่มีเพียง 1 วันได้'));
      return;
    }

    // Default split: first day = original type, remaining = 
    const firstDayEnd = new Date(startDate);
    const secondDayStart = new Date(startDate);
    secondDayStart.setDate(secondDayStart.getDate() + 1);

    setSplitParts([
      {
        leaveType: approval.leaveRequest.leaveType,
        startDate: startDate.toISOString().split('T')[0],
        endDate: firstDayEnd.toISOString().split('T')[0],
        startPeriod: 'full',
        endPeriod: 'full',
        totalDays: 1,
        reason: approval.leaveRequest.reason || '',
      },
      {
        leaveType: 'unpaid',
        startDate: secondDayStart.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        startPeriod: 'full',
        endPeriod: 'full',
        totalDays: totalDays - 1,
        reason: '',
      },
    ]);

    setSplitDialogOpen(true);

    // Fetch leave summary for the user
    const leaveYear = startDate.getFullYear();
    await fetchLeaveSummary(approval.leaveRequest.user.id, leaveYear);
  };

  // Helper function to get remaining days for a leave type
  const getRemainingDays = (leaveTypeCode: string): { remaining: number; isUnlimited: boolean; name: string } => {
    const summary = leaveSummary.find(s => s.code === leaveTypeCode);
    if (summary) {
      return {
        remaining: summary.remainingDays,
        isUnlimited: summary.isUnlimited,
        name: summary.name
      };
    }
    // Default for unknown types
    return { remaining: 0, isUnlimited: false, name: leaveTypeCode };
  };

  // Helper function to calculate total days with period
  const calculateTotalDaysWithPeriod = (
    startDate: string,
    endDate: string,
    startPeriod: string,
    endPeriod: string
  ): number => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) return 0;

    const daysDiff = end.diff(start, 'day');

    // Period values: full = 1, half = 0.5
    const getPeriodValue = (period: string) => period === 'full' ? 1 : 0.5;

    if (daysDiff === 0) {
      // Same day
      if (startPeriod === 'full' && endPeriod === 'full') return 1;
      if (startPeriod === 'half' && endPeriod === 'half') {
        // ทั้งเริ่มและจบเป็นครึ่งวัน ในวันเดียวกัน = 0.5 วัน (ถือว่าเป็นช่วงเดียวกัน)
        return 0.5;
      }
      // กรณีอื่นๆ ในวันเดียวกัน
      return getPeriodValue(startPeriod);
    }

    // Multiple days
    // First day: depends on startPeriod (full=1, half=0.5)
    const firstDayValue = getPeriodValue(startPeriod);
    // Last day: depends on endPeriod (full=1, half=0.5)
    const lastDayValue = getPeriodValue(endPeriod);
    // Days in between are full days
    const middleDays = Math.max(0, daysDiff - 1);

    return firstDayValue + middleDays + lastDayValue;
  };

  const handleUpdateSplitPart = (index: number, field: string, value: string | number) => {
    setSplitParts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Auto-calculate totalDays if dates or periods change
      if (field === 'startDate' || field === 'endDate' || field === 'startPeriod' || field === 'endPeriod') {
        updated[index].totalDays = calculateTotalDaysWithPeriod(
          updated[index].startDate,
          updated[index].endDate,
          updated[index].startPeriod,
          updated[index].endPeriod
        );

        // เมื่อเปลี่ยน endDate หรือ endPeriod ของส่วนที่ i ให้อัพเดท startDate/startPeriod ของส่วนถัดไป
        if ((field === 'endDate' || field === 'endPeriod') && index < updated.length - 1) {
          const currentEndPeriod = updated[index].endPeriod;

          // กำหนด startPeriod ของส่วนถัดไปตาม endPeriod ของส่วนปัจจุบัน
          let nextStartDate = updated[index].endDate;
          let nextStartPeriod: 'full' | 'half' = 'full';

          if (currentEndPeriod === 'half') {
            // ถ้าจบครึ่งวัน ส่วนถัดไปเริ่มครึ่งวันหลังวันเดียวกัน
            nextStartPeriod = 'half';
          } else {
            // ถ้าจบเต็มวัน ส่วนถัดไปเริ่มวันใหม่
            nextStartDate = dayjs(updated[index].endDate).add(1, 'day').format('YYYY-MM-DD');
            nextStartPeriod = 'full';
          }

          updated[index + 1] = {
            ...updated[index + 1],
            startDate: nextStartDate,
            startPeriod: nextStartPeriod
          };

          // คำนวณ totalDays ของส่วนถัดไปใหม่
          updated[index + 1].totalDays = calculateTotalDaysWithPeriod(
            updated[index + 1].startDate,
            updated[index + 1].endDate,
            updated[index + 1].startPeriod,
            updated[index + 1].endPeriod
          );
        }

        // เมื่อเปลี่ยน startDate หรือ startPeriod ของส่วนที่ i ให้อัพเดท endDate/endPeriod ของส่วนก่อนหน้า
        if ((field === 'startDate' || field === 'startPeriod') && index > 0) {
          const currentStartPeriod = updated[index].startPeriod;

          let prevEndDate = updated[index].startDate;
          let prevEndPeriod: 'full' | 'half' = 'full';

          if (currentStartPeriod === 'half') {
            // ถ้าเริ่มครึ่งวันหลัง ส่วนก่อนหน้าจบครึ่งวันแรกวันเดียวกัน
            prevEndPeriod = 'half';
          } else {
            // ถ้าเริ่มเต็มวัน ส่วนก่อนหน้าจบวันก่อน
            prevEndDate = dayjs(updated[index].startDate).subtract(1, 'day').format('YYYY-MM-DD');
            prevEndPeriod = 'full';
          }

          updated[index - 1] = {
            ...updated[index - 1],
            endDate: prevEndDate,
            endPeriod: prevEndPeriod
          };

          // คำนวณ totalDays ของส่วนก่อนหน้าใหม่
          updated[index - 1].totalDays = calculateTotalDaysWithPeriod(
            updated[index - 1].startDate,
            updated[index - 1].endDate,
            updated[index - 1].startPeriod,
            updated[index - 1].endPeriod
          );
        }
      }

      return updated;
    });
  };

  const handleAddSplitPart = () => {
    if (!selectedApproval) return;

    const lastPart = splitParts[splitParts.length - 1];
    const nextDay = new Date(lastPart.endDate);
    nextDay.setDate(nextDay.getDate() + 1);

    setSplitParts(prev => [...prev, {
      leaveType: '',
      startDate: nextDay.toISOString().split('T')[0],
      endDate: nextDay.toISOString().split('T')[0],
      startPeriod: 'full',
      endPeriod: 'full',
      totalDays: 1,
      reason: '',
    }]);
  };

  const handleRemoveSplitPart = (index: number) => {
    setSplitParts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitSplit = async () => {
    if (!selectedApproval) return;

    // Validate total days
    const totalSplitDays = splitParts.reduce((sum, p) => sum + p.totalDays, 0);
    if (Math.abs(totalSplitDays - selectedApproval.leaveRequest.totalDays) > 0.01) {
      setError(`จำนวนวันรวมไม่ตรง (เดิม: ${selectedApproval.leaveRequest.totalDays} วัน, แยก: ${totalSplitDays} วัน)`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/leaves/${selectedApproval.leaveRequest.id}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          splits: splitParts,
          comment: splitComment.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('error_occurred', 'เกิดข้อผิดพลาด'));
        return;
      }

      setSplitDialogOpen(false);
      fetchApprovals();
    } catch (err) {
      setError(t('connection_error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAction = async () => {
    if (!selectedApproval) return;

    if (actionType === 'reject' && !comment.trim()) {
      setError(t('reject_reason_required', 'กรุณาระบุเหตุผลในการปฏิเสธ'));
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
        const data = await response.json().catch(() => ({ error: t('error_occurred', 'เกิดข้อผิดพลาด') }));
        setError(data.error || t('error_occurred', 'เกิดข้อผิดพลาด'));
        return;
      }

      setDialogOpen(false);
      fetchApprovals();
    } catch (error) {
      setError(t('connection_error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ'));
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
      year: '2-digit',
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

    // Apply company filter
    if (filterCompany !== 'all') {
      filtered = filtered.filter(a => a.leaveRequest.user.company === filterCompany);
    }

    // Apply department/section filter (for HR Manager)
    if (filterDepartment !== 'all') {
      filtered = filtered.filter(a => a.leaveRequest.user.department === filterDepartment);
    }
    if (filterSection !== 'all') {
      filtered = filtered.filter(a => a.leaveRequest.user.section === filterSection);
    }

    return filtered;
  })();

  // Get unique companies from approvals (for HR Manager filter)
  const uniqueCompanies = useMemo(() => {
    const companies = new Set<string>();
    approvals.forEach(a => {
      if (a.leaveRequest.user.company) {
        companies.add(a.leaveRequest.user.company);
      }
    });
    return Array.from(companies).sort();
  }, [approvals]);

  // Get unique departments and sections from approvals (for HR Manager filter)
  const uniqueDepartments = useMemo(() => {
    const deps = new Set<string>();
    approvals.forEach(a => {
      if (a.leaveRequest.user.department) {
        // Filter by selected company if not 'all'
        if (filterCompany === 'all' || a.leaveRequest.user.company === filterCompany) {
          deps.add(a.leaveRequest.user.department);
        }
      }
    });
    return Array.from(deps).sort();
  }, [approvals, filterCompany]);

  const uniqueSections = useMemo(() => {
    const secs = new Set<string>();
    approvals.forEach(a => {
      if (a.leaveRequest.user.section) {
        // Filter by selected company and department if not 'all'
        const companyMatch = filterCompany === 'all' || a.leaveRequest.user.company === filterCompany;
        const deptMatch = filterDepartment === 'all' || a.leaveRequest.user.department === filterDepartment;
        if (companyMatch && deptMatch) {
          secs.add(a.leaveRequest.user.section);
        }
      }
    });
    return Array.from(secs).sort();
  }, [approvals, filterCompany, filterDepartment]);

  // Department summary for HR Manager (pending approvals by department)
  const departmentSummary = useMemo(() => {
    const summary: Record<string, { pending: number; total: number; sections: Record<string, number> }> = {};

    approvals.forEach(a => {
      const dept = a.leaveRequest.user.department || 'ไม่ระบุฝ่าย';
      const sec = a.leaveRequest.user.section || 'ไม่ระบุแผนก';
      const isPending = a.status === 'pending' &&
        a.leaveRequest.status !== 'cancelled' &&
        a.leaveRequest.status !== 'approved' &&
        a.leaveRequest.status !== 'rejected';

      if (!summary[dept]) {
        summary[dept] = { pending: 0, total: 0, sections: {} };
      }
      summary[dept].total++;
      if (isPending) {
        summary[dept].pending++;
        if (!summary[dept].sections[sec]) {
          summary[dept].sections[sec] = 0;
        }
        summary[dept].sections[sec]++;
      }
    });

    return Object.entries(summary)
      .map(([dept, data]) => ({
        department: dept,
        pending: data.pending,
        total: data.total,
        sections: Object.entries(data.sections).map(([sec, count]) => ({ name: sec, count }))
      }))
      .sort((a, b) => b.pending - a.pending); // Sort by pending count
  }, [approvals]);

  // Grouped approvals by department (for group view)
  const groupedApprovals = useMemo(() => {
    const groups: Record<string, ApprovalItem[]> = {};
    filteredApprovals.forEach(a => {
      const dept = a.leaveRequest.user.department || 'ไม่ระบุฝ่าย';
      if (!groups[dept]) {
        groups[dept] = [];
      }
      groups[dept].push(a);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filteredApprovals]);

  // Pagination logic
  const totalPages = Math.ceil(filteredApprovals.length / itemsPerPage);
  const paginatedApprovals = filteredApprovals.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Access Check - Redirect if user doesn't have approval access
  if (status === 'loading') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#EAF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>{t('approval_loading', 'กำลังโหลด...')}</Typography>
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  if (!hasApprovalAccess) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#EAF2F8', pb: 10 }}>
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
              {t('no_approval_permission', 'คุณไม่มีสิทธิ์ในการอนุมัติใบลา เฉพาะหัวหน้างาน, HR และผู้ดูแลระบบเท่านั้นที่สามารถเข้าถึงหน้านี้ได้')}
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/')}
              sx={{
                bgcolor: PRIMARY_COLOR,
                '&:hover': { bgcolor: '#5B52E0' },
                borderRadius: 1,
                px: 4
              }}
            >
              {t('back_to_home', 'กลับหน้าหลัก')}
            </Button>
          </Paper>
        </Container>
        <BottomNav />
      </Box>
    );
  }

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


        </Container>
      </Box>

      <Container maxWidth={false} sx={{ maxWidth: 1600, px: { xs: 2, sm: 3 }, py: 3 }}>
        {/* ========== FILTER SECTION - DESKTOP ========== */}
        {!loading && (
          <Paper
            elevation={0}
            sx={{
              display: { xs: 'none', md: 'block' },
              mb: 3,
              p: 2,
              borderRadius: 1,
              bgcolor: 'white',
              border: '1px solid #E2E8F0',
            }}
          >
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}>
              {/* Left side - Filters */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Date Filters */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>{t('filter_month', 'เดือน')}</InputLabel>
                    <Select
                      value={filterMonth}
                      label={t('filter_month', 'เดือน')}
                      onChange={(e) => {
                        setFilterMonth(e.target.value as number | 'all');
                        setPage(1);
                      }}
                    >
                      <MenuItem value="all">{t('filter_all_months', 'ทั้งหมด')}</MenuItem>
                      <MenuItem value={1}>{t('month_jan', 'มกราคม')}</MenuItem>
                      <MenuItem value={2}>{t('month_feb', 'กุมภาพันธ์')}</MenuItem>
                      <MenuItem value={3}>{t('month_mar', 'มีนาคม')}</MenuItem>
                      <MenuItem value={4}>{t('month_apr', 'เมษายน')}</MenuItem>
                      <MenuItem value={5}>{t('month_may', 'พฤษภาคม')}</MenuItem>
                      <MenuItem value={6}>{t('month_jun', 'มิถุนายน')}</MenuItem>
                      <MenuItem value={7}>{t('month_jul', 'กรกฎาคม')}</MenuItem>
                      <MenuItem value={8}>{t('month_aug', 'สิงหาคม')}</MenuItem>
                      <MenuItem value={9}>{t('month_sep', 'กันยายน')}</MenuItem>
                      <MenuItem value={10}>{t('month_oct', 'ตุลาคม')}</MenuItem>
                      <MenuItem value={11}>{t('month_nov', 'พฤศจิกายน')}</MenuItem>
                      <MenuItem value={12}>{t('month_dec', 'ธันวาคม')}</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>{t('filter_year', 'ปี')}</InputLabel>
                    <Select
                      value={filterYear}
                      label={t('filter_year', 'ปี')}
                      onChange={(e) => {
                        setFilterYear(e.target.value as number);
                        setPage(1);
                      }}
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

                {/* Divider */}
                {isHrManager && uniqueCompanies.length > 0 && (
                  <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                )}

                {/* Company/Department/Section Filter - HR Manager Only */}
                {isHrManager && uniqueCompanies.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>{t('filter_company', 'บริษัท')}</InputLabel>
                      <Select
                        value={filterCompany}
                        label={t('filter_company', 'บริษัท')}
                        onChange={(e) => {
                          setFilterCompany(e.target.value);
                          setFilterDepartment('all');
                          setFilterSection('all');
                          setPage(1);
                        }}
                      >
                        <MenuItem value="all">{t('filter_all_companies', 'ทุกบริษัท')}</MenuItem>
                        {uniqueCompanies.map((company) => (
                          <MenuItem key={company} value={company}>{company}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {uniqueDepartments.length > 0 && (
                      <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>{t('filter_department', 'ฝ่าย')}</InputLabel>
                        <Select
                          value={filterDepartment}
                          label={t('filter_department', 'ฝ่าย')}
                          onChange={(e) => {
                            setFilterDepartment(e.target.value);
                            setFilterSection('all');
                            setPage(1);
                          }}
                        >
                          <MenuItem value="all">{t('filter_all_departments', 'ทุกฝ่าย')}</MenuItem>
                          {uniqueDepartments.map((dept) => {
                            const deptPending = departmentSummary.find(d => d.department === dept)?.pending || 0;
                            return (
                              <MenuItem key={dept} value={dept}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <span>{dept}</span>
                                  {deptPending > 0 && (
                                    <Chip label={deptPending} size="small" sx={{ height: 18, fontSize: '0.7rem', bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 600, ml: 1 }} />
                                  )}
                                </Box>
                              </MenuItem>
                            );
                          })}
                        </Select>
                      </FormControl>
                    )}

                    {uniqueSections.length > 0 && (
                      <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>{t('filter_section', 'แผนก')}</InputLabel>
                        <Select
                          value={filterSection}
                          label={t('filter_section', 'แผนก')}
                          onChange={(e) => {
                            setFilterSection(e.target.value);
                            setPage(1);
                          }}
                        >
                          <MenuItem value="all">{t('filter_all_sections', 'ทุกแผนก')}</MenuItem>
                          {uniqueSections.map((sec) => (
                            <MenuItem key={sec} value={sec}>{sec}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                )}
              </Box>

              {/* Right side - View toggles */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {/* Group View Toggle - HR Manager Only */}
                {isHrManager && tabValue === 0 && (
                  <ToggleButtonGroup
                    value={groupViewMode}
                    exclusive
                    onChange={(_, newMode) => newMode && setGroupViewMode(newMode)}
                    size="small"
                    sx={{
                      '& .MuiToggleButton-root': {
                        border: '1px solid #E2E8F0',
                        '&.Mui-selected': { bgcolor: '#E3F2FD', color: '#1976D2', borderColor: '#1976D2' }
                      }
                    }}
                  >
                    <ToggleButton value="list">
                      <Tooltip title="แสดงรายการ"><RowVertical size={18} variant={groupViewMode === 'list' ? 'Bold' : 'Linear'} color="#1976D2" /></Tooltip>
                    </ToggleButton>
                    <ToggleButton value="group">
                      <Tooltip title="จัดกลุ่มตามแผนก"><Category size={18} variant={groupViewMode === 'group' ? 'Bold' : 'Linear'} color="#1976D2" /></Tooltip>
                    </ToggleButton>
                  </ToggleButtonGroup>
                )}

                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(_, newMode) => newMode && setViewMode(newMode)}
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      border: '1px solid #E2E8F0',
                      '&.Mui-selected': { bgcolor: PRIMARY_COLOR, color: 'white', borderColor: PRIMARY_COLOR }
                    }
                  }}
                >
                  <ToggleButton value="mobile">
                    <Tooltip title="Card View"><Mobile size={18} variant={viewMode === 'mobile' ? 'Bold' : 'Linear'} color={viewMode === 'mobile' ? 'white' : '#64748B'} /></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="desktop">
                    <Tooltip title="Table View"><Monitor size={18} variant={viewMode === 'desktop' ? 'Bold' : 'Linear'} color={viewMode === 'desktop' ? 'white' : '#64748B'} /></Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>
          </Paper>
        )}

        {/* ========== FILTER SECTION - MOBILE (Collapsible) ========== */}
        {!loading && (
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
            {/* Mobile Filter Toggle Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Button
                size="small"
                variant={mobileFilterOpen ? "contained" : "outlined"}
                onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                startIcon={<Setting4 size={18} variant={mobileFilterOpen ? "Bold" : "Linear"} color={mobileFilterOpen ? 'white' : '#64748B'} />}
                sx={{
                  borderRadius: 1,
                  textTransform: 'none',
                  fontWeight: 600,
                  bgcolor: mobileFilterOpen ? PRIMARY_COLOR : 'white',
                  borderColor: mobileFilterOpen ? PRIMARY_COLOR : '#E2E8F0',
                  color: mobileFilterOpen ? 'white' : '#475569',
                  '&:hover': {
                    bgcolor: mobileFilterOpen ? '#5B52E0' : '#F8FAFC',
                    borderColor: PRIMARY_COLOR,
                  }
                }}
              >
                ตัวกรอง
                {(filterMonth !== 'all' || filterDepartment !== 'all' || filterSection !== 'all') && (
                  <Chip
                    label={
                      (filterMonth !== 'all' ? 1 : 0) +
                      (filterDepartment !== 'all' ? 1 : 0) +
                      (filterSection !== 'all' ? 1 : 0)
                    }
                    size="small"
                    sx={{ ml: 1, height: 20, bgcolor: mobileFilterOpen ? 'rgba(255,255,255,0.3)' : '#FFF3E0', color: mobileFilterOpen ? 'white' : '#E65100', fontWeight: 700 }}
                  />
                )}
              </Button>

              {/* Mobile View Mode Toggle */}
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                {isHrManager && tabValue === 0 && (
                  <IconButton
                    size="medium"
                    onClick={() => setGroupViewMode(groupViewMode === 'list' ? 'group' : 'list')}
                    sx={{
                      bgcolor: groupViewMode === 'group' ? '#E3F2FD' : '#F1F5F9',
                      borderRadius: 1,
                    }}
                  >
                    <Category size={20} variant={groupViewMode === 'group' ? 'Bold' : 'Linear'} color={groupViewMode === 'group' ? '#1976D2' : '#64748B'} />
                  </IconButton>
                )}
                <IconButton
                  size="medium"
                  onClick={() => setViewMode(viewMode === 'mobile' ? 'desktop' : 'mobile')}
                  sx={{
                    bgcolor: viewMode === 'desktop' ? PRIMARY_LIGHT : '#F1F5F9',
                    borderRadius: 1,
                  }}
                >
                  {viewMode === 'desktop' ?
                    <Monitor size={20} variant="Bold" color={PRIMARY_COLOR} /> :
                    <Mobile size={20} variant="Bold" color="#64748B" />
                  }
                </IconButton>
              </Box>
            </Box>

            {/* Collapsible Filter Panel */}
            <Collapse in={mobileFilterOpen}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  bgcolor: 'white',
                  border: '1px solid #E2E8F0',
                  mb: 2,
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Date Filters Row */}
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, mb: 1, textTransform: 'uppercase' }}>
                      ช่วงเวลา
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>เดือน</InputLabel>
                        <Select
                          value={filterMonth}
                          label="เดือน"
                          onChange={(e) => { setFilterMonth(e.target.value as number | 'all'); setPage(1); }}
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
                      <FormControl size="small" fullWidth>
                        <InputLabel>ปี</InputLabel>
                        <Select
                          value={filterYear}
                          label="ปี"
                          onChange={(e) => { setFilterYear(e.target.value as number); setPage(1); }}
                        >
                          {[...Array(5)].map((_, i) => {
                            const year = new Date().getFullYear() - 2 + i;
                            return <MenuItem key={year} value={year}>{year + 543}</MenuItem>;
                          })}
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>

                  {/* Company/Department/Section Filters - HR Manager Only */}
                  {isHrManager && uniqueCompanies.length > 0 && (
                    <Box>
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, mb: 1, textTransform: 'uppercase' }}>
                        {t('filter_company', 'บริษัท')} / {t('filter_department', 'ฝ่าย')} / {t('filter_section', 'แผนก')}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <FormControl size="small" fullWidth>
                          <InputLabel>{t('filter_company', 'บริษัท')}</InputLabel>
                          <Select
                            value={filterCompany}
                            label={t('filter_company', 'บริษัท')}
                            onChange={(e) => { setFilterCompany(e.target.value); setFilterDepartment('all'); setFilterSection('all'); setPage(1); }}
                          >
                            <MenuItem value="all">{t('filter_all_companies', 'ทุกบริษัท')}</MenuItem>
                            {uniqueCompanies.map((company) => (
                              <MenuItem key={company} value={company}>{company}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {uniqueDepartments.length > 0 && (
                            <FormControl size="small" fullWidth>
                              <InputLabel>{t('filter_department', 'ฝ่าย')}</InputLabel>
                              <Select
                                value={filterDepartment}
                                label={t('filter_department', 'ฝ่าย')}
                                onChange={(e) => { setFilterDepartment(e.target.value); setFilterSection('all'); setPage(1); }}
                              >
                                <MenuItem value="all">{t('filter_all_departments', 'ทุกฝ่าย')}</MenuItem>
                                {uniqueDepartments.map((dept) => (
                                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                          {uniqueSections.length > 0 && (
                            <FormControl size="small" fullWidth>
                              <InputLabel>{t('filter_section', 'แผนก')}</InputLabel>
                              <Select
                                value={filterSection}
                                label={t('filter_section', 'แผนก')}
                                onChange={(e) => { setFilterSection(e.target.value); setPage(1); }}
                              >
                                <MenuItem value="all">{t('filter_all_sections', 'ทุกแผนก')}</MenuItem>
                                {uniqueSections.map((sec) => (
                                  <MenuItem key={sec} value={sec}>{sec}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  )}

                  {/* Clear Filters Button */}
                  {(filterMonth !== 'all' || filterCompany !== 'all' || filterDepartment !== 'all' || filterSection !== 'all') && (
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => {
                        setFilterMonth('all');
                        setFilterCompany('all');
                        setFilterDepartment('all');
                        setFilterSection('all');
                        setPage(1);
                      }}
                      startIcon={<CloseSquare size={16} />}
                      sx={{ color: '#EF5350', alignSelf: 'flex-start' }}
                    >
                      {t('filter_clear_all', 'ล้างตัวกรองทั้งหมด')}
                    </Button>
                  )}
                </Box>
              </Paper>
            </Collapse>
          </Box>
        )}

        {/* HR Manager Department Summary Cards - Show only when not filtering and pending tab */}
        {!loading && isHrManager && tabValue === 0 && filterCompany === 'all' && filterDepartment === 'all' && departmentSummary.filter(d => d.pending > 0).length > 0 && groupViewMode === 'list' && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <DirectboxNotif size={20} color={PRIMARY_COLOR} variant="Bold" />
              <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                {t('dept_summary_title', 'สรุปรออนุมัติตามฝ่าย')}
              </Typography>
              <Chip
                label={`${departmentSummary.filter(d => d.pending > 0).length} ${t('dept_summary_dept', 'ฝ่าย')}`}
                size="small"
                sx={{
                  height: 22,
                  bgcolor: PRIMARY_LIGHT,
                  color: PRIMARY_COLOR,
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }}
              />
            </Box>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
              gap: 2
            }}>
              {departmentSummary.filter(d => d.pending > 0).slice(0, 8).map((dept) => (
                <Paper
                  key={dept.department}
                  elevation={0}
                  onClick={() => {
                    setFilterDepartment(dept.department);
                    setPage(1);
                  }}
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: 'white',
                    border: '1px solid',
                    borderColor: filterDepartment === dept.department ? PRIMARY_COLOR : '#E2E8F0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: PRIMARY_COLOR,
                      boxShadow: '0 4px 12px rgba(108, 99, 255, 0.15)',
                      transform: 'translateY(-2px)',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: '#1E293B',
                        mb: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {dept.department}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Clock size={14} color="#E65100" variant="Bold" />
                        <Typography sx={{ fontSize: '0.85rem', color: '#E65100', fontWeight: 600 }}>
                          {dept.pending} รายการรออนุมัติ
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{
                      bgcolor: '#FFF3E0',
                      borderRadius: '50%',
                      width: 48,
                      height: 48,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#E65100' }}>
                        {dept.pending}
                      </Typography>
                    </Box>
                  </Box>
                  {/* Section breakdown */}
                  {dept.sections.length > 0 && (
                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed #E2E8F0' }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {dept.sections.slice(0, 3).map((sec) => (
                          <Chip
                            key={sec.name}
                            label={`${sec.name} (${sec.count})`}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              bgcolor: '#F1F5F9',
                              color: '#475569',
                              fontWeight: 500,
                            }}
                          />
                        ))}
                        {dept.sections.length > 3 && (
                          <Chip
                            label={`+${dept.sections.length - 3} แผนก`}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              bgcolor: '#E3F2FD',
                              color: '#1976D2',
                              fontWeight: 500,
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
            {departmentSummary.filter(d => d.pending > 0).length > 8 && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button
                  size="small"
                  onClick={() => setGroupViewMode('group')}
                  endIcon={<ArrowRight2 size={16} />}
                  sx={{ color: PRIMARY_COLOR }}
                >
                  ดูทั้งหมด {departmentSummary.filter(d => d.pending > 0).length} ฝ่าย
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* Active Filter Indicator */}
        {!loading && (filterCompany !== 'all' || filterDepartment !== 'all' || filterSection !== 'all') && (
          <Box sx={{
            mb: 2,
            p: 1.5,
            bgcolor: '#E3F2FD',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <FilterSearch size={18} color="#1976D2" variant="Bold" />
              <Typography sx={{ fontSize: '0.875rem', color: '#1976D2', fontWeight: 500 }}>
                {t('filter_currently', 'กำลังกรอง:')}
              </Typography>
              {filterCompany !== 'all' && (
                <Chip
                  label={`${t('filter_company', 'บริษัท')}: ${filterCompany}`}
                  size="small"
                  onDelete={() => {
                    setFilterCompany('all');
                    setFilterDepartment('all');
                    setFilterSection('all');
                    setPage(1);
                  }}
                  sx={{
                    bgcolor: 'white',
                    color: '#1976D2',
                    fontWeight: 600,
                    '& .MuiChip-deleteIcon': { color: '#1976D2' }
                  }}
                />
              )}
              {filterDepartment !== 'all' && (
                <Chip
                  label={`${t('filter_department', 'ฝ่าย')}: ${filterDepartment}`}
                  size="small"
                  onDelete={() => {
                    setFilterDepartment('all');
                    setFilterSection('all');
                    setPage(1);
                  }}
                  sx={{
                    bgcolor: 'white',
                    color: '#1976D2',
                    fontWeight: 600,
                    '& .MuiChip-deleteIcon': { color: '#1976D2' }
                  }}
                />
              )}
              {filterSection !== 'all' && (
                <Chip
                  label={`${t('filter_section', 'แผนก')}: ${filterSection}`}
                  size="small"
                  onDelete={() => {
                    setFilterSection('all');
                    setPage(1);
                  }}
                  sx={{
                    bgcolor: 'white',
                    color: '#1976D2',
                    fontWeight: 600,
                    '& .MuiChip-deleteIcon': { color: '#1976D2' }
                  }}
                />
              )}
            </Box>
            <Button
              size="small"
              onClick={() => {
                setFilterCompany('all');
                setFilterDepartment('all');
                setFilterSection('all');
                setPage(1);
              }}
              sx={{ color: '#1976D2', fontWeight: 600 }}
            >
              {t('filter_clear', 'ล้างตัวกรอง')}
            </Button>
          </Box>
        )}

        {/* Status Tabs - Swiper Style like Leave Page */}
        {!loading && (
          <Box sx={{
            mb: 3,
            mx: { xs: -2, sm: 0 },
            width: { xs: 'calc(100% + 32px)', sm: '100%' },
            bgcolor: 'white',
            borderRadius: { xs: 0, sm: 2 },
            boxShadow: { xs: 'none', sm: '0 1px 3px rgba(0,0,0,0.05)' },
            border: '1px solid #E2E8F0',
            borderLeft: { xs: 'none', sm: '1px solid #E2E8F0' },
            borderRight: { xs: 'none', sm: '1px solid #E2E8F0' },
          }}>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              variant="scrollable"
              scrollButtons={false}
              sx={{
                minHeight: 48,
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                  bgcolor: [
                    { id: 0, color: '#E65100' },
                    { id: 1, color: '#2E7D32' },
                    { id: 2, color: '#D32F2F' },
                    { id: 3, color: '#757575' },
                    { id: 4, color: '#1976D2' },
                  ][tabValue]?.color || '#667eea',
                  transition: 'left 0.25s ease, width 0.25s ease, background-color 0.3s ease',
                },
                '& .MuiTabs-scroller': {
                  scrollBehavior: 'smooth',
                  '&::-webkit-scrollbar': { display: 'none' },
                  msOverflowStyle: 'none',
                  scrollbarWidth: 'none',
                },
                '& .MuiTabs-flexContainer': {
                  gap: { xs: 2, sm: 3 },
                  px: { xs: 2, sm: 3 },
                  '&::after': {
                    content: '""',
                    minWidth: { xs: 2, sm: 2 },
                    flexShrink: 0,
                  },
                },
              }}
            >
              {[
                { id: 0, label: t('tab_pending', 'รออนุมัติ'), icon: Clock, color: '#E65100', count: counts.pending, showBadge: true },
                { id: 1, label: t('tab_approved', 'อนุมัติ'), icon: TickCircle, color: '#2E7D32', count: counts.approved, showBadge: true },
                { id: 2, label: t('tab_rejected', 'ปฏิเสธ'), icon: CloseCircle, color: '#D32F2F', count: counts.rejected, showBadge: true },
                { id: 3, label: t('tab_cancelled', 'ยกเลิก'), icon: Forbidden2, color: '#757575', count: counts.cancelled, showBadge: true },
                { id: 4, label: t('tab_team_history', 'ประวัติทีม'), icon: Profile2User, color: '#1976D2', count: 0, showBadge: false },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = tabValue === tab.id;

                return (
                  <Tab
                    key={tab.id}
                    value={tab.id}
                    disableRipple
                    icon={<Icon size={18} variant={isActive ? 'Bold' : 'Linear'} color={isActive ? tab.color : '#64748B'} />}
                    iconPosition="start"
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <span>{tab.label}</span>
                        {tab.showBadge && (
                          <Box
                            component="span"
                            sx={{
                              bgcolor: isActive ? tab.color : '#E2E8F0',
                              color: isActive ? 'white' : '#64748B',
                              px: 0.75,
                              py: 0.25,
                              borderRadius: 1,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              minWidth: 20,
                              textAlign: 'center',
                            }}
                          >
                            {tab.count}
                          </Box>
                        )}
                      </Box>
                    }
                    sx={{
                      textTransform: 'none',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: { xs: '0.8rem', sm: '0.9rem' },
                      color: isActive ? '#1E293B' : '#64748B',
                      minHeight: 48,
                      px: 0,
                      minWidth: 'auto',
                      '& .MuiTab-iconWrapper': {
                        mr: 0.5,
                      },
                      '&:hover': {
                        color: '#1E293B',
                        bgcolor: 'transparent',
                      },
                      '&.Mui-selected': {
                        color: '#1E293B',
                      },
                    }}
                  />
                );
              })}
            </Tabs>
          </Box>
        )}

        {/* Items per page selector */}
        {!loading && filteredApprovals.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {t('total_items', 'ทั้งหมด')} {filteredApprovals.length} {t('items_label', 'รายการ')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">{t('show_label', 'แสดง')}</Typography>
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
              <Typography variant="caption" color="text.secondary">{t('items_per_page', 'รายการ/หน้า')}</Typography>
            </Box>
          </Box>
        )}

        {/* Team History Tab Content */}
        {tabValue === 4 ? (
          teamHistoryLoading ? (
            /* Loading state for Team History */
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Paper key={i} elevation={0} sx={{ p: 2, borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Skeleton variant="circular" width={44} height={44} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width={120} />
                      <Skeleton variant="text" width={80} height={14} />
                    </Box>
                    <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 2 }} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Skeleton variant="rounded" width={90} height={24} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rounded" width={50} height={24} sx={{ borderRadius: 1 }} />
                  </Box>
                  <Skeleton variant="rounded" width="100%" height={48} sx={{ borderRadius: 1 }} />
                </Paper>
              ))}
            </Box>
          ) : teamHistoryCounts.total === 0 ? (
            /* Empty state for Team History - only show when NO data at all */
            <Box sx={{ textAlign: 'center', py: 10, opacity: 0.7 }}>
              <Box sx={{
                bgcolor: '#E3F2FD',
                width: 100,
                height: 100,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3
              }}>
                <Profile2User size={48} color="#1976D2" variant="Bulk" />
              </Box>
              <Typography variant="h6" color="text.secondary" fontWeight={600} gutterBottom>
                {t('no_team_history', 'ไม่พบประวัติการลาของทีม')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('team_history_empty_desc', 'ประวัติการลาของลูกน้องจะแสดงที่นี่')}
              </Typography>
            </Box>
          ) : (
            /* Team History Content */
            <Box>
              {/* Summary Cards */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1E293B' }}>
                  {t('team_summary', 'สรุปการลาของทีม')} ({filterYear + 543})
                </Typography>
                
                {/* Status Summary */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {[
                    { key: 'all', label: t('filter_all', 'ทั้งหมด'), count: teamHistoryCounts.total, color: '#64748B' },
                    { key: 'approved', label: t('status_approved', 'อนุมัติ'), count: teamHistoryCounts.approved, color: '#2E7D32' },
                    { key: 'pending', label: t('status_pending', 'รออนุมัติ'), count: teamHistoryCounts.pending, color: '#E65100' },
                    { key: 'rejected', label: t('status_rejected', 'ปฏิเสธ'), count: teamHistoryCounts.rejected, color: '#D32F2F' },
                    { key: 'cancelled', label: t('status_cancelled', 'ยกเลิก'), count: teamHistoryCounts.cancelled, color: '#757575' },
                  ].map((item) => (
                    <Chip
                      key={item.key}
                      label={`${item.label} (${item.count})`}
                      onClick={() => setTeamHistoryFilterStatus(item.key)}
                      sx={{
                        bgcolor: teamHistoryFilterStatus === item.key ? item.color : '#F1F5F9',
                        color: teamHistoryFilterStatus === item.key ? 'white' : '#64748B',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: teamHistoryFilterStatus === item.key ? item.color : '#E2E8F0' },
                      }}
                    />
                  ))}
                </Box>

                {/* Employee Summary - Clickable to show details */}
                <Paper elevation={0} sx={{ p: 2, borderRadius: 1, border: '1px solid #E2E8F0' }}>
                  {filteredEmployeeSummary.length > 0 ? (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">
                          {t('employee_summary_filtered', 'สรุปตามพนักงาน')} ({teamHistoryFilterStatus === 'all' ? t('filter_all', 'ทั้งหมด') : teamHistoryFilterStatus === 'approved' ? t('status_approved', 'อนุมัติ') : teamHistoryFilterStatus === 'pending' ? t('status_pending', 'รออนุมัติ') : teamHistoryFilterStatus === 'rejected' ? t('status_rejected', 'ปฏิเสธ') : t('status_cancelled', 'ยกเลิก')})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('click_to_view_detail', 'คลิกเพื่อดูรายละเอียด')}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {filteredEmployeeSummary.map((item, index) => (
                        <Box 
                          key={item.user.id} 
                          onClick={() => {
                            setSelectedEmployee(item);
                            setEmployeeDetailOpen(true);
                          }}
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1.5,
                            p: 1,
                            mx: -1,
                            borderRadius: 1,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: '#F8FAFC',
                            },
                            '&:active': {
                              bgcolor: '#F1F5F9',
                            }
                          }}
                        >
                          <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, width: 20 }}>
                            #{index + 1}
                          </Typography>
                          <Avatar
                            src={item.user.avatar}
                            sx={{ width: 32, height: 32, fontSize: '0.75rem', bgcolor: PRIMARY_COLOR }}
                          >
                            {item.user.firstName?.[0]}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }} noWrap>
                              {item.user.firstName} {item.user.lastName}
                            </Typography>
                            <Typography sx={{ fontSize: '0.7rem', color: '#64748B' }} noWrap>
                              {item.user.department}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: PRIMARY_COLOR }}>
                                {item.totalDays} {t('days_unit', 'วัน')}
                              </Typography>
                              <Typography sx={{ fontSize: '0.65rem', color: '#94A3B8' }}>
                                {item.leaveCount} {t('times_unit', 'ครั้ง')}
                              </Typography>
                            </Box>
                            <ArrowRight2 size={16} color="#94A3B8" />
                          </Box>
                        </Box>
                      ))}
                      </Box>
                    </>
                  ) : (
                    /* No data for selected status */
                    <Box sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <Profile2User size={40} color="#94A3B8" variant="Bulk" />
                      <Typography sx={{ fontSize: '0.9rem', color: '#64748B', mt: 1 }}>
                        {t('no_data_for_status', 'ไม่พบข้อมูลสำหรับสถานะที่เลือก')}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Box>
            </Box>
          )
        ) : (
        /* Original List Content */
        loading ? (
          viewMode === 'desktop' ? (
            /* Desktop Loading Skeleton */
            <Paper elevation={0} sx={{ borderRadius: 1, border: '1px solid', borderColor: 'grey.200', overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      <TableCell sx={{ fontWeight: 600, width: '25%' }}>พนักงาน</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '15%' }}>ประเภทการลา</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '20%' }}>วันที่</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '10%' }}>จำนวน</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '15%' }}>สถานะ</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '15%' }} align="center">ดำเนินการ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Skeleton variant="circular" width={40} height={40} />
                            <Box>
                              <Skeleton variant="text" width={120} />
                              <Skeleton variant="text" width={80} height={14} />
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                        <TableCell><Skeleton variant="text" width={140} /></TableCell>
                        <TableCell><Skeleton variant="text" width={50} /></TableCell>
                        <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                        <TableCell><Skeleton variant="rounded" width={100} height={32} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : (
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
                    <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="circular" width={20} height={20} />
                  </Box>

                  {/* Row 2: Department */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <Skeleton variant="circular" width={14} height={14} />
                    <Skeleton variant="text" width="40%" height={16} />
                  </Box>

                  {/* Row 3: Leave Type and Days Chips */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Skeleton variant="rounded" width={90} height={24} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rounded" width={50} height={24} sx={{ borderRadius: 1 }} />
                  </Box>

                  {/* Row 4: Date Box */}
                  <Skeleton
                    variant="rounded"
                    width="100%"
                    height={48}
                    sx={{ borderRadius: 1 }}
                  />
                </Paper>
              ))}
            </Box>
          )
        ) : filteredApprovals.length === 0 ? (
          viewMode === 'desktop' ? (
            /* Desktop Empty State with Table Header */
            <Paper elevation={0} sx={{ borderRadius: 1, border: '1px solid', borderColor: 'grey.200', overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      <TableCell sx={{ fontWeight: 600, width: '25%' }}>พนักงาน</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '15%' }}>ประเภทการลา</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '20%' }}>วันที่</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '10%' }}>จำนวน</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '15%' }}>สถานะ</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '15%' }} align="center">ดำเนินการ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Box sx={{ textAlign: 'center', py: 8, opacity: 0.7 }}>
                          <Box sx={{
                            bgcolor: '#f5f5f5',
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 2
                          }}>
                            {tabValue === 0 ? <Clock size={40} color="#9e9e9e" variant="Bulk" /> :
                              tabValue === 1 ? <TickCircle size={40} color="#9e9e9e" variant="Bulk" /> :
                                tabValue === 2 ? <CloseCircle size={40} color="#9e9e9e" variant="Bulk" /> :
                                  <Forbidden2 size={40} color="#9e9e9e" variant="Bulk" />}
                          </Box>
                          <Typography variant="subtitle1" color="text.secondary" fontWeight={600} gutterBottom>
                            {tabValue === 0 ? t('no_pending_items', 'ไม่มีรายการรออนุมัติ') :
                              tabValue === 1 ? t('no_approved_items', 'ยังไม่มีรายการที่อนุมัติ') :
                                tabValue === 2 ? t('no_rejected_items', 'ไม่มีรายการที่ถูกปฏิเสธ') :
                                  t('no_cancelled_items', 'ไม่มีรายการที่ยกเลิก')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {tabValue === 0 ? t('all_items_handled', 'คุณจัดการรายการทั้งหมดเรียบร้อยแล้ว') : t('items_will_show_here', 'รายการจะแสดงที่นี่เมื่อมีการดำเนินการ')}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : (
            /* Mobile Empty State */
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
                {tabValue === 0 ? t('no_pending_items', 'ไม่มีรายการรออนุมัติ') :
                  tabValue === 1 ? t('no_approved_items', 'ยังไม่มีรายการที่อนุมัติ') :
                    tabValue === 2 ? t('no_rejected_items', 'ไม่มีรายการที่ถูกปฏิเสธ') :
                      t('no_cancelled_items', 'ไม่มีรายการที่ยกเลิก')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {tabValue === 0 ? t('all_items_handled', 'คุณจัดการรายการทั้งหมดเรียบร้อยแล้ว') : t('items_will_show_here', 'รายการจะแสดงที่นี่เมื่อมีการดำเนินการ')}
              </Typography>
            </Box>
          )
        ) : isHrManager && groupViewMode === 'group' && tabValue === 0 ? (
          /* ========== GROUP BY DEPARTMENT VIEW (HR Manager Only) ========== */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {groupedApprovals.map(([department, deptApprovals]) => (
              <Paper
                key={department}
                elevation={0}
                sx={{
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  overflow: 'hidden'
                }}
              >
                {/* Department Header */}
                <Box sx={{
                  bgcolor: PRIMARY_COLOR,
                  px: 2.5,
                  py: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      borderRadius: 1,
                      p: 0.75,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Building size={20} color="white" variant="Bold" />
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'white' }}>
                      {department}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`${deptApprovals.length} รายการ`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                      }}
                    />
                    <Button
                      size="small"
                      onClick={() => {
                        setFilterDepartment(department);
                        setGroupViewMode('list');
                        setPage(1);
                      }}
                      sx={{
                        color: 'white',
                        fontSize: '0.75rem',
                        minWidth: 'auto',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                      }}
                      endIcon={<ArrowRight2 size={14} color="white" />}
                    >
                      ดูทั้งหมด
                    </Button>
                  </Box>
                </Box>

                {/* Department Approvals List */}
                <Box sx={{ p: 2 }}>
                  {viewMode === 'desktop' ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>พนักงาน</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>แผนก</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>ประเภทการลา</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>วันที่</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }} align="center">ดำเนินการ</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {deptApprovals.slice(0, 5).map((approval) => {
                            const config = leaveTypeConfig[approval.leaveRequest.leaveType] || leaveTypeConfig.default;
                            const LeaveIcon = config.icon;
                            const isPending = approval.status === 'pending' && (approval.leaveRequest.status === 'pending' || approval.leaveRequest.status === 'in_progress');

                            return (
                              <TableRow key={approval.approvalId} hover>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Avatar
                                      src={approval.leaveRequest.user.avatar}
                                      sx={{ width: 32, height: 32, bgcolor: config.lightColor, color: config.color, fontSize: '0.8rem' }}
                                    >
                                      {approval.leaveRequest.user.firstName[0]}
                                    </Avatar>
                                    <Box>
                                      <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                        {approval.leaveRequest.user.firstName} {approval.leaveRequest.user.lastName}
                                      </Typography>
                                      <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>
                                        {approval.leaveRequest.user.position || '-'}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography sx={{ fontSize: '0.85rem', color: '#475569' }}>
                                    {approval.leaveRequest.user.section || '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Chip
                                      label={`${t(`leave_${approval.leaveRequest.leaveType}`, approval.leaveRequest.leaveType)} (${approval.leaveRequest.totalDays} วัน)`}
                                      size="small"
                                      icon={<LeaveIcon size={12} color={config.color} variant="Bold" />}
                                      sx={{ bgcolor: config.lightColor, color: config.color, fontWeight: 600, fontSize: '0.75rem', height: 24, width: 'fit-content' }}
                                    />
                                    {approval.leaveRequest.leaveCode && (
                                      <Typography sx={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'monospace' }}>
                                        {approval.leaveRequest.leaveCode}
                                      </Typography>
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography sx={{ fontSize: '0.85rem' }}>
                                    {new Date(approval.leaveRequest.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                    {approval.leaveRequest.startDate !== approval.leaveRequest.endDate &&
                                      ` → ${new Date(approval.leaveRequest.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`
                                    }
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                    <Tooltip title="ดูรายละเอียด">
                                      <IconButton size="small" onClick={() => toggleCard(approval.approvalId)} sx={{ bgcolor: '#F1F5F9', width: 28, height: 28 }}>
                                        <Eye size={16} color="#64748B" />
                                      </IconButton>
                                    </Tooltip>
                                    {isPending && (
                                      <>
                                        <Tooltip title="อนุมัติ">
                                          <IconButton size="small" onClick={() => handleOpenDialog(approval, 'approve')} sx={{ bgcolor: '#E8F5E9', width: 28, height: 28 }}>
                                            <TickCircle size={16} color="#2E7D32" variant="Bold" />
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title="ปฏิเสธ">
                                          <IconButton size="small" onClick={() => handleOpenDialog(approval, 'reject')} sx={{ bgcolor: '#FFEBEE', width: 28, height: 28 }}>
                                            <CloseCircle size={16} color="#D32F2F" variant="Bold" />
                                          </IconButton>
                                        </Tooltip>
                                      </>
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {deptApprovals.slice(0, 5).map((approval) => {
                        const config = leaveTypeConfig[approval.leaveRequest.leaveType] || leaveTypeConfig.default;
                        const LeaveIcon = config.icon;
                        const isPending = approval.status === 'pending' && (approval.leaveRequest.status === 'pending' || approval.leaveRequest.status === 'in_progress');

                        return (
                          <Box
                            key={approval.approvalId}
                            sx={{
                              p: 1.5,
                              bgcolor: '#F8FAFC',
                              borderRadius: 1,
                              border: '1px solid #E2E8F0',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                            }}
                          >
                            <Avatar
                              src={approval.leaveRequest.user.avatar}
                              sx={{ width: 36, height: 36, bgcolor: config.lightColor, color: config.color, fontSize: '0.85rem' }}
                            >
                              {approval.leaveRequest.user.firstName[0]}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.2 }}>
                                {approval.leaveRequest.user.firstName} {approval.leaveRequest.user.lastName}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                <Chip
                                  label={t(`leave_${approval.leaveRequest.leaveType}`, approval.leaveRequest.leaveType)}
                                  size="small"
                                  icon={<LeaveIcon size={12} color={config.color} variant="Bold" />}
                                  sx={{ bgcolor: config.lightColor, color: config.color, fontWeight: 600, fontSize: '0.7rem', height: 20 }}
                                />
                                {approval.leaveRequest.leaveCode && (
                                  <Typography sx={{ fontSize: '0.75rem', color: '#64748B', bgcolor: '#F1F5F9', px: 0.5, borderRadius: 0.5, fontFamily: 'monospace' }}>
                                    {approval.leaveRequest.leaveCode}
                                  </Typography>
                                )}
                                <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>
                                  {approval.leaveRequest.totalDays} วัน • {new Date(approval.leaveRequest.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                </Typography>
                              </Box>
                            </Box>
                            {isPending && (
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton size="small" onClick={() => handleOpenDialog(approval, 'approve')} sx={{ bgcolor: '#E8F5E9', width: 32, height: 32 }}>
                                  <TickCircle size={18} color="#2E7D32" variant="Bold" />
                                </IconButton>
                                <IconButton size="small" onClick={() => handleOpenDialog(approval, 'reject')} sx={{ bgcolor: '#FFEBEE', width: 32, height: 32 }}>
                                  <CloseCircle size={18} color="#D32F2F" variant="Bold" />
                                </IconButton>
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  )}

                  {deptApprovals.length > 5 && (
                    <Box sx={{ textAlign: 'center', mt: 2, pt: 2, borderTop: '1px dashed #E2E8F0' }}>
                      <Button
                        size="small"
                        onClick={() => {
                          setFilterDepartment(department);
                          setGroupViewMode('list');
                          setPage(1);
                        }}
                        sx={{ color: PRIMARY_COLOR }}
                        endIcon={<ArrowRight2 size={16} />}
                      >
                        ดูทั้งหมด {deptApprovals.length} รายการ
                      </Button>
                    </Box>
                  )}
                </Box>
              </Paper>
            ))}
          </Box>
        ) : viewMode === 'desktop' ? (
          /* ========== DESKTOP TABLE VIEW ========== */
          <Paper elevation={0} sx={{ borderRadius: 1, border: '1px solid', borderColor: 'grey.200', overflow: 'hidden' }}>
            <TableContainer>
              <Table sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem', width: '20%' }}>พนักงาน</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem', width: '12%' }}>การลา</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem', width: '12%' }}>วันที่ส่ง</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem', width: '14%' }}>วันที่ลา</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem', width: '20%' }}>เหตุผล</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem', width: '8%' }} align="center">แนบ</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem', width: '9%' }}>สถานะ</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem', width: '13%' }} align="center">ดำเนินการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedApprovals.map((approval) => {
                    const isPending = approval.status === 'pending' && (approval.leaveRequest.status === 'pending' || approval.leaveRequest.status === 'in_progress');
                    const config = leaveTypeConfig[approval.leaveRequest.leaveType] || leaveTypeConfig.default;
                    const LeaveIcon = config.icon;
                    const statusInfo = statusConfig[approval.leaveRequest.status] || statusConfig[approval.status] || statusConfig.pending;
                    const StatusIcon = statusInfo.icon;
                    const hasAttachments = approval.leaveRequest.attachments && approval.leaveRequest.attachments.length > 0;

                    return (
                      <TableRow
                        key={approval.approvalId}
                        sx={{
                          '&:hover': { bgcolor: '#F8FAFC' },
                          bgcolor: approval.leaveRequest.isEscalated ? '#FFF8E1' : 'white',
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleCard(approval.approvalId)}
                      >
                        {/* Employee Info - Combined name, position, department */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              src={approval.leaveRequest.user.avatar}
                              sx={{
                                width: 42,
                                height: 42,
                                bgcolor: config.lightColor,
                                color: config.color,
                                fontSize: '0.95rem',
                                fontWeight: 600,
                              }}
                            >
                              {approval.leaveRequest.user.firstName[0]}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {approval.leaveRequest.user.firstName} {approval.leaveRequest.user.lastName}
                                </Typography>
                                {approval.leaveRequest.isEscalated && (
                                  <Chip
                                    label="ส่งต่อ (Escalated)"
                                    size="small"
                                    icon={<InfoCircle size={14} color="#E65100" variant="Bold" />}
                                    sx={{
                                      height: 20,
                                      fontSize: '0.7rem',
                                      bgcolor: '#FFF3E0',
                                      color: '#E65100',
                                      border: '1px solid #FFCC80',
                                      '& .MuiChip-icon': { color: '#E65100', ml: 0.5 }
                                    }}
                                  />
                                )}
                              </Box>
                              <Typography sx={{ fontSize: '0.8rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {approval.leaveRequest.user.department || '-'} {approval.leaveRequest.user.section ? `• ${approval.leaveRequest.user.section}` : ''}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        {/* Leave Type + Days Combined */}
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Chip
                              label={t(`leave_${approval.leaveRequest.leaveType}`, approval.leaveRequest.leaveType)}
                              size="small"
                              icon={<LeaveIcon size={14} color={config.color} variant="Bold" />}
                              sx={{
                                bgcolor: config.lightColor,
                                color: config.color,
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                height: 26,
                                width: 'fit-content',
                                '& .MuiChip-icon': { ml: 0.3 }
                              }}
                            />
                            {approval.leaveRequest.leaveCode && (
                              <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace' }}>
                                {approval.leaveRequest.leaveCode}
                              </Typography>
                            )}
                            <Typography sx={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                              {approval.leaveRequest.totalDays} วัน
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Submission Date */}
                        <TableCell>
                          <Box>
                            <Typography sx={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500 }}>
                              {new Date(approval.leaveRequest.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                            </Typography>
                            <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                              {new Date(approval.leaveRequest.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Date */}
                        <TableCell>
                          {approval.leaveRequest.startDate === approval.leaveRequest.endDate ? (
                            <Box>
                              <Typography sx={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500 }}>
                                {new Date(approval.leaveRequest.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                              </Typography>
                              {(approval.leaveRequest.startTime || approval.leaveRequest.endTime) && (
                                <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                                  {approval.leaveRequest.startTime || '08:00'} - {approval.leaveRequest.endTime || '17:00'}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Box>
                              <Typography sx={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500 }}>
                                {new Date(approval.leaveRequest.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                {' → '}
                                {new Date(approval.leaveRequest.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                              </Typography>
                            </Box>
                          )}
                        </TableCell>

                        {/* Reason - New Column */}
                        <TableCell>
                          <Tooltip title={approval.leaveRequest.reason || '-'} placement="top">
                            <Typography
                              sx={{
                                fontSize: '0.875rem',
                                color: '#475569',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                lineHeight: 1.5,
                              }}
                            >
                              {approval.leaveRequest.reason || '-'}
                            </Typography>
                          </Tooltip>
                        </TableCell>

                        {/* Attachments - New Column */}
                        <TableCell align="center">
                          {hasAttachments ? (
                            <Tooltip title={`${approval.leaveRequest.attachments.length} ไฟล์แนบ`}>
                              <Box
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  bgcolor: '#E3F2FD',
                                  color: '#1976D2',
                                  px: 1.5,
                                  py: 0.75,
                                  borderRadius: 1,
                                  cursor: 'pointer',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Open first image if it's an image, otherwise toggle card
                                  const imageFile = approval.leaveRequest.attachments.find(f => isImageFile(f.fileName));
                                  if (imageFile) {
                                    handleFileClick(imageFile, e, approval.leaveRequest.attachments);
                                  } else {
                                    toggleCard(approval.approvalId);
                                  }
                                }}
                              >
                                <Paperclip2 size={16} variant="Bold" color="#1976D2" />
                                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                  {approval.leaveRequest.attachments.length}
                                </Typography>
                              </Box>
                            </Tooltip>
                          ) : (
                            <Typography sx={{ fontSize: '0.85rem', color: '#CBD5E1' }}>-</Typography>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Chip
                            label={statusInfo.label}
                            size="small"
                            icon={<StatusIcon size={16} color={statusInfo.color} variant="Bold" />}
                            sx={{
                              bgcolor: statusInfo.bgcolor,
                              color: statusInfo.color,
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              height: 28,
                              '& .MuiChip-icon': { ml: 0.5 }
                            }}
                          />
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center' }}>
                            <Tooltip title="ดูรายละเอียด">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCard(approval.approvalId);
                                }}
                                sx={{
                                  bgcolor: '#F1F5F9',
                                  width: 34,
                                  height: 34,
                                  '&:hover': { bgcolor: '#E2E8F0' }
                                }}
                              >
                                <Eye size={20} color="#64748B" />
                              </IconButton>
                            </Tooltip>
                            {isPending && (
                              <>
                                <Tooltip title="อนุมัติ">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenDialog(approval, 'approve');
                                    }}
                                    sx={{
                                      bgcolor: '#E8F5E9',
                                      width: 34,
                                      height: 34,
                                      '&:hover': { bgcolor: '#C8E6C9' }
                                    }}
                                  >
                                    <TickCircle size={20} color="#2E7D32" variant="Bold" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="ปฏิเสธ">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenDialog(approval, 'reject');
                                    }}
                                    sx={{
                                      bgcolor: '#FFEBEE',
                                      width: 34,
                                      height: 34,
                                      '&:hover': { bgcolor: '#FFCDD2' }
                                    }}
                                  >
                                    <CloseCircle size={20} color="#D32F2F" variant="Bold" />
                                  </IconButton>
                                </Tooltip>
                                {isHrManager && approval.leaveRequest.totalDays > 1 && (
                                  <Tooltip title="แยกใบลา">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenSplitDialog(approval);
                                      }}
                                      sx={{
                                        bgcolor: '#EDE7F6',
                                        width: 34,
                                        height: 34,
                                        '&:hover': { bgcolor: '#D1C4E9' }
                                      }}
                                    >
                                      <Scissor size={20} color={PRIMARY_COLOR} variant="Bold" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Desktop Detail Dialog */}
            {expandedCards.size > 0 && (
              <Dialog
                open={expandedCards.size > 0}
                onClose={() => setExpandedCards(new Set())}
                maxWidth="md"
                fullWidth
                fullScreen={isMobileDevice}
                PaperProps={{
                  sx: {
                    borderRadius: isMobileDevice ? 0 : 1,
                    maxHeight: isMobileDevice ? '100%' : 'calc(100% - 64px)',
                    m: isMobileDevice ? 0 : 2
                  }
                }}
              >
                {(() => {
                  const expandedId = Array.from(expandedCards)[0];
                  const approval = paginatedApprovals.find(a => a.approvalId === expandedId);
                  if (!approval) return null;

                  const isPending = approval.status === 'pending' && (approval.leaveRequest.status === 'pending' || approval.leaveRequest.status === 'in_progress');
                  const config = leaveTypeConfig[approval.leaveRequest.leaveType] || leaveTypeConfig.default;
                  const LeaveIcon = config.icon;
                  const statusInfo = statusConfig[approval.leaveRequest.status] || statusConfig[approval.status] || statusConfig.pending;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <>
                      <IconButton
                        onClick={() => setExpandedCards(new Set())}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 1,
                          bgcolor: 'rgba(255,255,255,0.8)', // ensure visibility over content if scrolled
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                        }}
                      >
                        <CloseCircle size={24} color="#64748B" />
                      </IconButton>
                      <DialogTitle sx={{ pb: 1, pr: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar
                              src={approval.leaveRequest.user.avatar}
                              sx={{
                                width: 56,
                                height: 56,
                                bgcolor: config.lightColor,
                                color: config.color,
                                fontSize: '1.2rem',
                                fontWeight: 600,
                              }}
                            >
                              {approval.leaveRequest.user.firstName[0]}
                            </Avatar>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6" fontWeight={700}>
                                  {approval.leaveRequest.user.firstName} {approval.leaveRequest.user.lastName}
                                </Typography>
                                {approval.leaveRequest.isEscalated && (
                                  <Chip
                                    label="ส่งต่อ (Escalated)"
                                    size="small"
                                    icon={<InfoCircle size={14} color="#E65100" variant="Bold" />}
                                    sx={{
                                      height: 22,
                                      fontSize: '0.7rem',
                                      bgcolor: '#FFF3E0',
                                      color: '#E65100',
                                      border: '1px solid #FFCC80',
                                      '& .MuiChip-icon': { color: '#E65100', ml: 0.5 }
                                    }}
                                  />
                                )}
                              </Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                {approval.leaveRequest.user.position || '-'} • {approval.leaveRequest.user.department || '-'}
                              </Typography>

                            </Box>
                          </Box>
                          <Chip
                            label={statusInfo.label}
                            size="medium"
                            icon={<StatusIcon size={16} color={statusInfo.color} variant="Bold" />}
                            sx={{
                              bgcolor: statusInfo.bgcolor,
                              color: statusInfo.color,
                              fontWeight: 600,
                              '& .MuiChip-icon': { ml: 0.5 }
                            }}
                          />
                        </Box>
                      </DialogTitle>
                      <DialogContent sx={{ pt: 2 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                          {/* Left Column - Leave Info */}
                          <Box>
                            <Typography sx={{ fontWeight: 600, color: '#64748B', mb: 1.5, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: 0.5 }}>
                              ข้อมูลการลา
                            </Typography>
                            <Paper elevation={0} sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 1 }}>
                              <Box sx={{ display: 'grid', gap: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>ประเภทการลา</Typography>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                                    <Chip
                                      label={t(`leave_${approval.leaveRequest.leaveType}`, approval.leaveRequest.leaveType)}
                                      size="small"
                                      icon={<LeaveIcon size={14} color={config.color} variant="Bold" />}
                                      sx={{ bgcolor: config.lightColor, color: config.color, fontWeight: 600 }}
                                    />
                                    {approval.leaveRequest.leaveCode && (
                                      <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace' }}>
                                        #{approval.leaveRequest.leaveCode}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>วันที่เริ่ม</Typography>
                                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                    {new Date(approval.leaveRequest.startDate).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    {approval.leaveRequest.startTime && ` (${approval.leaveRequest.startTime})`}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>วันที่สิ้นสุด</Typography>
                                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                    {new Date(approval.leaveRequest.endDate).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    {approval.leaveRequest.endTime && ` (${approval.leaveRequest.endTime})`}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>จำนวนวัน</Typography>
                                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'primary.main' }}>{approval.leaveRequest.totalDays} วัน</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>วันที่ส่งใบลา</Typography>
                                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'text.secondary' }}>{new Date(approval.leaveRequest.createdAt).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Typography>
                                </Box>
                              </Box>
                            </Paper>

                            <Typography sx={{ fontWeight: 600, color: '#64748B', mb: 1.5, mt: 3, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: 0.5 }}>
                              เหตุผลการลา
                            </Typography>
                            <Paper elevation={0} sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 1 }}>
                              <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
                                {approval.leaveRequest.reason || '-'}
                              </Typography>
                            </Paper>

                            {/* Attachments */}
                            {approval.leaveRequest.attachments && approval.leaveRequest.attachments.length > 0 && (
                              <>
                                <Typography sx={{ fontWeight: 600, color: '#64748B', mb: 1.5, mt: 3, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: 0.5 }}>
                                  ไฟล์แนบ ({approval.leaveRequest.attachments.length})
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
                                        bgcolor: '#F8FAFC',
                                        borderRadius: 1,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                          bgcolor: '#EDF2F7',
                                          transform: 'translateY(-2px)',
                                        }
                                      }}
                                    >
                                      {isImageFile(file.fileName) ? (
                                        <Box
                                          component="img"
                                          src={file.filePath}
                                          sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'cover' }}
                                        />
                                      ) : (
                                        <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <DocumentText size={24} color="#64748B" />
                                        </Box>
                                      )}
                                      <Typography sx={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>
                                        {file.fileName.length > 20 ? file.fileName.substring(0, 20) + '...' : file.fileName}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Box>
                              </>
                            )}
                          </Box>

                          {/* Right Column - Employee Info & History */}
                          <Box>
                            <Typography sx={{ fontWeight: 600, color: '#64748B', mb: 1.5, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: 0.5 }}>
                              ข้อมูลพนักงาน
                            </Typography>
                            <Paper elevation={0} sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 1 }}>
                              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                <Box>
                                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>รหัสพนักงาน</Typography>
                                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{approval.leaveRequest.user.employeeId}</Typography>
                                </Box>
                                <Box>
                                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>ตำแหน่ง</Typography>
                                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{approval.leaveRequest.user.position || '-'}</Typography>
                                </Box>
                                <Box>
                                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>บริษัท</Typography>
                                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{approval.leaveRequest.user.company || '-'}</Typography>
                                </Box>
                                <Box>
                                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>ฝ่าย</Typography>
                                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{approval.leaveRequest.user.department || '-'}</Typography>
                                </Box>
                                <Box>
                                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>แผนก</Typography>
                                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{approval.leaveRequest.user.section || '-'}</Typography>
                                </Box>
                                <Box>
                                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>กะการทำงาน</Typography>
                                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{approval.leaveRequest.user.shift || '-'}</Typography>
                                </Box>
                              </Box>
                            </Paper>

                            {/* Approval History */}
                            {approval.leaveRequest.approvalHistory && approval.leaveRequest.approvalHistory.length > 0 && (
                              <>
                                <Typography sx={{ fontWeight: 600, color: '#64748B', mb: 1.5, mt: 3, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: 0.5 }}>
                                  ประวัติการอนุมัติ
                                </Typography>
                                <Paper elevation={0} sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 1 }}>
                                  {approval.leaveRequest.approvalHistory.map((hist, idx) => (
                                    <Box key={idx} sx={{ display: 'flex', gap: 2, mb: idx < approval.leaveRequest.approvalHistory.length - 1 ? 2 : 0 }}>
                                      <Box sx={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        bgcolor: statusConfig[hist.status]?.bgcolor || '#F1F5F9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                      }}>
                                        {hist.status === 'approved' && <TickCircle size={16} color={statusConfig.approved.color} variant="Bold" />}
                                        {hist.status === 'rejected' && <CloseCircle size={16} color={statusConfig.rejected.color} variant="Bold" />}
                                        {hist.status === 'pending' && <Clock size={16} color={statusConfig.pending.color} variant="Bold" />}
                                        {hist.status === 'skipped' && <Clock size={16} color="#9e9e9e" variant="Bold" />}
                                      </Box>
                                      <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                          <Box>
                                            <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.2 }}>
                                              {hist.actedBy
                                                ? `${hist.actedBy.firstName} ${hist.actedBy.lastName}`
                                                : `${hist.approver.firstName} ${hist.approver.lastName}`}
                                              {hist.actedBy && (
                                                <Typography component="span" sx={{ ml: 1, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 500 }}>
                                                  ({t('approved_on_behalf', 'อนุมัติแทน')} {hist.approver.firstName} {hist.approver.lastName})
                                                </Typography>
                                              )}
                                            </Typography>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>
                                              {(hist.actedBy?.position || hist.approver.position) || '-'}
                                            </Typography>
                                          </Box>
                                          <Chip
                                            label={statusConfig[hist.status]?.label || hist.status}
                                            size="small"
                                            sx={{
                                              height: 22,
                                              fontSize: '0.75rem',
                                              bgcolor: statusConfig[hist.status]?.bgcolor,
                                              color: statusConfig[hist.status]?.color,
                                              fontWeight: 600
                                            }}
                                          />
                                        </Box>
                                        {hist.comment && (
                                          <Typography sx={{ fontSize: '0.85rem', display: 'block', mt: 0.5, color: 'text.secondary' }}>
                                            &quot;{hist.comment}&quot;
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>
                                  ))}
                                </Paper>
                              </>
                            )}
                          </Box>
                        </Box>
                      </DialogContent>

                      {isPending && (
                        <DialogActions sx={{ p: 3, pt: 1, flexDirection: 'column', gap: 1.5 }}>
                          {isHrManager && approval.leaveRequest.totalDays > 1 && (
                            <Button
                              fullWidth
                              variant="outlined"
                              onClick={() => {
                                setExpandedCards(new Set());
                                handleOpenSplitDialog(approval);
                              }}
                              startIcon={<Scissor size={18} color={PRIMARY_COLOR} variant="Bold" />}
                              sx={{
                                borderColor: PRIMARY_COLOR,
                                color: PRIMARY_COLOR,
                                py: 1.25,
                                borderRadius: 1,
                                '&:hover': { bgcolor: `${PRIMARY_COLOR}10` }
                              }}
                            >
                              แยกใบลา
                            </Button>
                          )}
                          <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                            <Button
                              variant="contained"
                              onClick={() => {
                                setExpandedCards(new Set());
                                handleOpenDialog(approval, 'reject');
                              }}
                              startIcon={<CloseCircle size={18} color="#fff" variant="Bold" />}
                              sx={{
                                flex: 1,
                                py: 1.25,
                                borderRadius: 1,
                                bgcolor: '#D32F2F',
                                '&:hover': { bgcolor: '#B71C1C' }
                              }}
                            >
                              ปฏิเสธ
                            </Button>
                            <Button
                              variant="contained"
                              onClick={() => {
                                setExpandedCards(new Set());
                                handleOpenDialog(approval, 'approve');
                              }}
                              startIcon={<TickCircle size={18} color="#fff" variant="Bold" />}
                              sx={{
                                flex: 1,
                                py: 1.25,
                                borderRadius: 1,
                                bgcolor: '#2E7D32',
                                '&:hover': { bgcolor: '#1B5E20' }
                              }}
                            >
                              อนุมัติ
                            </Button>
                          </Box>
                        </DialogActions>
                      )}

                      {!isPending && (
                        <DialogActions sx={{ p: 3, pt: 1 }}>
                          <Button
                            variant="outlined"
                            onClick={() => setExpandedCards(new Set())}
                            sx={{ borderColor: 'grey.300', color: 'text.primary' }}
                          >
                            ปิด
                          </Button>
                        </DialogActions>
                      )}
                    </>
                  );
                })()}
              </Dialog>
            )}

            {/* Pagination for Desktop */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3, borderTop: '1px solid', borderColor: 'grey.200' }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => {
                    setPage(value);
                    setExpandedCards(new Set());
                  }}
                  color="primary"
                  shape="rounded"
                  sx={{ '& .MuiPaginationItem-root': { fontWeight: 600 } }}
                />
              </Box>
            )}
          </Paper>
        ) : (
          /* ========== MOBILE CARD VIEW ========== */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {paginatedApprovals.map((approval) => {
              const isExpanded = expandedCards.has(approval.approvalId);
              const isPending = approval.status === 'pending' && (approval.leaveRequest.status === 'pending' || approval.leaveRequest.status === 'in_progress');
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
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

                    {/* Row 2: Leave Type and Days */}
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
                      borderRadius: 1,
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
                            วันที่ลา: {new Date(approval.leaveRequest.startDate).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}
                          </Typography>
                          {(approval.leaveRequest.startTime || approval.leaveRequest.endTime) && (
                            <Typography sx={{ fontSize: '0.8rem', color: '#1E293B', fontWeight: 600 }}>
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
                      {/* Submission Date - Mobile */}
                      <Box sx={{ mb: 2, p: 1.5, bgcolor: '#F1F5F9', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>วันที่ส่งใบลา</Typography>
                        <Typography sx={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                          {formatDateFull(approval.leaveRequest.createdAt, new Date(approval.leaveRequest.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }))}
                        </Typography>
                      </Box>

                      {/* Employee Info Grid */}
                      <Box sx={{ mb: 2, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'grey.100' }}>
                        <Typography sx={{ fontSize: '0.8rem', color: '#64748B', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          <User size={16} variant="Bold" color={PRIMARY_COLOR} /> ข้อมูลพนักงาน
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                          <Box>
                            <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>บริษัท</Typography>
                            <Typography sx={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>
                              {approval.leaveRequest.user.company || '-'}
                            </Typography>
                          </Box>
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
                                          &quot;{hist.comment}&quot;
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
                      }}>
                        {/* Split button - show only for hr_manager and if more than 1 day */}
                        {isHrManager && approval.leaveRequest.totalDays > 1 && (
                          <Button
                            variant="outlined"
                            fullWidth
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSplitDialog(approval);
                            }}
                            sx={{
                              mb: 1.5,
                              borderColor: PRIMARY_COLOR,
                              color: 'white',
                              bgcolor: PRIMARY_COLOR,
                              borderRadius: 1,
                              py: 1,
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              textTransform: 'none',
                              '&:hover': {
                                bgcolor: '#1976D2',
                                borderColor: PRIMARY_COLOR,
                                color: 'white',
                              }
                            }}
                            startIcon={<Scissor size={18} color='white' variant="Bold" />}
                          >
                            แยกใบลา
                          </Button>
                        )}

                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                          <Button
                            variant="contained"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog(approval, 'reject');
                            }}
                            sx={{
                              flex: 1,
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog(approval, 'approve');
                            }}
                            sx={{
                              flex: 1,
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
        )
        )}
      </Container>

      {/* Confirm Dialog - Fullscreen on mobile, normal dialog on desktop */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobileDevice}
        PaperProps={{
          sx: {
            borderRadius: isMobileDevice ? 0 : 1, // Consistent 2 for desktop as per other dialogs
            display: 'flex',
            flexDirection: 'column',
            minHeight: isMobileDevice ? '100vh' : 'auto',
          }
        }}
      >
        {/* Close button */}
        <IconButton
          onClick={() => setDialogOpen(false)}
          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
        >
          <CloseCircle size={28} color="#9CA3AF" />
        </IconButton>
        <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 2 }}>
          {/* Action Toggle Switch */}
          <Box sx={{ mb: 3 }}>
            <Box
              sx={{
                bgcolor: '#F1F5F9',
                p: 0.5,
                borderRadius: 3,
                display: 'flex',
                position: 'relative',
                isolation: 'isolate',
                width: '100%',
                maxWidth: 300,
                mx: 'auto'
              }}
            >
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
                onClick={() => {
                  setActionType('approve');
                  setError('');
                }}
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
                onClick={() => {
                  setActionType('reject');
                  setError('');
                }}
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
                <Typography variant="body2" color="text.secondary">วันที่ส่งใบลา</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {new Date(selectedApproval.leaveRequest.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'flex-start' }}>
                <Typography variant="body2" color="text.secondary">ประเภท</Typography>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" fontWeight={600}>
                    {t(`leave_${selectedApproval.leaveRequest.leaveType}`, selectedApproval.leaveRequest.leaveType)}
                  </Typography>
                  {selectedApproval.leaveRequest.leaveCode && (
                    <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'monospace', display: 'block' }}>
                      #{selectedApproval.leaveRequest.leaveCode}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary">ตั้งแต่วันที่</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {new Date(selectedApproval.leaveRequest.startDate).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
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
            <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
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
          <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
            <Button
              variant="outlined"
              onClick={() => setDialogOpen(false)}
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
        </DialogActions>
      </Dialog>

      {/* Split Leave Dialog - Redesigned for better UX */}
      <Dialog
        open={splitDialogOpen}
        onClose={() => setSplitDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobileDevice}
        PaperProps={{
          sx: {
            borderRadius: isMobileDevice ? 0 : 1,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: isMobileDevice ? '100vh' : '90vh',
            bgcolor: '#F8FAFC',
          }
        }}
      >
        {/* Header */}
        <Box sx={{
          bgcolor: 'white',
          borderBottom: '1px solid #E2E8F0',
          px: 2,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: `${PRIMARY_COLOR}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Scissor size={22} variant="Bold" color={PRIMARY_COLOR} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                แยกใบลา
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedApproval?.leaveRequest.user.firstName} {selectedApproval?.leaveRequest.user.lastName}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setSplitDialogOpen(false)} size="small">
            <CloseCircle size={24} color="#9CA3AF" />
          </IconButton>
        </Box>

        <DialogContent sx={{ flex: 1, p: 2, overflow: 'auto' }}>
          {/* Original Leave Info - Compact */}
          {selectedApproval && (
            <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 1, bgcolor: 'white', border: '1px solid #E2E8F0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">ใบลาเดิม</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {t(`leave_${selectedApproval.leaveRequest.leaveType}`, selectedApproval.leaveRequest.leaveType)}
                  </Typography>
                  {selectedApproval.leaveRequest.leaveCode && (
                    <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'monospace' }}>
                      #{selectedApproval.leaveRequest.leaveCode}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">ระยะเวลา</Typography>
                  <Typography variant="body2" fontWeight={600} color="primary">
                    {selectedApproval.leaveRequest.totalDays} วัน
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">วันที่</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {new Date(selectedApproval.leaveRequest.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    {selectedApproval.leaveRequest.startDate !== selectedApproval.leaveRequest.endDate &&
                      ` - ${new Date(selectedApproval.leaveRequest.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`
                    }
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
              {error}
            </Alert>
          )}

          {/* Leave Balance - Horizontal Scroll Chips */}
          {!loadingSummary && leaveSummary.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                สิทธิ์วันลาคงเหลือ
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {leaveSummary.slice(0, 6).map((leave) => (
                  <Chip
                    key={leave.code}
                    label={`${t(`leave_${leave.code}`, leave.name)}: ${leave.isUnlimited ? '∞' : leave.remainingDays}`}
                    size="small"
                    sx={{
                      bgcolor: leave.isUnlimited ? '#E3F2FD' : leave.remainingDays > 0 ? '#E8F5E9' : '#FFEBEE',
                      color: leave.isUnlimited ? '#1976D2' : leave.remainingDays > 0 ? '#2E7D32' : '#D32F2F',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: 26,
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Split Parts - Simplified Cards */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                แบ่งเป็น {splitParts.length} ส่วน
              </Typography>
              <Button
                size="small"
                onClick={handleAddSplitPart}
                startIcon={<Add size={16} />}
                sx={{ color: PRIMARY_COLOR, fontSize: '0.8rem' }}
              >
                เพิ่มส่วน
              </Button>
            </Box>

            {splitParts.map((part, index) => {
              const leaveInfo = getRemainingDays(part.leaveType);
              const isOverLimit = !leaveInfo.isUnlimited && part.totalDays > leaveInfo.remaining;

              return (
                <Paper
                  key={index}
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 1.5,
                    borderRadius: 1,
                    bgcolor: 'white',
                    border: '2px solid',
                    borderColor: isOverLimit ? '#FFCDD2' : index === 0 ? '#C8E6C9' : '#FFE0B2',
                  }}
                >
                  {/* Part Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Chip
                      label={`ส่วนที่ ${index + 1}`}
                      size="small"
                      sx={{
                        bgcolor: index === 0 ? '#E8F5E9' : '#FFF3E0',
                        color: index === 0 ? '#2E7D32' : '#E65100',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                      }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" fontWeight={800} color={isOverLimit ? 'error.main' : 'primary.main'}>
                        {part.totalDays} วัน
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveSplitPart(index)}
                        sx={{ color: '#EF5350', p: 0.5 }}
                      >
                        <Trash size={18} />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Leave Type Selector - Compact */}
                  <Box
                    onClick={() => {
                      setCurrentEditingPartIndex(index);
                      setLeaveTypeSheetOpen(true);
                    }}
                    sx={{
                      mb: 2,
                      p: 1.5,
                      border: '1px solid #E2E8F0',
                      borderRadius: 1,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      bgcolor: '#FAFAFA',
                      '&:hover': { borderColor: PRIMARY_COLOR, bgcolor: 'white' }
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">ประเภทการลา</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {t(`leave_${part.leaveType}`, leaveInfo.name || part.leaveType)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={leaveInfo.isUnlimited ? '∞' : `เหลือ ${leaveInfo.remaining}`}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          bgcolor: isOverLimit ? '#FFEBEE' : leaveInfo.isUnlimited ? '#E3F2FD' : '#E8F5E9',
                          color: isOverLimit ? '#D32F2F' : leaveInfo.isUnlimited ? '#1976D2' : '#2E7D32',
                          fontWeight: 600,
                        }}
                      />
                      <ArrowDown2 size={16} color="#94A3B8" />
                    </Box>
                  </Box>

                  {/* Date Range - Inline on Desktop, Stack on Mobile */}
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 1.5,
                      mb: 2
                    }}>
                      {/* Start Date + Period */}
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>วันเริ่ม</Typography>
                        <DatePicker
                          value={part.startDate ? dayjs(part.startDate) : null}
                          onChange={(newValue) => {
                            if (newValue && newValue.isValid()) {
                              handleUpdateSplitPart(index, 'startDate', newValue.format('YYYY-MM-DD'));
                            }
                          }}
                          format="DD MMM"
                          slotProps={{
                            textField: {
                              size: 'small',
                              fullWidth: true,
                              sx: { '& .MuiOutlinedInput-root': { bgcolor: 'white' } }
                            }
                          }}
                        />
                        <ToggleButtonGroup
                          value={part.startPeriod}
                          exclusive
                          onChange={(_, val) => val && handleUpdateSplitPart(index, 'startPeriod', val)}
                          size="small"
                          fullWidth
                          sx={{
                            mt: 1,
                            '& .MuiToggleButton-root': {
                              flex: 1,
                              py: 0.5,
                              fontSize: '0.75rem',
                              '&.Mui-selected': {
                                bgcolor: PRIMARY_COLOR,
                                color: 'white',
                                '&:hover': {
                                  bgcolor: '#5B52E0',
                                },
                              },
                            }
                          }}
                        >
                          <ToggleButton value="full">เต็มวัน</ToggleButton>
                          <ToggleButton value="half">ครึ่งวัน</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                      {/* End Date + Period */}
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>วันสิ้นสุด</Typography>
                        <DatePicker
                          value={part.endDate ? dayjs(part.endDate) : null}
                          onChange={(newValue) => {
                            if (newValue && newValue.isValid()) {
                              handleUpdateSplitPart(index, 'endDate', newValue.format('YYYY-MM-DD'));
                            }
                          }}
                          minDate={part.startDate ? dayjs(part.startDate) : undefined}
                          format="DD MMM"
                          slotProps={{
                            textField: {
                              size: 'small',
                              fullWidth: true,
                              sx: { '& .MuiOutlinedInput-root': { bgcolor: 'white' } }
                            }
                          }}
                        />
                        <ToggleButtonGroup
                          value={part.endPeriod}
                          exclusive
                          onChange={(_, val) => val && handleUpdateSplitPart(index, 'endPeriod', val)}
                          size="small"
                          fullWidth
                          sx={{
                            mt: 1,
                            '& .MuiToggleButton-root': {
                              flex: 1,
                              py: 0.5,
                              fontSize: '0.75rem',
                              '&.Mui-selected': {
                                bgcolor: PRIMARY_COLOR,
                                color: 'white',
                                '&:hover': {
                                  bgcolor: '#5B52E0',
                                },
                              },
                            }
                          }}
                        >
                          <ToggleButton value="full">เต็มวัน</ToggleButton>
                          <ToggleButton value="half">ครึ่งวัน</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    </Box>
                  </LocalizationProvider>

                  {/* Reason - Optional */}
                  <TextField
                    placeholder="เหตุผล (ถ้ามี)"
                    size="small"
                    fullWidth
                    value={part.reason}
                    onChange={(e) => handleUpdateSplitPart(index, 'reason', e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white' } }}
                  />
                </Paper>
              );
            })}
          </Box>

          {/* Comment */}
          <TextField
            label="หมายเหตุการแยกใบลา"
            placeholder="ระบุเหตุผลในการแยกใบลา..."
            multiline
            rows={2}
            fullWidth
            value={splitComment}
            onChange={(e) => setSplitComment(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, bgcolor: 'white' } }}
          />
        </DialogContent>

        {/* Footer - Summary & Actions */}
        <Box sx={{ bgcolor: 'white', borderTop: '1px solid #E2E8F0', p: 2 }}>
          {/* Summary Bar */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
            p: 1.5,
            borderRadius: 1,
            bgcolor: Math.abs(splitParts.reduce((sum, p) => sum + p.totalDays, 0) - (selectedApproval?.leaveRequest.totalDays || 0)) < 0.01 ? '#E8F5E9' : '#FFEBEE'
          }}>
            <Typography variant="body2" fontWeight={600}>
              รวมทั้งหมด
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="h6"
                fontWeight={800}
                color={Math.abs(splitParts.reduce((sum, p) => sum + p.totalDays, 0) - (selectedApproval?.leaveRequest.totalDays || 0)) < 0.01 ? 'success.main' : 'error.main'}
              >
                {splitParts.reduce((sum, p) => sum + p.totalDays, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                / {selectedApproval?.leaveRequest.totalDays} วัน
              </Typography>
              {Math.abs(splitParts.reduce((sum, p) => sum + p.totalDays, 0) - (selectedApproval?.leaveRequest.totalDays || 0)) < 0.01 ? (
                <TickCircle size={20} color="#2E7D32" variant="Bold" />
              ) : (
                <CloseCircle size={20} color="#D32F2F" variant="Bold" />
              )}
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              onClick={() => setSplitDialogOpen(false)}
              disabled={submitting}
              sx={{ flex: 1, borderRadius: 1, py: 1.25, borderColor: '#E2E8F0', color: 'text.secondary' }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmitSplit}
              disabled={submitting || Math.abs(splitParts.reduce((sum, p) => sum + p.totalDays, 0) - (selectedApproval?.leaveRequest.totalDays || 0)) > 0.01}
              sx={{
                flex: 2,
                borderRadius: 1,
                py: 1.25,
                bgcolor: PRIMARY_COLOR,
                '&:hover': { bgcolor: '#5B52E0' }
              }}
            >
              {submitting ? 'กำลังดำเนินการ...' : 'ยืนยันแยกใบลา'}
            </Button>
          </Box>
        </Box>
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
            <CloseCircle size={28} color="white" variant='Outline' />
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
              borderRadius: 1,
            }}>
              เลื่อนซ้าย-ขวาเพื่อดูรูปภาพอื่น
            </Typography>
          )}
        </Box>
      </Dialog>

      {/* Bottom Sheet for Leave Type Selection */}
      <Drawer
        anchor="bottom"
        open={leaveTypeSheetOpen}
        onClose={() => {
          setLeaveTypeSheetOpen(false);
          setCurrentEditingPartIndex(null);
        }}
        sx={{
          zIndex: 1400, // Higher than fullscreen Dialog (1300)
        }}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '70vh',
          }
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
          {/* Handle bar */}
          <Box sx={{
            width: 40,
            height: 4,
            bgcolor: '#ddd',
            borderRadius: 1,
            mx: 'auto',
            mb: 2
          }} />

          <Typography variant="h6" fontWeight={700} sx={{ textAlign: 'center' }}>
            {t('select_leave_type', 'เลือกประเภทการลา')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            {t('for_part', 'สำหรับส่วนที่')} {currentEditingPartIndex !== null ? currentEditingPartIndex + 1 : ''}
          </Typography>
        </Box>

        <List sx={{ overflow: 'auto' }}>
          {loadingSummary ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">{t('loading', 'กำลังโหลด...')}</Typography>
            </Box>
          ) : leaveSummary.length > 0 ? (
            leaveSummary.map((leave) => {
              const currentPartLeaveType = currentEditingPartIndex !== null ? splitParts[currentEditingPartIndex]?.leaveType : null;
              const isDisabled = !leave.isUnlimited && leave.remainingDays <= 0 && leave.code !== currentPartLeaveType;
              const isSelected = currentPartLeaveType === leave.code;
              const config = leaveTypeConfig[leave.code] || leaveTypeConfig.default;
              const LeaveIcon = config.icon;

              return (
                <ListItem
                  key={leave.code}
                  disablePadding
                >
                  <ListItemButton
                    onClick={() => {
                      if (!isDisabled && currentEditingPartIndex !== null) {
                        handleUpdateSplitPart(currentEditingPartIndex, 'leaveType', leave.code);
                        setLeaveTypeSheetOpen(false);
                        setCurrentEditingPartIndex(null);
                      }
                    }}
                    disabled={isDisabled}
                    sx={{
                      py: 1.5,
                      bgcolor: isSelected ? 'rgba(108, 99, 255, 0.08)' : 'transparent',
                      '&.Mui-disabled': {
                        opacity: 0.5,
                        bgcolor: 'grey.100',
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 44 }}>
                      <Box sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        bgcolor: config.lightColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <LeaveIcon size={20} color={config.color} variant="Bold" />
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight={isSelected ? 700 : 500}>
                          {t(`leave_${leave.code}`, leave.name)}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {leave.isUnlimited
                            ? t('unlimited_days', 'ไม่จำกัดจำนวนวัน')
                            : t('used_days_format', 'ใช้ไป {{used}} / {{max}} วัน').replace('{{used}}', String(leave.usedDays)).replace('{{max}}', String(leave.maxDays))}
                        </Typography>
                      }
                    />
                    <Chip
                      label={leave.isUnlimited ? t('unlimited', 'ไม่จำกัด') : t('remaining_days_format', 'เหลือ {{days}} วัน').replace('{{days}}', String(leave.remainingDays))}
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: '0.75rem',
                        bgcolor: leave.isUnlimited
                          ? '#E3F2FD'
                          : leave.remainingDays > 0
                            ? '#E8F5E9'
                            : '#FFEBEE',
                        color: leave.isUnlimited
                          ? '#1976D2'
                          : leave.remainingDays > 0
                            ? '#2E7D32'
                            : '#D32F2F',
                        fontWeight: 600,
                      }}
                    />
                    {isSelected && (
                      <TickCircle size={22} color={PRIMARY_COLOR} variant="Bold" style={{ marginLeft: 8 }} />
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })
          ) : (
            // Fallback options
            ['sick', 'personal', 'vacation', 'unpaid', 'maternity', 'ordination', 'work_outside', 'other'].map((code) => {
              const config = leaveTypeConfig[code] || leaveTypeConfig.default;
              const LeaveIcon = config.icon;
              const names: Record<string, string> = {
                sick: 'ลาป่วย',
                personal: 'ลากิจ',
                vacation: 'ลาพักร้อน',
                unpaid: 'ลาไม่รับค่าจ้าง',
                maternity: 'ลาคลอด',
                ordination: 'ลาบวช',
                work_outside: 'ปฏิบัติงานนอกสถานที่',
                other: 'ลาอื่นๆ',
              };
              const currentPartLeaveType = currentEditingPartIndex !== null ? splitParts[currentEditingPartIndex]?.leaveType : null;
              const isSelected = currentPartLeaveType === code;

              return (
                <ListItem key={code} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => {
                      if (currentEditingPartIndex !== null) {
                        handleUpdateSplitPart(currentEditingPartIndex, 'leaveType', code);
                        setLeaveTypeSheetOpen(false);
                        setCurrentEditingPartIndex(null);
                      }
                    }}
                    sx={{
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: isSelected ? PRIMARY_COLOR : 'grey.200',
                      bgcolor: isSelected ? `${PRIMARY_COLOR}10` : 'white',
                      py: 1.5,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 44 }}>
                      <Box sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        bgcolor: config.lightColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <LeaveIcon size={20} color={config.color} variant="Bold" />
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight={isSelected ? 700 : 500}>
                          {t(`leave_${code}`, names[code])}
                        </Typography>
                      }
                    />
                    {isSelected && (
                      <TickCircle size={22} color={PRIMARY_COLOR} variant="Bold" />
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })
          )}
        </List>

        {/* Cancel Button */}
        <Box sx={{ p: 2, borderTop: '1px solid #eee' }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              setLeaveTypeSheetOpen(false);
              setCurrentEditingPartIndex(null);
            }}
            sx={{
              py: 1.5,
              borderRadius: 1,
              borderColor: 'grey.300',
              color: 'text.primary',
            }}
          >
            {t('cancel', 'ยกเลิก')}
          </Button>
        </Box>
      </Drawer>

      {/* Employee Leave Detail Drawer - Vaul Style */}
      <VaulDrawer.Root
        open={employeeDetailOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEmployeeDetailOpen(false);
            setSelectedEmployee(null);
          }
        }}
        shouldScaleBackground={false}
      >
        <VaulDrawer.Portal>
          <VaulDrawer.Overlay
            style={{
              position: 'fixed',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)',
              zIndex: 1300,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />
          <VaulDrawer.Content
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#FAFBFC',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '90vh',
              zIndex: 1300,
              display: 'flex',
              flexDirection: 'column',
              outline: 'none',
              boxShadow: '0 -10px 50px rgba(0,0,0,0.15)',
            }}
          >
        {selectedEmployee && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '90vh' }}>
            {/* Vaul Handle - Drag indicator */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              pt: 1.5,
              pb: 1,
              bgcolor: 'white',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}>
              <VaulDrawer.Handle
                style={{
                  width: 48,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: '#E2E8F0',
                }}
              />
            </Box>

            {/* Fixed Header */}
            <Box sx={{ 
              bgcolor: 'white',
              px: 2.5, 
              pb: 2,
              borderBottom: '1px solid #F1F5F9',
            }}>
              {/* Employee Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar
                  src={selectedEmployee.user.avatar}
                  sx={{ 
                    width: 60, 
                    height: 60, 
                    fontSize: '1.5rem', 
                    bgcolor: PRIMARY_COLOR,
                    boxShadow: '0 4px 12px rgba(108, 99, 255, 0.3)',
                  }}
                >
                  {selectedEmployee.user.firstName?.[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <VaulDrawer.Title asChild>
                    <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, color: '#1E293B' }}>
                      {selectedEmployee.user.firstName} {selectedEmployee.user.lastName}
                    </Typography>
                  </VaulDrawer.Title>
                  <VaulDrawer.Description asChild>
                    <Typography sx={{ fontSize: '0.85rem', color: '#64748B' }}>
                      {selectedEmployee.user.position || selectedEmployee.user.department}
                    </Typography>
                  </VaulDrawer.Description>
                  {selectedEmployee.user.section && (
                    <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                      {selectedEmployee.user.department} • {selectedEmployee.user.section}
                    </Typography>
                  )}
                </Box>
                <IconButton 
                  onClick={() => {
                    setEmployeeDetailOpen(false);
                    setSelectedEmployee(null);
                  }}
                  sx={{ 
                    bgcolor: '#F1F5F9',
                    '&:hover': { bgcolor: '#E2E8F0' }
                  }}
                >
                  <CloseCircle size={22} color="#64748B" />
                </IconButton>
              </Box>

              {/* Summary Stats */}
              <Box sx={{ 
                display: 'flex', 
                gap: 1.5,
              }}>
                <Paper elevation={0} sx={{ 
                  flex: 1, 
                  p: 1.5, 
                  borderRadius: 2, 
                  bgcolor: PRIMARY_LIGHT,
                  textAlign: 'center',
                }}>
                  <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: PRIMARY_COLOR, lineHeight: 1 }}>
                    {selectedEmployee.totalDays}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: '#64748B', mt: 0.5 }}>
                    {t('total_days_leave', 'วันลารวม')}
                  </Typography>
                </Paper>
                <Paper elevation={0} sx={{ 
                  flex: 1, 
                  p: 1.5, 
                  borderRadius: 2, 
                  bgcolor: '#FFF3E0',
                  textAlign: 'center',
                }}>
                  <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: '#E65100', lineHeight: 1 }}>
                    {selectedEmployee.leaveCount}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: '#64748B', mt: 0.5 }}>
                    {t('total_leave_times', 'จำนวนครั้ง')}
                  </Typography>
                </Paper>
                <Paper elevation={0} sx={{ 
                  flex: 1, 
                  p: 1.5, 
                  borderRadius: 2, 
                  bgcolor: '#E8F5E9',
                  textAlign: 'center',
                }}>
                  <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: '#2E7D32', lineHeight: 1 }}>
                    {Object.keys(selectedEmployee.byType || {}).length}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: '#64748B', mt: 0.5 }}>
                    {t('leave_types_count', 'ประเภทลา')}
                  </Typography>
                </Paper>
              </Box>
            </Box>

            {/* Scrollable Content */}
            <Box sx={{ 
              flex: 1, 
              overflow: 'auto',
              px: 2.5,
              py: 2,
            }}>
              {/* Leave by Type Summary */}
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('leave_breakdown', 'รายละเอียดการลาแต่ละประเภท')} ({filterYear + 543})
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                {selectedEmployee.byType && Object.entries(selectedEmployee.byType).map(([leaveType, days]) => {
                  const config = leaveTypeConfig[leaveType] || leaveTypeConfig.default;
                  const LeaveIcon = config.icon;
                  const leaveTypeName = teamHistorySummary.find(s => s.code === leaveType)?.name || leaveType;

                  return (
                    <Paper
                      key={leaveType}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'white',
                        border: '1px solid #F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      <Box sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: config.lightColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <LeaveIcon size={24} color={config.color} variant="Bold" />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#1E293B' }}>
                          {leaveTypeName}
                        </Typography>
                      </Box>
                      <Box sx={{
                        bgcolor: config.lightColor,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                      }}>
                        <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: config.color }}>
                          {days} {t('days_unit', 'วัน')}
                        </Typography>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>

              {/* Leave History List */}
              {selectedEmployee && (
                <>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {t('leave_history_detail', 'ประวัติการลา')}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {teamHistory
                      .filter(leave => leave.user.id === selectedEmployee.user.id)
                      .map((leave) => {
                        const config = leaveTypeConfig[leave.leaveType] || leaveTypeConfig.default;
                        const LeaveIcon = config.icon;
                        const statusInfo = statusConfig[leave.status] || statusConfig.pending;
                        const StatusIcon = statusInfo.icon;

                        return (
                          <Paper
                            key={leave.id}
                            elevation={0}
                            sx={{
                              p: 2,
                              borderRadius: 1,
                              bgcolor: 'white',
                              border: '1px solid #F1F5F9',
                            }}
                          >
                            {/* Header: Leave Type + Status */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 1.5,
                                  bgcolor: config.lightColor,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                  <LeaveIcon size={18} color={config.color} variant="Bold" />
                                </Box>
                                <Box>
                                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#1E293B' }}>
                                    {leave.leaveTypeName}
                                  </Typography>
                                  {leave.leaveCode && (
                                    <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                                      {leave.leaveCode}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                              <Chip
                                icon={<StatusIcon size={12} variant="Bold" />}
                                label={statusInfo.label}
                                size="small"
                                sx={{
                                  height: 24,
                                  bgcolor: statusInfo.bgcolor,
                                  color: statusInfo.color,
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  '& .MuiChip-icon': { color: statusInfo.color },
                                }}
                              />
                            </Box>

                            {/* Date & Days */}
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 2,
                              bgcolor: '#F8FAFC',
                              borderRadius: 1.5,
                              px: 1.5,
                              py: 1,
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1 }}>
                                <Calendar size={16} color="#64748B" />
                                <Typography sx={{ fontSize: '0.8rem', color: '#475569' }}>
                                  {formatDate(leave.startDate)}
                                  {leave.startDate !== leave.endDate && ` - ${formatDate(leave.endDate)}`}
                                </Typography>
                              </Box>
                              <Chip
                                label={`${leave.totalDays} ${t('days_unit', 'วัน')}`}
                                size="small"
                                sx={{
                                  height: 24,
                                  bgcolor: config.lightColor,
                                  color: config.color,
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                }}
                              />
                            </Box>

                            {/* Reason */}
                            {leave.reason && (
                              <Typography sx={{ 
                                fontSize: '0.8rem', 
                                color: '#64748B', 
                                mt: 1.5,
                                fontStyle: 'italic',
                                borderLeft: '3px solid #E2E8F0',
                                pl: 1.5,
                              }}>
                                {leave.reason}
                              </Typography>
                            )}
                          </Paper>
                        );
                      })}
                  </Box>

                  {/* No history for this employee */}
                  {teamHistory.filter(leave => leave.user.id === selectedEmployee.user.id).length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="text.secondary">
                        {t('no_leave_history', 'ไม่พบประวัติการลา')}
                      </Typography>
                    </Box>
                  )}
                </>
              )}

              {/* No leave data */}
              {(!selectedEmployee.byType || Object.keys(selectedEmployee.byType).length === 0) && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    {t('no_leave_data', 'ไม่มีข้อมูลการลา')}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
          </VaulDrawer.Content>
        </VaulDrawer.Portal>
      </VaulDrawer.Root>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <BottomNav />
    </Box>
  );
}
