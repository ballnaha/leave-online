import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      company,
      employeeType,
      firstName,
      lastName,
      gender,
      employeeId,
      position,
      department,
      section,
      shift,
      startDate,
      password,
    } = body;

    // Validate required fields
    if (!company || !employeeType || !firstName || !lastName || !gender || !employeeId || !department || !startDate || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Check if employee ID already exists
    const existingUser = await prisma.user.findUnique({
      where: { employeeId },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'รหัสพนักงานนี้มีอยู่ในระบบแล้ว' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        company,
        employeeType,
        firstName,
        lastName,
        gender,
        employeeId,
        position: position || null,
        department,
        section: section || null,
        shift: shift || null,
        startDate: new Date(startDate),
        password: hashedPassword,
        // Ensure role matches Prisma enum; default to employee
        role: UserRole.employee,
        isActive: true,
      },
    });

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { 
        message: 'สมัครสมาชิกสำเร็จ',
        user: userWithoutPassword 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' },
      { status: 500 }
    );
  }
}
