import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { NotificationService } from "@/lib/notification-service"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { toEmail, subject, message } = await request.json()

    if (!toEmail || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // ทดสอบการส่งอีเมล
    await NotificationService.sendTestEmail(toEmail, subject, message)

    return NextResponse.json({ 
      success: true, 
      message: "ส่งอีเมลทดสอบสำเร็จ" 
    })
  } catch (error: any) {
    console.error("Error sending test email:", error)
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 })
  }
}
