import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

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
        const { date, name, type, companyId, isActive } = body;

        const holiday = await prisma.holiday.update({
            where: { id: parseInt(id) },
            data: {
                ...(date && { date: new Date(date) }),
                ...(name && { name }),
                ...(type && { type }),
                ...(companyId !== undefined && { companyId: companyId ? parseInt(companyId) : null }),
                ...(isActive !== undefined && { isActive }),
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
        console.error('Error updating holiday:', error);
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Holiday already exists for this date' },
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
        
        await prisma.holiday.delete({
            where: { id: parseInt(id) },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting holiday:', error);
        return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 });
    }
}
