import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

// Import helper from parent route
// We can't import directly from route files in Next.js, so we duplicate the helpers here

// Helper function: สร้าง LeaveRequest อัตโนมัติสำหรับบังคับพักร้อน
async function createForcedAnnualLeaveRequests(
    holidayDate: Date,
    companyId: number | null,
    holidayName: string
) {
    try {
        // ดึงพนักงานที่เกี่ยวข้อง (ตามบริษัท หรือทุกคนถ้า companyId = null)
        // รวมทุก role ไม่ใช่แค่ employee
        const whereClause: any = {
            isActive: true,
        };

        if (companyId) {
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

        // ตรวจสอบว่ามี forced leave สำหรับวันนี้อยู่แล้วหรือไม่ (ป้องกัน duplicate)
        const existingForcedLeaves = await prisma.leaveRequest.findMany({
            where: {
                leaveCode: { startsWith: 'FL' },
                startDate: holidayDate,
                endDate: holidayDate,
            },
            select: { userId: true }
        });
        const existingUserIds = new Set(existingForcedLeaves.map(l => l.userId));

        const newEmployees = employees.filter(e => !existingUserIds.has(e.id));

        if (newEmployees.length === 0) {
            console.log(`No new forced leave requests needed for ${holidayDate.toISOString().split('T')[0]}`);
            return;
        }

        const year = String(holidayDate.getFullYear()).slice(-2);
        const month = String(holidayDate.getMonth() + 1).padStart(2, '0');
        const prefix = `FL${year}${month}`;

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

        for (const employee of newEmployees) {
            const leaveCode = `${prefix}${String(runningNumber).padStart(3, '0')}`;
            runningNumber++;

            await prisma.leaveRequest.create({
                data: {
                    userId: employee.id,
                    leaveCode,
                    leaveType: 'vacation',
                    startDate: holidayDate,
                    endDate: holidayDate,
                    totalDays: 1,
                    reason: `บังคับพักร้อน: ${holidayName}`,
                    status: 'approved',
                    currentLevel: 0,
                    isEscalated: false,
                }
            });
        }

        console.log(`Created ${newEmployees.length} forced annual leave requests for ${holidayDate.toISOString().split('T')[0]}`);
    } catch (error) {
        console.error('Error creating forced annual leave requests:', error);
    }
}

// Helper function: ลบ LeaveRequest ที่เกี่ยวข้องกับบังคับพักร้อน
async function deleteForcedAnnualLeaveRequests(
    holidayDate: Date,
    companyId: number | null,
    holidayName?: string
) {
    try {
        const whereClause: any = {
            leaveCode: { startsWith: 'FL' },
            startDate: holidayDate,
            endDate: holidayDate,
            leaveType: 'vacation',
        };

        if (holidayName) {
            whereClause.reason = { contains: holidayName };
        }

        if (companyId) {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { code: true }
            });
            if (company) {
                const companyUserIds = await prisma.user.findMany({
                    where: { company: company.code },
                    select: { id: true }
                });
                whereClause.userId = { in: companyUserIds.map(u => u.id) };
            }
        }

        const result = await prisma.leaveRequest.deleteMany({
            where: whereClause,
        });

        console.log(`Deleted ${result.count} forced annual leave requests for ${holidayDate.toISOString().split('T')[0]}`);
        return result.count;
    } catch (error) {
        console.error('Error deleting forced annual leave requests:', error);
        return 0;
    }
}

// GET - Get single holiday
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const holiday = await prisma.holiday.findUnique({
            where: { id: parseInt(id) },
        });

        if (!holiday) {
            return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
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
    } catch (error) {
        console.error('Error fetching holiday:', error);
        return NextResponse.json({ error: 'Failed to fetch holiday' }, { status: 500 });
    }
}

// PUT - Update holiday
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { date, name, type, companyId, deductFromAnnualLeave, isActive } = body;

        // ดึงข้อมูลเดิมก่อนอัปเดต เพื่อเปรียบเทียบ
        const oldHoliday = await prisma.holiday.findUnique({
            where: { id: parseInt(id) },
        });

        if (!oldHoliday) {
            return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
        }

        const holiday = await prisma.holiday.update({
            where: { id: parseInt(id) },
            data: {
                ...(date && { date: new Date(date) }),
                ...(name && { name }),
                ...(type && { type }),
                ...(companyId !== undefined && { companyId: companyId ? parseInt(companyId) : null }),
                ...(deductFromAnnualLeave !== undefined && { deductFromAnnualLeave }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        // จัดการ forced leave requests เมื่อ deductFromAnnualLeave เปลี่ยนแปลง
        const wasForced = oldHoliday.deductFromAnnualLeave;
        const isNowForced = deductFromAnnualLeave !== undefined ? deductFromAnnualLeave : wasForced;
        const oldDate = oldHoliday.date;
        const newDate = date ? new Date(date) : oldDate;
        const oldName = oldHoliday.name;
        const newName = name || oldName;
        const oldCompanyId = oldHoliday.companyId;
        const newCompanyId = companyId !== undefined ? (companyId ? parseInt(companyId) : null) : oldCompanyId;

        if (!wasForced && isNowForced) {
            // เปลี่ยนจาก ไม่บังคับ → บังคับ: สร้าง LeaveRequest
            await createForcedAnnualLeaveRequests(newDate, newCompanyId, newName);
        } else if (wasForced && !isNowForced) {
            // เปลี่ยนจาก บังคับ → ไม่บังคับ: ลบ LeaveRequest
            await deleteForcedAnnualLeaveRequests(oldDate, oldCompanyId, oldName);
        } else if (wasForced && isNowForced) {
            // ยังคงบังคับอยู่ แต่อาจเปลี่ยนวันที่หรือชื่อหรือบริษัท
            const dateChanged = date && dayjs(oldDate).format('YYYY-MM-DD') !== date;
            const nameChanged = name && oldName !== name;
            const companyChanged = companyId !== undefined && oldCompanyId !== newCompanyId;

            if (dateChanged || nameChanged || companyChanged) {
                // ลบ LeaveRequest เก่า แล้วสร้างใหม่
                await deleteForcedAnnualLeaveRequests(oldDate, oldCompanyId, oldName);
                await createForcedAnnualLeaveRequests(newDate, newCompanyId, newName);
            }
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
        console.error('Error updating holiday:', error);
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'วันหยุดนี้มีอยู่แล้วในระบบ' },
                { status: 400 }
            );
        }
        return NextResponse.json({ error: 'Failed to update holiday' }, { status: 500 });
    }
}

// DELETE - Delete holiday
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // ดึงข้อมูลวันหยุดก่อนลบ
        const holiday = await prisma.holiday.findUnique({
            where: { id: parseInt(id) },
        });

        if (!holiday) {
            return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
        }

        // ถ้าเป็นบังคับพักร้อน ให้ลบ LeaveRequest ที่สร้างไว้ด้วย
        if (holiday.deductFromAnnualLeave) {
            const deletedCount = await deleteForcedAnnualLeaveRequests(
                holiday.date,
                holiday.companyId,
                holiday.name
            );
            console.log(`Deleted ${deletedCount} forced leave requests associated with holiday "${holiday.name}"`);
        }

        // ลบวันหยุด
        await prisma.holiday.delete({
            where: { id: parseInt(id) },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting holiday:', error);
        return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 });
    }
}
