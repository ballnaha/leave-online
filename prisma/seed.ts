import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { pscDepartmentSeeds, pscEmployeeSeeds } from './data/pscEmployees';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create companies
  const companies = await Promise.all([
    prisma.company.upsert({
      where: { code: 'PSC' },
      update: {},
      create: {
        code: 'PSC',
        name: 'บริษัท พูนทรัพย์แคน จำกัด',
        isActive: true,
      },
    }),
    prisma.company.upsert({
      where: { code: 'PS' },
      update: {},
      create: {
        code: 'PS',
        name: 'บริษัท พูนทรัพย์โลหะการพิมพ์ จำกัด',
        isActive: true,
      },
    }),
  ]);
  console.log('Companies created:', companies.length);

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
