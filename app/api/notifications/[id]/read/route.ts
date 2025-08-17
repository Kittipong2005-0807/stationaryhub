import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notificationId = parseInt(params.id)

    // อัปเดต IS_READ เป็น true แทนการเปลี่ยน STATUS
    await prisma.eMAIL_LOGS.update({
      where: { EMAIL_ID: notificationId },
      data: { IS_READ: true }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
} 