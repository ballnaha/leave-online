const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // 0. Count by role
  const roleCounts = await prisma.user.groupBy({
    by: ['role'],
    _count: true,
    where: { isActive: true }
  });
  console.log('=== User Count by Role ===');
  roleCounts.forEach((r: any) => console.log(`${r.role}: ${r._count}`));
  
  // 1. หา dept_manager ทั้งหมด
  const deptManagers = await prisma.user.findMany({
    where: { 
      role: 'dept_manager',
      isActive: true 
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      role: true,
    }
  });

  console.log('=== Dept Managers ===');
  console.log(`Found ${deptManagers.length} dept_manager(s)`);
  
  for (const manager of deptManagers) {
    console.log(`\n--- ${manager.firstName} ${manager.lastName} (ID: ${manager.id}, Dept: ${manager.department}) ---`);
    
    // 2. หาลูกน้องจาก UserApprovalFlow
    const subordinates = await prisma.userApprovalFlow.findMany({
      where: {
        approverId: manager.id,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
          }
        }
      }
    });

    console.log(`Subordinates from UserApprovalFlow: ${subordinates.length}`);
    subordinates.forEach((s: any) => {
      console.log(`  - ${s.user.firstName} ${s.user.lastName} (ID: ${s.user.id}, Level: ${s.level}, Dept: ${s.user.department})`);
    });

    // 3. หาพนักงานในฝ่ายเดียวกัน
    const sameDeptUsers = await prisma.user.findMany({
      where: {
        department: manager.department,
        isActive: true,
        id: { not: manager.id }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      }
    });

    console.log(`\nUsers in same department (${manager.department}): ${sameDeptUsers.length}`);
    sameDeptUsers.slice(0, 5).forEach((u: any) => {
      console.log(`  - ${u.firstName} ${u.lastName} (ID: ${u.id}, Role: ${u.role})`);
    });
    if (sameDeptUsers.length > 5) {
      console.log(`  ... and ${sameDeptUsers.length - 5} more`);
    }
  }

  // 4. ตรวจสอบ UserApprovalFlow ทั้งหมด
  const totalFlows = await prisma.userApprovalFlow.count({ where: { isActive: true } });
  console.log(`\n=== Total Active UserApprovalFlow records: ${totalFlows} ===`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
