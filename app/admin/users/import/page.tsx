'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
    AlertTitle,
    Avatar,
    alpha,
    useTheme,
    Chip,
    CircularProgress,
    Card,
    CardContent,
    Divider,
    LinearProgress,
    IconButton,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import {
    DocumentUpload,
    DocumentDownload,
    CloseCircle,
    TickCircle,
    ArrowLeft,
    Refresh2,
    Trash,
    People,
    InfoCircle,
    Warning2,
    Building,
} from 'iconsax-react';
import { useRouter } from 'next/navigation';
import { useToastr } from '@/app/components/Toastr';
import * as ExcelJS from 'exceljs';

interface PreviewUser {
    rowNumber: number;
    employeeId: string;
    firstName: string;
    lastName: string;
    gender: 'male' | 'female' | '';
    genderLabel: string;
    position: string;
    startDate: string;
    startDateFormatted: string;
    originalYear: number;
    convertedYear: number;
    department: string;
    section: string;
    employeeType?: string;
    isValid: boolean;
    errors: string[];
}

interface ImportResult {
    success: number;
    failed: number;
    errors: { row: number; message: string }[];
}

interface Company {
    id: number;
    code: string;
    name: string;
}

export default function ImportUsersPage() {
    const theme = useTheme();
    const router = useRouter();
    const toastr = useToastr();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<PreviewUser[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [employeeType, setEmployeeType] = useState<string>('monthly'); // Default to monthly
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [allDepartments, setAllDepartments] = useState<any[]>([]);

    // Fetch companies on mount
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const res = await fetch('/api/admin/companies');
                if (res.ok) {
                    const data = await res.json();
                    setCompanies(data);
                    // Auto-select first company if available
                    if (data.length > 0) {
                        setSelectedCompany(data[0].code);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch companies:', error);
            }
        };
        fetchCompanies();
    }, []);

    // Fetch departments and sections when company changes
    useEffect(() => {
        if (!selectedCompany) return;

        const fetchDeptStructure = async () => {
            try {
                const res = await fetch(`/api/admin/departments?company=${selectedCompany}`);
                if (res.ok) {
                    const data = await res.json();
                    setAllDepartments(data);
                }
            } catch (error) {
                console.error('Failed to fetch department structure:', error);
            }
        };
        fetchDeptStructure();
    }, [selectedCompany]);

    // Parse name to extract employeeId, firstName, lastName, gender
    const parseName = (name: string): { employeeId: string; firstName: string; lastName: string; gender: 'male' | 'female' | '' } => {
        // Name format: "200039 นายฐิติณัฏฐ์ ศรีรัตน์" 
        // หรือ "200141 น.ส.ชมาพร บุญครอง"
        const trimmed = name?.trim() || '';
        const match = trimmed.match(/^(\d+)\s+(.+)$/);

        if (match) {
            const employeeId = match[1];
            const fullName = match[2].trim();

            // Prefixes with gender mapping
            // Male prefixes: นาย, ว่าที่ ร.ต.
            // Female prefixes: นาง, นางสาว, น.ส., นส., นส
            const malePrefixes = ['ว่าที่ ร.ต.', 'ว่าที่ร.ต.', 'นาย'];
            const femalePrefixes = ['นางสาว', 'น.ส.', 'น.ส', 'นส.', 'นส', 'นาง'];
            const allPrefixes = [...malePrefixes, ...femalePrefixes];

            let firstName = '';
            let lastName = '';
            let gender: 'male' | 'female' | '' = '';
            let remainingName = fullName;

            // Check male prefixes first
            for (const prefix of malePrefixes) {
                if (fullName.startsWith(prefix)) {
                    remainingName = fullName.substring(prefix.length).trim();
                    gender = 'male';
                    break;
                }
            }

            // If not male, check female prefixes
            if (!gender) {
                for (const prefix of femalePrefixes) {
                    if (fullName.startsWith(prefix)) {
                        remainingName = fullName.substring(prefix.length).trim();
                        gender = 'female';
                        break;
                    }
                }
            }

            // Split by space
            const nameParts = remainingName.split(/\s+/);
            if (nameParts.length >= 2) {
                firstName = nameParts[0];
                lastName = nameParts.slice(1).join(' ');
            } else {
                firstName = remainingName;
                lastName = '';
            }

            return { employeeId, firstName, lastName, gender };
        }

        return { employeeId: '', firstName: trimmed, lastName: '', gender: '' };
    };

    // Convert Buddhist year to Christian year (Support both String and Date object)
    const convertBEtoAD = (value: any): { formatted: string; originalYear: number; convertedYear: number; isValid: boolean } => {
        if (!value) return { formatted: '', originalYear: 0, convertedYear: 0, isValid: false };

        let day, month, year;

        // 1. If it's already a Date object (Excel often returns this)
        if (value instanceof Date && !isNaN(value.getTime())) {
            day = value.getDate();
            month = value.getMonth() + 1;
            year = value.getFullYear();

            // If Excel date is 1900-2100, it's likely already AD
            // But if it's > 2400, it's BE
            if (year > 2400) {
                const yearAD = year - 543;
                return {
                    formatted: `${yearAD}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
                    originalYear: year,
                    convertedYear: yearAD,
                    isValid: true
                };
            }
            return {
                formatted: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
                originalYear: year + 543,
                convertedYear: year,
                isValid: true
            };
        }

        // 2. If it's a string, support multiple separators: /, -, .
        const dateStr = String(value).trim();
        const match = dateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);

        if (match) {
            day = parseInt(match[1], 10);
            month = parseInt(match[2], 10);
            let yearValue = parseInt(match[3], 10);

            let yearBE = yearValue;
            let yearAD = yearValue;

            if (yearValue > 2400) {
                // It's definitely BE
                yearAD = yearValue - 543;
            } else if (yearValue < 2100) {
                // It's already AD
                yearBE = yearValue + 543;
            }

            // Simple validation
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                const formatted = `${yearAD}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                return { formatted, originalYear: yearBE, convertedYear: yearAD, isValid: true };
            }
        }

        return { formatted: '', originalYear: 0, convertedYear: 0, isValid: false };
    };

    // Extract department from header (first row might have department name)
    const extractDepartment = (value: unknown): string => {
        if (typeof value === 'string' && value.startsWith('ฝ่าย')) {
            return value;
        }
        return '';
    };

    // Process Excel file
    const processFile = useCallback(async (selectedFile: File) => {
        setLoading(true);
        setPreviewData([]);
        setImportResult(null);

        try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            // Get first sheet
            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
                toastr.error('ไฟล์ไม่มีข้อมูล');
                setLoading(false);
                return;
            }

            // Convert worksheet to array of arrays
            const rawData: unknown[][] = [];
            worksheet.eachRow((row, rowNumber) => {
                const rowValues: unknown[] = [];
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    rowValues[colNumber - 1] = cell.value;
                });
                rawData[rowNumber - 1] = rowValues;
            });

            if (rawData.length < 2) {
                toastr.error('ไฟล์ไม่มีข้อมูล');
                setLoading(false);
                return;
            }

            // Find header row (look for 'ชื่อ' column)
            let headerRowIndex = 0;
            let currentDepartment = '';
            let currentSection = '';

            for (let i = 0; i < rawData.length; i++) {
                const row = rawData[i];
                if (row && Array.isArray(row)) {
                    // Check if any cell in this row has department or section info before headers
                    const possibleHeader = row.find(cell => String(cell || '').trim().startsWith('ฝ่าย'));
                    if (possibleHeader) {
                        currentDepartment = String(possibleHeader).trim();
                    }
                    const possibleSection = row.find(cell => String(cell || '').trim().startsWith('แผนก'));
                    if (possibleSection) {
                        currentSection = String(possibleSection).trim();
                    }

                    // Check if this is the header row
                    if (row.some(cell => String(cell).includes('ชื่อ'))) {
                        headerRowIndex = i;
                        break;
                    }
                }
            }

            const headers = rawData[headerRowIndex] as string[];
            const nameIndex = headers.findIndex(h => String(h).includes('ชื่อ'));
            const positionIndex = headers.findIndex(h => String(h).includes('ตำแหน่ง'));
            const dateIndex = headers.findIndex(h => String(h).includes('วันที่เข้างาน'));
            const sectionColIndex = headers.findIndex(h => String(h).includes('แผนก'));

            if (nameIndex === -1 || dateIndex === -1) {
                toastr.error('ไม่พบคอลัมน์ชื่อหรือวันที่เข้างาน');
                setLoading(false);
                return;
            }

            const preview: PreviewUser[] = [];
            let departmentFromData = currentDepartment;
            let sectionFromData = currentSection;

            // Build lookup map from allDepartments
            const sectionToDeptMap = new Map<string, { deptName: string; deptCode: string }>();
            allDepartments.forEach(dept => {
                dept.sections?.forEach((sec: any) => {
                    const secName = sec.name.trim();
                    const info = { deptName: dept.name, deptCode: dept.code };

                    // Add variations
                    sectionToDeptMap.set(secName, info);
                    sectionToDeptMap.set(secName.toLowerCase(), info);

                    // Variations with "แผนก"
                    const withPrefix = secName.startsWith('แผนก') ? secName : `แผนก${secName}`;
                    const withoutPrefix = secName.startsWith('แผนก') ? secName.substring(4).trim() : secName;

                    sectionToDeptMap.set(withPrefix, info);
                    sectionToDeptMap.set(withPrefix.toLowerCase(), info);
                    sectionToDeptMap.set(withoutPrefix, info);
                    sectionToDeptMap.set(withoutPrefix.toLowerCase(), info);

                    // Variations with/without spaces
                    sectionToDeptMap.set(withPrefix.replace(/\s+/g, ''), info);
                    sectionToDeptMap.set(withoutPrefix.replace(/\s+/g, ''), info);
                });
            });

            for (let i = headerRowIndex + 1; i < rawData.length; i++) {
                const row = rawData[i] as unknown[];
                if (!row || row.length === 0) continue;

                // Check for hierarchical headers in the name column (as seen in user image)
                const nameValueRaw = String(row[nameIndex] || '').trim();

                if (nameValueRaw.startsWith('ฝ่าย')) {
                    departmentFromData = nameValueRaw;
                    sectionFromData = ''; // Reset section when new department starts
                    continue;
                }

                if (nameValueRaw.startsWith('แผนก')) {
                    sectionFromData = nameValueRaw;
                    continue;
                }

                const positionValue = String(row[positionIndex] || '').trim();
                const dateRaw = row[dateIndex];
                const dateValueStr = String(dateRaw || '').trim();

                // If there's a specific 'Section' column, prioritize it
                let finalSection = sectionFromData;
                if (sectionColIndex !== -1) {
                    const colSectionValue = String(row[sectionColIndex] || '').trim();
                    if (colSectionValue) finalSection = colSectionValue;
                }

                // LOGIC: Check database structure (frontend cache) to find correct department for this section
                let resolvedDepartment = departmentFromData;
                if (finalSection) {
                    const searchKey = finalSection.trim();
                    const dbMatch = sectionToDeptMap.get(searchKey) ||
                        sectionToDeptMap.get(searchKey.toLowerCase()) ||
                        sectionToDeptMap.get(searchKey.replace(/\s+/g, '')) ||
                        sectionToDeptMap.get(searchKey.toLowerCase().replace(/\s+/g, ''));

                    if (dbMatch) {
                        resolvedDepartment = dbMatch.deptName;
                    } else {
                        // Try partial match if no exact match
                        for (const [key, info] of sectionToDeptMap.entries()) {
                            if (key.length > 3 && (searchKey.includes(key) || key.includes(searchKey))) {
                                resolvedDepartment = info.deptName;
                                break;
                            }
                        }
                    }
                }

                if (!nameValueRaw || !nameValueRaw.match(/^\d/)) continue; // Skip if no employee ID

                const { employeeId, firstName, lastName, gender } = parseName(nameValueRaw);
                const dateResult = convertBEtoAD(dateRaw);
                const genderLabel = gender === 'male' ? 'ชาย' : gender === 'female' ? 'หญิง' : '-';

                const errors: string[] = [];

                if (!employeeId) errors.push('ไม่พบรหัสพนักงาน');
                if (!firstName) errors.push('ไม่พบชื่อ');
                if (!dateResult.isValid) errors.push('รูปแบบวันที่ไม่ถูกต้อง');

                preview.push({
                    rowNumber: i + 1,
                    employeeId,
                    firstName,
                    lastName,
                    gender,
                    genderLabel,
                    position: positionValue,
                    startDate: dateResult.formatted,
                    startDateFormatted: dateResult.isValid
                        ? `${dateValueStr} → ${dateResult.formatted}`
                        : dateValueStr,
                    originalYear: dateResult.originalYear,
                    convertedYear: dateResult.convertedYear,
                    department: resolvedDepartment,
                    section: finalSection,
                    employeeType: employeeType, // Add selected employee type
                    isValid: errors.length === 0,
                    errors,
                });
            }

            setPreviewData(preview);

            if (preview.length === 0) {
                toastr.warning('ไม่พบข้อมูลที่สามารถนำเข้าได้');
            } else {
                const validCount = preview.filter(p => p.isValid).length;
                toastr.success(`พบข้อมูล ${preview.length} รายการ (สามารถนำเข้าได้ ${validCount} รายการ)`);
            }
        } catch (error) {
            console.error('Error processing file:', error);
            toastr.error('เกิดข้อผิดพลาดในการอ่านไฟล์');
        } finally {
            setLoading(false);
        }
    }, [toastr, allDepartments, employeeType]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            processFile(selectedFile);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
            setFile(droppedFile);
            processFile(droppedFile);
        } else {
            toastr.error('กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls)');
        }
    };

    const handleClear = () => {
        setFile(null);
        setPreviewData([]);
        setImportResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleImport = async () => {
        const validData = previewData.filter(p => p.isValid);

        if (validData.length === 0) {
            toastr.error('ไม่มีข้อมูลที่สามารถนำเข้าได้');
            return;
        }

        if (!selectedCompany) {
            toastr.error('กรุณาเลือกบริษัท');
            return;
        }

        setImporting(true);
        setImportProgress(0);
        setImportResult({ success: 0, failed: 0, errors: [] });

        const chunkSize = 50;
        const totalUsers = validData.length;
        let successCount = 0;
        let failedCount = 0;
        let allErrors: { row: number; message: string }[] = [];

        try {
            for (let i = 0; i < totalUsers; i += chunkSize) {
                const chunk = validData.slice(i, i + chunkSize).map(u => ({
                    ...u,
                    employeeType: u.employeeType || employeeType
                }));

                const response = await fetch('/api/admin/users/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ users: chunk, company: selectedCompany }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
                }

                successCount += result.success;
                failedCount += result.failed;
                allErrors = [...allErrors, ...result.errors];

                const progress = Math.min(Math.round(((i + chunk.length) / totalUsers) * 100), 100);
                setImportProgress(progress);

                setImportResult({
                    success: successCount,
                    failed: failedCount,
                    errors: allErrors
                });
            }

            if (successCount > 0) {
                toastr.success(`นำเข้าข้อมูลสำเร็จ ${successCount} รายการ`);
            }

            if (failedCount > 0) {
                toastr.warning(`นำเข้าไม่สำเร็จ ${failedCount} รายการ`);
            }
        } catch (error: any) {
            console.error('Import error:', error);
            toastr.error(error.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
        } finally {
            setImporting(false);
        }
    };

    const validCount = previewData.filter(p => p.isValid).length;
    const invalidCount = previewData.filter(p => !p.isValid).length;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <IconButton
                            onClick={() => router.push('/admin/users')}
                            sx={{
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                            }}
                        >
                            <ArrowLeft size={20} color={theme.palette.primary.main} />
                        </IconButton>
                        <Avatar
                            sx={{
                                width: 48,
                                height: 48,
                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                color: 'success.main',
                            }}
                        >
                            <DocumentUpload size={24} color={theme.palette.success.main} variant="Bold" />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" component="h1" fontWeight={700}>
                                นำเข้าผู้ใช้งานจาก Excel
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                อัปโหลดไฟล์ Excel เพื่อนำเข้าข้อมูลพนักงานจำนวนมาก
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<DocumentDownload size={18} color={theme.palette.primary.main} />}
                    onClick={() => window.open('/api/admin/users/import/template', '_blank')}
                    sx={{
                        borderRadius: 1,
                        px: 3,
                        py: 1.25,
                    }}
                >
                    ตัวอย่าง Template
                </Button>
            </Box>

            {/* Selection Area: Company & Employee Type */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
                {/* Company Selector */}
                <Paper
                    sx={{
                        p: 3,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        height: '100%',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar
                            sx={{
                                width: 40,
                                height: 40,
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                            }}
                        >
                            <Building size={20} color={theme.palette.primary.main} variant="Bold" />
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                                เลือกบริษัท
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                เลือกบริษัทที่นำเข้าข้อมูล
                            </Typography>
                        </Box>
                    </Box>
                    <FormControl fullWidth size="small">
                        <InputLabel>บริษัท</InputLabel>
                        <Select
                            value={selectedCompany}
                            onChange={(e) => setSelectedCompany(e.target.value)}
                            label="บริษัท"
                            sx={{ borderRadius: 1 }}
                        >
                            {companies.map((company) => (
                                <MenuItem key={company.id} value={company.code}>
                                    {company.code} - {company.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Paper>

                {/* Employee Type Selector */}
                <Paper
                    sx={{
                        p: 3,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        height: '100%',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar
                            sx={{
                                width: 40,
                                height: 40,
                                bgcolor: alpha(theme.palette.info.main, 0.1),
                            }}
                        >
                            <People size={20} color={theme.palette.info.main} variant="Bold" />
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                                ประเภทพนักงาน
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                รายเดือน หรือ รายวัน
                            </Typography>
                        </Box>
                    </Box>
                    <FormControl fullWidth size="small">
                        <InputLabel>ประเภทพนักงาน</InputLabel>
                        <Select
                            value={employeeType}
                            onChange={(e) => setEmployeeType(e.target.value)}
                            label="ประเภทพนักงาน"
                            sx={{ borderRadius: 1 }}
                        >
                            <MenuItem value="monthly">พนักงานรายเดือน (Monthly)</MenuItem>
                            <MenuItem value="daily">พนักงานรายวัน (Daily)</MenuItem>
                        </Select>
                    </FormControl>
                </Paper>
            </Box>

            {/* Upload Area */}
            <Paper
                sx={{
                    p: 4,
                    mb: 3,
                    borderRadius: 1,
                    border: '2px dashed',
                    borderColor: dragOver ? 'primary.main' : 'divider',
                    bgcolor: dragOver ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    textAlign: 'center',
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />

                <Avatar
                    sx={{
                        width: 80,
                        height: 80,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        mx: 'auto',
                        mb: 2,
                    }}
                >
                    <DocumentUpload size={40} color={theme.palette.primary.main} variant="Bold" />
                </Avatar>

                <Typography variant="h6" fontWeight={600} gutterBottom>
                    ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    รองรับไฟล์ .xlsx และ .xls
                </Typography>

                {file && (
                    <Chip
                        icon={<TickCircle size={16} color="#fff" variant="Bold" />}
                        label={file.name}
                        color="success"
                        sx={{ mt: 2 }}
                        onDelete={handleClear}
                        deleteIcon={<CloseCircle size={16} color={theme.palette.error.main} />}
                    />
                )}

                {loading && (
                    <Box sx={{ mt: 2 }}>
                        <CircularProgress size={24} />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            กำลังอ่านไฟล์...
                        </Typography>
                    </Box>
                )}
            </Paper>

            {/* Preview Data */}
            {previewData.length > 0 && (
                <>
                    {/* Summary Cards */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                        <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Avatar sx={{ width: 56, height: 56, bgcolor: alpha(theme.palette.primary.main, 0.1), mx: 'auto', mb: 1 }}>
                                    <People size={28} color={theme.palette.primary.main} variant="Bold" />
                                </Avatar>
                                <Typography variant="h4" fontWeight={700} color="primary.main">
                                    {previewData.length}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    ข้อมูลทั้งหมด
                                </Typography>
                            </CardContent>
                        </Card>

                        <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Avatar sx={{ width: 56, height: 56, bgcolor: alpha(theme.palette.success.main, 0.1), mx: 'auto', mb: 1 }}>
                                    <TickCircle size={28} color={theme.palette.success.main} variant="Bold" />
                                </Avatar>
                                <Typography variant="h4" fontWeight={700} color="success.main">
                                    {validCount}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    พร้อมนำเข้า
                                </Typography>
                            </CardContent>
                        </Card>

                        <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Avatar sx={{ width: 56, height: 56, bgcolor: alpha(theme.palette.error.main, 0.1), mx: 'auto', mb: 1 }}>
                                    <Warning2 size={28} color={theme.palette.error.main} variant="Bold" />
                                </Avatar>
                                <Typography variant="h4" fontWeight={700} color="error.main">
                                    {invalidCount}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    มีปัญหา
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Import Actions */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'flex-end' }}>
                        <Button
                            variant="outlined"
                            startIcon={<Trash size={18} color={theme.palette.error.main} />}
                            onClick={handleClear}
                            disabled={importing}
                            sx={{
                                color: theme.palette.error.main,
                                borderColor: theme.palette.error.main,
                            }}
                        >
                            ล้างข้อมูล
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={importing ? <CircularProgress size={18} color="inherit" /> : <DocumentUpload size={18} color="#fff" />}
                            onClick={handleImport}
                            disabled={importing || validCount === 0}
                            sx={{
                                boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`,
                            }}
                        >
                            {importing ? 'กำลังนำเข้า...' : `นำเข้า ${validCount} รายการ`}
                        </Button>
                    </Box>

                    {/* Progress */}
                    {importing && (
                        <Box sx={{ mb: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" color="primary" fontWeight={600}>
                                    กำลังนำเข้าข้อมูล...
                                </Typography>
                                <Typography variant="body2" color="primary" fontWeight={600}>
                                    {importProgress}%
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={importProgress}
                                sx={{
                                    height: 10,
                                    borderRadius: 5,
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 5,
                                    }
                                }}
                            />
                        </Box>
                    )}

                    {/* Import Result */}
                    {importResult && (
                        <Alert
                            severity={importResult.failed === 0 ? 'success' : 'warning'}
                            sx={{ mb: 3, borderRadius: 1 }}
                        >
                            <AlertTitle>ผลการนำเข้าข้อมูล</AlertTitle>
                            <Typography>
                                นำเข้าสำเร็จ: <strong>{importResult.success}</strong> รายการ |
                                ไม่สำเร็จ: <strong>{importResult.failed}</strong> รายการ
                            </Typography>
                            {importResult.errors.length > 0 && (
                                <Box component="ul" sx={{ m: 0, mt: 1, pl: 2 }}>
                                    {importResult.errors.slice(0, 5).map((err, idx) => (
                                        <li key={idx}>แถวที่ {err.row}: {err.message}</li>
                                    ))}
                                    {importResult.errors.length > 5 && (
                                        <li>... และอีก {importResult.errors.length - 5} รายการ</li>
                                    )}
                                </Box>
                            )}
                        </Alert>
                    )}

                    {/* Data Table */}
                    <Paper sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider', overflow: 'hidden', mb: 5 }}>
                        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.03), borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight={600}>
                                ตัวอย่างข้อมูล
                            </Typography>
                        </Box>
                        <TableContainer sx={{ maxHeight: '700px' }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>แถวใน Excel</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>รหัสพนักงาน</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>ชื่อ</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>นามสกุล</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>เพศ</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>ตำแหน่ง</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>ฝ่าย</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>แผนก</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>วันที่เข้างาน</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }} align="center">สถานะ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {previewData.map((row, index) => (
                                        <TableRow
                                            key={index}
                                            sx={{
                                                bgcolor: !row.isValid ? alpha(theme.palette.error.main, 0.05) : 'inherit',
                                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) }
                                            }}
                                        >
                                            <TableCell>{row.rowNumber}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {row.employeeId || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{row.firstName || '-'}</TableCell>
                                            <TableCell>{row.lastName || '-'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={row.genderLabel}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{
                                                        fontWeight: 500,
                                                        color: row.gender === 'male' ? '#1976d2' : row.gender === 'female' ? '#e91e63' : 'text.secondary',
                                                        borderColor: row.gender === 'male' ? '#1976d2' : row.gender === 'female' ? '#e91e63' : 'divider',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {row.position || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {row.department || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {row.section || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box>
                                                    <Typography variant="body2">
                                                        {row.startDate || '-'}
                                                    </Typography>
                                                    {row.isValid && row.originalYear > 0 && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            พ.ศ. {row.originalYear} → ค.ศ. {row.convertedYear}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center">
                                                {row.isValid ? (
                                                    <Chip
                                                        icon={<TickCircle size={14} variant="Bold" color="#00B894" />}
                                                        label="พร้อม"
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                        sx={{ fontWeight: 500 }}
                                                    />
                                                ) : (
                                                    <Tooltip title={row.errors.join(', ')}>
                                                        <Chip
                                                            icon={<Warning2 size={14} variant="Bold" color="#FF0000" />}
                                                            label="มีปัญหา"
                                                            size="small"
                                                            color="error"
                                                            variant="outlined"
                                                            sx={{ fontWeight: 500 }}
                                                        />
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>


                </>
            )}
        </Box>
    );
}
