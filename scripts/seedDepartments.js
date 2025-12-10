"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const departments = [
    { code: '21100', name: 'ฝ่ายผลิต1', company: 'PSC' },
    { code: '21200', name: 'ฝ่ายผลิต2', company: 'PSC' },
    { code: '21400', name: 'ฝ่ายควบคุมคุณภาพ', company: 'PSC' },
    { code: '21500', name: 'ฝ่ายวิศวกรรม', company: 'PSC' },
    { code: '21600', name: 'ฝ่ายวิจัยและพัฒนา', company: 'PSC' },
    { code: '21700', name: 'ฝ่ายระบบคุณภาพและความปลอดภัย', company: 'PSC' },
    { code: '23100', name: 'ฝ่ายวางแผนการผลิต', company: 'PSC' },
    { code: '23200', name: 'ฝ่ายขายและการตลาด', company: 'PSC' },
    { code: '23300', name: 'ฝ่ายคลัง', company: 'PSC' },
    { code: '23400', name: 'ฝ่ายจัดซื้อ', company: 'PSC' },
    { code: '23500', name: 'ฝ่ายทรัพยาการบุคคล', company: 'PSC' },
    { code: '23600', name: 'ฝ่ายบัญชี', company: 'PSC' },
    { code: '23700', name: 'ฝ่ายการเงิน', company: 'PSC' },
    { code: '23800', name: 'ฝ่ายเทคโนโลยีสารสนเทศ', company: 'PSC' },
    { code: '31300', name: 'ฝ่ายผลิต3', company: 'PS' },
    { code: '31400', name: 'ฝ่ายควบคุมคุณภาพ PS', company: 'PS' },
    { code: '31500', name: 'ฝ่ายวิศวกรรมเครื่องกล/ไฟฟ้า', company: 'PS' },
    { code: '31700', name: 'ฝ่ายระบบคุณภาพและความปลอดภัย', company: 'PS' },
    { code: '33200', name: 'ฝ่ายขายและการตลาด', company: 'PS' },
    { code: '33300', name: 'ฝ่ายคลัง', company: 'PS' },
    { code: '33400', name: 'ฝ่ายจัดซื้อ', company: 'PS' },
    { code: '33500', name: 'ฝ่ายทรัพยาการบุคคล', company: 'PS' },
    { code: '33600', name: 'ฝ่ายบัญชี', company: 'PS' },
    { code: '33700', name: 'ฝ่ายการเงิน', company: 'PS' },
    { code: '33800', name: 'ฝ่ายเทคโนโลยีสารสนเทศ', company: 'PS' },
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
