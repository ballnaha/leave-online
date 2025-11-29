import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';

// GET single user
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
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        gender: true,
        company: true,
        department: true,
        section: true,
        position: true,
        shift: true,
        employeeType: true,
        role: true,
        startDate: true,
        isActive: true,
        avatar: true,
        managedDepartments: true,
        managedSections: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้งาน' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT update user
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
    const {
      employeeId,
      firstName,
      lastName,
      email,
      password,
      gender,
      company,
      department,
      section,
      position,
      shift,
      employeeType,
      role,
      startDate,
      isActive,
      managedDepartments,
      managedSections,
    } = body;

    const userId = parseInt(id);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้งาน' },
        { status: 404 }
      );
    }

    // Check duplicate employeeId
    if (employeeId && employeeId !== existingUser.employeeId) {
      const duplicateId = await prisma.user.findUnique({
        where: { employeeId },
      });
      if (duplicateId) {
        return NextResponse.json(
          { error: 'รหัสพนักงานนี้มีอยู่ในระบบแล้ว' },
          { status: 400 }
        );
      }
    }

    // Check duplicate email
    if (email && email !== existingUser.email) {
      const duplicateEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (duplicateEmail) {
        return NextResponse.json(
          { error: 'อีเมลนี้มีอยู่ในระบบแล้ว' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      firstName,
      lastName,
      email: email || null,
      gender,
      company,
      department,
      section: section || null,
      position: position || null,
      shift: shift || null,
      employeeType,
      role,
      startDate: startDate ? new Date(startDate) : undefined,
      isActive,
      managedDepartments: managedDepartments || null,
      managedSections: managedSections || null,
    };

    if (employeeId) updateData.employeeId = employeeId;
    if (password) {
      updateData.password = await hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE user
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
    const userId = parseInt(id);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้งาน' },
        { status: 404 }
      );
    }

    // Instead of hard delete, maybe just deactivate? 
    // But admin might want to hard delete if created by mistake.
    // Let's stick to hard delete but handle foreign key constraints if any.
    // Prisma schema has Cascade delete on some relations, but not all.
    // For now, let's try delete.

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    // If foreign key constraint fails
    return NextResponse.json(
      { error: 'ไม่สามารถลบผู้ใช้งานได้เนื่องจากมีข้อมูลที่เกี่ยวข้อง' },
      { status: 500 }
    );
  }
}
