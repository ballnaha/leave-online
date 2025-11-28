import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = parseInt(params.id);

  try {
    await (prisma as any).approvalWorkflow.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = parseInt(params.id);
  const body = await request.json();
  const { name, description, company, department, section, steps } = body;

  try {
    // Transaction to update workflow and replace steps
    const workflow = await prisma.$transaction(async (tx) => {
      const updated = await (tx as any).approvalWorkflow.update({
        where: { id },
        data: {
          name,
          description,
          company,
          department,
          section,
        }
      });

      // Delete existing steps
      await (tx as any).approvalWorkflowStep.deleteMany({
        where: { workflowId: id }
      });

      // Create new steps
      if (steps && steps.length > 0) {
        await (tx as any).approvalWorkflowStep.createMany({
          data: steps.map((step: any) => ({
            workflowId: id,
            level: step.level,
            approverRole: step.approverRole || null,
            approverId: step.approverId || null,
          }))
        });
      }

      return updated;
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
  }
}
