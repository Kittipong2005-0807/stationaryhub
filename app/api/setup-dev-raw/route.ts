import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // ใช้ raw SQL เพื่อ bypass constraint
    try {
      // ลองอัปเดต user ที่มีอยู่
      const updateResult = await prisma.$executeRaw`
        UPDATE USERS 
        SET ROLE = 'DEV' 
        WHERE USER_ID = ${userId}
      `
      
      // ตรวจสอบว่ามี user อยู่หรือไม่
      const user = await prisma.$queryRaw`
        SELECT USER_ID, USERNAME, EMAIL, ROLE 
        FROM USERS 
        WHERE USER_ID = ${userId}
      `
      
      if (!user || (user as any[]).length === 0) {
        // สร้าง user ใหม่ถ้าไม่พบ
        await prisma.$executeRaw`
          INSERT INTO USERS (USER_ID, USERNAME, EMAIL, PASSWORD, ROLE, DEPARTMENT, SITE_ID, CREATED_AT)
          VALUES (${userId}, ${userId}, ${userId + '@ube.co.th'}, 'ldap-auth', 'DEV', 'IT', 'HQ', GETDATE())
        `
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `User ${userId} has been set as DEV using raw SQL`,
        method: 'raw_sql'
      })
      
    } catch (sqlError: any) {
      console.error("Raw SQL error:", sqlError)
      
      // ถ้า raw SQL ไม่ได้ ให้ลองวิธีอื่น
      return NextResponse.json({ 
        error: "Failed to setup dev with raw SQL. Please check database constraints.",
        details: sqlError.message
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error("Error setting up dev:", error)
    return NextResponse.json({ error: "Failed to setup dev" }, { status: 500 })
  }
} 