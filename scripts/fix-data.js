const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    try {
        // 1. Fix SK2601003
        await prisma.leaveRequest.update({
            where: { leaveCode: 'SK2601003' },
            data: { currentLevel: 2 }
        });
        console.log('Updated SK2601003 currentLevel to 2');

        // 2. Fix SK2601002
        // First, find the leave request id
        const leave002 = await prisma.leaveRequest.findUnique({
            where: { leaveCode: 'SK2601002' }
        });

        if (leave002) {
            // Remove Attakart (id 2) from approvals
            await prisma.leaveApproval.deleteMany({
                where: {
                    leaveRequestId: leave002.id,
                    approverId: 2
                }
            });
            console.log('Removed Attakart from SK2601002');

            // Update currentLevel to 2
            await prisma.leaveRequest.update({
                where: { id: leave002.id },
                data: { currentLevel: 2 }
            });
            console.log('Updated SK2601002 currentLevel to 2');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

fix();
