import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/user-approval-flow - ดึง approval flow ของ user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Admin/HR สามารถดู flow ของคนอื่นได้
    const isAdmin = ['admin', 'hr_manager'].includes(session.user.role);
    const targetUserId = userId && isAdmin ? parseInt(userId) : parseInt(session.user.id);

    const approvalFlows = await prisma.userApprovalFlow.findMany({
      where: { userId: targetUserId, isActive: true },
      orderBy: { level: 'asc' },
      include: {
        approver: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            position: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(approvalFlows);
  } catch (error) {
    console.error('Error fetching approval flows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approval flows' },
      { status: 500 }
    );
  }
}

// POST /api/user-approval-flow - สร้าง/อัพเดต approval flow ของ user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // เฉพาะ Admin/HR สามารถตั้งค่า flow ได้
    if (!['admin', 'hr_manager'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Only admin or HR can manage approval flows' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, flows } = body;

    if (!userId || !Array.isArray(flows)) {
      return NextResponse.json(
        { error: 'userId and flows array are required' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า user มีอยู่จริง
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ตรวจสอบว่าผู้อนุมัติมีอยู่จริง
    for (const flow of flows) {
      const approver = await prisma.user.findUnique({
        where: { id: flow.approverId },
      });
      if (!approver) {
        return NextResponse.json(
          { error: `Approver ${flow.approverId} not found` },
          { status: 400 }
        );
      }
    }

    // ลบ flows เก่าทั้งหมด
    await prisma.userApprovalFlow.deleteMany({ where: { userId } });

    // หา HR Manager สำหรับขั้นสุดท้าย
    const hrManager = await prisma.user.findFirst({
      where: { role: 'hr_manager', isActive: true, company: user.company },
    });

    // สร้าง flows ใหม่
    const createdFlows = await Promise.all(
      flows.map((flow: { level: number; approverId: number; isRequired?: boolean }) =>
        prisma.userApprovalFlow.create({
          data: {
            userId,
            level: flow.level,
            approverId: flow.approverId,
            isRequired: flow.isRequired ?? true,
          },
        })
      )
    );

    // เพิ่ม HR Manager เป็นขั้นสุดท้ายถ้ายังไม่มี
    const hasHrInFlow = flows.some((f: { level: number }) => f.level === 99);
    if (!hasHrInFlow && hrManager) {
      await prisma.userApprovalFlow.create({
        data: {
          userId,
          level: 99,
          approverId: hrManager.id,
          isRequired: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      count: createdFlows.length + (hasHrInFlow ? 0 : 1),
    });
  } catch (error) {
    console.error('Error creating approval flows:', error);
    return NextResponse.json(
      { error: 'Failed to create approval flows' },
      { status: 500 }
    );
  }
}

// DELETE /api/user-approval-flow - ลบ approval flow
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'hr_manager'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Only admin or HR can delete approval flows' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const level = searchParams.get('level');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const whereClause: { userId: number; level?: number } = {
      userId: parseInt(userId),
    };

    if (level) {
      whereClause.level = parseInt(level);
    }

    // ไม่อนุญาตลบ HR level (99)
    if (level === '99') {
      return NextResponse.json(
        { error: 'Cannot delete HR Manager approval step' },
        { status: 400 }
      );
    }

    const deleted = await prisma.userApprovalFlow.deleteMany({
      where: whereClause,
    });

    return NextResponse.json({ success: true, deleted: deleted.count });
  } catch (error) {
    console.error('Error deleting approval flows:', error);
    return NextResponse.json(
      { error: 'Failed to delete approval flows' },
      { status: 500 }
    );
  }
}
