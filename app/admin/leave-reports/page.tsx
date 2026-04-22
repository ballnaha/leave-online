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
  TablePagination,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DocumentDownload, Refresh2, DocumentText, TickCircle, CloseCircle, Clock, Calendar, SearchNormal1, CloseSquare } from 'iconsax-react';
import { useToastr } from '@/app/components/Toastr';
import { useUser } from '@/app/providers/UserProvider';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { useRouter } from 'next/navigation';

type ReportRow = {
  id: number;
  leaveCode: string;
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
  pendingApprover: string | null;
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
  flStats?: { totalRequests: number; uniqueEmployees: number; approvedDays: number };
  companies?: CompanyOption[];
  departments?: DeptOption[];
  sections?: SectionOption[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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

const escapeHtml = (value: string | number | null | undefined) => {
  return String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
          <TableCell><Skeleton variant="text" width={40} /></TableCell>
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
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { error: toastError } = useToastr();
  const { user, loading: userLoading } = useUser();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, totalDays: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
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

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalRows, setTotalRows] = useState(0);

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
      const nextSearch = search.trim();
      if (nextSearch !== debouncedSearch) {
        setDebouncedSearch(nextSearch);
        setPage(0);
      }
    }, 500);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search, debouncedSearch]);

  const fetchRows = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('status', status);
    params.set('month', String(month));
    params.set('year', String(year));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (companyFilter !== 'all') params.set('company', companyFilter);
    if (departmentFilter !== 'all') params.set('department', departmentFilter);
    if (sectionFilter !== 'all') params.set('section', sectionFilter);

    // Pagination parameters
    params.set('page', String(page + 1));
    if (rowsPerPage > 0) {
      params.set('limit', String(rowsPerPage));
    }

    const url = `/api/admin/leave-reports?${params.toString()}`;

    const cached = leaveReportCache.get(url);
    if (cached && Date.now() - cached.ts < LEAVE_REPORT_CACHE_TTL_MS) {
      if (!isMountedRef.current) return;
      setRows(Array.isArray(cached.data?.rows) ? (cached.data.rows as ReportRow[]) : []);
      setStats(cached.data?.stats || { total: 0, totalDays: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 });
      
      if (cached.data?.companies && companies.length === 0) setCompanies(cached.data.companies);
      if (cached.data?.departments && departments.length === 0) setDepartments(cached.data.departments);
      if (cached.data?.sections && sections.length === 0) setSections(cached.data.sections);
      
      setTotalRows(cached.data?.pagination?.total || 0);
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
      
      // Only set these if they haven't been loaded or are empty to prevent filter flicker
      if (data?.companies && companies.length === 0) setCompanies(data.companies);
      if (data?.departments && departments.length === 0) setDepartments(data.departments);
      if (data?.sections && sections.length === 0) setSections(data.sections);
      
      setTotalRows(data?.pagination?.total || 0);
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
  }, [status, month, year, debouncedSearch, companyFilter, departmentFilter, sectionFilter, page, rowsPerPage, toastError]);

  const userKey = `${user?.id}-${user?.role}`;
  useEffect(() => {
    if (!userLoading && user) {
      if (hasPermission(user.role, PERMISSIONS.CAN_VIEW_REPORTS)) {
        fetchRows();
      } else {
        router.replace('/unauthorized');
      }
    }
  }, [fetchRows, userKey, userLoading, router]);

  const exportRows = useMemo(() => {
    return rows.map((r) => ({
      leaveCode: r.leaveCode,
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

  const openPrintPreview = async () => {
    setPdfLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', status);
      params.set('month', String(month));
      params.set('year', String(year));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (companyFilter !== 'all') params.set('company', companyFilter);
      if (departmentFilter !== 'all') params.set('department', departmentFilter);
      if (sectionFilter !== 'all') params.set('section', sectionFilter);

      const res = await fetch(`/api/admin/leave-reports?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('fetch failed');
      const data = (await res.json()) as LeaveReportResponse;
      // กรองบังคับพักร้อน (leaveCode ขึ้นต้นด้วย FL) ออกจาก PDF
      // (API กรอง FL ไว้แล้ว เพิ่มการกรองซ้ำ client-side เพื่อความปลอดภัย)
      const allRows: ReportRow[] = (Array.isArray(data.rows) ? data.rows : []).filter(
        (r) => !r.leaveCode?.startsWith('FL'),
      );
      const flStats = data.flStats;

      if (allRows.length === 0) {
        toastError('ไม่มีข้อมูลสำหรับเปิดตัวอย่างก่อนพิมพ์');
        return;
      }

      const deptList: DeptOption[] = data.departments || departments;
      const compList: CompanyOption[] = data.companies || companies;
      const deptMap = new Map(deptList.map((d) => [d.code, d]));
      const compMap = new Map(compList.map((c) => [c.code, c.name]));

      type GroupedEmployee = { employeeId: string; rows: ReportRow[] };
      type GroupedPosition = Map<string, GroupedEmployee[]>;
      type GroupedSection = Map<string, GroupedPosition>;
      type GroupedDept = Map<string, GroupedSection>;
      type GroupedCompany = Map<string, GroupedDept>;

      const grouped: GroupedCompany = new Map();

      for (const row of allRows) {
        const deptInfo = deptMap.get(row.departmentCode);
        const companyName = deptInfo ? (compMap.get(deptInfo.companyCode) || deptInfo.companyCode) : 'ไม่ระบุบริษัท';
        const deptName = row.departmentCode
          ? `${row.departmentCode} - ${row.department || row.departmentCode}`
          : (row.department || 'ไม่ระบุฝ่าย');
        const sectionName = row.sectionCode
          ? `${row.sectionCode} - ${row.section || row.sectionCode}`
          : (row.section || 'ไม่ระบุแผนก');
        const posName = row.position || 'ไม่ระบุตำแหน่ง';
        if (!grouped.has(companyName)) grouped.set(companyName, new Map());
        const byDept = grouped.get(companyName)!;
        if (!byDept.has(deptName)) byDept.set(deptName, new Map());
        const bySect = byDept.get(deptName)!;
        if (!bySect.has(sectionName)) bySect.set(sectionName, new Map());
        const byPos = bySect.get(sectionName)!;
        if (!byPos.has(posName)) byPos.set(posName, []);
        const empList = byPos.get(posName)!;
        let empEntry = empList.find((e) => e.employeeId === row.employeeId);
        if (!empEntry) {
          empEntry = { employeeId: row.employeeId, rows: [] };
          empList.push(empEntry);
        }
        empEntry.rows.push(row);
      }

      const approvedLeaveDays = allRows.reduce(
        (sum, row) => ((row.status || '').toLowerCase() === 'approved' ? sum + (row.totalDays || 0) : sum),
        0,
      );

      const periodLabel = month === 0
        ? `ปี ${year + 543}`
        : `${monthOptions.find((m) => m.value === month)?.label} ${year + 543}`;

      const filterParts = [
        companyFilter !== 'all' ? `บริษัท: ${escapeHtml(compMap.get(companyFilter) || companyFilter)}` : '',
        departmentFilter !== 'all' ? `ฝ่าย: ${escapeHtml(deptMap.get(departmentFilter)?.name || departmentFilter)}` : '',
        sectionFilter !== 'all' ? `แผนก: ${escapeHtml(sectionFilter)}` : '',
        status !== 'all' ? `สถานะ: ${escapeHtml(statusOptions.find((s) => s.value === status)?.label || status)}` : '',
      ].filter(Boolean);

      // Single flat table with group-header rows — most space-efficient layout
      const docDate = new Date().toLocaleDateString('th-TH', { dateStyle: 'long' });
      const headerLine = [
        `<strong>รายงานการลา</strong>`,
        `ช่วงเวลา: ${escapeHtml(periodLabel)}`,
        `${escapeHtml(allRows.length)} รายการ`,
        `วันลาที่อนุมัติ ${escapeHtml(approvedLeaveDays.toFixed(1))} วัน`,
        ...filterParts,
        `ออกเอกสาร: ${escapeHtml(docDate)}`,
      ].join(' &nbsp;|&nbsp; ');

      let rowSeq = 0;
      let tableRows = '';
      for (const [companyName, byDept] of grouped) {
        tableRows += `<tr class="grp-company"><td colspan="8">บริษัท: ${escapeHtml(companyName)}</td></tr>`;
        for (const [deptName, bySect] of byDept) {
          tableRows += `<tr class="grp-dept"><td colspan="8">ฝ่าย: ${escapeHtml(deptName)}</td></tr>`;
          for (const [sectionName, byPos] of bySect) {
            tableRows += `<tr class="grp-sect"><td colspan="8">แผนก: ${escapeHtml(sectionName)}</td></tr>`;
            for (const [posName, empList] of byPos) {
              tableRows += `<tr class="grp-pos"><td colspan="8">ตำแหน่ง: ${escapeHtml(posName)}</td></tr>`;
              for (const emp of empList) {
                const empDisplayName = emp.rows[0]?.employeeName || emp.employeeId;
                const totalEmpDays = emp.rows.reduce(
                  (sum, r) => ((r.status || '').toLowerCase() === 'approved' ? sum + (r.totalDays || 0) : sum),
                  0,
                );
                tableRows += `<tr class="grp-emp"><td colspan="5">${escapeHtml(empDisplayName)} (${escapeHtml(emp.employeeId)})</td><td colspan="3" class="tr">วันลาที่อนุมัติ ${escapeHtml(totalEmpDays.toFixed(1))} วัน</td></tr>`;
                emp.rows.forEach((r) => {
                  rowSeq += 1;
                  const statusText = statusThaiMap[(r.status || '').toLowerCase()] || r.statusLabel || r.status;
                  tableRows += `<tr class="data-row">
                    <td class="tc">${rowSeq}</td>
                    <td>${escapeHtml(r.leaveCode)}</td>
                    <td class="nw">${escapeHtml(formatThaiDateRange(r.startDate, r.endDate))}</td>
                    <td class="tc">${escapeHtml(r.totalDays)}</td>
                    <td>${escapeHtml(r.leaveTypeName)}</td>
                    <td>${escapeHtml(r.reason || '-')}</td>
                    <td class="nw fw">${escapeHtml(statusText)}${r.pendingApprover && (r.status === 'pending' || r.status === 'in_progress') ? `<br><span class="pending-who">รอ: ${escapeHtml(r.pendingApprover)}</span>` : ''}</td>
                    <td>${escapeHtml(r.note || '-')}</td>
                  </tr>`;
                });
              }
            }
          }
        }
      }

      const reportBody = `
        <div class="doc-header">${headerLine}</div>
        <table>
          <colgroup>
            <col style="width:26px">
            <col style="width:66px">
            <col style="width:86px">
            <col style="width:30px">
            <col style="width:72px">
            <col style="width:80px">
            <col style="width:56px">
            <col style="width:68px">
          </colgroup>
          <thead>
            <tr class="col-head">
              <th>#</th><th>รหัสใบลา</th><th>วันที่ลา</th><th>วัน</th><th>ประเภท</th><th>เหตุผล</th><th>สถานะ</th><th>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="doc-footer">รวม ${escapeHtml(allRows.length)} รายการ &nbsp;|&nbsp; วันลาที่อนุมัติ ${escapeHtml(approvedLeaveDays.toFixed(1))} วัน</div>
        
      `;

      const previewWindow = window.open('', '_blank');
      if (!previewWindow) {
        toastError('เบราว์เซอร์บล็อกหน้าต่างตัวอย่าง กรุณาอนุญาต pop-up แล้วลองใหม่');
        return;
      }

      const previewHtml = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>รายงานใบลา</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Sarabun',Tahoma,sans-serif;font-size:9px;background:#dce6ec;color:#111}
.toolbar{position:sticky;top:0;z-index:9;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 16px;background:#3b5068;color:#fff}
.tbar-left{display:flex;flex-direction:column;gap:2px}
.tbar-title{font-size:13px;font-weight:700}
.tbar-sub{font-size:10px;opacity:.75}
.tbar-btns{display:flex;gap:8px}
.tbar-btns button{border:1px solid rgba(255,255,255,.6);border-radius:3px;padding:7px 14px;font-size:11px;font-weight:700;cursor:pointer;background:transparent;color:#fff}
.tbar-btns .btn-print{background:#fff;color:#3b5068}
.shell{padding:20px;display:flex;justify-content:center}
.page{width:210mm;min-height:297mm;padding:12mm 15mm;background:#fff;box-shadow:0 8px 24px rgba(0,0,0,.14);position:relative}
.doc-header{border:1.5px solid #111;padding:5px 8px;margin-bottom:6px;font-size:9px;line-height:1.6;word-break:break-word}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{border:1px solid #999;padding:3px 4px;font-size:8.5px;vertical-align:top;text-align:left;word-break:break-word;line-height:1.35}
th{background:#e8edf2;font-weight:700;white-space:nowrap}
.col-head th{background:#3b5068;color:#fff;font-size:8.5px}
.grp-company td{background:#3b5068;color:#fff;font-weight:700;font-size:9px;padding:4px 6px;border-color:#2d3e52}
.grp-dept td{background:#4a7c6f;color:#fff;font-weight:700;font-size:8.5px;padding:3px 6px;border-color:#3a6155}
.grp-sect td{background:#d0dfe6;color:#1a2d3a;font-size:8px;padding:2px 6px;border-color:#aac0cc}
.grp-pos td{background:#eaf2ef;color:#1a3028;font-weight:700;font-size:8px;padding:2px 6px;font-style:italic}
.grp-emp td{background:#f4f8f6;font-weight:700;font-size:8.5px;padding:3px 6px;border-top:1.5px solid #4a7c6f}
.data-row:nth-child(even) td{background:#f7fafb}
.tc{text-align:center}
.nw{white-space:nowrap}
.tr{text-align:right}
.fw{font-weight:700}
.doc-footer{margin-top:6px;font-size:8.5px;text-align:right;color:#444;border-top:1px solid #aaa;padding-top:4px}
.fl-note{margin-top:5px;padding:4px 7px;border:1px dashed #777;font-size:8px;color:#444;background:#f9f9f9}
.pending-who{font-weight:400;font-style:italic;font-size:7.5px;color:#555}
@page{size:A4 portrait;margin:0}
@media print{
body{background:#fff}
.toolbar{display:none}
.shell{padding:0}
.page{width:210mm;min-height:297mm;box-shadow:none;margin:0;padding:12mm 15mm}
.grp-company td,.grp-dept td,.grp-sect td,.grp-pos td,.grp-emp td{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style>
</head>
<body>
<div class="toolbar">
  <div class="tbar-left">
    <div class="tbar-title">ตัวอย่างก่อนพิมพ์รายงานใบลา</div>
    <div class="tbar-sub">เลือก Microsoft Print to PDF เพื่อบันทึกเป็น PDF</div>
  </div>
  <div class="tbar-btns">
    <button class="btn-print" onclick="window.print()">พิมพ์ / Save as PDF</button>
    <button onclick="window.close()">ปิด</button>
  </div>
</div>
<div class="shell"><main class="page">${reportBody}</main></div>
</body>
</html>`;

      previewWindow.document.open();
      previewWindow.document.write(previewHtml);
      previewWindow.document.close();
      previewWindow.focus();
    } catch {
      toastError('เปิดตัวอย่างก่อนพิมพ์ไม่สำเร็จ');
    } finally {
      setPdfLoading(false);
    }
  };

  const exportExcel = async () => {
    setExcelLoading(true);
    try {
      // Fetch all data for excel export (not just current page)
      const params = new URLSearchParams();
      params.set('status', status);
      params.set('month', String(month));
      params.set('year', String(year));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (companyFilter !== 'all') params.set('company', companyFilter);
      if (departmentFilter !== 'all') params.set('department', departmentFilter);
      if (sectionFilter !== 'all') params.set('section', sectionFilter);

      const res = await fetch(`/api/admin/leave-reports?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('fetch failed');
      const data = (await res.json()) as LeaveReportResponse;
      const allRows: ReportRow[] = (Array.isArray(data.rows) ? data.rows : []).filter(
        (r) => !r.leaveCode?.startsWith('FL'),
      );

      if (allRows.length === 0) {
        toastError('ไม่มีข้อมูลสำหรับ Export');
        return;
      }

      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('LeaveReport', {
        pageSetup: {
          paperSize: 9, // A4
          orientation: 'portrait',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0, // Auto
          margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
        }
      });

      // Set column widths (8 columns like PDF)
      worksheet.columns = [
        { width: 6 },  // #
        { width: 12 }, // รหัสใบลา
        { width: 22 }, // วันที่ลา
        { width: 8 },  // วัน
        { width: 15 }, // ประเภท
        { width: 30 }, // เหตุผล
        { width: 15 }, // สถานะ
        { width: 30 }, // หมายเหตุ
      ];

      // Styling helpers
      const groupStyle = (fg: string, fontColor = 'FFFFFFFF', fontSize = 10, bold = true) => ({
        font: { bold, color: { argb: fontColor }, size: fontSize },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: fg } },
        border: {
          top: { style: 'thin' as const },
          left: { style: 'thin' as const },
          bottom: { style: 'thin' as const },
          right: { style: 'thin' as const },
        },
      });

      // Add main header
      const periodLabel = month === 0
        ? `ปี ${year + 543}`
        : `${monthOptions.find((m) => m.value === month)?.label} ${year + 543}`;
      
      const titleRow = worksheet.addRow([`รายงานการลา - ช่วงเวลา: ${periodLabel}`]);
      titleRow.font = { bold: true, size: 14 };
      worksheet.mergeCells(1, 1, 1, 8);

      const subHeaderRow = worksheet.addRow([`ออกเอกสารเมื่อ: ${new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}`]);
      subHeaderRow.font = { italic: true, size: 10 };
      worksheet.mergeCells(2, 1, 2, 8);
      worksheet.addRow([]); // empty row

      // Add table header
      const header = ['#', 'รหัสใบลา', 'วันที่ลา', 'วัน', 'ประเภท', 'เหตุผล', 'สถานะ', 'หมายเหตุ'];
      const headerRow = worksheet.addRow(header);
      headerRow.eachCell((cell) => {
        const style = groupStyle('FF3B5068', 'FFFFFFFF', 10, true);
        cell.font = style.font;
        cell.fill = style.fill;
        cell.border = style.border;
        cell.alignment = { horizontal: 'center' };
      });

      // Grouping data logic (same as PDF)
      const deptList: DeptOption[] = data.departments || departments;
      const compList: CompanyOption[] = data.companies || companies;
      const deptMap = new Map(deptList.map((d) => [d.code, d]));
      const compMap = new Map(compList.map((c) => [c.code, c.name]));

      type GroupedEmployee = { employeeId: string; rows: ReportRow[] };
      type GroupedPosition = Map<string, GroupedEmployee[]>;
      type GroupedSection = Map<string, GroupedPosition>;
      type GroupedDept = Map<string, GroupedSection>;
      type GroupedCompany = Map<string, GroupedDept>;
      const grouped: GroupedCompany = new Map();

      for (const row of allRows) {
        const deptInfo = deptMap.get(row.departmentCode);
        const companyName = deptInfo ? (compMap.get(deptInfo.companyCode) || deptInfo.companyCode) : 'ไม่ระบุบริษัท';
        const deptName = row.departmentCode ? `${row.departmentCode} - ${row.department || row.departmentCode}` : (row.department || 'ไม่ระบุฝ่าย');
        const sectionName = row.sectionCode ? `${row.sectionCode} - ${row.section || row.sectionCode}` : (row.section || 'ไม่ระบุแผนก');
        const posName = row.position || 'ไม่ระบุตำแหน่ง';
        if (!grouped.has(companyName)) grouped.set(companyName, new Map());
        const byDept = grouped.get(companyName)!;
        if (!byDept.has(deptName)) byDept.set(deptName, new Map());
        const bySect = byDept.get(deptName)!;
        if (!bySect.has(sectionName)) bySect.set(sectionName, new Map());
        const byPos = bySect.get(sectionName)!;
        if (!byPos.has(posName)) byPos.set(posName, []);
        const empList = byPos.get(posName)!;
        let empEntry = empList.find((e) => e.employeeId === row.employeeId);
        if (!empEntry) {
          empEntry = { employeeId: row.employeeId, rows: [] };
          empList.push(empEntry);
        }
        empEntry.rows.push(row);
      }

      // Add grouped rows to worksheet
      let rowSeq = 0;
      for (const [companyName, byDept] of grouped) {
        const row = worksheet.addRow([`บริษัท: ${companyName}`]);
        worksheet.mergeCells(row.number, 1, row.number, 8);
        row.eachCell((cell) => { Object.assign(cell, groupStyle('FF3B5068', 'FFFFFFFF', 11)); });

        for (const [deptName, bySect] of byDept) {
          const row = worksheet.addRow([`  ฝ่าย: ${deptName}`]);
          worksheet.mergeCells(row.number, 1, row.number, 8);
          row.eachCell((cell) => { Object.assign(cell, groupStyle('FF4A7C6F', 'FFFFFFFF', 10)); });

          for (const [sectionName, byPos] of bySect) {
            const row = worksheet.addRow([`    แผนก: ${sectionName}`]);
            worksheet.mergeCells(row.number, 1, row.number, 8);
            row.eachCell((cell) => { Object.assign(cell, groupStyle('FFD0DFE6', 'FF1A2D3A', 9)); });

            for (const [posName, empList] of byPos) {
              const row = worksheet.addRow([`      ตำแหน่ง: ${posName}`]);
              worksheet.mergeCells(row.number, 1, row.number, 8);
              row.eachCell((cell) => { Object.assign(cell, groupStyle('FFEAF2EF', 'FF1A3028', 9, false)); cell.font.italic = true; });

              for (const emp of empList) {
                const empDisplayName = emp.rows[0]?.employeeName || emp.employeeId;
                const totalEmpDays = emp.rows.reduce(
                  (sum, r) => ((r.status || '').toLowerCase() === 'approved' ? sum + (r.totalDays || 0) : sum),
                  0,
                );
                const row = worksheet.addRow([`        ${empDisplayName} (${emp.employeeId})`, '', '', '', '', '', '', `วันลาที่อนุมัติ ${totalEmpDays.toFixed(1)} วัน`]);
                worksheet.mergeCells(row.number, 1, row.number, 5);
                worksheet.mergeCells(row.number, 6, row.number, 8);
                row.eachCell((cell) => { Object.assign(cell, groupStyle('FFF4F8F6', 'FF000000', 10, true)); });
                row.getCell(6).alignment = { horizontal: 'right' };

                emp.rows.forEach((r) => {
                  rowSeq += 1;
                  const statusText = statusThaiMap[(r.status || '').toLowerCase()] || r.statusLabel || r.status;
                  const dataRow = worksheet.addRow([
                    rowSeq,
                    r.leaveCode,
                    formatThaiDateRange(r.startDate, r.endDate),
                    r.totalDays,
                    r.leaveTypeName,
                    r.reason || '-',
                    statusText + (r.pendingApprover && (r.status === 'pending' || r.status === 'in_progress') ? ` (รอ: ${r.pendingApprover})` : ''),
                    r.note || '-'
                  ]);
                  dataRow.eachCell((cell) => {
                    cell.border = {
                      top: { style: 'thin' },
                      left: { style: 'thin' },
                      bottom: { style: 'thin' },
                      right: { style: 'thin' },
                    };
                    cell.font = { size: 9 };
                    cell.alignment = { vertical: 'top', wrapText: true };
                  });
                  dataRow.getCell(1).alignment = { horizontal: 'center' };
                  dataRow.getCell(4).alignment = { horizontal: 'center' };
                });
              }
            }
          }
        }
      }

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
    } catch (err) {
      console.error(err);
      toastError('Export Excel ไม่สำเร็จ');
    } finally {
      setExcelLoading(false);
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
            <Typography variant="body2" color="text.secondary">Export เป็น Excel / PDF</Typography>
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
            startIcon={excelLoading ? <CircularProgress size={18} color="inherit" /> : <DocumentDownload size={18} color="white" />}
            disabled={loading || rows.length === 0 || excelLoading}
            sx={{ borderRadius: 1 }}
          >
            {isMobile ? 'Excel' : (excelLoading ? 'กำลังสร้าง...' : 'Export Excel')}
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={openPrintPreview}
            startIcon={pdfLoading ? <CircularProgress size={18} color="inherit" /> : <DocumentText size={18} color={theme.palette.error.main} />}
            disabled={loading || rows.length === 0 || pdfLoading}
            sx={{ borderRadius: 1, borderColor: theme.palette.error.main, color: theme.palette.error.main }}
          >
            {isMobile ? 'Preview' : (pdfLoading ? 'กำลังเตรียม...' : 'Preview / Print')}
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
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
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
            <Select value={month} label="เดือน" onChange={(e) => { setMonth(Number(e.target.value)); setPage(0); }} sx={{ borderRadius: 1 }}>
              {monthOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Year */}
          <FormControl size="small">
            <InputLabel>ปี</InputLabel>
            <Select value={year} label="ปี" onChange={(e) => { setYear(Number(e.target.value)); setPage(0); }} sx={{ borderRadius: 1 }}>
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
                setPage(0);
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
                setPage(0);
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
            <Select value={sectionFilter} label="แผนก" onChange={(e) => { setSectionFilter(String(e.target.value)); setPage(0); }} sx={{ borderRadius: 1 }}>
              <MenuItem value="all">ทุกแผนก</MenuItem>
              {filteredSections.map((s) => (
                <MenuItem key={s.code} value={s.code}>{s.code} - {s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Status */}
          <FormControl size="small">
            <InputLabel>สถานะ</InputLabel>
            <Select value={status} label="สถานะ" onChange={(e) => { setStatus(String(e.target.value)); setPage(0); }} sx={{ borderRadius: 1 }}>
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
        <Box>
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
              overflow: 'hidden',
              mb: 2,
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
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, whiteSpace: 'nowrap' }}>รหัสใบลา</TableCell>
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
                      <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
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
                        <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>{index + 1 + (page * (rowsPerPage > 0 ? rowsPerPage : totalRows))}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{r.leaveCode}</TableCell>
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
                        <TableCell>
                          <Box>
                            <Typography variant="body2">{statusThaiMap[(r.status || '').toLowerCase()] || r.statusLabel || r.status}</Typography>
                            {r.pendingApprover && (r.status === 'pending' || r.status === 'in_progress') && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                รอ: {r.pendingApprover}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ minWidth: 150 }}>{r.note || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                )}
              </Table>
            </Box>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalRows}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100, { label: 'ทั้งหมด', value: -1 }]}
            labelRowsPerPage="จำนวนแถวต่อหน้า:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} จาก ${count}`}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: alpha(theme.palette.background.paper, 0.8),
            }}
          />
        </Box>
      </Fade>
      <Box sx={{ mb: 4 }} />
    </Box>
  );
}
