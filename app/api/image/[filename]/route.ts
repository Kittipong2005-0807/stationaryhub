import { NextRequest, NextResponse } from "next/server"
import { join } from "path"
import { promises as fs } from "fs"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  const { filename } = params
  const filePath = join(process.cwd(), "public", filename)

  try {
    // ตรวจสอบว่าไฟล์มีอยู่จริงหรือไม่
    await fs.access(filePath)
    
    const file = await fs.readFile(filePath)
    
    // หาประเภทไฟล์ (mime type) จากนามสกุล
    const ext = filename.split('.').pop()?.toLowerCase()
    const mimeType = ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
      ? "image/png"
      : ext === "webp"
      ? "image/webp"
      : ext === "svg"
      ? "image/svg+xml"
      : "application/octet-stream"

    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000",
        "Content-Length": file.length.toString(),
      },
    })
  } catch (error) {
    console.error("Image API Error:", error)
    return NextResponse.json({ 
      error: "Image not found",
      filename,
      filePath,
      details: error instanceof Error ? error.message : String(error)
    }, { status: 404 })
  }
} 