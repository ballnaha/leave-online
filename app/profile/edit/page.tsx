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
    SearchZoomIn,
    SearchZoomOut,
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
    position: string | null;
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
    const originalImageUrlRef = useRef<string | null>(null);

    const [formData, setFormData] = useState({
        company: '',
        employeeType: '',
        firstName: '',
        lastName: '',
        employeeId: '',
        departmentId: '',
        sectionId: '',
        position: '',
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

    // Use refs for gesture tracking to avoid re-renders during drag/pinch
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const gestureRef = useRef({
        isDragging: false,
        isPinching: false,
        dragStart: { x: 0, y: 0 },
        initialPinchDistance: 0,
        initialZoom: 1,
        lastTouchCenter: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        currentZoom: 1,
        animationFrameId: 0,
    });

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
                position: data.position || '',
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

    const createPreparedImageUrl = useCallback(async (file: File): Promise<string> => {
        // For avatar cropping we don't need extremely large bitmaps; downscale to reduce mobile flicker.
        const MAX_DIMENSION = 1600;
        const JPEG_QUALITY = 0.9;

        try {
            // Prefer createImageBitmap for faster decode off-main-thread (where supported).
            // imageOrientation helps on iOS for correct rotation.
            const bitmap = await (createImageBitmap as any)(file, { imageOrientation: 'from-image' });
            const sourceWidth = (bitmap as ImageBitmap).width;
            const sourceHeight = (bitmap as ImageBitmap).height;

            const maxSide = Math.max(sourceWidth, sourceHeight);
            if (maxSide <= MAX_DIMENSION) {
                (bitmap as any).close?.();
                return URL.createObjectURL(file);
            }

            const scale = MAX_DIMENSION / maxSide;
            const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
            const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) {
                (bitmap as any).close?.();
                return URL.createObjectURL(file);
            }
            ctx.drawImage(bitmap as ImageBitmap, 0, 0, targetWidth, targetHeight);
            (bitmap as any).close?.();

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (b) => (b ? resolve(b) : reject(new Error('Failed to create resized image blob'))),
                    'image/jpeg',
                    JPEG_QUALITY
                );
            });

            return URL.createObjectURL(blob);
        } catch (e) {
            // Fallback: use original file object URL
            return URL.createObjectURL(file);
        }
    }, []);

    // Cleanup object URL on unmount
    useEffect(() => {
        return () => {
            if (originalImageUrlRef.current) {
                URL.revokeObjectURL(originalImageUrlRef.current);
                originalImageUrlRef.current = null;
            }
        };
    }, []);

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

        void (async () => {
            // Use object URL (better performance + less flicker on mobile than base64)
            if (originalImageUrlRef.current) {
                URL.revokeObjectURL(originalImageUrlRef.current);
                originalImageUrlRef.current = null;
            }

            // Reset gesture ref
            gestureRef.current.currentZoom = 1;
            gestureRef.current.currentPosition = { x: 0, y: 0 };

            // Prepare (downscale if needed) before opening editor to avoid flicker on large images
            const preparedUrl = await createPreparedImageUrl(file);
            originalImageUrlRef.current = preparedUrl;

            // Batch state updates
            setOriginalImage(preparedUrl);
            setZoom(1);
            setRotation(0);
            setPosition({ x: 0, y: 0 });
            setImageEditorOpen(true);
        })();

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
            img.onload = () => {
                const outputSize = 200; // Final output size
                const previewCropSize = 280; // Size of the circular crop overlay in the preview

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

                // Get actual preview container size
                const container = containerRef.current;
                const previewWidth = container?.clientWidth || window.innerWidth;
                const previewHeight = container?.clientHeight || (window.innerHeight - 150);

                const imgAspect = img.width / img.height;
                const containerAspect = previewWidth / previewHeight;

                // Calculate how image is displayed with object-fit: contain
                // Note: The image has maxWidth: 100%, maxHeight: 100%
                // It scales down to fit, but does not scale up if smaller than container
                let fitWidth, fitHeight;
                if (imgAspect > containerAspect) {
                    fitWidth = previewWidth;
                    fitHeight = previewWidth / imgAspect;
                } else {
                    fitHeight = previewHeight;
                    fitWidth = previewHeight * imgAspect;
                }

                const displayWidth = Math.min(fitWidth, img.width);
                const displayHeight = Math.min(fitHeight, img.height);

                // Scale factor: from preview crop circle to output canvas
                const scale = outputSize / previewCropSize;

                // Calculate image dimensions in canvas pixels (unzoomed)
                const baseWidth = displayWidth * scale;
                const baseHeight = displayHeight * scale;

                // Calculate center position in canvas pixels
                // The image center is at (outputSize/2, outputSize/2) + (position * scale)
                // This translation must be applied BEFORE rotation and zoom
                const centerX = outputSize / 2 + (position.x * scale);
                const centerY = outputSize / 2 + (position.y * scale);

                // Move to the calculated center
                ctx.translate(centerX, centerY);

                // Apply rotation
                ctx.rotate((rotation * Math.PI) / 180);

                // Apply zoom scale
                ctx.scale(zoom, zoom);

                // Draw image centered at (0,0) in the transformed context
                ctx.drawImage(
                    img,
                    -baseWidth / 2,
                    -baseHeight / 2,
                    baseWidth,
                    baseHeight
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

    // Reset gesture ref when editor opens
    useEffect(() => {
        if (imageEditorOpen) {
            gestureRef.current.currentPosition = position;
            gestureRef.current.currentZoom = zoom;
        }
    }, [imageEditorOpen, position, zoom]);

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
            // Close editor first, then update avatar after a small delay
            // This prevents the flashing effect when the drawer closes
            setImageEditorOpen(false);

            // Wait for drawer to close before updating avatar
            requestAnimationFrame(() => {
                setPendingAvatarUpload(croppedImage);
                setAvatarPreview(croppedImage);
            });

        } else {
            toastr.error(t('error_process_image', 'ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองใหม่อีกครั้ง'));
        }
    };

    // Optimized: Update image transform directly without state
    const updateImageTransform = useCallback(() => {
        if (imageRef.current) {
            const { currentZoom, currentPosition } = gestureRef.current;
            imageRef.current.style.transform = `translate3d(${currentPosition.x}px, ${currentPosition.y}px, 0) scale(${currentZoom}) rotate(${rotation}deg)`;
        }
    }, [rotation]);

    // Calculate distance between two touch points
    const getTouchDistance = (touches: React.TouchList) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    // Calculate center point between two touches
    const getTouchCenter = (touches: React.TouchList) => {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2,
        };
    };

    const handleGestureStart = (clientX: number, clientY: number, touches?: React.TouchList) => {
        const gesture = gestureRef.current;

        if (touches && touches.length === 2) {
            // Pinch gesture start
            gesture.isPinching = true;
            gesture.isDragging = false;
            gesture.initialPinchDistance = getTouchDistance(touches);
            gesture.initialZoom = gesture.currentZoom;
            gesture.lastTouchCenter = getTouchCenter(touches);
        } else {
            // Single touch/mouse drag
            gesture.isDragging = true;
            gesture.isPinching = false;
            gesture.dragStart = {
                x: clientX - gesture.currentPosition.x,
                y: clientY - gesture.currentPosition.y,
            };
        }
    };

    const handleGestureMove = (clientX: number, clientY: number, touches?: React.TouchList) => {
        const gesture = gestureRef.current;

        if (touches && touches.length === 2 && gesture.isPinching) {
            // Pinch gesture move
            const currentDistance = getTouchDistance(touches);
            const scale = currentDistance / gesture.initialPinchDistance;
            gesture.currentZoom = Math.max(0.5, Math.min(3, gesture.initialZoom * scale));

            // Also allow panning while pinching
            const currentCenter = getTouchCenter(touches);
            gesture.currentPosition.x += currentCenter.x - gesture.lastTouchCenter.x;
            gesture.currentPosition.y += currentCenter.y - gesture.lastTouchCenter.y;
            gesture.lastTouchCenter = currentCenter;

            // Update transform using requestAnimationFrame
            cancelAnimationFrame(gesture.animationFrameId);
            gesture.animationFrameId = requestAnimationFrame(updateImageTransform);
        } else if (gesture.isDragging && !gesture.isPinching) {
            // Single touch/mouse drag
            gesture.currentPosition = {
                x: clientX - gesture.dragStart.x,
                y: clientY - gesture.dragStart.y,
            };

            // Update transform using requestAnimationFrame
            cancelAnimationFrame(gesture.animationFrameId);
            gesture.animationFrameId = requestAnimationFrame(updateImageTransform);
        }
    };

    const handleGestureEnd = (touches?: React.TouchList) => {
        const gesture = gestureRef.current;

        if (touches && touches.length < 2) {
            gesture.isPinching = false;
        }
        if (!touches || touches.length === 0) {
            gesture.isDragging = false;
            // Sync state with ref values when gesture ends
            setPosition({ ...gesture.currentPosition });
            setZoom(gesture.currentZoom);
        }
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length >= 2) e.preventDefault();
        const touch = e.touches[0];
        handleGestureStart(touch.clientX, touch.clientY, e.touches);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length >= 2) e.preventDefault();
        const touch = e.touches[0];
        handleGestureMove(touch.clientX, touch.clientY, e.touches);
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        handleGestureEnd(e.touches);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        handleGestureStart(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        handleGestureMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
        handleGestureEnd();
    };

    const handleSubmit = async () => {
        // Check if there's anything to save
        const wantsPasswordChange = changePasswordOpen || currentPassword || newPassword || confirmPassword;
        const hasAvatarChange = !!pendingAvatarUpload;

        if (!wantsPasswordChange && !hasAvatarChange) {
            toastr.info(t('no_changes', 'ไม่มีการเปลี่ยนแปลง'));
            router.push('/profile');
            return;
        }

        // Password validations when password change is requested
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

            // Build request body - only include avatar and password (other fields are read-only now)
            const requestBody: Record<string, unknown> = {
                // Keep existing values for read-only fields
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email || null,
                company: formData.company,
                employeeType: formData.employeeType,
                department: formData.departmentId,
                section: formData.sectionId || null,
                position: formData.position || null,
                shift: formData.shift || null,
                gender: formData.gender || null,
                // Updatable fields
                avatar: avatarPath,
            };

            // Add password fields if changing password
            if (wantsPasswordChange) {
                requestBody.currentPassword = currentPassword;
                requestBody.newPassword = newPassword;
                requestBody.confirmPassword = confirmPassword;
            }

            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
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
                    { value: 'shift_a', label: t('shift_day', 'กะ A') },
                    { value: 'shift_b', label: t('shift_night', 'กะ B') },

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
                const shifts: Record<string, string> = { shift_a: t('shift_day', 'กะ A'), shift_b: t('shift_night', 'กะ B') };
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1, maxWidth: 1200, mx: 'auto', width: '100%', px: { xs: 0.5, sm: 1, md: 2 } }}>
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
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 500, fontSize: '1rem' }}>
                            {t('profile_settings_title', 'ตั้งค่าโปรไฟล์')}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: 2, pb: 'calc(env(safe-area-inset-bottom, 0px) + 96px)', maxWidth: 1200, mx: 'auto' }}>
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
                                    key={avatarPreview?.substring(0, 50) || 'no-avatar'}
                                    src={avatarPreview || undefined}
                                    sx={{
                                        width: 120,
                                        height: 120,
                                        background: avatarPreview ? 'transparent' : 'linear-gradient(135deg, #1b194b 0%, #2d2a6e 100%)',
                                        fontSize: '3rem',
                                        fontWeight: 700,
                                        boxShadow: '0 8px 24px rgba(27, 25, 75, 0.3)',
                                        border: '4px solid white',
                                        transition: 'none',
                                        '& img': {
                                            transition: 'none',
                                        },
                                    }}
                                    imgProps={{
                                        loading: 'eager',
                                        decoding: 'sync',
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
                                        bgcolor: 'white',
                                        color: 'white',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                        '&:hover': { bgcolor: 'white' },
                                    }}
                                >
                                    <Camera size={20} color="#764ba2" variant='Bold' />
                                </IconButton>
                            </Box>
                        </Box>

                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', mb: 3 }}>
                            {t('tap_camera_to_change', 'แตะที่ไอคอนกล้องเพื่อเปลี่ยนรูปโปรไฟล์')}
                        </Typography>

                        {/* Profile Information Display - Read Only */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: 1,
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                                border: '1px solid rgba(0, 0, 0, 0.05)',
                            }}
                        >
                            {/* Section Title */}
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    color: '#667eea',
                                    fontWeight: 700,
                                    mb: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                }}
                            >
                                <User size={18} color="#667eea" />
                                {t('personal_info', 'ข้อมูลส่วนตัว')}
                            </Typography>

                            {/* Display Fields - Read Only */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {/* Employee ID */}
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    bgcolor: 'rgba(102, 126, 234, 0.04)',
                                    borderRadius: 1,
                                    border: '1px solid rgba(102, 126, 234, 0.1)',
                                }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(102, 126, 234, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <HashtagSquare size={18} color="#667eea" />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                                            {t('employee_id', 'รหัสพนักงาน')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1b194b' }}>
                                            {formData.employeeId || '-'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Full Name */}
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    bgcolor: 'rgba(102, 126, 234, 0.04)',
                                    borderRadius: 1,
                                    border: '1px solid rgba(102, 126, 234, 0.1)',
                                }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(102, 126, 234, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <User size={18} color="#667eea" />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                                            {t('full_name', 'ชื่อ - นามสกุล')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1b194b' }}>
                                            {formData.firstName} {formData.lastName}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Gender */}
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    bgcolor: 'rgba(102, 126, 234, 0.04)',
                                    borderRadius: 1,
                                    border: '1px solid rgba(102, 126, 234, 0.1)',
                                }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(102, 126, 234, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <User size={18} color="#667eea" />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                                            {t('gender', 'เพศ')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1b194b' }}>
                                            {getDisplayValue('gender') || '-'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Email */}
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    bgcolor: 'rgba(102, 126, 234, 0.04)',
                                    borderRadius: 1,
                                    border: '1px solid rgba(102, 126, 234, 0.1)',
                                }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(102, 126, 234, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Sms size={18} color="#667eea" />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                                            {t('email', 'อีเมล')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1b194b' }}>
                                            {formData.email || '-'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </Paper>

                        {/* Work Information Display - Read Only */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: 1,
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                                border: '1px solid rgba(0, 0, 0, 0.05)',
                                mt: 2,
                            }}
                        >
                            {/* Section Title */}
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    color: '#764ba2',
                                    fontWeight: 700,
                                    mb: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                }}
                            >
                                <Briefcase size={18} color="#764ba2" />
                                {t('work_info', 'ข้อมูลการทำงาน')}
                            </Typography>

                            {/* Display Fields - Read Only */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {/* Company */}
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    bgcolor: 'rgba(118, 75, 162, 0.04)',
                                    borderRadius: 1,
                                    border: '1px solid rgba(118, 75, 162, 0.1)',
                                }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(118, 75, 162, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Building size={18} color="#764ba2" />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                                            {t('company', 'บริษัท')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1b194b' }}>
                                            {getDisplayValue('company') || '-'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Employee Type */}
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    bgcolor: 'rgba(118, 75, 162, 0.04)',
                                    borderRadius: 1,
                                    border: '1px solid rgba(118, 75, 162, 0.1)',
                                }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(118, 75, 162, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Briefcase size={18} color="#764ba2" />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                                            {t('employee_type', 'ประเภทพนักงาน')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1b194b' }}>
                                            {getDisplayValue('employeeType') || '-'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Department */}
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    bgcolor: 'rgba(118, 75, 162, 0.04)',
                                    borderRadius: 1,
                                    border: '1px solid rgba(118, 75, 162, 0.1)',
                                }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(118, 75, 162, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Briefcase size={18} color="#764ba2" />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                                            {t('department', 'ฝ่าย')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1b194b' }}>
                                            {getDisplayValue('department') || '-'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Section */}
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    bgcolor: 'rgba(118, 75, 162, 0.04)',
                                    borderRadius: 1,
                                    border: '1px solid rgba(118, 75, 162, 0.1)',
                                }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(118, 75, 162, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Location size={18} color="#764ba2" />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                                            {t('section', 'แผนก')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1b194b' }}>
                                            {getDisplayValue('section') || '-'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Position */}
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    bgcolor: 'rgba(118, 75, 162, 0.04)',
                                    borderRadius: 1,
                                    border: '1px solid rgba(118, 75, 162, 0.1)',
                                }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(118, 75, 162, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Briefcase size={18} color="#764ba2" />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                                            {t('position', 'ตำแหน่ง')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1b194b' }}>
                                            {formData.position || '-'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Shift */}
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    bgcolor: 'rgba(118, 75, 162, 0.04)',
                                    borderRadius: 1,
                                    border: '1px solid rgba(118, 75, 162, 0.1)',
                                }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(118, 75, 162, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Clock size={18} color="#764ba2" />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                                            {t('shift', 'กะทำงาน')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1b194b' }}>
                                            {getDisplayValue('shift') || '-'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Start Date */}
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    bgcolor: 'rgba(118, 75, 162, 0.04)',
                                    borderRadius: 1,
                                    border: '1px solid rgba(118, 75, 162, 0.1)',
                                }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(118, 75, 162, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Calendar size={18} color="#764ba2" />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                                            {t('start_date', 'วันที่เริ่มงาน')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1b194b' }}>
                                            {formatThaiDate(formData.startDate) || '-'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </Paper>

                        {/* Change Password Section */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: 1,
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                                border: '1px solid rgba(0, 0, 0, 0.05)',
                                mt: 2,
                            }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: changePasswordOpen ? 2 : 0 }}>
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        color: '#e74c3c',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <Eye size={18} color="#e74c3c" />
                                    {t('change_password', 'เปลี่ยนรหัสผ่าน')}
                                </Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => setChangePasswordOpen((v) => !v)}
                                    sx={{
                                        borderColor: '#e74c3c',
                                        color: '#e74c3c',
                                        '&:hover': {
                                            borderColor: '#c0392b',
                                            bgcolor: 'rgba(231, 76, 60, 0.04)',
                                        },
                                    }}
                                >
                                    {changePasswordOpen ? t('hide', 'ซ่อน') : t('show', 'แสดง')}
                                </Button>
                            </Box>

                            {changePasswordOpen && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {/* Current Password */}
                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                            {t('current_password', 'รหัสผ่านปัจจุบัน')}
                                        </Typography>
                                        <TextField
                                            id="edit-currentPassword"
                                            fullWidth
                                            size="small"
                                            type={showCurrent ? 'text' : 'password'}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder={t('enter_current_password', 'กรอกรหัสผ่านปัจจุบัน')}
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton onClick={() => setShowCurrent((v) => !v)} edge="end">
                                                            {showCurrent ? <EyeSlash size={18} color="#666" /> : <Eye size={18} color="#666" />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    '&:focus-within': {
                                                        '& fieldset': { borderColor: '#e74c3c' },
                                                    },
                                                },
                                            }}
                                        />
                                    </Box>

                                    {/* New Password */}
                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                            {t('new_password', 'รหัสผ่านใหม่')}
                                        </Typography>
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
                                                            {showNew ? <EyeSlash size={18} color="#666" /> : <Eye size={18} color="#666" />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    '&:focus-within': {
                                                        '& fieldset': { borderColor: '#e74c3c' },
                                                    },
                                                },
                                            }}
                                        />
                                    </Box>

                                    {/* Confirm Password */}
                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                            {t('confirm_new_password', 'ยืนยันรหัสผ่านใหม่')}
                                        </Typography>
                                        <TextField
                                            id="edit-confirmPassword"
                                            fullWidth
                                            size="small"
                                            type={showConfirm ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder={t('enter_confirm_password', 'กรอกยืนยันรหัสผ่านใหม่')}
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton onClick={() => setShowConfirm((v) => !v)} edge="end">
                                                            {showConfirm ? <EyeSlash size={18} color="#666" /> : <Eye size={18} color="#666" />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    '&:focus-within': {
                                                        '& fieldset': { borderColor: '#e74c3c' },
                                                    },
                                                },
                                            }}
                                        />
                                    </Box>
                                </Box>
                            )}
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

            {/* Image Editor - Fullscreen Native Mobile Style */}
            <Dialog
                open={imageEditorOpen}
                onClose={() => setImageEditorOpen(false)}
                fullScreen
                TransitionProps={{
                    timeout: 0,
                }}
                PaperProps={{
                    sx: {
                        bgcolor: '#000',
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}
                sx={{
                    '& .MuiDialog-container': {
                        transition: 'none !important',
                    },
                    '& .MuiBackdrop-root': {
                        transition: 'none !important',
                    },
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 1,
                        py: 1,
                        pt: 'calc(env(safe-area-inset-top, 0px) + 8px)',
                        bgcolor: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(10px)',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 10,
                    }}
                >
                    <Button
                        onClick={() => setImageEditorOpen(false)}
                        sx={{
                            color: 'white',
                            minWidth: 'auto',
                            fontSize: '0.95rem',
                        }}
                    >
                        {t('cancel', 'ยกเลิก')}
                    </Button>
                    <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>
                        {t('move_and_scale', 'ย้ายและปรับขนาด')}
                    </Typography>
                    <Button
                        onClick={handleSaveImage}
                        sx={{
                            color: '#4CAF50',
                            fontWeight: 600,
                            minWidth: 'auto',
                            fontSize: '0.95rem',
                        }}
                    >
                        {t('choose', 'เลือก')}
                    </Button>
                </Box>

                {/* Main Image Area */}
                <Box
                    ref={containerRef}
                    sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        touchAction: 'none',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' },
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={(e) => {
                        // Mouse wheel zoom support for desktop
                        e.preventDefault();
                        const delta = e.deltaY > 0 ? -0.1 : 0.1;
                        const newZoom = Math.max(0.5, Math.min(3, zoom + delta));
                        setZoom(newZoom);
                        gestureRef.current.currentZoom = newZoom;
                        if (imageRef.current) {
                            imageRef.current.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) scale(${newZoom}) rotate(${rotation}deg)`;
                        }
                    }}
                >
                    {/* Image */}
                    <Box
                        component="img"
                        ref={imageRef}
                        src={originalImage || ''}
                        onLoad={() => {
                            // Set initial transform when image loads
                            if (imageRef.current && originalImage) {
                                imageRef.current.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) scale(${zoom}) rotate(${rotation}deg)`;
                            }
                        }}
                        sx={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            pointerEvents: 'none',
                            willChange: 'transform',
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            visibility: originalImage ? 'visible' : 'hidden',
                        }}
                        draggable={false}
                    />

                    {/* Circular Crop Overlay */}
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Box
                            sx={{
                                width: 280,
                                height: 280,
                                borderRadius: '50%',
                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
                                border: '1px solid rgba(255,255,255,0.6)',
                            }}
                        />
                    </Box>

                    {/* Gesture Hint */}
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 100,
                            left: 0,
                            right: 0,
                            textAlign: 'center',
                            pointerEvents: 'none',
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: '0.75rem',
                                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                            }}
                        >
                            {t('pinch_to_zoom', 'ใช้ 2 นิ้ว หนีบเพื่อซูม')}
                        </Typography>
                    </Box>
                </Box>

                {/* Bottom Controls */}
                <Box
                    sx={{
                        bgcolor: 'rgba(0,0,0,0.9)',
                        backdropFilter: 'blur(10px)',
                        px: 2,
                        pt: 1.5,
                        pb: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
                    }}
                >
                    {/* Zoom Slider */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <SearchZoomOut size={18} color="rgba(255,255,255,0.6)" />
                        <Slider
                            value={zoom}
                            onChange={(_, value) => {
                                const newZoom = value as number;
                                setZoom(newZoom);
                                gestureRef.current.currentZoom = newZoom;
                                if (imageRef.current) {
                                    imageRef.current.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) scale(${newZoom}) rotate(${rotation}deg)`;
                                }
                            }}
                            min={0.5}
                            max={3}
                            step={0.02}
                            sx={{
                                color: 'white',
                                '& .MuiSlider-track': {
                                    bgcolor: 'white',
                                },
                                '& .MuiSlider-rail': {
                                    bgcolor: 'rgba(255,255,255,0.3)',
                                },
                                '& .MuiSlider-thumb': {
                                    bgcolor: 'white',
                                    width: 20,
                                    height: 20,
                                    '&:hover, &.Mui-focusVisible': {
                                        boxShadow: '0 0 0 8px rgba(255,255,255,0.16)',
                                    },
                                },
                            }}
                        />
                        <SearchZoomIn size={18} color="rgba(255,255,255,0.6)" />
                    </Box>

                    {/* Reset Control */}
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <IconButton
                            onClick={() => {
                                setZoom(1);
                                setRotation(0);
                                setPosition({ x: 0, y: 0 });
                                gestureRef.current.currentZoom = 1;
                                gestureRef.current.currentPosition = { x: 0, y: 0 };
                                if (imageRef.current) {
                                    imageRef.current.style.transform = `translate3d(0px, 0px, 0) scale(1) rotate(0deg)`;
                                }
                            }}
                            sx={{
                                color: 'white',
                                bgcolor: 'rgba(255,255,255,0.1)',
                                px: 3,
                                borderRadius: 2,
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                            }}
                        >
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                                {t('reset', 'รีเซ็ต')}
                            </Typography>
                        </IconButton>
                    </Box>
                </Box>
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
