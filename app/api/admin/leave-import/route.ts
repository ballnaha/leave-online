import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';

// Helper to generate leave code (copied from app/api/leaves/route.ts or similar)
const leaveTypeCodeMap: Record<string, string> = {
    'sick': 'SK',
    'personal': 'PS',
    'vacation': 'VC',
    'maternity': 'MT',
    'ordination': 'OR',
    'work_outside': 'WO',
    'absent': 'AB',
    'sick_no_pay': 'SN',
    'personal_no_pay': 'PN',
    'paternity_care': 'PC',
    'other': 'OT',
    // Thai names support
    'ลาป่วย': 'SK',
    'ลากิจ': 'PS',
    'พักร้อน': 'VC',
    'ลาพักร้อน': 'VC',
    'ลาคลอด': 'MT',
    'การคลอด': 'MT',
    'ลาบวช': 'OR',
    'การบวช': 'OR',
    'ลาป่วยไม่รับค่าจ้าง': 'SN',
    'ลากิจไม่รับค่าจ้าง': 'PN',
    'ลาเลี้ยงดูบุตร': 'PC',
};

async function generateLeaveCode(leaveType: string, date: Date): Promise<string> {
    const typeCode = leaveTypeCodeMap[leaveType] || 'OT';
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `#${typeCode}${year}${month}`;

    const lastLeave = await prisma.leaveRequest.findFirst({
        where: {
            leaveCode: {
                startsWith: prefix,
            },
        },
        orderBy: {
            leaveCode: 'desc',
        },
        select: {
            leaveCode: true,
        },
    });

    let runningNumber = 1;
    if (lastLeave?.leaveCode) {
        const lastNumber = parseInt(lastLeave.leaveCode.slice(-3), 10);
        if (!isNaN(lastNumber)) {
            runningNumber = lastNumber + 1;
        }
    }

    return `${prefix}${String(runningNumber).padStart(3, '0')}`;
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdminRole(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { leaves, year } = body;

        if (!leaves || !Array.isArray(leaves)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as { employeeId: string; message: string }[]
        };

        // Fetch all active leave types for mapping
        const leaveTypes = await prisma.leaveType.findMany({
            where: { isActive: true }
        });

        // Use a transaction or sequential processing
        // Sequential is safer for generating unique codes in this simple case
        for (const item of leaves) {
            try {
                const { employeeId, leaveType: typeName, totalDays } = item;

                if (!employeeId || !typeName || totalDays === undefined) {
                    results.failed++;
                    results.errors.push({ employeeId: employeeId || 'Unknown', message: 'Missing required fields' });
                    continue;
                }

                // 1. Find User
                const user = await prisma.user.findUnique({
                    where: { employeeId: String(employeeId) }
                });

                if (!user) {
                    results.failed++;
                    results.errors.push({ employeeId: String(employeeId), message: 'Employee not found' });
                    continue;
                }

                // 2. Find/Map Leave Type
                let leaveType = leaveTypes.find(t =>
                    t.code.toLowerCase() === typeName.toLowerCase() ||
                    t.name.toLowerCase() === typeName.toLowerCase()
                );

                if (!leaveType) {
                    // Try to map from our pre-defined Thai map
                    const code = leaveTypeCodeMap[typeName];
                    if (code) {
                        leaveType = leaveTypes.find(t => t.code === code);
                    }
                }

                if (!leaveType) {
                    results.failed++;
                    results.errors.push({ employeeId: String(employeeId), message: `Leave type "${typeName}" not found` });
                    continue;
                }

                // 3. Create Leave Request
                // Set date to Jan 1st of the specified year
                const startDate = new Date(year, 0, 1);
                const endDate = new Date(year, 0, 1);

                const leaveCode = await generateLeaveCode(leaveType.code, startDate);

                await prisma.leaveRequest.create({
                    data: {
                        userId: user.id,
                        leaveCode,
                        leaveType: leaveType.code,
                        startDate,
                        endDate,
                        totalDays: parseFloat(totalDays),
                        reason: 'นำเข้าข้อมูลย้อนหลัง (Imported)',
                        status: 'approved',
                        currentLevel: 99, // Final level
                        finalApprovedAt: new Date(),
                        finalApprovedBy: parseInt(session.user.id),
                    }
                });

                results.success++;
            } catch (err: any) {
                console.error(`Error importing row for ${item.employeeId}:`, err);
                results.failed++;
                results.errors.push({ employeeId: item.employeeId, message: err.message });
            }
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error('Error in leave import:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
