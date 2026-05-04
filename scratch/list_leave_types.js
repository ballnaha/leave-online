const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leaveTypes = await prisma.leaveType.findMany();
  console.log(JSON.stringify(leaveTypes, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
