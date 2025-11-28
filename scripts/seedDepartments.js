"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const departments = [
    { code: 'PSC-1100', name: 'ฝ่ายผลิต1', company: 'PSC' },
    { code: 'PSC-1130', name: 'ฝ่าย QC อาบพิมพ์', company: 'PSC' },
    { code: 'PSC-1200', name: 'ฝ่ายผลิต2', company: 'PSC' },
    { code: 'PS-1300', name: 'ฝ่ายผลิต3', company: 'PS' },
    { code: 'PSC-1400', name: 'ฝ่ายควบคุมคุณภาพ', company: 'PSC' },
    { code: 'PS-1400', name: 'ฝ่ายควบคุมคุณภาพ PS', company: 'PS' },
    { code: 'PSC-1500', name: 'ฝ่ายวิศวกรรม', company: 'PSC' },
    { code: 'PS-1500', name: 'ฝ่ายวิศวกรรม PS', company: 'PS' },
    { code: 'PSC-1600', name: 'ฝ่ายวิจัยพัฒนาและรับประกันคุณภาพวัตถุดิบ', company: 'PSC' },
    { code: 'PS-1700', name: 'ฝ่ายระบบคุณภาพและความปลอดภัย', company: 'PS' },
    { code: 'PSC-1800', name: 'ฝ่ายบริการลูกค้า', company: 'PSC' },
    { code: 'PSC-3200', name: 'ฝ่ายขายและการตลาด', company: 'PSC' },
    { code: 'PS-3210', name: 'แผนกขายและการตลาด', company: 'PS' },
    { code: 'PSC-3500', name: 'ฝ่ายทรัพยากรบุคคล', company: 'PSC' },
    { code: 'PSC-3600', name: 'ฝ่ายบัญชี', company: 'PSC' },
    { code: 'PS-3600', name: 'ฝ่ายบัญชี PS', company: 'PS' },
    { code: 'PSC-3800', name: 'ฝ่ายเทคโนโลยีสารสนเทศ', company: 'PSC' },
    { code: 'PS-3800', name: 'ฝ่ายเทคโนโลยีสารสนเทศ PS', company: 'PS' },
];
async function main() {
    await prisma.department.createMany({
        data: departments.map(dep => ({
            code: dep.code,
            name: dep.name,
            company: dep.company,
            isActive: true,
        })),
        skipDuplicates: true,
    });
    console.log(`Inserted/ensured ${departments.length} PSC departments.`);
}
main()
    .catch(error => {
    console.error('Failed to seed departments:', error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
/* node scripts/seedDepartments.js */ 
