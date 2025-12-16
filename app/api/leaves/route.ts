import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createApprovalSteps } from '@/lib/escalation';
import { notifyLeaveSubmitted } from '@/lib/onesignal';
import { calculateVacationDays } from '@/lib/vacationCalculator';

interface AttachmentPayload {
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
}

// Map leave type to short code
const leaveTypeCodeMap: Record<string, string> = {
    sick: 'SK',
    personal: 'PS',
    vacation: 'VC',
    maternity: 'MT',
    ordination: 'OR',
    work_outside: 'WO',
    absent: 'AB',
    other: 'OT',
};

// Generate leave code: SK2511001 (type + year + month + running)
async function generateLeaveCode(leaveType: string, date: Date): Promise<string> {
    const typeCode = leaveTypeCodeMap[leaveType] || 'OT';
    const year = String(date.getFullYear()).slice(-2); // 25
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 11
    const prefix = `${typeCode}${year}${month}`;

    // หา running number ล่าสุดของเดือนนั้น
    const lastLeave = await prisma.leaveRequest.findFirst({
        where: {
            leaveCode: {
                startsWith: prefix,
            },
        },
        orderBy: {
            leaveCode: 'desc',
        },
        select: {
            leaveCode: true,
        },
    });

    let runningNumber = 1;
    if (lastLeave?.leaveCode) {
        const lastNumber = parseInt(lastLeave.leaveCode.slice(-3), 10);
        if (!isNaN(lastNumber)) {
            runningNumber = lastNumber + 1;
        }
    }

    return `${prefix}${String(runningNumber).padStart(3, '0')}`;
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            leaveType,
            startDate,
            startTime,
            endDate,
            endTime,
            totalDays,
            reason,
            contactPhone,
            contactAddress,
            status = 'pending',
            attachments = [],
        } = body;

        if (!leaveType || !startDate || !endDate || !totalDays || !reason) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json(
                { error: 'Invalid date format' },
                { status: 400 }
            );
        }

        if (end < start) {
            return NextResponse.json(
                { error: 'End date cannot be before start date' },
                { status: 400 }
            );
        }

        // Fetch user for validation
        const user = await prisma.user.findUnique({
            where: { id: Number(session.user.id) },
            select: { gender: true, startDate: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Validation for Ordination Leave
        if (leaveType === 'ordination') {
            if (user.gender !== 'male') {
                return NextResponse.json(
                    { error: 'Ordination leave is only for male employees' },
                    { status: 400 }
                );
            }

            const serviceYears = (new Date().getTime() - new Date(user.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
            if (serviceYears < 1) {
                return NextResponse.json(
                    { error: 'Ordination leave requires at least 1 year of service' },
                    { status: 400 }
                );
            }
        }

        // Validation for Vacation Leave - ตรวจสอบสิทธิ์ลาพักร้อน
        if (leaveType === 'vacation') {
            const leaveYear = start.getFullYear();
            const vacationType = await prisma.leaveType.findUnique({
                where: { code: 'vacation' },
                select: { maxDaysPerYear: true }
            });

            const maxVacationDays = calculateVacationDays(
                user.startDate,
                leaveYear,
                vacationType?.maxDaysPerYear || 6
            );

            if (maxVacationDays === 0) {
                return NextResponse.json(
                    { error: 'คุณยังไม่มีสิทธิ์ลาพักร้อนในปีนี้ (ต้องทำงานครบ 1 ปีก่อน)' },
                    { status: 400 }
                );
            }

            // ตรวจสอบวันลาที่ใช้ไปแล้วในปีนี้
            const usedVacationDays = await prisma.leaveRequest.aggregate({
                where: {
                    userId: Number(session.user.id),
                    leaveType: 'vacation',
                    status: { in: ['approved', 'pending', 'in_progress'] },
                    startDate: {
                        gte: new Date(leaveYear, 0, 1),
                        lt: new Date(leaveYear + 1, 0, 1)
                    }
                },
                _sum: { totalDays: true }
            });

            const usedDays = usedVacationDays._sum.totalDays || 0;
            const remainingDays = maxVacationDays - usedDays;

            // ตรวจสอบว่าวันพักร้อนหมดแล้วหรือไม่
            if (remainingDays <= 0) {
                return NextResponse.json(
                    { error: `คุณไม่มีวันพักร้อนคงเหลือในปีนี้ (ใช้ไปแล้ว ${usedDays} วัน จากทั้งหมด ${maxVacationDays} วัน)` },
                    { status: 400 }
                );
            }

            if (Number(totalDays) > remainingDays) {
                return NextResponse.json(
                    { error: `สิทธิ์ลาพักร้อนไม่เพียงพอ (ขอลา ${totalDays} วัน แต่เหลือ ${remainingDays} วัน จากทั้งหมด ${maxVacationDays} วัน)` },
                    { status: 400 }
                );
            }
        }

        const attachmentList: AttachmentPayload[] = Array.isArray(attachments)
            ? attachments
            : [];

        // คำนวณ escalation deadline (2 วัน = 48 ชั่วโมง) -> ปัดไปเป็น 08:00 ของวันที่ครบกำหนด
        const escalationDeadline = new Date();
        escalationDeadline.setDate(escalationDeadline.getDate() + 2); // บวก 2 วัน
        escalationDeadline.setHours(8, 0, 0, 0); // ตั้งเวลาเป็น 08:00:00

        // สร้างรหัสใบลา
        const leaveCode = await generateLeaveCode(leaveType, start);

        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                userId: Number(session.user.id),
                leaveCode,
                leaveType,
                startDate: start,
                startTime,
                endDate: end,
                endTime,
                totalDays: Number(totalDays),
                reason,
                contactPhone,
                contactAddress,
                status: 'pending',
                currentLevel: 1,
                escalationDeadline,
                isEscalated: false,
                attachments:
                    attachmentList.length > 0
                        ? {
                            create: attachmentList.map((file: AttachmentPayload) => ({
                                fileName: file.fileName,
                                filePath: file.filePath,
                                fileSize: file.fileSize,
                                mimeType: file.mimeType,
                            })),
                        }
                        : undefined,
            },
            include: {
                attachments: true,
            },
        });

        // สร้าง approval steps ตาม flow ที่กำหนด
        await createApprovalSteps(leaveRequest.id, Number(session.user.id));

        // แจ้งเตือนผู้ขอว่าส่งใบลาสำเร็จ
        await notifyLeaveSubmitted(
            Number(session.user.id),
            leaveRequest.id,
            leaveType,
            Number(totalDays),
            startDate,
            endDate,
            leaveRequest.leaveCode || undefined
        );

        return NextResponse.json({ success: true, data: leaveRequest }, { status: 201 });
    } catch (error) {
        console.error('Error creating leave request:', error);
        return NextResponse.json(
            { error: 'Failed to create leave request' },
            { status: 500 }
        );
    }
}
