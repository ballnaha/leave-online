import { prisma } from './prisma';

// Leave type to code mapping
export const leaveTypeCodeMap: Record<string, string> = {
  sick: 'SK',
  personal: 'PS',
  vacation: 'VC',
  annual: 'AN',
  maternity: 'MT',
  ordination: 'OR',
  work_outside: 'WO',
  military: 'ML',
  marriage: 'MR',
  funeral: 'FN',
  paternity: 'PT',
  sterilization: 'ST',
  business: 'BS',
  unpaid: 'UP',
  other: 'OT',
  sick_no_pay: 'SN',
  personal_no_pay: 'PN',
  paternity_care: 'PC',
};

// Generate leave code: SK2511001 (type + year + month + running)
export async function generateLeaveCode(leaveType: string, date: Date): Promise<string> {
  const typeCode = leaveTypeCodeMap[leaveType] || 'OT';
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = `${typeCode}${year}${month}`;

  const lastLeave = await prisma.leaveRequest.findFirst({
    where: {
      leaveCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      leaveCode: 'desc',
    },
    select: {
      leaveCode: true,
    },
  });

  let runningNumber = 1;
  if (lastLeave?.leaveCode) {
    const lastNumber = parseInt(lastLeave.leaveCode.slice(-3), 10);
    if (!isNaN(lastNumber)) {
      runningNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(runningNumber).padStart(3, '0')}`;
}
