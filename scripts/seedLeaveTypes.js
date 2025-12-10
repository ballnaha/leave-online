"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const leaveTypes = [
    { code: 'sick', name: 'ลาป่วย', description: 'ลาป่วยตามสิทธิ์ประจำปี', maxDaysPerYear: 30, isPaid: true },
    { code: 'personal', name: 'ลากิจ', description: 'ลากิจส่วนตัว', maxDaysPerYear: 3, isPaid: true },
    { code: 'vacation', name: 'ลาพักร้อน', description: 'ลาพักร้อนประจำปี', maxDaysPerYear: 6, isPaid: true },
    { code: 'maternity', name: 'ลาคลอด', description: 'ลาคลอดบุตร', maxDaysPerYear: 120, isPaid: true },
    { code: 'ordination', name: 'ลาบวช', description: 'ลาอุปสมบท (อายุงานครบ 1 ปี)', maxDaysPerYear: 30, isPaid: false },
    { code: 'work_outside', name: 'ทำงานนอกสถานที่', description: 'ปฏิบัติงานนอกสถานที่', maxDaysPerYear: null, isPaid: true },
    { code: 'unpaid', name: 'ลาไม่รับค่าจ้าง', description: 'ลากิจส่วนตัวโดยไม่ได้รับค่าจ้าง', maxDaysPerYear: null, isPaid: false },
    { code: 'other', name: 'ลาอื่นๆ', description: 'ลาที่ไม่ระบุประเภท', maxDaysPerYear: null, isPaid: true },
];
   
async function main() {
    console.log('Seeding leave types...');
    for (const leaveType of leaveTypes) {
        await prisma.leaveType.upsert({
            where: { code: leaveType.code },
            update: {
                name: leaveType.name,
                description: leaveType.description ?? null,
                maxDaysPerYear: leaveType.maxDaysPerYear ?? null,
                isPaid: leaveType.isPaid,
                isActive: true,
            },
            create: {
                code: leaveType.code,
                name: leaveType.name,
                description: leaveType.description ?? null,
                maxDaysPerYear: leaveType.maxDaysPerYear ?? null,
                isPaid: leaveType.isPaid,
                isActive: true,
            },
        });
    }
    console.log(`Inserted/updated ${leaveTypes.length} leave types.`);
}
main()
    .catch(error => {
    console.error('Failed to seed leave types:', error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
/* node scripts/seedLeaveTypes.js */ 
