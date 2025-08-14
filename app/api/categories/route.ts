// Categories API Route (GET)
// 1. ตรวจสอบ session ด้วย getServerSession (next-auth)
// 2. ถ้าไม่มี session ให้ตอบ Unauthorized (401)
// 3. ถ้ามี session ให้ดึงข้อมูลหมวดหมู่จากฐานข้อมูล (prisma)
// 4. ส่งข้อมูลหมวดหมู่กลับในรูปแบบ JSON
// 5. ถ้าเกิด error ขณะดึงข้อมูล ตอบ Failed to fetch categories (500)

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  // Check user session
  const session = await getServerSession(authOptions)
  if (!session) {
    // If no session (not logged in) return Unauthorized
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Fetch categories from database
    const categories = await prisma.pRODUCT_CATEGORIES.findMany({
      orderBy: { CATEGORY_ID: "asc" },
    })
    
    // Return categories data
    return NextResponse.json(categories)
  } catch (error) {
    // If error occurs while fetching data
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}


