import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { pscDepartmentSeeds, pscEmployeeSeeds } from './data/pscEmployees';

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

  // Create departments for PSC - ตามโครงสร้างจริง
  const pscDepartments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'psc-200' },
      update: {},
      create: {
        code: 'psc-200',
        name: 'กรรมการผู้จัดการ',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-1000' },
      update: {},
      create: {
        code: 'psc-1000',
        name: 'ผู้จัดการโรงงาน',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-1100' },
      update: {},
      create: {
        code: 'psc-1100',
        name: 'ฝ่ายผลิต1',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-1130' },
      update: {},
      create: {
        code: 'psc-1130',
        name: 'ฝ่าย QC อาบพิมพ์',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-1200' },
      update: {},
      create: {
        code: 'psc-1200',
        name: 'ฝ่ายผลิต2',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-1400' },
      update: {},
      create: {
        code: 'psc-1400',
        name: 'ฝ่ายควบคุมคุณภาพ',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-1500' },
      update: {},
      create: {
        code: 'psc-1500',
        name: 'ฝ่ายวิศวกรรม',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-1600' },
      update: {},
      create: {
        code: 'psc-1600',
        name: 'ฝ่ายวิจัยพัฒนาและรับประกันคุณภาพวัตถุดิบ',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-1800' },
      update: {},
      create: {
        code: 'psc-1800',
        name: 'ฝ่ายบริการลูกค้า',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-3200' },
      update: {},
      create: {
        code: 'psc-3200',
        name: 'ฝ่ายขายและการตลาด',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-3500' },
      update: {},
      create: {
        code: 'psc-3500',
        name: 'ฝ่ายทรัพยากรบุคคล',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-3600' },
      update: {},
      create: {
        code: 'psc-3600',
        name: 'ฝ่ายบัญชี',
        company: 'PSC',
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: 'psc-3800' },
      update: {},
      create: {
        code: 'psc-3800',
        name: 'ฝ่ายเทคโนโลยีสารสนเทศ',
        company: 'PSC',
        isActive: true,
      },
    }),
  ]);
  console.log('PSC Departments created:', pscDepartments.length);

  const detailedDepartments = await Promise.all(
    pscDepartmentSeeds.map(({ code, name }) =>
      prisma.department.upsert({
        where: { code },
        update: {
          name,
          company: 'PSC',
          isActive: true,
        },
        create: {
          code,
          name,
          company: 'PSC',
          isActive: true,
        },
      })
    )
  );
  console.log('PSC detailed departments ensured:', detailedDepartments.length);

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

  // Create PSC employees based on actual organization structure
  const hashedPassword = await bcrypt.hash('123456', 10);

  // ========== กรรมการผู้จัดการ (200) ==========
  const president = await prisma.user.upsert({
    where: { employeeId: '200002' },
    update: {},
    create: {
      employeeId: '200002',
      email: 'wiboon@psc.com',
      password: hashedPassword,
      firstName: 'วิบูลย์',
      lastName: 'ตระกูลพูนทรัพย์',
      gender: 'male',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'ประธานกรรมการบริหาร',
      department: 'psc-200',
      role: 'admin',
      startDate: new Date('2531-01-01'),
    },
  });

  const vicePresident = await prisma.user.upsert({
    where: { employeeId: '200003' },
    update: {},
    create: {
      employeeId: '200003',
      email: 'rutiporn@psc.com',
      password: hashedPassword,
      firstName: 'ฐิติพร',
      lastName: 'ตระกูลพูนทรัพย์',
      gender: 'female',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'รองประธานกรรมการบริหาร',
      department: 'psc-200',
      role: 'admin',
      startDate: new Date('2535-09-01'),
    },
  });

  const director = await prisma.user.upsert({
    where: { employeeId: '200004' },
    update: {},
    create: {
      employeeId: '200004',
      email: 'salid@psc.com',
      password: hashedPassword,
      firstName: 'สลิล',
      lastName: 'ตระกูลพูนทรัพย์',
      gender: 'male',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'รองประธาน (ฝ่ายซัพพลายเชน)',
      department: 'psc-200',
      role: 'admin',
      startDate: new Date('2559-02-16'),
    },
  });

  const secretary = await prisma.user.upsert({
    where: { employeeId: '201205' },
    update: {},
    create: {
      employeeId: '201205',
      email: 'methida@psc.com',
      password: hashedPassword,
      firstName: 'เมธิดา',
      lastName: 'ตระกูลพูนทรัพย์',
      gender: 'female',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'เลขานุการ ผช.กก.ผจก',
      department: 'psc-200',
      role: 'employee',
      startDate: new Date('2564-05-01'),
    },
  });
  console.log('Board members created');

  // ========== ผู้จัดการโรงงาน (1000) ==========
  const factoryVP = await prisma.user.upsert({
    where: { employeeId: '200006' },
    update: {},
    create: {
      employeeId: '200006',
      email: 'odul@psc.com',
      password: hashedPassword,
      firstName: 'อดุลย์',
      lastName: 'จีนเอี้ย',
      gender: 'male',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'รองประธาน (ฝ่ายปฏิบัติการ)',
      department: 'psc-1000',
      role: 'dept_manager',
      startDate: new Date('2551-09-16'),
    },
  });

  const asstFactoryMgr = await prisma.user.upsert({
    where: { employeeId: '200007' },
    update: {},
    create: {
      employeeId: '200007',
      email: 'rerawat@psc.com',
      password: hashedPassword,
      firstName: 'เรวัฒน์',
      lastName: 'เจริญวิมลรักษ์',
      gender: 'male',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'ผู้ช่วยผู้จัดการโรงงาน',
      department: 'psc-1000',
      role: 'dept_manager',
      startDate: new Date('2545-11-01'),
    },
  });

  const factoryManager = await prisma.user.upsert({
    where: { employeeId: '200017' },
    update: {},
    create: {
      employeeId: '200017',
      email: 'thanapong@psc.com',
      password: hashedPassword,
      firstName: 'ธนพงศ์',
      lastName: 'นพประพันธ์',
      gender: 'male',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'Factory Manager',
      department: 'psc-1000',
      role: 'dept_manager',
      startDate: new Date('2559-03-16'),
    },
  });
  console.log('Factory managers created');

  // ========== ฝ่ายผลิต1 (1100) ==========
  const production1Head = await prisma.user.upsert({
    where: { employeeId: '200009' },
    update: {},
    create: {
      employeeId: '200009',
      email: 'samniang@psc.com',
      password: hashedPassword,
      firstName: 'สำเนียง',
      lastName: 'นิลวิลาศ',
      gender: 'male',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'ผู้จัดการอาวุโส',
      department: 'psc-1100',
      role: 'section_head',
      startDate: new Date('2532-04-24'),
    },
  });
  console.log('Production1 head created');

  // ========== ฝ่าย QC อาบพิมพ์ (1130) ==========
  const qcDivisionMgr = await prisma.user.upsert({
    where: { employeeId: '201189' },
    update: {},
    create: {
      employeeId: '201189',
      email: 'nakrit@psc.com',
      password: hashedPassword,
      firstName: 'นายกฤต',
      lastName: 'รุศศิรัณย์',
      gender: 'male',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'QC.Division Manager',
      department: 'psc-1130',
      role: 'section_head',
      startDate: new Date('2564-05-01'),
    },
  });
  console.log('QC Division manager created');

  // ========== ฝ่ายผลิต2 (1200) ==========
  const production2Advisor = await prisma.user.upsert({
    where: { employeeId: '200008' },
    update: {},
    create: {
      employeeId: '200008',
      email: 'nimit@psc.com',
      password: hashedPassword,
      firstName: 'นิมิตร',
      lastName: 'ประสูตร์แสงจันทร์',
      gender: 'male',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'ที่ปรึกษาอาวุโส(EOE/SPRAY)',
      department: 'psc-1200',
      role: 'dept_manager',
      startDate: new Date('2532-03-25'),
    },
  });

  const production2DivMgr = await prisma.user.upsert({
    where: { employeeId: '200016' },
    update: {},
    create: {
      employeeId: '200016',
      email: 'jaran@psc.com',
      password: hashedPassword,
      firstName: 'จรัล',
      lastName: 'ผ่องใส',
      gender: 'male',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'Division Manager',
      department: 'psc-1200',
      role: 'section_head',
      startDate: new Date('2550-07-02'),
    },
  });

  const production2DeptMgr = await prisma.user.upsert({
    where: { employeeId: '201104' },
    update: {},
    create: {
      employeeId: '201104',
      email: 'phumiphat@psc.com',
      password: hashedPassword,
      firstName: 'ภูมิพัฒน์',
      lastName: 'สิทธิกุลชัยโย',
      gender: 'male',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'Department Manager',
      department: 'psc-1200',
      role: 'section_head',
      startDate: new Date('2564-01-02'),
    },
  });
  console.log('Production2 managers created');

  // ========== ฝ่ายควบคุมคุณภาพ (1400) ==========
  const qaAsstDivMgr = await prisma.user.upsert({
    where: { employeeId: '200021' },
    update: {},
    create: {
      employeeId: '200021',
      email: 'napaporn@psc.com',
      password: hashedPassword,
      firstName: 'นภาภรณ์',
      lastName: 'บุปผา',
      gender: 'female',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'Asst.Division Manager',
      department: 'psc-1400',
      role: 'section_head',
      startDate: new Date('2564-06-01'),
    },
  });
  console.log('QA manager created');

  // ========== ฝ่ายวิศวกรรม (1500) ==========
  const engAsstDivMgr = await prisma.user.upsert({
    where: { employeeId: '200022' },
    update: {},
    create: {
      employeeId: '200022',
      email: 'borisak@psc.com',
      password: hashedPassword,
      firstName: 'บริศักดิ์',
      lastName: 'เกิดสุข',
      gender: 'male',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'Asst.Division Manager',
      department: 'psc-1500',
      role: 'section_head',
      startDate: new Date('2549-08-01'),
    },
  });
  console.log('Engineering manager created');

  // ========== ฝ่ายวิจัยพัฒนาฯ (1600) ==========
  const rdManager = await prisma.user.upsert({
    where: { employeeId: '200014' },
    update: {},
    create: {
      employeeId: '200014',
      email: 'natthawaran@psc.com',
      password: hashedPassword,
      firstName: 'ณัฐวรรณ์',
      lastName: 'ชูโชติ',
      gender: 'female',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'ผู้จัดการอาวุโส',
      department: 'psc-1600',
      role: 'section_head',
      startDate: new Date('2558-11-01'),
    },
  });
  console.log('R&D manager created');

  // ========== ฝ่ายบริการลูกค้า (1800) ==========
  const customerServiceMgr = await prisma.user.upsert({
    where: { employeeId: '200020' },
    update: {},
    create: {
      employeeId: '200020',
      email: 'nimit.service@psc.com',
      password: hashedPassword,
      firstName: 'นิมิตร',
      lastName: 'รัตนวิจัย',
      gender: 'male',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'ที่ปรึกษาอาวุโสด้านเทคนิค(Seamer)',
      department: 'psc-1800',
      role: 'section_head',
      startDate: new Date('2537-07-16'),
    },
  });
  console.log('Customer service manager created');

  // ========== ฝ่ายขายและการตลาด (3200) ==========
  const salesManager1 = await prisma.user.upsert({
    where: { employeeId: '200011' },
    update: {},
    create: {
      employeeId: '200011',
      email: 'pramit@psc.com',
      password: hashedPassword,
      firstName: 'ภราษิต',
      lastName: 'รัศมีเหลืองอ่อน',
      gender: 'male',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'ผู้จัดการอาวุโส',
      department: 'psc-3200',
      role: 'section_head',
      startDate: new Date('2535-10-01'),
    },
  });

  const salesManager2 = await prisma.user.upsert({
    where: { employeeId: '200012' },
    update: {},
    create: {
      employeeId: '200012',
      email: 'prasert@psc.com',
      password: hashedPassword,
      firstName: 'ประเสริฐ',
      lastName: 'วิศิษฐ์สุทธ์',
      gender: 'male',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'ผู้จัดการอาวุโส',
      department: 'psc-3200',
      role: 'section_head',
      startDate: new Date('2536-10-05'),
    },
  });

  const salesAsstDivMgr = await prisma.user.upsert({
    where: { employeeId: '200019' },
    update: {},
    create: {
      employeeId: '200019',
      email: 'chidta@psc.com',
      password: hashedPassword,
      firstName: 'จิดตา',
      lastName: 'ยุดี',
      gender: 'female',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'Asst.Division Manager',
      department: 'psc-3200',
      role: 'section_head',
      startDate: new Date('2536-04-01'),
    },
  });

  const salesSectionMgr = await prisma.user.upsert({
    where: { employeeId: '201898' },
    update: {},
    create: {
      employeeId: '201898',
      email: 'kesorn@psc.com',
      password: hashedPassword,
      firstName: 'เกษร',
      lastName: 'ทวีวาทสิงห์',
      gender: 'female',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'ผู้จัดการส่วน',
      department: 'psc-3200',
      role: 'section_head',
      startDate: new Date('2566-02-01'),
    },
  });
  console.log('Sales managers created');

  // ========== ฝ่ายทรัพยากรบุคคล (3500) - HR ==========
  const hrManager = await prisma.user.upsert({
    where: { employeeId: '200010' },
    update: {},
    create: {
      employeeId: '200010',
      email: 'somchai.hr@psc.com',
      password: hashedPassword,
      firstName: 'สมชัย',
      lastName: 'เมธาพฤทธิ์',
      gender: 'male',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'ผู้จัดการอาวุโส',
      department: 'psc-3500',
      role: 'hr_manager',
      startDate: new Date('2535-10-01'),
    },
  });
  console.log('HR Manager created:', hrManager.employeeId);

  // ========== ฝ่ายบัญชี (3600) ==========
  const accountingMgr = await prisma.user.upsert({
    where: { employeeId: '200662' },
    update: {},
    create: {
      employeeId: '200662',
      email: 'siriporn@psc.com',
      password: hashedPassword,
      firstName: 'ศิริพร',
      lastName: 'จิบุญทวีสุข',
      gender: 'female',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'Asst.Division Manager',
      department: 'psc-3600',
      role: 'section_head',
      startDate: new Date('2562-11-01'),
    },
  });
  console.log('Accounting manager created');

  // ========== ฝ่ายเทคโนโลยีสารสนเทศ (3800) ==========
  const itManager = await prisma.user.upsert({
    where: { employeeId: '200013' },
    update: {},
    create: {
      employeeId: '200013',
      email: 'orranut@psc.com',
      password: hashedPassword,
      firstName: 'อรรถกฤษณ์',
      lastName: 'ศรีทองกูร',
      gender: 'male',
      company: 'PSC',
      employeeType: 'monthly',
      position: 'IT.Division Manager',
      department: 'psc-3800',
      role: 'section_head',
      startDate: new Date('2543-01-01'),
    },
  });
  console.log('IT Manager created');

  // ========== พนักงานตามข้อมูลโครงสร้างองค์กร ==========
  let pscEmployeesSeeded = 0;
  for (const emp of pscEmployeeSeeds) {
    await prisma.user.upsert({
      where: { employeeId: emp.employeeId },
      update: {
        firstName: emp.firstName,
        lastName: emp.lastName,
        position: emp.position,
        department: emp.department,
        startDate: new Date(emp.startDate),
        gender: emp.gender,
        company: 'PSC',
        employeeType: 'monthly',
        isActive: true,
      },
      create: {
        employeeId: emp.employeeId,
        email: null,
        password: hashedPassword,
        firstName: emp.firstName,
        lastName: emp.lastName,
        gender: emp.gender,
        company: 'PSC',
        employeeType: 'monthly',
        position: emp.position,
        department: emp.department,
        role: 'employee',
        startDate: new Date(emp.startDate),
        isActive: true,
      },
    });
    pscEmployeesSeeded += 1;
  }
  console.log('PSC employees seeded:', pscEmployeesSeeded);

  // ========== ตัวอย่างพนักงานทั่วไป ==========
  const employee = await prisma.user.upsert({
    where: { employeeId: 'EMP001' },
    update: {},
    create: {
      employeeId: 'EMP001',
      email: 'employee@psc.com',
      password: hashedPassword,
      firstName: 'ทดสอบ',
      lastName: 'พนักงาน',
      gender: 'male',
      company: 'PSC',
      employeeType: 'daily',
      position: 'พนักงานผลิต',
      department: 'psc-1100',
      role: 'employee',
      startDate: new Date('2565-01-01'),
    },
  });
  console.log('Sample employee created');

  // Create sample approval flow for the employee
  // Flow: หัวหน้าแผนกผลิต1 -> ผจก.โรงงาน -> HR (อัตโนมัติ)
  await prisma.userApprovalFlow.deleteMany({ where: { userId: employee.id } });
  
  const approvalFlows = await Promise.all([
    prisma.userApprovalFlow.create({
      data: {
        userId: employee.id,
        level: 1,
        approverId: production1Head.id,
        isRequired: true,
      },
    }),
    prisma.userApprovalFlow.create({
      data: {
        userId: employee.id,
        level: 2,
        approverId: factoryManager.id,
        isRequired: true,
      },
    }),
    // HR Manager is always the final approver (level 99)
    prisma.userApprovalFlow.create({
      data: {
        userId: employee.id,
        level: 99,
        approverId: hrManager.id,
        isRequired: true,
      },
    }),
  ]);
  console.log('Approval flows created for employee:', approvalFlows.length);

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
