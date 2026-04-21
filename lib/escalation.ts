/**
 * Escalation Service
 * ตรวจสอบใบลาที่รอนานเกินไป และส่งต่อไป HR Manager โดยอัตโนมัติ
 * เงื่อนไข: ยื่นวันไหนก็ตาม เมื่อถึง 13:00 ของวันถัดไป จะถูก escalate ทันที
 */

import { prisma } from './prisma';
import {
  notifyApprovalPending,
  notifyEscalated,
  notifyApprovalReminder
} from './onesignal';

// ไม่ใช้ค่าคงที่เป็นชั่วโมงแล้ว เพราะใช้เวลาคงที่ (13:00 ของวันถัดไป)
const REMINDER_HOURS = 4; // เตือนก่อนหมดเวลา 4 ชั่วโมง (ประมาณ 09:00 ของวันถัดไป)

import { ROLE_WEIGHTS } from '@/types/user-role';

/**
 * ข้อมูลที่ใช้ในการหาผู้อนุมัติ
 */
export interface ApproverResolveContext {
  /** Role ของผู้อนุมัติที่ต้องการหา */
  approverRole: string;
  /** Company scope ของ workflow (หรือของ user ที่ยื่นใบลา) */
  company?: string | null;
  /** Department scope ของ workflow (หรือของ user ที่ยื่นใบลา) */
  department?: string | null;
  /** Section scope ของ workflow (หรือของ user ที่ยื่นใบลา) */
  section?: string | null;
  /** ID ของ user ที่ต้องการยกเว้น (ป้องกัน self-approval) */
  excludeUserId?: number;
}

/**
 * ผลลัพธ์จากการหาผู้อนุมัติ
 */
export interface ResolvedApprover {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  position?: string | null;
  section?: string | null;
  department?: string | null;
}

/**
 * Shared Function สำหรับหาผู้อนุมัติจาก Role
 * ใช้ร่วมกันทั้ง:
 * - หน้า admin/approval-workflows (แสดงรายชื่อ)
 * - หน้า workflow-test (จำลองการทดสอบ)
 * - Production logic (สร้าง approval steps จริง)
 * 
 * Logic หลัก:
 * 1. ถ้าเป็น HR/HR Manager จะหาจาก company หรือทั้งระบบ
 * 2. ถ้าเป็น Role อื่น จะใช้ Direct vs Broad Matching:
 *    - Direct: ตรงกับ section โดยตรง หรือ managedSections
 *    - Broad: ตรงกับ department โดยตรง หรือ managedDepartments
 * 3. Prioritization: ถ้ามี Direct Match ให้ใช้ Direct เท่านั้น
 */
