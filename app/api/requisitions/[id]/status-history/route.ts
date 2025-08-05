import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { ApprovalService } from "@/lib/approval-service"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requisitionId = parseInt(params.id)
    
    // ใช้ ApprovalService เพื่อดึงประวัติการเปลี่ยนแปลงสถานะ
    const statusHistory = await ApprovalService.getStatusHistory(requisitionId)

    return NextResponse.json(statusHistory)
  } catch (error) {
    console.error("Error fetching status history:", error)
    return NextResponse.json({ error: "Failed to fetch status history" }, { status: 500 })
  }
} 