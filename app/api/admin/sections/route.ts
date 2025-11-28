import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all sections
export async function GET() {
  try {
    const sections = await prisma.section.findMany({
      include: {
        department: {
          select: {
            id: true,
            code: true,
            name: true,
            company: true,
          },
        },
      },
      orderBy: [
        { department: { company: 'asc' } },
        { department: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}

// POST create new section
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, departmentId, isActive } = body;

    // Validate required fields
    if (!code || !name || !departmentId) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existingSection = await prisma.section.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingSection) {
      return NextResponse.json(
        { error: 'รหัสหน่วยงานนี้มีอยู่ในระบบแล้ว' },
        { status: 400 }
      );
    }

    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: parseInt(departmentId) },
    });

    if (!department) {
      return NextResponse.json(
        { error: 'ไม่พบแผนกที่เลือก' },
        { status: 400 }
      );
    }

    const section = await prisma.section.create({
      data: {
        code: code.toUpperCase(),
        name,
        departmentId: parseInt(departmentId),
        isActive: isActive ?? true,
      },
      include: {
        department: {
          select: {
            id: true,
            code: true,
            name: true,
            company: true,
          },
        },
      },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json(
      { error: 'Failed to create section' },
      { status: 500 }
    );
  }
}
