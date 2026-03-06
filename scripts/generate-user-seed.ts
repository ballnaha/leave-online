
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();

    const seedData = users.map(user => {
        return {
            employeeId: user.employeeId,
            email: user.email,
            password: user.password,
            firstName: user.firstName,
            lastName: user.lastName,
            gender: user.gender,
            avatar: user.avatar,
            company: user.company,
            employeeType: user.employeeType,
            department: user.department,
            section: user.section,
            shift: user.shift,
            startDate: user.startDate.toISOString(),
            role: user.role,
            isActive: user.isActive,
            position: user.position,
            managedDepartments: user.managedDepartments,
            managedSections: user.managedSections,
        };
    });

    const fileContent = `
import { PrismaClient } from '@prisma/client';

export async function seedUsers(prisma: PrismaClient) {
  const users = ${JSON.stringify(seedData, null, 2)};

  console.log(\`Seeding \${users.length} users...\`);

  for (const user of users) {
    await prisma.user.upsert({
      where: { employeeId: user.employeeId },
      update: {
        email: user.email,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        avatar: user.avatar,
        company: user.company,
        employeeType: user.employeeType,
        department: user.department,
        section: user.section,
        shift: user.shift,
        startDate: new Date(user.startDate),
        role: user.role as any,
        isActive: user.isActive,
        position: user.position,
        managedDepartments: user.managedDepartments,
        managedSections: user.managedSections,
      },
      create: {
        employeeId: user.employeeId,
        email: user.email,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        avatar: user.avatar,
        company: user.company,
        employeeType: user.employeeType,
        department: user.department,
        section: user.section,
        shift: user.shift,
        startDate: new Date(user.startDate),
        role: user.role as any,
        isActive: user.isActive,
        position: user.position,
        managedDepartments: user.managedDepartments,
        managedSections: user.managedSections,
      },
    });
  }
  
  console.log('User seeding completed.');
}
`;

    const outputPath = path.join(process.cwd(), 'prisma', 'seed_users_data.ts');
    fs.writeFileSync(outputPath, fileContent);
    console.log(`Seed script generated at: ${outputPath}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
