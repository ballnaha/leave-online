import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create companies
  const companies = await Promise.all([
    prisma.company.upsert({
      where: { code: 'PSC' },
      update: {},
      create: {
        code: 'PSC',
        name: 'บริษัท พูนทรัพย์แคน จำกัด',
        isActive: true,
      },
    }),
    prisma.company.upsert({
      where: { code: 'PS' },
      update: {},
      create: {
        code: 'PS',
        name: 'บริษัท พูนทรัพย์โลหะการพิมพ์ จำกัด',
        isActive: true,
      },
    }),
  ]);
  console.log('Companies created:', companies.length);

  // Create departments for PSC
  const pscDepartments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'psc-production' },
      update: {},
      create: {
        code: 'psc-production',
        name: 'ฝ่ายผลิต',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-qa' },
      update: {},
      create: {
        code: 'psc-qa',
        name: 'ฝ่ายควบคุมคุณภาพ',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-hr' },
      update: {},
      create: {
        code: 'psc-hr',
        name: 'ฝ่ายบุคคล',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-accounting' },
      update: {},
      create: {
        code: 'psc-accounting',
        name: 'ฝ่ายบัญชี',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-warehouse' },
      update: {},
      create: {
        code: 'psc-warehouse',
        name: 'ฝ่ายคลังสินค้า',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-maintenance' },
      update: {},
      create: {
        code: 'psc-maintenance',
        name: 'ฝ่ายซ่อมบำรุง',
        company: 'PSC',
        isActive: true,
      },
    }),
  ]);
  console.log('PSC Departments created:', pscDepartments.length);

  // Create departments for PSLP
  const pslpDepartments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'pslp-production' },
      update: {},
      create: {
        code: 'pslp-production',
        name: 'ฝ่ายผลิต',
        company: 'PS',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'pslp-printing' },
      update: {},
      create: {
        code: 'pslp-printing',
        name: 'ฝ่ายพิมพ์',
        company: 'PS',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'pslp-qa' },
      update: {},
      create: {
        code: 'pslp-qa',
        name: 'ฝ่ายควบคุมคุณภาพ',
        company: 'PS',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'pslp-hr' },
      update: {},
      create: {
        code: 'pslp-hr',
        name: 'ฝ่ายบุคคล',
        company: 'PS',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'pslp-sales' },
      update: {},
      create: {
        code: 'pslp-sales',
        name: 'ฝ่ายขาย',
        company: 'PS',
        isActive: true,
      },
    }),
  ]);
  console.log('PSLP Departments created:', pslpDepartments.length);

  // Create sections for PSC Production
  const pscProductionDept = pscDepartments.find(d => d.code === 'psc-production');
  if (pscProductionDept) {
    const sections = await Promise.all([
      prisma.section.upsert({
        where: { code: 'psc-prod-line1' },
        update: {},
        create: {
          code: 'psc-prod-line1',
          name: 'แผนกสายการผลิต 1',
          departmentId: pscProductionDept.id,
          isActive: true,
        },
      }),
      prisma.section.upsert({
        where: { code: 'psc-prod-line2' },
        update: {},
        create: {
          code: 'psc-prod-line2',
          name: 'แผนกสายการผลิต 2',
          departmentId: pscProductionDept.id,
          isActive: true,
        },
      }),
      prisma.section.upsert({
        where: { code: 'psc-prod-packing' },
        update: {},
        create: {
          code: 'psc-prod-packing',
          name: 'แผนกบรรจุภัณฑ์',
          departmentId: pscProductionDept.id,
          isActive: true,
        },
      }),
    ]);
    console.log('PSC Production Sections created:', sections.length);
  }

  // Create sections for PSC QA
  const pscQaDept = pscDepartments.find(d => d.code === 'psc-qa');
  if (pscQaDept) {
    const sections = await Promise.all([
      prisma.section.upsert({
        where: { code: 'psc-qa-incoming' },
        update: {},
        create: {
          code: 'psc-qa-incoming',
          name: 'แผนกตรวจรับวัตถุดิบ',
          departmentId: pscQaDept.id,
          isActive: true,
        },
      }),
      prisma.section.upsert({
        where: { code: 'psc-qa-process' },
        update: {},
        create: {
          code: 'psc-qa-process',
          name: 'แผนกตรวจสอบกระบวนการ',
          departmentId: pscQaDept.id,
          isActive: true,
        },
      }),
      prisma.section.upsert({
        where: { code: 'psc-qa-final' },
        update: {},
        create: {
          code: 'psc-qa-final',
          name: 'แผนกตรวจสอบขั้นสุดท้าย',
          departmentId: pscQaDept.id,
          isActive: true,
        },
      }),
    ]);
    console.log('PSC QA Sections created:', sections.length);
  }

  // Create sections for PSLP Production
  const pslpProductionDept = pslpDepartments.find(d => d.code === 'pslp-production');
  if (pslpProductionDept) {
    const sections = await Promise.all([
      prisma.section.upsert({
        where: { code: 'pslp-prod-cutting' },
        update: {},
        create: {
          code: 'pslp-prod-cutting',
          name: 'แผนกตัด',
          departmentId: pslpProductionDept.id,
          isActive: true,
        },
      }),
      prisma.section.upsert({
        where: { code: 'pslp-prod-forming' },
        update: {},
        create: {
          code: 'pslp-prod-forming',
          name: 'แผนกขึ้นรูป',
          departmentId: pslpProductionDept.id,
          isActive: true,
        },
      }),
      prisma.section.upsert({
        where: { code: 'pslp-prod-assembly' },
        update: {},
        create: {
          code: 'pslp-prod-assembly',
          name: 'แผนกประกอบ',
          departmentId: pslpProductionDept.id,
          isActive: true,
        },
      }),
    ]);
    console.log('PSLP Production Sections created:', sections.length);
  }

  // Create sections for PSLP Printing
  const pslpPrintingDept = pslpDepartments.find(d => d.code === 'pslp-printing');
  if (pslpPrintingDept) {
    const sections = await Promise.all([
      prisma.section.upsert({
        where: { code: 'pslp-print-offset' },
        update: {},
        create: {
          code: 'pslp-print-offset',
          name: 'แผนกพิมพ์ออฟเซ็ท',
          departmentId: pslpPrintingDept.id,
          isActive: true,
        },
      }),
      prisma.section.upsert({
        where: { code: 'pslp-print-screen' },
        update: {},
        create: {
          code: 'pslp-print-screen',
          name: 'แผนกพิมพ์สกรีน',
          departmentId: pslpPrintingDept.id,
          isActive: true,
        },
      }),
    ]);
    console.log('PSLP Printing Sections created:', sections.length);
  }

  // Create leave types
  const leaveTypes = await Promise.all([
    prisma.leaveType.upsert({
      where: { code: 'sick' },
      update: {},
      create: {
        code: 'sick',
        name: 'ลาป่วย',
        description: 'ลาป่วยตามสิทธิ์ประจำปี',
        maxDaysPerYear: 30,
        isPaid: true,
        isActive: true,
      },
    }),
    prisma.leaveType.upsert({
      where: { code: 'personal' },
      update: {},
      create: {
        code: 'personal',
        name: 'ลากิจ',
        description: 'ลากิจส่วนตัว',
        maxDaysPerYear: 6,
        isPaid: true,
        isActive: true,
      },
    }),
    prisma.leaveType.upsert({
      where: { code: 'vacation' },
      update: {},
      create: {
        code: 'vacation',
        name: 'ลาพักร้อน',
        description: 'ลาพักร้อนประจำปี',
        maxDaysPerYear: 6,
        isPaid: true,
        isActive: true,
      },
    }),
    prisma.leaveType.upsert({
      where: { code: 'maternity' },
      update: {},
      create: {
        code: 'maternity',
        name: 'ลาคลอด',
        description: 'ลาคลอดบุตร',
        maxDaysPerYear: 98,
        isPaid: true,
        isActive: true,
      },
    }),
    prisma.leaveType.upsert({
      where: { code: 'ordination' },
      update: {},
      create: {
        code: 'ordination',
        name: 'ลาบวช',
        description: 'ลาบวช',
        maxDaysPerYear: 15,
        isPaid: true,
        isActive: true,
      },
    }),
    prisma.leaveType.upsert({
      where: { code: 'military' },
      update: {},
      create: {
        code: 'military',
        name: 'ลาเกณฑ์ทหาร',
        description: 'ลาเพื่อรับการเกณฑ์ทหาร',
        maxDaysPerYear: 60,
        isPaid: true,
        isActive: true,
      },
    }),
    prisma.leaveType.upsert({
      where: { code: 'unpaid' },
      update: {},
      create: {
        code: 'unpaid',
        name: 'ลาไม่รับค่าจ้าง',
        description: 'ลาโดยไม่ได้รับค่าจ้าง',
        maxDaysPerYear: null,
        isPaid: false,
        isActive: true,
      },
    }),
    prisma.leaveType.upsert({
      where: { code: 'marriage' },
      update: {},
      create: {
        code: 'marriage',
        name: 'ลาแต่งงาน',
        description: 'ลาเพื่อจดทะเบียนสมรส',
        maxDaysPerYear: 3,
        isPaid: true,
        isActive: true,
      },
    }),
    prisma.leaveType.upsert({
      where: { code: 'funeral' },
      update: {},
      create: {
        code: 'funeral',
        name: 'ลาเพื่อทำงานศพ',
        description: 'ลาเพื่อร่วมงานศพ',
        maxDaysPerYear: 3,
        isPaid: true,
        isActive: true,
      },
    }),
    prisma.leaveType.upsert({
      where: { code: 'paternity' },
      update: {},
      create: {
        code: 'paternity',
        name: 'ลาคลอดบุตรสำหรับบิดา',
        description: 'ลาดูแลภริยาที่คลอดบุตร',
        maxDaysPerYear: 3,
        isPaid: true,
        isActive: true,
      },
    }),
    prisma.leaveType.upsert({
      where: { code: 'sterilization' },
      update: {},
      create: {
        code: 'sterilization',
        name: 'ลาทำหมัน',
        description: 'ลาเพื่อเข้ารับการทำหมัน',
        maxDaysPerYear: 2,
        isPaid: true,
        isActive: true,
      },
    }),
    prisma.leaveType.upsert({
      where: { code: 'business' },
      update: {},
      create: {
        code: 'business',
        name: 'ลาไปธุระ',
        description: 'ลาเพื่อไปติดต่อธุระราชการ',
        maxDaysPerYear: null,
        isPaid: true,
        isActive: true,
      },
    }),
  ]);
  console.log('Leave Types created:', leaveTypes.length);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
