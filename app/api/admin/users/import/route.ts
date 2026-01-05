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
    gender: 'male' | 'female' | '';
    position: string;
    startDate: string;
    department: string;
    section: string;
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

        // Fetch departments and sections for the selected company only
        const departments = await prisma.department.findMany({
            where: {
                isActive: true,
                company: company  // Filter by selected company
            },
            include: { sections: { where: { isActive: true } } }
        });

        // Build lookup maps (name -> code) for departments and sections within this company
        const deptNameToCode = new Map<string, string>();
        const sectionNameToCode = new Map<string, { code: string; deptCode: string }>();

        departments.forEach(dept => {
            // Add by exact name match
            deptNameToCode.set(dept.name.trim(), dept.code);
            deptNameToCode.set(dept.name.toLowerCase().trim(), dept.code);

            // Also match "ฝ่าย" prefix variations
            if (dept.name.startsWith('ฝ่าย')) {
                deptNameToCode.set(dept.name.trim(), dept.code);
            } else {
                deptNameToCode.set(`ฝ่าย${dept.name}`.trim(), dept.code);
            }

            // Add sections for this department
            dept.sections.forEach(section => {
                const sectionName = section.name.trim();
                sectionNameToCode.set(sectionName, { code: section.code, deptCode: dept.code });
                sectionNameToCode.set(sectionName.toLowerCase(), { code: section.code, deptCode: dept.code });

                // Also match "แผนก" prefix variations
                if (!sectionName.startsWith('แผนก')) {
                    sectionNameToCode.set(`แผนก${sectionName}`, { code: section.code, deptCode: dept.code });
                }
            });
        });

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

                // Convert gender to database format
                const genderValue = user.gender === 'male' ? 'male' : user.gender === 'female' ? 'female' : 'unknown';

                // Find section info from database
                const sectionInfo = findSectionInfo(user.section, sectionNameToCode);
                const sectionCode = sectionInfo?.code || null;

                // Resolve department: 
                // 1. If section is recognized in DB, always follow its parent department
                // 2. Otherwise, use the department name from Excel
                let departmentCode = 'GENERAL';
                if (sectionInfo) {
                    departmentCode = sectionInfo.deptCode;
                } else if (user.department) {
                    departmentCode = findDepartmentCode(user.department, deptNameToCode);
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
                            gender: genderValue,
                            position: user.position || null,
                            startDate: new Date(user.startDate),
                            company: company,
                            department: departmentCode,
                            section: sectionCode,
                            updatedAt: new Date(),
                        }
                    });
                    success++;
                } else {
                    // Create new user
                    await prisma.user.create({
                        data: {
                            employeeId: user.employeeId,
                            password: defaultPassword,
                            firstName: user.firstName,
                            lastName: user.lastName || '',
                            gender: genderValue,
                            company: company,
                            employeeType: 'monthly',
                            department: departmentCode,
                            section: sectionCode,
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
            errors: errors.slice(0, 20),
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

// Helper function to find department code from name (using database lookup)
function findDepartmentCode(departmentName: string, deptMap: Map<string, string>): string {
    if (!departmentName) return 'GENERAL';

    const trimmedName = departmentName.trim();

    // Try exact match first
    if (deptMap.has(trimmedName)) {
        return deptMap.get(trimmedName)!;
    }

    // Try lowercase match
    if (deptMap.has(trimmedName.toLowerCase())) {
        return deptMap.get(trimmedName.toLowerCase())!;
    }

    // Try partial match (contains)
    for (const [name, code] of deptMap.entries()) {
        if (trimmedName.includes(name) || name.includes(trimmedName)) {
            return code;
        }
    }

    // Default if no match found
    return 'GENERAL';
}

// Helper function to find section info from name (using database lookup)
function findSectionInfo(sectionName: string, sectionMap: Map<string, { code: string; deptCode: string }>): { code: string; deptCode: string } | null {
    if (!sectionName) return null;

    const trimmedName = sectionName.trim();

    // 1. Try exact match first (case-insensitive)
    if (sectionMap.has(trimmedName)) {
        return sectionMap.get(trimmedName)!;
    }
    if (sectionMap.has(trimmedName.toLowerCase())) {
        return sectionMap.get(trimmedName.toLowerCase())!;
    }

    // 2. Try matching without "แผนก" prefix if the input has it
    if (trimmedName.startsWith('แผนก')) {
        const withoutPrefix = trimmedName.substring(4).trim();
        if (sectionMap.has(withoutPrefix)) {
            return sectionMap.get(withoutPrefix)!;
        }
    }

    // 3. Try partial match as fallback, but must be at least 3 chars
    if (trimmedName.length >= 3) {
        for (const [name, info] of sectionMap.entries()) {
            if (trimmedName.includes(name) || name.includes(trimmedName)) {
                return info;
            }
        }
    }

    return null;
}

