import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    IconButton,
    Drawer,
    Stack,
    Button,
    Chip,
    Avatar,
    Dialog,
    Slide,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import {
    CloseCircle,
    DocumentText,
    Call,
    Location,
    Paperclip2,
    Calendar,
    Health,
    Briefcase,
    Sun1,
    Lovely,
    MessageQuestion,
    Clock,
    TickCircle,
    CloseSquare,
    Danger,
    Forbidden2,
    Heart,
    Building4,
    Shield,
    People,
    Car,
    Trash,
    Profile2User,
    ArrowLeft2,
    ArrowRight2,
    DocumentDownload,
    Gallery,
    Stop,
} from 'iconsax-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import { useLocale } from '@/app/providers/LocaleProvider';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import 'dayjs/locale/en';
import 'dayjs/locale/my';
import { LeaveRequest } from '@/types/leave';

// Fullscreen transition for mobile
const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

interface Attachment {
    id: number;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
}

interface AttachmentViewerProps {
    open: boolean;
    onClose: () => void;
    attachments: Attachment[];
    initialIndex: number;
}

// Fullscreen Attachment Viewer Component with Swiper
const AttachmentViewer: React.FC<AttachmentViewerProps> = ({ open, onClose, attachments, initialIndex }) => {
    const { t } = useLocale();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const swiperRef = useRef<SwiperType | null>(null);

    const handleSlideChange = useCallback((swiper: SwiperType) => {
        setCurrentIndex(swiper.activeIndex);
    }, []);

    // Filter only image attachments for swiping
    const imageAttachments = attachments.filter(att => att.mimeType?.startsWith('image/'));
    const currentAttachment = attachments[initialIndex];
    const isImage = currentAttachment?.mimeType?.startsWith('image/');
    const isPDF = currentAttachment?.mimeType === 'application/pdf';

    // If initial attachment is not an image, show single view
    if (!isImage && currentAttachment) {
        return (
            <Dialog
                fullScreen
                open={open}
                onClose={onClose}
                TransitionComponent={Transition}
                PaperProps={{
                    sx: {
                        bgcolor: '#000',
                    }
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        pt: 'calc(env(safe-area-inset-top, 0px) + 16px)',
                        bgcolor: 'rgba(0, 0, 0, 0.9)',
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 10,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <IconButton onClick={onClose} sx={{ color: 'white' }}>
                            <ArrowLeft2 size={24} color="white" />
                        </IconButton>
                        <Box sx={{ maxWidth: '200px' }}>
                            <Typography
                                sx={{
                                    color: 'white',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {currentAttachment.fileName}
                            </Typography>
                            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
                                {(currentAttachment.fileSize / 1024).toFixed(1)} KB
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton
                        component="a"
                        href={currentAttachment.filePath}
                        download={currentAttachment.fileName}
                        sx={{ color: 'white' }}
                    >
                        <DocumentDownload size={24} color="white" />
                    </IconButton>
                </Box>

                {/* Content */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mt: 'calc(env(safe-area-inset-top, 0px) + 72px)',
                        mb: 2,
                        px: 2,
                        overflow: 'auto',
                    }}
                >
                    {isPDF ? (
                        <Box
                            component="iframe"
                            src={currentAttachment.filePath}
                            sx={{
                                width: '100%',
                                height: 'calc(100vh - 120px)',
                                border: 'none',
                                borderRadius: 1,
                                bgcolor: 'white',
                            }}
                        />
                    ) : (
                        <Box
                            sx={{
                                textAlign: 'center',
                                p: 4,
                            }}
                        >
                            <DocumentText size={80} color="#64748B" />
                            <Typography sx={{ color: 'white', mt: 2, fontWeight: 600 }}>
                                {currentAttachment.fileName}
                            </Typography>
                            <Typography sx={{ color: 'rgba(255,255,255,0.6)', mt: 1, fontSize: '0.9rem' }}>
                                {t('preview_error', 'ไม่สามารถแสดงตัวอย่างไฟล์นี้ได้')}
                            </Typography>
                            <Button
                                component="a"
                                href={currentAttachment.filePath}
                                download={currentAttachment.fileName}
                                variant="contained"
                                startIcon={<DocumentDownload size={20} />}
                                sx={{
                                    mt: 3,
                                    bgcolor: '#667eea',
                                    '&:hover': { bgcolor: '#5a6fd6' },
                                }}
                            >
                                {t('download_file', 'ดาวน์โหลดไฟล์')}
                            </Button>
                        </Box>
                    )}
                </Box>
            </Dialog>
        );
    }

    // Find the initial index in imageAttachments
    const imageInitialIndex = imageAttachments.findIndex(att => att.id === currentAttachment?.id);
    const activeImageAttachment = imageAttachments[currentIndex] || imageAttachments[0];

    if (imageAttachments.length === 0) return null;

    return (
        <Dialog
            fullScreen
            open={open}
            onClose={onClose}
            TransitionComponent={Transition}
            PaperProps={{
                sx: {
                    bgcolor: '#000',
                }
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    pt: 'calc(env(safe-area-inset-top, 0px) + 16px)',
                    bgcolor: 'rgba(0, 0, 0, 0.9)',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <IconButton onClick={onClose} sx={{ color: 'white' }}>
                        <ArrowLeft2 size={24} color="white" />
                    </IconButton>
                    <Box sx={{ maxWidth: '200px' }}>
                        <Typography
                            sx={{
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {activeImageAttachment?.fileName}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
                            {imageAttachments.length > 1 
                                ? `${currentIndex + 1} / ${imageAttachments.length} ${t('image_unit', 'รูป')}`
                                : `${((activeImageAttachment?.fileSize || 0) / 1024).toFixed(1)} KB`
                            }
                        </Typography>
                    </Box>
                </Box>
                <IconButton
                    component="a"
                    href={activeImageAttachment?.filePath}
                    download={activeImageAttachment?.fileName}
                    sx={{ color: 'white' }}
                >
                    <DocumentDownload size={24} color="white" />
                </IconButton>
            </Box>

            {/* Content with Swiper */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mt: 'calc(env(safe-area-inset-top, 0px) + 72px)',
                    mb: 2,
                    overflow: 'hidden',
                    position: 'relative',
                    '& .swiper': {
                        width: '100%',
                        height: '100%',
                    },
                    '& .swiper-button-prev, & .swiper-button-next': {
                        color: 'white',
                        width: 40,
                        height: 40,
                        '&::after': {
                            fontSize: '24px',
                        },
                    },
                }}
            >
                {imageAttachments.length === 1 ? (
                    <Box
                        component="img"
                        src={imageAttachments[0].filePath}
                        alt={imageAttachments[0].fileName}
                        sx={{
                            maxWidth: '100%',
                            maxHeight: 'calc(100vh - 120px)',
                            objectFit: 'contain',
                            borderRadius: 1,
                        }}
                    />
                ) : (
                    <Swiper
                        modules={[Navigation]}
                        navigation
                        initialSlide={imageInitialIndex >= 0 ? imageInitialIndex : 0}
                        onSwiper={(swiper) => { swiperRef.current = swiper; }}
                        onSlideChange={handleSlideChange}
                        style={{ width: '100%', height: 'calc(100vh - 120px)' }}
                    >
                        {imageAttachments.map((attachment) => (
                            <SwiperSlide key={attachment.id}>
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        px: 2,
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={attachment.filePath}
                                        alt={attachment.fileName}
                                        sx={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            objectFit: 'contain',
                                            borderRadius: 1,
                                        }}
                                    />
                                </Box>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                )}
            </Box>

            {/* Bottom indicator for multiple images */}
            {imageAttachments.length > 1 && (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
                        left: 0,
                        right: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 1,
                        zIndex: 10,
                    }}
                >
                    {imageAttachments.map((_, index) => (
                        <Box
                            key={index}
                            onClick={() => swiperRef.current?.slideTo(index)}
                            sx={{
                                width: currentIndex === index ? 24 : 8,
                                height: 8,
                                borderRadius: 4,
                                bgcolor: currentIndex === index ? 'white' : 'rgba(255, 255, 255, 0.4)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                            }}
                        />
                    ))}
                </Box>
            )}
        </Dialog>
    );
};

interface LeaveDetailDrawerProps {
    open: boolean;
    onClose: () => void;
    leave: LeaveRequest | null;
    onCancel?: () => void;
}

// Config for leave types - matching app/leave/page.tsx
const leaveTypeConfig: Record<string, { icon: any; color: string; lightColor: string; label: string }> = {
    sick: { icon: Health, color: '#5E72E4', lightColor: '#E9ECFF', label: 'ลาป่วย' },
    personal: { icon: Briefcase, color: '#8965E0', lightColor: '#F0E9FF', label: 'ลากิจ' },
    vacation: { icon: Sun1, color: '#11CDEF', lightColor: '#E3F9FC', label: 'ลาพักร้อน' },
    annual: { icon: Sun1, color: '#2DCECC', lightColor: '#E0F7FA', label: 'ลาพักร้อน' },
    maternity: { icon: Lovely, color: '#F3A4B5', lightColor: '#FDEEF1', label: 'ลาคลอด' },
    ordination: { icon: Building4, color: '#FB6340', lightColor: '#FFF3E0', label: 'ลาอุปสมบท' },
    work_outside: { icon: Car, color: '#2DCECC', lightColor: '#E0F7FA', label: 'ทำงานนอกสถานที่' },
    absent: { icon: MessageQuestion, color: '#F5365C', lightColor: '#FEE2E2', label: 'ขาดงาน' },
    military: { icon: Shield, color: '#5E72E4', lightColor: '#E8EAF6', label: 'รับราชการทหาร' },
    marriage: { icon: Heart, color: '#F3A4B5', lightColor: '#FCE4EC', label: 'ลาแต่งงาน' },
    funeral: { icon: People, color: '#8898AA', lightColor: '#ECEFF1', label: 'ลาฌาปนกิจ' },
    paternity: { icon: Profile2User, color: '#11CDEF', lightColor: '#E1F5FE', label: 'ลาดูแลภรรยาคลอดบุตร' },
    sterilization: { icon: Health, color: '#2DCECC', lightColor: '#E0F2F1', label: 'ลาทำหมัน' },
    business: { icon: Car, color: '#8965E0', lightColor: '#F3E5F5', label: 'ลาติดต่อธุรกิจ' },
    unpaid: { icon: Clock, color: '#8898AA', lightColor: '#ECEFF1', label: 'ลาไม่รับค่าจ้าง' },
    other: { icon: MessageQuestion, color: '#5E72E4', lightColor: '#E9ECFF', label: 'อื่นๆ' },
    default: { icon: Clock, color: '#8898AA', lightColor: '#F0F3F5', label: 'การลา' },
};

const LeaveDetailDrawer: React.FC<LeaveDetailDrawerProps> = ({ open, onClose, leave, onCancel }) => {
    const { t, locale } = useLocale();
    // State for attachment viewer
    const [viewerOpen, setViewerOpen] = useState(false);
    const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState(0);
    
    // Pull-to-dismiss state
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const startYRef = useRef<number>(0);
    const lastYRef = useRef<number>(0);
    const velocityRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const contentRef = useRef<HTMLDivElement>(null);
    const dragHandleRef = useRef<HTMLDivElement>(null);
    
    const DISMISS_THRESHOLD = 120; // Increased threshold for stability
    const VELOCITY_THRESHOLD = 0.5; // Velocity threshold for quick swipe

    // Calculate drag progress for opacity
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    // Fade out backdrop as we drag down (linear fade up to 40% of screen height)
    const backdropOpacity = isClosing ? 0 : Math.max(0.5 * (1 - dragY / (windowHeight * 0.4)), 0);

    // Fix for iOS Safari background scrolling
    useEffect(() => {
        if (open) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            
            return () => {
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                window.scrollTo(0, scrollY);
            };
        }
    }, [open]);

    // Handle touch start
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const touchY = e.touches[0].clientY;
        const dragHandleRect = dragHandleRef.current?.getBoundingClientRect();
        
        // Check if touching the handle area (generous hit box)
        const isOnDragHandle = dragHandleRect && 
            touchY >= dragHandleRect.top - 20 && 
            touchY <= dragHandleRect.bottom + 20;
        
        // Check if content is scrolled to top
        const isAtTop = contentRef.current && contentRef.current.scrollTop <= 0;
        
        if (isOnDragHandle || isAtTop) {
            startYRef.current = touchY;
            lastYRef.current = touchY;
            lastTimeRef.current = Date.now();
            velocityRef.current = 0;
            setIsDragging(true);
        }
    }, []);

    // Handle touch move
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging) return;
        
        const currentY = e.touches[0].clientY;
        const currentTime = Date.now();
        const diff = currentY - startYRef.current;
        
        // Calculate velocity
        const timeDelta = currentTime - lastTimeRef.current;
        if (timeDelta > 0) {
            const instantVelocity = (currentY - lastYRef.current) / timeDelta;
            // Smooth velocity with exponential moving average
            velocityRef.current = velocityRef.current * 0.6 + instantVelocity * 0.4;
        }
        
        lastYRef.current = currentY;
        lastTimeRef.current = currentTime;
        
        if (diff > 0) {
            // Native feel: 1:1 movement (no resistance) when dragging down
            // This feels more responsive like iOS sheet
            setDragY(diff);
            
            if (e.cancelable) {
                e.preventDefault();
            }
        } else {
            // If pulling up, allow scroll (reset drag)
            setDragY(0);
        }
    }, [isDragging]);

    // Handle touch end
    const handleTouchEnd = useCallback(() => {
        if (!isDragging) return;
        
        const velocity = velocityRef.current;
        // Dismiss if dragged far enough OR flicked fast enough (with some minimal drag)
        const shouldDismiss = dragY > DISMISS_THRESHOLD || (dragY > 30 && velocity > VELOCITY_THRESHOLD);
        
        if (shouldDismiss) {
            setIsClosing(true);
            // Animate off screen
            setDragY(windowHeight); 
            
            setTimeout(() => {
                onClose();
                // Reset after close
                setTimeout(() => {
                    setIsClosing(false);
                    setDragY(0);
                }, 50);
            }, 200);
        } else {
            // Snap back
            setDragY(0);
        }
        
        setIsDragging(false);
        startYRef.current = 0;
        velocityRef.current = 0;
    }, [isDragging, dragY, onClose, windowHeight]);

    // Reset drag state when drawer closes/opens
    React.useEffect(() => {
        if (!open) {
            setDragY(0);
            setIsDragging(false);
            setIsClosing(false);
        }
    }, [open]);

    const handleOpenAttachment = (index: number) => {
        setSelectedAttachmentIndex(index);
        setViewerOpen(true);
    };

    const handleCloseViewer = () => {
        setViewerOpen(false);
    };

    // คำนวณค่าต่างๆ เมื่อมี leave
    const leaveTypeCode = leave?.leaveType || leave?.leaveCode || 'default';
    const config = leaveTypeConfig[leaveTypeCode] || leaveTypeConfig.default;
    const LeaveIcon = config.icon;

    // ใช้ชื่อประเภทการลาจาก leaveTypeInfo.name (ถ้ามี) หรือ label จาก config
    const leaveTypeName = t(`leave_${leaveTypeCode}`, leave?.leaveTypeInfo?.name || config.label);

    const startDate = leave ? dayjs(leave.startDate).locale(locale) : dayjs().locale(locale);
    const endDate = leave ? dayjs(leave.endDate).locale(locale) : dayjs().locale(locale);
    const isSameDay = startDate.isSame(endDate, 'day');

    const getStatusInfo = (status: string) => {
        switch (status.toLowerCase()) {
            case 'approved':
                return { label: t('status_approved', 'อนุมัติแล้ว'), color: '#2DCE89', bgColor: '#E6FFFA', icon: TickCircle, textColor: '#2DCE89' };
            case 'pending':
                return { label: t('status_pending', 'รออนุมัติ'), color: '#F59E0B', bgColor: '#FFFBEB', icon: Danger, textColor: '#F59E0B' };
            case 'rejected':
                return { label: t('status_rejected', 'ไม่อนุมัติ'), color: '#F5365C', bgColor: '#FFF0F3', icon: CloseSquare, textColor: '#F5365C' };
            case 'cancelled':
                return { label: t('status_cancelled', 'ยกเลิกแล้ว'), color: '#8898AA', bgColor: '#F6F9FC', icon: Forbidden2, textColor: '#8898AA' };
            default:
                return { label: status, color: '#8898AA', bgColor: '#F6F9FC', icon: MessageQuestion, textColor: '#8898AA' };
        }
    };

    const statusInfo = getStatusInfo(leave?.status || 'pending');
    const StatusIcon = statusInfo.icon;

    return (
        <Drawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            ModalProps={{
                slotProps: {
                    backdrop: {
                        sx: {
                            bgcolor: `rgba(0, 0, 0, ${backdropOpacity})`,
                        }
                    }
                }
            }}
            PaperProps={{
                sx: {
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    maxHeight: '90vh',
                    ...(dragY > 0 && {
                        transform: `translateY(${dragY}px)`,
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                    }),
                }
            }}
        >
            {leave && (
            <Box 
                sx={{ width: '100%', bgcolor: 'white' }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle - visual indicator */}
                <Box 
                    ref={dragHandleRef}
                    sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        pt: 1.5, 
                        pb: 1,
                        cursor: 'grab',
                        touchAction: 'none',
                    }}
                >
                    <Box
                        sx={{
                            width: isDragging ? 48 : 40,
                            height: 5,
                            borderRadius: 2.5,
                            bgcolor: isDragging 
                                ? '#94A3B8' 
                                : dragY > DISMISS_THRESHOLD / 2
                                    ? '#667eea' 
                                    : '#E2E8F0',
                            transition: isDragging ? 'none' : 'all 0.2s ease',
                            transform: isDragging ? 'scaleX(1.1)' : 'scaleX(1)',
                        }}
                    />
                </Box>

                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 2.5,
                        py: 1.5,
                        borderBottom: '1px solid #F1F5F9',
                    }}
                >
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>
                            {t('leave_details', 'รายละเอียดใบลา')}
                        </Typography>
                        {leave.leaveCode && (
                            <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                                {t('leave_code', 'รหัส')}: {leave.leaveCode}
                            </Typography>
                        )}
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <CloseCircle size={32} color="#64748B" />
                    </IconButton>
                </Box>

                {/* Content */}
                <Box 
                    ref={contentRef}
                    sx={{ 
                        px: 2.5, 
                        py: 2, 
                        overflowY: 'auto', 
                        overflowX: 'hidden', 
                        maxHeight: 'calc(90vh - 80px)',
                        overscrollBehavior: 'contain'
                    }}
                >
                    {/* Leave Type & Status Card */}
                    <Card
                        sx={{
                            borderRadius: 1,
                            p: 2.5,
                            mb: 2,
                            background: `linear-gradient(135deg, ${config.color}15 0%, ${config.color}05 100%)`,
                            border: `1px solid ${config.color}30`,
                            boxShadow: 'none'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box
                                sx={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 1,
                                    bgcolor: config.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <LeaveIcon size={28} color="white" />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#1E293B', mb: 0.5 }}>
                                    {leaveTypeName}
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 1,
                                        bgcolor: statusInfo.bgColor,
                                    }}
                                >
                                    <StatusIcon size={14} color={statusInfo.textColor} />
                                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: statusInfo.textColor }}>
                                        {statusInfo.label}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>

                        {/* Date Range */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                p: 1.5,
                                borderRadius: 1,
                                bgcolor: 'white',
                            }}
                        >
                            <Calendar size={20} color={config.color} />
                            <Box>
                                <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#1E293B' }}>
                                    {isSameDay 
                                        ? startDate.format('D MMMM YYYY')
                                        : `${startDate.format('D MMM')} - ${endDate.format('D MMM YYYY')}`
                                    }
                                </Typography>
                                <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                                    {t('total_days_label', 'รวม')} {leave.totalDays} {t('leave_days_unit', 'วัน')}
                                    {leave.startTime && leave.endTime && 
                                        ` (${leave.startTime} - ${leave.endTime})`
                                    }
                                </Typography>
                            </Box>
                        </Box>
                    </Card>
                    
                    {/* Reason */}
                    <Card
                        sx={{
                            borderRadius: 1,
                            p: 2,
                            mb: 2,
                            border: '1px solid #F1F5F9',
                            boxShadow: 'none'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <DocumentText size={18} color="#64748B" />
                            <Typography sx={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>
                                {t('leave_reason', 'เหตุผลการลา')}
                            </Typography>
                        </Box>
                        <Typography sx={{ color: '#1E293B', fontSize: '0.95rem', pl: 3.5 }}>
                            {leave.reason}
                        </Typography>
                    </Card>

                    {/* Contact Info */}
                    {(leave.contactPhone || leave.contactAddress) && (
                        <Card
                            sx={{
                                borderRadius: 1,
                                p: 2,
                                mb: 2,
                                border: '1px solid #F1F5F9',
                                boxShadow: 'none'
                            }}
                        >
                            <Typography sx={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem', mb: 1.5 }}>
                                {t('contact_info', 'ข้อมูลติดต่อระหว่างลา')}
                            </Typography>
                            {leave.contactPhone && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Call size={16} color="#64748B" />
                                    <Typography sx={{ color: '#1E293B', fontSize: '0.9rem' }}>
                                        {leave.contactPhone}
                                    </Typography>
                                </Box>
                            )}
                            {leave.contactAddress && (
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                    <Location size={16} color="#64748B" style={{ marginTop: 2 }} />
                                    <Typography sx={{ color: '#1E293B', fontSize: '0.9rem' }}>
                                        {leave.contactAddress}
                                    </Typography>
                                </Box>
                            )}
                        </Card>
                    )}

                    {/* Attachments */}
                    {leave.attachments && leave.attachments.length > 0 && (
                        <Card
                            sx={{
                                borderRadius: 1,
                                p: 2,
                                mb: 2,
                                border: '1px solid #F1F5F9',
                                boxShadow: 'none'
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <Paperclip2 size={18} color="#64748B" />
                                <Typography sx={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>
                                    {t('leave_attachments', 'เอกสารแนบ')} ({leave.attachments.length})
                                </Typography>
                            </Box>
                            <Stack spacing={1}>
                                {leave.attachments.map((attachment, index) => {
                                    const isImage = attachment.mimeType?.startsWith('image/');
                                    return (
                                    <Box
                                        key={attachment.id}
                                        onClick={() => handleOpenAttachment(index)}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            p: 1.5,
                                            borderRadius: 2,
                                            bgcolor: '#F8FAFC',
                                            textDecoration: 'none',
                                            transition: 'all 0.15s ease',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                bgcolor: '#F1F5F9',
                                            },
                                            '&:active': {
                                                transform: 'scale(0.98)',
                                            },
                                        }}
                                    >
                                        {isImage ? (
                                            <Box
                                                sx={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: 1,
                                                    overflow: 'hidden',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    src={attachment.filePath}
                                                    alt={attachment.fileName}
                                                    sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                    }}
                                                />
                                            </Box>
                                        ) : (
                                            <Box
                                                sx={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: 1,
                                                    bgcolor: '#E2E8F0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <DocumentText size={24} color="#64748B" />
                                            </Box>
                                        )}
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography
                                                sx={{
                                                    fontSize: '0.85rem',
                                                    fontWeight: 500,
                                                    color: '#334155',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {attachment.fileName}
                                            </Typography>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                                {(attachment.fileSize / 1024).toFixed(1)} KB
                                            </Typography>
                                        </Box>
                                        <Gallery size={20} color="#94A3B8" />
                                    </Box>
                                    );
                                })}
                            </Stack>
                        </Card>
                    )}

                    {/* Rejection Reason */}
                    {leave.status === 'rejected' && leave.rejectReason && (
                        <Card
                            sx={{
                                borderRadius: 1,
                                p: 2,
                                mb: 2,
                                bgcolor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                boxShadow: 'none'
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <CloseSquare size={18} color="#DC2626" />
                                <Typography sx={{ fontWeight: 600, color: '#DC2626', fontSize: '0.9rem' }}>
                                    {t('reject_reason', 'เหตุผลที่ไม่อนุมัติ')}
                                </Typography>
                            </Box>
                            <Typography sx={{ color: '#991B1B', fontSize: '0.9rem', pl: 3.5 }}>
                                {leave.rejectReason}
                            </Typography>
                        </Card>
                    )}

                    {/* Cancellation Reason */}
                    {leave.status === 'cancelled' && (
                        <Card
                            sx={{
                                borderRadius: 1,
                                p: 2,
                                mb: 2,
                                bgcolor: '#FFF7ED',
                                border: '1px solid #FDBA74',
                                boxShadow: 'none'
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Forbidden2 size={18} color="#EA580C" />
                                <Typography sx={{ fontWeight: 600, color: '#EA580C', fontSize: '0.9rem' }}>
                                    {t('status_cancelled', 'ยกเลิกใบลาแล้ว')}
                                </Typography>
                            </Box>
                            {leave.cancelReason && (
                                <Typography sx={{ color: '#9A3412', fontSize: '0.9rem', pl: 3.5, mb: 1 }}>
                                    <strong>{t('cancel_reason_label', 'เหตุผล')}:</strong> {leave.cancelReason}
                                </Typography>
                            )}
                            {leave.cancelledAt && (
                                <Typography sx={{ color: '#C2410C', fontSize: '0.8rem', pl: 3.5 }}>
                                    {t('cancelled_at', 'ยกเลิกเมื่อ')} {dayjs(leave.cancelledAt).locale(locale).format('D MMMM YYYY HH:mm')}
                                </Typography>
                            )}
                        </Card>
                    )}

                    {/* Approval Flow */}
                    {leave.approvals && leave.approvals.length > 0 && (
                        <Card
                            sx={{
                                borderRadius: 1,
                                p: 2,
                                border: '1px solid #F1F5F9',
                                boxShadow: 'none'
                            }}
                        >
                            <Typography sx={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem', mb: 2 }}>
                                {t('approval_status', 'สถานะการอนุมัติ')}
                            </Typography>
                            <Stack spacing={0}>
                                {leave.approvals.map((approval, index) => {
                                    const approvalStatus = getStatusInfo(approval.status);
                                    const ApprovalIcon = approvalStatus.icon;
                                    const isLast = index === leave.approvals.length - 1;

                                    return (
                                        <Box key={approval.id} sx={{ display: 'flex', gap: 1.5 }}>
                                            {/* Timeline indicator */}
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <Box
                                                    sx={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: '50%',
                                                        bgcolor: approvalStatus.bgColor,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: `2px solid ${approvalStatus.textColor}`,
                                                    }}
                                                >
                                                    <ApprovalIcon size={16} color={approvalStatus.textColor} />
                                                </Box>
                                                {!isLast && (
                                                    <Box
                                                        sx={{
                                                            width: 2,
                                                            flex: 1,
                                                            minHeight: 24,
                                                            bgcolor: '#E2E8F0',
                                                            my: 0.5,
                                                        }}
                                                    />
                                                )}
                                            </Box>

                                            {/* Approval Content */}
                                            <Box sx={{ flex: 1, pb: isLast ? 0 : 2 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                    <Typography sx={{ fontWeight: 600, color: '#1E293B', fontSize: '0.9rem' }}>
                                                        {t('order_no', 'ลำดับที่')} {index + 1}
                                                    </Typography>
                                                    <Chip
                                                        label={approvalStatus.label}
                                                        size="small"
                                                        sx={{
                                                            height: 22,
                                                            bgcolor: approvalStatus.bgColor,
                                                            color: approvalStatus.textColor,
                                                            fontWeight: 600,
                                                            fontSize: '0.7rem',
                                                        }}
                                                    />
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                    
                                                    <Typography sx={{ color: '#475569', fontSize: '0.85rem' }}>
                                                        {approval.approver ? `${approval.approver.firstName} ${approval.approver.lastName}` : t('not_specified', 'ไม่ระบุ')}
                                                        {approval.approver?.position && (
                                                            <Typography component="span" sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>
                                                                {' '}• {approval.approver.position}
                                                            </Typography>
                                                        )}
                                                    </Typography>
                                                </Box>
                                                {approval.actionAt && (
                                                    <Typography sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>
                                                        {dayjs(approval.actionAt).locale(locale).format('D MMM YYYY HH:mm')}
                                                    </Typography>
                                                )}
                                                {approval.comment && (
                                                    <Box
                                                        sx={{
                                                            mt: 1,
                                                            p: 1.5,
                                                            borderRadius: 2,
                                                            bgcolor: '#F8FAFC',
                                                            borderLeft: `3px solid ${approvalStatus.textColor}`,
                                                        }}
                                                    >
                                                        <Typography sx={{ color: '#475569', fontSize: '0.85rem' }}>
                                                            "{approval.comment}"
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Card>
                    )}

                    {/* Created Date */}
                    <Box sx={{ mt: 2, textAlign: 'center' , mb:2 }}>
                        <Typography sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>
                            {t('submitted_at', 'ยื่นเมื่อ')} {dayjs(leave.createdAt).locale(locale).format('D MMMM YYYY HH:mm')}
                        </Typography>
                    </Box>

                    {/* Cancel Button - Only show for pending status and if onCancel is provided */}
                    {leave.status === 'pending' && onCancel && (
                        <Box sx={{ mt: 3 , mb:3}}>
                            <Button
                                fullWidth
                                variant="outlined"
                                color="error"
                                onClick={onCancel}
                                startIcon={<CloseSquare size={18} color="#DC2626" />}
                                sx={{
                                    borderRadius: 1,
                                    py: 1.5,
                                    fontWeight: 600,
                                    borderColor: '#DC2626',
                                    color: '#DC2626',
                                    '&:hover': {
                                        bgcolor: '#FEF2F2',
                                        borderColor: '#DC2626',
                                    },
                                }}
                            >
                                {t('cancel_leave_btn', 'ยกเลิกใบลา')}
                            </Button>
                        </Box>
                    )}
                </Box>
            </Box>
            )}

            {/* Attachment Viewer Modal */}
            <AttachmentViewer
                open={viewerOpen}
                onClose={handleCloseViewer}
                attachments={leave?.attachments || []}
                initialIndex={selectedAttachmentIndex}
            />
        </Drawer>
    );
};

export default LeaveDetailDrawer;
