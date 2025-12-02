import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.employeeId) {
            return NextResponse.json(
                { error: 'ไม่พบข้อมูลผู้ใช้' },
                { status: 401 }
            );
        }

        const user = await prisma.user.findUnique({
            where: {
                employeeId: session.user.employeeId,
            },
            select: {
                id: true,
                employeeId: true,
                email: true,
                firstName: true,
                lastName: true,
                avatar: true,
                company: true,
                employeeType: true,
                position: true,
                department: true,
                section: true,
                shift: true,
                startDate: true,
                role: true,
                isActive: true,
                createdAt: true,
                gender: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'ไม่พบข้อมูลผู้ใช้' },
                { status: 404 }
            );
        }

        // Get department and section names from database
        const departmentData = user.department
            ? await prisma.department.findFirst({
                where: {
                    code: {
                        equals: user.department,
                    },
                },
                select: { name: true },
            })
            : null;

        const sectionData = user.section
            ? await prisma.section.findFirst({
                where: {
                    code: {
                        equals: user.section,
                    },
                },
                select: { name: true },
            })
            : null;

        // Get company name
        const companyData = await prisma.company.findFirst({
            where: {
                code: {
                    equals: user.company,
                },
            },
            select: { name: true },
        });

        return NextResponse.json({
            ...user,
            departmentName: departmentData?.name || user.department,
            sectionName: sectionData?.name || user.section,
            companyName: companyData?.name || user.company,
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล: ' + (error instanceof Error ? error.message : String(error)) },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.employeeId) {
            return NextResponse.json(
                { error: 'ไม่พบข้อมูลผู้ใช้' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { firstName, lastName, email, company, employeeType, department, section, shift, avatar, gender, currentPassword, newPassword, confirmPassword } = body;

        // Validation
        if (!firstName?.trim()) {
            return NextResponse.json(
                { error: 'กรุณากรอกชื่อ' },
                { status: 400 }
            );
        }

        if (!lastName?.trim()) {
            return NextResponse.json(
                { error: 'กรุณากรอกนามสกุล' },
                { status: 400 }
            );
        }

        // Check if email is already used by another user
        if (email) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    email: email,
                    NOT: {
                        employeeId: session.user.employeeId,
                    },
                },
            });

            if (existingUser) {
                return NextResponse.json(
                    { error: 'อีเมลนี้ถูกใช้งานแล้ว' },
                    { status: 400 }
                );
            }
        }

        // Optional password change validation
        if (newPassword || currentPassword || confirmPassword) {
            if (!currentPassword || !newPassword || !confirmPassword) {
                return NextResponse.json(
                    { error: 'กรุณากรอกรหัสผ่านปัจจุบัน รหัสผ่านใหม่ และยืนยันรหัสผ่าน' },
                    { status: 400 }
                );
            }

            if (newPassword !== confirmPassword) {
                return NextResponse.json(
                    { error: 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน' },
                    { status: 400 }
                );
            }

            if (newPassword.length < 6) {
                return NextResponse.json(
                    { error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' },
                    { status: 400 }
                );
            }

            const userForPassword = await prisma.user.findUnique({
                where: { employeeId: session.user.employeeId },
                select: { password: true },
            });

            if (!userForPassword?.password) {
                return NextResponse.json(
                    { error: 'ไม่สามารถตรวจสอบรหัสผ่านได้' },
                    { status: 400 }
                );
            }

            const isValid = await bcrypt.compare(String(currentPassword), userForPassword.password);
            if (!isValid) {
                return NextResponse.json(
                    { error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' },
                    { status: 400 }
                );
            }
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: {
                employeeId: session.user.employeeId,
            },
            data: {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email?.trim() || null,
                avatar: avatar || null,
                company: company || undefined,
                employeeType: employeeType || undefined,
                department: department || undefined,
                section: section || null,
                shift: shift || null,
                gender: gender || undefined,
                ...(newPassword && currentPassword && confirmPassword
                    ? { password: await bcrypt.hash(String(newPassword), 12) }
                    : {}),
            },
        });

        return NextResponse.json({
            message: 'บันทึกข้อมูลสำเร็จ',
            user: updatedUser,
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
            { status: 500 }
        );
    }
}
