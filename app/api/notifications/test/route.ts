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
        TO_USER_ID: userId,
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