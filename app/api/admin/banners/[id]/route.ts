import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// GET - ดึงข้อมูล banner ตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const bannerId = parseInt(id);

    const banner = await prisma.banner.findUnique({
      where: { id: bannerId },
    });

    if (!banner) {
      return NextResponse.json(
        { error: 'ไม่พบ Banner ที่ต้องการ' },
        { status: 404 }
      );
    }

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Error fetching banner:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Banner' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไขข้อมูล banner
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const bannerId = parseInt(id);
    const body = await request.json();
    const { title, description, imageUrl, linkUrl, startDate, endDate, displayOrder, isActive } = body;

    if (!title || !imageUrl) {
      return NextResponse.json(
        { error: 'กรุณากรอกชื่อและอัพโหลดรูปภาพ' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า banner มีอยู่หรือไม่
    const existingBanner = await prisma.banner.findUnique({
      where: { id: bannerId },
    });

    if (!existingBanner) {
      return NextResponse.json(
        { error: 'ไม่พบ Banner ที่ต้องการแก้ไข' },
        { status: 404 }
      );
    }

    // Validate dates
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: 'วันที่เริ่มต้องไม่มากกว่าวันที่สิ้นสุด' },
        { status: 400 }
      );
    }

    // ถ้าเปลี่ยนรูปภาพ ให้ลบรูปเก่า
    if (existingBanner.imageUrl !== imageUrl && existingBanner.imageUrl.startsWith('/uploads/')) {
      try {
        const oldImagePath = path.join(process.cwd(), 'public', existingBanner.imageUrl);
        if (existsSync(oldImagePath)) {
          await unlink(oldImagePath);
        }
      } catch (err) {
        console.error('Error deleting old image:', err);
      }
    }

    const banner = await prisma.banner.update({
      where: { id: bannerId },
      data: {
        title,
        description: description || null,
        imageUrl,
        linkUrl: linkUrl || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        displayOrder: displayOrder ?? 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Error updating banner:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการแก้ไข Banner' },
      { status: 500 }
    );
  }
}

// DELETE - ลบ banner
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const bannerId = parseInt(id);

    // ตรวจสอบว่า banner มีอยู่หรือไม่
    const existingBanner = await prisma.banner.findUnique({
      where: { id: bannerId },
    });

    if (!existingBanner) {
      return NextResponse.json(
        { error: 'ไม่พบ Banner ที่ต้องการลบ' },
        { status: 404 }
      );
    }

    // ลบไฟล์รูปภาพ
    if (existingBanner.imageUrl.startsWith('/uploads/')) {
      try {
        const imagePath = path.join(process.cwd(), 'public', existingBanner.imageUrl);
        if (existsSync(imagePath)) {
          await unlink(imagePath);
        }
      } catch (err) {
        console.error('Error deleting banner image:', err);
      }
    }

    await prisma.banner.delete({
      where: { id: bannerId },
    });

    return NextResponse.json({ message: 'ลบ Banner สำเร็จ' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบ Banner' },
      { status: 500 }
    );
  }
}
