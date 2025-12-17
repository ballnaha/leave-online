'use client';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Typography,
    IconButton,
    Collapse,
    Chip,
    InputBase,
} from '@mui/material';
import {
    ArrowLeft2,
    ArrowDown2,
    ArrowUp2,
    SearchNormal1,
    Calendar,
    DocumentText,
    Notification,
    Health,
    Briefcase,
    Sun1,
    People,
    Building,
    Shield,
    Heart,
    User,
    Car,
    MoneySend,
    TickCircle,
    Folder2,
    InfoCircle,
    Warning2,
} from 'iconsax-react';
import { useLocale } from '@/app/providers/LocaleProvider';

// Leave type config with icons and colors
const leaveTypeConfig: Record<string, { icon: any; color: string }> = {
    sick: { icon: Health, color: '#5E72E4' },
    personal: { icon: Briefcase, color: '#8965E0' },
    vacation: { icon: Sun1, color: '#11CDEF' },
    annual: { icon: Sun1, color: '#2DCECC' },
    maternity: { icon: People, color: '#F3A4B5' },
    ordination: { icon: Building, color: '#FB6340' },
    military: { icon: Shield, color: '#5E72E4' },
    marriage: { icon: Heart, color: '#F3A4B5' },
    funeral: { icon: People, color: '#8898AA' },
    paternity: { icon: User, color: '#11CDEF' },
    sterilization: { icon: Health, color: '#2DCECC' },
    business: { icon: Car, color: '#8965E0' },
    unpaid: { icon: MoneySend, color: '#F5365C' },
    work_outside: { icon: Car, color: '#2DCECC' },
    default: { icon: DocumentText, color: '#667eea' },
};

// Theme colors
const THEME_COLOR = '#667eea';
const THEME_GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

interface AccordionSectionProps {
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    isOpen: boolean;
    onClick: () => void;
    children: React.ReactNode;
    status?: 'active' | 'completed';
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
    title,
    subtitle,
    icon,
    isOpen,
    onClick,
    children,
    status = 'active'
}) => (
    <Box
        sx={{
            bgcolor: 'white',
            borderRadius: 1,
            mb: 1.5,
            boxShadow: isOpen ? '0 4px 20px rgba(102, 126, 234, 0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
            border: isOpen ? '1px solid rgba(102, 126, 234, 0.2)' : '1px solid rgba(0,0,0,0.06)',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
        }}
    >
        <Box
            onClick={onClick}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 1.5,
                px: 2,
                cursor: 'pointer',
                '&:hover': {
                    bgcolor: 'rgba(102, 126, 234, 0.02)',
                },
            }}
        >
            <Box
                sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: status === 'completed' ? '#10B981' : THEME_COLOR,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                {status === 'completed' ? (
                    <TickCircle size={16} color="white" variant="Bold" />
                ) : (
                    icon
                )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: 600,
                        color: '#1F2937',
                        fontSize: '0.95rem',
                    }}
                >
                    {title}
                </Typography>
                {subtitle && (
                    <Typography
                        variant="caption"
                        sx={{
                            color: status === 'completed' ? '#10B981' : '#6B7280',
                            fontSize: '0.8rem',
                        }}
                    >
                        {subtitle}
                    </Typography>
                )}
            </Box>
            <Box sx={{ color: '#9CA3AF' }}>
                {isOpen ? <ArrowUp2 size={18} color="#9CA3AF" /> : <ArrowDown2 size={18} color="#9CA3AF" />}
            </Box>
        </Box>
        <Collapse in={isOpen}>
            <Box sx={{ px: 2, pb: 2, pt: 0.5 }}>
                {children}
            </Box>
        </Collapse>
    </Box>
);

interface ListItemProps {
    icon: React.ReactNode;
    iconBgColor?: string;
    title: string;
    subtitle?: string;
    condition?: string | null;
    chips?: { label: string; color: string; bgcolor: string }[];
    isOpen?: boolean;
    onClick?: () => void;
    children?: React.ReactNode;
}

