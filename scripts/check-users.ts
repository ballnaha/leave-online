import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // แสดงทุกคนในฝ่าย 23800
  const usersInDept = await prisma.user.findMany({
    where: { isActive: true, department: '23800' },
    select: {
      firstName: true,
      lastName: true,
      company: true,
      department: true,
      section: true,
      role: true
    }
  });

  console.log('=== Users in dept 23800 ===');
  usersInDept.forEach(u => {
    console.log(`  ${u.firstName} ${u.lastName} - company: ${u.company}, section: ${u.section}, role: ${u.role}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
