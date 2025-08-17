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

    console.log("🔔 Fetching notifications for user:", userId)

    // อ่านจากตาราง EMAIL_LOGS ที่มีอยู่แล้ว (ง่ายกว่า)
    // ตรวจสอบว่า userId เป็น username หรือ USER_ID
    console.log("🔔 Fetching for userId:", userId);

    // ใช้ Prisma findMany แทน $queryRaw เพื่อหลีกเลี่ยง SQL injection
    // รองรับทั้ง User, Manager และ Admin
    let targetUserId = userId;
    
    if (userId === 'kittipong') {
      // ถ้าเป็น kittipong ให้ใช้ USER_ID ของ Kittipong Sookdouang (MANAGER)
      targetUserId = '9C154';
    } else if (userId === 'opas') {
      // ถ้าเป็น opas ให้ใช้ USER_ID ของ Opas Sookdoang (ADMIN)
      targetUserId = '90423';
    }
    
    console.log("🔔 Target USER_ID:", targetUserId);

    const notifications = await prisma.eMAIL_LOGS.findMany({
      where: {
        TO_USER_ID: targetUserId
      },
      select: {
        EMAIL_ID: true,
        TO_USER_ID: true,
        SUBJECT: true,
        BODY: true,
        STATUS: true,
        IS_READ: true,
        SENT_AT: true
      },
      orderBy: {
        SENT_AT: 'desc'
      }
    });

    // แปลงข้อมูลให้ตรงกับ interface
    const formattedNotifications = notifications.map((notification: any) => ({
      id: notification.EMAIL_ID,
      userId: notification.TO_USER_ID,
      subject: notification.SUBJECT,
      body: notification.BODY,
      status: notification.STATUS,
      isRead: notification.IS_READ || false,
      sentAt: notification.SENT_AT
    }));

    console.log("🔔 Found notifications:", formattedNotifications)

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications || []
    })
  } catch (error: any) {
    console.error("❌ Error fetching notifications:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
} 