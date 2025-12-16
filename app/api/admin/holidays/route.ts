import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

// GET - Get all holidays (admin)
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const year = searchParams.get('year');

        const where: any = {};

        if (year) {
            const yearNum = parseInt(year);
            where.date = {
                gte: new Date(`${yearNum}-01-01`),
                lte: new Date(`${yearNum}-12-31`),
            };
        }

        const holidays = await prisma.holiday.findMany({
            where,
            orderBy: { date: 'asc' },
        });

        const formattedHolidays = holidays.map((h) => ({
            id: h.id,
            date: dayjs(h.date).format('YYYY-MM-DD'),
            name: h.name,
            type: h.type,
            companyId: h.companyId,
            deductFromAnnualLeave: h.deductFromAnnualLeave,
            isActive: h.isActive,
        }));

        return NextResponse.json(formattedHolidays);
    } catch (error) {
        console.error('Error fetching holidays:', error);
        return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
    }
}

// POST - Create new holiday
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { date, name, type, companyId, deductFromAnnualLeave } = body;

        if (!date || !name) {
            return NextResponse.json(
                { error: 'กรุณากรอกข้อมูลให้ครบ: วันที่, ชื่อวันหยุด' },
                { status: 400 }
            );
        }

        const holidayDate = new Date(date);
        const parsedCompanyId = companyId ? parseInt(companyId) : null;

        const holiday = await prisma.holiday.create({
            data: {
                date: holidayDate,
                name,
                type: type || 'company',
                companyId: parsedCompanyId,
                deductFromAnnualLeave: deductFromAnnualLeave || false,
            },
        });

        // ถ้าเป็นบังคับพักร้อน ให้สร้าง LeaveRequest อัตโนมัติสำหรับพนักงานที่เกี่ยวข้อง
        if (deductFromAnnualLeave) {
            await createForcedAnnualLeaveRequests(holidayDate, parsedCompanyId, holiday.name);
        }

        return NextResponse.json({
            id: holiday.id,
            date: dayjs(holiday.date).format('YYYY-MM-DD'),
            name: holiday.name,
            type: holiday.type,
            companyId: holiday.companyId,
            deductFromAnnualLeave: holiday.deductFromAnnualLeave,
            isActive: holiday.isActive,
        });
    } catch (error: any) {
        console.error('Error creating holiday:', error);
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'วันหยุดนี้มีอยู่แล้วในระบบ' },
                { status: 400 }
            );
        }
        return NextResponse.json({ error: 'Failed to create holiday' }, { status: 500 });
    }
}

// Helper function: สร้าง LeaveRequest อัตโนมัติสำหรับบังคับพักร้อน
async function createForcedAnnualLeaveRequests(
    holidayDate: Date,
    companyId: number | null,
    holidayName: string
) {
    try {
        // ดึงพนักงานที่เกี่ยวข้อง (ตามบริษัท หรือทุกคนถ้า companyId = null)
        const whereClause: any = {
            isActive: true,
            role: 'employee', // เฉพาะพนักงานทั่วไป
        };

        if (companyId) {
            // ดึง company code จาก companyId
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { code: true }
            });
            if (company) {
                whereClause.company = company.code;
            }
        }

        const employees = await prisma.user.findMany({
            where: whereClause,
            select: { id: true, employeeId: true }
        });

        // สร้าง leave code prefix
        const year = String(holidayDate.getFullYear()).slice(-2);
        const month = String(holidayDate.getMonth() + 1).padStart(2, '0');
        const prefix = `FL${year}${month}`; // FL = Forced Leave

        // หา running number ล่าสุด
        const lastLeave = await prisma.leaveRequest.findFirst({
            where: { leaveCode: { startsWith: prefix } },
            orderBy: { leaveCode: 'desc' },
            select: { leaveCode: true }
        });

        let runningNumber = 1;
        if (lastLeave?.leaveCode) {
            const lastNumber = parseInt(lastLeave.leaveCode.slice(-3), 10);
            if (!isNaN(lastNumber)) runningNumber = lastNumber + 1;
        }

        // สร้าง LeaveRequest สำหรับแต่ละพนักงาน
        for (const employee of employees) {
            const leaveCode = `${prefix}${String(runningNumber).padStart(3, '0')}`;
            runningNumber++;

            await prisma.leaveRequest.create({
                data: {
                    userId: employee.id,
                    leaveCode,
                    leaveType: 'vacation', // หักจากลาพักร้อน
                    startDate: holidayDate,
                    endDate: holidayDate,
                    totalDays: 1,
                    reason: `บังคับพักร้อน: ${holidayName}`,
                    status: 'approved', // อนุมัติอัตโนมัติ
                    currentLevel: 0,
                    isEscalated: false,
                }
            });
        }

        console.log(`Created ${employees.length} forced annual leave requests for ${holidayDate.toISOString().split('T')[0]}`);
    } catch (error) {
        console.error('Error creating forced annual leave requests:', error);
        // ไม่ throw error เพื่อไม่ให้กระทบการสร้าง holiday
    }
}

