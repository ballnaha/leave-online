import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - ดึงข้อมูลบริษัทตาม ID
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
    const companyId = parseInt(id);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'ไม่พบบริษัทที่ต้องการ' },
        { status: 404 }
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลบริษัท' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไขข้อมูลบริษัท
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
    const companyId = parseInt(id);
    const body = await request.json();
    const { code, name, address, phone, isActive } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: 'กรุณากรอกรหัสและชื่อบริษัท' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าบริษัทมีอยู่หรือไม่
    const existingCompany = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!existingCompany) {
      return NextResponse.json(
        { error: 'ไม่พบบริษัทที่ต้องการแก้ไข' },
        { status: 404 }
      );
    }

    // ตรวจสอบรหัสบริษัทซ้ำ (ยกเว้นบริษัทตัวเอง)
    const duplicateCode = await prisma.company.findFirst({
      where: {
        code: code.toUpperCase(),
        id: { not: companyId },
      },
    });

    if (duplicateCode) {
      return NextResponse.json(
        { error: 'รหัสบริษัทนี้มีอยู่แล้วในระบบ' },
        { status: 400 }
      );
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        code: code.toUpperCase(),
        name,
        address: address || null,
        phone: phone || null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการแก้ไขบริษัท' },
      { status: 500 }
    );
  }
}

// DELETE - ลบบริษัท
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
    const companyId = parseInt(id);

    // ตรวจสอบว่าบริษัทมีอยู่หรือไม่
    const existingCompany = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!existingCompany) {
      return NextResponse.json(
        { error: 'ไม่พบบริษัทที่ต้องการลบ' },
        { status: 404 }
      );
    }

    // ลบบริษัทออกจากฐานข้อมูลถาวร
    await prisma.company.delete({
      where: { id: companyId },
    });

    return NextResponse.json({ message: 'ลบบริษัทสำเร็จ' });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบบริษัท' },
      { status: 500 }
    );
  }
}
