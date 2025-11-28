import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - ดึงข้อมูลแผนกตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const departmentId = parseInt(id);

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        _count: {
          select: { sections: true }
        }
      }
    });

    if (!department) {
      return NextResponse.json(
        { error: 'ไม่พบแผนกที่ต้องการ' },
        { status: 404 }
      );
    }

    return NextResponse.json(department);
  } catch (error) {
    console.error('Error fetching department:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลแผนก' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไขข้อมูลแผนก
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const departmentId = parseInt(id);
    const body = await request.json();
    const { code, name, company, isActive } = body;

    if (!code || !name || !company) {
      return NextResponse.json(
        { error: 'กรุณากรอกรหัส ชื่อแผนก และบริษัท' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าแผนกมีอยู่หรือไม่
    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!existingDepartment) {
      return NextResponse.json(
        { error: 'ไม่พบแผนกที่ต้องการแก้ไข' },
        { status: 404 }
      );
    }

    // ตรวจสอบรหัสแผนกซ้ำ (ยกเว้นแผนกตัวเอง)
    const duplicateCode = await prisma.department.findFirst({
      where: {
        code: code.toUpperCase(),
        id: { not: departmentId },
      },
    });

    if (duplicateCode) {
      return NextResponse.json(
        { error: 'รหัสแผนกนี้มีอยู่แล้วในระบบ' },
        { status: 400 }
      );
    }

    const department = await prisma.department.update({
      where: { id: departmentId },
      data: {
        code: code.toUpperCase(),
        name,
        company,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการแก้ไขแผนก' },
      { status: 500 }
    );
  }
}

// DELETE - ลบแผนก
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const departmentId = parseInt(id);

    // ตรวจสอบว่าแผนกมีอยู่หรือไม่
    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        _count: {
          select: { sections: true }
        }
      }
    });

    if (!existingDepartment) {
      return NextResponse.json(
        { error: 'ไม่พบแผนกที่ต้องการลบ' },
        { status: 404 }
      );
    }

    // ตรวจสอบว่ามี section อยู่หรือไม่
    if (existingDepartment._count.sections > 0) {
      return NextResponse.json(
        { error: `ไม่สามารถลบได้ เนื่องจากมีหน่วยงาน ${existingDepartment._count.sections} รายการในแผนกนี้` },
        { status: 400 }
      );
    }

    // ลบแผนกออกจากฐานข้อมูลถาวร
    await prisma.department.delete({
      where: { id: departmentId },
    });

    return NextResponse.json({ message: 'ลบแผนกสำเร็จ' });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบแผนก' },
      { status: 500 }
    );
  }
}
