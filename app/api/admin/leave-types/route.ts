import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';

// GET all leave types
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leaveTypes = await prisma.leaveType.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(leaveTypes);
  } catch (error) {
    console.error('Error fetching leave types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave types' },
      { status: 500 }
    );
  }
}

// POST create new leave type
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, name, description, maxDaysPerYear, isPaid, isActive } = body;

    // Validate required fields
    if (!code || !name) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existingLeaveType = await prisma.leaveType.findUnique({
      where: { code: code },
    });

    if (existingLeaveType) {
      return NextResponse.json(
        { error: 'รหัสประเภทการลานี้มีอยู่ในระบบแล้ว' },
        { status: 400 }
      );
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        code: code,
        name,
        description: description || null,
        maxDaysPerYear: maxDaysPerYear ? parseFloat(maxDaysPerYear) : null,
        isPaid: isPaid ?? true,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(leaveType, { status: 201 });
  } catch (error) {
    console.error('Error creating leave type:', error);
    return NextResponse.json(
      { error: 'Failed to create leave type' },
      { status: 500 }
    );
  }
}
