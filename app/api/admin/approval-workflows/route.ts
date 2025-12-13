import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma, UserRole } from '@prisma/client';

function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === 'string' &&
    (Object.values(UserRole) as string[]).includes(value)
  );
}

type WorkflowWithSteps = Prisma.ApprovalWorkflowGetPayload<{
  include: {
    steps: true;
  };
}>;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const department = searchParams.get('department');

    const where: Prisma.ApprovalWorkflowWhereInput = {};
    if (company) where.company = company;
    if (department) where.department = department;

    const workflows = await prisma.approvalWorkflow.findMany({
      where,
      include: {
        steps: {
          orderBy: { level: 'asc' },
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Manually populate approver details if needed, or just return IDs
    // For the UI, we probably want names.
    // Let's fetch all referenced users.
    const userIds = new Set<number>();
    (workflows as WorkflowWithSteps[]).forEach((w) => {
      w.steps.forEach((s) => {
        if (s.approverId) userIds.add(s.approverId);
      });
    });

    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, firstName: true, lastName: true, email: true }
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const enrichedWorkflows = (workflows as WorkflowWithSteps[]).map((w) => ({
      ...w,
      steps: w.steps.map((s) => ({
        ...s,
        approver: s.approverId ? (userMap.get(s.approverId) ?? null) : null,
      }))
    }));

    return NextResponse.json(enrichedWorkflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    name: string;
    description?: string;
    company?: string;
    department?: string;
    section?: string;
    steps?: Array<{
      level: number;
      approverRole?: string | null;
      approverId?: number | null;
    }>;
  };
  const { name, description, company, department, section, steps } = body;

  if (steps?.length) {
    const invalid = steps
      .map((s, idx) => ({ idx, role: s.approverRole }))
      .filter((x) => x.role != null && x.role !== '' && !isUserRole(x.role));

    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid approverRole',
          details: invalid.map((x) => ({ index: x.idx, approverRole: x.role })),
        },
        { status: 400 }
      );
    }
  }

  try {
    const workflow = await prisma.approvalWorkflow.create({
      data: {
        name,
        description,
        company,
        department,
        section,
        steps: {
          create: (steps ?? []).map((step) => ({
            level: step.level,
            approverRole:
              step.approverRole && isUserRole(step.approverRole)
                ? step.approverRole
                : null,
            approverId: step.approverId || null,
          })),
        }
      },
      include: {
        steps: true
      }
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
  }
}
