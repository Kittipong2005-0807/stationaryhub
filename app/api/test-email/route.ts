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

    console.log('🧪 Test email request received:')
    console.log('  - To:', toEmail)
    console.log('  - Subject:', subject)
    console.log('  - Message:', message)

    // ทดสอบการส่งอีเมล
    await NotificationService.sendTestEmail(toEmail, subject, message)

    console.log('✅ Test email sent successfully')

    return NextResponse.json({ 
      success: true, 
      message: "ส่งอีเมลทดสอบสำเร็จ" 
    })
  } catch (error: any) {
    console.error("❌ Error sending test email:", error)
    console.error("❌ Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    })
    
    // ส่ง error message ที่ชัดเจนกลับไป
    let errorMessage = "เกิดข้อผิดพลาดในการส่งอีเมล"
    
    if (error.code === 'EAUTH') {
      errorMessage = "การยืนยันตัวตน SMTP ล้มเหลว - ตรวจสอบ SMTP_USER และ SMTP_PASS"
    } else if (error.code === 'ECONNECTION') {
      errorMessage = "ไม่สามารถเชื่อมต่อ SMTP Server ได้ - ตรวจสอบ SMTP_HOST และ SMTP_PORT"
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = "การเชื่อมต่อ SMTP หมดเวลา - ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต"
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        code: error.code,
        message: error.message
      } : undefined
    }, { status: 500 })
  }
}
