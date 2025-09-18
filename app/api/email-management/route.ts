import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { NotificationService } from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"
import { SessionUser } from "@/types"

/**
 * GET /api/email-management
 * ดึงสถิติการส่งอีเมล
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ตรวจสอบสิทธิ์ admin หรือ manager
    const user = await prisma.uSERS.findUnique({
      where: { USER_ID: (session.user as SessionUser).id },
      select: { ROLE: true }
    })

    if (!user || !['admin', 'manager'].includes(user.ROLE || '')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const stats = await NotificationService.getEmailStats()
    
    if (!stats) {
      return NextResponse.json({ error: "Failed to get email stats" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error: any) {
    console.error("❌ Error in email management GET:", error)
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 })
  }
}

/**
 * POST /api/email-management
 * จัดการอีเมล (retry failed emails)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ตรวจสอบสิทธิ์ admin หรือ manager
    const user = await prisma.uSERS.findUnique({
      where: { USER_ID: (session.user as SessionUser).id },
      select: { ROLE: true }
    })

    if (!user || !['admin', 'manager'].includes(user.ROLE || '')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { action, maxRetries = 3 } = await request.json()

    if (action === 'retry_failed') {
      console.log(`🔄 Starting email retry process by ${(session.user as SessionUser).id}`)
      const result = await NotificationService.retryFailedEmails(maxRetries)
      
      return NextResponse.json({
        success: result.success,
        message: result.success 
          ? `Retry completed. Successfully retried: ${result.retrySuccess} emails`
          : `Retry failed: ${result.error}`,
        data: result
      })
    }

    return NextResponse.json({ 
      error: "Invalid action. Supported actions: retry_failed" 
    }, { status: 400 })

  } catch (error: any) {
    console.error("❌ Error in email management POST:", error)
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 })
  }
}
