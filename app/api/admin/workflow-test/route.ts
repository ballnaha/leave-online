import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';
import { createApprovalSteps, resolveApproversByRole } from '@/lib/escalation';
import { ROLE_WEIGHTS } from '@/types/user-role';

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

        const requesterWeight = ROLE_WEIGHTS[user.role] || 0;

        // Case 1: If weight >= dept_manager, send directly to HR Manager
        if (requesterWeight >= ROLE_WEIGHTS.dept_manager) {
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
                message = `ตำแหน่ง ${user.role} (Lv.${requesterWeight}) จะข้ามไปหา HR Manager โดยตรง`;
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
            // Filter: Role must be STRICTLY higher than requester
            const filteredFlows = userFlows.filter(flow => {
                if (flow.approverId === user.id) return false;
                const approverWeight = ROLE_WEIGHTS[flow.approver.role] || 0;
                return approverWeight > requesterWeight;
            });

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
                    message = 'ใช้ User Flow แต่ทุกตำแหน่งต่ำกว่าหรือเท่ากับผู้ขอลา จึงส่งต่อไป HR Manager';
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
                message = 'ใช้ User-specific Approval Flow (ข้ามตำแหน่งที่เท่ากันหรือต่ำกว่า)';
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
                let potentialApprovers: any[] = [];

                if (step.approverId) {
                    // กรณีระบุตัวบุคคล
                    const approver = await prisma.user.findUnique({
                        where: { id: step.approverId },
                        select: { id: true, firstName: true, lastName: true, role: true, position: true },
                    });
                    if (approver) potentialApprovers.push(approver);
                } else if (step.approverRole) {
                    const role = step.approverRole;

                    // Skip steps where Role is lower than or equal to requester (unless HR Manager)
                    if (role !== 'hr_manager' && (ROLE_WEIGHTS[role] || 0) <= requesterWeight) {
                        continue;
                    }

                    // ใช้ Shared Function ในการหาผู้อนุมัติ
                    const matches = await resolveApproversByRole({
                        approverRole: role,
                        company: user.company,
                        department: user.department,
                        section: user.section,
                        excludeUserId: user.id,
                    });

                    potentialApprovers = matches;
                }

                for (const app of potentialApprovers) {
                    if (app.id !== user.id && (ROLE_WEIGHTS[app.role] || 0) > requesterWeight) {
                        approvalSteps.push({
                            level: step.level,
                            approverId: app.id,
                            approverName: `${app.firstName} ${app.lastName}`,
                            approverRole: app.role,
                            approverPosition: app.position || undefined,
                            isRequired: true,
                            source: 'workflow',
                        });
                    }
                }
            }

            if (approvalSteps.length > 0) {
                return NextResponse.json({
                    userId: user.id,
                    userName: `${user.firstName} ${user.lastName}`,
                    userRole: user.role,
                    approvalSteps,
                    message: message,
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

        // Create approval steps using shared logic
        await createApprovalSteps(leaveRequest.id, userId);

        // Fetch the created steps to return in response
        const createdSteps = await prisma.leaveApproval.findMany({
            where: { leaveRequestId: leaveRequest.id },
            include: {
                approver: {
                    select: { firstName: true, lastName: true }
                }
            },
            orderBy: { level: 'asc' }
        });

        const approvalSteps = createdSteps.map(s => ({
            level: s.level,
            approverId: s.approverId,
            approverName: `${s.approver.firstName} ${s.approver.lastName}`
        }));

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
