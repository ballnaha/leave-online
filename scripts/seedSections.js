"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Section data with department code mappings
const sections = [
  { "code": "21110", "name": "แผนกอาบ", "departmentCode": "21100" },
  { "code": "21120", "name": "แผนกพิมพ์สี", "departmentCode": "21100" },
  { "code": "21130", "name": "แผนก QC อาบพิมพ์", "departmentCode": "21100" },
  { "code": "21140", "name": "แผนกก่อนพิมพ์", "departmentCode": "21100" },
  { "code": "21210", "name": "แผนกฝา BE", "departmentCode": "21200" },
  { "code": "21220", "name": "แผนกฝาหูดึง EOE", "departmentCode": "21200" },
  { "code": "21230", "name": "แผนกกระป๋อง 2 ชิ้น", "departmentCode": "21200" },
  { "code": "21240", "name": "แผนกสเปรย์", "departmentCode": "21200" },
  { "code": "21410", "name": "แผนก QC EOE & SP", "departmentCode": "21400" },
  { "code": "21420", "name": "แผนก QC DRD & BE", "departmentCode": "21400" },
  { "code": "21510", "name": "แผนกซ่อมบำรุงทั่วไป", "departmentCode": "21500" },
  { "code": "21520", "name": "แผนกไฟฟ้า/กล้อง PSC", "departmentCode": "21500" },
  { "code": "21540", "name": "แผนกซ่อมบำรุงเครื่องจักร", "departmentCode": "21500" },
  { "code": "21610", "name": "แผนกวิจัยและพัฒนา", "departmentCode": "21600" },
  { "code": "21620", "name": "แผนกรับประกันคุณภาพวัตถุดิบ", "departmentCode": "21600" },
  { "code": "21720", "name": "แผนกสอบเทียบ", "departmentCode": "21700" },
  { "code": "21730", "name": "แผนกความปลอดภัย18001", "departmentCode": "21700" },
  { "code": "23110", "name": "แผนกวางแผนการผลิต", "departmentCode": "23100" },
  { "code": "23220", "name": "แผนกประสานงานขาย", "departmentCode": "23200" },
  { "code": "23320", "name": "แผนกคลังสินค้า", "departmentCode": "23300" },
  { "code": "23410", "name": "แผนกจัดซื้อวัตถุดิบ", "departmentCode": "23400" },
  { "code": "23510", "name": "แผนกงานบุคคล", "departmentCode": "23500" },
  { "code": "23520", "name": "แผนกธุรการ", "departmentCode": "23500" },
  { "code": "23530", "name": "แผนกสรรหาและฝึกอบรม", "departmentCode": "23500" },
  { "code": "23610", "name": "แผนกบัญชีทั่วไป", "departmentCode": "23600" },
  { "code": "23620", "name": "แผนกบัญชีต้นทุน", "departmentCode": "23600" },
  { "code": "23710", "name": "แผนกการเงินทั่วไป", "departmentCode": "23700" },
  { "code": "23810", "name": "แผนกพัฒนาระบบ", "departmentCode": "23800" },
  { "code": "31310", "name": "แผนกกระป๋อง 3 ชิ้น", "departmentCode": "31300" },
  { "code": "31320", "name": "แผนกฝา NE", "departmentCode": "31300" },
  { "code": "31330", "name": "แผนกปี๊บ", "departmentCode": "31300" },
  { "code": "31340", "name": "แผนกฝาปี๊บ", "departmentCode": "31300" },
  { "code": "31430", "name": "แผนก QC ฝาธรรมดา", "departmentCode": "31400" },
  { "code": "31440", "name": "แผนก QC กระป๋อง 3 ชิ้น", "departmentCode": "31400" },
  { "code": "31450", "name": "แผนก QC ปี๊บ", "departmentCode": "31400" },
  { "code": "31510", "name": "แผนกซ่อมบำรุงทั่วไป", "departmentCode": "31500" },
  { "code": "31530", "name": "แผนกไฟฟ้า PS", "departmentCode": "31500" },
  { "code": "31540", "name": "แผนกซ่อมบำรุงเครื่องจักร", "departmentCode": "31500" },
  { "code": "31710", "name": "แผนกตรวจสอบระบบคุณภาพภายใน", "departmentCode": "31700" },
  { "code": "31730", "name": "แผนกความปลอดภัย18001", "departmentCode": "31700" },
  { "code": "33220", "name": "แผนกประสานงานขาย", "departmentCode": "33200" },
  { "code": "33310", "name": "แผนกคลังพัสดุ", "departmentCode": "33300" },
  { "code": "33320", "name": "แผนกคลังสินค้า", "departmentCode": "33300" },
  { "code": "33410", "name": "แผนกจัดซื้อวัตถุดิบ", "departmentCode": "33400" },
  { "code": "33510", "name": "แผนกงานบุคคล", "departmentCode": "33500" },
  { "code": "33520", "name": "แผนกธุรการ", "departmentCode": "33500" },
  { "code": "33530", "name": "แผนกสรรหาและฝึกอบรม", "departmentCode": "33500" },
  { "code": "33610", "name": "แผนกบัญชีทั่วไป", "departmentCode": "33600" },
  { "code": "33620", "name": "แผนกบัญชีต้นทุน", "departmentCode": "33600" },
  { "code": "33710", "name": "แผนกการเงินทั่วไป", "departmentCode": "33700" },
  { "code": "33720", "name": "แผนกการเงินลูกหนี้", "departmentCode": "33700" },
  { "code": "33810", "name": "แผนกพัฒนาระบบ", "departmentCode": "33800" }
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
