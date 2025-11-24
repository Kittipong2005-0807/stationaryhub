import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { promises as fs } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  // `params` can be a Promise in some Next versions — resolve if needed
  const resolvedParams = (params && typeof (params as any).then === 'function') ? await params : params;
  const filename = resolvedParams?.filename;

  // ใช้ PATH_FILE_URL แทน process.cwd() + "public"
  const pathFileUrl = process.env.PATH_FILE_URL || 'D:/stationaryhub';

  // ถ้า filename ถูกส่งมาเป็น URL เต็ม ๆ (เช่น จาก PHOTO_URL) ให้ตอบว่าไม่พบ
  if (!filename || filename.includes('://') || filename.startsWith('http')) {
    console.error('Image API: invalid filename requested:', filename);
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  // ป้องกัน path traversal และใช้เฉพาะชื่อไฟล์จริง
  const safeName = filename.split('/').pop() || filename;
  const filePath = join(pathFileUrl, safeName);

  try {
    // ตรวจสอบว่าไฟล์มีอยู่จริงหรือไม่
    await fs.access(filePath);

    const file = await fs.readFile(filePath);

    // หาประเภทไฟล์ (mime type) จากนามสกุล
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeType =
      ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'png'
          ? 'image/png'
          : ext === 'webp'
            ? 'image/webp'
            : ext === 'svg'
              ? 'image/svg+xml'
              : 'application/octet-stream';

    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000',
        'Content-Length': file.length.toString()
      }
    });
  } catch (error) {
    console.error('Image API Error:', error);
    return NextResponse.json(
      {
        error: 'Image not found',
        filename,
        filePath,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 404 }
    );
  }
}
