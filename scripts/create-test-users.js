const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('\n🚀 สร้าง Test Users สำหรับทดสอบ Workflow...\n');

  const password = await bcrypt.hash('Test@1234', 10);
  const startDate = new Date('2024-01-01');

  // Test Users Data
  const testUsers = [
    // กะ A
    {
      employeeId: 'TEST001',
      email: 'test001@test.com',
      firstName: 'ทดสอบ',
      lastName: 'พนักงานกะเอ',
      position: 'พนักงานฝ่ายผลิต',
      role: 'employee',
      department: '21100',
      section: '21110',
      shift: 'A',
    },
    {
      employeeId: 'TEST002',
      email: 'test002@test.com',
      firstName: 'ทดสอบ',
      lastName: 'หัวหน้ากะเอ',
      position: 'หัวหน้ากะ A',
      role: 'shift_supervisor',
      department: '21100',
      section: '21110',
      shift: 'A',
    },
    // กะ B
    {
      employeeId: 'TEST003',
      email: 'test003@test.com',
      firstName: 'ทดสอบ',
      lastName: 'พนักงานกะบี',
      position: 'พนักงานฝ่ายผลิต',
      role: 'employee',
      department: '21100',
      section: '21110',
      shift: 'B',
    },
    {
      employeeId: 'TEST004',
      email: 'test004@test.com',
      firstName: 'ทดสอบ',
      lastName: 'หัวหน้ากะบี',
      position: 'หัวหน้ากะ B',
      role: 'shift_supervisor',
      department: '21100',
      section: '21110',
      shift: 'B',
    },
    // หัวหน้าแผนก / ฝ่าย
    {
      employeeId: 'TEST005',
      email: 'test005@test.com',
      firstName: 'ทดสอบ',
      lastName: 'หัวหน้าแผนก',
      position: 'หัวหน้าแผนกอาบ',
      role: 'section_head',
      department: '21100',
      section: '21110',
      shift: null,
      managedSections: JSON.stringify(['21110']),
    },
    {
      employeeId: 'TEST006',
      email: 'test006@test.com',
      firstName: 'ทดสอบ',
      lastName: 'หัวหน้าฝ่าย',
      position: 'หัวหน้าฝ่ายผลิต1',
      role: 'dept_manager',
      department: '21100',
      section: null,
      shift: null,
      managedDepartments: JSON.stringify(['21100']),
    },
    // ผจก.บุคคล
    {
      employeeId: 'TEST007',
      email: 'test007@test.com',
      firstName: 'ทดสอบ',
      lastName: 'ผจก.บุคคล',
      position: 'ผู้จัดการฝ่ายบุคคล',
      role: 'hr_manager',
      department: '23500',
      section: '23510',
      shift: null,
    },
  ];

  // Create users
  for (const userData of testUsers) {
    try {
      const user = await prisma.user.upsert({
        where: { employeeId: userData.employeeId },
        update: {
          ...userData,
          password,
          gender: 'male',
          company: 'PSC',
          employeeType: 'monthly',
          startDate,
          isActive: true,
        },
        create: {
          ...userData,
          password,
          gender: 'male',
          company: 'PSC',
          employeeType: 'monthly',
          startDate,
          isActive: true,
        },
      });
      console.log(`✅ สร้าง/อัพเดท: ${user.employeeId} - ${user.firstName} ${user.lastName} (${user.role})`);
    } catch (error) {
      console.error(`❌ Error creating ${userData.employeeId}:`, error.message);
    }
  }

  // Get created users
  const createdUsers = await prisma.user.findMany({
    where: {
      employeeId: { startsWith: 'TEST' },
    },
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      role: true,
    },
    orderBy: { employeeId: 'asc' },
  });

  console.log('\n📋 Users ที่สร้างแล้ว:');
  console.table(createdUsers.map(u => ({
    ID: u.id,
    EmployeeId: u.employeeId,
    Name: `${u.firstName} ${u.lastName}`,
    Role: u.role,
  })));

  // Create UserApprovalFlow
  console.log('\n🔗 สร้าง Approval Flow...');

  const userMap = {};
  createdUsers.forEach(u => {
    userMap[u.employeeId] = u.id;
  });

  // Approval Flow สำหรับ TEST001 (พนักงานกะ A)
  // Level 1: หัวหน้ากะ A (TEST002)
  // Level 2: หัวหน้าแผนก (TEST005)
  // Level 3: หัวหน้าฝ่าย (TEST006)
  // Level 4: ผจก.บุคคล (TEST007)
  const approvalFlows = [
    // TEST001 - พนักงานกะ A
    { userId: userMap['TEST001'], approverId: userMap['TEST002'], level: 1 },
    { userId: userMap['TEST001'], approverId: userMap['TEST005'], level: 2 },
    { userId: userMap['TEST001'], approverId: userMap['TEST006'], level: 3 },
    { userId: userMap['TEST001'], approverId: userMap['TEST007'], level: 4 },
    
    // TEST002 - หัวหน้ากะ A (อนุมัติโดย หัวหน้าแผนก, หัวหน้าฝ่าย, ผจก.บุคคล)
    { userId: userMap['TEST002'], approverId: userMap['TEST005'], level: 1 },
    { userId: userMap['TEST002'], approverId: userMap['TEST006'], level: 2 },
    { userId: userMap['TEST002'], approverId: userMap['TEST007'], level: 3 },
    
    // TEST003 - พนักงานกะ B
    { userId: userMap['TEST003'], approverId: userMap['TEST004'], level: 1 },
    { userId: userMap['TEST003'], approverId: userMap['TEST005'], level: 2 },
    { userId: userMap['TEST003'], approverId: userMap['TEST006'], level: 3 },
    { userId: userMap['TEST003'], approverId: userMap['TEST007'], level: 4 },
    
    // TEST004 - หัวหน้ากะ B (อนุมัติโดย หัวหน้าแผนก, หัวหน้าฝ่าย, ผจก.บุคคล)
    { userId: userMap['TEST004'], approverId: userMap['TEST005'], level: 1 },
    { userId: userMap['TEST004'], approverId: userMap['TEST006'], level: 2 },
    { userId: userMap['TEST004'], approverId: userMap['TEST007'], level: 3 },
    
    // TEST005 - หัวหน้าแผนก (อนุมัติโดย หัวหน้าฝ่าย, ผจก.บุคคล)
    { userId: userMap['TEST005'], approverId: userMap['TEST006'], level: 1 },
    { userId: userMap['TEST005'], approverId: userMap['TEST007'], level: 2 },
    
    // TEST006 - หัวหน้าฝ่าย (อนุมัติโดย ผจก.บุคคล)
    { userId: userMap['TEST006'], approverId: userMap['TEST007'], level: 1 },
  ];

  // ลบ flow เก่าของ test users ก่อน
  await prisma.userApprovalFlow.deleteMany({
    where: {
      userId: { in: Object.values(userMap) },
    },
  });

  // สร้าง flow ใหม่
  for (const flow of approvalFlows) {
    if (flow.userId && flow.approverId) {
      await prisma.userApprovalFlow.create({
        data: flow,
      });
    }
  }

  console.log(`✅ สร้าง Approval Flow ${approvalFlows.length} รายการ\n`);

  // แสดง Flow ที่สร้าง
  console.log('📊 Approval Flow ที่สร้าง:');
  console.log('');
  console.log('TEST001 (พนักงานกะ A):');
  console.log('  └─ Level 1: TEST002 (หัวหน้ากะ A)');
  console.log('  └─ Level 2: TEST005 (หัวหน้าแผนก)');
  console.log('  └─ Level 3: TEST006 (หัวหน้าฝ่าย)');
  console.log('  └─ Level 4: TEST007 (ผจก.บุคคล)');
  console.log('');
  console.log('TEST003 (พนักงานกะ B):');
  console.log('  └─ Level 1: TEST004 (หัวหน้ากะ B)');
  console.log('  └─ Level 2: TEST005 (หัวหน้าแผนก)');
  console.log('  └─ Level 3: TEST006 (หัวหน้าฝ่าย)');
  console.log('  └─ Level 4: TEST007 (ผจก.บุคคล)');
  console.log('');
  console.log('🔐 Password: Test@1234');
  console.log('');

  await prisma.$disconnect();
}

main().catch(console.error);
