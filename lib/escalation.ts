/**
 * Escalation Service
 * ตรวจสอบใบลาที่เกิน 2 วัน และส่งต่อไป HR Manager โดยอัตโนมัติ
 */

import { prisma } from './prisma';
import { 
  notifyApprovalPending, 
  notifyEscalated, 
  notifyApprovalReminder 
} from './onesignal';

const ESCALATION_HOURS = 48; // 2 วัน = 48 ชั่วโมง
const REMINDER_HOURS = 24; // เตือนหลัง 24 ชั่วโมง

/**
 * ตรวจสอบและ escalate ใบลาที่เกินเวลา
 */
export async function checkAndEscalate(): Promise<{
  escalated: number;
  reminded: number;
  errors: string[];
}> {
  const result = {
    escalated: 0,
    reminded: 0,
    errors: [] as string[],
  };

  try {
    const now = new Date();

    // หาใบลาที่เกิน 2 วัน และยังไม่ถูก escalate
    const overdueLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: { in: ['pending', 'in_progress'] },
        isEscalated: false,
        escalationDeadline: { lte: now },
      },
      include: {
        user: true,
        approvals: {
          where: { status: 'pending' },
          orderBy: { level: 'asc' },
          take: 1,
        },
      },
    });

    // หา HR Manager สำหรับ escalation
    const hrManagers = await prisma.user.findMany({
      where: { role: 'hr_manager', isActive: true },
    });

    if (hrManagers.length === 0) {
      result.errors.push('No HR Manager found for escalation');
    }

    for (const leave of overdueLeaves) {
      try {
        // ข้าม pending approval ที่มีอยู่ไป (mark as skipped)
        await prisma.leaveApproval.updateMany({
          where: {
            leaveRequestId: leave.id,
            status: 'pending',
          },
          data: {
            status: 'skipped',
            actionAt: now,
          },
        });

        // หา HR Manager ของบริษัทเดียวกัน หรือใช้คนแรกที่เจอ
        const hrManager = hrManagers.find(hr => hr.company === leave.user.company) || hrManagers[0];

        if (hrManager) {
          // สร้าง approval step ใหม่สำหรับ HR
          await prisma.leaveApproval.create({
            data: {
              leaveRequestId: leave.id,
              level: 99, // Special level for escalated
              approverId: hrManager.id,
              status: 'pending',
              notifiedAt: now,
            },
          });

          // อัพเดตสถานะใบลา
          await prisma.leaveRequest.update({
            where: { id: leave.id },
            data: {
              isEscalated: true,
              currentLevel: 99,
            },
          });

          // แจ้ง HR Manager
          await notifyApprovalPending(
            hrManager.id,
            leave.id,
            `${leave.user.firstName} ${leave.user.lastName}`,
            leave.leaveType
          );

          // แจ้งพนักงานว่าใบลาถูก escalate
          await notifyEscalated(leave.userId, leave.id, leave.leaveType);

          result.escalated++;
        }
      } catch (error) {
        result.errors.push(`Failed to escalate leave ${leave.id}: ${error}`);
      }
    }

    // ส่งเตือนใบลาที่ใกล้หมดเวลา (เหลือ 24 ชั่วโมง)
    const reminderThreshold = new Date(now.getTime() + REMINDER_HOURS * 60 * 60 * 1000);
    
    const leavesNeedingReminder = await prisma.leaveRequest.findMany({
      where: {
        status: { in: ['pending', 'in_progress'] },
        isEscalated: false,
        escalationDeadline: {
          gt: now,
          lte: reminderThreshold,
        },
      },
      include: {
        user: true,
        approvals: {
          where: { 
            status: 'pending',
            reminderCount: { lt: 2 }, // ส่งเตือนไม่เกิน 2 ครั้ง
          },
          orderBy: { level: 'asc' },
        },
      },
    });

    for (const leave of leavesNeedingReminder) {
      for (const approval of leave.approvals) {
        try {
          // คำนวณเวลาที่เหลือ
          const hoursLeft = Math.round(
            (leave.escalationDeadline!.getTime() - now.getTime()) / (1000 * 60 * 60)
          );

          await notifyApprovalReminder(
            approval.approverId,
            leave.id,
            `${leave.user.firstName} ${leave.user.lastName}`,
            leave.leaveType,
            hoursLeft
          );

          // อัพเดต reminder count
          await prisma.leaveApproval.update({
            where: { id: approval.id },
            data: { 
              reminderCount: approval.reminderCount + 1,
              notifiedAt: now,
            },
          });

          result.reminded++;
        } catch (error) {
          result.errors.push(`Failed to send reminder for leave ${leave.id}: ${error}`);
        }
      }
    }
  } catch (error) {
    result.errors.push(`Escalation check failed: ${error}`);
  }

  return result;
}

