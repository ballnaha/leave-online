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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import {
    ArrowLeft2,
    Calendar,
    Clock,
    DocumentText,
    DocumentUpload,
    Call,
    Location,
    User,
    Briefcase,
    Heart,
    Sun1,
    InfoCircle,
    Send2,
    Save2,
    CloseCircle,
    Paperclip2,
    Warning2,
    Health,
    Sun,
    People,
    Building,
    Shield,
    Profile2User,
    Car,
    Add,
    Minus,
    Moon,
    CalendarRemove,
    TickCircle,
} from 'iconsax-react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToastr } from '@/app/components/Toastr';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/th';
import 'dayjs/locale/en';
import 'dayjs/locale/my';
import { useLocale } from '@/app/providers/LocaleProvider';

// สีหลักของระบบ
const PRIMARY_COLOR = '#1976d2';
const PRIMARY_LIGHT = '#e3f2fd';

// กำหนด icon และสีสำหรับแต่ละประเภทการลา
const leaveTypeConfig: Record<string, { icon: any; color: string; lightColor: string }> = {
    sick: { icon: Health, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
    personal: { icon: Briefcase, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
    vacation: { icon: Sun1, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
    annual: { icon: Sun, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
    maternity: { icon: People, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
    ordination: { icon: Building, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
    work_outside: { icon: Car, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
    absent: { icon: Warning2, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
    military: { icon: Shield, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
    marriage: { icon: Heart, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
    funeral: { icon: Profile2User, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
    paternity: { icon: User, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
    sterilization: { icon: Health, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
    business: { icon: Car, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
    unpaid: { icon: Clock, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
    default: { icon: InfoCircle, color: PRIMARY_COLOR, lightColor: PRIMARY_LIGHT },
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

interface HolidayData {
    id: number;
    date: string; // YYYY-MM-DD
    name: string;
    type: string;
    companyId: number | null;
    deductFromAnnualLeave?: boolean;
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
    const { t, locale } = useLocale();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const leaveCode = params.type as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [leaveType, setLeaveType] = useState<LeaveTypeData | null>(null);
    const [holidays, setHolidays] = useState<HolidayData[]>([]); // วันหยุดจาก database
    const [forcedLeaveDays, setForcedLeaveDays] = useState<number>(0); // จำนวนวันบังคับพักร้อน
    const [shiftType, setShiftType] = useState<'day' | 'night'>('day'); // กะทำงาน: day = กะเช้า, night = กะดึก
    const [durationType, setDurationType] = useState<'full' | 'morning' | 'afternoon'>('full'); // ประเภทเวลาเริ่ม: เต็มวัน, ครึ่งเช้า, ครึ่งบ่าย
    const [endDurationType, setEndDurationType] = useState<'full' | 'morning' | 'afternoon'>('full'); // ประเภทเวลาสิ้นสุด: เต็มวัน, ครึ่งเช้า, ครึ่งบ่าย
    const [worksOnSunday, setWorksOnSunday] = useState<boolean>(false); // ทำงานวันอาทิตย์หรือไม่
    const [backdateWarning, setBackdateWarning] = useState<{
        show: boolean;
        leaveDate: string;
        deadline: string;
        isOverdue: boolean;
    } | null>(null);
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
    // Dayjs state for DatePicker and TimePicker
    const [startDateValue, setStartDateValue] = useState<Dayjs | null>(null);
    const [endDateValue, setEndDateValue] = useState<Dayjs | null>(null);
    const [startTimeValue, setStartTimeValue] = useState<Dayjs | null>(dayjs().hour(8).minute(0));
    const [endTimeValue, setEndTimeValue] = useState<Dayjs | null>(dayjs().hour(17).minute(0));

    const [processingAttachments, setProcessingAttachments] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // ค่าคงที่สำหรับลาย้อนหลัง
    const MAX_BACKDATE_DAYS = 3; // จำนวนวันทำการที่อนุญาตให้ลาย้อนหลัง (นับจากวันถัดจากวันสิ้นสุดลา)

    /**
     * คำนวณวันสุดท้ายที่สามารถยื่นใบลาย้อนหลังได้
     * กฎ: ลาย้อนหลังได้ 3 วันทำการ นับจากวันถัดจากวันสิ้นสุดการลา
     * - วันที่ 1 = วันถัดจากวันสิ้นสุดลา (ถ้าเป็นวันทำการ)
     * - วันที่ 3 = วันสุดท้ายที่ยื่นใบลาได้
     * - ข้ามวันอาทิตย์ (ถ้าไม่ทำงานวันอาทิตย์) และวันหยุดจาก holiday table
     * 
     * ตัวอย่าง: ลาวันที่ 4 ธค. (พุธ)
     * - วันที่ 5 ธค. (พฤหัส) → นับ 1
     * - วันที่ 6 ธค. (ศุกร์) → นับ 2
     * - วันที่ 7 ธค. (เสาร์) → นับ 3 = deadline
     * (ถ้าวันที่ 5 เป็นวันหยุด จะข้ามไปนับวันที่ 6 แทน)
     * 
     * @param leaveEndDate - วันที่สิ้นสุดการลา
     * @param worksOnSun - ทำงานวันอาทิตย์หรือไม่
     * @param holidayList - รายการวันหยุด
     * @returns วันสุดท้ายที่ยื่นได้
     */
    const calculateBackdateDeadline = (leaveEndDate: Dayjs, worksOnSun: boolean, holidayList: HolidayData[]): Dayjs => {
        let currentDate = leaveEndDate.clone();
        let workingDaysCounted = 0;

        // นับวันทำการ เริ่มจากวันถัดจากวันลา
        while (workingDaysCounted < MAX_BACKDATE_DAYS) {
            currentDate = currentDate.add(1, 'day');

            // ถ้าไม่ทำงานวันอาทิตย์ และวันนี้เป็นวันอาทิตย์ → ข้าม
            if (!worksOnSun && currentDate.day() === 0) {
                continue;
            }

            // ถ้าเป็นวันหยุด → ข้าม
            const dateStr = currentDate.format('YYYY-MM-DD');
            if (holidayList.some(h => h.date === dateStr)) {
                continue;
            }

            workingDaysCounted++;
        }

        return currentDate;
    };

    /**
     * ตรวจสอบว่าลาย้อนหลังเกิน deadline หรือไม่
     * กฎ: วันที่เขียนใบลา (วันนี้) ต้องไม่เกิน deadline
     * - ถ้าวันสิ้นสุดลา >= วันนี้ → ลาล่วงหน้า → ไม่ต้อง warning
     * - ถ้าวันสิ้นสุดลา < วันนี้ → ลาย้อนหลัง → ตรวจสอบว่าวันนี้เกิน deadline หรือไม่
     * 
     * @param leaveStartDate - วันที่เริ่มลา
     * @param worksOnSun - ทำงานวันอาทิตย์หรือไม่
     * @param leaveEndDate - วันที่สิ้นสุดลา (ถ้าไม่ระบุจะใช้ startDate)
     */
    const checkBackdateWarning = (leaveStartDate: string, worksOnSun: boolean, leaveEndDate?: string) => {
        if (!leaveStartDate) {
            setBackdateWarning(null);
            return;
        }

        const today = dayjs().startOf('day');
        const leaveStart = dayjs(leaveStartDate).startOf('day');
        const leaveEnd = leaveEndDate ? dayjs(leaveEndDate).startOf('day') : leaveStart;

        // ถ้าลาล่วงหน้า (วันสิ้นสุดลา >= วันนี้) ไม่ต้อง warning
        if (leaveEnd.isSame(today, 'day') || leaveEnd.isAfter(today)) {
            setBackdateWarning(null);
            return;
        }

        // คำนวณ deadline สำหรับลาย้อนหลัง (นับจากวันสิ้นสุดการลา ข้ามวันหยุด)
        const deadline = calculateBackdateDeadline(leaveEnd, worksOnSun, holidays);

        // วันที่เขียนใบลา = วันนี้ ต้องไม่เกิน deadline
        const isOverdue = today.isAfter(deadline);

        setBackdateWarning({
            show: true,
            leaveDate: leaveStart.locale(locale).format('DD MMM') + ' ' + (locale === 'th' ? leaveStart.year() + 543 : leaveStart.year()),
            deadline: deadline.locale(locale).format('DD MMM') + ' ' + (locale === 'th' ? deadline.year() + 543 : deadline.year()),
            isOverdue,
        });
    };

    // ฟังก์ชันตรวจสอบว่าวันที่เป็นวันหยุดหรือไม่
    const isHoliday = (date: Dayjs, holidayList: HolidayData[]): boolean => {
        const dateStr = date.format('YYYY-MM-DD');
        return holidayList.some(h => h.date === dateStr);
    };

    // ฟังก์ชันเปลี่ยนทำงานวันอาทิตย์
    const handleWorksOnSundayChange = (newValue: boolean) => {
        setWorksOnSunday(newValue);

        // คำนวณจำนวนวันลาใหม่
        if (formData.startDate && formData.endDate) {
            recalculateTotalDays(formData.startDate, formData.startTime, formData.endDate, formData.endTime, newValue, holidays);
        }

        // ตรวจสอบ backdate warning ใหม่ (ใช้ endDate ถ้ามี ไม่งั้นใช้ startDate)
        if (formData.startDate) {
            checkBackdateWarning(formData.startDate, newValue, formData.endDate || formData.startDate);
        }
    };

    // Helper to get start/end times based on shift and duration type
    const getTimesForDuration = (shift: 'day' | 'night', duration: 'full' | 'morning' | 'afternoon', isStart: boolean) => {
        let time = '';
        if (shift === 'day') {
            if (duration === 'full') {
                time = isStart ? '08:00' : '17:00';
            } else if (duration === 'morning') {
                time = isStart ? '08:00' : '12:00';
            } else if (duration === 'afternoon') {
                time = isStart ? '13:00' : '17:00';
            }
        } else { // night
            if (duration === 'full') {
                time = isStart ? '20:00' : '05:00';
            } else if (duration === 'morning') { // ครึ่งแรกของกะดึก (20:00 - 00:00)
                time = isStart ? '20:00' : '00:00';
            } else if (duration === 'afternoon') { // ครึ่งหลังของกะดึก (01:00 - 05:00)
                time = isStart ? '01:00' : '05:00';
            }
        }
        return time;
    };

    // ฟังก์ชันอัปเดตเวลาตามกะและประเภทเวลา
    // ฟังก์ชันอัปเดตเวลาตามกะและประเภทเวลา
    const updateTimes = (
        shift: 'day' | 'night',
        startDur: 'full' | 'morning' | 'afternoon',
        endDur: 'full' | 'morning' | 'afternoon',
        dateOverrides?: { startDate?: string, endDate?: string }
    ) => {
        const newStart = getTimesForDuration(shift, startDur, true);
        const newEnd = getTimesForDuration(shift, endDur, false);

        // อัปเดต state เวลา
        const [sh, sm] = newStart.split(':').map(Number);
        const [eh, em] = newEnd.split(':').map(Number);

        setStartTimeValue(dayjs().hour(sh).minute(sm));
        setEndTimeValue(dayjs().hour(eh).minute(em));

        // อัปเดต formData (ต้องทำทีละ field เพราะ handleFormChange จัดการทีละ field)
        setFormData(prev => ({
            ...prev,
            startTime: newStart,
            endTime: newEnd
        }));

        // ใช้ค่าจาก override ถ้ามี ไม่งั้นใช้จาก state
        const sDate = dateOverrides?.startDate ?? formData.startDate;
        const eDate = dateOverrides?.endDate ?? formData.endDate;

        // คำนวณจำนวนวันลาใหม่
        if (sDate && eDate) {
            recalculateTotalDays(sDate, newStart, eDate, newEnd, worksOnSunday, holidays);
        }
    };

    // ฟังก์ชันเปลี่ยนกะทำงาน
    // ฟังก์ชันเปลี่ยนกะทำงาน
    const handleShiftChange = (newShift: 'day' | 'night') => {
        setShiftType(newShift);
        updateTimes(newShift, durationType, endDurationType);
    };

    // ฟังก์ชันเปลี่ยนประเภทเวลาลางาน (เริ่ม)
    const handleDurationTypeChange = (newDuration: 'full' | 'morning' | 'afternoon') => {
        setDurationType(newDuration);

        const isSameDay = formData.startDate && formData.endDate && dayjs(formData.startDate).isSame(dayjs(formData.endDate), 'day');
        const isMultiDay = formData.startDate && formData.endDate && !isSameDay;

        // ถ้าเลือก 'ครึ่งเช้า' แต่เป็นการลาหลายวัน -> ไม่อนุญาต (เพราะบ่ายต้องกลับมาทำงาน)
        if (newDuration === 'morning' && isMultiDay) {
            // Reset endDate เป็นวันเดียวกับ startDate
            handleFormChange('endDate', formData.startDate);
            setEndDateValue(startDateValue);
            setEndDurationType('morning');
            toastr.warning('ลาครึ่งเช้าสามารถลาได้เฉพาะวันเดียวเท่านั้น เนื่องจากบ่ายต้องกลับมาทำงาน');
            updateTimes(shiftType, newDuration, newDuration, { endDate: formData.startDate });
            return;
        }

        if (isSameDay) {
            setEndDurationType(newDuration);
            updateTimes(shiftType, newDuration, newDuration);
        } else {
            updateTimes(shiftType, newDuration, endDurationType);
        }
    };

    // ฟังก์ชันเปลี่ยนประเภทเวลาลางาน (สิ้นสุด)
    const handleEndDurationTypeChange = (newEndDuration: 'full' | 'morning' | 'afternoon') => {
        setEndDurationType(newEndDuration);
        updateTimes(shiftType, durationType, newEndDuration);
    };

    // ฟังก์ชันคำนวณจำนวนวันลาตามช่วงเวลา
    const calculateLeaveDays = (
        startDate: string,
        startTime: string,
        endDate: string,
        endTime: string,
        worksOnSun: boolean = worksOnSunday, // ใช้ค่าจาก state ถ้าไม่ได้ส่งมา
        holidayList: HolidayData[] = holidays // ใช้ค่าจาก state ถ้าไม่ได้ส่งมา
    ): number => {
        if (!startDate || !endDate || !startTime || !endTime) return 0;

        const start = dayjs(startDate);
        const end = dayjs(endDate);
        const daysDiff = end.diff(start, 'day');

        if (end.isBefore(start)) return 0;

        // แปลงเวลาเป็นนาที
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        // กำหนดเวลาทำงานมาตรฐาน (นาที)
        const WORK_START_MORNING = 8 * 60;     // 08:00
        const WORK_HALF_DAY_1 = 12 * 60;       // 12:00 (ครึ่งวันเช้า)
        const WORK_HALF_DAY_2 = 13 * 60;       // 13:00 (ครึ่งวันบ่าย)
        const WORK_END_DAY = 17 * 60;          // 17:00

        // กะดึก: 20:00 - 05:00 (9 ชม. = 1 วันทำงาน)
        const NIGHT_START = 20 * 60;           // 20:00
        const NIGHT_SHIFT_HOURS = 9;           // ชั่วโมงต่อกะ
        const NIGHT_HALF_HOURS = 4.5;          // ครึ่งกะ

        // ตรวจสอบว่าเป็นกะดึกหรือไม่ (เริ่มตั้งแต่ 20:00)
        const isNightShift = startMinutes >= NIGHT_START;

        if (isNightShift) {
            // === กะดึก: นับตามกะที่เริ่มในแต่ละคืน ===
            // กะดึกเริ่ม 20:00 ทุกวัน และจบ 05:00 วันถัดไป

            let totalDays = 0;
            let currentDate = start.clone();
            const endDateTime = dayjs(`${endDate} ${endTime}`);

            // วนลูปนับแต่ละกะ
            while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
                // ถ้าไม่ทำงานวันอาทิตย์ และวันนี้เป็นวันอาทิตย์ → ข้ามไปวันถัดไป
                if (!worksOnSun && currentDate.day() === 0) {
                    currentDate = currentDate.add(1, 'day');
                    continue;
                }

                // ถ้าเป็นวันหยุด → ข้ามไปวันถัดไป
                if (isHoliday(currentDate, holidayList)) {
                    currentDate = currentDate.add(1, 'day');
                    continue;
                }

                // กะของวันนี้: currentDate 20:00 - currentDate+1 05:00
                const shiftStart = currentDate.hour(20).minute(0).second(0);
                const shiftEnd = currentDate.add(1, 'day').hour(5).minute(0).second(0);

                // ถ้าวันแรก ให้ใช้เวลาเริ่มจริง
                const actualShiftStart = currentDate.isSame(start, 'day')
                    ? dayjs(`${startDate} ${startTime}`)
                    : shiftStart;

                // ถ้ากะนี้เริ่มหลังเวลาสิ้นสุดการลา ให้หยุดนับ
                if (actualShiftStart.isAfter(endDateTime) || actualShiftStart.isSame(endDateTime)) {
                    break;
                }

                // หาเวลาสิ้นสุดของกะนี้ (เอาค่าที่น้อยกว่าระหว่าง shiftEnd กับ endDateTime)
                const actualShiftEnd = shiftEnd.isAfter(endDateTime) ? endDateTime : shiftEnd;

                // คำนวณชั่วโมงที่ลาในกะนี้
                const hoursInShift = actualShiftEnd.diff(actualShiftStart, 'hour', true);

                if (hoursInShift > 0) {
                    if (hoursInShift >= NIGHT_SHIFT_HOURS) {
                        totalDays += 1; // เต็มกะ
                    } else if (hoursInShift >= NIGHT_HALF_HOURS) {
                        totalDays += 0.5; // มากกว่าครึ่งกะ = 0.5 วัน
                    } else if (hoursInShift > 0) {
                        totalDays += 0.5; // น้อยกว่าครึ่งกะ = 0.5 วัน (ขั้นต่ำ)
                    }
                }

                // ไปวันถัดไป
                currentDate = currentDate.add(1, 'day');

                // ถ้าเวลาสิ้นสุดการลาอยู่ก่อนหรือเท่ากับ 05:00 ของวันนี้ ให้หยุด
                if (endDateTime.isBefore(shiftEnd) || endDateTime.isSame(shiftEnd)) {
                    break;
                }
            }

            return totalDays;
        }

        // === กะปกติ: 08:00 - 17:00 ===
        // ถ้าไม่ทำงานวันอาทิตย์ ต้องนับเฉพาะวันที่ไม่ใช่วันอาทิตย์
        // const daysDiff = end.diff(start, 'day'); // moved to top

        // นับจำนวนวันอาทิตย์และวันหยุดในช่วง (ถ้าไม่ทำงานวันอาทิตย์)
        let sundaysInRange = 0;
        if (!worksOnSun) {
            let currentDate = start.clone();
            while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
                if (currentDate.day() === 0) {
                    sundaysInRange++;
                }
                currentDate = currentDate.add(1, 'day');
            }
        }

        // ถ้าเป็นวันเดียวกัน
        if (daysDiff === 0) {
            // ถ้าเป็นวันอาทิตย์และไม่ทำงานวันอาทิตย์ → 0 วัน
            if (!worksOnSun && start.day() === 0) {
                return 0;
            }
            // ถ้าเป็นวันหยุด → 0 วัน
            if (isHoliday(start, holidayList)) {
                return 0;
            }
            // ลาเต็มวัน: 08:00 - 17:00
            if (startMinutes <= WORK_START_MORNING && endMinutes >= WORK_END_DAY) {
                return 1;
            }
            // ลาครึ่งวันเช้า: 08:00 - 12:00 หรือ 08:00 - 13:00
            if (startMinutes <= WORK_START_MORNING && endMinutes <= WORK_HALF_DAY_2) {
                return 0.5;
            }
            // ลาครึ่งวันบ่าย: 12:00 - 17:00 หรือ 13:00 - 17:00
            if (startMinutes >= WORK_HALF_DAY_1 && endMinutes >= WORK_END_DAY) {
                return 0.5;
            }
            // กรณีอื่นๆ คำนวณตามสัดส่วน
            const workedMinutes = endMinutes - startMinutes;
            const fullDayMinutes = WORK_END_DAY - WORK_START_MORNING; // 540 นาที = 9 ชม.
            const ratio = workedMinutes / fullDayMinutes;

            if (ratio <= 0.6) return 0.5;
            return 1;
        }

        // หลายวัน: คำนวณโดยวนลูปทีละวัน (เพื่อให้ข้ามวันอาทิตย์ได้ถูกต้อง)
        let totalDays = 0;
        let currentDate = start.clone();
        let dayIndex = 0;
        const totalCalendarDays = daysDiff + 1;

        while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
            const isSunday = currentDate.day() === 0;

            // ถ้าไม่ทำงานวันอาทิตย์ และวันนี้เป็นวันอาทิตย์ → ข้าม
            if (!worksOnSun && isSunday) {
                currentDate = currentDate.add(1, 'day');
                dayIndex++;
                continue;
            }

            // ถ้าเป็นวันหยุด → ข้าม
            if (isHoliday(currentDate, holidayList)) {
                currentDate = currentDate.add(1, 'day');
                dayIndex++;
                continue;
            }

            const isFirstDay = dayIndex === 0;
            const isLastDay = dayIndex === totalCalendarDays - 1;

            if (isFirstDay) {
                // วันแรก - ลาจากเวลาที่เลือกจนถึงสิ้นวัน
                // ถ้าเริ่ม 08:00 (เช้า/เต็มวัน) = ลา 08:00-17:00 = 1.0 วัน
                // ถ้าเริ่ม 13:00 (บ่าย) = ลา 13:00-17:00 = 0.5 วัน
                if (startMinutes <= WORK_HALF_DAY_1) { // เริ่มก่อนหรือตอนเที่ยง (รวม 08:00)
                    totalDays += 1; // ลาเต็มวันแรก
                } else { // เริ่มหลังเที่ยง (13:00+)
                    totalDays += 0.5; // ลาครึ่งวันบ่ายของวันแรก
                }
            } else if (isLastDay) {
                // วันสุดท้าย - ลาจากเริ่มต้นวันจนถึงเวลาที่เลือก
                // ถ้าจบ 12:00 (เช้า) = ลา 08:00-12:00 = 0.5 วัน
                // ถ้าจบ 17:00 (บ่าย/เต็มวัน) = ลา 08:00-17:00 = 1.0 วัน
                if (endMinutes >= WORK_HALF_DAY_2) { // จบ 13:00+ (รวม 17:00)
                    totalDays += 1; // ลาเต็มวันสุดท้าย
                } else { // จบก่อน 13:00 (12:00 หรือก่อนหน้า)
                    totalDays += 0.5; // ลาครึ่งวันเช้าของวันสุดท้าย
                }
            } else {
                // วันกลาง (ลาเต็มวัน)
                totalDays += 1;
            }

            currentDate = currentDate.add(1, 'day');
            dayIndex++;
        }

        return totalDays;
    };

    const maxLeaveDaysByRange = useMemo(() => {
        if (!formData.startDate || !formData.endDate) return null;
        const start = dayjs(formData.startDate);
        const end = dayjs(formData.endDate);
        if (end.isBefore(start)) {
            return null;
        }
        // นับจำนวนวันที่ทำงาน (ไม่รวมวันอาทิตย์ถ้าไม่ทำงาน และไม่รวมวันหยุด)
        let count = 0;
        let currentDate = start.clone();
        while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
            // ไม่นับวันอาทิตย์ (ถ้าไม่ทำงานวันอาทิตย์)
            if (!worksOnSunday && currentDate.day() === 0) {
                currentDate = currentDate.add(1, 'day');
                continue;
            }
            // ไม่นับวันหยุด
            if (isHoliday(currentDate, holidays)) {
                currentDate = currentDate.add(1, 'day');
                continue;
            }
            count++;
            currentDate = currentDate.add(1, 'day');
        }
        return count;
    }, [formData.startDate, formData.endDate, worksOnSunday, holidays]);

    // คำนวณจำนวนวันลาเมื่อมีการเปลี่ยนแปลงวันที่หรือเวลา
    const recalculateTotalDays = (
        startDate: string,
        startTime: string,
        endDate: string,
        endTime: string,
        worksOnSun: boolean = worksOnSunday,
        holidayList: HolidayData[] = holidays
    ) => {
        const days = calculateLeaveDays(startDate, startTime, endDate, endTime, worksOnSun, holidayList);
        // อัปเดตเสมอ รวมถึงกรณี 0 วัน (วันหยุด)
        handleFormChange('totalDays', days.toString());
    };

    const baseTotalDaysHelper = 'ระบุจำนวนวันลา เช่น 0.5 = ครึ่งวัน, 1 = เต็มวัน';
    const totalDaysHelperText = errors.totalDays || (maxLeaveDaysByRange ? `${baseTotalDaysHelper} (สูงสุด ${maxLeaveDaysByRange} วัน)` : baseTotalDaysHelper);

    // โหลดข้อมูลผู้ใช้และประเภทการลา
    useEffect(() => {
        const fetchData = async () => {
            try {
                // ดึงข้อมูลผู้ใช้
                const profileRes = await fetch('/api/profile');
                if (!profileRes.ok) throw new Error('Failed to fetch profile');
                const profileData = await profileRes.json();
                setUserProfile(profileData);

                // ดึงข้อมูลประเภทการลา (ส่งปีปัจจุบันเพื่อคำนวณสิทธิ์ลาพักร้อน)
                const currentYear = new Date().getFullYear();
                const leaveTypesRes = await fetch(`/api/leave-types?year=${currentYear}`);
                if (!leaveTypesRes.ok) throw new Error('Failed to fetch leave types');
                const leaveTypesData = await leaveTypesRes.json();
                const selectedType = leaveTypesData.find((lt: LeaveTypeData) => lt.code === leaveCode);
                if (selectedType) {
                    setLeaveType(selectedType);
                } else {
                    toastr.error('ไม่พบประเภทการลาที่เลือก');
                    router.push('/leave');
                }

                // ดึงข้อมูลวันหยุดของปีปัจจุบันและปีถัดไป
                const nextYear = currentYear + 1;
                const [holidaysCurrentRes, holidaysNextRes] = await Promise.all([
                    fetch(`/api/holidays?year=${currentYear}`),
                    fetch(`/api/holidays?year=${nextYear}`),
                ]);

                const holidaysData: HolidayData[] = [];
                if (holidaysCurrentRes.ok) {
                    const currentYearHolidays = await holidaysCurrentRes.json();
                    holidaysData.push(...currentYearHolidays);

                    // คำนวณจำนวนวันบังคับพักร้อนในปีปัจจุบัน
                    const forcedHolidays = currentYearHolidays.filter((h: HolidayData) => h.deductFromAnnualLeave);
                    console.log('[DEBUG] Current Year:', currentYear);
                    console.log('[DEBUG] Total holidays:', currentYearHolidays.length);
                    console.log('[DEBUG] Forced holidays:', forcedHolidays);
                    setForcedLeaveDays(forcedHolidays.length);
                }
                if (holidaysNextRes.ok) {
                    const nextYearHolidays = await holidaysNextRes.json();
                    holidaysData.push(...nextYearHolidays);
                }
                setHolidays(holidaysData);
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

        // ตรวจสอบใบรับรองแพทย์สำหรับลาป่วยตั้งแต่ 3 วันขึ้นไป
        if (leaveCode === 'sick' && totalDaysNum >= 3 && formData.attachments.length === 0) {
            newErrors.attachments = 'กรุณาแนบใบรับรองแพทย์เนื่องจากลาป่วยตั้งแต่ 3 วันขึ้นไป';
        }

        // ตรวจสอบหลักฐานสำหรับลากิจตั้งแต่ 1 วันขึ้นไป
        if (leaveCode === 'personal' && totalDaysNum >= 1 && formData.attachments.length === 0) {
            newErrors.attachments = 'กรุณาแนบหลักฐานการลากิจ';
        }

        // ตรวจสอบลาย้อนหลังเกินกำหนด
        if (backdateWarning?.isOverdue) {
            newErrors.backdateOverdue = 'ไม่สามารถยื่นใบลาได้ เนื่องจากลาย้อนหลังเกินกำหนด';
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
                await cleanupUploadedFiles();
                toastr.error(errorData.error || 'ไม่สามารถบันทึกคำขอลาได้');
                setSubmitting(false);
                return;
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
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', pb: 12 }}>
                {/* Header Skeleton */}
                <Box
                    sx={{
                        bgcolor: 'white',
                        position: 'sticky',
                        top: 0,
                        zIndex: 100,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        borderBottom: '1px solid #f0f0f0',
                        py: 2,
                        px: 2
                    }}
                >
                    <Container maxWidth={false} sx={{ maxWidth: 1200 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                            {/* Back Button */}
                            <Skeleton variant="circular" width={40} height={40} sx={{ position: 'absolute', left: 0 }} />

                            {/* Title & Description */}
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Skeleton variant="text" width={150} height={32} />
                                <Skeleton variant="text" width={100} height={20} />
                            </Box>

                            {/* Quota Chips */}
                            <Box sx={{ position: 'absolute', right: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                                <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: 4 }} />
                                <Skeleton variant="rounded" width={60} height={24} sx={{ borderRadius: 4 }} />
                            </Box>
                        </Box>
                    </Container>
                </Box>

                <Container maxWidth={false} disableGutters sx={{ maxWidth: 1200, px: { xs: 1.5, sm: 2 }, pt: 3 }}>
                    {/* User Info Section Skeleton */}
                    <Box sx={{ mb: 2.5, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: 1 }} />
                            <Skeleton variant="text" width={120} height={24} />
                        </Box>
                        <Box sx={{ display: 'grid', gap: 1.5 }}>
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Skeleton variant="text" width={80} />
                                    <Skeleton variant="text" width={120} />
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    {/* Leave Details Section Skeleton */}
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: 1 }} />
                            <Skeleton variant="text" width={140} height={24} />
                        </Box>

                        {/* Date Write */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2.5 }}>
                            <Skeleton variant="text" width={100} />
                            <Skeleton variant="text" width={120} />
                        </Box>

                        {/* Shift Type */}
                        <Box sx={{ mb: 2.5 }}>
                            <Skeleton variant="text" width={80} sx={{ mb: 1 }} />
                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                                <Skeleton variant="rounded" width={140} height={36} sx={{ borderRadius: 2 }} />
                                <Skeleton variant="rounded" width={140} height={36} sx={{ borderRadius: 2 }} />
                            </Box>
                        </Box>

                        {/* Start/End Date Time */}
                        <Box sx={{ mb: 3 }}>
                            <Skeleton variant="text" width={60} sx={{ mb: 1.5 }} />
                            <Box sx={{ pl: 2, borderLeft: '2px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Skeleton variant="rounded" height={40} sx={{ borderRadius: 1 }} />
                                <Skeleton variant="rounded" height={40} sx={{ borderRadius: 1 }} />
                            </Box>
                        </Box>
                        <Box sx={{ mb: 1 }}>
                            <Skeleton variant="text" width={60} sx={{ mb: 1.5 }} />
                            <Box sx={{ pl: 2, borderLeft: '2px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Skeleton variant="rounded" height={40} sx={{ borderRadius: 1 }} />
                                <Skeleton variant="rounded" height={40} sx={{ borderRadius: 1 }} />
                            </Box>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    {/* Total Days Skeleton */}
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: 1 }} />
                            <Skeleton variant="text" width={100} height={24} />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mb: 1.5 }}>
                            <Skeleton variant="circular" width={36} height={36} />
                            <Skeleton variant="rounded" width={80} height={60} sx={{ borderRadius: 1.5 }} />
                            <Skeleton variant="circular" width={36} height={36} />
                        </Box>
                        <Skeleton variant="text" width={200} sx={{ mx: 'auto' }} />
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    {/* Reason Skeleton */}
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: 1 }} />
                            <Skeleton variant="text" width={100} height={24} />
                        </Box>
                        <Skeleton variant="rounded" height={100} sx={{ borderRadius: 1 }} />
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    {/* Attachments Skeleton */}
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: 1 }} />
                            <Skeleton variant="text" width={80} height={24} />
                        </Box>
                        <Skeleton variant="rounded" height={50} sx={{ borderRadius: 2 }} />
                    </Box>
                </Container>

                {/* Footer Skeleton */}
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        bgcolor: 'white',
                        borderTop: '1px solid #e0e0e0',
                        px: 2,
                        py: 2,
                        zIndex: 100,
                    }}
                >
                    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                        <Skeleton variant="rounded" height={48} sx={{ borderRadius: 3 }} />
                    </Box>
                </Box>
            </Box>
        );
    }

    // ดึง config สำหรับ icon และสี
    const config = leaveTypeConfig[leaveType.code] || leaveTypeConfig.default;
    const IconComponent = config.icon;

    return (
        <>
            <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', pb: 12 }}>
                {/* Header - White with centered text */}
                <Box
                    sx={{
                        bgcolor: 'white',
                        position: 'sticky',
                        top: 0,
                        zIndex: 100,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        borderBottom: '1px solid #f0f0f0',
                    }}
                >
                    <Container maxWidth={false} sx={{ maxWidth: 1200 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 2, position: 'relative' }}>
                            <IconButton
                                onClick={() => router.back()}
                                sx={{
                                    position: 'absolute',
                                    left: 8,
                                    color: '#1E293B',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                                }}
                            >
                                <ArrowLeft2 size={22} color="#1E293B" />
                            </IconButton>

                            <Box sx={{ flex: 1, textAlign: 'center' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2, color: '#1E293B' }}>
                                    {t(`leave_${leaveType.code}`, leaveType.name)}
                                </Typography>
                                {leaveType.description && (
                                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                                        {leaveType.description}
                                    </Typography>
                                )}
                            </Box>
                            {leaveType.maxDaysPerYear && (
                                <Box sx={{
                                    position: 'absolute',
                                    right: 16,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-end',
                                    gap: 0.5
                                }}>
                                    <Chip
                                        size="small"
                                        label={`${leaveType.maxDaysPerYear} ${t('leave_days_per_year', 'วัน/ปี')}`}
                                        sx={{
                                            bgcolor: config.lightColor,
                                            color: config.color,
                                            fontWeight: 600,
                                            fontSize: '0.7rem',
                                        }}
                                    />
                                    <Chip
                                        size="small"
                                        label={leaveType.isPaid ? t('dashboard_paid', 'ได้ค่าจ้าง') : t('dashboard_unpaid', 'ไม่ได้ค่าจ้าง')}
                                        sx={{
                                            bgcolor: leaveType.isPaid ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 152, 0, 0.15)',
                                            color: leaveType.isPaid ? '#4CAF50' : '#FF9800',
                                            fontWeight: 600,
                                            fontSize: '0.65rem',
                                        }}
                                    />
                                    {/* แสดง Chip บังคับพักร้อน เฉพาะลาพักร้อนและมีวันบังคับ */}
                                    {leaveType.code === 'vacation' && forcedLeaveDays > 0 && (
                                        <Chip
                                            size="small"
                                            icon={<CalendarRemove size={12} color="#E65100" variant="Bold" />}
                                            label={t('forced_annual_leave_days', 'บังคับพักร้อน {{days}} วัน').replace('{{days}}', String(forcedLeaveDays))}
                                            sx={{
                                                bgcolor: 'rgba(230, 81, 0, 0.12)',
                                                color: '#E65100',
                                                fontWeight: 600,
                                                fontSize: '0.65rem',
                                                '& .MuiChip-icon': {
                                                    marginLeft: '4px',
                                                    marginRight: '-2px',
                                                }
                                            }}
                                        />
                                    )}
                                </Box>
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
                                    {t('leave_info', 'ข้อมูลผู้ขอลา')}
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'grid', gap: 1.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">{t('profile_name', 'ชื่อ-นามสกุล')}</Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                        {userProfile?.firstName} {userProfile?.lastName}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">{t('employee_id', 'รหัสพนักงาน')}</Typography>
                                    <Chip size="small" label={userProfile?.employeeId} sx={{ bgcolor: 'grey.100', fontWeight: 500, fontSize: '0.75rem' }} />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">{t('company', 'บริษัท')}</Typography>
                                    <Typography variant="body2" fontWeight={500}>{userProfile?.companyName}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">{t('department', 'ฝ่าย')}</Typography>
                                    <Typography variant="body2" fontWeight={500}>{userProfile?.departmentName || '-'}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">{t('section', 'แผนก')}</Typography>
                                    <Typography variant="body2" fontWeight={500}>{userProfile?.sectionName || '-'}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">{t('position', 'ตำแหน่ง')}</Typography>
                                    <Typography variant="body2" fontWeight={500}>{userProfile?.position || '-'}</Typography>
                                </Box>
                                {userProfile?.shift && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">{t('shift', 'กะ')}</Typography>
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
                                {t('leave_details', 'รายละเอียดการลา')}
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
                                {t('leave_date_write', 'วันที่เขียนใบลา')}
                            </Typography>
                            <Typography variant="body2" fontWeight={600} color={config.color}>
                                {dayjs().locale(locale).format('DD MMMM')} {locale === 'th' ? dayjs().year() + 543 : dayjs().year()}
                            </Typography>
                        </Box>

                        {/* Options Group: Shift & Sunday (Mobile Friendly) */}
                        <Box sx={{ mb: 3 }}>
                            {/* Row 1: Shift & Sunday */}
                            <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                                {/* Shift Type */}
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                                        {t('shift_type', 'ประเภทกะ')}
                                    </Typography>
                                    <Box sx={{ display: 'flex', bgcolor: 'transparent', gap: 1 }}>
                                        <Box onClick={() => handleShiftChange('day')}
                                            sx={{
                                                flex: 1, py: 1, borderRadius: 1.5, cursor: 'pointer', textAlign: 'center',
                                                bgcolor: shiftType === 'day' ? '#FFF3E0' : 'white',
                                                color: shiftType === 'day' ? '#E65100' : 'text.secondary',
                                                border: shiftType === 'day' ? '2px solid #E65100' : '1px solid #E2E8F0',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                transform: shiftType === 'day' ? 'scale(1.02)' : 'scale(1)',
                                                boxShadow: shiftType === 'day' ? '0 4px 12px rgba(230, 81, 0, 0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
                                                '&:hover': {
                                                    transform: 'scale(1.02)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                },
                                                '&:active': {
                                                    transform: 'scale(0.98)',
                                                }
                                            }}>
                                            <Sun1 size={20} color={shiftType === 'day' ? '#E65100' : '#94A3B8'} variant={shiftType === 'day' ? 'Bold' : 'Linear'} style={{ transition: 'all 0.3s ease' }} />
                                            <Typography variant="button" sx={{ textTransform: 'none', fontSize: '0.85rem', fontWeight: 600, transition: 'color 0.3s ease' }}>{t('leave_shift_day', 'กะเช้า')}</Typography>
                                        </Box>
                                        <Box onClick={() => handleShiftChange('night')}
                                            sx={{
                                                flex: 1, py: 1, borderRadius: 1.5, cursor: 'pointer', textAlign: 'center',
                                                bgcolor: shiftType === 'night' ? '#E8EAF6' : 'white',
                                                color: shiftType === 'night' ? '#3949AB' : 'text.secondary',
                                                border: shiftType === 'night' ? '2px solid #3949AB' : '1px solid #E2E8F0',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                transform: shiftType === 'night' ? 'scale(1.02)' : 'scale(1)',
                                                boxShadow: shiftType === 'night' ? '0 4px 12px rgba(57, 73, 171, 0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
                                                '&:hover': {
                                                    transform: 'scale(1.02)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                },
                                                '&:active': {
                                                    transform: 'scale(0.98)',
                                                }
                                            }}>
                                            <Moon size={20} color={shiftType === 'night' ? '#3949AB' : '#94A3B8'} variant={shiftType === 'night' ? 'Bold' : 'Linear'} style={{ transition: 'all 0.3s ease' }} />
                                            <Typography variant="button" sx={{ textTransform: 'none', fontSize: '0.85rem', fontWeight: 600, transition: 'color 0.3s ease' }}>{t('leave_shift_night', 'กะดึก')}</Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Work on Sunday */}
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                                        {t('works_on_sunday', 'ทำงานวันอาทิตย์')}
                                    </Typography>
                                    <Box sx={{ display: 'flex', bgcolor: 'transparent', gap: 1 }}>
                                        <Box onClick={() => handleWorksOnSundayChange(false)}
                                            sx={{
                                                flex: 1, py: 1, borderRadius: 1.5, cursor: 'pointer', textAlign: 'center',
                                                bgcolor: !worksOnSunday ? '#FFEBEE' : 'white',
                                                color: !worksOnSunday ? '#D32F2F' : 'text.secondary',
                                                border: !worksOnSunday ? '2px solid #D32F2F' : '1px solid #E2E8F0',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                transform: !worksOnSunday ? 'scale(1.02)' : 'scale(1)',
                                                boxShadow: !worksOnSunday ? '0 4px 12px rgba(211, 47, 47, 0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
                                                '&:hover': {
                                                    transform: 'scale(1.02)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                },
                                                '&:active': {
                                                    transform: 'scale(0.98)',
                                                }
                                            }}>
                                            <CalendarRemove size={20} color={!worksOnSunday ? '#D32F2F' : '#94A3B8'} variant={!worksOnSunday ? 'Bold' : 'Linear'} style={{ transition: 'all 0.3s ease' }} />
                                            <Typography variant="button" sx={{ textTransform: 'none', fontSize: '0.85rem', fontWeight: 600, transition: 'color 0.3s ease' }}>{t('sunday_off', 'หยุด')}</Typography>
                                        </Box>
                                        <Box onClick={() => handleWorksOnSundayChange(true)}
                                            sx={{
                                                flex: 1, py: 1, borderRadius: 1.5, cursor: 'pointer', textAlign: 'center',
                                                bgcolor: worksOnSunday ? '#E8F5E9' : 'white',
                                                color: worksOnSunday ? '#2E7D32' : 'text.secondary',
                                                border: worksOnSunday ? '2px solid #2E7D32' : '1px solid #E2E8F0',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                transform: worksOnSunday ? 'scale(1.02)' : 'scale(1)',
                                                boxShadow: worksOnSunday ? '0 4px 12px rgba(46, 125, 50, 0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
                                                '&:hover': {
                                                    transform: 'scale(1.02)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                },
                                                '&:active': {
                                                    transform: 'scale(0.98)',
                                                }
                                            }}>
                                            <TickCircle size={20} color={worksOnSunday ? '#2E7D32' : '#94A3B8'} variant={worksOnSunday ? 'Bold' : 'Linear'} style={{ transition: 'all 0.3s ease' }} />
                                            <Typography variant="button" sx={{ textTransform: 'none', fontSize: '0.85rem', fontWeight: 600, transition: 'color 0.3s ease' }}>{t('sunday_work', 'ทำ')}</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                            {!worksOnSunday && (
                                <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: 'text.secondary', bgcolor: '#F1F5F9', py: 0.5, borderRadius: 1 }}>
                                    <InfoCircle size={14} color="#64748B" />
                                    <Typography variant="caption">{t('sunday_not_counted', 'วันอาทิตย์จะไม่ถูกนับเป็นวันลา')}</Typography>
                                </Box>
                            )}
                        </Box>

                        {/* ส่วนเริ่มลา */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50', boxShadow: '0 0 0 2px rgba(76, 175, 80, 0.2)' }} />
                                {t('leave_start_section', 'เริ่มลา')}
                            </Typography>
                            <Box sx={{ pl: 2, borderLeft: '2px solid', borderColor: '#f0f0f0', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={locale}>
                                    <DatePicker
                                        label={t('leave_start_date', 'วันที่')}
                                        value={startDateValue}
                                        onChange={(newValue) => {
                                            setStartDateValue(newValue);
                                            if (newValue && newValue.isValid()) {
                                                const newStartDate = newValue.format('YYYY-MM-DD');
                                                handleFormChange('startDate', newStartDate);

                                                // ตรวจสอบว่าเป็นวันหยุดหรือไม่ - แจ้งเตือน
                                                const selectedDate = dayjs(newStartDate);
                                                const isSunday = selectedDate.day() === 0 && !worksOnSunday;
                                                const isHolidayDate = isHoliday(selectedDate, holidays);

                                                if (isSunday || isHolidayDate) {
                                                    const holidayData = holidays.find(h => dayjs(h.date).isSame(selectedDate, 'day'));
                                                    // ใช้ t() เพื่อแปลชื่อวันหยุด โดย fallback เป็นชื่อเดิมถ้าไม่มีการแปล
                                                    const holidayName = holidayData ? t(holidayData.name, holidayData.name) : t('holiday', 'วันหยุด');
                                                    toastr.warning(
                                                        isSunday
                                                            ? t('sunday_is_holiday', 'วันอาทิตย์เป็นวันหยุด ไม่สามารถลาได้')
                                                            : t('selected_date_is_holiday', '{name} เป็นวันหยุด ไม่สามารถลาได้').replace('{name}', holidayName)
                                                    );
                                                }

                                                // ตรวจสอบกรณี durationType เป็น 'morning' แต่ endDate ต่างจาก startDate (หลายวัน)
                                                // กรณีนี้ไม่อนุญาต เพราะลาครึ่งเช้าต้องลาวันเดียวเท่านั้น
                                                if (formData.endDate && durationType === 'morning') {
                                                    const isMultiDay = newStartDate !== formData.endDate;
                                                    if (isMultiDay) {
                                                        // Reset endDate ให้เป็นวันเดียวกับ startDate
                                                        handleFormChange('endDate', newStartDate);
                                                        setEndDateValue(newValue);
                                                        setEndDurationType('morning');
                                                        toastr.warning(t('morning_leave_single_day_only', 'ลาครึ่งเช้าสามารถลาได้เฉพาะวันเดียวเท่านั้น ระบบได้ปรับวันสิ้นสุดให้ตรงกับวันเริ่ม'));
                                                        updateTimes(shiftType, durationType, durationType, { startDate: newStartDate, endDate: newStartDate });
                                                        return; // ไม่ต้องทำต่อ เพราะ updateTimes จะคำนวณให้แล้ว
                                                    }
                                                }

                                                // ตรวจสอบลาย้อนหลัง (เฉพาะเมื่อมี endDate แล้ว)
                                                if (formData.endDate) {
                                                    checkBackdateWarning(newStartDate, worksOnSunday, formData.endDate);
                                                }

                                                // คำนวณจำนวนวันลาอัตโนมัติตามเวลา (calculateLeaveDays จะ return 0 ถ้าเป็นวันหยุด)
                                                if (endDateValue && endDateValue.isValid()) {
                                                    recalculateTotalDays(
                                                        newStartDate,
                                                        formData.startTime,
                                                        formData.endDate,
                                                        formData.endTime
                                                    );
                                                } else {
                                                    // ถ้ายังไม่มี endDate ให้ set เป็น 0 ถ้าวันเริ่มเป็นวันหยุด
                                                    if (isSunday || isHolidayDate) {
                                                        handleFormChange('totalDays', '0');
                                                    }
                                                }
                                            } else {
                                                handleFormChange('startDate', '');
                                                setBackdateWarning(null);
                                            }
                                        }}
                                        format="DD MMMM YYYY"
                                        slotProps={{
                                            textField: {
                                                size: 'small',
                                                fullWidth: true,
                                                error: !!errors.startDate,
                                                helperText: errors.startDate,
                                                sx: {
                                                    '& .MuiOutlinedInput-root': {
                                                        '& fieldset': { borderColor: '#e5e7eb' },
                                                        '&:hover fieldset': { borderColor: config.color },
                                                    },
                                                },
                                            },
                                        }}
                                    />

                                </LocalizationProvider>

                                {/* Duration Type Selection (Compact) */}
                                <Box sx={{ mt: 1 }}>
                                    <Box sx={{ display: 'flex', bgcolor: 'transparent', gap: 0.5 }}>
                                        {['full', 'morning', 'afternoon'].map((type) => {
                                            const isSelected = durationType === type;
                                            const label = type === 'full'
                                                ? t('leave_duration_full', 'เต็มวัน')
                                                : type === 'morning'
                                                    ? (shiftType === 'day' ? t('leave_duration_morning', 'ครึ่งเช้า') : t('leave_duration_first_half', 'ครึ่งแรก'))
                                                    : (shiftType === 'day' ? t('leave_duration_afternoon', 'ครึ่งบ่าย') : t('leave_duration_second_half', 'ครึ่งหลัง'));

                                            return (
                                                <Box
                                                    key={type}
                                                    onClick={() => handleDurationTypeChange(type as any)}
                                                    sx={{
                                                        flex: 1, py: 0.75, borderRadius: 1, cursor: 'pointer', textAlign: 'center',
                                                        bgcolor: isSelected ? config.lightColor : 'white',
                                                        color: isSelected ? config.color : 'text.secondary',
                                                        border: isSelected ? `2px solid ${config.color}` : '1px solid #E2E8F0',
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                                        fontSize: '0.85rem', fontWeight: 600,
                                                        boxShadow: isSelected ? `0 4px 12px ${config.color}40` : 'none',
                                                        '&:hover': {
                                                            transform: 'scale(1.02)',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                        },
                                                        '&:active': {
                                                            transform: 'scale(0.98)',
                                                        }
                                                    }}
                                                >
                                                    {label}
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            </Box>
                        </Box>

                        {/* ส่วนสิ้นสุด (แสดงเสมอเพื่อให้เลือกวันสิ้นสุดและช่วงเวลา) */}
                        <Box sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef5350', boxShadow: '0 0 0 2px rgba(239, 83, 80, 0.2)' }} />
                                {t('leave_end_section', 'ถึงวันที่')}
                            </Typography>
                            <Box sx={{ pl: 2, borderLeft: '2px solid', borderColor: '#f0f0f0', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={locale}>
                                    <DatePicker
                                        label={t('leave_end_date', 'วันที่')}
                                        value={endDateValue}
                                        onChange={(newValue) => {
                                            setEndDateValue(newValue);
                                            if (newValue && newValue.isValid()) {
                                                const newEndDate = newValue.format('YYYY-MM-DD');
                                                handleFormChange('endDate', newEndDate);

                                                // ตรวจสอบว่าวันสิ้นสุดเป็นวันหยุดหรือไม่
                                                const selectedEndDate = dayjs(newEndDate);
                                                const isEndSunday = selectedEndDate.day() === 0 && !worksOnSunday;
                                                const isEndHoliday = isHoliday(selectedEndDate, holidays);

                                                if (isEndSunday || isEndHoliday) {
                                                    const holidayData = holidays.find(h => dayjs(h.date).isSame(selectedEndDate, 'day'));
                                                    const holidayName = holidayData ? t(holidayData.name, holidayData.name) : t('holiday', 'วันหยุด');
                                                    toastr.warning(
                                                        isEndSunday
                                                            ? t('sunday_is_holiday_short', 'วันอาทิตย์เป็นวันหยุด')
                                                            : t('date_is_holiday', '{name} เป็นวันหยุด').replace('{name}', holidayName)
                                                    );
                                                }

                                                // ตรวจสอบลาย้อนหลัง (ใช้ endDate ใหม่)
                                                if (formData.startDate) {
                                                    checkBackdateWarning(formData.startDate, worksOnSunday, newEndDate);
                                                }

                                                // ถ้าวันสิ้นสุดเท่ากับวันเริ่ม ให้ปรับ endDurationType ตาม durationType (เริ่ม) โดยอัตโนมัติ
                                                // เพื่อให้กรณีเลือกครึ่งวัน (เช่น เช้า -> เช้า) ได้ 0.5 วัน
                                                const isSameDay = formData.startDate === newEndDate;

                                                if (isSameDay) {
                                                    // ใช้ durationType ของ start เป็นหลักสำหรับวันเดียว
                                                    setEndDurationType(durationType);
                                                    // ส่ง endDate ใหม่ไปคำนวณทันที ไม่รอ state
                                                    updateTimes(shiftType, durationType, durationType, { endDate: newEndDate });
                                                } else {
                                                    // กรณีหลายวัน - ตรวจสอบว่า durationType เป็น 'morning' หรือไม่
                                                    if (durationType === 'morning') {
                                                        // ไม่อนุญาตลาหลายวันถ้าเริ่มครึ่งเช้า (บ่ายต้องกลับมาทำงาน)
                                                        toastr.warning('ลาครึ่งเช้าไม่สามารถลาหลายวันได้ กรุณาเลือก "ครึ่งบ่าย" หรือ "เต็มวัน" ถ้าต้องการลาหลายวัน');
                                                        // Reset endDate กลับเป็นวันเดียวกับ startDate
                                                        setEndDateValue(startDateValue);
                                                        handleFormChange('endDate', formData.startDate);
                                                        setEndDurationType('morning');
                                                        updateTimes(shiftType, durationType, durationType, { endDate: formData.startDate });
                                                    } else {
                                                        // คำนวณจำนวนวันลาอัตโนมัติตามเวลา (กรณีคนละวัน)
                                                        if (startDateValue && startDateValue.isValid()) {
                                                            recalculateTotalDays(
                                                                formData.startDate,
                                                                formData.startTime,
                                                                newEndDate,
                                                                formData.endTime
                                                            );
                                                        }
                                                    }
                                                }
                                            } else {
                                                handleFormChange('endDate', '');
                                                // ถ้าลบ endDate ให้ซ่อน warning
                                                setBackdateWarning(null);
                                            }
                                        }}
                                        minDate={startDateValue || undefined}
                                        format="DD MMMM YYYY"
                                        slotProps={{
                                            textField: {
                                                size: 'small',
                                                fullWidth: true,
                                                error: !!errors.endDate,
                                                helperText: errors.endDate,
                                                sx: {
                                                    '& .MuiOutlinedInput-root': {
                                                        '& fieldset': { borderColor: '#e5e7eb' },
                                                        '&:hover fieldset': { borderColor: config.color },
                                                    },
                                                },
                                            },
                                        }}
                                    />

                                </LocalizationProvider>

                                {/* End Duration Type Selection (Compact) - ซ่อนถ้าวันตรงกัน */}
                                {/* สำหรับการลาหลายวัน: แสดงเฉพาะ "ครึ่งเช้า" และ "เต็มวัน" */}
                                {/* เพราะ "ครึ่งบ่าย" สำหรับวันสุดท้ายจะทำให้เกิดช่องว่างช่วงเช้า */}
                                {formData.startDate !== formData.endDate && (
                                    <Box sx={{ mt: 1 }}>
                                        <Typography variant="caption" sx={{ mb: 0.5, display: 'block', color: 'text.secondary' }}>
                                            {t('end_duration_label', 'ลาถึงช่วง:')}
                                        </Typography>
                                        <Box sx={{ display: 'flex', bgcolor: 'transparent', gap: 0.5 }}>
                                            {/* แสดงเฉพาะ morning และ full สำหรับวันสุดท้าย */}
                                            {['morning', 'full'].map((type) => {
                                                const isSelected = endDurationType === type || (type === 'full' && endDurationType === 'afternoon');
                                                const label = type === 'full'
                                                    ? t('leave_duration_full_day', 'เต็มวัน')
                                                    : (shiftType === 'day' ? t('leave_duration_morning_end', 'ครึ่งเช้า') : t('leave_duration_first_half', 'ครึ่งแรก'));

                                                return (
                                                    <Box
                                                        key={type}
                                                        onClick={() => handleEndDurationTypeChange(type as any)}
                                                        sx={{
                                                            flex: 1, py: 0.75, borderRadius: 1, cursor: 'pointer', textAlign: 'center',
                                                            bgcolor: isSelected ? config.lightColor : 'white',
                                                            color: isSelected ? config.color : 'text.secondary',
                                                            border: isSelected ? `2px solid ${config.color}` : '1px solid #E2E8F0',
                                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                                            fontSize: '0.85rem', fontWeight: 600,
                                                            boxShadow: isSelected ? `0 4px 12px ${config.color}40` : 'none',
                                                            '&:hover': {
                                                                transform: 'scale(1.02)',
                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                            },
                                                            '&:active': {
                                                                transform: 'scale(0.98)',
                                                            }
                                                        }}
                                                    >
                                                        {label}
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </Box>



                        {/* Warning สำหรับลาย้อนหลังเกินกำหนดเท่านั้น */}
                        {backdateWarning?.show && backdateWarning.isOverdue && formData.endDate && (
                            <Box
                                sx={{
                                    mt: 2,
                                    p: 2,
                                    borderRadius: 1,
                                    bgcolor: '#FEF2F2',
                                    borderLeft: '4px solid',
                                    borderLeftColor: '#EF4444',
                                }}
                            >
                                {/* Header */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                    <Warning2
                                        size={20}
                                        variant="Bold"
                                        color="#EF4444"
                                    />
                                    <Typography
                                        variant="subtitle2"
                                        sx={{
                                            fontWeight: 700,
                                            color: '#DC2626',
                                        }}
                                    >
                                        {t('backdate_overdue_title', 'ลาย้อนหลังเกินกำหนด')}
                                    </Typography>
                                </Box>

                                {/* Info rows */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, ml: 3.5 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {t('leave_date', 'วันที่ลา')}
                                        </Typography>
                                        <Typography variant="body2" fontWeight={500}>
                                            {backdateWarning.leaveDate}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {t('submit_deadline', 'วันสุดท้ายที่ให้ยื่นใบลา')}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            fontWeight={600}
                                            sx={{ color: '#DC2626' }}
                                        >
                                            {backdateWarning.deadline}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {t('submit_date', 'วันที่ยื่น')}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Typography
                                                variant="body2"
                                                fontWeight={600}
                                                sx={{ color: '#DC2626' }}
                                            >
                                                {dayjs().locale(locale).format('DD MMM')} {locale === 'th' ? (dayjs().year() + 543).toString() : dayjs().year()}
                                            </Typography>
                                            <CloseCircle size={16} variant="Bold" color="#DC2626" />
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Error message */}
                                <Typography
                                    variant="caption"
                                    sx={{
                                        display: 'block',
                                        mt: 1.5,
                                        ml: 3.5,
                                        color: '#DC2626',
                                        fontWeight: 500,
                                    }}
                                >
                                    * {t('backdate_overdue_msg', 'ไม่สามารถยื่นใบลาได้ เนื่องจากเกินกำหนด')}
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    {/* จำนวนวันลา (Auto Calculation) */}
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
                                {t('leave_total_days', 'จำนวนวันลา')}
                            </Typography>
                        </Box>

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 1.5,
                                mb: 1.5,
                            }}
                        >
                            {/* แสดงจำนวนวัน */}
                            <Box
                                sx={{
                                    minWidth: 120,
                                    textAlign: 'center',
                                    py: 1.5,
                                    px: 3,
                                    bgcolor: config.color,
                                    borderRadius: 1.5,
                                    boxShadow: `0 4px 12px ${config.lightColor}`
                                }}
                            >
                                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                                    {formData.totalDays || '0'} {t('days_unit', 'วัน')}
                                </Typography>
                            </Box>
                        </Box>

                        {leaveType && leaveType.maxDaysPerYear && (
                            <Typography
                                variant="caption"
                                color={(parseFloat(formData.totalDays) || 0) > leaveType.maxDaysPerYear ? 'error.main' : 'text.secondary'}
                                sx={{ mt: 1.5, display: 'block', textAlign: 'center', fontWeight: (parseFloat(formData.totalDays) || 0) > leaveType.maxDaysPerYear ? 'bold' : 'normal' }}
                            >
                                {leaveType.isPaid
                                    ? t('leave_max_quota_paid', 'สิทธิ์ลา {days} วัน/ปี (ได้รับค่าจ้าง)').replace('{days}', leaveType.maxDaysPerYear.toString())
                                    : t('leave_max_quota_unpaid', 'สิทธิ์ลา {days} วัน/ปี (ไม่ได้รับค่าจ้าง)').replace('{days}', leaveType.maxDaysPerYear.toString())
                                }
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
                                <DocumentText size={15} color={config.color} />
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                {t('leave_reason', 'เหตุผลการลา')}
                            </Typography>
                        </Box>

                        <TextField
                            multiline
                            rows={3}
                            fullWidth
                            placeholder={t('leave_reason_placeholder', 'ระบุเหตุผลการลา...')}
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
                                <Paperclip2 size={15} color={config.color} />
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                {t('leave_attachments', 'ไฟล์แนบ')}
                                {/* แสดง * บังคับแนบไฟล์ */}
                                {((leaveCode === 'sick' && parseFloat(formData.totalDays) >= 3) ||
                                    (leaveCode === 'personal' && parseFloat(formData.totalDays) >= 1)) && (
                                        <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                                    )}
                            </Typography>
                        </Box>

                        {/* แสดงข้อความแจ้งเตือนบังคับแนบไฟล์ */}
                        {leaveCode === 'sick' && parseFloat(formData.totalDays) >= 3 && (
                            <Alert severity="warning" sx={{ mb: 2, py: 0.5 }}>
                                {t('leave_sick_attachment_required', 'ลาป่วยตั้งแต่ 3 วันขึ้นไป ต้องแนบใบรับรองแพทย์')}
                            </Alert>
                        )}
                        {leaveCode === 'personal' && parseFloat(formData.totalDays) >= 1 && (
                            <Alert severity="warning" sx={{ mb: 2, py: 0.5 }}>
                                {t('leave_personal_attachment_required', 'ลากิจต้องแนบหลักฐานประกอบ')}
                            </Alert>
                        )}

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
                            startIcon={<DocumentUpload size={18} color={config.color} />}
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
                                ? t('leave_upload_processing', 'กำลังประมวลผลไฟล์...')
                                : formData.attachments.length >= MAX_FILES
                                    ? t('leave_upload_complete', `แนบไฟล์ครบ ${MAX_FILES} ไฟล์แล้ว`)
                                    : t('leave_upload_btn', `อัพโหลดไฟล์แนบ (${formData.attachments.length}/${MAX_FILES})`)}
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
                                                    <DocumentText size={32} color={config.color} />
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
                                            <CloseCircle size={14} variant="Bold" color="#ffffff" />
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
                            {t('leave_attachments_hint', `รองรับไฟล์ .pdf, .jpg, .jpeg, .png (สูงสุด ${MAX_FILES} ไฟล์, ไฟล์ละไม่เกิน 15MB)`)}
                        </Typography>

                        {/* แจ้งเตือนลาป่วยเกิน 3 วัน */}
                        {leaveCode === 'sick' && (parseFloat(formData.totalDays) || 0) > 3 && formData.attachments.length === 0 && (
                            <Alert
                                severity="warning"
                                icon={<Warning2 size={18} color="#ED6C02" />}
                                sx={{ mt: 2, borderRadius: 2 }}
                            >
                                {t('sick_leave_warning', 'ลาป่วยเกิน 3 วัน กรุณาแนบใบรับรองแพทย์')}
                            </Alert>
                        )}
                    </Box>
                </Container >
            </Box >

            {/* Fixed Footer - ปุ่มดำเนินการ */}
            < Box
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
                }
                }
            >
                <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                    <Button
                        variant="contained"
                        fullWidth
                        startIcon={<Send2 size={18} color="#ffffff" />}
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
                        {submitting ? t('leave_submitting', 'กำลังส่ง...') : t('leave_submit', 'ส่งคำขอลา')}
                    </Button>
                </Box>
            </Box >

            {/* Confirm Dialog */}
            < Dialog
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
                            <Send2 size={24} color={config.color} />
                        </Box>
                    </Box>
                    <Typography variant="h6" fontWeight="bold" textAlign="center">
                        {t('leave_confirm_title', 'ยืนยันส่งคำขอลา?')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 1, mb: 3 }}>
                        {t('leave_confirm_desc', 'ระบบจะส่งคำขอไปยังผู้อนุมัติทันทีเมื่อกดยืนยัน')}
                    </Typography>

                    <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 1.5, mb: 3, border: '1px solid', borderColor: 'grey.200' }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
                            {t(`leave_${leaveType.code}`, leaveType.name)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {formData.startDate && formData.endDate
                                ? (() => {
                                    const start = dayjs(formData.startDate).locale(locale);
                                    const end = dayjs(formData.endDate).locale(locale);
                                    const startYear = locale === 'th' ? start.year() + 543 : start.year();
                                    const endYear = locale === 'th' ? end.year() + 543 : end.year();
                                    return `${start.format('D MMM')} ${startYear} - ${end.format('D MMM')} ${endYear}`;
                                })()
                                : t('leave_no_date_selected', 'ยังไม่ได้เลือกช่วงวัน')}
                        </Typography>
                        {formData.totalDays && (
                            <Typography variant="body2" color="text.secondary">
                                {t('leave_total_days', 'จำนวนวันลา')} {formData.totalDays} {t('leave_days_unit', 'วัน')}
                            </Typography>
                        )}
                        {formData.reason && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                {t('leave_reason', 'เหตุผล')}: {formData.reason}
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
                            {t('cancel', 'ยกเลิก')}
                        </Button>
                        <Button
                            variant="contained"
                            fullWidth
                            startIcon={<Send2 size={18} color="#ffffff" />}
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
                            {submitting ? t('leave_submitting', 'กำลังส่ง...') : t('confirm', 'ยืนยัน')}
                        </Button>
                    </Box>
                </Box>
            </Dialog >

            {/* Dialog Preview รูปภาพ */}
            < Dialog
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
                        <CloseCircle size={24} variant="Bold" color="#ffffff" />
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
            </Dialog >
        </>
    );
}