const ListItem: React.FC<ListItemProps> = ({
    icon,
    iconBgColor = 'rgba(102, 126, 234, 0.1)',
    title,
    subtitle,
    condition,
    chips,
    isOpen,
    onClick,
    children
}) => (
    <Box sx={{ mb: 0.5 }}>
        <Box
            onClick={onClick}
            sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                py: 1.25,
                px: 1,
                borderRadius: 1.5,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'background-color 0.2s',
                '&:hover': onClick ? {
                    bgcolor: 'rgba(0,0,0,0.02)',
                } : {},
            }}
        >
            <Box
                sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    bgcolor: iconBgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    mt: 0.25,
                }}
            >
                {icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 500,
                            color: '#374151',
                            fontSize: '0.925rem',
                        }}
                    >
                        {title}
                    </Typography>
                    {chips?.map((chip, idx) => (
                        <Chip
                            key={idx}
                            label={chip.label}
                            size="small"
                            sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                bgcolor: chip.bgcolor,
                                color: chip.color,
                                fontWeight: 500,
                                '& .MuiChip-label': { px: 1 },
                            }}
                        />
                    ))}
                </Box>
                {subtitle && (
                    <Typography
                        variant="caption"
                        sx={{
                            color: '#6B7280',
                            fontSize: '0.8rem',
                            display: 'block',
                            mt: 0.25,
                        }}
                    >
                        {subtitle}
                    </Typography>
                )}
                {condition && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mt: 0.5 }}>
                        <InfoCircle size={12} color="#F59E0B" style={{ marginTop: 2, flexShrink: 0 }} />
                        <Typography
                            variant="caption"
                            sx={{
                                color: '#F59E0B',
                                fontSize: '0.75rem',
                                lineHeight: 1.4,
                            }}
                        >
                            {condition}
                        </Typography>
                    </Box>
                )}
            </Box>
            {onClick && (
                <Box sx={{ color: '#D1D5DB', mt: 0.5 }}>
                    {isOpen ? <ArrowUp2 size={14} color="#9CA3AF" /> : <ArrowDown2 size={14} color="#9CA3AF" />}
                </Box>
            )}
        </Box>
        {children && (
            <Collapse in={isOpen}>
                <Box sx={{ pl: 6, pr: 1, pb: 1 }}>
                    {children}
                </Box>
            </Collapse>
        )}
    </Box>
);

