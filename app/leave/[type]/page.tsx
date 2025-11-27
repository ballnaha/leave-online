'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    IconButton,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Chip,
    Skeleton,
    Alert,
    InputAdornment,
    Dialog,
} from '@mui/material';
import { 
    ArrowLeft,
    Calendar,
    Clock,
    FileText,
    Upload,
    Phone,
    MapPin,
    User,
    Building2,
    Briefcase,
    Heart,
    Umbrella,
    HelpCircle,
    Send,
    Save,
    X,
    Paperclip,
    AlertCircle,
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToastr } from '@/app/components/Toastr';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

// สีหลักของระบบ
const PRIMARY_COLOR = '#1976d2';
const PRIMARY_LIGHT = '#e3f2fd';

// ประเภทการลา
const leaveTypes = {
    sick: {
        code: 'sick',
        name: 'ลาป่วย',
        nameEn: 'Sick Leave',
        icon: Heart,
        color: PRIMARY_COLOR,
        lightColor: PRIMARY_LIGHT,
        description: 'ลาป่วยตามใบรับรองแพทย์',
        maxDays: 30,
        requiresAttachment: true,
        attachmentNote: 'หากลาตั้งแต่ 3 วันขึ้นไป ต้องแนบใบรับรองแพทย์',
    },
    personal: {
        code: 'personal',
        name: 'ลากิจ',
        nameEn: 'Personal Leave',
        icon: Briefcase,
        color: PRIMARY_COLOR,
        lightColor: PRIMARY_LIGHT,
        description: 'ลาเพื่อกิจธุระส่วนตัว',
        maxDays: 7,
        requiresAttachment: false,
        attachmentNote: '',
    },
    vacation: {
        code: 'vacation',
        name: 'ลาพักร้อน',
        nameEn: 'Vacation Leave',
        icon: Umbrella,
        color: PRIMARY_COLOR,
        lightColor: PRIMARY_LIGHT,
        description: 'ลาพักผ่อนประจำปี',
        maxDays: 15,
        requiresAttachment: false,
        attachmentNote: '',
    },
    other: {
        code: 'other',
        name: 'ลาอื่นๆ',
        nameEn: 'Other Leave',
        icon: HelpCircle,
        color: PRIMARY_COLOR,
        lightColor: PRIMARY_LIGHT,
        description: 'ลาประเภทอื่นๆ เช่น ลาบวช, ลาคลอด',
        maxDays: null,
        requiresAttachment: true,
        attachmentNote: 'กรุณาแนบเอกสารประกอบการลา',
    },
};

type LeaveType = keyof typeof leaveTypes;

interface UserProfile {
    id: number;
    employeeId: string;
    email: string | null;
    firstName: string;
    lastName: string;
    avatar: string | null;
    company: string;
    companyName: string;
    department: string;
    departmentName: string;
    section: string | null;
    sectionName: string | null;
    position: string | null;
    shift: string | null;
}

interface LeaveFormData {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    totalDays: string; // จำนวนวันลา (กรอกเอง)
    reason: string;
    contactPhone: string;
    contactAddress: string;
    attachments: File[];
}

