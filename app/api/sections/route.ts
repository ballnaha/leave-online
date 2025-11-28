import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');

    const whereClause: any = { isActive: true };
    if (departmentId) {
      whereClause.departmentId = parseInt(departmentId);
    }

    const sections = await prisma.section.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        departmentId: true,
      },
    });

    return NextResponse.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลแผนก' },
      { status: 500 }
    );
  }
}
