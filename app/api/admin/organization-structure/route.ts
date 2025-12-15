import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/organization-structure - ดึงโครงสร้างองค์กร (หัวหน้า-ลูกน้อง)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const companyFilter = searchParams.get('company') || 'all';
    const departmentFilter = searchParams.get('department') || 'all';
    const sectionFilter = searchParams.get('section') || 'all';
    const shiftFilter = searchParams.get('shift') || 'all';

    // Fetch master data
    const [companies, allDepartments, allSections] = await Promise.all([
      prisma.company.findMany({ orderBy: { name: 'asc' } }),
      prisma.department.findMany({ orderBy: { name: 'asc' } }),
      prisma.section.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const companyMap = new Map(companies.map(c => [c.code, c.name]));
    const deptMap = new Map(allDepartments.map(d => [d.code, d.name]));
    const sectMap = new Map(allSections.map(s => [s.code, s.name]));

    // Build user where clause
    const userWhere: Record<string, unknown> = {
      isActive: true,
    };
    if (companyFilter !== 'all') userWhere.company = companyFilter;
    if (departmentFilter !== 'all') userWhere.department = departmentFilter;
    if (sectionFilter !== 'all') userWhere.section = sectionFilter;
    if (shiftFilter !== 'all') userWhere.shift = shiftFilter;

    // Fetch all users with their approval flows
    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        position: true,
        role: true,
        company: true,
        department: true,
        section: true,
        shift: true,
        avatar: true,
        approvalFlows: {
          where: { isActive: true },
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
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: [
        { company: 'asc' },
        { department: 'asc' },
        { section: 'asc' },
        { firstName: 'asc' },
      ],
    });

    // Fetch ALL active users for subordinate calculation (not filtered)
    const allActiveUsers = await prisma.user.findMany({
      where: { isActive: true },
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
        shift: true,
      },
    });

    // Get unique data from all users (for cascading filters)
    const allUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { company: true, department: true, section: true, shift: true },
    });

    // Build cascading filter options
    // Departments: filter by selected company
    const filteredDepartments = companyFilter !== 'all'
      ? [...new Set(allUsers.filter(u => u.company === companyFilter).map(u => u.department))]
      : [...new Set(allUsers.map(u => u.department))];
    
    // Sections: filter by selected department (and company)
    const filteredSections = departmentFilter !== 'all'
      ? [...new Set(allUsers
          .filter(u => u.department === departmentFilter && (companyFilter === 'all' || u.company === companyFilter))
          .map(u => u.section)
          .filter(Boolean))]
      : companyFilter !== 'all'
        ? [...new Set(allUsers.filter(u => u.company === companyFilter).map(u => u.section).filter(Boolean))]
        : [...new Set(allUsers.map(u => u.section).filter(Boolean))];

    // Shifts: filter by selected section/department/company
    let filteredShifts: string[] = [];
    if (sectionFilter !== 'all') {
      filteredShifts = [...new Set(allUsers
        .filter(u => u.section === sectionFilter)
        .map(u => u.shift)
        .filter(Boolean))] as string[];
    } else if (departmentFilter !== 'all') {
      filteredShifts = [...new Set(allUsers
        .filter(u => u.department === departmentFilter)
        .map(u => u.shift)
        .filter(Boolean))] as string[];
    } else if (companyFilter !== 'all') {
      filteredShifts = [...new Set(allUsers
        .filter(u => u.company === companyFilter)
        .map(u => u.shift)
        .filter(Boolean))] as string[];
    } else {
      filteredShifts = [...new Set(allUsers.map(u => u.shift).filter(Boolean))] as string[];
    }

    // Transform data
    const result = users.map(user => {
      // หาหัวหน้าจาก organization structure (ไม่สนใจบริษัท ดูแค่ฝ่ายเดียวกัน)
      const orgSupervisors = getOrganizationSupervisors(user, allActiveUsers);
      
      return {
        id: user.id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        position: user.position,
        role: user.role,
        roleName: getRoleName(user.role),
        company: user.company,
        companyName: companyMap.get(user.company) || user.company,
        department: user.department,
        departmentName: deptMap.get(user.department) || user.department,
        section: user.section,
        sectionName: user.section ? (sectMap.get(user.section) || user.section) : null,
        shift: user.shift,
        avatar: user.avatar,
        // ใช้หัวหน้าจาก organization structure แทน approval flow
        approvers: orgSupervisors.map((sup, index) => ({
          level: index + 1,
          approver: {
            id: sup.id,
            employeeId: sup.employeeId,
            firstName: sup.firstName,
            lastName: sup.lastName,
            fullName: `${sup.firstName} ${sup.lastName}`,
            position: sup.position,
            role: sup.role,
            roleName: getRoleName(sup.role),
            avatar: sup.avatar,
          },
        })),
        hasApprover: orgSupervisors.length > 0,
        // Calculate subordinates based on organization structure
        // dept_manager: ลูกน้องคือทุกคนในฝ่ายเดียวกัน
        // section_head: ลูกน้องคือทุกคนในฝ่ายและแผนกเดียวกัน
        // shift_supervisor: ลูกน้องคือทุกคนในฝ่าย แผนก และกะเดียวกัน
        subordinates: getSubordinates(user, allActiveUsers, companyMap, deptMap, sectMap),
        subordinateCount: getSubordinateCount(user, allActiveUsers),
      };
    });

    // Group by company > department > section
    const grouped = groupByHierarchy(result, companyMap, deptMap, sectMap);

    // Statistics
    const stats = {
      totalUsers: result.length,
      usersWithApprover: result.filter(u => u.hasApprover).length,
      usersWithoutApprover: result.filter(u => !u.hasApprover).length,
      byRole: countByRole(result),
    };

    return NextResponse.json({
      data: result,
      grouped,
      stats,
      filters: {
        companies: companies.map(c => ({ code: c.code, name: c.name })),
        // Cascading departments
        departments: allDepartments
          .filter(d => filteredDepartments.includes(d.code))
          .map(d => ({ code: d.code, name: d.name })),
        // Cascading sections
        sections: allSections
          .filter(s => filteredSections.includes(s.code))
          .map(s => ({ code: s.code, name: s.name })),
        // Cascading shifts
        shifts: filteredShifts.sort(),
      },
    });
  } catch (error) {
    console.error('Error fetching organization structure:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization structure' },
      { status: 500 }
    );
  }
}

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

