'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    Container,
    Divider,
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
    Briefcase,
    Heart,
    Umbrella,
    HelpCircle,
    Send,
    Save,
    X,
    Paperclip,
    AlertCircle,
    Stethoscope,
    Sun,
    Baby,
    Church,
    Shield,
    Users,
    Car,
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToastr } from '@/app/components/Toastr';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

// สีหลักของระบบ
const PRIMARY_COLOR = '#1976d2';
const PRIMARY_LIGHT = '#e3f2fd';

// กำหนด icon และสีสำหรับแต่ละประเภทการลา
const leaveTypeConfig: Record<string, { icon: any; color: string; lightColor: string }> = {
    sick: { icon: Stethoscope, color: '#FF6B6B', lightColor: '#FFEBEE' },
    personal: { icon: Briefcase, color: '#AB47BC', lightColor: '#F3E5F5' },
    vacation: { icon: Umbrella, color: '#FF7043', lightColor: '#FBE9E7' },
    annual: { icon: Sun, color: '#FFD93D', lightColor: '#FFF9C4' },
    maternity: { icon: Baby, color: '#FF8ED4', lightColor: '#FCE4EC' },
    ordination: { icon: Church, color: '#FFA726', lightColor: '#FFF3E0' },
    military: { icon: Shield, color: '#66BB6A', lightColor: '#E8F5E9' },
    marriage: { icon: Heart, color: '#EF5350', lightColor: '#FFEBEE' },
    funeral: { icon: Users, color: '#78909C', lightColor: '#ECEFF1' },
    paternity: { icon: User, color: '#42A5F5', lightColor: '#E3F2FD' },
    sterilization: { icon: Stethoscope, color: '#26A69A', lightColor: '#E0F2F1' },
    business: { icon: Car, color: '#7E57C2', lightColor: '#EDE7F6' },
    unpaid: { icon: Clock, color: '#9E9E9E', lightColor: '#F5F5F5' },
    default: { icon: HelpCircle, color: '#5C6BC0', lightColor: '#E8EAF6' },
};

interface LeaveTypeData {
    id: number;
    code: string;
    name: string;
    description: string | null;
    maxDaysPerYear: number | null;
    isPaid: boolean;
    isActive: boolean;
}

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

interface UploadedAttachmentMeta {
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
}

interface AttachmentItem {
    file: File;
    previewUrl: string;
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
    attachments: AttachmentItem[];
}

