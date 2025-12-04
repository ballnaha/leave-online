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
        const { date, name, type, companyId } = body;

        if (!date || !name) {
            return NextResponse.json(
                { error: 'กรุณากรอกข้อมูลให้ครบ: วันที่, ชื่อวันหยุด' },
                { status: 400 }
            );
        }

        const holiday = await prisma.holiday.create({
            data: {
                date: new Date(date),
                name,
                type: type || 'company',
                companyId: companyId ? parseInt(companyId) : null,
            },
        });

        return NextResponse.json({
            id: holiday.id,
            date: dayjs(holiday.date).format('YYYY-MM-DD'),
            name: holiday.name,
            type: holiday.type,
            companyId: holiday.companyId,
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