// Type for user in subordinate calculation
interface SubordinateUser {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  position: string | null;
  role: string;
  avatar: string | null;
  company: string;
  department: string;
  section: string | null;
  shift: string | null;
}

// Type for the current user being processed
interface CurrentUser {
  id: number;
  role: string;
  company: string;
  department: string;
  section: string | null;
  shift: string | null;
}

// หาหัวหน้าจาก organization structure (ไม่สนใจบริษัท ดูแค่ฝ่าย/แผนกเดียวกัน)
// Logic:
// - employee/shift_supervisor: หา section_head (ถ้ามี section เดียวกัน) และ dept_manager ของฝ่ายเดียวกัน
// - section_head: หา dept_manager ของฝ่ายเดียวกัน
// - dept_manager: ไม่มีหัวหน้า
function getOrganizationSupervisors(
  user: CurrentUser,
  allUsers: SubordinateUser[]
): SubordinateUser[] {
  const supervisors: SubordinateUser[] = [];

  // dept_manager และ admin/hr ไม่มีหัวหน้า (หรือหัวหน้าอยู่นอกระบบ)
  if (['dept_manager', 'admin', 'hr_manager', 'hr'].includes(user.role)) {
    return [];
  }

  // หา section_head ของ section เดียวกัน (ไม่สนใจบริษัท)
  if (user.section && ['employee', 'shift_supervisor'].includes(user.role)) {
    const sectionHead = allUsers.find(u =>
      u.id !== user.id &&
      u.role === 'section_head' &&
      u.department === user.department &&
      u.section === user.section
    );
    if (sectionHead) {
      supervisors.push(sectionHead);
    }
  }

  // หา dept_manager ของฝ่ายเดียวกัน (ไม่สนใจบริษัท)
  const deptManager = allUsers.find(u =>
    u.id !== user.id &&
    u.role === 'dept_manager' &&
    u.department === user.department
  );
  if (deptManager) {
    supervisors.push(deptManager);
  }

  return supervisors;
}

