"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Section data with department code mappings
const sections = [
    // PSC Sections
    { code: 'PSC-1110', name: 'แผนกอาบ', departmentCode: 'PSC-1100' },
    { code: 'PSC-1120', name: 'แผนกพิมพ์สี', departmentCode: 'PSC-1100' },
    { code: 'PSC-1140', name: 'แผนกก่อนพิมพ์', departmentCode: 'PSC-1100' },
    { code: 'PSC-1210', name: 'แผนกฝา BE', departmentCode: 'PSC-1200' },
    { code: 'PSC-1220', name: 'แผนกฝาหูดึง EOE', departmentCode: 'PSC-1200' },
    { code: 'PSC-1230', name: 'แผนกกระป๋อง 2 ชิ้น', departmentCode: 'PSC-1200' },
    { code: 'PSC-1240', name: 'แผนกสเปรย์', departmentCode: 'PSC-1200' },
    { code: 'PSC-1410', name: 'แผนกQC EOE&SP', departmentCode: 'PSC-1400' },
    { code: 'PSC-1420', name: 'แผนกQC DRD&BE', departmentCode: 'PSC-1400' },
    { code: 'PSC-1510', name: 'แผนกซ่อมบำรุงทั่วไป', departmentCode: 'PSC-1500' },
    { code: 'PSC-1520', name: 'แผนกไฟฟ้า/กล้อง PSC', departmentCode: 'PSC-1500' },
    { code: 'PSC-1540', name: 'แผนกซ่อมบำรุงเครื่องจักร', departmentCode: 'PSC-1500' },
    { code: 'PSC-1610', name: 'แผนกวิจัยและพัฒนา', departmentCode: 'PSC-1600' },
    { code: 'PSC-1620', name: 'แผนกรับประกันคุณภาพวัตถุดิบ', departmentCode: 'PSC-1600' },
    { code: 'PSC-1720', name: 'แผนกสอบเทียบ', departmentCode: 'PS-1700' },
    { code: 'PSC-1730', name: 'แผนกความปลอดภัย18001', departmentCode: 'PS-1700' },
    { code: 'PSC-3110', name: 'แผนกวางแผนการผลิต', departmentCode: 'PSC-1100' },
    { code: 'PSC-3220', name: 'แผนกประสานงานขาย', departmentCode: 'PSC-3200' },
    { code: 'PSC-3310', name: 'แผนกคลังพัสดุ', departmentCode: 'PSC-3200' },
    { code: 'PSC-3320', name: 'แผนกคลังสินค้า', departmentCode: 'PSC-3200' },
    { code: 'PSC-3410', name: 'แผนกจัดซื้อวัตถุดิบ', departmentCode: 'PSC-3200' },
    { code: 'PSC-3510', name: 'แผนกงานบุคคล', departmentCode: 'PSC-3500' },
    { code: 'PSC-3520', name: 'แผนกธุรการ', departmentCode: 'PSC-3500' },
    { code: 'PSC-3530', name: 'แผนกสรรหาและฝึกอบรม', departmentCode: 'PSC-3500' },
    { code: 'PSC-3610', name: 'แผนกบัญชีทั่วไป', departmentCode: 'PSC-3600' },
    { code: 'PSC-3620', name: 'แผนกบัญชีต้นทุน', departmentCode: 'PSC-3600' },
    { code: 'PSC-3710', name: 'แผนกการเงินทั่วไป', departmentCode: 'PSC-3600' },
    { code: 'PSC-3810', name: 'แผนกพัฒนาระบบ', departmentCode: 'PSC-3800' },
    // PS Sections
    { code: 'PS-1310', name: 'แผนกกระป๋อง3 ชิ้น', departmentCode: 'PS-1300' },
    { code: 'PS-1320', name: 'แผนกฝา NE', departmentCode: 'PS-1300' },
    { code: 'PS-1330', name: 'แผนกปิ๊บ', departmentCode: 'PS-1300' },
    { code: 'PS-1340', name: 'แผนกฝาปิ๊บ', departmentCode: 'PS-1300' },
    { code: 'PS-1430', name: 'แผนกQCฝาธรรมดา', departmentCode: 'PS-1400' },
    { code: 'PS-1440', name: 'แผนกQCกระป๋อง3ชิ้น', departmentCode: 'PS-1400' },
    { code: 'PS-1450', name: 'แผนกQC ปิ๊บ', departmentCode: 'PS-1400' },
    { code: 'PS-1510', name: 'แผนกซ่อมบำรุงทั่วไป', departmentCode: 'PS-1500' },
    { code: 'PS-1530', name: 'แผนกไฟฟ้า PS', departmentCode: 'PS-1500' },
    { code: 'PS-1540', name: 'แผนกซ่อมบำรุงเครื่องจักร', departmentCode: 'PS-1500' },
    { code: 'PS-1710', name: 'แผนกตรวจสอบระบบคุณภาพภายใน', departmentCode: 'PS-1700' },
    { code: 'PS-1730', name: 'แผนกความปลอดภัย18001', departmentCode: 'PS-1700' },
    { code: 'PS-3220', name: 'แผนกประสานการขาย', departmentCode: 'PS-3210' },
    { code: 'PS-3310', name: 'แผนกคลังพัสดุ', departmentCode: 'PS-3210' },
    { code: 'PS-3320', name: 'แผนกคลังสินค้า', departmentCode: 'PS-3210' },
    { code: 'PS-3410', name: 'แผนกจัดซื้อวัตถุดิบ', departmentCode: 'PS-3210' },
    { code: 'PS-3510', name: 'แผนกงานบุคคล', departmentCode: 'PS-3600' },
    { code: 'PS-3520', name: 'แผนกธุรการ', departmentCode: 'PS-3600' },
    { code: 'PS-3530', name: 'แผนกสรรหาและฝึกอบรม', departmentCode: 'PS-3600' },
    { code: 'PS-3610', name: 'แผนกบัญชีทั่วไป', departmentCode: 'PS-3600' },
    { code: 'PS-3620', name: 'แผนกบัญชีต้นทุน', departmentCode: 'PS-3600' },
    { code: 'PS-3710', name: 'แผนกการเงินทั่วไป', departmentCode: 'PS-3600' },
    { code: 'PS-3720', name: 'แผนกการเงินลูกหนี้', departmentCode: 'PS-3600' },
];
async function main() {
    console.log('Starting section seed...');
    // Fetch all departments to get their IDs
    const departments = await prisma.department.findMany({
        select: { id: true, code: true },
    });
    const departmentMap = new Map(departments.map(d => [d.code, d.id]));
    // Prepare section data with department IDs
    const sectionsWithDeptId = sections
        .map(section => {
        const departmentId = departmentMap.get(section.departmentCode);
        if (!departmentId) {
            console.warn(`Warning: Department not found for code ${section.departmentCode}, skipping section ${section.code}`);
            return null;
        }
        return {
            code: section.code,
            name: section.name,
            departmentId,
            isActive: true,
        };
    })
        .filter(Boolean);
    // Insert sections
    await prisma.section.createMany({
        data: sectionsWithDeptId,
        skipDuplicates: true,
    });
    console.log(`Inserted/ensured ${sectionsWithDeptId.length} sections.`);
}
main()
    .catch(error => {
    console.error('Failed to seed sections:', error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
/*
  To run:
  1. Execute: node scripts/seedSections.js
*/
