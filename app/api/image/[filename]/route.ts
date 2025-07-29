import { NextRequest, NextResponse } from "next/server"
import { join } from "path"
import { promises as fs } from "fs"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  const { filename } = params
  const filePath = join(process.cwd(), "public", filename)

  try {
    const file = await fs.readFile(filePath)
    // หาประเภทไฟล์ (mime type) จากนามสกุล
    const ext = filename.split('.').pop()?.toLowerCase()
    const mimeType = ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
      ? "image/png"
      : ext === "svg"
      ? "image/svg+xml"
      : "application/octet-stream"

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 })
  }
} 