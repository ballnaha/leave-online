'use client';
import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    InputAdornment,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    CircularProgress,
    Skeleton,
} from '@mui/material';
import { Building2, User, Hash, Briefcase, Calendar, UserPlus, ChevronDown, Check, X, Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToastr } from '@/app/components/Toastr';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import 'dayjs/locale/en';
import { useLocale } from '@/app/providers/LocaleProvider';

interface Company {
    id: number;
    code: string;
    name: string;
}

interface Department {
    id: number;
    code: string;
    name: string;
    company: string;
}

interface Section {
    id: number;
    code: string;
    name: string;
    departmentId: number;
}

interface DrawerOption {
    value: string;
    label: string;
}

export default function RegisterPage() {
    const router = useRouter();
    const toastr = useToastr();
    const { data: session, status } = useSession();
    const { locale } = useLocale();

    // Redirect to home if already logged in
    useEffect(() => {
        if (status === 'authenticated') {
            router.push('/');
            router.refresh();
        }
    }, [status, router]);
    
    const [formData, setFormData] = useState({
        company: '',
        employeeType: '',
        firstName: '',
        lastName: '',
        gender: '',
        employeeId: '',
        position: '',
        departmentId: '',
        sectionId: '',
        shift: '',
        startDate: '',
        password: '',
        confirmPassword: '',
    });

    // Data from API
    const [companies, setCompanies] = useState<Company[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [sections, setSections] = useState<Section[]>([]);

    // Loading states for data
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [loadingDepartments, setLoadingDepartments] = useState(false);
    const [loadingSections, setLoadingSections] = useState(false);

    // Loading state
    const [isLoading, setIsLoading] = useState(false);

    // Password visibility states
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Drawer states
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerType, setDrawerType] = useState<'department' | 'section' | 'shift' | null>(null);
    const [drawerTitle, setDrawerTitle] = useState('');
    const [drawerOptions, setDrawerOptions] = useState<DrawerOption[]>([]);

    // Fetch companies on mount
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const res = await fetch('/api/companies');
                if (!res.ok) throw new Error('Failed to fetch companies');
                const data = await res.json();
                setCompanies(data);
            } catch (err) {
                console.error('Error fetching companies:', err);
            } finally {
                setLoadingCompanies(false);
            }
        };
        fetchCompanies();
    }, []);

    // Fetch departments when company changes
    useEffect(() => {
        if (!formData.company) {
            setDepartments([]);
            return;
        }

        const fetchDepartments = async () => {
            setLoadingDepartments(true);
            try {
                const res = await fetch(`/api/departments?company=${formData.company}`);
                if (!res.ok) throw new Error('Failed to fetch departments');
                const data = await res.json();
                setDepartments(data);
            } catch (err) {
                console.error('Error fetching departments:', err);
            } finally {
                setLoadingDepartments(false);
            }
        };
        fetchDepartments();

        // Reset department and section when company changes
        setFormData(prev => ({ ...prev, departmentId: '', sectionId: '' }));
        setSections([]);
    }, [formData.company]);

    // Fetch sections when department changes
    useEffect(() => {
        if (!formData.departmentId) {
            setSections([]);
            return;
        }

        const fetchSections = async () => {
            setLoadingSections(true);
            try {
                const res = await fetch(`/api/sections?departmentId=${formData.departmentId}`);
                if (!res.ok) throw new Error('Failed to fetch sections');
                const data = await res.json();
                setSections(data);
            } catch (err) {
                console.error('Error fetching sections:', err);
            } finally {
                setLoadingSections(false);
            }
        };
        fetchSections();

        // Reset section when department changes
        setFormData(prev => ({ ...prev, sectionId: '' }));
    }, [formData.departmentId]);

    const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [field]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate company
        if (!formData.company) {
            toastr.warning('กรุณาเลือกบริษัท');
            return;
        }

        // Validate employee type
        if (!formData.employeeType) {
            toastr.warning('กรุณาเลือกประเภทพนักงาน');
            return;
        }

        // Validate first name
        if (!formData.firstName.trim()) {
            toastr.warning('กรุณากรอกชื่อ');
            return;
        }

        // Validate last name
        if (!formData.lastName.trim()) {
            toastr.warning('กรุณากรอกนามสกุล');
            return;
        }

        // Validate gender
        if (!formData.gender) {
            toastr.warning('กรุณาเลือกเพศ');
            return;
        }

        // Validate employee ID
        if (!formData.employeeId.trim()) {
            toastr.warning('กรุณากรอกรหัสพนักงาน');
            return;
        }

        // Validate department
        if (!formData.departmentId) {
            toastr.warning('กรุณาเลือกฝ่าย');
            return;
        }

        // Validate start date
        if (!formData.startDate) {
            toastr.warning('กรุณาเลือกวันที่เริ่มงาน');
            return;
        }

        // Validate password
        if (!formData.password) {
            toastr.warning('กรุณากรอกรหัสผ่าน');
            return;
        }

        // Validate password length
        if (formData.password.length < 6) {
            toastr.warning('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            toastr.error('รหัสผ่านไม่ตรงกัน');
            return;
        }

        setIsLoading(true);

        // Get department and section codes for storing
        const selectedDepartment = departments.find(d => d.id === parseInt(formData.departmentId));
        const selectedSection = sections.find(s => s.id === parseInt(formData.sectionId));

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    company: formData.company,
                    employeeType: formData.employeeType,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    gender: formData.gender,
                    employeeId: formData.employeeId,
                    position: formData.position || null,
                    department: selectedDepartment?.code || '',
                    section: selectedSection?.code || null,
                    shift: formData.shift || null,
                    startDate: formData.startDate,
                    password: formData.password,
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({ error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' }));
                throw new Error(data.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
            }

            toastr.success('สมัครสมาชิกสำเร็จ! กำลังไปยังหน้าเข้าสู่ระบบ...');
            // Redirect to login after 2 seconds
            setTimeout(() => {
                router.push('/login');
            }, 2000);

        } catch (err) {
            toastr.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
        } finally {
            setIsLoading(false);
        }
    };

    const openDrawer = (type: 'department' | 'section' | 'shift', title: string, options: DrawerOption[]) => {
        setDrawerType(type);
        setDrawerTitle(title);
        setDrawerOptions(options);
        setDrawerOpen(true);
    };

    const handleDrawerSelect = (value: string) => {
        if (drawerType === 'department') {
            setFormData({ ...formData, departmentId: value, sectionId: '' });
        } else if (drawerType === 'section') {
            setFormData({ ...formData, sectionId: value });
        } else if (drawerType === 'shift') {
            setFormData({ ...formData, shift: value });
        }
        setDrawerOpen(false);
    };

    const employeeTypes = [
        { value: 'daily', label: 'รายวัน' },
        { value: 'monthly', label: 'รายเดือน' },
    ];

    const shifts = [
        { value: '', label: 'ไม่มีกะ' },
        { value: 'morning', label: 'กะเช้า' },
        { value: 'night', label: 'กะดึก' },
    ];

    // Convert API data to drawer options
    const departmentOptions: DrawerOption[] = departments.map(d => ({ value: d.id.toString(), label: d.name }));
    const sectionOptions: DrawerOption[] = sections.map(s => ({ value: s.id.toString(), label: s.name }));
    const shiftOptions: DrawerOption[] = shifts.map(s => ({ value: s.value, label: s.label }));

    const getSelectedDepartmentName = () => {
        const dept = departments.find(d => d.id === parseInt(formData.departmentId));
        return dept?.name || '';
    };

    const getSelectedSectionName = () => {
        const sec = sections.find(s => s.id === parseInt(formData.sectionId));
        return sec?.name || '';
    };

    const getSelectedShiftLabel = () => {
        const shift = shifts.find(s => s.value === formData.shift);
        return shift?.label || '';
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#fafbfc',
                position: 'relative',
                '&::before': {
                    content: '""',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `
                        radial-gradient(circle at 20% 20%, rgba(27, 25, 75, 0.03) 0%, transparent 50%),
                        radial-gradient(circle at 80% 80%, rgba(99, 102, 241, 0.04) 0%, transparent 50%),
                        radial-gradient(circle at 40% 60%, rgba(139, 92, 246, 0.02) 0%, transparent 40%)
                    `,
                    pointerEvents: 'none',
                    zIndex: 0,
                },
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #1b194b 0%, #2d2a6e 50%, #3730a3 100%)',
                    pt: 5,
                    pb: 4,
                    px: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    zIndex: 1,
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: -80,
                        right: -80,
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.08)',
                    },
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: -60,
                        left: -60,
                        width: 160,
                        height: 160,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.05)',
                    },
                }}
            >
                <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                    
                    <Typography
                        variant="h5"
                        sx={{
                            color: 'white',
                            fontWeight: 700,
                            mb: 0.5,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        สร้างบัญชี
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            color: 'rgba(255, 255, 255, 0.75)',
                            fontWeight: 400,
                        }}
                    >
                        สมัครสมาชิกเพื่อเริ่มใช้งาน
                    </Typography>
                </Box>
            </Box>

            {/* Register Form */}
            <Box 
                component="form" 
                onSubmit={handleSubmit}
                sx={{ 
                    flex: 1, 
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'auto',
                    position: 'relative',
                    zIndex: 1,
                    mt: -2,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    bgcolor: '#fafbfc',
                    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)',
                }}
            >
                {/* Company Selection Section */}
                <Box sx={{ px: 2, pt: 3, pb: 0 }}>
                    <Box sx={{ 
                        bgcolor: 'white', 
                        borderRadius: 1, 
                        p: 1.5,
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #f0f0f0',
                    }}>
                        <Typography component="div" variant="body2" sx={{ fontWeight: 600, mb: 2, color: '#1b194b', display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.875rem' }}>
                            <Box sx={{ 
                                width: 28, 
                                height: 28, 
                                borderRadius: 1.5, 
                                bgcolor: 'rgba(27, 25, 75, 0.08)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center' 
                            }}>
                                <Building2 size={15} strokeWidth={2.5} color="#1b194b" />
                            </Box>
                            เลือกบริษัท
                        </Typography>
                    {loadingCompanies ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2.5 }} />
                            <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2.5 }} />
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {companies.map((company) => (
                                <Box
                                    key={company.code}
                                    onClick={() => setFormData({ ...formData, company: company.code })}
                                    sx={{
                                        py: 1.25,
                                        px: 1.5,
                                        cursor: 'pointer',
                                        border: formData.company === company.code 
                                            ? '1.5px solid #1b194b' 
                                            : '1px solid #e5e7eb',
                                        borderRadius: 2.5,
                                        bgcolor: formData.company === company.code 
                                            ? 'rgba(27, 25, 75, 0.04)' 
                                            : 'white',
                                        transition: 'all 0.15s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.25,
                                        boxShadow: formData.company === company.code 
                                            ? '0 2px 8px rgba(27, 25, 75, 0.08)' 
                                            : 'none',
                                        '&:hover': {
                                            borderColor: '#1b194b',
                                            bgcolor: 'rgba(27, 25, 75, 0.02)',
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: '50%',
                                            border: formData.company === company.code 
                                                ? '4px solid #1b194b' 
                                                : '1.5px solid #d1d5db',
                                            transition: 'all 0.15s ease',
                                            flexShrink: 0,
                                        }}
                                    />
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            fontWeight: formData.company === company.code ? 600 : 500,
                                            color: formData.company === company.code ? '#1b194b' : '#6b7280',
                                            fontSize: '0.8125rem',
                                        }}
                                    >
                                        {company.name}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>

                {/* Employee Type Section */}
                <Box sx={{ px: 2, py: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5, color: '#374151', display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.8125rem' }}>
                        <Briefcase size={16} strokeWidth={2.5} />
                        ประเภทพนักงาน
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        {employeeTypes.map((type) => (
                            <Box
                                key={type.value}
                                onClick={() => setFormData({ ...formData, employeeType: type.value })}
                                sx={{
                                    flex: 1,
                                    py: 1.25,
                                    px: 1.5,
                                    cursor: 'pointer',
                                    border: formData.employeeType === type.value 
                                        ? '1.5px solid #1b194b' 
                                        : '1px solid #e5e7eb',
                                    borderRadius: 2.5,
                                    bgcolor: formData.employeeType === type.value 
                                        ? 'rgba(27, 25, 75, 0.04)' 
                                        : 'white',
                                    transition: 'all 0.15s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 0.75,
                                    boxShadow: formData.employeeType === type.value 
                                        ? '0 2px 8px rgba(27, 25, 75, 0.08)' 
                                        : 'none',
                                    '&:hover': {
                                        borderColor: '#1b194b',
                                        bgcolor: 'rgba(27, 25, 75, 0.02)',
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: '50%',
                                        border: formData.employeeType === type.value 
                                            ? '4px solid #1b194b' 
                                            : '1.5px solid #d1d5db',
                                        transition: 'all 0.15s ease',
                                    }}
                                />
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        fontWeight: formData.employeeType === type.value ? 600 : 500,
                                        color: formData.employeeType === type.value ? '#1b194b' : '#6b7280',
                                        fontSize: '0.8125rem',
                                    }}
                                >
                                    {type.label}
                                </Typography>
                            </Box>
                        ))}
                        </Box>
                    </Box>
                </Box>

                {/* Personal Information Section */}
                <Box sx={{ px: 2, pt: 2, pb: 0 }}>
                    <Box sx={{ 
                        bgcolor: 'white', 
                        borderRadius: 1, 
                        p: 1.5,
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #f0f0f0',
                    }}>
                        <Typography component="div" variant="body2" sx={{ fontWeight: 600, mb: 2, color: '#1b194b', display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.875rem' }}>
                            <Box sx={{ 
                                width: 28, 
                                height: 28, 
                                borderRadius: 1.5, 
                                bgcolor: 'rgba(27, 25, 75, 0.08)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center' 
                            }}>
                                <User size={15} strokeWidth={2.5} color="#1b194b" />
                            </Box>
                            ข้อมูลส่วนตัว
                        </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                        <TextField
                            id="register-firstName"
                            fullWidth
                            label="ชื่อ"
                            value={formData.firstName}
                            onChange={handleChange('firstName')}
                            placeholder="ชื่อ"
                            size="small"
                            sx={{ 
                                bgcolor: '#f8fafc',
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: '#e5e7eb' },
                                    '&:hover fieldset': { borderColor: '#1b194b' },
                                },
                            }}
                        />
                        <TextField
                            id="register-lastName"
                            fullWidth
                            label="นามสกุล"
                            value={formData.lastName}
                            onChange={handleChange('lastName')}
                            placeholder="นามสกุล"
                            size="small"
                            sx={{ 
                                bgcolor: '#f8fafc',
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: '#e5e7eb' },
                                    '&:hover fieldset': { borderColor: '#1b194b' },
                                },
                            }}
                        />
                    </Box>

                    {/* Gender Selection */}
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: '#6b7280', fontSize: '0.8125rem' }}>
                            เพศ
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            {[
                                { value: 'male', label: 'ชาย' },
                                { value: 'female', label: 'หญิง' },
                            ].map((genderOption) => (
                                <Box
                                    key={genderOption.value}
                                    onClick={() => setFormData({ ...formData, gender: genderOption.value })}
                                    sx={{
                                        flex: 1,
                                        py: 1.25,
                                        px: 1.5,
                                        cursor: 'pointer',
                                        border: formData.gender === genderOption.value 
                                            ? '1.5px solid #1b194b' 
                                            : '1px solid #e5e7eb',
                                        borderRadius: 2.5,
                                        bgcolor: formData.gender === genderOption.value 
                                            ? 'rgba(27, 25, 75, 0.06)' 
                                            : '#f8fafc',
                                        transition: 'all 0.15s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 0.75,
                                        boxShadow: formData.gender === genderOption.value 
                                            ? '0 2px 8px rgba(27, 25, 75, 0.08)' 
                                            : 'none',
                                        '&:hover': {
                                            borderColor: '#1b194b',
                                            bgcolor: 'rgba(27, 25, 75, 0.02)',
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 14,
                                            height: 14,
                                            borderRadius: '50%',
                                            border: formData.gender === genderOption.value 
                                                ? '4px solid #1b194b' 
                                                : '1.5px solid #d1d5db',
                                            transition: 'all 0.15s ease',
                                        }}
                                    />
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            fontWeight: formData.gender === genderOption.value ? 600 : 500,
                                            color: formData.gender === genderOption.value ? '#1b194b' : '#6b7280',
                                            fontSize: '0.8125rem',
                                        }}
                                    >
                                        {genderOption.label}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    <TextField
                        id="register-employeeId"
                        fullWidth
                        label="รหัสพนักงาน"
                        value={formData.employeeId}
                        onChange={handleChange('employeeId')}
                        placeholder="รหัสพนักงาน"
                        sx={{ 
                            mb: 2, 
                            bgcolor: '#f8fafc',
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: '#e5e7eb' },
                                '&:hover fieldset': { borderColor: '#1b194b' },
                            },
                        }}
                        size="small"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Hash size={18} color="#1b194b" />
                                    </InputAdornment>
                                ),
                            }
                        }}
                    />

                    <TextField
                        id="register-position"
                        fullWidth
                        label="ตำแหน่ง"
                        value={formData.position}
                        onChange={handleChange('position')}
                        placeholder="ตำแหน่งงาน"
                        sx={{ 
                            mb: 2, 
                            bgcolor: '#f8fafc',
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: '#e5e7eb' },
                                '&:hover fieldset': { borderColor: '#1b194b' },
                            },
                        }}
                        size="small"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Briefcase size={18} color="#1b194b" />
                                    </InputAdornment>
                                ),
                            }
                        }}
                    />

                    {/* Department & Section - Bottom Drawer Selects */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                        <Box
                            onClick={() => formData.company && openDrawer('department', 'เลือกฝ่าย', departmentOptions)}
                            sx={{
                                flex: 1,
                                py: 1.25,
                                px: 1.5,
                                border: '1px solid #e5e7eb',
                                borderRadius: 2,
                                cursor: formData.company ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                bgcolor: formData.company ? '#f8fafc' : '#f1f5f9',
                                opacity: formData.company ? 1 : 0.6,
                                transition: 'all 0.15s ease',
                                '&:hover': {
                                    borderColor: formData.company ? '#1b194b' : '#e5e7eb',
                                    bgcolor: formData.company ? '#f1f5f9' : '#f1f5f9',
                                },
                            }}
                        >
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    color: formData.departmentId ? '#1f2937' : '#9ca3af',
                                    fontSize: '0.875rem',
                                }}
                            >
                                {loadingDepartments ? 'กำลังโหลด...' : (formData.departmentId ? getSelectedDepartmentName() : 'ฝ่าย')}
                            </Typography>
                            <ChevronDown size={16} color="#9ca3af" />
                        </Box>
                        <Box
                            onClick={() => formData.departmentId && openDrawer('section', 'เลือกแผนก', sectionOptions)}
                            sx={{
                                flex: 1,
                                py: 1.25,
                                px: 1.5,
                                border: '1px solid #e5e7eb',
                                borderRadius: 2,
                                cursor: formData.departmentId ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                bgcolor: formData.departmentId ? '#f8fafc' : '#f1f5f9',
                                opacity: formData.departmentId ? 1 : 0.6,
                                transition: 'all 0.15s ease',
                                '&:hover': {
                                    borderColor: formData.departmentId ? '#1b194b' : '#e5e7eb',
                                    bgcolor: formData.departmentId ? '#f1f5f9' : '#f1f5f9',
                                },
                            }}
                        >
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    color: formData.sectionId ? '#1f2937' : '#9ca3af',
                                    fontSize: '0.875rem',
                                }}
                            >
                                {loadingSections ? 'กำลังโหลด...' : (formData.sectionId ? getSelectedSectionName() : 'แผนก (ถ้ามี)')}
                            </Typography>
                            <ChevronDown size={16} color="#9ca3af" />
                        </Box>
                    </Box>

                    {/* Shift - Bottom Drawer Select */}
                    <Box
                        onClick={() => openDrawer('shift', 'เลือกกะ (ถ้ามี)', shiftOptions)}
                        sx={{
                            py: 1.25,
                            px: 1.5,
                            border: '1px solid #e5e7eb',
                            borderRadius: 2,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            bgcolor: '#f8fafc',
                            mb: 2,
                            transition: 'all 0.15s ease',
                            '&:hover': {
                                borderColor: '#1b194b',
                                bgcolor: '#f1f5f9',
                            },
                        }}
                    >
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                color: formData.shift ? '#1f2937' : '#9ca3af',
                                fontSize: '0.875rem',
                            }}
                        >
                            {formData.shift ? getSelectedShiftLabel() : 'กะ (ถ้ามี)'}
                        </Typography>
                        <ChevronDown size={16} color="#9ca3af" />
                    </Box>

                    {/* Start Date - MUI Date Picker */}
                    <Box sx={{ mb: 2 }}>
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
                            <DatePicker
                                label="วันที่เริ่มงาน"
                                value={formData.startDate ? dayjs(formData.startDate) : null}
                                onChange={(newValue) => {
                                    setFormData({ 
                                        ...formData, 
                                        startDate: newValue ? newValue.format('YYYY-MM-DD') : '' 
                                    });
                                }}
                                format="DD MMMM YYYY"
                                yearsOrder="desc"
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true,
                                        sx: {
                                            bgcolor: '#f8fafc',
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': { borderColor: '#e5e7eb' },
                                                '&:hover fieldset': { borderColor: '#1b194b' },
                                            },
                                        },
                                        InputProps: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Calendar size={18} color="#1b194b" />
                                                </InputAdornment>
                                            ),
                                        }
                                    },
                                }}
                            />
                        </LocalizationProvider>
                    </Box>
                    </Box>
                </Box>

                {/* Password Section */}
                <Box sx={{ px: 2, pt: 2, pb: 0 }}>
                    <Box sx={{ 
                        bgcolor: 'white', 
                        borderRadius: 1, 
                        p: 1.5,
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #f0f0f0',
                    }}>
                        <Typography component="div" variant="body2" sx={{ fontWeight: 600, mb: 2, color: '#1b194b', display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.875rem' }}>
                            <Box sx={{ 
                                width: 28, 
                                height: 28, 
                                borderRadius: 1.5, 
                                bgcolor: 'rgba(27, 25, 75, 0.08)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center' 
                            }}>
                                <Lock size={15} strokeWidth={2.5} color="#1b194b" />
                            </Box>
                            ตั้งรหัสผ่าน
                        </Typography>

                    {/* Password Field */}
                    <TextField
                        id="register-password"
                        fullWidth
                        label="รหัสผ่าน"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange('password')}
                        placeholder="••••••••"
                        sx={{ 
                            mb: 2, 
                            bgcolor: '#f8fafc',
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: '#e5e7eb' },
                                '&:hover fieldset': { borderColor: '#1b194b' },
                            },
                        }}
                        size="small"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Lock size={18} color="#1b194b" />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            size="small"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }
                        }}
                    />

                    {/* Confirm Password Field */}
                    <TextField
                        id="register-confirmPassword"
                        fullWidth
                        label="ยืนยันรหัสผ่าน"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleChange('confirmPassword')}
                        placeholder="••••••••"
                        size="small"
                        sx={{ 
                            bgcolor: '#f8fafc',
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: '#e5e7eb' },
                                '&:hover fieldset': { borderColor: '#1b194b' },
                            },
                        }}
                        error={formData.confirmPassword !== '' && formData.password !== formData.confirmPassword}
                        helperText={formData.confirmPassword !== '' && formData.password !== formData.confirmPassword ? 'รหัสผ่านไม่ตรงกัน' : ''}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Lock size={18} color="#1b194b" />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            edge="end"
                                            size="small"
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }
                        }}
                    />
                    </Box>
                </Box>

                {/* Submit Section */}
                <Box sx={{ px: 2, py: 3, mt: 'auto' }}>
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={isLoading}
                        startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <UserPlus size={18} />}
                        sx={{
                            py: 1.5,
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, #1b194b 0%, #2d2a6e 50%, #3730a3 100%)',
                            boxShadow: '0 4px 14px rgba(27, 25, 75, 0.25)',
                            fontWeight: 600,
                            fontSize: '0.9375rem',
                            color:'white',
                            textTransform: 'none',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #2d2a6e 0%, #3730a3 50%, #4338ca 100%)',
                                boxShadow: '0 6px 20px rgba(27, 25, 75, 0.35)',
                                transform: 'translateY(-1px)',
                                color:'white',
                            },
                            '&:disabled': {
                                background: 'linear-gradient(135deg, #1b194b 0%, #2d2a6e 100%)',
                                opacity: 0.6,
                                color: 'white',
                            },
                        }}
                    >
                        {isLoading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
                    </Button>

                    {/* Login Link */}
                    <Box sx={{ textAlign: 'center', mt: 2.5 }}>
                        <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.8125rem' }}>
                            มีบัญชีอยู่แล้ว?{' '}
                            <Link href="/login" style={{ textDecoration: 'none' }}>
                                <Typography
                                    component="span"
                                    variant="body2"
                                    sx={{ color: '#1b194b', fontWeight: 600, fontSize: '0.8125rem' }}
                                >
                                    เข้าสู่ระบบ
                                </Typography>
                            </Link>
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Bottom Drawer */}
            <Drawer
                anchor="bottom"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                PaperProps={{
                    sx: {
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                        maxHeight: '60vh',
                    }
                }}
            >
                {/* Drawer Handle */}
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 1 }}>
                    <Box sx={{ width: 40, height: 4, bgcolor: '#e0e0e0', borderRadius: 2 }} />
                </Box>
                
                {/* Drawer Header */}
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    px: 2, 
                    pb: 1.5,
                    borderBottom: '1px solid #f0f0f0',
                }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1b194b' }}>
                        {drawerTitle}
                    </Typography>
                    <Box 
                        onClick={() => setDrawerOpen(false)}
                        sx={{ 
                            cursor: 'pointer', 
                            p: 0.5,
                            borderRadius: '50%',
                            '&:hover': { bgcolor: '#f5f5f5' },
                        }}
                    >
                        <X size={20} color="#666" />
                    </Box>
                </Box>

                {/* Options List */}
                <List sx={{ py: 1 }}>
                    {drawerOptions.map((option) => {
                        let isSelected = false;
                        if (drawerType === 'department') {
                            isSelected = formData.departmentId === option.value;
                        } else if (drawerType === 'section') {
                            isSelected = formData.sectionId === option.value;
                        } else if (drawerType === 'shift') {
                            isSelected = formData.shift === option.value;
                        }
                        return (
                            <ListItem key={option.value} disablePadding>
                                <ListItemButton 
                                    onClick={() => handleDrawerSelect(option.value)}
                                    sx={{
                                        py: 1.5,
                                        px: 2,
                                        bgcolor: isSelected ? 'rgba(27, 25, 75, 0.04)' : 'transparent',
                                        '&:hover': {
                                            bgcolor: 'rgba(27, 25, 75, 0.06)',
                                        },
                                    }}
                                >
                                    <ListItemText 
                                        primary={option.label}
                                        primaryTypographyProps={{
                                            fontWeight: isSelected ? 600 : 400,
                                            color: isSelected ? '#1b194b' : '#333',
                                        }}
                                    />
                                    {isSelected && (
                                        <ListItemIcon sx={{ minWidth: 'auto' }}>
                                            <Check size={20} color="#1b194b" />
                                        </ListItemIcon>
                                    )}
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Drawer>
        </Box>
    );
}
