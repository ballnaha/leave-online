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
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const leaveId = parseInt(id, 10);

        if (isNaN(leaveId)) {
            return NextResponse.json({ error: 'Invalid leave ID' }, { status: 400 });
        }

        // รับเหตุผลการยกเลิก
        const body = await request.json().catch(() => ({}));
        const { cancelReason } = body;

        if (!cancelReason || cancelReason.trim() === '') {
            return NextResponse.json({ error: 'กรุณาระบุเหตุผลการยกเลิก' }, { status: 400 });
        }

        // ดึงข้อมูลใบลาพร้อม approvals
        const leaveRequest = await prisma.leaveRequest.findUnique({
            where: { id: leaveId },
            include: {
                approvals: true,
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        if (!leaveRequest) {
            return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
        }

        // ตรวจสอบว่าเป็นเจ้าของใบลาหรือไม่
        if (leaveRequest.userId !== Number(session.user.id)) {
            return NextResponse.json({ error: 'You can only cancel your own leave requests' }, { status: 403 });
        }

        // ตรวจสอบว่าสถานะเป็น pending เท่านั้น
        if (leaveRequest.status !== 'pending') {
            return NextResponse.json(
                { error: 'Only pending leave requests can be cancelled' },
                { status: 400 }
            );
        }

        // ตรวจสอบว่ายังไม่มีใคร approve
        const hasApproved = leaveRequest.approvals.some(
            (approval) => approval.status === 'approved'
        );

        if (hasApproved) {
            return NextResponse.json(
                { error: 'ไม่สามารถยกเลิกได้ เนื่องจากมีผู้อนุมัติบางท่านอนุมัติแล้ว' },
                { status: 400 }
            );
        }

        const userName = `${leaveRequest.user.firstName} ${leaveRequest.user.lastName}`;
        const cancelComment = `ผู้ขอลา (${userName}) ยกเลิกใบลา เนื่องจาก: ${cancelReason.trim()}`;

        // ใช้ transaction เพื่ออัพเดททั้งใบลาและ approvals
        const updatedLeave = await prisma.$transaction(async (tx) => {
            // อัพเดท approvals ที่ยัง pending ให้เป็น cancelled
            await tx.leaveApproval.updateMany({
                where: {
                    leaveRequestId: leaveId,
                    status: 'pending',
                },
                data: {
                    status: 'cancelled',
                    comment: cancelComment,
                    actionAt: new Date(),
                },
            });

            // อัพเดทใบลา
            return tx.leaveRequest.update({
                where: { id: leaveId },
                data: {
                    status: 'cancelled',
                    cancelReason: cancelReason.trim(),
                    cancelledAt: new Date(),
                },
                include: {
                    attachments: true,
                    approvals: {
                        include: {
                            approver: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    position: true,
                                },
                            },
                        },
                        orderBy: { level: 'asc' },
                    },
                },
            });
        });

        return NextResponse.json({
            success: true,
            message: 'Leave request cancelled successfully',
            data: updatedLeave,
        });
    } catch (error) {
        console.error('Error cancelling leave request:', error);
        return NextResponse.json(
            { error: 'Failed to cancel leave request' },
            { status: 500 }
        );
    }
}