export default function TermsAndConditionsPage() {
    const router = useRouter();
    const { t, locale } = useLocale();
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        'leave-rights': true,
        'approval-process': false,
        'notifications': false,
    });
    const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');

    const toggleSection = (id: string) => {
        setOpenSections(prev => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const toggleItem = (id: string) => {
        setOpenItems(prev => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    // Leave types data (defined first for use in search)
    const leaveTypes = [
        { code: 'sick', name: t('leave_sick', 'ลาป่วย'), maxDays: 30, isPaid: true, description: t('desc_sick', 'ลาเมื่อเจ็บป่วยไม่สามารถมาทำงานได้'), condition: t('terms_sick_condition', 'ลา 3 วันขึ้นไป ต้องแนบใบรับรองแพทย์') },
        { code: 'personal', name: t('leave_personal', 'ลากิจ'), maxDays: 3, isPaid: true, description: t('desc_personal', 'ลาเพื่อทำธุระส่วนตัวที่จำเป็น'), condition: t('terms_personal_condition', 'ต้องแนบหลักฐานประกอบทุกครั้ง') },
        { code: 'vacation', name: t('leave_vacation', 'ลาพักร้อน'), maxDays: 6, isPaid: true, description: t('desc_vacation', 'ลาพักผ่อนประจำปี'), condition: t('terms_vacation_condition', 'ปีแรก: 1 วัน/2 เดือน • หลังครบ 1 ปี: 6 วัน/ปี') },
        { code: 'maternity', name: t('leave_maternity', 'ลาคลอด'), maxDays: 120, isPaid: true, description: t('desc_maternity', 'ลาคลอดบุตร'), condition: t('terms_maternity_condition', 'พนักงานหญิง ได้รับค่าจ้าง 60 วัน') },
        { code: 'ordination', name: t('leave_ordination', 'ลาบวช'), maxDays: 30, isPaid: false, description: t('desc_ordination', 'ลาอุปสมบท'), condition: t('terms_ordination_condition', 'ต้องมีอายุงาน 1 ปีขึ้นไป') },
        { code: 'unpaid', name: t('leave_unpaid', 'ลาไม่รับค่าจ้าง'), maxDays: null, isPaid: false, description: t('desc_unpaid', 'ลาโดยไม่ได้รับค่าจ้าง'), condition: null },
        { code: 'other', name: t('leave_other', 'ลาอื่นๆ'), maxDays: null, isPaid: false, description: t('desc_other', 'ลาอื่นๆ'), condition: null },
    ];

    // Filter leave types based on search
    const filteredLeaveTypes = useMemo(() => {
        if (!searchQuery.trim()) return leaveTypes;
        const query = searchQuery.toLowerCase();
        return leaveTypes.filter(leave =>
            leave.name.toLowerCase().includes(query) ||
            leave.description.toLowerCase().includes(query) ||
            (leave.condition?.toLowerCase().includes(query))
        );
    }, [searchQuery, leaveTypes]);

    // Check if item matches search (for highlighting)
    const isHighlighted = (text: string) => {
        if (!searchQuery.trim()) return false;
        return text.toLowerCase().includes(searchQuery.toLowerCase());
    };

    // Show search results count
    const hasSearchResults = searchQuery.trim() && filteredLeaveTypes.length > 0;
    const noSearchResults = searchQuery.trim() && filteredLeaveTypes.length === 0;

    // General note for all leave types
    const generalLeaveNote = t('terms_backdated_note', 'ยื่นใบลาย้อนหลังได้ไม่เกิน 3 วัน นับจากวันกลับมาทำงาน');

    // Approval steps
    const approvalSteps = [
        { step: 1, title: t('terms_step_shift_supervisor', 'หัวหน้ากะ'), desc: t('terms_step_1_desc', 'ตรวจสอบและอนุมัติเบื้องต้น') },
        { step: 2, title: t('terms_step_section_head', 'หัวหน้าแผนก'), desc: t('terms_step_2_desc', 'อนุมัติระดับแผนก') },
        { step: 3, title: t('terms_step_dept_manager', 'ผู้จัดการฝ่าย/ส่วน'), desc: t('terms_step_3_desc', 'อนุมัติระดับฝ่าย') },
        { step: 4, title: t('terms_step_hr_manager', 'ผู้จัดการ HR'), desc: t('terms_step_4_desc', 'อนุมัติขั้นสุดท้าย') },
    ];

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#F9FAFB' }}>
            {/* Header */}
            <Box
                sx={{
                    background: THEME_GRADIENT,
                    pt: 'calc(env(safe-area-inset-top, 0px) + 12px)',
                    pb: 2,
                    px: 2,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Decorative elements */}
                <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)' }} />
                <Box sx={{ position: 'absolute', bottom: -20, left: 20, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)' }} />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1, mb: 2 }}>
                    <IconButton onClick={() => router.back()}
                        sx={{
                            bgcolor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
                        }}>
                        <ArrowLeft2 size={20} color="white" />
                    </IconButton>
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, fontSize: '1.1rem' }}>
                        {t('terms_and_conditions', 'ข้อกำหนดและเงื่อนไข')}
                    </Typography>
                </Box>

                {/* Search Box */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: 'white',
                        borderRadius: 2,
                        px: 2,
                        py: 1,
                        gap: 1.5,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                >
                    <SearchNormal1 size={20} color="#9CA3AF" />
                    <InputBase
                        placeholder={t('terms_search_placeholder', 'ค้นหา...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{
                            flex: 1,
                            fontSize: '0.9rem',
                            '& input::placeholder': { color: '#9CA3AF', opacity: 1 },
                        }}
                    />
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{ p: 2 }}>
                {/* Search Results Count */}
                {hasSearchResults && (
                    <Box sx={{ mb: 1.5, px: 0.5 }}>
                        <Typography variant="caption" sx={{ color: THEME_COLOR, fontWeight: 600 }}>
                            {t('terms_found_items', 'พบ {{count}} รายการ').replace('{{count}}', String(filteredLeaveTypes.length))}
                        </Typography>
                    </Box>
                )}

                {noSearchResults && (
                    <Box sx={{ textAlign: 'center', py: 4, mb: 2, bgcolor: 'white', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                            {t('terms_no_results', 'ไม่พบผลการค้นหา')}
                        </Typography>
                    </Box>
                )}

                {/* Section 1: สิทธิ์การลา */}
                <AccordionSection
                    title={t('terms_leave_rights', 'สิทธิ์การลา')}
                    subtitle={searchQuery.trim()
                        ? t('terms_found_items', 'พบ {{count}} รายการ').replace('{{count}}', String(filteredLeaveTypes.length))
                        : t('terms_leave_types_count', '{{count}} ประเภท').replace('{{count}}', String(leaveTypes.length))}
                    icon={<Calendar size={14} color="white" variant="Bold" />}
                    isOpen={openSections['leave-rights'] || searchQuery.trim().length > 0}
                    onClick={() => toggleSection('leave-rights')}
                    status="completed"
                >
                    {filteredLeaveTypes.map((leave) => {
                        const config = leaveTypeConfig[leave.code] || leaveTypeConfig.default;
                        const IconComponent = config.icon;
                        const highlighted = isHighlighted(leave.name);
                        return (
                            <ListItem
                                key={leave.code}
                                icon={<IconComponent size={16} color={config.color} variant="Bold" />}
                                iconBgColor={highlighted ? `${THEME_COLOR}20` : `${config.color}15`}
                                title={leave.name}
                                subtitle={leave.maxDays ? `${leave.maxDays} ${t('terms_days_per_year', 'วัน/ปี')}` : t('terms_unlimited', 'ไม่จำกัด')}
                                condition={leave.condition}
                                chips={[{
                                    label: leave.isPaid ? t('terms_paid', 'ได้ค่าจ้าง') : t('terms_unpaid', 'ไม่ได้ค่าจ้าง'),
                                    color: leave.isPaid ? '#059669' : '#DC2626',
                                    bgcolor: leave.isPaid ? '#D1FAE5' : '#FEE2E2',
                                }]}
                            />
                        );
                    })}

                    {/* General Note */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                        mt: 1.5,
                        p: 1.5,
                        bgcolor: '#FEF3C7',
                        borderRadius: 1.5,
                        border: '1px solid #FCD34D',
                    }}>
                        <Warning2 size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                        <Typography variant="caption" sx={{ color: '#92400E', fontSize: '0.75rem', lineHeight: 1.5 }}>
                            {generalLeaveNote}
                        </Typography>
                    </Box>
                </AccordionSection>

                {/* Section 2: กระบวนการขอลาและอนุมัติ */}
                <AccordionSection
                    title={t('terms_approval_process', 'กระบวนการขอลาและอนุมัติ')}
                    subtitle={t('terms_approval_steps', '{{count}} ขั้นตอนการอนุมัติ').replace('{{count}}', '4')}
                    icon={<DocumentText size={14} color="white" variant="Bold" />}
                    isOpen={openSections['approval-process']}
                    onClick={() => toggleSection('approval-process')}
                >
                    {/* Approval Flow */}
                    <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, display: 'block', mb: 1, ml: 0.5 }}>
                        {t('terms_approval_flow', 'ลำดับการอนุมัติ')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                        {approvalSteps.map((item, index) => (
                            <Box
                                key={item.step}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1,
                                    bgcolor: '#F3F4F6',
                                    borderRadius: 1.5,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        bgcolor: THEME_COLOR,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        color: 'white',
                                    }}
                                >
                                    {item.step}
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem', color: '#374151' }}>
                                        {item.title}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '0.7rem' }}>
                                        {item.desc}
                                    </Typography>
                                </Box>
                            </Box>
                        ))}
                    </Box>

                    {/* Approval Note */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 0.75,
                        mb: 2,
                        px: 1.5,
                        py: 1,
                        bgcolor: 'rgba(59, 130, 246, 0.08)',
                        borderRadius: 1,
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                    }}>
                        <InfoCircle size={14} color="#3B82F6" style={{ flexShrink: 0, marginTop: 2 }} />
                        <Typography variant="caption" sx={{ color: '#1E40AF', fontSize: '0.75rem', lineHeight: 1.5 }}>
                            {t('terms_approval_note', 'ลำดับการอนุมัติอาจแตกต่างกันในแต่ละฝ่าย/แผนก ขึ้นอยู่กับนโยบายของหน่วยงาน')}
                        </Typography>
                    </Box>

                    {/* Other items */}
                    <ListItem
                        icon={<Folder2 size={16} color="#8B5CF6" variant="Bold" />}
                        iconBgColor="rgba(139, 92, 246, 0.1)"
                        title={t('terms_submit_steps', 'ขั้นตอนการยื่นใบลา')}
                        subtitle={t('terms_submit_steps_count', '5 ขั้นตอน')}
                        isOpen={openItems['submit-steps']}
                        onClick={() => toggleItem('submit-steps')}
                    >
                        <Box component="ol" sx={{ m: 0, pl: 2, color: '#6B7280', fontSize: '0.875rem', lineHeight: 2 }}>
                            <li>- {t('terms_submit_step_1', 'เลือกประเภทการลา')}</li>
                            <li>- {t('terms_submit_step_2', 'กำหนดวันที่ลา')}</li>
                            <li>- {t('terms_submit_step_3', 'ระบุเหตุผล')}</li>
                            <li>- {t('terms_submit_step_4', 'แนบเอกสาร (ถ้ามี)')}</li>
                            <li>- {t('terms_submit_step_5', 'ส่งใบลา')}</li>
                        </Box>
                    </ListItem>

                    <ListItem
                        icon={<Folder2 size={16} color="#EC4899" variant="Bold" />}
                        iconBgColor="rgba(236, 72, 153, 0.1)"
                        title={t('terms_cancel_leave', 'การยกเลิกใบลา')}
                        subtitle={t('terms_cancel_condition', 'ยกเลิกได้เฉพาะกรณีที่ยังไม่มีการอนุมัติหรือปฏิเสธ')}
                    />
                </AccordionSection>


            </Box>
        </Box>
    );
}
