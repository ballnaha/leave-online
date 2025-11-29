import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';

// GET - ดึงรายการบริษัททั้งหมด
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลบริษัท' },
      { status: 500 }
    );
  }
}

// POST - สร้างบริษัทใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, name, address, phone, isActive } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: 'กรุณากรอกรหัสและชื่อบริษัท' },
        { status: 400 }
      );
    }

    // ตรวจสอบรหัสบริษัทซ้ำ
    const existingCompany = await prisma.company.findUnique({
      where: { code },
    });

    if (existingCompany) {
      return NextResponse.json(
        { error: 'รหัสบริษัทนี้มีอยู่แล้วในระบบ' },
        { status: 400 }
      );
    }

    const company = await prisma.company.create({
      data: {
        code: code.toUpperCase(),
        name,
        address: address || null,
        phone: phone || null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างบริษัท' },
      { status: 500 }
    );
  }
}