export default function LeaveFormPage() {
    const router = useRouter();
    const params = useParams();
    const toastr = useToastr();
    const { data: session } = useSession();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const type = params.type as LeaveType;
    const leaveType = leaveTypes[type] || leaveTypes.sick;
    const IconComponent = leaveType.icon;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState<LeaveFormData>({
        startDate: '',
        startTime: '08:00',
        endDate: '',
        endTime: '17:00',
        totalDays: '',
        reason: '',
        contactPhone: '',
        contactAddress: '',
        attachments: [],
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [showPreviewDialog, setShowPreviewDialog] = useState(false);

    // โหลดข้อมูลผู้ใช้
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await fetch('/api/profile');
                if (response.ok) {
                    const data = await response.json();
                    setUserProfile(data);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    // จัดการการเปลี่ยนแปลงฟอร์ม
    const handleFormChange = (field: keyof LeaveFormData, value: unknown) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
        
        // Clear error when field is changed
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // จัดการการอัพโหลดไฟล์
    const MAX_FILES = 3;
    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
    const MAX_IMAGE_WIDTH = 1920; // ความกว้างสูงสุดของรูป
    const MAX_IMAGE_HEIGHT = 1920; // ความสูงสูงสุดของรูป
    const IMAGE_QUALITY = 0.85; // คุณภาพรูป (0.85 = 85%)

    // ฟังก์ชัน resize รูปภาพ
    const resizeImage = (file: File): Promise<File> => {
        return new Promise((resolve) => {
            // ถ้าไม่ใช่รูปภาพ ส่งคืนไฟล์เดิม
            if (!file.type.startsWith('image/')) {
                resolve(file);
                return;
            }

            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                let { width, height } = img;

                // คำนวณขนาดใหม่ โดยรักษาสัดส่วน
                if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
                    const ratio = Math.min(MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;

                // วาดรูปลง canvas
                ctx?.drawImage(img, 0, 0, width, height);

                // แปลง canvas เป็น Blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            // สร้าง File ใหม่จาก Blob
                            const resizedFile = new File([blob], file.name, {
                                type: file.type,
                                lastModified: Date.now(),
                            });
                            resolve(resizedFile);
                        } else {
                            resolve(file);
                        }
                    },
                    file.type,
                    IMAGE_QUALITY
                );

                // ปล่อย memory
                URL.revokeObjectURL(img.src);
            };

            img.onerror = () => {
                resolve(file);
            };

            img.src = URL.createObjectURL(file);
        });
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const newFiles = Array.from(files);
            
            // ตรวจสอบจำนวนไฟล์รวม
            const totalFiles = formData.attachments.length + newFiles.length;
            if (totalFiles > MAX_FILES) {
                toastr.warning(`สามารถแนบไฟล์ได้สูงสุด ${MAX_FILES} ไฟล์`);
                return;
            }
            
            // ตรวจสอบขนาดไฟล์และ resize รูปภาพ
            const processedFiles: File[] = [];
            for (const file of newFiles) {
                if (file.size > MAX_FILE_SIZE) {
                    toastr.warning(`ไฟล์ ${file.name} มีขนาดเกิน 15MB`);
                } else {
                    // Resize รูปภาพ (ถ้าเป็นรูป)
                    const processedFile = await resizeImage(file);
                    processedFiles.push(processedFile);
                }
            }
            
            if (processedFiles.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    attachments: [...prev.attachments, ...processedFiles],
                }));
            }
        }
        // Reset input เพื่อให้เลือกไฟล์ซ้ำได้
        event.target.value = '';
    };

    // สร้าง URL สำหรับ preview
    const getFilePreviewUrl = (file: File): string => {
        return URL.createObjectURL(file);
    };

    // ตรวจสอบว่าเป็นไฟล์รูปภาพหรือไม่
    const isImageFile = (file: File): boolean => {
        return file.type.startsWith('image/');
    };

    // ลบไฟล์แนบ
    const removeAttachment = (index: number) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index),
        }));
    };

    // ตรวจสอบความถูกต้องของฟอร์ม
    const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
        const newErrors: Record<string, string> = {};

        if (!formData.startDate) {
            newErrors.startDate = 'กรุณาเลือกวันที่เริ่มลา';
        }

        if (!formData.endDate) {
            newErrors.endDate = 'กรุณาเลือกวันที่สิ้นสุดการลา';
        }

        if (formData.startDate && formData.endDate && dayjs(formData.endDate).isBefore(dayjs(formData.startDate))) {
            newErrors.endDate = 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มลา';
        }

        if (!formData.totalDays || parseFloat(formData.totalDays) <= 0) {
            newErrors.totalDays = 'กรุณาระบุจำนวนวันลา';
        }

        if (!formData.reason.trim()) {
            newErrors.reason = 'กรุณาระบุเหตุผลการลา';
        }

        // ตรวจสอบใบรับรองแพทย์สำหรับลาป่วยเกิน 3 วัน
        const totalDaysNum = parseFloat(formData.totalDays) || 0;
        if (type === 'sick' && totalDaysNum > 3 && formData.attachments.length === 0) {
            newErrors.attachments = 'กรุณาแนบใบรับรองแพทย์เนื่องจากลาเกิน 3 วัน';
        }

        setErrors(newErrors);
        return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
    };

    // เปิด preview ก่อนส่ง
    const handleOpenPreview = () => {
        const { isValid, errors: validationErrors } = validateForm();
        if (!isValid) {
            // แสดง error แรกที่พบ
            const errorMessages = Object.values(validationErrors);
            if (errorMessages.length > 0) {
                toastr.warning(errorMessages[0]);
            } else {
                toastr.warning('กรุณากรอกข้อมูลให้ครบถ้วน');
            }
            return;
        }
        setShowPreviewDialog(true);
    };

    // ส่งคำขอลา
    const handleSubmit = async () => {
        setShowPreviewDialog(false);
        setSubmitting(true);

        try {
            // TODO: Implement API call to save leave request
            const payload = {
                leaveType: type,
                startDate: formData.startDate,
                startTime: formData.startTime,
                endDate: formData.endDate,
                endTime: formData.endTime,
                totalDays: parseFloat(formData.totalDays) || 0,
                reason: formData.reason,
                contactPhone: formData.contactPhone,
                contactAddress: formData.contactAddress,
                status: 'pending',
            };

            console.log('Submitting:', payload);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            toastr.success('ส่งคำขอลาเรียบร้อยแล้ว');
            router.push('/');
        } catch (error) {
            console.error('Error submitting leave request:', error);
            toastr.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Skeleton variant="text" width={150} height={32} />
                </Box>
                <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3, mb: 2 }} />
                <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3, mb: 2 }} />
                <Skeleton variant="rounded" height={150} sx={{ borderRadius: 3 }} />
            </Box>
        );
    }

    return (
        <>
            <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', pb: 12 }}>
                {/* Header - Enhanced */}
                <Box
                    sx={{
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 100,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5 }}>
                        <IconButton 
                            onClick={() => router.back()} 
                            sx={{ 
                                mr: 1.5,
                                color: 'white',
                                bgcolor: 'rgba(255,255,255,0.15)',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
                            }}
                        >
                            <ArrowLeft size={22} />
                        </IconButton>
                        
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2, color: 'white' }}>
                                {leaveType.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                                {leaveType.description}
                            </Typography>
                        </Box>
                        {leaveType.maxDays && (
                            <Chip 
                                size="small"
                                label={`${leaveType.maxDays} วัน/ปี`}
                                sx={{ 
                                    bgcolor: 'rgba(255,255,255,0.2)', 
                                    color: 'white',
                                    fontWeight: 500,
                                    fontSize: '0.7rem',
                                }}
                            />
                        )}
                    </Box>
                </Box>

                {/* Main content */}
                <Box sx={{ px: 2, pt: 2.5 }}>
                    {/* ข้อมูลผู้ขอลา */}
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Box sx={{ 
                                width: 28, height: 28, borderRadius: 1.5, 
                                bgcolor: leaveType.lightColor, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center' 
                            }}>
                                <User size={15} color={leaveType.color} />
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                ข้อมูลผู้ขอลา
                            </Typography>
                        </Box>
                        
                        <Box sx={{ 
                            bgcolor: 'white', 
                            borderRadius: 1, 
                            p: 2,
                            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                            border: '1px solid',
                            borderColor: 'grey.100',
                        }}>
                            <Box sx={{ display: 'grid', gap: 1.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">ชื่อ-นามสกุล</Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                        {userProfile?.firstName} {userProfile?.lastName}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">รหัสพนักงาน</Typography>
                                    <Chip size="small" label={userProfile?.employeeId} sx={{ bgcolor: 'grey.100', fontWeight: 500, fontSize: '0.75rem' }} />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">บริษัท</Typography>
                                    <Typography variant="body2" fontWeight={500}>{userProfile?.companyName}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">ฝ่าย</Typography>
                                    <Typography variant="body2" fontWeight={500}>{userProfile?.sectionName || '-'}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">แผนก</Typography>
                                    <Typography variant="body2" fontWeight={500}>{userProfile?.departmentName || '-'}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">ตำแหน่ง</Typography>
                                    <Typography variant="body2" fontWeight={500}>{userProfile?.position || '-'}</Typography>
                                </Box>
                                {userProfile?.shift && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">กะ</Typography>
                                        <Typography variant="body2" fontWeight={500}>{userProfile.shift}</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    {/* รายละเอียดการลา */}
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Box sx={{ 
                                width: 28, height: 28, borderRadius: 1.5, 
                                bgcolor: leaveType.lightColor, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center' 
                            }}>
                                <Calendar size={15} color={leaveType.color} />
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                รายละเอียดการลา
                            </Typography>
                        </Box>

                        <Box sx={{ 
                            bgcolor: 'white', 
                            borderRadius: 1, 
                            p: 2,
                            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                            border: '1px solid',
                            borderColor: 'grey.100',
                        }}>
                            {/* วันที่เขียนใบลา */}
                            <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                mb: 2.5,
                                pb: 2,
                                borderBottom: '1px dashed',
                                borderColor: 'grey.200',
                            }}>
                                <Typography variant="body2" color="text.secondary">
                                    วันที่เขียนใบลา
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color={leaveType.color}>
                                    {dayjs().locale('th').format('DD MMMM')} {dayjs().year() + 543}
                                </Typography>
                            </Box>

                            {/* วันที่และเวลาเริ่มลา */}
                            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                                {/* วันที่เริ่มลา */}
                                <Box sx={{ position: 'relative', flex: 1 }}>
                                    <TextField
                                        fullWidth
                                        label="วันที่เริ่มลา"
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => handleFormChange('startDate', e.target.value)}
                                        size="small"
                                        error={!!errors.startDate}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': { borderColor: '#e5e7eb' },
                                                '&:hover fieldset': { borderColor: leaveType.color },
                                            },
                                            '& input[type="date"]': {
                                                color: 'transparent',
                                                '&::-webkit-datetime-edit': {
                                                    color: 'transparent',
                                                },
                                                '&::-webkit-datetime-edit-fields-wrapper': {
                                                    color: 'transparent',
                                                },
                                            },
                                            '& input[type="date"]::-webkit-calendar-picker-indicator': {
                                                opacity: 1,
                                                cursor: 'pointer',
                                            },
                                        }}
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Calendar size={16} color={leaveType.color} />
                                                    </InputAdornment>
                                                ),
                                            },
                                            inputLabel: {
                                                shrink: true,
                                            },
                                        }}
                                    />
                                    {/* แสดงวันที่แบบ dd/mm/YYYY (พ.ศ.) */}
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            position: 'absolute',
                                            left: 38,
                                            top: 8,
                                            color: formData.startDate ? '#1f2937' : '#9ca3af',
                                            fontWeight: 400,
                                            fontSize: '0.8rem',
                                            pointerEvents: 'none',
                                            bgcolor: 'white',
                                            paddingRight: 1,
                                        }}
                                    >
                                        {formData.startDate ? (() => {
                                            const date = new Date(formData.startDate);
                                            const day = String(date.getDate()).padStart(2, '0');
                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                            const year = date.getFullYear() + 543;
                                            return `${day}/${month}/${year}`;
                                        })() : 'วว/ดด/ปปปป'}
                                    </Typography>
                                </Box>

                                {/* เวลาเริ่มลา */}
                                <Box sx={{ width: 110 }}>
                                    <TextField
                                        fullWidth
                                        label="เวลา"
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => handleFormChange('startTime', e.target.value)}
                                        size="small"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': { borderColor: '#e5e7eb' },
                                                '&:hover fieldset': { borderColor: leaveType.color },
                                            },
                                        }}
                                        slotProps={{
                                            inputLabel: {
                                                shrink: true,
                                            },
                                        }}
                                    />
                                </Box>
                            </Box>
                            {errors.startDate && (
                                <Typography variant="caption" color="error" sx={{ mt: -1.5, mb: 1, display: 'block' }}>
                                    {errors.startDate}
                                </Typography>
                            )}

                            {/* วันที่และเวลาสิ้นสุด */}
                            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                                {/* วันที่สิ้นสุด */}
                                <Box sx={{ position: 'relative', flex: 1 }}>
                                    <TextField
                                        fullWidth
                                        label="วันที่สิ้นสุด"
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => handleFormChange('endDate', e.target.value)}
                                        size="small"
                                        error={!!errors.endDate}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': { borderColor: '#e5e7eb' },
                                                '&:hover fieldset': { borderColor: leaveType.color },
                                            },
                                            '& input[type="date"]': {
                                                color: 'transparent',
                                                '&::-webkit-datetime-edit': {
                                                    color: 'transparent',
                                                },
                                                '&::-webkit-datetime-edit-fields-wrapper': {
                                                    color: 'transparent',
                                                },
                                            },
                                            '& input[type="date"]::-webkit-calendar-picker-indicator': {
                                                opacity: 1,
                                                cursor: 'pointer',
                                            },
                                        }}
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Calendar size={16} color={leaveType.color} />
                                                    </InputAdornment>
                                                ),
                                            },
                                            inputLabel: {
                                                shrink: true,
                                            },
                                            htmlInput: {
                                                min: formData.startDate,
                                            }
                                        }}
                                    />
                                    {/* แสดงวันที่แบบ dd/mm/YYYY (พ.ศ.) */}
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            position: 'absolute',
                                            left: 38,
                                            top: 8,
                                            color: formData.endDate ? '#1f2937' : '#9ca3af',
                                            fontWeight: 400,
                                            fontSize: '0.8rem',
                                            pointerEvents: 'none',
                                            bgcolor: 'white',
                                            paddingRight: 1,
                                        }}
                                    >
                                        {formData.endDate ? (() => {
                                            const date = new Date(formData.endDate);
                                            const day = String(date.getDate()).padStart(2, '0');
                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                            const year = date.getFullYear() + 543;
                                            return `${day}/${month}/${year}`;
                                        })() : 'วว/ดด/ปปปป'}
                                    </Typography>
                                </Box>

                                {/* เวลาสิ้นสุด */}
                                <Box sx={{ width: 110 }}>
                                    <TextField
                                        fullWidth
                                        label="เวลา"
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => handleFormChange('endTime', e.target.value)}
                                        size="small"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': { borderColor: '#e5e7eb' },
                                                '&:hover fieldset': { borderColor: leaveType.color },
                                            },
                                        }}
                                        slotProps={{
                                            inputLabel: {
                                                shrink: true,
                                            },
                                        }}
                                    />
                                </Box>
                            </Box>
                            {errors.endDate && (
                                <Typography variant="caption" color="error" sx={{ mt: -1.5, mb: 1, display: 'block' }}>
                                    {errors.endDate}
                                </Typography>
                            )}

                            {/* จำนวนวันลา */}
                            <TextField
                                fullWidth
                                label="จำนวนวันลา"
                                type="number"
                                value={formData.totalDays}
                                onChange={(e) => handleFormChange('totalDays', e.target.value)}
                                size="small"
                                placeholder="เช่น 1, 0.5, 1.5, 2"
                                error={!!errors.totalDays}
                                helperText={errors.totalDays || 'ระบุจำนวนวันลา เช่น 0.5 = ครึ่งวัน, 1 = เต็มวัน'}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: '#e5e7eb' },
                                        '&:hover fieldset': { borderColor: leaveType.color },
                                    },
                                }}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Calendar size={18} color={leaveType.color} />
                                            </InputAdornment>
                                        ),
                                    },
                                    htmlInput: {
                                        step: 0.5,
                                        min: 0.5,
                                    }
                                }}
                            />

                            {/* แสดงจำนวนวันลา */}
                            {formData.totalDays && (
                                <Box
                                    sx={{
                                        p: 2,
                                        bgcolor: leaveType.lightColor,
                                        borderRadius: 2,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Typography variant="body2" fontWeight={500}>
                                        จำนวนวันลา
                                    </Typography>
                                    <Chip
                                        label={`${formData.totalDays} วัน`}
                                        sx={{
                                            bgcolor: leaveType.color,
                                            color: 'white',
                                            fontWeight: 'bold',
                                        }}
                                    />
                                </Box>
                            )}

                            {leaveType.maxDays && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    สิทธิ์การลาสูงสุด: {leaveType.maxDays} วัน/ปี โดยไม่หักเงิน
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    {/* เหตุผลการลา */}
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Box sx={{ 
                                width: 28, height: 28, borderRadius: 1.5, 
                                bgcolor: leaveType.lightColor, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center' 
                            }}>
                                <FileText size={15} color={leaveType.color} />
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                เหตุผลการลา
                            </Typography>
                        </Box>

                        <Box sx={{ 
                            bgcolor: 'white', 
                            borderRadius: 1, 
                            p: 2,
                            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                            border: '1px solid',
                            borderColor: 'grey.100',
                        }}>
                            <TextField
                                multiline
                                rows={3}
                                fullWidth
                                placeholder="ระบุเหตุผลการลา..."
                                value={formData.reason}
                                onChange={(e) => handleFormChange('reason', e.target.value)}
                                error={!!errors.reason}
                                helperText={errors.reason}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 1,
                                        bgcolor: '#fafafa',
                                    },
                                }}
                            />
                        </Box>
                    </Box>

                    {/* ไฟล์แนบ */}
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Box sx={{ 
                                width: 28, height: 28, borderRadius: 1.5, 
                                bgcolor: leaveType.lightColor, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center' 
                            }}>
                                <Paperclip size={15} color={leaveType.color} />
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                ไฟล์แนบ
                            </Typography>
                        </Box>

                        <Box sx={{ 
                            bgcolor: 'white', 
                            borderRadius: 1, 
                            p: 2,
                            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                            border: '1px solid',
                            borderColor: 'grey.100',
                        }}>
                            {leaveType.attachmentNote && (
                                <Alert 
                                    severity={type === 'sick' && (parseFloat(formData.totalDays) || 0) >= 3 ? 'warning' : 'info'} 
                                    icon={<AlertCircle size={18} />}
                                    sx={{ mb: 2, borderRadius: 2 }}
                                >
                                    {leaveType.attachmentNote}
                                </Alert>
                            )}

                            {/* ปุ่มอัพโหลด */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />

                            <Button
                                variant="outlined"
                                fullWidth
                                startIcon={<Upload size={18} />}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={formData.attachments.length >= MAX_FILES}
                                sx={{
                                    borderStyle: 'dashed',
                                    borderRadius: 2,
                                    py: 2,
                                    mb: errors.attachments ? 0 : 1.5,
                                    borderColor: leaveType.color,
                                    color: leaveType.color,
                                    bgcolor: leaveType.lightColor + '30',
                                    '&:hover': {
                                        borderColor: leaveType.color,
                                        bgcolor: leaveType.lightColor,
                                    },
                                    '&.Mui-disabled': {
                                        borderColor: 'grey.300',
                                        color: 'grey.400',
                                        bgcolor: 'grey.50',
                                    }
                                }}
                            >
                                {formData.attachments.length >= MAX_FILES 
                                    ? `แนบไฟล์ครบ ${MAX_FILES} ไฟล์แล้ว` 
                                    : `อัพโหลดไฟล์แนบ (${formData.attachments.length}/${MAX_FILES})`
                                }
                            </Button>

                            {errors.attachments && (
                                <Typography color="error" variant="caption" sx={{ display: 'block', mt: 0.5, mb: 1.5 }}>
                                    {errors.attachments}
                                </Typography>
                            )}

                            {/* รายการไฟล์แนบพร้อม Preview */}
                            {formData.attachments.length > 0 && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
                                    {formData.attachments.map((file, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                position: 'relative',
                                                width: 100,
                                                height: 100,
                                            }}
                                        >
                                            {/* Container สำหรับรูปภาพ */}
                                            <Box
                                                sx={{
                                                    width: '100%',
                                                    height: '100%',
                                                    borderRadius: 2,
                                                    overflow: 'hidden',
                                                    border: '1px solid',
                                                    borderColor: 'grey.200',
                                                    bgcolor: 'grey.50',
                                                    cursor: isImageFile(file) ? 'pointer' : 'default',
                                                }}
                                                onClick={() => {
                                                    if (isImageFile(file)) {
                                                        setPreviewImage(getFilePreviewUrl(file));
                                                    }
                                                }}
                                            >
                                            {isImageFile(file) ? (
                                                <Box
                                                    component="img"
                                                    src={getFilePreviewUrl(file)}
                                                    alt={file.name}
                                                    sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                    }}
                                                />
                                            ) : (
                                                <Box 
                                                    sx={{ 
                                                        width: '100%', 
                                                        height: '100%', 
                                                        display: 'flex', 
                                                        flexDirection: 'column',
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        p: 1,
                                                    }}
                                                >
                                                    <FileText size={32} color={leaveType.color} />
                                                    <Typography 
                                                        variant="caption" 
                                                        noWrap 
                                                        sx={{ 
                                                            maxWidth: '100%', 
                                                            mt: 0.5,
                                                            fontSize: '0.65rem',
                                                        }}
                                                    >
                                                        {file.name}
                                                    </Typography>
                                                </Box>
                                            )}
                                            </Box>
                                            
                                            {/* ปุ่มลบ - มุมขวาบน พื้นสีดำ */}
                                            <IconButton 
                                                size="small" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeAttachment(index);
                                                }} 
                                                sx={{ 
                                                    position: 'absolute',
                                                    top: 2,
                                                    right: 2,
                                                    bgcolor: 'rgba(0,0,0,0.7)',
                                                    color: 'white',
                                                    p: 0.3,
                                                    minWidth: 'auto',
                                                    zIndex: 10,
                                                    '&:hover': {
                                                        bgcolor: 'rgba(0,0,0,0.9)',
                                                    }
                                                }}
                                            >
                                                <X size={14} />
                                            </IconButton>
                                            
                                            {/* แสดงขนาดไฟล์ */}
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bgcolor: 'rgba(0,0,0,0.6)',
                                                    color: 'white',
                                                    textAlign: 'center',
                                                    py: 0.25,
                                                    fontSize: '0.6rem',
                                                }}
                                            >
                                                {(file.size / (1024 * 1024)).toFixed(1)} MB
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            )}

                            <Typography variant="caption" color="text.secondary">
                                รองรับไฟล์ .pdf, .jpg, .jpeg, .png (สูงสุด {MAX_FILES} ไฟล์, ไฟล์ละไม่เกิน 15MB)
                            </Typography>

                            {/* แจ้งเตือนลาป่วยเกิน 3 วัน */}
                            {type === 'sick' && (parseFloat(formData.totalDays) || 0) > 3 && formData.attachments.length === 0 && (
                                <Alert 
                                    severity="warning" 
                                    icon={<AlertCircle size={18} />}
                                    sx={{ mt: 2, borderRadius: 2 }}
                                >
                                    ลาป่วยเกิน 3 วัน กรุณาแนบใบรับรองแพทย์
                                </Alert>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Fixed Footer - ปุ่มดำเนินการ */}
            <Box 
                sx={{ 
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    bgcolor: 'white',
                    borderTop: '1px solid',
                    borderColor: 'grey.200',
                    px: 2,
                    py: 2,
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
                    zIndex: 100,
                }}
            >
                <Box sx={{ maxWidth: 600, mx: 'auto' }}>
                    <Button
                        variant="contained"
                        fullWidth
                        startIcon={<Send size={18} />}
                        onClick={handleOpenPreview}
                        disabled={submitting}
                        sx={{
                            py: 1.5,
                            borderRadius: 3,
                            bgcolor: '#1976d2',
                            fontWeight: 600,
                            boxShadow: '0 4px 14px rgba(25, 118, 210, 0.4)',
                            '&:hover': {
                                bgcolor: '#1565c0',
                                boxShadow: '0 6px 20px rgba(25, 118, 210, 0.5)',
                            },
                        }}
                    >
                        {submitting ? 'กำลังส่ง...' : 'ส่งคำขอลา'}
                    </Button>
                </Box>
            </Box>

            {/* Dialog Preview ข้อมูลก่อนส่ง */}
            <Dialog
                open={showPreviewDialog}
                onClose={() => setShowPreviewDialog(false)}
                maxWidth="sm"
                fullWidth
                sx={{
                    '& .MuiDialog-paper': {
                        borderRadius: 1,
                        m: 2,
                    }
                }}
            >
                <Box sx={{ p: 2.5 }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            
                            <Box>
                                <Typography variant="h6" fontWeight="bold">
                                    ตรวจสอบข้อมูลการลา
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    กรุณาตรวจสอบข้อมูลก่อนยืนยัน
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton onClick={() => setShowPreviewDialog(false)} size="small">
                            <X size={20} />
                        </IconButton>
                    </Box>

                    {/* ประเภทการลา */}
                    <Box sx={{ 
                        bgcolor: leaveType.lightColor, 
                        borderRadius: 2, 
                        p: 1.5, 
                        mb: 2,
                        border: `1px solid ${leaveType.color}30`
                    }}>
                        <Typography variant="subtitle2" fontWeight="bold" color={leaveType.color}>
                            {leaveType.name}
                        </Typography>
                    </Box>

                    {/* ข้อมูลผู้ขอลา */}
                    <Box sx={{ 
                        bgcolor: 'grey.50', 
                        borderRadius: 1, 
                        p: 1.5, 
                        mb: 2,
                        border: '1px solid',
                        borderColor: 'grey.200'
                    }}>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            <User size={18} color="#1976d2" />
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary">ชื่อ-นามสกุล</Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {userProfile?.firstName} {userProfile?.lastName}
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            <Building2 size={18} color="#1976d2" />
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary">ฝ่าย</Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {userProfile?.sectionName || '-'}
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            <Briefcase size={18} color="#1976d2" />
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary">แผนก</Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {userProfile?.departmentName || '-'}
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Briefcase size={18} color="#1976d2" />
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary">ตำแหน่ง</Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {userProfile?.position || '-'}
                                </Typography>
                            </Box>
                        </Box>
                        {userProfile?.shift && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Clock size={18} color="#1976d2" />
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary">กะ</Typography>
                                    <Typography variant="body2" fontWeight={500}>
                                        {userProfile.shift}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>

                    {/* รายละเอียด */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2.5 }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Calendar size={18} color="#1976d2" />
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary">วันที่ลา</Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {formData.startDate ? (() => {
                                        const start = dayjs(formData.startDate);
                                        const end = dayjs(formData.endDate);
                                        const startYear = start.year() + 543;
                                        const endYear = end.year() + 543;
                                        return `${start.format('D MMM')} ${startYear} - ${end.format('D MMM')} ${endYear}`;
                                    })() : '-'}
                                </Typography>
                            </Box>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Clock size={18} color="#1976d2" />
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary">เวลา</Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {formData.startTime} - {formData.endTime} น.
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <FileText size={18} color="#1976d2" />
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary">จำนวนวันลา</Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {formData.totalDays} วัน
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <FileText size={18} color="#1976d2" />
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary">เหตุผลการลา</Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {formData.reason}
                                </Typography>
                            </Box>
                        </Box>

                        {formData.contactAddress && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <MapPin size={18} color="#1976d2" />
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary">ที่อยู่ระหว่างลา</Typography>
                                    <Typography variant="body2" fontWeight={500}>
                                        {formData.contactAddress}
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        {formData.attachments.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Paperclip size={18} color="#1976d2" />
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary">ไฟล์แนบ</Typography>
                                    <Typography variant="body2" fontWeight={500}>
                                        {formData.attachments.length} ไฟล์
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>

                    {/* ปุ่มดำเนินการ */}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => setShowPreviewDialog(false)}
                            sx={{ 
                                py: 1.2, 
                                borderRadius: 2,
                                borderColor: 'grey.400',
                                color: 'grey.700',
                            }}
                        >
                            แก้ไข
                        </Button>
                        <Button
                            variant="contained"
                            fullWidth
                            startIcon={<Send size={18} />}
                            onClick={handleSubmit}
                            disabled={submitting}
                            sx={{
                                py: 1.2,
                                borderRadius: 2,
                                bgcolor: '#1976d2',
                                fontWeight: 600,
                                '&:hover': {
                                    bgcolor: '#1565c0',
                                },
                            }}
                        >
                            {submitting ? 'กำลังส่ง...' : 'ยืนยันส่งคำขอ'}
                        </Button>
                    </Box>
                </Box>
            </Dialog>

            {/* Dialog Preview รูปภาพ */}
            <Dialog
                open={!!previewImage}
                onClose={() => setPreviewImage(null)}
                maxWidth="lg"
                fullWidth
                sx={{
                    '& .MuiDialog-paper': {
                        bgcolor: 'transparent',
                        boxShadow: 'none',
                        m: 1,
                    }
                }}
            >
                <Box
                    sx={{
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    {/* ปุ่มปิด */}
                    <IconButton
                        onClick={() => setPreviewImage(null)}
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            zIndex: 1,
                            '&:hover': {
                                bgcolor: 'rgba(0,0,0,0.9)',
                            }
                        }}
                    >
                        <X size={24} />
                    </IconButton>
                    
                    {/* รูปภาพ */}
                    {previewImage && (
                        <Box
                            component="img"
                            src={previewImage}
                            alt="Preview"
                            sx={{
                                maxWidth: '100%',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                borderRadius: 1,
                            }}
                        />
                    )}
                </Box>
            </Dialog>
        </>
    );
}
