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

        // ตรวจสอบสิทธิ์ (เฉพาะ admin, hr_manager, manager หรือผู้อนุมัติ)
        const allowedRoles = ['admin', 'hr_manager', 'manager'];
        if (!allowedRoles.includes(session.user.role || '')) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }

        const { id } = await params;
        const userId = parseInt(id);
        const { searchParams } = new URL(request.url);
        const yearParam = searchParams.get('year');
        const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

        // ดึงข้อมูล user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { 
                id: true, 
                firstName: true, 
                lastName: true, 
                startDate: true,
                gender: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // ดึงประเภทการลาทั้งหมด
        const leaveTypes = await prisma.leaveType.findMany({
            where: { isActive: true },
            orderBy: { id: 'asc' }
        });

        // คำนวณวันลาที่ใช้ไปในปีนี้สำหรับแต่ละประเภท (นับเฉพาะที่ approved แล้ว)
        const usedLeaves = await prisma.leaveRequest.groupBy({
            by: ['leaveType'],
            where: {
                userId: userId,
                status: 'approved',
                startDate: {
                    gte: new Date(year, 0, 1),
                    lt: new Date(year + 1, 0, 1)
                }
            },
            _sum: { totalDays: true }
        });

        // สร้าง map ของวันลาที่ใช้ไป
        const usedDaysMap: Record<string, number> = {};
        usedLeaves.forEach(leave => {
            usedDaysMap[leave.leaveType] = leave._sum.totalDays || 0;
        });

        // สร้างข้อมูลสรุปวันลาสำหรับแต่ละประเภท
        // ประเภทที่ไม่จำกัดวัน: unpaid_leave (ลากิจหักเงิน), other (ลาอื่นๆ)
        const unlimitedLeaveTypes = ['unpaid', 'other'];
        
        const leaveSummary = leaveTypes.map(type => {
            let maxDays = type.maxDaysPerYear || 0;
            let usedDays = usedDaysMap[type.code] || 0;
            let remainingDays = 0;
            // ประเภทที่ไม่จำกัดวัน
            let isUnlimited = unlimitedLeaveTypes.includes(type.code) || type.maxDaysPerYear === null || type.maxDaysPerYear === 0;

            // คำนวณพิเศษสำหรับลาพักร้อน
            if (type.code === 'vacation' && user.startDate) {
                maxDays = calculateVacationDays(
                    user.startDate,
                    year,
                    type.maxDaysPerYear || 6
                );
            }

            // คำนวณวันลาคงเหลือ
            if (isUnlimited) {
                remainingDays = -1; // -1 หมายถึงไม่จำกัด
            } else {
                remainingDays = Math.max(0, maxDays - usedDays);
            }

            return {
                code: type.code,
                name: type.name,
                maxDays,
                usedDays,
                remainingDays,
                isUnlimited
            };
        });

        // เพิ่มประเภท unpaid_leave (ลากิจหักเงิน) ซึ่งไม่จำกัดจำนวนวัน
        const hasUnpaidLeave = leaveSummary.find(l => l.code === 'unpaid');
        if (!hasUnpaidLeave) {
            leaveSummary.push({
                code: 'unpaid',
                name: 'ลากิจ(หักเงิน)',
                maxDays: 0,
                usedDays: usedDaysMap['unpaid'] || 0,
                remainingDays: -1, // ไม่จำกัด
                isUnlimited: true
            });
        }

        // เพิ่มประเภท other (ลาอื่นๆ) ซึ่งไม่จำกัดจำนวนวัน
        const hasOther = leaveSummary.find(l => l.code === 'other');
        if (!hasOther) {
            leaveSummary.push({
                code: 'other',
                name: 'ลาอื่นๆ',
                maxDays: 0,
                usedDays: usedDaysMap['other'] || 0,
                remainingDays: -1, // ไม่จำกัด
                isUnlimited: true
            });
        }

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
