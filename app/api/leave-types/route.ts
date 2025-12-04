import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateVacationDays } from '@/lib/vacationCalculator';

// GET /api/leave-types - ดึงข้อมูลประเภทการลาทั้งหมด
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const yearParam = searchParams.get('year');
        const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

        const leaveTypes = await prisma.leaveType.findMany({
            where: {
                isActive: true,
            },
            orderBy: {
                id: 'asc',
            },
        });

        // ตรวจสอบ session เพื่อคำนวณสิทธิ์ลาพักร้อน
        const session = await getServerSession(authOptions);
        
        if (session?.user?.id) {
            const user = await prisma.user.findUnique({
                where: { id: Number(session.user.id) },
                select: { startDate: true }
            });

            if (user?.startDate) {
                // คำนวณสิทธิ์ลาพักร้อนตามเงื่อนไข
                const modifiedLeaveTypes = leaveTypes.map(type => {
                    if (type.code === 'vacation') {
                        const calculatedDays = calculateVacationDays(
                            user.startDate,
                            year,
                            type.maxDaysPerYear || 6
                        );
                        return {
                            ...type,
                            maxDaysPerYear: calculatedDays,
                            originalMaxDays: type.maxDaysPerYear
                        };
                    }
                    return type;
                });

                return NextResponse.json(modifiedLeaveTypes);
            }
        }

        return NextResponse.json(leaveTypes);
    } catch (error) {
        console.error('Error fetching leave types:', error);
        return NextResponse.json(
            { error: 'Failed to fetch leave types' },
            { status: 500 }
        );
    }
}
