import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

// GET - Get holidays with optional year filter
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const year = searchParams.get('year');
        const companyId = searchParams.get('companyId');
        const includeCompany = searchParams.get('includeCompany') === 'true';

        const where: any = {
            isActive: true,
        };

        // Filter by year
        if (year) {
            const yearNum = parseInt(year);
            where.date = {
                gte: new Date(`${yearNum}-01-01`),
                lte: new Date(`${yearNum}-12-31`),
            };
        }

        // Filter by company (null = all companies, or specific company)
        if (companyId) {
            where.OR = [
                { companyId: null },
                { companyId: parseInt(companyId) },
            ];
        }

        const holidays = await prisma.holiday.findMany({
            where,
            orderBy: { date: 'asc' },
            include: includeCompany ? {
                company: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            } : undefined,
        });

        // Format response
        const formattedHolidays = holidays.map((h) => ({
            id: h.id,
            date: dayjs(h.date).format('YYYY-MM-DD'),
            name: h.name,
            type: h.type,
            companyId: h.companyId,
            ...(includeCompany && { company: (h as any).company }),
        }));

        return NextResponse.json(formattedHolidays);
    } catch (error) {
        console.error('Error fetching holidays:', error);
        return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
    }
}

// POST - Create new holiday (Admin only)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { date, name, type, companyId } = body;

        if (!date || !name) {
            return NextResponse.json(
                { error: 'Missing required fields: date, name' },
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
        });
    } catch (error: any) {
        console.error('Error creating holiday:', error);
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Holiday already exists for this date' },
                { status: 400 }
            );
        }
        return NextResponse.json({ error: 'Failed to create holiday' }, { status: 500 });
    }
}
