import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single leave type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!leaveType) {
      return NextResponse.json(
        { error: 'ไม่พบประเภทการลา' },
        { status: 404 }
      );
    }

    return NextResponse.json(leaveType);
  } catch (error) {
    console.error('Error fetching leave type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave type' },
      { status: 500 }
    );
  }
}

// PUT update leave type
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { code, name, description, maxDaysPerYear, isPaid, isActive } = body;

    // Check if leave type exists
    const existingLeaveType = await prisma.leaveType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingLeaveType) {
      return NextResponse.json(
        { error: 'ไม่พบประเภทการลา' },
        { status: 404 }
      );
    }

    // Check if code is taken by another leave type
    if (code && code.toUpperCase() !== existingLeaveType.code) {
      const codeExists = await prisma.leaveType.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: 'รหัสประเภทการลานี้มีอยู่ในระบบแล้ว' },
          { status: 400 }
        );
      }
    }

    const leaveType = await prisma.leaveType.update({
      where: { id: parseInt(id) },
      data: {
        ...(code && { code: code.toUpperCase() }),
        ...(name && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(maxDaysPerYear !== undefined && { 
          maxDaysPerYear: maxDaysPerYear !== '' && maxDaysPerYear !== null 
            ? parseFloat(maxDaysPerYear) 
            : null 
        }),
        ...(typeof isPaid === 'boolean' && { isPaid }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });

    return NextResponse.json(leaveType);
  } catch (error) {
    console.error('Error updating leave type:', error);
    return NextResponse.json(
      { error: 'Failed to update leave type' },
      { status: 500 }
    );
  }
}

// DELETE leave type (hard delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if leave type exists
    const existingLeaveType = await prisma.leaveType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingLeaveType) {
      return NextResponse.json(
        { error: 'ไม่พบประเภทการลา' },
        { status: 404 }
      );
    }

    // Hard delete
    await prisma.leaveType.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'ลบประเภทการลาสำเร็จ' });
  } catch (error) {
    console.error('Error deleting leave type:', error);
    return NextResponse.json(
      { error: 'Failed to delete leave type' },
      { status: 500 }
    );
  }
}
