import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';

// GET single section
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const section = await prisma.section.findUnique({
      where: { id: parseInt(id) },
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

    if (!section) {
      return NextResponse.json(
        { error: 'ไม่พบหน่วยงาน' },
        { status: 404 }
      );
    }

    return NextResponse.json(section);
  } catch (error) {
    console.error('Error fetching section:', error);
    return NextResponse.json(
      { error: 'Failed to fetch section' },
      { status: 500 }
    );
  }
}

// PUT update section
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { code, name, departmentId, isActive } = body;

    // Check if section exists
    const existingSection = await prisma.section.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingSection) {
      return NextResponse.json(
        { error: 'ไม่พบหน่วยงาน' },
        { status: 404 }
      );
    }

    // Check if code is taken by another section
    if (code && code.toUpperCase() !== existingSection.code) {
      const codeExists = await prisma.section.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: 'รหัสหน่วยงานนี้มีอยู่ในระบบแล้ว' },
          { status: 400 }
        );
      }
    }

    // Check if department exists
    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: parseInt(departmentId) },
      });

      if (!department) {
        return NextResponse.json(
          { error: 'ไม่พบแผนกที่เลือก' },
          { status: 400 }
        );
      }
    }

    const section = await prisma.section.update({
      where: { id: parseInt(id) },
      data: {
        ...(code && { code: code.toUpperCase() }),
        ...(name && { name }),
        ...(departmentId && { departmentId: parseInt(departmentId) }),
        ...(typeof isActive === 'boolean' && { isActive }),
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

    return NextResponse.json(section);
  } catch (error) {
    console.error('Error updating section:', error);
    return NextResponse.json(
      { error: 'Failed to update section' },
      { status: 500 }
    );
  }
}

// DELETE section (hard delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if section exists
    const existingSection = await prisma.section.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingSection) {
      return NextResponse.json(
        { error: 'ไม่พบหน่วยงาน' },
        { status: 404 }
      );
    }

    // Hard delete
    await prisma.section.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'ลบหน่วยงานสำเร็จ' });
  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json(
      { error: 'Failed to delete section' },
      { status: 500 }
    );
  }
}
