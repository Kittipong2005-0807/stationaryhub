import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { userId, username, email, role = 'USER', department = 'IT', siteId = 'HQ' } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // ตรวจสอบว่ามี user อยู่แล้วหรือไม่
    const existingUser = await prisma.$queryRaw`
      SELECT USER_ID FROM USERS WHERE USER_ID = ${userId}
    `

    if (existingUser && Array.isArray(existingUser) && existingUser.length > 0) {
      return NextResponse.json({ 
        error: "User already exists",
        userId: userId
      }, { status: 409 })
    }

    // สร้าง user ใหม่
    try {
      await prisma.$executeRaw`
        INSERT INTO USERS (USER_ID, USERNAME, EMAIL, PASSWORD, ROLE, DEPARTMENT, SITE_ID, CREATED_AT)
        VALUES (${userId}, ${username || userId}, ${email || userId + '@ube.co.th'}, 'ldap-auth', ${role}, ${department}, ${siteId}, GETDATE())
      `
      
      return NextResponse.json({ 
        success: true, 
        message: `User ${userId} created successfully with role ${role}`,
        user: {
          userId,
          username: username || userId,
          email: email || userId + '@ube.co.th',
          role,
          department,
          siteId
        }
      })
      
    } catch (sqlError: any) {
      console.error("SQL Error creating user:", sqlError)
      return NextResponse.json({ 
        error: "Failed to create user",
        details: sqlError.message
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
} 