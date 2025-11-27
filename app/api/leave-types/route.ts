import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/leave-types - ดึงข้อมูลประเภทการลาทั้งหมด
export async function GET() {
    try {
        const leaveTypes = await prisma.leaveType.findMany({
            where: {
                isActive: true,
            },
            orderBy: {
                id: 'asc',
            },
        });

        return NextResponse.json(leaveTypes);
    } catch (error) {
        console.error('Error fetching leave types:', error);
        return NextResponse.json(
            { error: 'Failed to fetch leave types' },
            { status: 500 }
        );
    }
}
