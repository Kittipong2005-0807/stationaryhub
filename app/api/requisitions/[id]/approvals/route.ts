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
    
    // ใช้ ApprovalService เพื่อดึงประวัติการอนุมัติ
    const approvals = await ApprovalService.getApprovalHistory(requisitionId)

    return NextResponse.json(approvals)
  } catch (error) {
    console.error("Error fetching approvals:", error)
    return NextResponse.json({ error: "Failed to fetch approvals" }, { status: 500 })
  }
} 