/**
 * สร้าง approval steps สำหรับใบลาใหม่
 */
export async function createApprovalSteps(
  leaveRequestId: number,
  userId: number
): Promise<void> {
  // 1. ดึง approval flow ของ user (Specific User Override)
  const approvalFlows = await prisma.userApprovalFlow.findMany({
    where: { userId, isActive: true },
    orderBy: { level: 'asc' },
    include: { approver: true },
  });

  const now = new Date();

  if (approvalFlows.length > 0) {
    // สร้าง approval steps ตาม flow ที่กำหนด
    for (const flow of approvalFlows) {
      await prisma.leaveApproval.create({
        data: {
          leaveRequestId,
          level: flow.level,
          approverId: flow.approverId,
          status: 'pending',
          notifiedAt: flow.level === approvalFlows[0].level ? now : null, // แจ้งเตือนเฉพาะ level แรก
        },
      });
    }

    // แจ้งเตือนผู้อนุมัติคนแรก
    const firstApprover = approvalFlows[0];
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: { user: true },
    });

    if (leaveRequest) {
      await notifyApprovalPending(
        firstApprover.approverId,
        leaveRequestId,
        `${leaveRequest.user.firstName} ${leaveRequest.user.lastName}`,
        leaveRequest.leaveType
      );
    }
    return;
  }

  // 2. ถ้าไม่มี User Flow ให้หาจาก ApprovalWorkflow (Section -> Department -> Company)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    let workflow = null;

    // Check Section
    if (user.section) {
      workflow = await (prisma as any).approvalWorkflow.findFirst({
        where: { section: user.section, isActive: true },
        include: { steps: { orderBy: { level: 'asc' } } }
      });
    }

    // Check Department
    if (!workflow && user.department) {
      workflow = await (prisma as any).approvalWorkflow.findFirst({
        where: { department: user.department, isActive: true },
        include: { steps: { orderBy: { level: 'asc' } } }
      });
    }

    // Check Company
    if (!workflow && user.company) {
      workflow = await (prisma as any).approvalWorkflow.findFirst({
        where: { company: user.company, isActive: true },
        include: { steps: { orderBy: { level: 'asc' } } }
      });
    }

    if (workflow && workflow.steps.length > 0) {
      let firstApproverId: number | null = null;

      for (const step of workflow.steps) {
        let approverId = step.approverId;

        if (!approverId && step.approverRole) {
          // Resolve Role dynamically
          const role = step.approverRole;
          
          if (role === 'hr_manager') {
            // Special handling for HR Manager: Try same company first, then fallback to any HR (Shared Service)
            const hrInCompany = await prisma.user.findFirst({
              where: { role, isActive: true, company: user.company }
            });
            
            if (hrInCompany) {
              approverId = hrInCompany.id;
            } else {
              const anyHr = await prisma.user.findFirst({
                where: { role, isActive: true }
              });
              if (anyHr) approverId = anyHr.id;
            }
          } else {
            // ค้นหาผู้อนุมัติตาม role โดยเช็คทั้ง:
            // 1. ฝ่าย/แผนกตัวเอง
            // 2. ฝ่าย/แผนกที่ดูแลเพิ่มเติม (managedDepartments/managedSections)
            
            let approver = null;

            // หา approver ที่อยู่ฝ่าย/แผนกเดียวกัน (primary lookup)
            if (role === 'section_head' && user.section) {
              approver = await prisma.user.findFirst({
                where: { role, isActive: true, section: user.section }
              });
            } else if (role === 'dept_manager' && user.department) {
              approver = await prisma.user.findFirst({
                where: { role, isActive: true, department: user.department }
              });
            } else if (role === 'shift_supervisor' && user.shift) {
              approver = await prisma.user.findFirst({
                where: { role, isActive: true, shift: user.shift }
              });
            }

            // ถ้าไม่เจอ ให้หาจาก managedDepartments / managedSections (cross-department)
            if (!approver) {
              // หา approver ที่มี managedDepartments หรือ managedSections ครอบคลุมพนักงานคนนี้
              const potentialApprovers = await prisma.user.findMany({
                where: { 
                  role, 
                  isActive: true,
                  OR: [
                    { managedDepartments: { not: null } },
                    { managedSections: { not: null } },
                  ]
                }
              });

              for (const potential of potentialApprovers) {
                let manages = false;

                // เช็ค managedDepartments
                if (potential.managedDepartments && user.department) {
                  try {
                    const depts: string[] = JSON.parse(potential.managedDepartments);
                    if (depts.includes(user.department)) {
                      manages = true;
                    }
                  } catch (e) {}
                }

                // เช็ค managedSections
                if (!manages && potential.managedSections && user.section) {
                  try {
                    const sects: string[] = JSON.parse(potential.managedSections);
                    if (sects.includes(user.section)) {
                      manages = true;
                    }
                  } catch (e) {}
                }

                if (manages) {
                  approver = potential;
                  break;
                }
              }
            }

            if (approver) {
              approverId = approver.id;
            }
          }
        }

        if (approverId) {
          await prisma.leaveApproval.create({
            data: {
              leaveRequestId,
              level: step.level,
              approverId,
              status: 'pending',
              notifiedAt: firstApproverId === null ? now : null,
            },
          });
          if (firstApproverId === null) firstApproverId = approverId;
        }
      }

      if (firstApproverId) {
         // Notify First Approver
         const leaveRequest = await prisma.leaveRequest.findUnique({
          where: { id: leaveRequestId },
          include: { user: true },
        });
        if (leaveRequest) {
          await notifyApprovalPending(
            firstApproverId,
            leaveRequestId,
            `${leaveRequest.user.firstName} ${leaveRequest.user.lastName}`,
            leaveRequest.leaveType
          );
        }
        return;
      }
    }
  }

  // 3. Fallback: ถ้าไม่มี flow กำหนดไว้เลย ให้ส่งตรงไป HR Manager
  const hrManager = await prisma.user.findFirst({
    where: { role: 'hr_manager', isActive: true },
  });

  if (hrManager) {
    await prisma.leaveApproval.create({
      data: {
        leaveRequestId,
        level: 99,
        approverId: hrManager.id,
        status: 'pending',
        notifiedAt: new Date(),
      },
    });

    // แจ้งเตือน HR
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: { user: true },
    });

    if (leaveRequest) {
      await notifyApprovalPending(
        hrManager.id,
        leaveRequestId,
        `${leaveRequest.user.firstName} ${leaveRequest.user.lastName}`,
        leaveRequest.leaveType
      );
    }
  }
}