// Calculate subordinates based on organization structure
function getSubordinates(
  user: CurrentUser,
  allUsers: SubordinateUser[],
  companyMap: Map<string, string>,
  deptMap: Map<string, string>,
  sectMap: Map<string, string>
) {
  let subordinates: SubordinateUser[] = [];

  // dept_manager: ลูกน้องคือทุกคนในฝ่ายเดียวกัน (ยกเว้นตัวเอง)
  if (user.role === 'dept_manager') {
    subordinates = allUsers.filter(u => 
      u.id !== user.id && 
      u.company === user.company &&
      u.department === user.department
    );
  }
  // section_head: ลูกน้องคือทุกคนในฝ่ายและแผนกเดียวกัน (ยกเว้นตัวเอง และ dept_manager)
  else if (user.role === 'section_head') {
    subordinates = allUsers.filter(u => 
      u.id !== user.id && 
      u.company === user.company &&
      u.department === user.department &&
      u.section === user.section &&
      u.role !== 'dept_manager'
    );
  }
  // shift_supervisor: ลูกน้องคือทุกคนในฝ่าย แผนก และกะเดียวกัน (ยกเว้นตัวเอง และ role ที่สูงกว่า)
  else if (user.role === 'shift_supervisor') {
    subordinates = allUsers.filter(u => 
      u.id !== user.id && 
      u.company === user.company &&
      u.department === user.department &&
      u.section === user.section &&
      u.shift === user.shift &&
      !['dept_manager', 'section_head'].includes(u.role)
    );
  }

  return subordinates.map(sub => ({
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
}

// Get subordinate count
function getSubordinateCount(user: CurrentUser, allUsers: SubordinateUser[]): number {
  // dept_manager: นับทุกคนในฝ่ายเดียวกัน
  if (user.role === 'dept_manager') {
    return allUsers.filter(u => 
      u.id !== user.id && 
      u.company === user.company &&
      u.department === user.department
    ).length;
  }
  // section_head: นับทุกคนในฝ่ายและแผนกเดียวกัน
  else if (user.role === 'section_head') {
    return allUsers.filter(u => 
      u.id !== user.id && 
      u.company === user.company &&
      u.department === user.department &&
      u.section === user.section &&
      u.role !== 'dept_manager'
    ).length;
  }
  // shift_supervisor: นับทุกคนในฝ่าย แผนก และกะเดียวกัน
  else if (user.role === 'shift_supervisor') {
    return allUsers.filter(u => 
      u.id !== user.id && 
      u.company === user.company &&
      u.department === user.department &&
      u.section === user.section &&
      u.shift === user.shift &&
      !['dept_manager', 'section_head'].includes(u.role)
    ).length;
  }
  
  return 0;
}

function countByRole(users: { role: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  users.forEach(u => {
    counts[u.role] = (counts[u.role] || 0) + 1;
  });
  return counts;
}

interface GroupedData {
  company: string;
  companyName: string;
  departments: {
    department: string;
    departmentName: string;
    sections: {
      section: string | null;
      sectionName: string | null;
      users: unknown[];
    }[];
    usersNoSection: unknown[];
  }[];
}

function groupByHierarchy(
  users: { company: string; companyName: string; department: string; departmentName: string; section: string | null; sectionName: string | null }[],
  companyMap: Map<string, string>,
  deptMap: Map<string, string>,
  sectMap: Map<string, string>
): GroupedData[] {
  const grouped: Map<string, GroupedData> = new Map();

  users.forEach(user => {
    // Get or create company group
    if (!grouped.has(user.company)) {
      grouped.set(user.company, {
        company: user.company,
        companyName: user.companyName,
        departments: [],
      });
    }
    const companyGroup = grouped.get(user.company)!;

    // Get or create department group
    let deptGroup = companyGroup.departments.find(d => d.department === user.department);
    if (!deptGroup) {
      deptGroup = {
        department: user.department,
        departmentName: user.departmentName,
        sections: [],
        usersNoSection: [],
      };
      companyGroup.departments.push(deptGroup);
    }

    // Add to section or no-section
    if (user.section) {
      let sectGroup = deptGroup.sections.find(s => s.section === user.section);
      if (!sectGroup) {
        sectGroup = {
          section: user.section,
          sectionName: user.sectionName,
          users: [],
        };
        deptGroup.sections.push(sectGroup);
      }
      sectGroup.users.push(user);
    } else {
      deptGroup.usersNoSection.push(user);
    }
  });

  return Array.from(grouped.values());
}
