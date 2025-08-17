import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบการเชื่อมต่อฐานข้อมูล
    try {
      await prisma.$connect()
      console.log("🔔 Database connected successfully")
    } catch (dbError) {
      console.error("❌ Database connection error:", dbError)
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requisitionId, message } = await request.json()
    console.log("🔔 Arrival notification request:", { requisitionId, message })

    if (!requisitionId) {
      return NextResponse.json({ error: "Requisition ID is required" }, { status: 400 })
    }

    // ดึงข้อมูล requisition และ user
    const requisition = await prisma.rEQUISITIONS.findUnique({
      where: { REQUISITION_ID: parseInt(requisitionId) },
      include: {
        USERS: {
          select: {
            USERNAME: true,
            USER_ID: true
          }
        }
      }
    })

    console.log("🔔 Found requisition:", requisition)

    if (!requisition) {
      return NextResponse.json({ error: "Requisition not found" }, { status: 404 })
    }

    // ตรวจสอบข้อมูล user
    const toUserId = requisition.USERS?.USER_ID || requisition.USER_ID?.toString() || 'unknown'
    console.log("🔔 Using TO_USER_ID:", toUserId)

    // สร้างการแจ้งเตือนว่าสินค้ามาแล้ว
    const notification = await prisma.eMAIL_LOGS.create({
      data: {
        TO_USER_ID: toUserId,
        SUBJECT: `สินค้ามาแล้ว - Requisition #${requisition.REQUISITION_ID}`,
        BODY: message || `สินค้าที่คุณขอเบิก (Requisition #${requisition.REQUISITION_ID}) ได้มาถึงแล้ว กรุณาติดต่อแผนกจัดซื้อเพื่อรับสินค้า`,
        STATUS: 'SENT',
        SENT_AT: new Date()
      }
    })

    console.log("🔔 Created notification:", notification)

    return NextResponse.json({ 
      success: true, 
      notification,
      message: "ส่งการแจ้งเตือนว่าสินค้ามาแล้วสำเร็จ" 
    })
  } catch (error: any) {
    console.error("❌ Error creating arrival notification:", error)
    console.error("❌ Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  } finally {
    // ปิดการเชื่อมต่อฐานข้อมูล
    try {
      await prisma.$disconnect()
      console.log("🔔 Database disconnected")
    } catch (disconnectError) {
      console.error("❌ Error disconnecting database:", disconnectError)
    }
  }
}
