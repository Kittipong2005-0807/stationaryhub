import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // อัปเดต Role ในตาราง USERS
    const updateResult = await prisma.uSERS.updateMany({
      where: {
        EMAIL: email
      },
      data: {
        ROLE: 'ADMIN'
      }
    })

    if (updateResult.count === 0) {
      // ถ้าไม่พบในตาราง USERS ให้สร้างใหม่
      await prisma.uSERS.create({
        data: {
          USER_ID: email.split('@')[0], // ใช้ username เป็น USER_ID
          USERNAME: email.split('@')[0],
          EMAIL: email,
          PASSWORD: 'ldap-auth', // ไม่ใช้ password เพราะใช้ LDAP
          ROLE: 'ADMIN',
          DEPARTMENT: 'IT',
          SITE_ID: 'HQ'
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: `User ${email} has been set as ADMIN`,
      updatedCount: updateResult.count
    })
  } catch (error) {
    console.error("Error setting up admin:", error)
    return NextResponse.json({ error: "Failed to setup admin" }, { status: 500 })
  }
} 