/**
 * ดำเนินการหลังจากอนุมัติ - ส่งไป level ถัดไป
 */
export async function processNextApproval(
  leaveRequestId: number,
  currentLevel: number
): Promise<{ isComplete: boolean; nextApproverId?: number }> {
  // หา approval level ถัดไป
  const nextApproval = await prisma.leaveApproval.findFirst({
    where: {
      leaveRequestId,
      level: { gt: currentLevel },
      status: 'pending',
    },
    orderBy: { level: 'asc' },
    include: { approver: true },
  });

  if (!nextApproval) {
    // ไม่มี level ถัดไป = อนุมัติสมบูรณ์
    return { isComplete: true };
  }

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    include: { user: true },
  });

  // อัพเดต current level
  await prisma.leaveRequest.update({
    where: { id: leaveRequestId },
    data: { currentLevel: nextApproval.level },
  });

  // อัพเดต notifiedAt
  await prisma.leaveApproval.update({
    where: { id: nextApproval.id },
    data: { notifiedAt: new Date() },
  });

  // แจ้งเตือนผู้อนุมัติถัดไป
  if (leaveRequest) {
    await notifyApprovalPending(
      nextApproval.approverId,
      leaveRequestId,
      `${leaveRequest.user.firstName} ${leaveRequest.user.lastName}`,
      leaveRequest.leaveType
    );
  }

  return { isComplete: false, nextApproverId: nextApproval.approverId };
}
