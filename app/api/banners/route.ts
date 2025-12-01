import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - ดึงรายการ banner ที่ active และอยู่ในช่วงเวลาที่กำหนด
export async function GET(request: NextRequest) {
  try {
    const now = new Date();

    const banners = await prisma.banner.findMany({
      where: {
        isActive: true,
        OR: [
          // ไม่มีกำหนดเวลา
          {
            startDate: null,
            endDate: null,
          },
          // มีเฉพาะ startDate และยังไม่ถึงเวลาเลิก
          {
            startDate: { lte: now },
            endDate: null,
          },
          // มีเฉพาะ endDate และยังไม่หมดเวลา
          {
            startDate: null,
            endDate: { gte: now },
          },
          // มีทั้ง startDate และ endDate
          {
            startDate: { lte: now },
            endDate: { gte: now },
          },
        ],
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        linkUrl: true,
      },
    });

    return NextResponse.json(banners);
  } catch (error) {
    console.error('Error fetching active banners:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Banner' },
      { status: 500 }
    );
  }
}
