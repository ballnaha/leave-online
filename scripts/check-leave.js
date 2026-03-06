const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const leave = await prisma.leaveRequest.findUnique({
            where: { leaveCode: 'SK2601003' },
            include: {
                approvals: {
                    orderBy: { level: 'asc' },
                    include: { approver: true }
                }
            }
        });
        console.log('--- LEAVE DATA SK2601003 ---');
        console.log(JSON.stringify(leave, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
