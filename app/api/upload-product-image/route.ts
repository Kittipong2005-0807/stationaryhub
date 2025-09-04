import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." 
      }, { status: 400 })
    }

    // ตรวจสอบขนาดไฟล์ (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "File too large. Maximum size is 5MB." 
      }, { status: 400 })
    }

    // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `product_${timestamp}_${randomString}.${fileExtension}`

    // บันทึกไฟล์ลงโฟลเดอร์ public โดยตรง
    const uploadDir = join(process.cwd(), "public")
    const filePath = join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // ส่ง URL กลับไป
    const imageUrl = `/${fileName}`

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      fileName,
      message: "Image uploaded successfully" 
    })

  } catch (error) {
    console.error("Error uploading image:", error)
    return NextResponse.json({ 
      error: "Failed to upload image" 
    }, { status: 500 })
  }
}
