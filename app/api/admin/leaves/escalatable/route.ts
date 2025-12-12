import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';
import { notifyApprovalPending, notifyEscalated } from '@/lib/onesignal';

const ESCALATION_HOURS = 48; // 2 วัน = 48 ชั่วโมง

// GET - ดึงใบลาที่สามารถ escalate ได้ (รอเกิน 2 วัน และยังไม่ถูก escalate)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdminRole(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const escalationThreshold = new Date(now.getTime() - ESCALATION_HOURS * 60 * 60 * 1000);

        // หาใบลาที่รอเกิน 2 วัน และยังไม่ถูก escalate
        const escalatableLeaves = await prisma.leaveRequest.findMany({
            where: {
                status: { in: ['pending', 'in_progress'] },
                isEscalated: false,
                createdAt: { lte: escalationThreshold },
            },
            orderBy: { createdAt: 'asc' },
            include: {
                user: {
                    select: {
                        id: true,
                        employeeId: true,
                        firstName: true,
                        lastName: true,
                        company: true,
                        department: true,
                        section: true,
                        position: true,
                        avatar: true,
                    },
                },
                approvals: {
                    orderBy: { level: 'asc' },
                    include: {
                        approver: {
                            select: {
                                id: true,
                                employeeId: true,
                                firstName: true,
                                lastName: true,
                                role: true,
                            },
                        },
                    },
                },
                attachments: true,
            },
        });

        // Get department and section names
        const [departments, sections, leaveTypes] = await Promise.all([
            prisma.department.findMany({ select: { code: true, name: true } }),
            prisma.section.findMany({ select: { code: true, name: true } }),
            prisma.leaveType.findMany({ select: { code: true, name: true } }),
        ]);

        const deptMap = new Map(departments.map(d => [d.code, d.name]));
        const sectionMap = new Map(sections.map(s => [s.code, s.name]));
        const leaveTypeMap = new Map(leaveTypes.map(lt => [lt.code, lt.name]));

        // Add names and calculate pending days
        const leavesWithDetails = escalatableLeaves.map(leave => {
            const pendingDays = Math.floor((now.getTime() - leave.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            const currentApproval = leave.approvals.find(a => a.status === 'pending');

            return {
                ...leave,
                leaveCode: leave.leaveCode || `LV${String(leave.id).padStart(6, '0')}`,
                leaveTypeName: leaveTypeMap.get(leave.leaveType) || leave.leaveType,
                pendingDays,
                currentApprover: currentApproval?.approver || null,
                user: {
                    ...leave.user,
                    departmentName: deptMap.get(leave.user.department) || leave.user.department,
                    sectionName: leave.user.section ? (sectionMap.get(leave.user.section) || leave.user.section) : null,
                },
            };
        });

        // Stats
        const stats = {
            total: leavesWithDetails.length,
            overdue2Days: leavesWithDetails.filter(l => l.pendingDays >= 2).length,
            overdue3Days: leavesWithDetails.filter(l => l.pendingDays >= 3).length,
            overdue7Days: leavesWithDetails.filter(l => l.pendingDays >= 7).length,
        };

        return NextResponse.json({ leaves: leavesWithDetails, stats });
    } catch (error) {
        console.error('Error fetching escalatable leaves:', error);
        return NextResponse.json(
            { error: 'Failed to fetch escalatable leaves' },
            { status: 500 }
        );
    }
}

// POST - Escalate ใบลาที่เลือกไป HR Manager
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdminRole(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { leaveIds } = body;

        if (!leaveIds || !Array.isArray(leaveIds) || leaveIds.length === 0) {
            return NextResponse.json({ error: 'No leave IDs provided' }, { status: 400 });
        }

        const now = new Date();

        // หา HR Managers
        const hrManagers = await prisma.user.findMany({
            where: { role: 'hr_manager', isActive: true },
        });

        if (hrManagers.length === 0) {
            return NextResponse.json({ error: 'No HR Manager found for escalation' }, { status: 500 });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[],
        };

        for (const leaveId of leaveIds) {
            try {
                // ดึงข้อมูลใบลา
                const leave = await prisma.leaveRequest.findUnique({
                    where: { id: leaveId },
                    include: {
                        user: true,
                        approvals: { where: { status: 'pending' } },
                    },
                });

                if (!leave) {
                    results.failed++;
                    results.errors.push(`Leave ${leaveId} not found`);
                    continue;
                }

                if (leave.isEscalated) {
                    results.failed++;
                    results.errors.push(`Leave ${leaveId} already escalated`);
                    continue;
                }

                if (!['pending', 'in_progress'].includes(leave.status)) {
                    results.failed++;
                    results.errors.push(`Leave ${leaveId} is not pending`);
                    continue;
                }

                // หา HR Manager ของบริษัทเดียวกัน
                const hrManager = hrManagers.find(hr => hr.company === leave.user.company) || hrManagers[0];

                // ดึง approvals ทั้งหมดของใบลานี้ (รวม pending ทั้งหมด)
                const allApprovals = await prisma.leaveApproval.findMany({
                    where: { leaveRequestId: leave.id },
                    orderBy: { level: 'asc' },
                });

                // ตรวจสอบว่า hr_manager คนนี้เป็นผู้อนุมัติที่รอคิวอยู่แล้วหรือไม่
                const existingHrApproval = allApprovals.find(
                    a => a.approverId === hrManager.id && a.status === 'pending'
                );

                if (existingHrApproval) {
                    // ถ้า hr_manager มีอยู่แล้วใน approval flow
                    // ข้าม pending approvals ที่มี level ต่ำกว่า hr_manager
                    await prisma.leaveApproval.updateMany({
                        where: {
                            leaveRequestId: leave.id,
                            status: 'pending',
                            level: { lt: existingHrApproval.level },
                        },
                        data: {
                            status: 'skipped',
                            actionAt: now,
                        },
                    });

                    // อัพเดต notifiedAt ให้ approval ของ hr_manager ที่มีอยู่
                    await prisma.leaveApproval.update({
                        where: { id: existingHrApproval.id },
                        data: { notifiedAt: now },
                    });

                    // อัพเดตสถานะใบลา
                    await prisma.leaveRequest.update({
                        where: { id: leave.id },
                        data: {
                            isEscalated: true,
                            currentLevel: existingHrApproval.level,
                        },
                    });
                } else {
                    // ถ้า hr_manager ไม่มีอยู่ใน approval flow ให้สร้างใหม่
                    // ข้าม pending approvals ที่มีอยู่ทั้งหมด
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

                    // สร้าง approval step ใหม่สำหรับ HR
                    await prisma.leaveApproval.create({
                        data: {
                            leaveRequestId: leave.id,
                            level: 99,
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
                }

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

                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push(`Failed to escalate leave ${leaveId}: ${error}`);
            }
        }

        return NextResponse.json({
            message: `Escalated ${results.success} leave(s) successfully`,
            ...results,
        });
    } catch (error) {
        console.error('Error escalating leaves:', error);
        return NextResponse.json(
            { error: 'Failed to escalate leaves' },
            { status: 500 }
        );
    }
}
