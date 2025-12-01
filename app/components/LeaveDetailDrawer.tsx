import React from 'react';
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
} from '@mui/material';
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
} from 'iconsax-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { LeaveRequest } from '@/types/leave';

dayjs.locale('th');

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
    // คำนวณค่าต่างๆ เมื่อมี leave
    const leaveTypeCode = leave?.leaveType || leave?.leaveCode || 'default';
    const config = leaveTypeConfig[leaveTypeCode] || leaveTypeConfig.default;
    const LeaveIcon = config.icon;

    // ใช้ชื่อประเภทการลาจาก leaveTypeInfo.name (ถ้ามี) หรือ label จาก config
    const leaveTypeName = leave?.leaveTypeInfo?.name || config.label;

    const startDate = leave ? dayjs(leave.startDate) : dayjs();
    const endDate = leave ? dayjs(leave.endDate) : dayjs();
    const isSameDay = startDate.isSame(endDate, 'day');

    const getStatusInfo = (status: string) => {
        switch (status.toLowerCase()) {
            case 'approved':
                return { label: 'อนุมัติแล้ว', color: '#2DCE89', bgColor: '#E6FFFA', icon: TickCircle, textColor: '#2DCE89' };
            case 'pending':
                return { label: 'รออนุมัติ', color: '#F59E0B', bgColor: '#FFFBEB', icon: Danger, textColor: '#F59E0B' };
            case 'rejected':
                return { label: 'ไม่อนุมัติ', color: '#F5365C', bgColor: '#FFF0F3', icon: CloseSquare, textColor: '#F5365C' };
            case 'cancelled':
                return { label: 'ยกเลิกแล้ว', color: '#8898AA', bgColor: '#F6F9FC', icon: Forbidden2, textColor: '#8898AA' };
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
            SlideProps={{
                appear: true,
            }}
            transitionDuration={{
                enter: 300,
                exit: 200,
            }}
            PaperProps={{
                sx: {
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    maxHeight: '90vh',
                    overflow: 'hidden',
                }
            }}
        >
            {leave && (
            <Box sx={{ width: '100%', bgcolor: 'white' }}>
                {/* Drag Handle */}
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 0.5 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 4,
                            borderRadius: 2,
                            bgcolor: '#E2E8F0',
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
                            รายละเอียดใบลา
                        </Typography>
                        {leave.leaveCode && (
                            <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                                รหัส: {leave.leaveCode}
                            </Typography>
                        )}
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <CloseCircle size={32} color="#64748B" />
                    </IconButton>
                </Box>

                {/* Content */}
                <Box sx={{ px: 2.5, py: 2, overflowY: 'auto', overflowX: 'hidden', maxHeight: 'calc(90vh - 80px)' }}>
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
                                    รวม {leave.totalDays} วัน
                                    {leave.startTime && leave.endTime && 
                                        ` (${leave.startTime} - ${leave.endTime})`
                                    }
                                </Typography>
                            </Box>
                        </Box>
                    </Card>

                    {/* Leave Type Info */}
                    <Card
                        sx={{
                            borderRadius: 1,
                            p: 2,
                            mb: 2,
                            border: '1px solid #F1F5F9',
                            boxShadow: 'none',
                            bgcolor: config.lightColor,
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 1,
                                    bgcolor: config.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <LeaveIcon size={20} color="white" />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>
                                    ประเภทการลา
                                </Typography>
                                <Typography sx={{ fontWeight: 700, color: config.color, fontSize: '1rem' }}>
                                    {leaveTypeName}
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
                                เหตุผลการลา
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
                                ข้อมูลติดต่อระหว่างลา
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
                                    เอกสารแนบ ({leave.attachments.length})
                                </Typography>
                            </Box>
                            <Stack spacing={1}>
                                {leave.attachments.map((attachment) => (
                                    <Box
                                        key={attachment.id}
                                        component="a"
                                        href={attachment.filePath}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            p: 1.5,
                                            borderRadius: 2,
                                            bgcolor: '#F8FAFC',
                                            textDecoration: 'none',
                                            transition: 'all 0.15s ease',
                                            '&:hover': {
                                                bgcolor: '#F1F5F9',
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 1,
                                                bgcolor: '#E2E8F0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <DocumentText size={16} color="#64748B" />
                                        </Box>
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
                                    </Box>
                                ))}
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
                                    เหตุผลที่ไม่อนุมัติ
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
                                    ยกเลิกใบลาแล้ว
                                </Typography>
                            </Box>
                            {leave.cancelReason && (
                                <Typography sx={{ color: '#9A3412', fontSize: '0.9rem', pl: 3.5, mb: 1 }}>
                                    <strong>เหตุผล:</strong> {leave.cancelReason}
                                </Typography>
                            )}
                            {leave.cancelledAt && (
                                <Typography sx={{ color: '#C2410C', fontSize: '0.8rem', pl: 3.5 }}>
                                    ยกเลิกเมื่อ {dayjs(leave.cancelledAt).format('D MMMM YYYY เวลา HH:mm น.')}
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
                                สถานะการอนุมัติ
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
                                                        ลำดับที่ {index + 1}
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
                                                        {approval.approver ? `${approval.approver.firstName} ${approval.approver.lastName}` : 'ไม่ระบุ'}
                                                        {approval.approver?.position && (
                                                            <Typography component="span" sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>
                                                                {' '}• {approval.approver.position}
                                                            </Typography>
                                                        )}
                                                    </Typography>
                                                </Box>
                                                {approval.actionAt && (
                                                    <Typography sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>
                                                        {dayjs(approval.actionAt).format('D MMM YYYY HH:mm น.')}
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
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Typography sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>
                            ยื่นเมื่อ {dayjs(leave.createdAt).format('D MMMM YYYY เวลา HH:mm น.')}
                        </Typography>
                    </Box>

                    {/* Cancel Button - Only show for pending status and if onCancel is provided */}
                    {leave.status === 'pending' && onCancel && (
                        <Box sx={{ mt: 3 }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                color="error"
                                onClick={onCancel}
                                startIcon={<Trash size={18} />}
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
                                ยกเลิกใบลา
                            </Button>
                        </Box>
                    )}
                </Box>
            </Box>
            )}
        </Drawer>
    );
};

export default LeaveDetailDrawer;
