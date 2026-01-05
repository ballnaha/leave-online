import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';
import { writeFile, mkdir, unlink, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Route segment config for production - allow larger file uploads
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout for large uploads

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Avatar resize settings
const AVATAR_MAX_SIZE = 400; // Maximum width/height in pixels
const AVATAR_QUALITY = 85; // JPEG quality (0-100)

// Try to import sharp dynamically (optional dependency)
let sharp: any = null;
try {
    sharp = require('sharp');
} catch {
    console.log('Sharp not installed, will save original images');
}

// POST upload avatar
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdminRole(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const employeeId = formData.get('employeeId') as string | null;

        if (!file) {
            return NextResponse.json(
                { error: 'กรุณาเลือกไฟล์รูปภาพ' },
                { status: 400 }
            );
        }

        if (!employeeId) {
            return NextResponse.json(
                { error: 'ไม่พบรหัสพนักงาน กรุณาบันทึกข้อมูลผู้ใช้ก่อน' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'รองรับเฉพาะไฟล์ JPEG, PNG, WebP และ GIF เท่านั้น' },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'ขนาดไฟล์ต้องไม่เกิน 15MB' },
                { status: 400 }
            );
        }

        // Ensure upload directory exists
        if (!existsSync(UPLOAD_DIR)) {
            await mkdir(UPLOAD_DIR, { recursive: true });
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Resize image using sharp if available
        let processedBuffer: Buffer = buffer;
        let extension = 'jpg';

        if (sharp) {
            try {
                processedBuffer = await sharp(buffer)
                    .resize(AVATAR_MAX_SIZE, AVATAR_MAX_SIZE, {
                        fit: 'cover',
                        position: 'center',
                    })
                    .jpeg({ quality: AVATAR_QUALITY })
                    .toBuffer();
                extension = 'jpg';
            } catch (sharpError) {
                console.error('Sharp processing error:', sharpError);
                // Fallback: use original buffer if sharp fails
                processedBuffer = buffer;
                extension = file.name.split('.').pop() || 'jpg';
            }
        } else {
            // No sharp available, use original file extension
            extension = file.name.split('.').pop() || 'jpg';
        }

        // Generate unique filename with employeeId
        const timestamp = Date.now();
        const fileName = `avatar_${employeeId}_${timestamp}.${extension}`;
        const filePath = path.join(UPLOAD_DIR, fileName);

        // Delete old avatar files for this employee
        try {
            const files = await readdir(UPLOAD_DIR);
            const oldFiles = files.filter(f =>
                f.startsWith(`avatar_${employeeId}_`) &&
                f !== fileName &&
                !f.endsWith('.gitkeep')
            );
            for (const oldFile of oldFiles) {
                await unlink(path.join(UPLOAD_DIR, oldFile));
            }
        } catch {
            // Ignore errors during cleanup
        }

        // Write new file
        await writeFile(filePath, processedBuffer);

        // Return the public URL
        const publicUrl = `/uploads/avatars/${fileName}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            fileName: fileName,
            resized: !!sharp, // Indicate if image was resized
        });
    } catch (error) {
        console.error('Error uploading avatar:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ' },
            { status: 500 }
        );
    }
}

// DELETE avatar
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdminRole(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const avatarUrl = searchParams.get('url');

        if (!avatarUrl) {
            return NextResponse.json(
                { error: 'ไม่พบ URL รูปภาพ' },
                { status: 400 }
            );
        }

        // Extract filename from URL
        const fileName = avatarUrl.split('/').pop();
        if (!fileName) {
            return NextResponse.json(
                { error: 'ไม่สามารถระบุไฟล์ได้' },
                { status: 400 }
            );
        }

        const filePath = path.join(UPLOAD_DIR, fileName);

        // Delete file if exists
        if (existsSync(filePath)) {
            await unlink(filePath);
        }

        return NextResponse.json({
            success: true,
            message: 'ลบรูปภาพสำเร็จ'
        });
    } catch (error) {
        console.error('Error deleting avatar:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาดในการลบรูปภาพ' },
            { status: 500 }
        );
    }
}
