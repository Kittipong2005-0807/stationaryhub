import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { NotificationService } from "@/lib/notification-service"

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

    // ดึง email ของ user จาก LDAP
    const userEmail = await NotificationService.getUserEmailFromLDAP(toUserId)
    
    if (!userEmail) {
      console.log(`⚠️ No email found for user ${toUserId}`)
      return NextResponse.json({ 
        success: false, 
        message: "ไม่พบอีเมลของ user นี้",
        reason: "User has no email configured"
      })
    }

    // สร้างข้อความอีเมล
    const emailSubject = `📦 สินค้ามาแล้ว - Requisition #${requisition.REQUISITION_ID}`
    const emailMessage = message || `สินค้าที่คุณขอเบิก (Requisition #${requisition.REQUISITION_ID}) ส่งครบเรียบร้อยแล้ว`

    // ส่งอีเมลจริง
    try {
      await NotificationService.sendTestEmail(
        userEmail,
        emailSubject,
        NotificationService.createArrivalEmailTemplate({
          requisitionId: requisition.REQUISITION_ID,
          message: emailMessage,
          adminName: session.user.name || 'Admin',
          totalAmount: Number(requisition.TOTAL_AMOUNT || 0),
          requesterName: requisition.USERS?.USERNAME || toUserId
        })
      )

      console.log(`✅ Arrival email sent successfully to ${toUserId} at ${userEmail}`)

      // อัปเดตสถานะในฐานข้อมูลเป็น CLOSED
      await prisma.rEQUISITIONS.update({
        where: { REQUISITION_ID: requisition.REQUISITION_ID },
        data: { STATUS: 'CLOSED' }
      })

      // หา USER_ID ของ admin จาก email
      let adminUserId = 'admin'
      try {
        if (session.user.email) {
          const adminUser = await prisma.uSERS.findFirst({
            where: { EMAIL: session.user.email },
            select: { USER_ID: true }
          })
          if (adminUser) {
            adminUserId = adminUser.USER_ID
          }
        }
      } catch {
        console.log('⚠️ Could not find admin user, using default admin ID')
      }

      // บันทึก status history
      await prisma.sTATUS_HISTORY.create({
        data: {
          REQUISITION_ID: requisition.REQUISITION_ID,
          STATUS: 'CLOSED',
          CHANGED_BY: adminUserId,
          CHANGED_AT: new Date(),
          COMMENT: 'สินค้ามาแล้ว - ส่งแจ้งเตือนให้ผู้ใช้'
        }
      })

      console.log(`🔄 Updated requisition ${requisition.REQUISITION_ID} status to CLOSED`)

      // บันทึกลง EMAIL_LOGS หลังจากส่งเมลสำเร็จ
      await prisma.$executeRaw`
        INSERT INTO EMAIL_LOGS (TO_USER_ID, SUBJECT, BODY, STATUS, SENT_AT, TO_EMAIL)
        VALUES (${toUserId}, ${emailSubject}, ${emailSubject}, 'SENT', GETDATE(), ${userEmail})
      `

      console.log("🔔 Created notification with GETDATE()")

      return NextResponse.json({ 
        success: true, 
        message: "ส่งการแจ้งเตือนว่าสินค้ามาแล้วสำเร็จ สถานะถูกเปลี่ยนเป็น CLOSED",
        emailSent: true,
        userEmail,
        statusUpdated: true
      })

    } catch (emailError) {
      console.error(`❌ Error sending arrival email to ${userEmail}:`, emailError)
      
      // บันทึก error ลง EMAIL_LOGS
      await prisma.$executeRaw`
        INSERT INTO EMAIL_LOGS (TO_USER_ID, SUBJECT, BODY, STATUS, SENT_AT, TO_EMAIL, ERROR_MESSAGE)
        VALUES (${toUserId}, ${emailSubject}, ${emailSubject}, 'FAILED', GETDATE(), ${userEmail}, ${emailError instanceof Error ? emailError.message : String(emailError)})
      `

      return NextResponse.json({ 
        success: false, 
        message: "เกิดข้อผิดพลาดในการส่งอีเมล",
        emailSent: false,
        error: emailError instanceof Error ? emailError.message : String(emailError),
        userEmail
      })
    }
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
