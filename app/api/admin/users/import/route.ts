import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

interface ImportUser {
    rowNumber: number;
    employeeId: string;
    firstName: string;
    lastName: string;
    position: string;
    startDate: string;
    department: string;
}

// POST - Import users from Excel
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin or hr
        const currentUser = await prisma.user.findUnique({
            where: { employeeId: session.user.employeeId },
            select: { role: true }
        });

        if (!currentUser || !['admin', 'hr', 'hr_manager'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }

        const body = await request.json();
        const { users, company } = body as { users: ImportUser[]; company?: string };

        if (!users || !Array.isArray(users) || users.length === 0) {
            return NextResponse.json({ error: 'No users to import' }, { status: 400 });
        }

        if (!company) {
            return NextResponse.json({ error: 'Company is required' }, { status: 400 });
        }

        let success = 0;
        let failed = 0;
        const errors: { row: number; message: string }[] = [];

        // Default password (hashed)
        const defaultPassword = await bcrypt.hash('123456', 10);

        // Process each user
        for (const user of users) {
            try {
                // Validate required fields
                if (!user.employeeId || !user.firstName || !user.startDate) {
                    throw new Error('ข้อมูลไม่ครบถ้วน');
                }

                // Check if employeeId already exists
                const existingUser = await prisma.user.findUnique({
                    where: { employeeId: user.employeeId }
                });

                if (existingUser) {
                    // Update existing user
                    await prisma.user.update({
                        where: { employeeId: user.employeeId },
                        data: {
                            firstName: user.firstName,
                            lastName: user.lastName || '',
                            position: user.position || null,
                            startDate: new Date(user.startDate),
                            company: company, // Update company
                            updatedAt: new Date(),
                        }
                    });
                    success++;
                } else {
                    // Create new user
                    // Extract department code from department name (e.g., "ฝ่ายผลิต1" -> "PROD1")
                    const departmentCode = extractDepartmentCode(user.department);

                    await prisma.user.create({
                        data: {
                            employeeId: user.employeeId,
                            password: defaultPassword,
                            firstName: user.firstName,
                            lastName: user.lastName || '',
                            gender: 'unknown', // Default, can be updated later
                            company: company, // Use selected company
                            employeeType: 'monthly', // Default type
                            department: departmentCode || 'GENERAL',
                            section: null,
                            position: user.position || null,
                            startDate: new Date(user.startDate),
                            role: 'employee',
                            isActive: true,
                        }
                    });
                    success++;
                }
            } catch (err: any) {
                failed++;
                errors.push({
                    row: user.rowNumber,
                    message: err.message || 'Unknown error'
                });
            }
        }

        return NextResponse.json({
            success,
            failed,
            errors: errors.slice(0, 20), // Limit error list
            message: `Imported ${success} users, ${failed} failed`
        });

    } catch (error: any) {
        console.error('Import error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to import users' },
            { status: 500 }
        );
    }
}

// Helper function to extract department code from Thai name
function extractDepartmentCode(departmentName: string): string {
    // Mapping of common department names to codes
    const deptMap: Record<string, string> = {
        'ฝ่ายผลิต1': 'PROD1',
        'ฝ่ายผลิต2': 'PROD2',
        'ฝ่ายผลิต': 'PROD',
        'ฝ่ายบัญชี': 'ACC',
        'ฝ่ายบุคคล': 'HR',
        'ฝ่ายขาย': 'SALES',
        'ฝ่ายคลังสินค้า': 'WH',
        'ฝ่ายจัดซื้อ': 'PURCH',
        'ฝ่ายธุรการ': 'ADMIN',
        'ฝ่ายวิศวกรรม': 'ENG',
        'ฝ่ายคุณภาพ': 'QA',
        'ฝ่ายซ่อมบำรุง': 'MAINT',
        'ฝ่ายวางแผน': 'PLAN',
    };

    return deptMap[departmentName] || 'GENERAL';
}
