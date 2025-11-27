import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface AttachmentPayload {
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            leaveType,
            startDate,
            startTime,
            endDate,
            endTime,
            totalDays,
            reason,
            contactPhone,
            contactAddress,
            status = 'pending',
            attachments = [],
        } = body;

        if (!leaveType || !startDate || !endDate || !totalDays || !reason) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json(
                { error: 'Invalid date format' },
                { status: 400 }
            );
        }

        if (end < start) {
            return NextResponse.json(
                { error: 'End date cannot be before start date' },
                { status: 400 }
            );
        }

        const attachmentList: AttachmentPayload[] = Array.isArray(attachments)
            ? attachments
            : [];

        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                userId: Number(session.user.id),
                leaveType,
                startDate: start,
                startTime,
                endDate: end,
                endTime,
                totalDays: Number(totalDays),
                reason,
                contactPhone,
                contactAddress,
                status,
                attachments:
                    attachmentList.length > 0
                        ? {
                              create: attachmentList.map((file: AttachmentPayload) => ({
                                  fileName: file.fileName,
                                  filePath: file.filePath,
                                  fileSize: file.fileSize,
                                  mimeType: file.mimeType,
                              })),
                          }
                        : undefined,
            },
            include: {
                attachments: true,
            },
        });

        return NextResponse.json({ success: true, data: leaveRequest }, { status: 201 });
    } catch (error) {
        console.error('Error creating leave request:', error);
        return NextResponse.json(
            { error: 'Failed to create leave request' },
            { status: 500 }
        );
    }
}
