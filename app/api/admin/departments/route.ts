import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - ดึงรายการแผนกทั้งหมด
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const departments = await prisma.department.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { sections: true }
        }
      }
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลแผนก' },
      { status: 500 }
    );
  }
}

// POST - สร้างแผนกใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, name, company, isActive } = body;

    if (!code || !name || !company) {
      return NextResponse.json(
        { error: 'กรุณากรอกรหัส ชื่อแผนก และบริษัท' },
        { status: 400 }
      );
    }

    // ตรวจสอบรหัสแผนกซ้ำ
    const existingDepartment = await prisma.department.findUnique({
      where: { code },
    });

    if (existingDepartment) {
      return NextResponse.json(
        { error: 'รหัสแผนกนี้มีอยู่แล้วในระบบ' },
        { status: 400 }
      );
    }

    const department = await prisma.department.create({
      data: {
        code: code.toUpperCase(),
        name,
        company,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างแผนก' },
      { status: 500 }
    );
  }
}
