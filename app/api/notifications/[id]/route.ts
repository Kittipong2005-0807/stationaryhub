import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notificationId = parseInt(params.id)

    // ลบการแจ้งเตือน
    await prisma.eMAIL_LOGS.delete({
      where: { EMAIL_ID: notificationId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting notification:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
} 