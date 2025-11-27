import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import path from 'path';
import { mkdir, writeFile, unlink } from 'fs/promises';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_IMAGE_DIMENSION = 1600; // px, keep quality but avoid huge files

const deriveExtension = (fileName: string, mimeType: string) => {
    switch (mimeType) {
        case 'image/jpeg':
            return '.jpg';
        case 'image/png':
            return '.png';
        case 'image/webp':
            return '.webp';
        case 'image/heic':
        case 'image/heif':
            return '.jpg';
        case 'application/pdf':
            return '.pdf';
        default:
            break;
    }

    const ext = path.extname(fileName)?.toLowerCase();
    return ext || '';
};

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file');
        const leaveType = (formData.get('leaveType') || 'leave').toString();

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File exceeds 15MB limit' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        let buffer: Buffer = Buffer.from(new Uint8Array(arrayBuffer));
        let mimeType = file.type || 'application/octet-stream';

        if (mimeType === 'image/heic' || mimeType === 'image/heif') {
            try {
                const converted = await heicConvert({
                    buffer,
                    format: 'JPEG',
                    quality: 0.8,
                });
                buffer = Buffer.from(new Uint8Array(converted));
                mimeType = 'image/jpeg';
            } catch (heicError) {
                console.error('HEIC convert error:', heicError);
                return NextResponse.json({ error: 'ไม่สามารถประมวลผลไฟล์ HEIC ได้' }, { status: 400 });
            }
        }

        if (mimeType.startsWith('image/')) {
            const transformer = sharp(buffer)
                .rotate()
                .resize({
                    width: MAX_IMAGE_DIMENSION,
                    height: MAX_IMAGE_DIMENSION,
                    fit: 'inside',
                    withoutEnlargement: true,
                });

            if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
                buffer = await transformer.jpeg({ quality: 80 }).toBuffer();
                mimeType = 'image/jpeg';
            } else if (mimeType === 'image/png') {
                buffer = await transformer.png({ compressionLevel: 9 }).toBuffer();
                mimeType = 'image/png';
            } else if (mimeType === 'image/webp') {
                buffer = await transformer.webp({ quality: 80 }).toBuffer();
                mimeType = 'image/webp';
            } else if (mimeType === 'image/heic' || mimeType === 'image/heif') {
                buffer = await transformer.jpeg({ quality: 80 }).toBuffer();
                mimeType = 'image/jpeg';
            } else {
                buffer = await transformer.jpeg({ quality: 80 }).toBuffer();
                mimeType = 'image/jpeg';
            }
        }

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'leave-attachments');
        await mkdir(uploadDir, { recursive: true });

        const extension = deriveExtension(file.name || 'attachment', mimeType);
        const safeLeaveType = leaveType.replace(/[^a-zA-Z0-9_-]/g, '') || 'leave';
        const employeeId = session.user.employeeId || session.user.id;
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 1_000_000);
        const fileName = `${safeLeaveType}_${employeeId}_${timestamp}_${randomSuffix}${extension}`;
        const filePath = path.join(uploadDir, fileName);

        await writeFile(filePath, buffer);

        const publicPath = `/uploads/leave-attachments/${fileName}`;

        return NextResponse.json(
            {
                success: true,
                file: {
                    fileName,
                    filePath: publicPath,
                    fileSize: buffer.length,
                    mimeType,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Leave attachment upload error:', error);
        return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { filePath } = await request.json();
        if (!filePath || typeof filePath !== 'string' || !filePath.startsWith('/uploads/leave-attachments/')) {
            return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
        }

        const absolutePath = path.join(process.cwd(), 'public', filePath);
        await unlink(absolutePath).catch(() => undefined);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete attachment error:', error);
        return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
    }
}
