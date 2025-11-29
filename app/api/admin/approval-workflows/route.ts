import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const department = searchParams.get('department');

    const where: any = {};
    if (company) where.company = company;
    if (department) where.department = department;

    const workflows = await (prisma as any).approvalWorkflow.findMany({
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
    workflows.forEach((w: any) => {
        w.steps.forEach((s: any) => {
            if (s.approverId) userIds.add(s.approverId);
        });
    });

    const users = await prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, firstName: true, lastName: true, email: true }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const enrichedWorkflows = workflows.map((w: any) => ({
        ...w,
        steps: w.steps.map((s: any) => ({
            ...s,
            approver: s.approverId ? userMap.get(s.approverId) : null
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

  const body = await request.json();
  const { name, description, company, department, section, steps } = body;

  try {
    const workflow = await (prisma as any).approvalWorkflow.create({
      data: {
        name,
        description,
        company,
        department,
        section,
        steps: {
          create: steps.map((step: any) => ({
            level: step.level,
            approverRole: step.approverRole || null,
            approverId: step.approverId || null,
          }))
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
