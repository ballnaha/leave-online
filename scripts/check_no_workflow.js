
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { isActive: true },
        select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            company: true,
            department: true,
            section: true,
            role: true
        }
    });

    const workflows = await prisma.approvalWorkflow.findMany({
        where: { isActive: true }
    });

    const userFlows = await prisma.userApprovalFlow.findMany({
        where: { isActive: true },
        select: { userId: true }
    });

    const userWithSpecialFlow = new Set(userFlows.map(f => f.userId));

    const usersWithoutWorkflow = [];

    for (const user of users) {
        if (userWithSpecialFlow.has(user.id)) continue;

        let matched = false;

        // Check Section
        if (user.section) {
            const sectionWf = workflows.find(wf => wf.section === user.section);
            if (sectionWf) matched = true;
        }

        // Check Department
        if (!matched && user.department) {
            const deptWf = workflows.find(wf => wf.department === user.department && !wf.section);
            if (deptWf) matched = true;
        }

        // Check Company
        if (!matched && user.company) {
            const compWf = workflows.find(wf => wf.company === user.company && !wf.department && !wf.section);
            if (compWf) matched = true;
        }

        if (!matched) {
            usersWithoutWorkflow.push(user);
        }
    }

    console.log(JSON.stringify(usersWithoutWorkflow, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
