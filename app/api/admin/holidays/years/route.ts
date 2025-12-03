import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

// GET - Get available years from holidays table
export async function GET(request: NextRequest) {
    try {
        // Get distinct years from holidays table
        const holidays = await prisma.holiday.findMany({
            select: {
                date: true,
            },
            orderBy: { date: 'desc' },
        });

        // Extract unique years
        const yearsSet = new Set<number>();
        holidays.forEach((h) => {
            yearsSet.add(dayjs(h.date).year());
        });

        // Convert to array and sort descending
        const years = Array.from(yearsSet).sort((a, b) => b - a);

        // Always include current year and next year for adding new holidays
        const currentYear = dayjs().year();
        const nextYear = currentYear + 1;
        
        if (!years.includes(currentYear)) {
            years.push(currentYear);
        }
        if (!years.includes(nextYear)) {
            years.push(nextYear);
        }

        // Sort again after adding
        years.sort((a, b) => b - a);

        return NextResponse.json(years);
    } catch (error) {
        console.error('Error fetching holiday years:', error);
        return NextResponse.json({ error: 'Failed to fetch years' }, { status: 500 });
    }
}
