import { NextRequest, NextResponse } from "next/server"
import { ApprovalService } from "@/lib/approval-service"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requisitionId = parseInt(params.id)
    
    // ใช้ ApprovalService เพื่อดึงข้อมูล requisition พร้อมประวัติ
    const result = await ApprovalService.getRequisitionWithHistory(requisitionId)

    if (!result) {
      return NextResponse.json({ error: "Requisition not found" }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching requisition:", error)
    return NextResponse.json({ error: "Failed to fetch requisition" }, { status: 500 })
  }
} 