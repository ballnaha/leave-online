
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const devices = await prisma.userDevice.findMany({
        where: { isActive: true },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeId: true
                }
            }
        }
    });

    console.log('Active Devices:', JSON.stringify(devices, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
