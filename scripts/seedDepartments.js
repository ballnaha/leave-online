"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const departments = [
    { code: '21100', name: 'ฝ่ายผลิต1', company: 'PSC' },
    { code: '21130', name: 'ฝ่าย QC อาบพิมพ์', company: 'PSC' },
    { code: '21200', name: 'ฝ่ายผลิต2', company: 'PSC' },
    { code: '31300', name: 'ฝ่ายผลิต3', company: 'PS' },
    { code: '21400', name: 'ฝ่ายควบคุมคุณภาพ', company: 'PSC' },
    { code: '31400', name: 'ฝ่ายควบคุมคุณภาพ PS', company: 'PS' },
    { code: '21500', name: 'ฝ่ายวิศวกรรม', company: 'PSC' },
    { code: '31500', name: 'ฝ่ายวิศวกรรม PS', company: 'PS' },
    { code: '21600', name: 'ฝ่ายวิจัยพัฒนาและรับประกันคุณภาพวัตถุดิบ', company: 'PSC' },
    { code: '31700', name: 'ฝ่ายระบบคุณภาพและความปลอดภัย', company: 'PS' },
    { code: '21800', name: 'ฝ่ายบริการลูกค้า', company: 'PSC' },
    { code: '23200', name: 'ฝ่ายขายและการตลาด', company: 'PSC' },
    { code: '33210', name: 'แผนกขายและการตลาด', company: 'PS' },
    { code: '23500', name: 'ฝ่ายทรัพยากรบุคคล', company: 'PSC' },
    { code: '23600', name: 'ฝ่ายบัญชี', company: 'PSC' },
    { code: '33600', name: 'ฝ่ายบัญชี PS', company: 'PS' },
    { code: '23800', name: 'ฝ่ายเทคโนโลยีสารสนเทศ', company: 'PSC' },
    { code: '33800', name: 'ฝ่ายเทคโนโลยีสารสนเทศ PS', company: 'PS' },
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