export default function LeaveFormPage() {
    const router = useRouter();
    const params = useParams();
    const toastr = useToastr();
    const { data: session } = useSession();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const leaveCode = params.type as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [leaveType, setLeaveType] = useState<LeaveTypeData | null>(null);
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
    const [processingAttachments, setProcessingAttachments] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    const maxLeaveDaysByRange = useMemo(() => {
        if (!formData.startDate || !formData.endDate) return null;
        const start = dayjs(formData.startDate);
        const end = dayjs(formData.endDate);
        if (end.isBefore(start)) {
            return null;
        }
        return end.diff(start, 'day') + 1;
    }, [formData.startDate, formData.endDate]);

    const baseTotalDaysHelper = 'ระบุจำนวนวันลา เช่น 0.5 = ครึ่งวัน, 1 = เต็มวัน';
    const totalDaysHelperText = errors.totalDays || (maxLeaveDaysByRange ? `${baseTotalDaysHelper} (สูงสุด ${maxLeaveDaysByRange} วัน)` : baseTotalDaysHelper);

    // โหลดข้อมูลผู้ใช้และประเภทการลา
    useEffect(() => {
        const fetchData = async () => {
            try {
                // ดึงข้อมูลผู้ใช้
                const profileRes = await fetch('/api/profile');
                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    setUserProfile(profileData);
                }

                // ดึงข้อมูลประเภทการลา
                const leaveTypesRes = await fetch('/api/leave-types');
                if (leaveTypesRes.ok) {
                    const leaveTypesData = await leaveTypesRes.json();
                    const selectedType = leaveTypesData.find((lt: LeaveTypeData) => lt.code === leaveCode);
                    if (selectedType) {
                        setLeaveType(selectedType);
                    } else {
                        toastr.error('ไม่พบประเภทการลาที่เลือก');
                        router.push('/leave');
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                toastr.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [leaveCode, router, toastr]);

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
    const MAX_IMAGE_WIDTH = 1600; // ความกว้างสูงสุดของรูป
    const MAX_IMAGE_HEIGHT = 1600; // ความสูงสูงสุดของรูป
    const IMAGE_QUALITY = 0.8; // คุณภาพรูป (0.8 = 80%)

    // ฟังก์ชัน resize รูปภาพ
    const resizeImage = (file: File): Promise<File> => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(file);
                return;
            }

            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const isHeic = file.type === 'image/heic' || file.type === 'image/heif';
            const preferredMime = isHeic ? 'image/jpeg' : file.type;

            const resolveWithBlob = (blob: Blob, overrideType?: string) => {
                const effectiveType = overrideType || blob.type || preferredMime;
                const needsJpegRename = effectiveType === 'image/jpeg' && !/\.jpe?g$/i.test(file.name);
                const renamedFile = new File(
                    [blob],
                    needsJpegRename || isHeic ? file.name.replace(/\.[^/.]+$/, '.jpg') : file.name,
                    {
                        type: effectiveType,
                        lastModified: Date.now(),
                    }
                );
                resolve(renamedFile);
            };

            const finalize = (blob: Blob | null, overrideType?: string) => {
                if (blob) {
                    resolveWithBlob(blob, overrideType);
                } else if (!isHeic && preferredMime !== 'image/jpeg') {
                    canvas.toBlob(
                        (fallbackBlob) => finalize(fallbackBlob, 'image/jpeg'),
                        'image/jpeg',
                        IMAGE_QUALITY
                    );
                } else {
                    resolve(file);
                }
            };

            img.onload = () => {
                let { width, height } = img;
                if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
                    const ratio = Math.min(MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => finalize(blob), preferredMime, IMAGE_QUALITY);
                URL.revokeObjectURL(img.src);
            };

            img.onerror = () => resolve(file);
            img.src = URL.createObjectURL(file);
        });
    };

    const uploadAttachmentToServer = async (file: File): Promise<UploadedAttachmentMeta> => {
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('leaveType', leaveCode);

        const response = await fetch('/api/leave-attachments', {
            method: 'POST',
            body: uploadData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'อัปโหลดไฟล์ไม่สำเร็จ' }));
            throw new Error(errorData.error || 'อัปโหลดไฟล์ไม่สำเร็จ');
        }

        const result = await response.json();
        return result.file as UploadedAttachmentMeta;
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newFiles = Array.from(files);
        let remainingSlots = MAX_FILES - formData.attachments.length;

        if (remainingSlots <= 0) {
            toastr.warning(`สามารถแนบไฟล์ได้สูงสุด ${MAX_FILES} ไฟล์`);
            event.target.value = '';
            return;
        }

        if (newFiles.length > remainingSlots) {
            toastr.warning(`เลือกลดจำนวนไฟล์ให้ไม่เกิน ${remainingSlots} ไฟล์`);
        }

        const filesToProcess = newFiles.slice(0, remainingSlots);

        setProcessingAttachments(true);
        try {
            for (const file of filesToProcess) {
                if (file.size > MAX_FILE_SIZE) {
                    toastr.warning(`ไฟล์ ${file.name} มีขนาดเกิน 15MB`);
                    continue;
                }

                const processedFile = await resizeImage(file);
                const previewUrl = URL.createObjectURL(processedFile);

                setFormData(prev => ({
                    ...prev,
                    attachments: [
                        ...prev.attachments,
                        {
                            file: processedFile,
                            previewUrl,
                        },
                    ],
                }));
            }
        } finally {
            setProcessingAttachments(false);
            event.target.value = '';
        }
    };

    // ตรวจสอบว่าเป็นไฟล์รูปภาพหรือไม่
    const isImageFile = (file: File): boolean => {
        return file.type.startsWith('image/');
    };

    // ลบไฟล์แนบ
    const removeAttachment = (index: number) => {
        const target = formData.attachments[index];
        if (!target) return;

        if (target.previewUrl) {
            URL.revokeObjectURL(target.previewUrl);
        }

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

        const totalDaysNum = parseFloat(formData.totalDays) || 0;

        if (!formData.totalDays || totalDaysNum <= 0) {
            newErrors.totalDays = 'กรุณาระบุจำนวนวันลา';
        } else if (maxLeaveDaysByRange !== null && totalDaysNum > maxLeaveDaysByRange) {
            newErrors.totalDays = `จำนวนวันลาสูงสุด ${maxLeaveDaysByRange} วัน ตามช่วงวันที่เลือก`;
        }

        if (!formData.reason.trim()) {
            newErrors.reason = 'กรุณาระบุเหตุผลการลา';
        }

        // ตรวจสอบใบรับรองแพทย์สำหรับลาป่วยเกิน 3 วัน
        if (leaveCode === 'sick' && totalDaysNum > 3 && formData.attachments.length === 0) {
            newErrors.attachments = 'กรุณาแนบใบรับรองแพทย์เนื่องจากลาเกิน 3 วัน';
        }

        setErrors(newErrors);
        return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
    };

    // เปิด confirm ก่อนส่ง
    const handleOpenConfirm = () => {
        if (processingAttachments) {
            toastr.warning('กรุณารอให้ประมวลผลไฟล์เสร็จก่อน');
            return;
        }
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
        setShowConfirmDialog(true);
    };

    // ส่งคำขอลา
    const handleSubmit = async () => {
        setShowConfirmDialog(false);
        setSubmitting(true);

        const uploadedMetas: UploadedAttachmentMeta[] = [];
        const cleanupUploadedFiles = async () => {
            if (!uploadedMetas.length) return;
            await Promise.all(
                uploadedMetas.map(file =>
                    fetch('/api/leave-attachments', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ filePath: file.filePath }),
                    }).catch(() => undefined)
                )
            );
        };

        try {
            for (const attachment of formData.attachments) {
                const uploadedMeta = await uploadAttachmentToServer(attachment.file);
                uploadedMetas.push(uploadedMeta);
            }

            const payload = {
                leaveType: leaveCode,
                startDate: formData.startDate,
                startTime: formData.startTime,
                endDate: formData.endDate,
                endTime: formData.endTime,
                totalDays: parseFloat(formData.totalDays) || 0,
                reason: formData.reason,
                contactPhone: formData.contactPhone,
                contactAddress: formData.contactAddress,
                status: 'pending',
                attachments: uploadedMetas,
            };

            const response = await fetch('/api/leaves', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' }));
                throw new Error(errorData.error || 'ไม่สามารถบันทึกคำขอลาได้');
            }

            toastr.success('ส่งคำขอลาเรียบร้อยแล้ว');
            router.push('/leave');
        } catch (error) {
            await cleanupUploadedFiles();
            console.error('Error submitting leave request:', error);
            toastr.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        } finally {
            setSubmitting(false);
        }
    };

    // ถ้ายังโหลดข้อมูลอยู่หรือยังไม่มี leaveType
    if (loading || !leaveType) {
        const sectionHeights = [190, 230, 260];
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', pb: 8 }}>
                <Box
                    sx={{
                        background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                        px: 2,
                        py: 2,
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.4)' }} />
                        <Box sx={{ flex: 1 }}>
                            <Skeleton variant="text" width="70%" height={26} sx={{ bgcolor: 'rgba(255,255,255,0.4)' }} />
                            <Skeleton variant="text" width="45%" height={18} sx={{ bgcolor: 'rgba(255,255,255,0.35)', mt: 0.5 }} />
                        </Box>
                        <Skeleton variant="rounded" width={70} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.4)', borderRadius: 999 }} />
                    </Box>
                </Box>

                <Container maxWidth={false} disableGutters sx={{ maxWidth: 1200, px: { xs: 1.5, sm: 2 }, pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <Skeleton variant="rounded" height={130} sx={{ borderRadius: 2 }} />
                        {sectionHeights.map((height, index) => (
                            <Skeleton key={index} variant="rounded" height={height} sx={{ borderRadius: 2 }} />
                        ))}
                        <Skeleton variant="rounded" height={72} sx={{ borderRadius: 999, maxWidth: 480, alignSelf: 'center', mt: 1 }} />
                    </Box>
                </Container>
            </Box>
        );
    }

    // ดึง config สำหรับ icon และสี
    const config = leaveTypeConfig[leaveType.code] || leaveTypeConfig.default;
    const IconComponent = config.icon;

    return (
        <>
            <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', pb: 12 }}>
                {/* Header - Enhanced */}
                <Box
                    sx={{
                        background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)`,
                        position: 'sticky',
                        top: 0,
                        zIndex: 100,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    }}
                >
                    <Container maxWidth={false} sx={{ maxWidth: 1200 }}>
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
                        {leaveType.maxDaysPerYear && (
                            <Chip 
                                size="small"
                                label={`${leaveType.maxDaysPerYear} วัน/ปี`}
                                sx={{ 
                                    bgcolor: 'rgba(255,255,255,0.2)', 
                                    color: 'white',
                                    fontWeight: 500,
                                    fontSize: '0.7rem',
                                }}
                            />
                        )}
                        </Box>
                    </Container>
                </Box>

                {/* Main content */}
                <Container maxWidth={false} disableGutters sx={{ maxWidth: 1200, px: { xs: 1, sm: 2 } }}>
                    <Box sx={{ pt: 2 }}>
                        {/* ข้อมูลผู้ขอลา */}
                        <Box sx={{ mb: 2.5, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Box sx={{ 
                                width: 28, height: 28, borderRadius: 1.5, 
                                bgcolor: config.lightColor, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center' 
                            }}>
                                <User size={15} color={config.color} />
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                ข้อมูลผู้ขอลา
                            </Typography>
                        </Box>
                        
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

                    <Divider sx={{ my: 3 }} />

                    {/* รายละเอียดการลา */}
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Box sx={{ 
                                width: 28, height: 28, borderRadius: 1.5, 
                                bgcolor: config.lightColor, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center' 
                            }}>
                                <Calendar size={15} color={config.color} />
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                รายละเอียดการลา
                            </Typography>
                        </Box>

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
                                <Typography variant="body2" fontWeight={600} color={config.color}>
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
                                                '&:hover fieldset': { borderColor: config.color },
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
                                                        <Calendar size={16} color={config.color} />
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
                                                '&:hover fieldset': { borderColor: config.color },
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
                                                '&:hover fieldset': { borderColor: config.color },
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
                                                        <Calendar size={16} color={config.color} />
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
                                                '&:hover fieldset': { borderColor: config.color },
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
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    {/* จำนวนวันลา */}
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Box sx={{ 
                                width: 28, height: 28, borderRadius: 1.5, 
                                bgcolor: config.lightColor, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center' 
                            }}>
                                <Calendar size={15} color={config.color} />
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                จำนวนวันลา
                            </Typography>
                        </Box>

                        <TextField
                                fullWidth
                                label="จำนวนวันลา"
                                type="number"
                                value={formData.totalDays}
                                onChange={(e) => handleFormChange('totalDays', e.target.value)}
                                size="small"
                                placeholder="เช่น 1, 0.5, 1.5, 2"
                                error={!!errors.totalDays}
                                helperText={totalDaysHelperText}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: '#e5e7eb' },
                                        '&:hover fieldset': { borderColor: config.color },
                                    },
                                }}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Calendar size={18} color={config.color} />
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
                                        bgcolor: config.lightColor,
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
                                            bgcolor: config.color,
                                            color: 'white',
                                            fontWeight: 'bold',
                                        }}
                                    />
                                </Box>
                            )}

                            {leaveType.maxDaysPerYear && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    สิทธิ์การลาสูงสุด: {leaveType.maxDaysPerYear} วัน/ปี โดยไม่หักเงิน
                                </Typography>
                            )}
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    {/* เหตุผลการลา */}
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Box sx={{ 
                                width: 28, height: 28, borderRadius: 1.5, 
                                bgcolor: config.lightColor, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center' 
                            }}>
                                <FileText size={15} color={config.color} />
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                เหตุผลการลา
                            </Typography>
                        </Box>

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

                    <Divider sx={{ my: 3 }} />

                    {/* ไฟล์แนบ */}
                      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Box sx={{ 
                                width: 28, height: 28, borderRadius: 1.5, 
                                bgcolor: config.lightColor, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center' 
                            }}>
                                <Paperclip size={15} color={config.color} />
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                ไฟล์แนบ
                            </Typography>
                        </Box>

                            {/* ปุ่มอัพโหลด */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,image/heic"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />

                        <Button
                            variant="outlined"
                            fullWidth
                            startIcon={<Upload size={18} />}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={formData.attachments.length >= MAX_FILES || processingAttachments}
                            sx={{
                                borderStyle: 'dashed',
                                borderRadius: 2,
                                py: 2,
                                mb: errors.attachments ? 0 : 1.5,
                                borderColor: config.color,
                                color: config.color,
                                bgcolor: config.lightColor + '30',
                                '&:hover': {
                                    borderColor: config.color,
                                    bgcolor: config.lightColor,
                                },
                                    '&.Mui-disabled': {
                                        borderColor: 'grey.300',
                                        color: 'grey.400',
                                        bgcolor: 'grey.50',
                                    }
                                }}
                            >
                                {processingAttachments
                                    ? 'กำลังประมวลผลไฟล์...'
                                    : formData.attachments.length >= MAX_FILES
                                        ? `แนบไฟล์ครบ ${MAX_FILES} ไฟล์แล้ว`
                                        : `อัพโหลดไฟล์แนบ (${formData.attachments.length}/${MAX_FILES})`}
                            </Button>

                            {errors.attachments && (
                                <Typography color="error" variant="caption" sx={{ display: 'block', mt: 0.5, mb: 1.5 }}>
                                    {errors.attachments}
                                </Typography>
                            )}

                            {/* รายการไฟล์แนบพร้อม Preview */}
                            {formData.attachments.length > 0 && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
                                    {formData.attachments.map((attachment, index) => (
                                        <Box
                                            key={`${attachment.file.name}-${index}`}
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
                                                    cursor: isImageFile(attachment.file) ? 'pointer' : 'default',
                                                }}
                                                onClick={() => {
                                                    if (isImageFile(attachment.file)) {
                                                        setPreviewImage(attachment.previewUrl);
                                                    }
                                                }}
                                            >
                                            {isImageFile(attachment.file) ? (
                                                <Box
                                                    component="img"
                                                    src={attachment.previewUrl}
                                                    alt={attachment.file.name}
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
                                                    <FileText size={32} color={config.color} />
                                                    <Typography 
                                                        variant="caption" 
                                                        noWrap 
                                                        sx={{ 
                                                            maxWidth: '100%', 
                                                            mt: 0.5,
                                                            fontSize: '0.65rem',
                                                        }}
                                                    >
                                                        {attachment.file.name}
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
                                                {(attachment.file.size / (1024 * 1024)).toFixed(1)} MB
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            )}

                        <Typography variant="caption" color="text.secondary">
                            รองรับไฟล์ .pdf, .jpg, .jpeg, .png (สูงสุด {MAX_FILES} ไฟล์, ไฟล์ละไม่เกิน 15MB)
                        </Typography>

                        {/* แจ้งเตือนลาป่วยเกิน 3 วัน */}
                        {leaveCode === 'sick' && (parseFloat(formData.totalDays) || 0) > 3 && formData.attachments.length === 0 && (
                            <Alert 
                                severity="warning" 
                                icon={<AlertCircle size={18} />}
                                sx={{ mt: 2, borderRadius: 2 }}
                            >
                                ลาป่วยเกิน 3 วัน กรุณาแนบใบรับรองแพทย์
                            </Alert>
                        )}
                    </Box>
                </Container>
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
                <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                    <Button
                        variant="contained"
                        fullWidth
                        startIcon={<Send size={18} />}
                        onClick={handleOpenConfirm}
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

            {/* Confirm Dialog */}
            <Dialog
                open={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                maxWidth="xs"
                fullWidth
                sx={{
                    '& .MuiDialog-paper': {
                        borderRadius: 1,
                        m: 2,
                    }
                }}
            >
                <Box sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                bgcolor: config.lightColor,
                                color: config.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Send size={24} />
                        </Box>
                    </Box>
                    <Typography variant="h6" fontWeight="bold" textAlign="center">
                        ยืนยันส่งคำขอลา?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 1, mb: 3 }}>
                        ระบบจะส่งคำขอไปยังผู้อนุมัติทันทีเมื่อกดยืนยัน
                    </Typography>

                    <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 1.5, mb: 3, border: '1px solid', borderColor: 'grey.200' }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
                            {leaveType.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {formData.startDate && formData.endDate
                                ? `${dayjs(formData.startDate).locale('th').format('D MMM YYYY')} - ${dayjs(formData.endDate).locale('th').format('D MMM YYYY')}`
                                : 'ยังไม่ได้เลือกช่วงวัน'}
                        </Typography>
                        {formData.totalDays && (
                            <Typography variant="body2" color="text.secondary">
                                จำนวนวันลา {formData.totalDays} วัน
                            </Typography>
                        )}
                        {formData.reason && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                เหตุผล: {formData.reason}
                            </Typography>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => setShowConfirmDialog(false)}
                            sx={{
                                py: 1.1,
                                borderRadius: 2,
                                borderColor: 'grey.400',
                                color: 'grey.700',
                            }}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            variant="contained"
                            fullWidth
                            startIcon={<Send size={18} />}
                            onClick={handleSubmit}
                            disabled={submitting}
                            sx={{
                                py: 1.1,
                                borderRadius: 2,
                                bgcolor: '#1976d2',
                                fontWeight: 600,
                                '&:hover': {
                                    bgcolor: '#1565c0',
                                },
                            }}
                        >
                            {submitting ? 'กำลังส่ง...' : 'ยืนยัน'}
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
