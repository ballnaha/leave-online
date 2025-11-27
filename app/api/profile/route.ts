import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'ไม่พบข้อมูลผู้ใช้' },
                { status: 404 }
            );
        }

        // Get department and section names from database
        const departmentData = await prisma.department.findFirst({
            where: { code: user.department },
            select: { name: true },
        });

        const sectionData = user.section ? await prisma.section.findFirst({
            where: { code: user.section },
            select: { name: true },
        }) : null;

        // Get company name
        const companyData = await prisma.company.findFirst({
            where: { code: user.company },
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
            { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
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
        const { firstName, lastName, email, company, employeeType, department, section, shift, avatar } = body;

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
