import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const leaveRequestId = parseInt(id);
        const userId = parseInt(session.user.id);
        const userRole = session.user.role;

        // Check permissions: only Admin, HR Manager, HR can revoke approved leaves
        const canRevoke = ['admin', 'hr_manager', 'hr'].includes(userRole);

        if (!canRevoke) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const body = await request.json();
        const { reason } = body;

        if (!reason) {
            return NextResponse.json({ error: 'Revoke reason is required' }, { status: 400 });
        }

        // Fetch leave request
        const leaveRequest = await prisma.leaveRequest.findUnique({
            where: { id: leaveRequestId },
            include: {
                user: true,
            },
        });

        if (!leaveRequest) {
            return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
        }

        // Only allow revoking if status is 'approved'
        // (You might also allow 'in_progress' if you want to force-cancel incomplete ones too, 
        // but the user specifically asked for "if approved, can cancel?")
        if (leaveRequest.status !== 'approved') {
            return NextResponse.json(
                { error: 'Only approved leave requests can be revoked' },
                { status: 400 }
            );
        }

        const revokerName = `${session.user.firstName} ${session.user.lastName}`;
        const revokeReason = `ถูกเพิกถอนโดย ${revokerName} (${userRole}) เหตุผล: ${reason}`;

        // Perform revocation
        await prisma.$transaction(async (tx) => {
            // Update leave request status
            await tx.leaveRequest.update({
                where: { id: leaveRequestId },
                data: {
                    status: 'cancelled',
                    cancelReason: revokeReason,
                    cancelledAt: new Date(),
                },
            });

            // You might ideally want to record this event somewhere else too, 
            // but for now, reusing cancel fields is the most compatible way without schema changes.
        });

        // TODO: Send notification to user about revocation if needed

        return NextResponse.json({
            success: true,
            message: 'Leave request revoked successfully',
        });

    } catch (error) {
        console.error('Error revoking leave:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
