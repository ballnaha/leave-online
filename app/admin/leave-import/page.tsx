'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert,
    Avatar,
    alpha,
    useTheme,
    Chip,
    CircularProgress,
    IconButton,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    LinearProgress,
    Stack,
    Divider,
} from '@mui/material';
import {
    DocumentUpload,
    DocumentDownload,
    ArrowLeft,
    TickCircle,
    InfoCircle,
    Refresh2,
    Calendar,
} from 'iconsax-react';
import { useRouter } from 'next/navigation';
import { useToastr } from '@/app/components/Toastr';
import * as ExcelJS from 'exceljs';

interface PreviewLeave {
    rowNumber: number;
    employeeId: string;
    leaveType: string;
    totalDays: number;
    isValid: boolean;
    errors: string[];
}

interface ImportResult {
    success: number;
    failed: number;
    errors: { employeeId: string; message: string }[];
}

export default function LeaveImportPage() {
    const theme = useTheme();
    const router = useRouter();
    const toastr = useToastr();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<PreviewLeave[]>([]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

    const processFile = useCallback(async (selectedFile: File) => {
        setLoading(true);
        setPreviewData([]);
        setImportResult(null);

        try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
                toastr.error('ไฟล์ไม่มีข้อมูล');
                setLoading(false);
                return;
            }

            const preview: PreviewLeave[] = [];

            let headers: string[] = [];
            let headerRowIndex = -1;

            worksheet.eachRow((row, rowNumber) => {
                const values = row.values as any[];
                if (headerRowIndex === -1 && values.some(v => String(v).includes('รหัส') || String(v).includes('พนักงาน'))) {
                    headerRowIndex = rowNumber;
                    headers = values.map(v => String(v).toLowerCase());
                    return;
                }

                if (headerRowIndex !== -1 && rowNumber > headerRowIndex) {
                    const employeeId = String(values[headers.findIndex(h => h?.includes('รหัส') || h?.includes('employee'))] || '').trim();
                    const leaveType = String(values[headers.findIndex(h => h?.includes('ประเภท') || h?.includes('type'))] || '').trim();
                    const totalDays = parseFloat(values[headers.findIndex(h => h?.includes('วัน') || h?.includes('day'))]);

                    if (!employeeId && !leaveType) return;

                    const errors: string[] = [];
                    if (!employeeId) errors.push('ไม่พบรหัสพนักงาน');
                    if (!leaveType) errors.push('ไม่พบประเภทการลา');
                    if (isNaN(totalDays)) errors.push('จำนวนวันไม่ถูกต้อง');

                    preview.push({
                        rowNumber,
                        employeeId,
                        leaveType,
                        totalDays: isNaN(totalDays) ? 0 : totalDays,
                        isValid: errors.length === 0,
                        errors,
                    });
                }
            });

            if (preview.length === 0) {
                worksheet.eachRow((row, rowNumber) => {
                    const values = row.values as any[];
                    if (rowNumber === 1) return;

                    const employeeId = String(values[1] || '').trim();
                    const leaveType = String(values[2] || '').trim();
                    const totalDays = parseFloat(values[3]);

                    if (!employeeId || employeeId === 'undefined') return;

                    const errors: string[] = [];
                    if (!employeeId) errors.push('ไม่พบรหัสพนักงาน');
                    if (!leaveType) errors.push('ไม่พบประเภทการลา');
                    if (isNaN(totalDays)) errors.push('จำนวนวันไม่ถูกต้อง');

                    preview.push({
                        rowNumber,
                        employeeId,
                        leaveType,
                        totalDays: isNaN(totalDays) ? 0 : totalDays,
                        isValid: errors.length === 0,
                        errors,
                    });
                });
            }

            setPreviewData(preview);
            if (preview.length > 0) {
                toastr.success(`อ่านข้อมูลสำเร็จ ${preview.length} รายการ`);
            } else {
                toastr.warning('ไม่พบข้อมูลที่ต้องการในไฟล์');
            }
        } catch (error) {
            console.error('Error processing file:', error);
            toastr.error('เกิดข้อผิดพลาดในการอ่านไฟล์');
        } finally {
            setLoading(false);
        }
    }, [toastr]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            processFile(selectedFile);
        }
    };

    const handleImport = async () => {
        const validData = previewData.filter(p => p.isValid);
        if (validData.length === 0) {
            toastr.error('ไม่มีข้อมูลที่สามารถนำเข้าได้');
            return;
        }

        setImporting(true);
        setImportProgress(0);
        setImportResult(null);

        try {
            const res = await fetch('/api/admin/leave-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leaves: validData,
                    year: selectedYear,
                }),
            });

            if (res.ok) {
                const result = await res.json();
                setImportResult(result);
                setImportProgress(100);
                if (result.success > 0) {
                    toastr.success(`นำเข้าข้อมูลสำเร็จ ${result.success} รายการ`);
                }
                if (result.failed > 0) {
                    toastr.error(`นำเข้าไม่สำเร็จ ${result.failed} รายการ`);
                }
            } else {
                const error = await res.json();
                toastr.error(error.error || 'เกิดข้อผิดพลาดในการนำเข้า');
            }
        } catch (error) {
            console.error('Import error:', error);
            toastr.error('เกิดข้อผิดพลาดในการสื่อสารกับเซิร์ฟเวอร์');
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Leave-Import-Template');

        worksheet.columns = [
            { header: 'รหัสพนักงาน', key: 'employeeId', width: 20 },
            { header: 'ประเภทการลา', key: 'leaveType', width: 20 },
            { header: 'จำนวนวัน', key: 'totalDays', width: 15 },
        ];

        worksheet.addRow({ employeeId: '100001', leaveType: 'ลาป่วย', totalDays: 2 });
        worksheet.addRow({ employeeId: '100002', leaveType: 'ลากิจ', totalDays: 1 });
        worksheet.addRow({ employeeId: '100003', leaveType: 'พักร้อน', totalDays: 5 });

        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'leave_import_template.xlsx';
            anchor.click();
            window.URL.revokeObjectURL(url);
        });
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>

                    <Box>
                        <Typography variant="h4" fontWeight={800} color="primary.main" gutterBottom>
                            นำเข้าข้อมูลการลาย้อนหลัง
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            อัปโหลดไฟล์ Excel เพื่อเพิ่มสถิติการลาของพนักงานรายบุคคล ประจําปี {selectedYear + 543}
                        </Typography>
                    </Box>
                </Box>
                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="outlined"
                        startIcon={<DocumentDownload size={20} color={theme.palette.primary.main} variant="Outline" />}
                        onClick={downloadTemplate}
                        sx={{
                            borderRadius: 1.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            color: 'text.primary',
                            fontWeight: 600,
                            height: 48,
                            px: 3,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                borderColor: 'primary.main',
                            }
                        }}
                    >
                        ดาวน์โหลด Template
                    </Button>
                    <Tooltip title="รีเฟรชข้อมูล">
                        <IconButton
                            onClick={() => {
                                setFile(null);
                                setPreviewData([]);
                                setImportResult(null);
                                setSelectedYear(new Date().getFullYear());
                            }}
                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper', height: 48, width: 48 }}
                        >
                            <Refresh2 size={24} color={theme.palette.text.secondary} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            {/* Quick Settings & Info */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' }, gap: 3, mb: 3 }}>
                <Paper elevation={0} sx={{
                    p: 3,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    background: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(12px)',
                }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main', mb: 2 }}>
                        <Calendar size={22} variant="Bold" color={theme.palette.primary.main} />
                        ระบุปีที่ต้องการนำเข้า
                    </Typography>
                    <FormControl fullWidth size="small">
                        <InputLabel>ประจําปี</InputLabel>
                        <Select
                            value={selectedYear}
                            label="ประจําปี"
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            sx={{ borderRadius: 1.5 }}
                        >
                            {years.map(y => (
                                <MenuItem key={y} value={y}>{y + 543}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Box sx={{ mt: 3, p: 2, bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: 1.5, border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.1) }}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                            <InfoCircle size={20} variant="Bold" color={theme.palette.info.main} style={{ marginTop: 2, flexShrink: 0 }} />
                            <Typography variant="body2" color="info.main" fontWeight={500}>
                                ข้อมูลจะถูกบันทึกเป็นรายการที่ "อนุมัติแล้ว" และมีผลต่อสถิติและโควตาวันลาของพนักงานในปีที่เลือกโดยอัตโนมัติ
                            </Typography>
                        </Stack>
                    </Box>
                </Paper>

                <Paper
                    elevation={0}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        const droppedFile = e.dataTransfer.files[0];
                        if (droppedFile) {
                            setFile(droppedFile);
                            processFile(droppedFile);
                        }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                        p: 4,
                        borderRadius: 1,
                        border: '2px dashed',
                        borderColor: dragOver ? 'primary.main' : 'divider',
                        bgcolor: dragOver ? alpha(theme.palette.primary.main, 0.05) : alpha(theme.palette.background.paper, 0.4),
                        cursor: 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: alpha(theme.palette.primary.main, 0.02)
                        }
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <Avatar sx={{ width: 80, height: 80, bgcolor: alpha(theme.palette.primary.main, 0.1), mb: 2 }}>
                        <DocumentUpload size={40} color={theme.palette.primary.main} variant="Bold" />
                    </Avatar>
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                        {file ? file.name : 'คลิกหรือลากไฟล์ Excel (.xlsx) มาวางที่นี่'}
                    </Typography>

                    {file && (
                        <Chip
                            label="พร้อมนำเข้า"
                            color="success"
                            size="small"
                            sx={{ mt: 2, fontWeight: 700, borderRadius: 1 }}
                            icon={<TickCircle size={16} variant="Bold" color="white" />}
                        />
                    )}
                </Paper>
            </Box>

            {loading && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
                    <CircularProgress thickness={5} size={60} sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight={600} color="text.secondary">กำลังวิเคราะห์ข้อมูลจากไฟล์...</Typography>
                </Box>
            )}

            {/* Preview Section */}
            {previewData.length > 0 && !loading && (
                <Box sx={{ mt: 2 }}>
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h6" fontWeight={800} color="text.primary">
                                ตรวจสอบข้อมูลก่อนนำเข้า
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                ค้นพบข้อมูลทั้งหมด {previewData.length} รายการ
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleImport}
                            disabled={importing || previewData.every(p => !p.isValid)}
                            startIcon={importing ? <CircularProgress size={20} color="inherit" /> : <TickCircle variant="Bold" />}
                            sx={{
                                borderRadius: 1.5,
                                px: 5,
                                py: 1.5,
                                fontWeight: 700,
                                boxShadow: '0 8px 16px rgba(108, 99, 255, 0.25)',
                                '&:hover': { transform: 'translateY(-2px)' },
                                transition: 'all 0.2s'
                            }}
                        >
                            {importing ? `กำลังนำเข้า ${importProgress}%` : 'เริ่มการนำเข้าข้อมูล'}
                        </Button>
                    </Box>

                    {importing && (
                        <Box sx={{ mb: 4 }}>
                            <LinearProgress
                                variant="determinate"
                                value={importProgress}
                                sx={{
                                    height: 12,
                                    borderRadius: 6,
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    '& .MuiLinearProgress-bar': { borderRadius: 6 }
                                }}
                            />
                        </Box>
                    )}

                    {importResult && (
                        <Alert
                            severity={importResult.failed > 0 ? "warning" : "success"}
                            variant="filled"
                            sx={{ mb: 3, borderRadius: 1.5, boxShadow: 2 }}
                            onClose={() => setImportResult(null)}
                        >
                            <Typography variant="subtitle2" fontWeight={700}>
                                นำเข้าสำเร็จ {importResult.success} รายการ
                            </Typography>
                            {importResult.failed > 0 && (
                                <Typography variant="body2">
                                    และพบข้อผิดพลาด {importResult.failed} รายการ โปรดตรวจสอบรายละเอียดที่พนักงานในตารางด้านล่าง
                                </Typography>
                            )}
                        </Alert>
                    )}

                    <Paper elevation={0} sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                        <TableContainer sx={{ maxHeight: 600 }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', py: 2.5 }}>ลำดับ</TableCell>
                                        <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', py: 2.5 }}>รหัสพนักงาน</TableCell>
                                        <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', py: 2.5 }}>ประเภทการลา</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 800, bgcolor: 'background.paper', py: 2.5 }}>จำนวนวันที่ลา (วัน)</TableCell>
                                        <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', py: 2.5, width: 150 }}>สถานะตรวจสอบ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {previewData.map((row) => (
                                        <TableRow key={row.rowNumber} hover sx={{ transition: 'background 0.2s' }}>
                                            <TableCell sx={{ color: 'text.secondary' }}>{row.rowNumber}</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{row.employeeId}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={row.leaveType}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ borderRadius: 1, fontWeight: 600 }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography fontWeight={800} color="text.primary">
                                                    {row.totalDays}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {row.isValid ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
                                                        <TickCircle size={18} variant="Bold" />
                                                        <Typography variant="body2" fontWeight={700}>พร้อมใช้งาน</Typography>
                                                    </Box>
                                                ) : (
                                                    <Tooltip title={row.errors.join(', ')}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                                                            <InfoCircle size={18} variant="Bold" />
                                                            <Typography variant="body2" fontWeight={700}>ข้อมูลไม่ถูกต้อง</Typography>
                                                        </Box>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    {/* Guidelines */}
                    <Box sx={{ mt: 4, mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700} color="text.primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <InfoCircle size={20} color={theme.palette.text.secondary} />
                            ข้อควรทราบในการนำเข้าข้อมูล:
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="body2" color="text.secondary" component="div">
                            <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
                                <li>ระบุชื่อประเภทการลาให้ตรงตามที่ตั้งค่าไว้ในระบบ (ตัวอย่าง: <b>ลาป่วย, ลากิจ, พักร้อน</b>)</li>
                                <li>ระบบจะใช้รหัสพนักงานเป็นตัวระบุตัวตนพนักงานคนหากไม่พบข้อมูลพนักงานระบบจะข้ามรายการนั้น</li>
                                <li>จำนวนวันที่ลาสามารถใส่เป็นทศนิยมได้ตามสิทธิ์ที่ต้องการให้ (เช่น <b>0.5 วัน</b>)</li>
                                <li>หากพนักงานมีใบลาที่เคยย้อนหลังไปแล้ว ระบบจะเพิ่มยอดใหม่นี้เข้าไปรวมกับของเดิม</li>
                            </ul>
                        </Typography>
                    </Box>
                </Box>
            )}
        </Box>
    );
}
