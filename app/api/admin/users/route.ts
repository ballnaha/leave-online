import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';

// GET all users
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const department = searchParams.get('department');
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    const where: any = {};

    if (company && company !== 'all') {
      where.company = company;
    }
    if (department && department !== 'all') {
      where.department = department;
    }
    if (role && role !== 'all') {
      where.role = role;
    }
    if (status && status !== 'all') {
      where.isActive = status === 'active';
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
        role: true,
        isActive: true,
        avatar: true,
        employeeType: true,
        startDate: true,
        managedDepartments: true,
        managedSections: true,
      },
    });

    // Get all departments and sections for name lookup
    const [departments, sections] = await Promise.all([
      prisma.department.findMany({ select: { code: true, name: true } }),
      prisma.section.findMany({ select: { code: true, name: true } }),
    ]);

    // Create lookup maps
    const deptMap = new Map(departments.map(d => [d.code, d.name]));
    const sectionMap = new Map(sections.map(s => [s.code, s.name]));

    // Add names to users
    const usersWithNames = users.map(user => ({
      ...user,
      departmentName: deptMap.get(user.department) || user.department,
      sectionName: user.section ? (sectionMap.get(user.section) || user.section) : null,
    }));

    return NextResponse.json(usersWithNames);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST create new user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Validate required fields
    if (!employeeId || !firstName || !lastName || !password || !company || !department) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Check if employeeId exists
    const existingUser = await prisma.user.findUnique({
      where: { employeeId },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'รหัสพนักงานนี้มีอยู่ในระบบแล้ว' },
        { status: 400 }
      );
    }

    // Check if email exists (if provided)
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: 'อีเมลนี้มีอยู่ในระบบแล้ว' },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        employeeId,
        firstName,
        lastName,
        email: email || null,
        password: hashedPassword,
        gender,
        company,
        department,
        section: section || null,
        position: position || null,
        shift: shift || null,
        employeeType,
        role: role || 'employee',
        startDate: new Date(startDate),
        isActive: isActive ?? true,
        managedDepartments: managedDepartments || null,
        managedSections: managedSections || null,
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
