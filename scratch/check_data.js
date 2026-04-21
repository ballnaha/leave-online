const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const companies = await prisma.company.findMany({ select: { code: true, name: true } });
    const departments = await prisma.department.findMany({ select: { code: true, name: true, company: true } });
    
    console.log('Companies:', companies);
    console.log('Departments (first 5):', departments.slice(0, 5));
    
    const mismatched = departments.filter(d => !companies.some(c => c.code === d.company));
    console.log('Departments with no matching company code:', mismatched.length);
    if (mismatched.length > 0) {
        console.log('First 5 mismatched:', mismatched.slice(0, 5));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
