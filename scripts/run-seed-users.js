
const { PrismaClient } = require('@prisma/client');
const { seedUsers } = require('../prisma/seed_users');

const prisma = new PrismaClient();

async function main() {
    try {
        await seedUsers(prisma);
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

/* node scripts/run-seed-users.js */
