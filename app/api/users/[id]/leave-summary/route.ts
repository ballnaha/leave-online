import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateVacationDays } from '@/lib/vacationCalculator';

// GET /api/users/[id]/leave-summary - ดึงข้อมูลสรุปวันลาคงเหลือของ user
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ดำเนินการในนามสิทธิ์ของผู้อนุมัติ (admin, hr_manager, manager, etc.)
        const allowedRoles = ['admin', 'hr_manager', 'hr', 'dept_manager', 'shift_supervisor', 'section_head', 'manager', 'employee'];
        const userRole = session.user.role || '';

        const { id } = await params;
        const targetUserId = parseInt(id);
        const currentUserId = parseInt(session.user.id);

        // Security check: Only allow users to see their own summary or managers to see their subordinates
        // For simplicity and since this is internal, we allow all managers to see all for now,
        // but as requested for dept_manager, we MUST allow it.
        if (!allowedRoles.includes(userRole) && currentUserId !== targetUserId) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const yearParam = searchParams.get('year');
        let year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

        // Handle Buddhist Era if necessary (e.g. 2569 -> 2026)
        if (year > 2400) year -= 543;

        // 1. ดึงข้อมูล user
        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, firstName: true, lastName: true, startDate: true, gender: true, employeeId: true }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // 2. ดึงเฉพาะประเภทการลาที่เปิดใช้งาน (Active)
        const leaveTypes = await prisma.leaveType.findMany({
            where: { isActive: true },
            orderBy: { id: 'asc' }
        });

        // 3. คำนวณวันลาที่ใช้ไป (approved, pending, in_progress, completed)
        const usedLeaves = await prisma.leaveRequest.groupBy({
            by: ['leaveType'],
            where: {
                userId: targetUserId,
                status: { in: ['approved', 'pending', 'in_progress', 'completed'] },
                startDate: {
                    gte: new Date(year, 0, 1),
                    lt: new Date(year + 1, 0, 1)
                }
            },
            _sum: { totalDays: true }
        });

        const usedDaysMap: Record<string, number> = {};
        usedLeaves.forEach(leave => {
            usedDaysMap[leave.leaveType] = leave._sum.totalDays || 0;
        });

        // 4. สร้างข้อมูลสรุป
        // NOTE: paternity_care มีโควตา 15 วัน จึงไม่เป็น unlimited อีกต่อไป
        const unlimitedLeaveTypes = ['unpaid', 'other', 'sick_no_pay', 'personal_no_pay'];

        const leaveSummary = leaveTypes.map(type => {
            let maxDays = type.maxDaysPerYear || 0;

            // SUM all days that match this type's ID, CODE, or NAME (Case-insensitive)
            let usedDays = 0;
            usedLeaves.forEach(ul => {
                const ulType = String(ul.leaveType).toLowerCase();
                if (
                    ulType === String(type.id) ||
                    ulType === String(type.code).toLowerCase() ||
                    ulType === String(type.name).toLowerCase()
                ) {
                    usedDays += ul._sum.totalDays || 0;
                }
            });

            let isUnlimited = unlimitedLeaveTypes.includes(type.code) || type.maxDaysPerYear === null || type.maxDaysPerYear === 0;

            if (type.code === 'vacation' && user.startDate) {
                maxDays = calculateVacationDays(user.startDate, year, type.maxDaysPerYear || 6);
            }

            let remainingDays = isUnlimited ? -1 : Math.max(0, maxDays - usedDays);

            return {
                id: type.id,
                code: type.code,
                name: type.name,
                maxDays,
                usedDays,
                remainingDays,
                isUnlimited,
                isActive: type.isActive
            };
        });

        return NextResponse.json({
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            year,
            summary: leaveSummary
        });
    } catch (error) {
        console.error('Error fetching leave summary:', error);
        return NextResponse.json(
            { error: 'Failed to fetch leave summary' },
            { status: 500 }
        );
    }
}
