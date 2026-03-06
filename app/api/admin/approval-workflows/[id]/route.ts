import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === 'string' &&
    (Object.values(UserRole) as string[]).includes(value)
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = parseInt(idParam);

  try {
    await prisma.approvalWorkflow.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = parseInt(idParam);
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
    const updatedWorkflow = await prisma.approvalWorkflow.update({
      where: { id },
      data: {
        name,
        description,
        company,
        department,
        section,
        steps: {
          deleteMany: {},
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

    return NextResponse.json(updatedWorkflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = parseInt(idParam);
  const body = await request.json().catch(() => ({} as { isActive?: unknown }));
  const isActive = body?.isActive;

  if (typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const updated = await prisma.approvalWorkflow.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating workflow status:', error);
    return NextResponse.json({ error: 'Failed to update workflow status' }, { status: 500 });
  }
}
