// Categories API Route (GET)
// 1. ตรวจสอบ session ด้วย getServerSession (next-auth)
// 2. ถ้าไม่มี session ให้ตอบ Unauthorized (401)
// 3. ถ้ามี session ให้ดึงข้อมูลหมวดหมู่จากฐานข้อมูล (prisma)
// 4. ส่งข้อมูลหมวดหมู่กลับในรูปแบบ JSON
// 5. ถ้าเกิด error ขณะดึงข้อมูล ตอบ Failed to fetch categories (500)

'use server'

import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"

export async function GET(request: NextRequest) {
  // ตรวจสอบ session ผู้ใช้งาน
  const session = await getServerSession(authOptions)
  if (!session) {
    // ถ้าไม่มี session (ยังไม่ได้ login) ตอบ Unauthorized
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // ดึงข้อมูลหมวดหมู่จากฐานข้อมูล
    const categories = await prisma.pRODUCT_CATEGORIES.findMany({
      orderBy: { CATEGORY_ID: "asc" },
    })
    
    // ส่งข้อมูลหมวดหมู่กลับ
    return NextResponse.json(categories)
  } catch (error) {
    // ถ้าเกิด error ขณะดึงข้อมูล
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}


