import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("🔔 [NEW API] Fetching notifications for user:", userId)

    // อ่านจากตาราง NOTIFICATIONS
    const notifications = await prisma.$queryRaw`
      SELECT 
        n.NOTIFICATION_ID as id,
        n.TYPE as type,
        n.MESSAGE as message,
        n.IS_READ as isRead,
        n.CREATED_AT as createdAt,
        n.REQUISITION_ID as requisitionId,
        n.ACTOR_ID as actorId,
        u.USERNAME as actorName,
        u.ROLE as actorRole
      FROM NOTIFICATIONS n
      LEFT JOIN USERS u ON u.USER_ID = n.ACTOR_ID
      WHERE n.USER_ID = ${parseInt(userId)}
      ORDER BY n.CREATED_AT DESC
    `

    console.log("🔔 [NEW API] Found notifications:", notifications)

    return NextResponse.json({
      success: true,
      notifications: notifications || []
    })
  } catch (error: any) {
    console.error("❌ [NEW API] Error fetching notifications:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// API สำหรับอัปเดตสถานะอ่าน
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { notificationId } = await request.json()

    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 })
    }

    console.log("🔔 [NEW API] Marking notification as read:", notificationId)

    // อัปเดตสถานะอ่าน
    await prisma.$executeRaw`
      UPDATE NOTIFICATIONS 
      SET IS_READ = 1 
      WHERE NOTIFICATION_ID = ${parseInt(notificationId)}
    `

    return NextResponse.json({
      success: true,
      message: "Notification marked as read"
    })
  } catch (error: any) {
    console.error("❌ [NEW API] Error marking notification as read:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
