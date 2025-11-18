import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { NotificationService } from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requisitionId, userId, message, adminName } = await request.json()
    console.log("📧 Arrival email request:", { requisitionId, userId, message, adminName })

    if (!requisitionId || !userId || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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

    if (!requisition) {
      return NextResponse.json({ error: "Requisition not found" }, { status: 404 })
    }

    // ดึง email ของ user จาก LDAP
    const userEmail = await NotificationService.getUserEmailFromLDAP(userId)
    
    if (!userEmail) {
      console.log(`⚠️ No email found for user ${userId}`)
      return NextResponse.json({ 
        emailSent: false, 
        reason: "User has no email configured",
        userId 
      })
    }

    // สร้างข้อความอีเมล
    const emailSubject = `📦 สินค้ามาแล้ว - Requisition #${requisitionId}`
    const emailMessage = message || `สินค้าที่คุณขอเบิก (Requisition #${requisitionId}) ส่งครบเรียบร้อยแล้ว`

    // ส่งอีเมล
    try {
      await NotificationService.sendTestEmail(
        userEmail,
        emailSubject,
        NotificationService.createArrivalEmailTemplate({
          requisitionId,
          message: emailMessage,
          adminName: adminName || 'Admin',
          totalAmount: Number(requisition.TOTAL_AMOUNT || 0),
          requesterName: requisition.USERS?.USERNAME || userId
        })
      )

      console.log(`✅ Arrival email sent successfully to ${userId} at ${userEmail}`)

      return NextResponse.json({ 
        emailSent: true, 
        userEmail,
        message: "ส่งอีเมลแจ้งเตือนสินค้ามาแล้วสำเร็จ"
      })

    } catch (emailError) {
      console.error(`❌ Error sending arrival email to ${userEmail}:`, emailError)
      return NextResponse.json({ 
        emailSent: false, 
        reason: "Failed to send email",
        error: emailError instanceof Error ? emailError.message : String(emailError),
        userEmail 
      })
    }

  } catch (error: any) {
    console.error("❌ Error in send-arrival-email API:", error)
    return NextResponse.json({ 
      error: error.message || "Internal server error",
      emailSent: false,
      reason: "API error"
    }, { status: 500 })
  }
}
