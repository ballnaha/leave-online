'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Fade,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DocumentDownload, Refresh2, DocumentText, TickCircle, CloseCircle, Clock, Calendar, SearchNormal1, CloseSquare } from 'iconsax-react';
import { useToastr } from '@/app/components/Toastr';

type ReportRow = {
  id: number;
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  departmentCode: string;
  section: string;
  sectionCode: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  leaveTypeName: string;
  reason: string;
  status: string;
  statusLabel: string;
  note: string;
};

type Stats = {
  total: number;
  totalDays: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
};

type DeptOption = { code: string; name: string; companyCode: string };
type SectionOption = { code: string; name: string; departmentCode: string };
type CompanyOption = { code: string; name: string };

type LeaveReportResponse = {
  rows?: ReportRow[];
  stats?: Stats;
  companies?: CompanyOption[];
  departments?: DeptOption[];
  sections?: SectionOption[];
};

const LEAVE_REPORT_CACHE_TTL_MS = 2000;
const leaveReportInFlight = new Map<string, Promise<LeaveReportResponse>>();
const leaveReportCache = new Map<string, { ts: number; data: LeaveReportResponse }>();

const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const formatThaiDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
};

const monthOptions = [
  { value: 0, label: 'ทุกเดือน' },
  { value: 1, label: 'มกราคม' },
  { value: 2, label: 'กุมภาพันธ์' },
  { value: 3, label: 'มีนาคม' },
  { value: 4, label: 'เมษายน' },
  { value: 5, label: 'พฤษภาคม' },
  { value: 6, label: 'มิถุนายน' },
  { value: 7, label: 'กรกฎาคม' },
  { value: 8, label: 'สิงหาคม' },
  { value: 9, label: 'กันยายน' },
  { value: 10, label: 'ตุลาคม' },
  { value: 11, label: 'พฤศจิกายน' },
  { value: 12, label: 'ธันวาคม' },
];

const statusOptions = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'pending', label: 'รออนุมัติ' },
  { value: 'in_progress', label: 'กำลังดำเนินการ' },
  { value: 'approved', label: 'อนุมัติ' },
  { value: 'rejected', label: 'ไม่อนุมัติ' },
  { value: 'cancelled', label: 'ยกเลิก' },
];

const statusThaiMap: Record<string, string> = {
  pending: 'รออนุมัติ',
  in_progress: 'กำลังดำเนินการ',
  approved: 'อนุมัติ',
  rejected: 'ไม่อนุมัติ',
  cancelled: 'ยกเลิก',
};

const formatThaiDateRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) return formatThaiDate(startDate);
  return `${formatThaiDate(startDate)} - ${formatThaiDate(endDate)}`;
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'error' | 'secondary';
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const theme = useTheme();

  const colorMap = {
    primary: { main: theme.palette.primary.main, light: alpha(theme.palette.primary.main, 0.1) },
    success: { main: theme.palette.success.main, light: alpha(theme.palette.success.main, 0.1) },
    warning: { main: theme.palette.warning.main, light: alpha(theme.palette.warning.main, 0.1) },
    error: { main: theme.palette.error.main, light: alpha(theme.palette.error.main, 0.1) },
    secondary: { main: theme.palette.secondary.main, light: alpha(theme.palette.secondary.main, 0.1) },
  };

  return (
    <Card
      sx={{
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ color: colorMap[color].main }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: colorMap[color].light,
              color: colorMap[color].main,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

// Table Skeleton
function TableSkeleton() {
  return (
    <TableBody>
      {[1, 2, 3, 4, 5].map((row) => (
        <TableRow key={row}>
          <TableCell><Skeleton variant="text" width={30} /></TableCell>
          <TableCell>
            <Box>
              <Skeleton variant="text" width={120} />
              <Skeleton variant="text" width={100} height={14} />
            </Box>
          </TableCell>
          <TableCell>
            <Box>
              <Skeleton variant="text" width={100} />
              <Skeleton variant="text" width={80} height={14} />
            </Box>
          </TableCell>
          <TableCell>
            <Box>
              <Skeleton variant="text" width={140} />
              <Skeleton variant="text" width={50} height={14} />
            </Box>
          </TableCell>
          <TableCell><Skeleton variant="text" width={80} /></TableCell>
          <TableCell><Skeleton variant="text" width={150} /></TableCell>
          <TableCell><Skeleton variant="rounded" width={70} height={24} /></TableCell>
          <TableCell><Skeleton variant="text" width={100} /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export default function AdminLeaveReportsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { error: toastError } = useToastr();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, totalDays: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);

  // Filters
  const now = useMemo(() => new Date(), []);
  const [status, setStatus] = useState<string>('all');
  const [month, setMonth] = useState<number>(0); // 0 = all months
  const [year, setYear] = useState<number>(now.getFullYear());
  const [search, setSearch] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  // Master data for filters
  const [companies, setCompanies] = useState<CompanyOption[]>([]);

  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const yearOptions = useMemo(() => {
    const currentYear = now.getFullYear();
    const options: number[] = [];
    for (let y = currentYear - 2; y <= currentYear + 1; y += 1) options.push(y);
    return options;
  }, [now]);

  const filteredDepartments = useMemo(() => {
    if (companyFilter === 'all') return departments;
    return departments.filter((d) => d.companyCode === companyFilter);
  }, [departments, companyFilter]);

  const filteredSections = useMemo(() => {
    if (departmentFilter === 'all') return sections;
    return sections.filter((s) => s.departmentCode === departmentFilter);
  }, [sections, departmentFilter]);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 500);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  const fetchRows = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('status', status);
    params.set('month', String(month));
    params.set('year', String(year));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (companyFilter !== 'all') params.set('company', companyFilter);
    if (departmentFilter !== 'all') params.set('department', departmentFilter);
    if (sectionFilter !== 'all') params.set('section', sectionFilter);

    const url = `/api/admin/leave-reports?${params.toString()}`;

    const cached = leaveReportCache.get(url);
    if (cached && Date.now() - cached.ts < LEAVE_REPORT_CACHE_TTL_MS) {
      if (!isMountedRef.current) return;
      setRows(Array.isArray(cached.data?.rows) ? (cached.data.rows as ReportRow[]) : []);
      setStats(cached.data?.stats || { total: 0, totalDays: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 });
      if (cached.data?.companies) setCompanies(cached.data.companies);
      if (cached.data?.departments) setDepartments(cached.data.departments);
      if (cached.data?.sections) setSections(cached.data.sections);
      setLoading(false);
      return;
    }

    if (isMountedRef.current) setLoading(true);

    try {
      let promise = leaveReportInFlight.get(url);
      if (!promise) {
        promise = (async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          let res: Response;
          try {
            res = await fetch(url, { cache: 'no-store', signal: controller.signal });
          } finally {
            clearTimeout(timeoutId);
          }

          if (!res.ok) {
            const error: any = new Error('Failed to fetch leave reports');
            error.status = res.status;
            throw error;
          }
          const data = (await res.json()) as LeaveReportResponse;
          leaveReportCache.set(url, { ts: Date.now(), data });
          return data;
        })();

        leaveReportInFlight.set(url, promise);
        promise.finally(() => {
          if (leaveReportInFlight.get(url) === promise) leaveReportInFlight.delete(url);
        });
      }

      const data = await promise;
      if (!isMountedRef.current) return;

      setRows(Array.isArray(data?.rows) ? (data.rows as ReportRow[]) : []);
      setStats(data?.stats || { total: 0, totalDays: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 });
      if (data?.companies) setCompanies(data.companies);
      if (data?.departments) setDepartments(data.departments);
      if (data?.sections) setSections(data.sections);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (err?.name === 'AbortError') {
        toastError('โหลดข้อมูลนานเกินไป กรุณาลองใหม่อีกครั้ง');
        return;
      }
      if (err?.status === 401) {
        toastError('ไม่มีสิทธิ์เข้าถึงรายงาน');
        return;
      }
      toastError('เกิดข้อผิดพลาดในการโหลดข้อมูลรายงาน');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [status, month, year, debouncedSearch, companyFilter, departmentFilter, sectionFilter, toastError]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const exportRows = useMemo(() => {
    return rows.map((r) => ({
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      position: r.position,
      department: r.department,
      section: r.section,
      leaveDate: formatThaiDateRange(r.startDate, r.endDate),
      totalDays: r.totalDays,
      leaveTypeName: r.leaveTypeName,
      reason: r.reason,
      statusLabel: statusThaiMap[(r.status || '').toLowerCase()] || r.statusLabel || r.status,
      note: r.note,
    }));
  }, [rows]);

  const exportExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('LeaveReport');

      // Set column widths
      worksheet.columns = [
        { width: 6 },  // ลำดับ
        { width: 12 }, // รหัสพนักงาน
        { width: 20 }, // ชื่อพนักงาน
        { width: 15 }, // ตำแหน่ง
        { width: 15 }, // ฝ่าย
        { width: 15 }, // แผนก
        { width: 25 }, // วันที่หยุด
        { width: 10 }, // จำนวนวัน
        { width: 15 }, // ประเภท
        { width: 40 }, // เหตุผลการลา
        { width: 12 }, // สถานะ
        { width: 30 }, // หมายเหตุ
      ];

      // Add header row
      const header = ['ลำดับ', 'รหัสพนักงาน', 'ชื่อพนักงาน', 'ตำแหน่ง', 'ฝ่าย', 'แผนก', 'วันที่หยุด', 'จำนวนวัน', 'ประเภท', 'เหตุผลการลา', 'สถานะ', 'หมายเหตุ'];
      const headerRow = worksheet.addRow(header);
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Add data rows
      exportRows.forEach((r, i) => {
        const row = worksheet.addRow([
          i + 1,
          r.employeeId,
          r.employeeName,
          r.position,
          r.department,
          r.section,
          r.leaveDate,
          r.totalDays,
          r.leaveTypeName,
          r.reason,
          r.statusLabel,
          r.note,
        ]);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      });

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `leave-report-${today}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toastError('Export Excel ไม่สำเร็จ');
    }
  };

  const exportPDF = async () => {
    try {
      const html2pdfModule: any = await import('html2pdf.js');
      const html2pdf = html2pdfModule?.default || html2pdfModule;

      // Build a separate HTML table matching Excel columns (landscape, separate fields)
      const title = month === 0
        ? `รายงานใบลา ปี ${year + 543}`
        : `รายงานใบลา ${monthOptions.find(m => m.value === month)?.label} ${year + 543}`;

      const headerCells = ['#', 'รหัสพนักงาน', 'ชื่อพนักงาน', 'ตำแหน่ง', 'ฝ่าย', 'แผนก', 'วันที่หยุด', 'จำนวนวัน', 'ประเภท', 'เหตุผลการลา', 'สถานะ', 'หมายเหตุ'];
      const bodyRows = exportRows.map((r, i) => [
        i + 1,
        r.employeeId,
        r.employeeName,
        r.position,
        r.department,
        r.section,
        r.leaveDate,
        r.totalDays,
        r.leaveTypeName,
        r.reason,
        r.statusLabel,
        // Convert semicolon separator to <br> for PDF line breaks
        (r.note || '-').replace(/;\s*/g, '<br>'),
      ]);

      const printDate = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      const htmlContent = `
        <div style="font-family: 'Sarabun', 'Tahoma', sans-serif; padding: 12px 16px; color: #000000;">
          <h2 style="margin: 0 0 14px 0; font-size: 14pt; font-weight: 600; color: #000000; text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px;">${title}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                ${headerCells.map(h => `<th style="border: 1.5px solid #333; padding: 6px 4px; text-align: center; white-space: nowrap; background-color: #e0e0e0; color: #000000; font-weight: 600; font-size: 8pt;">${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${bodyRows.map((row, rowIdx) => `
                <tr style="background-color: ${rowIdx % 2 === 0 ? '#ffffff' : '#f5f5f5'};">
                  ${row.map((cell, idx) => {
        // idx 9 = เหตุผลการลา, idx 11 = หมายเหตุ - allow wrap
        const isWrapColumn = idx === 9 || idx === 11;
        const isCenterColumn = idx === 0 || idx === 7;
        return `<td style="border: 1px solid #444; padding: 5px 4px; color: #000000; font-size: 7.5pt; ${isCenterColumn ? 'text-align: center;' : ''} ${isWrapColumn ? 'max-width: 140px; word-wrap: break-word; white-space: normal;' : 'white-space: nowrap;'}">${cell}</td>`;
      }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 16px; padding-top: 8px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; font-size: 7pt; color: #333;">
            <span>พิมพ์เมื่อ: ${printDate}</span>
            <span>จำนวน ${exportRows.length} รายการ</span>
          </div>
        </div>
      `;

      const today = new Date().toISOString().slice(0, 10);
      await html2pdf()
        .from(htmlContent)
        .set({
          margin: [10, 10, 10, 10],
          filename: `leave-report-${today}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .toPdf()
        .get('pdf')
        .then((pdf: any) => {
          const totalPages = pdf.internal.getNumberOfPages();
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();

          for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(80, 80, 80);

            // Bottom right: page number (English to avoid Thai font issue)
            pdf.text(`${i} / ${totalPages}`, pageWidth - 10, pageHeight - 5, { align: 'right' });
          }
        })
        .save();
    } catch {
      toastError('Export PDF ไม่สำเร็จ');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
            }}
          >
            <DocumentText size={24} variant="Bold" color={theme.palette.primary.main} />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" fontWeight={700}>รายงานใบลา</Typography>
            <Typography variant="body2" color="text.secondary">Export เป็น Excel หรือ PDF</Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            onClick={fetchRows}
            startIcon={loading ? <CircularProgress size={18} /> : <Refresh2 size={18} color={theme.palette.primary.main} />}
            disabled={loading}
            sx={{ borderRadius: 1 }}
          >
            {!isMobile && 'รีเฟรช'}
          </Button>
          <Button
            variant="contained"
            onClick={exportExcel}
            startIcon={<DocumentDownload size={18} color="white" />}
            disabled={loading || rows.length === 0}
            sx={{ borderRadius: 1 }}
          >
            {isMobile ? 'Excel' : 'Export Excel'}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={exportPDF}
            startIcon={<DocumentDownload size={18} color="white" />}
            disabled={loading || rows.length === 0}
            sx={{ borderRadius: 1 }}
          >
            {isMobile ? 'PDF' : 'Export PDF'}
          </Button>
        </Stack>
      </Box>

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Row 1: Search, Month, Year */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr' },
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <TextField
            size="small"
            placeholder="ค้นหาชื่อ/รหัสพนักงาน"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchRows()}
            sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchNormal1 size={18} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
              sx: { borderRadius: 1 },
            }}
          />
          {/* Month */}
          <FormControl size="small">
            <InputLabel>เดือน</InputLabel>
            <Select value={month} label="เดือน" onChange={(e) => setMonth(Number(e.target.value))} sx={{ borderRadius: 1 }}>
              {monthOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Year */}
          <FormControl size="small">
            <InputLabel>ปี</InputLabel>
            <Select value={year} label="ปี" onChange={(e) => setYear(Number(e.target.value))} sx={{ borderRadius: 1 }}>
              {yearOptions.map((y) => (
                <MenuItem key={y} value={y}>{y + 543}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Row 2: Filters */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 1.5,
          }}
        >
          {/* Company */}
          <FormControl size="small">
            <InputLabel>บริษัท</InputLabel>
            <Select
              value={companyFilter}
              label="บริษัท"
              onChange={(e) => {
                const next = String(e.target.value);
                setCompanyFilter(next);
                setDepartmentFilter('all');
                setSectionFilter('all');
              }}
              sx={{ borderRadius: 1 }}
            >
              <MenuItem value="all">ทุกบริษัท</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Department */}
          <FormControl size="small">
            <InputLabel>ฝ่าย</InputLabel>
            <Select
              value={departmentFilter}
              label="ฝ่าย"
              onChange={(e) => {
                const next = String(e.target.value);
                setDepartmentFilter(next);
                setSectionFilter('all');
              }}
              sx={{ borderRadius: 1 }}
            >
              <MenuItem value="all">ทุกฝ่าย</MenuItem>
              {filteredDepartments.map((d) => (
                <MenuItem key={d.code} value={d.code}>{d.code} - {d.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Section */}
          <FormControl size="small">
            <InputLabel>แผนก</InputLabel>
            <Select value={sectionFilter} label="แผนก" onChange={(e) => setSectionFilter(String(e.target.value))} sx={{ borderRadius: 1 }}>
              <MenuItem value="all">ทุกแผนก</MenuItem>
              {filteredSections.map((s) => (
                <MenuItem key={s.code} value={s.code}>{s.code} - {s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Status */}
          <FormControl size="small">
            <InputLabel>สถานะ</InputLabel>
            <Select value={status} label="สถานะ" onChange={(e) => setStatus(String(e.target.value))} sx={{ borderRadius: 1 }}>
              {statusOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Active Filter Tags */}
      {(debouncedSearch || month !== 0 || companyFilter !== 'all' || departmentFilter !== 'all' || sectionFilter !== 'all' || status !== 'all') && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>ตัวกรอง:</Typography>

          {debouncedSearch && (
            <Chip
              size="small"
              label={`ค้นหา: ${debouncedSearch}`}
              onDelete={() => setSearch('')}
              sx={{ borderRadius: 1 }}
            />
          )}

          {month !== 0 && (
            <Chip
              size="small"
              label={`เดือน: ${monthOptions.find(m => m.value === month)?.label}`}
              onDelete={() => setMonth(0)}
              sx={{ borderRadius: 1 }}
            />
          )}

          {companyFilter !== 'all' && (
            <Chip
              size="small"
              label={`บริษัท: ${companies.find(c => c.code === companyFilter)?.name || companyFilter}`}
              onDelete={() => { setCompanyFilter('all'); setDepartmentFilter('all'); setSectionFilter('all'); }}
              sx={{ borderRadius: 1 }}
            />
          )}

          {departmentFilter !== 'all' && (
            <Chip
              size="small"
              label={`ฝ่าย: ${departments.find(d => d.code === departmentFilter)?.name || departmentFilter}`}
              onDelete={() => { setDepartmentFilter('all'); setSectionFilter('all'); }}
              sx={{ borderRadius: 1 }}
            />
          )}

          {sectionFilter !== 'all' && (
            <Chip
              size="small"
              label={`แผนก: ${sections.find(s => s.code === sectionFilter)?.name || sectionFilter}`}
              onDelete={() => setSectionFilter('all')}
              sx={{ borderRadius: 1 }}
            />
          )}

          {status !== 'all' && (
            <Chip
              size="small"
              label={`สถานะ: ${statusOptions.find(s => s.value === status)?.label}`}
              onDelete={() => setStatus('all')}
              sx={{ borderRadius: 1 }}
            />
          )}

          <Button
            size="small"
            variant="text"
            color="error"
            onClick={() => {
              setSearch('');
              setMonth(0);
              setYear(now.getFullYear());
              setCompanyFilter('all');
              setDepartmentFilter('all');
              setSectionFilter('all');
              setStatus('all');
            }}
            startIcon={<CloseSquare size={16} color="#f44336" />}
            sx={{ ml: 1 }}
          >
            ล้างทั้งหมด
          </Button>
        </Box>
      )}

      {/* Stat Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
          gap: 1.5,
          mb: 2,
        }}
      >
        <StatCard
          title="ใบลาทั้งหมด"
          value={stats.total}
          icon={<DocumentText size={20} variant="Bold" color="#1976d2" />}
          color="primary"
        />
        <StatCard
          title="รวมวันลา"
          value={stats.totalDays.toFixed(1)}
          icon={<Calendar size={20} variant="Bold" color="#9c27b0" />}
          color="secondary"
          subtitle="วัน"
        />
        <StatCard
          title="รออนุมัติ"
          value={stats.pending}
          icon={<Clock size={20} variant="Bold" color="#ff9800" />}
          color="warning"
        />
        <StatCard
          title="อนุมัติ"
          value={stats.approved}
          icon={<TickCircle size={20} variant="Bold" color="#4caf50" />}
          color="success"
        />
        <StatCard
          title="ไม่อนุมัติ"
          value={stats.rejected}
          icon={<CloseCircle size={20} variant="Bold" color="#f44336" />}
          color="error"
        />
        <StatCard
          title="ยกเลิก"
          value={stats.cancelled}
          icon={<CloseCircle size={20} variant="Bold" color="#9e9e9e" />}
          color="secondary"
        />
      </Box>

      {/* Table */}
      <Fade in={true} timeout={300}>
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
            overflow: 'hidden',
          }}
        >
          <Box ref={reportRef} sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              รายงานใบลา {month === 0 ? `ปี ${year + 543}` : `${monthOptions.find(m => m.value === month)?.label} ${year + 543}`}
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, whiteSpace: 'nowrap', width: 50 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, whiteSpace: 'nowrap' }}>พนักงาน</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, whiteSpace: 'nowrap' }}>สังกัด</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, whiteSpace: 'nowrap' }}>วันที่หยุด</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, whiteSpace: 'nowrap' }}>ประเภท</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, whiteSpace: 'nowrap' }}>เหตุผลการลา</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, whiteSpace: 'nowrap' }}>สถานะ</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, whiteSpace: 'nowrap' }}>หมายเหตุ</TableCell>
                </TableRow>
              </TableHead>

              {loading ? (
                <TableSkeleton />
              ) : rows.length === 0 ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 72,
                            height: 72,
                            bgcolor: alpha(theme.palette.text.secondary, 0.1),
                            color: theme.palette.text.secondary,
                            fontWeight: 800,
                          }}
                        >
                          <DocumentText size={32} variant="Bold" />
                        </Avatar>
                        <Typography variant="h6" fontWeight={700}>ไม่พบข้อมูล</Typography>
                        <Typography variant="body2" color="text.secondary">ลองเปลี่ยนตัวกรองเพื่อค้นหาข้อมูล</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : (
                <TableBody>
                  {rows.map((r, index) => (
                    <TableRow
                      key={r.id}
                      sx={{
                        transition: 'background-color 0.2s ease',
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                        '&:last-child td': { border: 0 },
                      }}
                    >
                      <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>{index + 1}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{r.employeeName}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.employeeId} • {r.position}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{r.department}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.section}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{formatThaiDateRange(r.startDate, r.endDate)}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.totalDays} วัน</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.leaveTypeName}</TableCell>
                      <TableCell sx={{ minWidth: 200 }}>{r.reason}</TableCell>
                      <TableCell>{statusThaiMap[(r.status || '').toLowerCase()] || r.statusLabel || r.status}</TableCell>
                      <TableCell sx={{ minWidth: 150 }}>{r.note || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </Box>
        </TableContainer>
      </Fade>
    </Box>
  );
}
