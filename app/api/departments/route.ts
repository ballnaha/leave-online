import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyCode = searchParams.get('company');

    const whereClause: { isActive: boolean; company?: string } = { 
      isActive: true 
    };

    if (companyCode) {
      whereClause.company = companyCode;
    }

    const departments = await prisma.department.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        company: true,
      },
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลฝ่าย' },
      { status: 500 }
    );
  }
}
