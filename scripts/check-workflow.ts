import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const user = await prisma.user.findUnique({
        where: { employeeId: '200039' },
    });
    console.log('--- USER DATA ---');
    console.log(JSON.stringify(user, null, 2));

    const workflows = await prisma.approvalWorkflow.findMany({
        where: { name: { contains: 'PSC-21100-21110-แผนกอาบ' } },
        include: { steps: { orderBy: { level: 'asc' } } }
    });
    console.log('--- WORKFLOW DATA ---');
    console.log(JSON.stringify(workflows, null, 2));

    await prisma.$disconnect();
}

check();
