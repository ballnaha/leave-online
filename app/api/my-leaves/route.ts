import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);
        const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : null;

        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59);

        let startDate = startOfYear;
        let endDate = endOfYear;

        if (month !== null && month >= 1 && month <= 12) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0, 23, 59, 59);
        }

        const leaves = await prisma.leaveRequest.findMany({
            where: {
                userId: Number(session.user.id),
                startDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { startDate: 'desc' },
            include: {
                attachments: true,
                approvals: {
                    include: {
                        approver: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                position: true,
                            },
                        },
                    },
                    orderBy: { level: 'asc' },
                },
            },
        });

        return NextResponse.json({ success: true, data: leaves });
    } catch (error) {
        console.error('Error fetching my leaves:', error);
        return NextResponse.json({ error: 'Failed to fetch leaves' }, { status: 500 });
    }
}
