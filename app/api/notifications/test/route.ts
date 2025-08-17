import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId, message, subject } = await request.json()

    if (!userId || !message || !subject) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // สร้างการแจ้งเตือนทดสอบ
    const notification = await prisma.eMAIL_LOGS.create({
      data: {
        TO_USER_ID: userId, // ใช้ string (AdLoginName)
        SUBJECT: subject,
        BODY: message,
        STATUS: 'SENT',
        SENT_AT: new Date()
      }
    })

    return NextResponse.json({ 
      success: true, 
      notification,
      message: "สร้างการแจ้งเตือนทดสอบสำเร็จ" 
    })
  } catch (error: any) {
    console.error("Error creating test notification:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// เพิ่ม GET endpoint สำหรับสร้างการแจ้งเตือนทดสอบอัตโนมัติ
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // สร้างการแจ้งเตือนทดสอบอัตโนมัติ
    const testNotifications = [
      {
        TO_USER_ID: userId,
        SUBJECT: "ทดสอบการแจ้งเตือน #1",
        BODY: "นี่เป็นการแจ้งเตือนทดสอบเพื่อตรวจสอบระบบ",
        STATUS: 'SENT',
        SENT_AT: new Date()
      },
      {
        TO_USER_ID: userId,
        SUBJECT: "ทดสอบการแจ้งเตือน #2", 
        BODY: "การแจ้งเตือนทดสอบที่สองสำหรับการตรวจสอบ",
        STATUS: 'SENT',
        SENT_AT: new Date(Date.now() - 1000 * 60 * 60) // 1 ชั่วโมงที่แล้ว
      },
      {
        TO_USER_ID: userId,
        SUBJECT: "ทดสอบการแจ้งเตือน #3",
        BODY: "การแจ้งเตือนทดสอบที่สามสำหรับการตรวจสอบ",
        STATUS: 'SENT', 
        SENT_AT: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 ชั่วโมงที่แล้ว
      }
    ]

    const createdNotifications = []
    for (const notificationData of testNotifications) {
      const notification = await prisma.eMAIL_LOGS.create({
        data: notificationData
      })
      createdNotifications.push(notification)
    }

    return NextResponse.json({ 
      success: true, 
      notifications: createdNotifications,
      message: `สร้างการแจ้งเตือนทดสอบ ${createdNotifications.length} รายการสำเร็จ` 
    })
  } catch (error: any) {
    console.error("Error creating test notifications:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
} 