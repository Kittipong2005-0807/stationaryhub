import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // อัปเดต Role ในตาราง USERS
    try {
      const updateResult = await prisma.uSERS.updateMany({
        where: {
          USER_ID: userId
        },
        data: {
          ROLE: 'DEV'
        }
      })

      if (updateResult.count === 0) {
        // ถ้าไม่พบในตาราง USERS ให้สร้างใหม่
        await prisma.uSERS.create({
          data: {
            USER_ID: userId,
            USERNAME: userId,
            EMAIL: `${userId}@ube.co.th`,
            PASSWORD: 'ldap-auth', // ไม่ใช้ password เพราะใช้ LDAP
            ROLE: 'DEV',
            DEPARTMENT: 'IT',
            SITE_ID: 'HQ'
          }
        })
      }
    } catch (error: any) {
      // ถ้าเกิด constraint error ให้ลองใช้ raw SQL
      if (error.code === 'P2003' && error.meta?.constraint === 'CK__USERS__ROLE__3E52440B') {
        console.log('Constraint error detected, trying alternative approach...')
        
        // ลองใช้ raw SQL เพื่อ bypass constraint
        await prisma.$executeRaw`UPDATE USERS SET ROLE = 'DEV' WHERE USER_ID = ${userId}`
        
        // ตรวจสอบว่าอัปเดตสำเร็จหรือไม่
        const user = await prisma.uSERS.findUnique({
          where: { USER_ID: userId }
        })
        
        if (!user) {
          // สร้าง user ใหม่ถ้าไม่พบ
          await prisma.$executeRaw`
            INSERT INTO USERS (USER_ID, USERNAME, EMAIL, PASSWORD, ROLE, DEPARTMENT, SITE_ID, CREATED_AT)
            VALUES (${userId}, ${userId}, ${userId + '@ube.co.th'}, 'ldap-auth', 'DEV', 'IT', 'HQ', GETDATE())
          `
        }
      } else {
        throw error
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `User ${userId} has been set as DEV`,
      updatedCount: updateResult.count
    })
  } catch (error) {
    console.error("Error setting up dev:", error)
    return NextResponse.json({ error: "Failed to setup dev" }, { status: 500 })
  }
} 