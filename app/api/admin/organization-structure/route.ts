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

    // Fetch master data in parallel
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

    // =========== OPTIMIZED: Single query for all active users ===========
    // Fetch all active users ONCE (used for both display and lookups)
    const allActiveUsers = await prisma.user.findMany({
      where: { isActive: true },
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
      },
    });

    // =========== OPTIMIZED: Pre-build lookup indexes ===========
    // Index by department for O(1) supervisor lookup
    const sectionHeadsByDeptSection = new Map<string, SubordinateUser>();
    const deptManagersByDept = new Map<string, SubordinateUser>();

    for (const u of allActiveUsers) {
      if (u.role === 'section_head' && u.section) {
        sectionHeadsByDeptSection.set(`${u.department}:${u.section}`, u);
      }
      if (u.role === 'dept_manager') {
        deptManagersByDept.set(u.department, u);
      }
    }

    // =========== OPTIMIZED: Pre-count subordinates per user ===========
    // Build subordinate counts using Maps for O(n) total instead of O(n²)
    const subordinateCountByUser = new Map<number, number>();

    // Group users by company-dept-section-shift for fast counting
    const usersByCompanyDept = new Map<string, SubordinateUser[]>();
    const usersByCompanyDeptSection = new Map<string, SubordinateUser[]>();
    const usersByCompanyDeptSectionShift = new Map<string, SubordinateUser[]>();

    for (const u of allActiveUsers) {
      // Group by company+dept
      const keyDept = `${u.company}:${u.department}`;
      if (!usersByCompanyDept.has(keyDept)) usersByCompanyDept.set(keyDept, []);
      usersByCompanyDept.get(keyDept)!.push(u);

      // Group by company+dept+section
      if (u.section) {
        const keySect = `${u.company}:${u.department}:${u.section}`;
        if (!usersByCompanyDeptSection.has(keySect)) usersByCompanyDeptSection.set(keySect, []);
        usersByCompanyDeptSection.get(keySect)!.push(u);

        // Group by company+dept+section+shift
        if (u.shift) {
          const keyShift = `${u.company}:${u.department}:${u.section}:${u.shift}`;
          if (!usersByCompanyDeptSectionShift.has(keyShift)) usersByCompanyDeptSectionShift.set(keyShift, []);
          usersByCompanyDeptSectionShift.get(keyShift)!.push(u);
        }
      }
    }

    // Pre-compute subordinate counts using grouped data
    for (const u of allActiveUsers) {
      let count = 0;
      if (u.role === 'dept_manager') {
        const key = `${u.company}:${u.department}`;
        count = (usersByCompanyDept.get(key)?.length || 0) - 1; // -1 for self
      } else if (u.role === 'section_head' && u.section) {
        const key = `${u.company}:${u.department}:${u.section}`;
        const sectionUsers = usersByCompanyDeptSection.get(key) || [];
        count = sectionUsers.filter(x => x.id !== u.id && x.role !== 'dept_manager').length;
      } else if (u.role === 'shift_supervisor' && u.section && u.shift) {
        const key = `${u.company}:${u.department}:${u.section}:${u.shift}`;
        const shiftUsers = usersByCompanyDeptSectionShift.get(key) || [];
        count = shiftUsers.filter(x => x.id !== u.id && !['dept_manager', 'section_head'].includes(x.role)).length;
      }
      subordinateCountByUser.set(u.id, count);
    }

    // =========== Filter users for display ===========
    let filteredUsers = allActiveUsers;
    if (companyFilter !== 'all') filteredUsers = filteredUsers.filter(u => u.company === companyFilter);
    if (departmentFilter !== 'all') filteredUsers = filteredUsers.filter(u => u.department === departmentFilter);
    if (sectionFilter !== 'all') filteredUsers = filteredUsers.filter(u => u.section === sectionFilter);
    if (shiftFilter !== 'all') filteredUsers = filteredUsers.filter(u => u.shift === shiftFilter);

    // Sort
    filteredUsers.sort((a, b) => {
      if (a.company !== b.company) return a.company.localeCompare(b.company);
      if (a.department !== b.department) return a.department.localeCompare(b.department);
      if ((a.section || '') !== (b.section || '')) return (a.section || '').localeCompare(b.section || '');
      return a.firstName.localeCompare(b.firstName);
    });

    // =========== Build cascading filter options (optimized) ===========
    const uniqueDepts = new Set<string>();
    const uniqueSects = new Set<string>();
    const uniqueShifts = new Set<string>();

    for (const u of allActiveUsers) {
      if (companyFilter === 'all' || u.company === companyFilter) {
        uniqueDepts.add(u.department);
        if (departmentFilter === 'all' || u.department === departmentFilter) {
          if (u.section) uniqueSects.add(u.section);
          if (sectionFilter === 'all' || u.section === sectionFilter) {
            if (u.shift) uniqueShifts.add(u.shift);
          }
        }
      }
    }

    // =========== Transform data (optimized: O(n)) ===========
    const result = filteredUsers.map(user => {
      // หาหัวหน้าจาก pre-built index (O(1) lookup)
      const supervisors: SubordinateUser[] = [];
      if (!['dept_manager', 'admin', 'hr_manager', 'hr'].includes(user.role)) {
        // หา section_head
        if (user.section && ['employee', 'shift_supervisor'].includes(user.role)) {
          const sectionHead = sectionHeadsByDeptSection.get(`${user.department}:${user.section}`);
          if (sectionHead && sectionHead.id !== user.id) {
            supervisors.push(sectionHead);
          }
        }
        // หา dept_manager
        const deptManager = deptManagersByDept.get(user.department);
        if (deptManager && deptManager.id !== user.id) {
          supervisors.push(deptManager);
        }
      }

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
        // ใช้หัวหน้าจาก pre-built index
        approvers: supervisors.map((sup, index) => ({
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
        hasApprover: supervisors.length > 0,
        // =========== OPTIMIZED: Only send count, load details on-demand ===========
        subordinates: [], // Empty - load on demand via separate API
        subordinateCount: subordinateCountByUser.get(user.id) || 0,
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
          .filter(d => uniqueDepts.has(d.code))
          .map(d => ({ code: d.code, name: d.name })),
        // Cascading sections
        sections: allSections
          .filter(s => uniqueSects.has(s.code))
          .map(s => ({ code: s.code, name: s.name })),
        // Cascading shifts
        shifts: Array.from(uniqueShifts).sort(),
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