export async function resolveApproversByRole(
  context: ApproverResolveContext
): Promise<ResolvedApprover[]> {
  const { approverRole, company, department, section, excludeUserId } = context;

  // กรณี HR Manager หรือ HR - หาจาก company หรือทั้งระบบ
  if (approverRole === 'hr_manager' || approverRole === 'hr') {
    // ลองหา HR ใน company ก่อน
    const hrInCompany = await prisma.user.findFirst({
      where: {
        role: approverRole,
        isActive: true,
        company: company || undefined,
        id: excludeUserId ? { not: excludeUserId } : undefined,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        position: true,
        section: true,
        department: true,
      },
    });

    if (hrInCompany) return [hrInCompany];

    // ถ้าไม่เจอใน company ให้หาคนใดก็ได้
    const anyHr = await prisma.user.findFirst({
      where: {
        role: approverRole,
        isActive: true,
        id: excludeUserId ? { not: excludeUserId } : undefined,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        position: true,
        section: true,
        department: true,
      },
    });

    return anyHr ? [anyHr] : [];
  }

  // กรณี Role อื่นๆ (shift_supervisor, section_head, dept_manager, etc.)
  // ต้องดึง section codes ของ department มาก่อนเพื่อใช้ในการเปรียบเทียบ
  let deptSectionCodes: string[] = [];
  if (department) {
    const deptSections = await prisma.section.findMany({
      where: { department: { code: department } },
      select: { code: true },
    });
    deptSectionCodes = deptSections.map(s => s.code);
  }

  // หา potential managers ทั้งหมด
  const allPotentialManagers = await prisma.user.findMany({
    where: {
      role: approverRole as any,
      isActive: true,
      id: excludeUserId ? { not: excludeUserId } : undefined,
      OR: [
        { department: department || undefined },
        { managedDepartments: { not: null } },
        { managedSections: { not: null } },
        // สำหรับ company-level หรือ global workflow
        ...(company && !department ? [{ company }] : []),
        ...(!company && !department && !section ? [{}] : []), // Global
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      position: true,
      section: true,
      department: true,
      company: true,
      managedDepartments: true,
      managedSections: true,
    },
  });

  const directMatches: ResolvedApprover[] = [];
  const broadMatches: ResolvedApprover[] = [];

  for (const m of allPotentialManagers) {
    let isDirectMatch = false;
    let isBroadMatch = false;

    // Parse managed areas safely
    let managedDepts: string[] = [];
    let managedSects: string[] = [];
    try {
      if (m.managedDepartments) managedDepts = JSON.parse(m.managedDepartments as string);
      if (m.managedSections) managedSects = JSON.parse(m.managedSections as string);
    } catch (e) {
      console.error('Error parsing managed areas for user', m.id, e);
    }

    // --- Section-level matching ---
    if (section) {
      // Direct: ตรงกับ section โดยตรง
      if (m.section === section) {
        isDirectMatch = true;
      }
      // Direct: ดูแล section นี้ผ่าน managedSections
      if (!isDirectMatch && managedSects.includes(section)) {
        isDirectMatch = true;
      }

      // Broad: เป็น dept manager ที่ดูแลทั้ง department (ไม่มี section เฉพาะ)
      if (!isDirectMatch && ['dept_manager', 'hr_manager', 'hr'].includes(approverRole)) {
        // อยู่ใน department เดียวกัน และไม่มี section เฉพาะ
        if (m.department === department && !m.section) {
          isBroadMatch = true;
        }
        // ดูแล department นี้ และไม่มี section เฉพาะใน department นั้น
        if (!isBroadMatch && department && managedDepts.includes(department)) {
          const hasSpecificSectionsInThisDept = managedSects.some(s => deptSectionCodes.includes(s));
          if (!hasSpecificSectionsInThisDept) {
            isBroadMatch = true;
          }
        }
      }
    }
    // --- Department-level matching (no specific section) ---
    else if (department) {
      // Direct: อยู่ใน department เดียวกัน และไม่มี section (หมายถึงดูแลทั้ง dept)
      if (m.department === department && !m.section) {
        isDirectMatch = true;
      }
      // Direct: ดูแล department นี้ และไม่มี section เฉพาะใน department นั้น
      if (!isDirectMatch && managedDepts.includes(department)) {
        const hasSpecificSectionsInThisDept = managedSects.some(s => deptSectionCodes.includes(s));
        if (!hasSpecificSectionsInThisDept) {
          isDirectMatch = true;
        }
      }
    }
    // --- Company-level matching ---
    else if (company) {
      if (m.company === company) {
        isDirectMatch = true;
      }
    }
    // --- Global matching (no scope) ---
    else {
      isDirectMatch = true;
    }

    if (isDirectMatch) {
      directMatches.push({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        role: m.role,
        position: m.position,
        section: m.section,
        department: m.department,
      });
    } else if (isBroadMatch) {
      broadMatches.push({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        role: m.role,
        position: m.position,
        section: m.section,
        department: m.department,
      });
    }
  }

  // Prioritization: ใช้ Direct ถ้ามี ไม่งั้นใช้ Broad
  return directMatches.length > 0 ? directMatches : broadMatches;
}

/**
 * คำนวณวันสิ้นสุดการรออนุมัติ (Escalation Deadline)
 * กติกาวันถัดไป เวลา 13:00 น.
 */
export function calculateEscalationDeadline(createdAt: Date = new Date()): Date {
  const deadline = new Date(createdAt);
  deadline.setDate(deadline.getDate() + 1); // วันถัดไป
  deadline.setHours(13, 0, 0, 0); // เวลา 13:00 น.
  return deadline;
}

/**
 * ตรวจสอบและ escalate ใบลาที่เกินเวลา
 */
export async function checkAndEscalate(options?: { force?: boolean; leaveId?: number }): Promise<{
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
    const isForce = options?.force || false;
    const targetLeaveId = options?.leaveId;

    // บันทึกเวลาที่รัน (ถ้าเป็นการรันปกติ ไม่ใช่การระบุรายใบ)
    if (!targetLeaveId) {
      await prisma.systemConfig.upsert({
        where: { key: 'last_escalation_run' },
        update: { value: now.toISOString() },
        create: { key: 'last_escalation_run', value: now.toISOString() },
      });
    }

    // Build query condition
    const whereCondition: any = {
      status: { in: ['pending', 'in_progress'] },
      isEscalated: false,
    };

    if (targetLeaveId) {
      whereCondition.id = targetLeaveId;
    } else if (!isForce) {
      whereCondition.escalationDeadline = { lte: now };
    }

    const overdueLeaves = await prisma.leaveRequest.findMany({
      where: whereCondition,
      include: {
        user: true,
        approvals: {
          where: { status: 'pending' },
          orderBy: { level: 'asc' },
          take: 1,
          include: { approver: true },
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
            leave.leaveType,
            leave.totalDays,
            leave.startDate?.toISOString(),
            leave.endDate?.toISOString(),
            leave.reason,
            leave.leaveCode || undefined
          );

          // แจ้งพนักงานว่าใบลาถูก escalate
          await notifyEscalated(
            leave.userId,
            leave.id,
            leave.leaveType,
            leave.totalDays,
            leave.startDate?.toISOString(),
            leave.endDate?.toISOString(),
            leave.leaveCode || undefined
          );

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
  const now = new Date();

  // ดึงข้อมูล user ก่อนเพื่อเช็ค role
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  // 0. ถ้าเป็น dept_manager หรือตำแหน่งสูงกว่า ให้ส่งตรงไป HR Manager เลย
  const requesterWeight = ROLE_WEIGHTS[user.role] || 0;

  if (requesterWeight >= ROLE_WEIGHTS.dept_manager) {
    const hrManager = await prisma.user.findFirst({
      where: {
        role: 'hr_manager',
        isActive: true,
        id: { not: userId }, // ป้องกัน self-approval
      },
    });

    if (hrManager) {
      await prisma.leaveApproval.create({
        data: {
          leaveRequestId,
          level: 99,
          approverId: hrManager.id,
          status: 'pending',
          notifiedAt: now,
        },
      });

      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id: leaveRequestId },
        include: { user: true },
      });

      if (leaveRequest) {
        await notifyApprovalPending(
          hrManager.id,
          leaveRequestId,
          `${leaveRequest.user.firstName} ${leaveRequest.user.lastName}`,
          leaveRequest.leaveType,
          leaveRequest.totalDays,
          leaveRequest.startDate?.toISOString(),
          leaveRequest.endDate?.toISOString(),
          leaveRequest.reason,
          leaveRequest.leaveCode || undefined
        );
      }
    }
    return;
  }

  // 1. ดึง approval flow ของ user (Specific User Override)
  const approvalFlows = await prisma.userApprovalFlow.findMany({
    where: { userId, isActive: true },
    orderBy: { level: 'asc' },
    include: { approver: true },
  });

  if (approvalFlows.length > 0) {
    // กรอง approval flows ที่ไม่ใช่ตัวเอง และ role ต้องไม่ต่ำกว่าตัวเอง
    const filteredFlows = approvalFlows.filter(flow => {
      if (flow.approverId === userId) return false;
      const approverWeight = ROLE_WEIGHTS[flow.approver.role] || 0;
      return approverWeight > requesterWeight;
    });

    if (filteredFlows.length === 0) {
      // ถ้าไม่มีผู้อนุมัติเลยหลังจากกรอง ให้ส่งตรงไป HR Manager
      const hrManager = await prisma.user.findFirst({
        where: { role: 'hr_manager', isActive: true },
      });
      if (hrManager && hrManager.id !== userId) {
        await prisma.leaveApproval.create({
          data: {
            leaveRequestId,
            level: 99,
            approverId: hrManager.id,
            status: 'pending',
            notifiedAt: now,
          },
        });
        const leaveRequest = await prisma.leaveRequest.findUnique({
          where: { id: leaveRequestId },
          include: { user: true },
        });
        if (leaveRequest) {
          await notifyApprovalPending(
            hrManager.id,
            leaveRequestId,
            `${leaveRequest.user.firstName} ${leaveRequest.user.lastName}`,
            leaveRequest.leaveType,
            leaveRequest.totalDays,
            leaveRequest.startDate?.toISOString(),
            leaveRequest.endDate?.toISOString(),
            leaveRequest.reason,
            leaveRequest.leaveCode || undefined
          );
        }
      }
      return;
    }

    // สร้าง approval steps ตาม flow ที่กำหนด (ข้ามตัวเองไปแล้ว)
    let isFirstApprover = true;
    for (const flow of filteredFlows) {
      await prisma.leaveApproval.create({
        data: {
          leaveRequestId,
          level: flow.level,
          approverId: flow.approverId,
          status: 'pending',
          notifiedAt: isFirstApprover ? now : null, // แจ้งเตือนเฉพาะ level แรกที่ไม่ใช่ตัวเอง
        },
      });
      isFirstApprover = false;
    }

    // แจ้งเตือนผู้อนุมัติคนแรก (ที่ไม่ใช่ตัวเอง)
    const firstApprover = filteredFlows[0];
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: { user: true },
    });

    if (leaveRequest) {
      await notifyApprovalPending(
        firstApprover.approverId,
        leaveRequestId,
        `${leaveRequest.user.firstName} ${leaveRequest.user.lastName}`,
        leaveRequest.leaveType,
        leaveRequest.totalDays,
        leaveRequest.startDate?.toISOString(),
        leaveRequest.endDate?.toISOString(),
        leaveRequest.reason,
        leaveRequest.leaveCode || undefined
      );
    }
    return;
  }

  // 2. ถ้าไม่มี User Flow ให้หาจาก ApprovalWorkflow (Section -> Department -> Company)
  // user ถูกดึงมาแล้วด้านบน ไม่ต้องดึงซ้ำ
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
    let firstActualLevel: number | null = null;
    const now = new Date();

    for (const step of workflow.steps) {
      let approverIds: number[] = [];
      if (step.approverId) {
        // กรณีระบุตัวบุคคล ต้องเช็คว่าตำแหน่งสูงกว่าหรือไม่
        const specificApprover = await prisma.user.findUnique({
          where: { id: step.approverId },
          select: { id: true, role: true }
        });

        if (specificApprover && (ROLE_WEIGHTS[specificApprover.role] || 0) > requesterWeight) {
          approverIds.push(step.approverId);
        }
      } else if (step.approverRole) {
        const role = step.approverRole;

        // ข้ามขั้นตอนถ้า Role ที่ผู้อนุมัติ ต่ำกว่าหรือเท่ากับผู้ขอลา
        // (ยกเว้น HR Manager ที่เป็นขั้นสุดท้ายเสมอ)
        if (role !== 'hr_manager' && (ROLE_WEIGHTS[role] || 0) <= requesterWeight) {
          continue;
        }

        if (role === 'hr_manager' || role === 'hr') {
          const hrInCompany = await prisma.user.findFirst({
            where: { role, isActive: true, company: user.company, id: { not: userId } }
          });
          if (hrInCompany) {
            approverIds.push(hrInCompany.id);
          } else {
            const anyHr = await prisma.user.findFirst({
              where: { role, isActive: true, id: { not: userId } }
            });
            if (anyHr) approverIds.push(anyHr.id);
          }
        } else {
          // Special case: shift_supervisor for users without shift
          if (role === 'shift_supervisor' && !user.shift) {
            const supervisors = await prisma.user.findMany({
              where: {
                role,
                isActive: true,
                id: { not: userId },
                OR: [
                  { section: user.section || undefined, department: user.department },
                  { managedSections: user.section ? { contains: user.section } : undefined },
                  { managedDepartments: { contains: user.department } }
                ]
              }
            });

            for (const sv of supervisors) {
              let isMatch = false;
              if (sv.section === user.section || (sv.department === user.department && !sv.section)) {
                isMatch = true;
              } else {
                if (sv.managedSections && user.section) {
                  try {
                    const sects = JSON.parse(sv.managedSections);
                    if (sects.includes(user.section)) isMatch = true;
                  } catch (e) { }
                }
                if (!isMatch && sv.managedDepartments && user.department) {
                  try {
                    const depts = JSON.parse(sv.managedDepartments);
                    if (depts.includes(user.department)) isMatch = true;
                  } catch (e) { }
                }
              }
              if (isMatch) approverIds.push(sv.id);
            }
          } else {
            // Get all section codes for the user's department to distinguish broad vs section managers
            const deptSections = await prisma.section.findMany({
              where: { department: { code: user.department } },
              select: { code: true }
            });
            const deptSectionCodes = deptSections.map(s => s.code);

            // Improved Lookup: Respect Section vs Department boundaries with prioritization
            const directApproverIds: number[] = [];
            const broadApproverIds: number[] = [];

            const allPotentialManagers = await prisma.user.findMany({
              where: {
                role,
                isActive: true,
                id: { not: userId },
                OR: [
                  { department: user.department },
                  { managedDepartments: { not: null } },
                  { managedSections: { not: null } },
                ]
              }
            });

            for (const m of allPotentialManagers) {
              let isDirectMatch = false;
              let isBroadMatch = false;

              // 1. Check for Direct Match (Specific Section)
              if (m.section && user.section && m.section === user.section) {
                isDirectMatch = true;
              }

              // 2. Check for Direct Match (Managed Sections)
              if (!isDirectMatch && m.managedSections && user.section) {
                try {
                  const sects = JSON.parse(m.managedSections);
                  if (Array.isArray(sects) && sects.includes(user.section)) isDirectMatch = true;
                } catch (e) { }
              }

              // 3. Check for Broad Match (Department-wide)
              if (!isDirectMatch) {
                if (!m.section && m.department === user.department) {
                  isBroadMatch = true;
                } else if (m.managedDepartments && user.department) {
                  try {
                    const depts = JSON.parse(m.managedDepartments);
                    if (Array.isArray(depts) && depts.includes(user.department)) {
                      // Check if this manager is only a Section Manager for this dept
                      const mSects = m.managedSections ? JSON.parse(m.managedSections) : [];
                      const hasSpecificSectionsInThisDept = Array.isArray(mSects) && mSects.some((s: string) => deptSectionCodes.includes(s));

                      if (!hasSpecificSectionsInThisDept) {
                        isBroadMatch = true;
                      } else if (user.section && Array.isArray(mSects) && mSects.includes(user.section)) {
                        // This case is already handled by isDirectMatch, but just to be safe
                        isBroadMatch = false;
                      }
                    }
                  } catch (e) { }
                }
              }

              if (isDirectMatch) {
                directApproverIds.push(m.id);
              } else if (isBroadMatch) {
                broadApproverIds.push(m.id);
              }
            }

            // Prioritization: Use Direct Matches if found, otherwise use Broad Matches
            if (directApproverIds.length > 0) {
              approverIds.push(...directApproverIds);
            } else {
              approverIds.push(...broadApproverIds);
            }
          }
        }
      }

      // ตรวจสอบว่ามีผู้อนุมัติจริงหรือไม่ (ไม่ใช่เอาตัวเองออกแล้วเหลือ 0)
      const actualApproverIds = approverIds.filter(id => id !== userId);
      if (actualApproverIds.length > 0) {
        if (firstActualLevel === null) firstActualLevel = step.level;

        for (const approverId of actualApproverIds) {
          await prisma.leaveApproval.create({
            data: {
              leaveRequestId,
              level: step.level,
              approverId,
              status: 'pending',
              notifiedAt: step.level === firstActualLevel ? now : null,
            },
          });
        }
      }
    }

    if (firstActualLevel !== null) {
      const firstLevelApprovals = await prisma.leaveApproval.findMany({
        where: { leaveRequestId, level: firstActualLevel, status: 'pending' },
        include: { approver: true }
      });

      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id: leaveRequestId },
        include: { user: true },
      });

      if (leaveRequest) {
        await prisma.leaveRequest.update({
          where: { id: leaveRequestId },
          data: { currentLevel: firstActualLevel }
        });

        for (const approval of firstLevelApprovals) {
          await notifyApprovalPending(
            approval.approverId,
            leaveRequestId,
            `${leaveRequest.user.firstName} ${leaveRequest.user.lastName}`,
            leaveRequest.leaveType,
            leaveRequest.totalDays,
            leaveRequest.startDate?.toISOString(),
            leaveRequest.endDate?.toISOString(),
            leaveRequest.reason,
            leaveRequest.leaveCode || undefined
          );
        }
      }
      return;
    }
  }

  // Fallback to HR Manager
  const hrManager = await prisma.user.findFirst({
    where: { role: 'hr_manager', isActive: true, id: { not: userId } },
  });

  if (hrManager) {
    await prisma.leaveApproval.create({
      data: { leaveRequestId, level: 99, approverId: hrManager.id, status: 'pending', notifiedAt: new Date() },
    });

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: { user: true },
    });

    if (leaveRequest) {
      await notifyApprovalPending(
        hrManager.id,
        leaveRequestId,
        `${leaveRequest.user.firstName} ${leaveRequest.user.lastName}`,
        leaveRequest.leaveType,
        leaveRequest.totalDays,
        leaveRequest.startDate?.toISOString(),
        leaveRequest.endDate?.toISOString(),
        leaveRequest.reason,
        leaveRequest.leaveCode || undefined
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
  // 1. Mark other pending approvals at current level as 'skipped'
  await prisma.leaveApproval.updateMany({
    where: { leaveRequestId, level: currentLevel, status: 'pending' },
    data: { status: 'skipped', actionAt: new Date() }
  });

  // 2. Find next level
  const nextApproval = await prisma.leaveApproval.findFirst({
    where: { leaveRequestId, level: { gt: currentLevel }, status: 'pending' },
    orderBy: { level: 'asc' },
    include: { approver: true },
  });

  if (!nextApproval) return { isComplete: true };

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    include: { user: true },
  });

  // 3. Mark all in next level as notified
  await prisma.leaveApproval.updateMany({
    where: { leaveRequestId, level: nextApproval.level, status: 'pending' },
    data: { notifiedAt: new Date() },
  });

  const nextLevelApprovals = await prisma.leaveApproval.findMany({
    where: { leaveRequestId, level: nextApproval.level, status: 'pending' },
    include: { approver: true }
  });

  await prisma.leaveRequest.update({
    where: { id: leaveRequestId },
    data: { currentLevel: nextApproval.level },
  });

  if (leaveRequest) {
    for (const approval of nextLevelApprovals) {
      await notifyApprovalPending(
        approval.approverId,
        leaveRequestId,
        `${leaveRequest.user.firstName} ${leaveRequest.user.lastName}`,
        leaveRequest.leaveType,
        leaveRequest.totalDays,
        leaveRequest.startDate?.toISOString(),
        leaveRequest.endDate?.toISOString(),
        leaveRequest.reason,
        leaveRequest.leaveCode || undefined
      );
    }
  }

  return { isComplete: false, nextApproverId: nextApproval.approverId };
}

