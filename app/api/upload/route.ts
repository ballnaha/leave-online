import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { writeFile, mkdir, unlink, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const token = await getToken({ req: request });
        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const data = await request.json();
        const { image, type = 'avatar' } = data;

        if (!image) {
            return NextResponse.json(
                { error: 'No image provided' },
                { status: 400 }
            );
        }

        // Validate base64 image
        if (!image.startsWith('data:image/')) {
            return NextResponse.json(
                { error: 'Invalid image format' },
                { status: 400 }
            );
        }

        // Extract image data
        const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
            return NextResponse.json(
                { error: 'Invalid base64 image' },
                { status: 400 }
            );
        }

        const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // Validate file size (max 2MB after base64 decode)
        if (buffer.length > 2 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'Image size exceeds 2MB limit' },
                { status: 400 }
            );
        }

        // Generate unique filename
        const userId = token.id as string;
        const timestamp = Date.now();
        const filename = `${type}_${userId}_${timestamp}.${extension}`;

        // Determine upload directory
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', type + 's');

        // Create directory if it doesn't exist
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Delete old files for this user (cleanup old avatars)
        try {
            const files = await readdir(uploadDir);
            const userFiles = files.filter(f => f.startsWith(`${type}_${userId}_`) && !f.endsWith('.gitkeep'));
            for (const file of userFiles) {
                await unlink(path.join(uploadDir, file));
            }
        } catch {
            // Ignore errors during cleanup
        }

        // Write new file
        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);

        // Return the public URL path
        const publicPath = `/uploads/${type}s/${filename}`;

        return NextResponse.json({
            success: true,
            path: publicPath,
            filename: filename,
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload image' },
            { status: 500 }
        );
    }
}
