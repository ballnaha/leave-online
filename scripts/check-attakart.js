const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const user = await prisma.user.findFirst({
            where: { firstName: { contains: 'อรรถกฤษณ์' } },
        });
        console.log('--- ATTAKART DATA ---');
        console.log(JSON.stringify(user, null, 2));

        const requester = await prisma.user.findUnique({
            where: { employeeId: '200039' },
        });
        console.log('--- REQUESTER DATA ---');
        console.log(JSON.stringify(requester, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
