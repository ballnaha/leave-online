const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Get departments with sections
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    include: { sections: { where: { isActive: true } } },
    orderBy: { code: 'asc' },
  });

  console.log('\n=== รายชื่อฝ่าย/แผนก ===\n');
  
  for (const dept of departments) {
    console.log(`[${dept.company}] ${dept.code} - ${dept.name}`);
    if (dept.sections.length > 0) {
      for (const sec of dept.sections) {
        console.log(`    └── ${sec.code} - ${sec.name}`);
      }
    }
  }

  // Get companies
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
  });

  console.log('\n=== บริษัท ===\n');
  for (const c of companies) {
    console.log(`${c.code} - ${c.name}`);
  }

  // Get existing users with roles
  const existingUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      employeeId: true,
      firstName: true,
      lastName: true,
      role: true,
      department: true,
      section: true,
      shift: true,
    },
    orderBy: [{ role: 'asc' }, { department: 'asc' }],
  });

  console.log('\n=== Users ตาม Role ===\n');
  const roles = ['admin', 'hr_manager', 'hr', 'dept_manager', 'section_head', 'shift_supervisor', 'employee'];
  for (const role of roles) {
    const users = existingUsers.filter(u => u.role === role);
    if (users.length > 0) {
      console.log(`\n[${role}] - ${users.length} คน`);
      users.slice(0, 5).forEach(u => {
        console.log(`  - ${u.employeeId}: ${u.firstName} ${u.lastName} | Dept: ${u.department} | Section: ${u.section || '-'} | Shift: ${u.shift || '-'}`);
      });
      if (users.length > 5) {
        console.log(`  ... และอีก ${users.length - 5} คน`);
      }
    }
  }

  // Get shifts
  const shifts = await prisma.user.groupBy({
    by: ['shift'],
    where: { isActive: true, shift: { not: null } },
  });

  console.log('\n=== กะ (Shifts) ===\n');
  shifts.forEach(s => console.log(`- ${s.shift}`));

  await prisma.$disconnect();
}

main();
