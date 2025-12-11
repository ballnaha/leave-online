import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leave.poonsubcan.co.th';

// GET - Fetch stats and recent broadcasts
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdminRole(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get device stats and lookup tables
        const [
            activeSubscribers,
            totalSubscribers,
            companies,
            departments,
            sections,
            recentLogs
        ] = await Promise.all([
            prisma.userDevice.count({ where: { isActive: true } }),
            prisma.userDevice.count(),
            prisma.company.findMany({
                where: { isActive: true },
                select: { code: true, name: true },
                orderBy: { name: 'asc' }
            }),
            prisma.department.findMany({
                where: { isActive: true },
                select: { code: true, name: true, company: true },
                orderBy: { name: 'asc' }
            }),
            prisma.section.findMany({
                where: { isActive: true },
                select: { code: true, name: true, department: { select: { code: true, company: true } } },
                orderBy: { name: 'asc' }
            }),
            prisma.notificationLog.findMany({
                where: { type: 'broadcast' },
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: {
                    user: {
                        select: { firstName: true, lastName: true }
                    }
                }
            }),
        ]);

        return NextResponse.json({
            config: {
                appIdConfigured: !!ONESIGNAL_APP_ID,
                apiKeyConfigured: !!ONESIGNAL_REST_API_KEY,
            },
            stats: {
                totalSubscribers,
                activeSubscribers,
                companies: companies.map(c => ({ code: c.code, name: c.name })),
                departments: departments.map(d => ({ code: d.code, name: d.name, companyCode: d.company })),
                sections: sections.map(s => ({
                    code: s.code,
                    name: s.name,
                    departmentCode: s.department.code,
                    companyCode: s.department.company
                })),
            },
            recentLogs,
        });

    } catch (error) {
        console.error('Error fetching broadcast data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch data' },
            { status: 500 }
        );
    }
}

// POST - Send broadcast notification
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdminRole(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
            return NextResponse.json({
                success: false,
                error: 'OneSignal not configured'
            }, { status: 400 });
        }

        const { title, message, targetType, targetCompany, targetDepartment, targetSection, url } = await req.json();

        if (!title || !message) {
            return NextResponse.json({
                success: false,
                error: 'Title and message are required'
            }, { status: 400 });
        }

        // Build player IDs based on target type
        let playerIds: string[] = [];
        let targetDescription = '';

        if (targetType === 'all') {
            // Send to all active subscribers
            const devices = await prisma.userDevice.findMany({
                where: { isActive: true },
                select: { playerId: true }
            });
            playerIds = devices.map(d => d.playerId);
            targetDescription = 'พนักงานทุกคน';
        } else if (targetType === 'company' && targetCompany) {
            // Send to specific company
            const devices = await prisma.userDevice.findMany({
                where: {
                    isActive: true,
                    user: { company: targetCompany, isActive: true }
                },
                select: { playerId: true }
            });
            playerIds = devices.map(d => d.playerId);
            // Get company name for description
            const company = await prisma.company.findUnique({ where: { code: targetCompany } });
            targetDescription = `บริษัท: ${company?.name || targetCompany}`;
        } else if (targetType === 'department' && targetDepartment) {
            // Send to specific department
            const devices = await prisma.userDevice.findMany({
                where: {
                    isActive: true,
                    user: { department: targetDepartment, isActive: true }
                },
                select: { playerId: true }
            });
            playerIds = devices.map(d => d.playerId);
            // Get department name for description
            const dept = await prisma.department.findUnique({ where: { code: targetDepartment } });
            targetDescription = `ฝ่าย: ${dept?.name || targetDepartment}`;
        } else if (targetType === 'section' && targetSection) {
            // Send to specific section
            const devices = await prisma.userDevice.findMany({
                where: {
                    isActive: true,
                    user: { section: targetSection, isActive: true }
                },
                select: { playerId: true }
            });
            playerIds = devices.map(d => d.playerId);
            // Get section name for description
            const section = await prisma.section.findUnique({ where: { code: targetSection } });
            targetDescription = `แผนก: ${section?.name || targetSection}`;
        } else {
            return NextResponse.json({
                success: false,
                error: 'Invalid target configuration'
            }, { status: 400 });
        }

        if (playerIds.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'ไม่พบผู้รับในกลุ่มเป้าหมาย'
            }, { status: 400 });
        }

        // Send via OneSignal
        const notificationPayload: any = {
            app_id: ONESIGNAL_APP_ID,
            include_player_ids: playerIds,
            headings: { en: title, th: title },
            contents: { en: message, th: message },
            url: url || APP_URL,
            data: {
                type: 'broadcast',
                sentBy: session.user.name || 'Admin',
                sentAt: new Date().toISOString(),
                targetType,
                targetDescription,
            },
        };

        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify(notificationPayload),
        });

        const result = await response.json();

        if (response.ok && result.id) {
            // Log the broadcast (using admin user ID)
            const adminUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        { employeeId: session.user.employeeId },
                        { email: session.user.email }
                    ]
                }
            });

            if (adminUser) {
                await prisma.notificationLog.create({
                    data: {
                        userId: adminUser.id,
                        type: 'broadcast',
                        title,
                        message,
                        oneSignalId: result.id,
                        status: 'sent',
                        data: {
                            targetType,
                            targetDescription,
                            recipientCount: playerIds.length,
                            url: url || null,
                        },
                    }
                });
            }

            return NextResponse.json({
                success: true,
                message: `ส่งประกาศสำเร็จ (${targetDescription})`,
                oneSignalId: result.id,
                recipients: result.recipients || playerIds.length,
            });
        } else {
            console.error('OneSignal error:', result);
            return NextResponse.json({
                success: false,
                error: result.errors?.[0] || 'Failed to send broadcast',
                details: result,
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Error sending broadcast:', error);
        return NextResponse.json(
            { error: 'Failed to send broadcast' },
            { status: 500 }
        );
    }
}
