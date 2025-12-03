'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Avatar,
    Paper,
    Skeleton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Slider,
} from '@mui/material';
import { 
    Building, 
    User, 
    HashtagSquare, 
    Briefcase, 
    Calendar, 
    ArrowDown2, 
    TickCircle, 
    ArrowLeft2,
    TickSquare,
    Camera,
    Location,
    Sms,
    Clock,
    CloseCircle,
    SearchZoomIn,
    SearchZoomOut,
    RotateRight,
    Eye,
    EyeSlash,
} from 'iconsax-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToastr } from '@/app/components/Toastr';
import { useUser } from '@/app/providers/UserProvider';
import type { UserRole } from '@/types/user-role';
import { useLocale } from '@/app/providers/LocaleProvider';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import 'dayjs/locale/en';
import 'dayjs/locale/my';

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

interface UserProfile {
    id: number;
    employeeId: string;
    email: string | null;
    firstName: string;
    lastName: string;
    avatar: string | null;
    company: string;
    companyName: string;
    employeeType: string;
    department: string;
    departmentName: string;
    section: string | null;
    sectionName: string | null;
    shift: string | null;
    startDate: string;
    role: UserRole;
    isActive: boolean;
}

export default function EditProfilePage() {
    const { t, locale } = useLocale();
    const router = useRouter();
    const toastr = useToastr();
    const { data: session } = useSession();
    const { refetch: refetchUser } = useUser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [formData, setFormData] = useState({
        company: '',
        employeeType: '',
        firstName: '',
        lastName: '',
        employeeId: '',
        departmentId: '',
        sectionId: '',
        shift: '',
        startDate: '',
        email: '',
        gender: '',
    });

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [pendingAvatarUpload, setPendingAvatarUpload] = useState<string | null>(null); // Base64 image waiting to be uploaded

    // Image editor states
    const [imageEditorOpen, setImageEditorOpen] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Data from API
    const [companies, setCompanies] = useState<Company[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [sections, setSections] = useState<Section[]>([]);

    // Loading states for data
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [loadingDepartments, setLoadingDepartments] = useState(false);
    const [loadingSections, setLoadingSections] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Password change states
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Drawer states
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerType, setDrawerType] = useState<'company' | 'employeeType' | 'department' | 'section' | 'shift' | 'gender' | null>(null);
    const [drawerTitle, setDrawerTitle] = useState('');
    const [drawerOptions, setDrawerOptions] = useState<DrawerOption[]>([]);

    // Fetch profile
    const fetchProfile = useCallback(async () => {
        try {
            const res = await fetch('/api/profile');
            if (!res.ok) throw new Error('Failed to fetch profile');
            const data = await res.json();
            setProfile(data);
            setFormData({
                company: data.company || '',
                employeeType: data.employeeType || '',
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                employeeId: data.employeeId || '',
                departmentId: data.department || '',
                sectionId: data.section || '',
                shift: data.shift || '',
                startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
                email: data.email || '',
                gender: data.gender || '',
            });
            // Only set avatar preview if there's no pending upload (user hasn't selected a new image)
            setAvatarPreview(prev => {
                    // If there's already a pending upload or a base64 image, don't override
                    if (prev && prev.startsWith('data:')) {
                        return prev;
                    }
                    return data.avatar || prev;
                });
        } catch (error) {
            console.error('Error fetching profile:', error);
            toastr.error(t('error_fetch_profile', 'ไม่สามารถดึงข้อมูลได้'));
        } finally {
            setLoadingProfile(false);
        }
    }, [toastr, t]);

    // Fetch companies on mount - only run once
    useEffect(() => {
        setMounted(true);
        fetchProfile();

        // Set theme-color for status bar to match header gradient
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        const originalColor = metaThemeColor?.getAttribute('content') || '#EAF2F8';
        
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', '#667eea');
        } else {
            const newMeta = document.createElement('meta');
            newMeta.name = 'theme-color';
            newMeta.content = '#667eea';
            document.head.appendChild(newMeta);
        }
        
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

        // Cleanup: restore original theme-color when leaving page
        return () => {
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) {
                meta.setAttribute('content', originalColor);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }, [formData.company]);

    // Fetch sections when department changes
    useEffect(() => {
        if (!formData.departmentId) {
            setSections([]);
            return;
        }

        const dept = departments.find(d => d.code === formData.departmentId || d.name === formData.departmentId);
        if (!dept) return;

        const fetchSections = async () => {
            setLoadingSections(true);
            try {
                const res = await fetch(`/api/sections?departmentId=${dept.id}`);
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
    }, [formData.departmentId, departments]);

    const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [field]: e.target.value });
    };

    // Image handling functions
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file type
        if (!file.type.startsWith('image/')) {
            toastr.error(t('error_select_image', 'กรุณาเลือกไฟล์รูปภาพ'));
            return;
        }

        // Check file size (max 15MB)
        if (file.size > 15 * 1024 * 1024) {
            toastr.error(t('error_image_size', 'ไฟล์รูปภาพต้องมีขนาดไม่เกิน 15MB'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = event.target?.result as string;
            setOriginalImage(imageData);
            setZoom(1);
            setRotation(0);
            setPosition({ x: 0, y: 0 });
            setImageEditorOpen(true);
        };
        reader.readAsDataURL(file);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const resizeImage = (imageSrc: string, maxWidth: number, maxHeight: number): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                }

                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = imageSrc;
        });
    };

    const cropCircleImage = useCallback((): Promise<void> => {
        return new Promise((resolve) => {
            if (!originalImage || !canvasRef.current) {
                resolve();
                return;
            }

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve();
                return;
            }

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const outputSize = 200; // Final output size
                const cropAreaSize = 200; // Crop area size in preview (diameter)
                const previewHeight = 300; // Preview container height
                
                canvas.width = outputSize;
                canvas.height = outputSize;

                // Clear canvas completely
                ctx.clearRect(0, 0, outputSize, outputSize);
                
                // Fill with background color first
                ctx.fillStyle = '#f5f5f5';
                ctx.fillRect(0, 0, outputSize, outputSize);

                // Save state before clipping
                ctx.save();

                // Create circular clip
                ctx.beginPath();
                ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                // Calculate how image is displayed in preview
                const imgAspect = img.width / img.height;
                
                // Image fills container height, maintaining aspect ratio
                const displayHeight = previewHeight;
                const displayWidth = previewHeight * imgAspect;

                // Scale factor: crop area to output size
                const scale = outputSize / cropAreaSize;

                // Apply transformations
                ctx.translate(outputSize / 2, outputSize / 2);
                ctx.rotate((rotation * Math.PI) / 180);

                // Apply zoom and calculate draw dimensions
                const drawWidth = displayWidth * zoom * scale;
                const drawHeight = displayHeight * zoom * scale;
                
                // Position offset: divide by zoom because CSS transform does translate before scale
                const offsetX = (position.x / zoom) * scale;
                const offsetY = (position.y / zoom) * scale;
                
                ctx.drawImage(
                    img,
                    -drawWidth / 2 + offsetX,
                    -drawHeight / 2 + offsetY,
                    drawWidth,
                    drawHeight
                );

                // Restore context
                ctx.restore();
                resolve();
            };
            img.onerror = () => {
                console.error('Failed to load image for cropping');
                resolve();
            };
            img.src = originalImage;
        });
    }, [originalImage, zoom, rotation, position]);

    useEffect(() => {
        if (imageEditorOpen && originalImage) {
            cropCircleImage();
        }
    }, [imageEditorOpen, originalImage, zoom, rotation, position, cropCircleImage]);

    const handleSaveImage = async () => {
        if (!canvasRef.current || !originalImage) return;

        // Wait for the image to be cropped first
        await cropCircleImage();
        
        // Small delay to ensure canvas is fully rendered
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const croppedImage = canvas.toDataURL('image/jpeg', 0.8);
        
        // Verify that the image is not empty/black
        if (croppedImage && croppedImage.length > 100) {
            // Store the cropped image for later upload and show preview
            setPendingAvatarUpload(croppedImage);
            setAvatarPreview(croppedImage);
            setImageEditorOpen(false);
            
        } else {
            toastr.error(t('error_process_image', 'ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองใหม่อีกครั้ง'));
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        setPosition({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y,
        });
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    const handleSubmit = async () => {
        // Validate first name
        if (!formData.firstName.trim()) {
            toastr.warning(t('error_first_name_required', 'กรุณากรอกชื่อ'));
            return;
        }

        // Validate last name
        if (!formData.lastName.trim()) {
            toastr.warning(t('error_last_name_required', 'กรุณากรอกนามสกุล'));
            return;
        }

        // Password validations when section is open or any field filled
        const wantsPasswordChange = changePasswordOpen || currentPassword || newPassword || confirmPassword;
        if (wantsPasswordChange) {
            if (!currentPassword) {
                toastr.warning(t('error_current_password_required', 'กรุณากรอกรหัสผ่านปัจจุบัน'));
                return;
            }
            if (!newPassword) {
                toastr.warning(t('error_new_password_required', 'กรุณากรอกรหัสผ่านใหม่'));
                return;
            }
            if (newPassword.length < 6) {
                toastr.warning(t('error_password_length', 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'));
                return;
            }
            if (newPassword !== confirmPassword) {
                toastr.warning(t('error_password_mismatch', 'รหัสผ่านใหม่และยืนยันไม่ตรงกัน'));
                return;
            }
        }

        setIsSaving(true);

        try {
            let avatarPath = profile?.avatar || null;

            // Upload avatar if there's a pending upload
            if (pendingAvatarUpload) {
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        image: pendingAvatarUpload,
                        type: 'avatar',
                    }),
                });

                if (!uploadRes.ok) {
                    const uploadData = await uploadRes.json().catch(() => ({ error: t('error_upload_image', 'อัพโหลดรูปภาพไม่สำเร็จ') }));
                    throw new Error(uploadData.error || t('error_upload_image', 'อัพโหลดรูปภาพไม่สำเร็จ'));
                }
                
                const uploadData = await uploadRes.json();
                avatarPath = uploadData.path;
            }

            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email || null,
                    company: formData.company,
                    employeeType: formData.employeeType,
                    department: formData.departmentId,
                    section: formData.sectionId || null,
                    shift: formData.shift || null,
                    gender: formData.gender || null,
                    avatar: avatarPath,
                    ...(wantsPasswordChange
                        ? {
                              currentPassword,
                              newPassword,
                              confirmPassword,
                          }
                        : {}),
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({ error: t('error_save_profile', 'เกิดข้อผิดพลาดในการบันทึก') }));
                throw new Error(data.error || t('error_save_profile', 'เกิดข้อผิดพลาดในการบันทึก'));
            }

            // Refresh user data in global context
            await refetchUser();

            toastr.success(t('success_save_profile', 'บันทึกข้อมูลสำเร็จ'));
            // Reset password fields
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setChangePasswordOpen(false);
            
            // Delay navigation to allow toastr to show
            setTimeout(() => {
                router.push('/profile');
            }, 800);

        } catch (err) {
            toastr.error(err instanceof Error ? err.message : t('error_save_profile', 'เกิดข้อผิดพลาดในการบันทึก'));
        } finally {
            setIsSaving(false);
        }
    };

    const openDrawer = (type: 'company' | 'employeeType' | 'department' | 'section' | 'shift' | 'gender') => {
        setDrawerType(type);
        
        switch (type) {
            case 'company':
                setDrawerTitle(t('select_company', 'เลือกบริษัท'));
                setDrawerOptions(companies.map(c => ({ value: c.code, label: c.name })));
                break;
            case 'employeeType':
                setDrawerTitle(t('select_employee_type', 'เลือกประเภทพนักงาน'));
                setDrawerOptions([
                    { value: 'daily', label: t('employee_type_daily', 'รายวัน') },
                    { value: 'monthly', label: t('employee_type_monthly', 'รายเดือน') },
                ]);
                break;
            case 'department':
                setDrawerTitle(t('select_department', 'เลือกฝ่าย'));
                setDrawerOptions(departments.map(d => ({ value: d.code, label: d.name })));
                break;
            case 'section':
                setDrawerTitle(t('select_section', 'เลือกแผนก'));
                setDrawerOptions(sections.map(s => ({ value: s.code, label: s.name })));
                break;
            case 'shift':
                setDrawerTitle(t('select_shift', 'เลือกกะทำงาน'));
                setDrawerOptions([
                    { value: '', label: t('not_specified', 'ไม่ระบุ') },
                    { value: 'day', label: t('shift_day', 'กะกลางวัน') },
                    { value: 'night', label: t('shift_night', 'กะกลางคืน') },
                    
                ]);
                break;
            case 'gender':
                setDrawerTitle(t('select_gender', 'เลือกเพศ'));
                setDrawerOptions([
                    { value: 'male', label: t('gender_male', 'ชาย') },
                    { value: 'female', label: t('gender_female', 'หญิง') },
                ]);
                break;
        }
        setDrawerOpen(true);
    };

    const handleDrawerSelect = (value: string) => {
        if (drawerType === 'company') {
            setFormData({ ...formData, company: value, departmentId: '', sectionId: '' });
            setDepartments([]);
            setSections([]);
        } else if (drawerType === 'employeeType') {
            setFormData({ ...formData, employeeType: value });
        } else if (drawerType === 'department') {
            setFormData({ ...formData, departmentId: value, sectionId: '' });
            setSections([]);
        } else if (drawerType === 'section') {
            setFormData({ ...formData, sectionId: value });
        } else if (drawerType === 'shift') {
            setFormData({ ...formData, shift: value });
        } else if (drawerType === 'gender') {
            setFormData({ ...formData, gender: value });
        }
        setDrawerOpen(false);
    };

    const getDisplayValue = (type: 'company' | 'employeeType' | 'department' | 'section' | 'shift' | 'gender') => {
        switch (type) {
            case 'company':
                const company = companies.find(c => c.code === formData.company);
                return company?.name || profile?.companyName || '';
            case 'employeeType':
                return formData.employeeType === 'daily' ? t('employee_type_daily', 'รายวัน') : formData.employeeType === 'monthly' ? t('employee_type_monthly', 'รายเดือน') : '';
            case 'department':
                const dept = departments.find(d => d.code === formData.departmentId || d.name === formData.departmentId);
                return dept?.name || profile?.departmentName || '';
            case 'section':
                const sec = sections.find(s => s.code === formData.sectionId || s.name === formData.sectionId);
                return sec?.name || profile?.sectionName || '';
            case 'shift':
                const shifts: Record<string, string> = { day: t('shift_day', 'กะกลางวัน'), night: t('shift_night', 'กะกลางคืน') };
                return formData.shift ? shifts[formData.shift] || formData.shift : '';
            case 'gender':
                const genders: Record<string, string> = { male: t('gender_male', 'ชาย'), female: t('gender_female', 'หญิง') };
                return formData.gender ? genders[formData.gender] || formData.gender : '';
        }
    };

    const getInitials = () => {
        if (formData.firstName && formData.lastName) {
            return `${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}`;
        }
        return '';
    };

    // Format date for display
    const formatThaiDate = (dateString: string) => {
        if (!dateString) return '';
        const date = dayjs(dateString).locale(locale);
        const year = locale === 'th' ? date.year() + 543 : date.year();
        return `${date.date()} ${date.format('MMMM')} ${year}`;
    };

    const showLoading = !mounted || loadingProfile;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#F8F9FA' }}>
            {/* Header with Gradient */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    pt: 'calc(env(safe-area-inset-top, 0px) + 24px)',
                    pb: 2,
                    px: 2,
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                            onClick={() => router.push('/profile')}
                            sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
                            }}
                        >
                            <ArrowLeft2 size={20} color="white" />
                        </IconButton>
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 500 , fontSize: '1rem'}}>
                            {t('edit_profile_title', 'แก้ไขโปรไฟล์')}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{ p: 2, pb: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}>
                {showLoading ? (
                    <>
                        {/* Avatar Skeleton */}
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, mt: 2 }}>
                            <Skeleton variant="circular" width={120} height={120} />
                        </Box>
                        {/* Form Skeleton */}
                        <Paper sx={{ p: 2, borderRadius: 2 }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <Box key={i} sx={{ mb: 2.5 }}>
                                    <Skeleton variant="text" width={80} height={20} sx={{ mb: 0.5 }} />
                                    <Skeleton variant="rounded" height={48} />
                                </Box>
                            ))}
                        </Paper>
                    </>
                ) : (
                    <>
                        {/* Avatar Section */}
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, mt: 2 }}>
                            <Box sx={{ position: 'relative' }}>
                                <Avatar
                                    src={avatarPreview || undefined}
                                    sx={{
                                        width: 120,
                                        height: 120,
                                        background: avatarPreview ? 'transparent' : 'linear-gradient(135deg, #1b194b 0%, #2d2a6e 100%)',
                                        fontSize: '3rem',
                                        fontWeight: 700,
                                        boxShadow: '0 8px 24px rgba(27, 25, 75, 0.3)',
                                        border: '4px solid white',
                                    }}
                                >
                                    {!avatarPreview && getInitials()}
                                </Avatar>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    onChange={handleImageSelect}
                                />
                                <IconButton
                                    onClick={() => fileInputRef.current?.click()}
                                    sx={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        width: 40,
                                        height: 40,
                                        bgcolor:'white',
                                        color: 'white',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                        '&:hover': { bgcolor: 'white' },
                                    }}
                                >
                                    <Camera size={20} color="#764ba2" variant='Bold'/>
                                </IconButton>
                            </Box>
                        </Box>

                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', mb: 3 }}>
                            {t('tap_camera_to_change', 'แตะที่ไอคอนกล้องเพื่อเปลี่ยนรูปโปรไฟล์')}
                        </Typography>

                        {/* Form */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: 1,
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                                border: '1px solid rgba(0, 0, 0, 0.05)',
                            }}
                        >
                            {/* Employee ID (Read-only) */}
                            <Box sx={{ mb: 2.5 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                    {t('employee_id', 'รหัสพนักงาน')}
                                </Typography>
                                <TextField
                                    id="edit-employeeId"
                                    fullWidth
                                    size="small"
                                    value={formData.employeeId}
                                    disabled
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <HashtagSquare size={18} color="#9e9e9e" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: '#f5f5f5',
                                        },
                                    }}
                                />
                            </Box>

                            {/* First Name */}
                            <Box sx={{ mb: 2.5 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                    {t('first_name_required', 'ชื่อ *')}
                                </Typography>
                                <TextField
                                    id="edit-firstName"
                                    fullWidth
                                    size="small"
                                    value={formData.firstName}
                                    onChange={handleChange('firstName')}
                                    placeholder={t('placeholder_first_name', 'กรอกชื่อ')}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <User size={18} color="#1b194b" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '&:focus-within': {
                                                '& fieldset': { borderColor: '#1b194b' },
                                            },
                                        },
                                    }}
                                />
                            </Box>

                            {/* Last Name */}
                            <Box sx={{ mb: 2.5 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                    {t('last_name_required', 'นามสกุล *')}
                                </Typography>
                                <TextField
                                    id="edit-lastName"
                                    fullWidth
                                    size="small"
                                    value={formData.lastName}
                                    onChange={handleChange('lastName')}
                                    placeholder={t('placeholder_last_name', 'กรอกนามสกุล')}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <User size={18} color="#1b194b" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '&:focus-within': {
                                                '& fieldset': { borderColor: '#1b194b' },
                                            },
                                        },
                                    }}
                                />
                            </Box>

                            
                            {/* Gender */}
                            <Box sx={{ mb: 2.5 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                    {t('gender', 'เพศ')}
                                </Typography>
                                <TextField
                                    id="edit-gender"
                                    fullWidth
                                    size="small"
                                    value={getDisplayValue('gender')}
                                    onClick={() => openDrawer('gender')}
                                    placeholder={t('placeholder_gender', 'เลือกเพศ')}
                                    InputProps={{
                                        readOnly: true,
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <User size={18} color="#1b194b" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: <ArrowDown2 size={18} color="#9e9e9e" />,
                                    }}
                                    sx={{ cursor: 'pointer' }}
                                />
                            </Box>

                            {/* Email */}
                            <Box sx={{ mb: 2.5 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                    {t('email', 'อีเมล')}
                                </Typography>
                                <TextField
                                    id="edit-email"
                                    fullWidth
                                    size="small"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange('email')}
                                    placeholder="example@company.com"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Sms size={18} color="#1b194b" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '&:focus-within': {
                                                '& fieldset': { borderColor: '#1b194b' },
                                            },
                                        },
                                    }}
                                />
                            </Box>

                            {/* Company */}
                            <Box sx={{ mb: 2.5 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                    {t('company', 'บริษัท')}
                                </Typography>
                                <TextField
                                    id="edit-company"
                                    fullWidth
                                    size="small"
                                    value={getDisplayValue('company')}
                                    onClick={() => openDrawer('company')}
                                    placeholder={t('placeholder_company', 'เลือกบริษัท')}
                                    InputProps={{
                                        readOnly: true,
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Building size={18} color="#1b194b" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: loadingCompanies ? (
                                            <CircularProgress size={18} />
                                        ) : (
                                            <ArrowDown2 size={18} color="#9e9e9e" />
                                        ),
                                    }}
                                    sx={{ cursor: 'pointer' }}
                                />
                            </Box>

                            {/* Employee Type */}
                            <Box sx={{ mb: 2.5 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                    {t('employee_type', 'ประเภทพนักงาน')}
                                </Typography>
                                <TextField
                                    id="edit-employeeType"
                                    fullWidth
                                    size="small"
                                    value={getDisplayValue('employeeType')}
                                    onClick={() => openDrawer('employeeType')}
                                    placeholder={t('placeholder_employee_type', 'เลือกประเภทพนักงาน')}
                                    InputProps={{
                                        readOnly: true,
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Briefcase size={18} color="#1b194b" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: <ArrowDown2 size={18} color="#9e9e9e" />,
                                    }}
                                    sx={{ cursor: 'pointer' }}
                                />
                            </Box>

                            {/* Department */}
                            <Box sx={{ mb: 2.5 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                    {t('department', 'ฝ่าย')}
                                </Typography>
                                <TextField
                                    id="edit-department"
                                    fullWidth
                                    size="small"
                                    value={getDisplayValue('department')}
                                    onClick={() => formData.company && openDrawer('department')}
                                    placeholder={formData.company ? t('placeholder_department', 'เลือกฝ่าย') : t('select_company_first', 'กรุณาเลือกบริษัทก่อน')}
                                    disabled={!formData.company}
                                    InputProps={{
                                        readOnly: true,
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Briefcase size={18} color="#1b194b" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: loadingDepartments ? (
                                            <CircularProgress size={18} />
                                        ) : (
                                            <ArrowDown2 size={18} color="#9e9e9e" />
                                        ),
                                    }}
                                    sx={{ cursor: formData.company ? 'pointer' : 'default' }}
                                />
                            </Box>

                            {/* Section */}
                            <Box sx={{ mb: 2.5 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                    {t('section', 'แผนก')}
                                </Typography>
                                <TextField
                                    id="edit-section"
                                    fullWidth
                                    size="small"
                                    value={getDisplayValue('section')}
                                    onClick={() => formData.departmentId && sections.length > 0 && openDrawer('section')}
                                    placeholder={formData.departmentId ? (sections.length > 0 ? t('placeholder_section', 'เลือกแผนก') : t('no_section', 'ไม่มีแผนก')) : t('select_department_first', 'กรุณาเลือกฝ่ายก่อน')}
                                    disabled={!formData.departmentId || sections.length === 0}
                                    InputProps={{
                                        readOnly: true,
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Location size={18} color="#1b194b" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: loadingSections ? (
                                            <CircularProgress size={18} />
                                        ) : (
                                            <ArrowDown2 size={18} color="#9e9e9e" />
                                        ),
                                    }}
                                    sx={{ cursor: formData.departmentId && sections.length > 0 ? 'pointer' : 'default' }}
                                />
                            </Box>

                            {/* Shift */}
                            <Box sx={{ mb: 2.5 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                    {t('shift', 'กะทำงาน')}
                                </Typography>
                                <TextField
                                    id="edit-shift"
                                    fullWidth
                                    size="small"
                                    value={getDisplayValue('shift')}
                                    onClick={() => openDrawer('shift')}
                                    placeholder={t('placeholder_shift', 'เลือกกะทำงาน')}
                                    InputProps={{
                                        readOnly: true,
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Clock size={18} color="#1b194b" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: <ArrowDown2 size={18} color="#9e9e9e" />,
                                    }}
                                    sx={{ cursor: 'pointer' }}
                                />
                            </Box>


                            {/* Start Date (Read-only) */}
                            <Box sx={{ mb: 1 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                    {t('start_date', 'วันที่เริ่มงาน')}
                                </Typography>
                                <TextField
                                    id="edit-startDate"
                                    fullWidth
                                    size="small"
                                    value={formatThaiDate(formData.startDate)}
                                    disabled
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Calendar size={18} color="#9e9e9e" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: '#f5f5f5',
                                        },
                                    }}
                                />
                            </Box>

                                {/* Change Password Section */}
                                <Box sx={{ mt: 3 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                            {t('change_password', 'เปลี่ยนรหัสผ่าน')}
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => setChangePasswordOpen((v) => !v)}
                                            sx={{ borderColor: '#1b194b', color: '#1b194b' }}
                                        >
                                            {changePasswordOpen ? t('hide', 'ซ่อน') : t('show', 'แสดง')}
                                        </Button>
                                    </Box>

                                    {changePasswordOpen && (
                                        <>
                                            {/* Current Password */}
                                            <Box sx={{ mb: 2 }}>
                                                <TextField
                                                    id="edit-currentPassword"
                                                    fullWidth
                                                    size="small"
                                                    type={showCurrent ? 'text' : 'password'}
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    placeholder={t('current_password', 'รหัสผ่านปัจจุบัน')}
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconButton onClick={() => setShowCurrent((v) => !v)} edge="end">
                                                                    {showCurrent ? <EyeSlash size={18} /> : <Eye size={18} />}
                                                                </IconButton>
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                />
                                            </Box>

                                            {/* New Password */}
                                            <Box sx={{ mb: 2 }}>
                                                <TextField
                                                    id="edit-newPassword"
                                                    fullWidth
                                                    size="small"
                                                    type={showNew ? 'text' : 'password'}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder={t('new_password_placeholder', 'รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)')}
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconButton onClick={() => setShowNew((v) => !v)} edge="end">
                                                                    {showNew ? <EyeSlash size={18} /> : <Eye size={18} />}
                                                                </IconButton>
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                />
                                            </Box>

                                            {/* Confirm Password */}
                                            <Box sx={{ mb: 1 }}>
                                                <TextField
                                                    id="edit-confirmPassword"
                                                    fullWidth
                                                    size="small"
                                                    type={showConfirm ? 'text' : 'password'}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder={t('confirm_new_password', 'ยืนยันรหัสผ่านใหม่')}
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconButton onClick={() => setShowConfirm((v) => !v)} edge="end">
                                                                    {showConfirm ? <EyeSlash size={18} /> : <Eye size={18} />}
                                                                </IconButton>
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                />
                                            </Box>
                                        </>
                                    )}
                                </Box>
                        </Paper>
                    </>
                )}
            </Box>

            {/* Fixed Footer - Save Button */}
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
                    pt: 2,
                    pb: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
                    zIndex: 100,
                }}
            >
                <Box sx={{ maxWidth: 560, mx: 'auto' }}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={handleSubmit}
                        disabled={isSaving}
                        startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <TickSquare color="white" size={18} />}
                        sx={{
                            py: 1.5,
                            borderRadius: 2,
                            bgcolor: '#667eea',
                            fontWeight: 600,
                            fontSize: '1rem',
                            '&:hover': {
                                bgcolor: '#667eea',
                            },
                            '&:disabled': {
                                bgcolor: '#ccc',
                            },
                        }}
                    >
                        {isSaving ? t('saving', 'กำลังบันทึก...') : t('save', 'บันทึกข้อมูล')}
                    </Button>
                </Box>
            </Box>

            {/* Bottom Drawer for Selection */}
            <Drawer
                anchor="bottom"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                PaperProps={{
                    sx: {
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        maxHeight: '70vh',
                    },
                }}
            >
                <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 4,
                            bgcolor: '#ddd',
                            borderRadius: 2,
                            mx: 'auto',
                            mb: 2,
                        }}
                    />
                    <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center' }}>
                        {drawerTitle}
                    </Typography>
                </Box>
                <List sx={{ overflow: 'auto' }}>
                    {drawerOptions.map((option) => {
                        let isSelected = false;
                        if (drawerType === 'company') isSelected = formData.company === option.value;
                        else if (drawerType === 'employeeType') isSelected = formData.employeeType === option.value;
                        else if (drawerType === 'department') isSelected = formData.departmentId === option.value;
                        else if (drawerType === 'section') isSelected = formData.sectionId === option.value;
                        else if (drawerType === 'shift') isSelected = formData.shift === option.value;
                        else if (drawerType === 'gender') isSelected = formData.gender === option.value;

                        return (
                            <ListItem key={option.value} disablePadding>
                                <ListItemButton
                                    onClick={() => handleDrawerSelect(option.value)}
                                    sx={{
                                        py: 1.5,
                                        bgcolor: isSelected ? 'rgba(27, 25, 75, 0.08)' : 'transparent',
                                    }}
                                >
                                    <ListItemText
                                        primary={option.label}
                                        primaryTypographyProps={{
                                            fontWeight: isSelected ? 600 : 400,
                                            color: isSelected ? '#1b194b' : 'text.primary',
                                        }}
                                    />
                                    {isSelected && (
                                        <ListItemIcon sx={{ minWidth: 'auto' }}>
                                            <TickCircle size={20} color="#1b194b" />
                                        </ListItemIcon>
                                    )}
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Drawer>

            {/* Image Editor Dialog */}
            <Dialog
                open={imageEditorOpen}
                onClose={() => setImageEditorOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 1 },
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Typography component="span" variant="h6" sx={{ fontWeight: 700 }}>
                        {t('edit_image', 'ปรับแต่งรูปภาพ')}
                    </Typography>
                    <IconButton onClick={() => setImageEditorOpen(false)} size="small">
                        <CloseCircle size={20} />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {/* Image Preview Container */}
                        <Box
                            sx={{
                                position: 'relative',
                                width: '100%',
                                height: 300,
                                bgcolor: '#1a1a1a',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {/* Original Image */}
                            {originalImage && (
                                <Box
                                    component="img"
                                    src={originalImage}
                                    sx={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                                        cursor: isDragging ? 'grabbing' : 'grab',
                                        userSelect: 'none',
                                        pointerEvents: 'none',
                                    }}
                                    draggable={false}
                                />
                            )}
                            
                            {/* Crop Circle Overlay */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    pointerEvents: 'none',
                                }}
                            >
                                {/* Dark overlay with circle cutout using SVG */}
                                <svg width="100%" height="100%" style={{ position: 'absolute' }}>
                                    <defs>
                                        <mask id="circleMask">
                                            <rect width="100%" height="100%" fill="white" />
                                            <circle cx="50%" cy="50%" r="100" fill="black" />
                                        </mask>
                                    </defs>
                                    <rect 
                                        width="100%" 
                                        height="100%" 
                                        fill="rgba(0,0,0,0.6)" 
                                        mask="url(#circleMask)" 
                                    />
                                    <circle 
                                        cx="50%" 
                                        cy="50%" 
                                        r="100" 
                                        fill="none" 
                                        stroke="white" 
                                        strokeWidth="2"
                                        strokeDasharray="8 4"
                                    />
                                </svg>
                            </Box>

                            {/* Drag Area (invisible) */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    cursor: isDragging ? 'grabbing' : 'grab',
                                    touchAction: 'none',
                                }}
                                onMouseDown={(e) => {
                                    setIsDragging(true);
                                    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
                                }}
                                onMouseMove={(e) => {
                                    if (!isDragging) return;
                                    setPosition({
                                        x: e.clientX - dragStart.x,
                                        y: e.clientY - dragStart.y,
                                    });
                                }}
                                onMouseUp={() => setIsDragging(false)}
                                onMouseLeave={() => setIsDragging(false)}
                                onTouchStart={(e) => {
                                    const touch = e.touches[0];
                                    setIsDragging(true);
                                    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
                                }}
                                onTouchMove={(e) => {
                                    if (!isDragging) return;
                                    const touch = e.touches[0];
                                    setPosition({
                                        x: touch.clientX - dragStart.x,
                                        y: touch.clientY - dragStart.y,
                                    });
                                }}
                                onTouchEnd={() => setIsDragging(false)}
                            />
                        </Box>

                        {/* Controls */}
                        <Box sx={{ width: '100%', p: 2, pt: 2 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textAlign: 'center', mb: 2 }}>
                                {t('drag_to_adjust', 'ลากเพื่อปรับตำแหน่ง • ใช้ slider เพื่อซูม')}
                            </Typography>

                            {/* Zoom Control */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <SearchZoomOut size={20} color="#666" />
                                <Slider
                                    value={zoom}
                                    onChange={(_, value) => setZoom(value as number)}
                                    min={0.5}
                                    max={3}
                                    step={0.05}
                                    sx={{
                                        color: '#1b194b',
                                        '& .MuiSlider-thumb': {
                                            bgcolor: '#1b194b',
                                        },
                                    }}
                                />
                                <SearchZoomIn size={20} color="#666" />
                            </Box>

                            {/* Rotation Control */}
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => setRotation((r) => r - 90)}
                                    startIcon={<RotateRight size={16} style={{ transform: 'scaleX(-1)' }} />}
                                    sx={{ borderColor: '#1b194b', color: '#1b194b' }}
                                >
                                    {t('rotate_left', 'หมุนซ้าย')}
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => {
                                        setZoom(1);
                                        setRotation(0);
                                        setPosition({ x: 0, y: 0 });
                                    }}
                                    sx={{ borderColor: '#999', color: '#666' }}
                                >
                                    {t('reset', 'รีเซ็ต')}
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => setRotation((r) => r + 90)}
                                    startIcon={<RotateRight size={16} />}
                                    sx={{ borderColor: '#1b194b', color: '#1b194b' }}
                                >
                                    {t('rotate_right', 'หมุนขวา')}
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button 
                        onClick={() => setImageEditorOpen(false)}
                        sx={{ color: '#666' }}
                    >
                        {t('cancel', 'ยกเลิก')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveImage}
                        sx={{
                            bgcolor: '#1b194b',
                            '&:hover': { bgcolor: '#2d2a6e' },
                        }}
                    >
                        {t('save_image', 'บันทึกรูปภาพ')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Hidden canvas for image processing - placed outside Dialog to ensure it's always available */}
            <canvas
                ref={canvasRef}
                width={200}
                height={200}
                style={{ 
                    position: 'fixed',
                    left: '-9999px',
                    top: '-9999px',
                    pointerEvents: 'none',
                }}
            />
        </Box>
    );
}
