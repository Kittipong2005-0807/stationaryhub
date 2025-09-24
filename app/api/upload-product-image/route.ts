import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getBasePathUrl } from '@/lib/base-path';
import { ThaiTimeUtils } from '@/lib/thai-time-utils';

// ฟังก์ชันสำหรับลบไฟล์รูปภาพ
async function deleteImageFile(filename: string): Promise<boolean> {
  try {
    const pathFileUrl = process.env.PATH_FILE_URL || 'D:/stationaryhub';
    const filePath = join(pathFileUrl, filename);

    if (existsSync(filePath)) {
      await unlink(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting image file:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const oldImageUrl = formData.get('oldImageUrl') as string; // รูปเก่าที่ต้องลบ

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
        },
        { status: 400 }
      );
    }

    // ตรวจสอบขนาดไฟล์ (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: 'File too large. Maximum size is 5MB.'
        },
        { status: 400 }
      );
    }

    // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
    const timestamp = ThaiTimeUtils.getCurrentThaiTimestamp();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `product_${timestamp}_${randomString}.${fileExtension}`;

    // ลบรูปเก่าก่อน (ถ้ามี)
    if (oldImageUrl && oldImageUrl.trim() !== '') {
      await deleteImageFile(oldImageUrl);
    }

    // บันทึกไฟล์ลงโฟลเดอร์ PATH_FILE_URL
    const pathFileUrl = process.env.PATH_FILE_URL || 'D:/stationaryhub';
    const uploadDir = pathFileUrl;
    const filePath = join(uploadDir, fileName);

    // สร้างโฟลเดอร์หากไม่มี
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // ส่ง URL กลับไป (ส่งแค่ filename)
    const imageUrl = fileName;

    return NextResponse.json({
      success: true,
      imageUrl,
      fileName,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload image'
      },
      { status: 500 }
    );
  }
}

// DELETE method สำหรับลบรูปภาพ
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    const deleted = await deleteImageFile(filename);

    if (deleted) {
      return NextResponse.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Image not found or already deleted'
      });
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete image'
      },
      { status: 500 }
    );
  }
}
