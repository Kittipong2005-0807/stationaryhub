import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
// import { updateRequisitionStatus } from "@/lib/sql-connection" // For real implementation

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = requireAuth(request, ["MANAGER", "ADMIN"])
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { user } = authResult
    const requisitionId = Number.parseInt(params.id)
    const { status, note } = await request.json()

    // TODO: ใช้ฐานข้อมูลจริงในการอัปเดตสถานะใบขอเบิกและแจ้งเตือนอีเมล

    return NextResponse.json({
      success: true,
      message: `Requisition ${status.toLowerCase()} successfully`,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update requisition" }, { status: 500 })
  }
}
