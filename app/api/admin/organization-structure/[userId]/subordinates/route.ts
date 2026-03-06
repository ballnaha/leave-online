import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function getRoleName(role: string): string {
    const roleNames: Record<string, string> = {
        admin: 'Admin',
        hr_manager: 'HR Manager',
        hr: 'HR',
        dept_manager: 'ผู้จัดการฝ่าย',
        section_head: 'หัวหน้าแผนก',
        shift_supervisor: 'หัวหน้ากะ',
        employee: 'พนักงาน',
    };
    return roleNames[role] || role;
}

// GET /api/admin/organization-structure/[userId]/subordinates - ดึงลูกน้องของ user (on-demand)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admin, hr_manager, hr can access
        const allowedRoles = ['admin', 'hr_manager', 'hr'];
        if (!allowedRoles.includes(session.user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { userId } = await params;
        const userIdNum = parseInt(userId);

        if (isNaN(userIdNum)) {
            return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
        }

        // Fetch the user
        const user = await prisma.user.findUnique({
            where: { id: userIdNum },
            select: {
                id: true,
                role: true,
                company: true,
                department: true,
                section: true,
                shift: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Fetch master data for names
        const [companies, departments, sections] = await Promise.all([
            prisma.company.findMany(),
            prisma.department.findMany(),
            prisma.section.findMany(),
        ]);

        const companyMap = new Map(companies.map(c => [c.code, c.name]));
        const deptMap = new Map(departments.map(d => [d.code, d.name]));
        const sectMap = new Map(sections.map(s => [s.code, s.name]));

        // Calculate subordinates based on organization structure
        let subordinateWhere: Record<string, unknown> = {
            isActive: true,
            id: { not: user.id },
        };

        // dept_manager: ลูกน้องคือทุกคนในฝ่ายเดียวกัน
        if (user.role === 'dept_manager') {
            subordinateWhere = {
                ...subordinateWhere,
                company: user.company,
                department: user.department,
            };
        }
        // section_head: ลูกน้องคือทุกคนในฝ่ายและแผนกเดียวกัน (ยกเว้น dept_manager)
        else if (user.role === 'section_head') {
            subordinateWhere = {
                ...subordinateWhere,
                company: user.company,
                department: user.department,
                section: user.section,
                role: { not: 'dept_manager' },
            };
        }
        // shift_supervisor: ลูกน้องคือทุกคนในฝ่าย แผนก และกะเดียวกัน
        else if (user.role === 'shift_supervisor') {
            subordinateWhere = {
                ...subordinateWhere,
                company: user.company,
                department: user.department,
                section: user.section,
                shift: user.shift,
                role: { notIn: ['dept_manager', 'section_head'] },
            };
        } else {
            // Other roles have no subordinates
            return NextResponse.json({ subordinates: [] });
        }

        const subordinates = await prisma.user.findMany({
            where: subordinateWhere,
            select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                position: true,
                role: true,
                avatar: true,
                company: true,
                department: true,
                section: true,
            },
            orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        });

        const result = subordinates.map(sub => ({
            id: sub.id,
            employeeId: sub.employeeId,
            firstName: sub.firstName,
            lastName: sub.lastName,
            fullName: `${sub.firstName} ${sub.lastName}`,
            position: sub.position,
            role: sub.role,
            roleName: getRoleName(sub.role),
            avatar: sub.avatar,
            company: sub.company,
            companyName: companyMap.get(sub.company) || sub.company,
            department: sub.department,
            departmentName: deptMap.get(sub.department) || sub.department,
            section: sub.section,
            sectionName: sub.section ? (sectMap.get(sub.section) || sub.section) : null,
        }));

        return NextResponse.json({ subordinates: result });
    } catch (error) {
        console.error('Error fetching subordinates:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subordinates' },
            { status: 500 }
        );
    }
}
