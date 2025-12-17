import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';

interface ApprovalFlow {
    level: number;
    approverId: number;
    approverName: string;
    approverRole: string;
    approverPosition?: string;
    isRequired: boolean;
    source: 'user_flow' | 'workflow' | 'fallback';
}

/**
 * GET /api/admin/workflow-test - Simulate approval workflow for a user
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdminRole(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                role: true,
                company: true,
                department: true,
                section: true,
                shift: true,
                position: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const approvalSteps: ApprovalFlow[] = [];
        let message: string | undefined;

        // Case 1: If user is dept_manager, send directly to HR Manager
        if (user.role === 'dept_manager') {
            const hrManager = await prisma.user.findFirst({
                where: {
                    role: 'hr_manager',
                    isActive: true,
                    id: { not: user.id },
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    position: true,
                },
            });

            if (hrManager) {
                approvalSteps.push({
                    level: 99,
                    approverId: hrManager.id,
                    approverName: `${hrManager.firstName} ${hrManager.lastName}`,
                    approverRole: hrManager.role,
                    approverPosition: hrManager.position || undefined,
                    isRequired: true,
                    source: 'fallback',
                });
                message = 'ผู้จัดการฝ่ายจะส่งใบลาตรงไป HR Manager';
            }

            return NextResponse.json({
                userId: user.id,
                userName: `${user.firstName} ${user.lastName}`,
                userRole: user.role,
                approvalSteps,
                message,
            });
        }

        // Case 2: Check User-specific Approval Flow
        const userFlows = await prisma.userApprovalFlow.findMany({
            where: { userId: user.id, isActive: true },
            orderBy: { level: 'asc' },
            include: {
                approver: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        position: true,
                    },
                },
            },
        });

        if (userFlows.length > 0) {
            // Filter out self-approval
            const filteredFlows = userFlows.filter(flow => flow.approverId !== user.id);

            if (filteredFlows.length === 0) {
                // If no approvers left after filtering, fallback to HR Manager
                const hrManager = await prisma.user.findFirst({
                    where: { role: 'hr_manager', isActive: true, id: { not: user.id } },
                });
                if (hrManager) {
                    approvalSteps.push({
                        level: 99,
                        approverId: hrManager.id,
                        approverName: `${hrManager.firstName} ${hrManager.lastName}`,
                        approverRole: hrManager.role,
                        approverPosition: hrManager.position || undefined,
                        isRequired: true,
                        source: 'fallback',
                    });
                    message = 'ใช้ User Flow แต่กรองผู้อนุมัติที่เป็นตัวเองออก ส่งต่อไป HR Manager';
                }
            } else {
                for (const flow of filteredFlows) {
                    approvalSteps.push({
                        level: flow.level,
                        approverId: flow.approver.id,
                        approverName: `${flow.approver.firstName} ${flow.approver.lastName}`,
                        approverRole: flow.approver.role,
                        approverPosition: flow.approver.position || undefined,
                        isRequired: flow.isRequired,
                        source: 'user_flow',
                    });
                }
                message = 'ใช้ User-specific Approval Flow';
            }

            return NextResponse.json({
                userId: user.id,
                userName: `${user.firstName} ${user.lastName}`,
                userRole: user.role,
                approvalSteps,
                message,
            });
        }

        // Case 3: Check Approval Workflow (Section -> Department -> Company)
        let workflow = null;

        // Check Section
        if (user.section) {
            workflow = await prisma.approvalWorkflow.findFirst({
                where: { section: user.section, isActive: true },
                include: { steps: { orderBy: { level: 'asc' } } },
            });
            if (workflow) {
                message = `ใช้ Section Workflow: ${workflow.name}`;
            }
        }

        // Check Department
        if (!workflow && user.department) {
            workflow = await prisma.approvalWorkflow.findFirst({
                where: { department: user.department, section: null, isActive: true },
                include: { steps: { orderBy: { level: 'asc' } } },
            });
            if (workflow) {
                message = `ใช้ Department Workflow: ${workflow.name}`;
            }
        }

        // Check Company
        if (!workflow && user.company) {
            workflow = await prisma.approvalWorkflow.findFirst({
                where: { company: user.company, department: null, section: null, isActive: true },
                include: { steps: { orderBy: { level: 'asc' } } },
            });
            if (workflow) {
                message = `ใช้ Company Workflow: ${workflow.name}`;
            }
        }

        if (workflow && workflow.steps.length > 0) {
            for (const step of workflow.steps) {
                let approverId = step.approverId;
                let approver = null;

                if (approverId) {
                    approver = await prisma.user.findUnique({
                        where: { id: approverId },
                        select: { id: true, firstName: true, lastName: true, role: true, position: true },
                    });
                } else if (step.approverRole) {
                    // Resolve Role dynamically
                    const role = step.approverRole;

                    if (role === 'hr_manager') {
                        // Special handling for HR Manager
                        const hrInCompany = await prisma.user.findFirst({
                            where: { role, isActive: true, company: user.company, id: { not: user.id } },
                        });
                        approver = hrInCompany || await prisma.user.findFirst({
                            where: { role, isActive: true, id: { not: user.id } },
                        });
                    } else if (role === 'section_head' && user.section) {
                        approver = await prisma.user.findFirst({
                            where: { role, isActive: true, section: user.section, id: { not: user.id } },
                        });
                    } else if (role === 'dept_manager' && user.department) {
                        approver = await prisma.user.findFirst({
                            where: { role, isActive: true, department: user.department, id: { not: user.id } },
                        });
                    } else if (role === 'shift_supervisor' && user.shift) {
                        approver = await prisma.user.findFirst({
                            where: { role, isActive: true, shift: user.shift, id: { not: user.id } },
                        });
                    }

                    // Try managed departments/sections if not found
                    if (!approver) {
                        const potentialApprovers = await prisma.user.findMany({
                            where: {
                                role,
                                isActive: true,
                                id: { not: user.id },
                                OR: [
                                    { managedDepartments: { not: null } },
                                    { managedSections: { not: null } },
                                ],
                            },
                        });

                        for (const potential of potentialApprovers) {
                            let manages = false;

                            if (potential.managedDepartments && user.department) {
                                try {
                                    const depts: string[] = JSON.parse(potential.managedDepartments);
                                    if (depts.includes(user.department)) manages = true;
                                } catch { }
                            }

                            if (!manages && potential.managedSections && user.section) {
                                try {
                                    const sects: string[] = JSON.parse(potential.managedSections);
                                    if (sects.includes(user.section)) manages = true;
                                } catch { }
                            }

                            if (manages) {
                                approver = potential;
                                break;
                            }
                        }
                    }
                }

                if (approver && approver.id !== user.id) {
                    approvalSteps.push({
                        level: step.level,
                        approverId: approver.id,
                        approverName: `${approver.firstName} ${approver.lastName}`,
                        approverRole: approver.role,
                        approverPosition: approver.position || undefined,
                        isRequired: true,
                        source: 'workflow',
                    });
                }
            }

            if (approvalSteps.length > 0) {
                return NextResponse.json({
                    userId: user.id,
                    userName: `${user.firstName} ${user.lastName}`,
                    userRole: user.role,
                    approvalSteps,
                    message,
                });
            }
        }

        // Case 4: Fallback to HR Manager
        const hrManager = await prisma.user.findFirst({
            where: { role: 'hr_manager', isActive: true, id: { not: user.id } },
        });

        if (hrManager) {
            approvalSteps.push({
                level: 99,
                approverId: hrManager.id,
                approverName: `${hrManager.firstName} ${hrManager.lastName}`,
                approverRole: hrManager.role,
                approverPosition: hrManager.position || undefined,
                isRequired: true,
                source: 'fallback',
            });
            message = 'ไม่พบ workflow ที่กำหนด ส่งตรงไป HR Manager (Fallback)';
        } else {
            // If HR Manager not found, try Admin
            const admin = await prisma.user.findFirst({
                where: { role: 'admin', isActive: true, id: { not: user.id } },
            });

            if (admin) {
                approvalSteps.push({
                    level: 99,
                    approverId: admin.id,
                    approverName: `${admin.firstName} ${admin.lastName}`,
                    approverRole: admin.role,
                    approverPosition: admin.position || undefined,
                    isRequired: true,
                    source: 'fallback',
                });
                message = 'ไม่พบ HR Manager ส่งไป Admin แทน (Fallback)';
            } else {
                message = 'ไม่พบผู้อนุมัติที่เหมาะสม';
            }
        }

        return NextResponse.json({
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            userRole: user.role,
            approvalSteps,
            message,
        });
    } catch (error) {
        console.error('Error simulating workflow:', error);
        return NextResponse.json(
            { error: 'Failed to simulate workflow', details: String(error) },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/workflow-test - Create a test leave request for a user
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdminRole(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { userId, leaveType, startDate, endDate, totalDays, reason } = body;

        if (!userId || !leaveType || !startDate || !endDate || !totalDays || !reason) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Generate leave code
        const typeCodeMap: Record<string, string> = {
            sick: 'SK', personal: 'PS', vacation: 'VC', maternity: 'MT',
            ordination: 'OR', work_outside: 'WO', absent: 'AB', other: 'OT',
        };
        const typeCode = typeCodeMap[leaveType] || 'OT';
        const start = new Date(startDate);
        const year = String(start.getFullYear()).slice(-2);
        const month = String(start.getMonth() + 1).padStart(2, '0');
        const prefix = `${typeCode}${year}${month}`;

        const lastLeave = await prisma.leaveRequest.findFirst({
            where: { leaveCode: { startsWith: prefix } },
            orderBy: { leaveCode: 'desc' },
            select: { leaveCode: true },
        });

        let runningNumber = 1;
        if (lastLeave?.leaveCode) {
            const lastNumber = parseInt(lastLeave.leaveCode.slice(-3), 10);
            if (!isNaN(lastNumber)) runningNumber = lastNumber + 1;
        }
        const leaveCode = `${prefix}${String(runningNumber).padStart(3, '0')}`;

        // Calculate escalation deadline (2 days)
        const escalationDeadline = new Date();
        escalationDeadline.setDate(escalationDeadline.getDate() + 2);
        escalationDeadline.setHours(8, 0, 0, 0);

        // Create leave request
        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                userId,
                leaveCode,
                leaveType,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalDays: Number(totalDays),
                reason,
                status: 'pending',
                currentLevel: 1,
                escalationDeadline,
                isEscalated: false,
            },
        });

        // Create approval steps using the same logic as createApprovalSteps
        const approvalSteps: { level: number; approverId: number; approverName: string }[] = [];
        const now = new Date();

        // Check if dept_manager - send directly to HR
        if (user.role === 'dept_manager') {
            const hrManager = await prisma.user.findFirst({
                where: { role: 'hr_manager', isActive: true, id: { not: userId } },
            });
            if (hrManager) {
                await prisma.leaveApproval.create({
                    data: {
                        leaveRequestId: leaveRequest.id,
                        level: 99,
                        approverId: hrManager.id,
                        status: 'pending',
                        notifiedAt: now,
                    },
                });
                approvalSteps.push({ level: 99, approverId: hrManager.id, approverName: `${hrManager.firstName} ${hrManager.lastName}` });
            }
        } else {
            // Check user-specific flow
            const userFlows = await prisma.userApprovalFlow.findMany({
                where: { userId, isActive: true },
                orderBy: { level: 'asc' },
                include: { approver: true },
            });

            if (userFlows.length > 0) {
                const filteredFlows = userFlows.filter(f => f.approverId !== userId);
                let isFirst = true;
                for (const flow of filteredFlows) {
                    await prisma.leaveApproval.create({
                        data: {
                            leaveRequestId: leaveRequest.id,
                            level: flow.level,
                            approverId: flow.approverId,
                            status: 'pending',
                            notifiedAt: isFirst ? now : null,
                        },
                    });
                    approvalSteps.push({ level: flow.level, approverId: flow.approverId, approverName: `${flow.approver.firstName} ${flow.approver.lastName}` });
                    isFirst = false;
                }
            } else {
                // Check workflow
                let workflow = null;
                if (user.section) {
                    workflow = await prisma.approvalWorkflow.findFirst({
                        where: { section: user.section, isActive: true },
                        include: { steps: { orderBy: { level: 'asc' } } },
                    });
                }
                if (!workflow && user.department) {
                    workflow = await prisma.approvalWorkflow.findFirst({
                        where: { department: user.department, section: null, isActive: true },
                        include: { steps: { orderBy: { level: 'asc' } } },
                    });
                }
                if (!workflow && user.company) {
                    workflow = await prisma.approvalWorkflow.findFirst({
                        where: { company: user.company, department: null, section: null, isActive: true },
                        include: { steps: { orderBy: { level: 'asc' } } },
                    });
                }

                if (workflow && workflow.steps.length > 0) {
                    let isFirst = true;
                    for (const step of workflow.steps) {
                        let approverId = step.approverId;
                        let approver = null;

                        if (approverId) {
                            approver = await prisma.user.findUnique({ where: { id: approverId } });
                        } else if (step.approverRole) {
                            const role = step.approverRole;
                            if (role === 'hr_manager') {
                                approver = await prisma.user.findFirst({ where: { role, isActive: true, id: { not: userId } } });
                            } else if (role === 'section_head' && user.section) {
                                approver = await prisma.user.findFirst({ where: { role, isActive: true, section: user.section, id: { not: userId } } });
                            } else if (role === 'dept_manager' && user.department) {
                                approver = await prisma.user.findFirst({ where: { role, isActive: true, department: user.department, id: { not: userId } } });
                            }
                        }

                        if (approver && approver.id !== userId) {
                            await prisma.leaveApproval.create({
                                data: {
                                    leaveRequestId: leaveRequest.id,
                                    level: step.level,
                                    approverId: approver.id,
                                    status: 'pending',
                                    notifiedAt: isFirst ? now : null,
                                },
                            });
                            approvalSteps.push({ level: step.level, approverId: approver.id, approverName: `${approver.firstName} ${approver.lastName}` });
                            isFirst = false;
                        }
                    }
                }

                // Fallback to HR if no steps created
                if (approvalSteps.length === 0) {
                    const hrManager = await prisma.user.findFirst({
                        where: { role: 'hr_manager', isActive: true, id: { not: userId } },
                    });
                    if (hrManager) {
                        await prisma.leaveApproval.create({
                            data: {
                                leaveRequestId: leaveRequest.id,
                                level: 99,
                                approverId: hrManager.id,
                                status: 'pending',
                                notifiedAt: now,
                            },
                        });
                        approvalSteps.push({ level: 99, approverId: hrManager.id, approverName: `${hrManager.firstName} ${hrManager.lastName}` });
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            id: leaveRequest.id,
            leaveCode,
            approvalSteps,
            message: `สร้างใบลาทดสอบสำเร็จ - ${approvalSteps.length} ขั้นตอนการอนุมัติ`,
        });
    } catch (error) {
        console.error('Error creating test leave:', error);
        return NextResponse.json(
            { error: 'Failed to create test leave', details: String(error) },
            { status: 500 }
        );
    }
}
