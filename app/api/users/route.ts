import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/users - ดึงรายชื่อ users (สำหรับเลือกผู้อนุมัติ)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // filter by role
    const company = searchParams.get('company'); // filter by company
    const search = searchParams.get('search'); // search by name/employeeId
    const excludeRoles = searchParams.get('excludeRoles')?.split(','); // exclude roles

    const whereClause: Record<string, unknown> = {
      isActive: true,
    };

    if (role) {
      if (role === 'approver') {
        whereClause.role = {
          in: ['shift_supervisor', 'section_head', 'dept_manager', 'hr_manager', 'admin', 'hr']
        };
      } else {
        whereClause.role = role;
      }
    }

    if (company) {
      whereClause.company = company;
    }

    if (excludeRoles && excludeRoles.length > 0) {
      whereClause.role = { notIn: excludeRoles };
    }

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        position: true,
        department: true,
        section: true,
        role: true,
        company: true,
        avatar: true,
      },
      orderBy: [
        { role: 'asc' },
        { firstName: 'asc' },
      ],
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
