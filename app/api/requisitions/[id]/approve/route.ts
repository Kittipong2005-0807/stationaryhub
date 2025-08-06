import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { ApprovalService } from "@/lib/approval-service"
import { RoleManagementService, Permission } from "@/lib/role-management"
import { OrgCode3Service } from "@/lib/orgcode3-service"
import { NotificationService } from "@/lib/notification-service"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = session.user as any
    const userId = user.AdLoginName || user.USER_ID

    // ตรวจสอบ Permission แทนการตรวจสอบ Role
    const canApprove = await RoleManagementService.canApproveRequisition(userId)
    if (!canApprove) {
      return NextResponse.json({ error: "Insufficient permissions to approve requisitions" }, { status: 403 })
    }

    const { action, note } = await request.json()
    const requisitionId = parseInt(params.id)

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // ดึงข้อมูล requisition เพื่อตรวจสอบ orgcode3
    const requisition = await prisma.rEQUISITIONS.findUnique({
      where: { REQUISITION_ID: requisitionId }
    })
    
    if (!requisition) {
      return NextResponse.json({ error: "Requisition not found" }, { status: 404 })
    }
    
    // ตรวจสอบว่า Manager สามารถอนุมัติ requisition นี้ได้หรือไม่ (มี orgcode3 เดียวกัน)
    const canApproveThisRequisition = await OrgCode3Service.canUserSubmitToManager(
      requisition.USER_ID, // user ID จาก requisition
      userId  // manager ID
    )
    
    if (!canApproveThisRequisition) {
      return NextResponse.json({ error: "You can only approve requisitions from your department" }, { status: 403 })
    }

    // ตรวจสอบ Permission เฉพาะสำหรับการ Reject
    if (action === "reject") {
      const canReject = await RoleManagementService.hasPermission(userId, Permission.REJECT_REQUISITION)
      if (!canReject) {
        return NextResponse.json({ error: "Insufficient permissions to reject requisitions" }, { status: 403 })
      }
    }

    // ใช้ ApprovalService เพื่อสร้างการอนุมัติ
    const approvalData = {
      REQUISITION_ID: requisitionId,
      APPROVED_BY: userId,
      STATUS: action === "approve" ? "APPROVED" : "REJECTED" as "APPROVED" | "REJECTED",
      NOTE: note
    }

    const result = await ApprovalService.createApproval(approvalData)

    // ส่งการแจ้งเตือนตามผลการอนุมัติ
    if (action === "approve") {
      await NotificationService.notifyRequisitionApproved(requisitionId, userId)
    } else if (action === "reject") {
      await NotificationService.notifyRequisitionRejected(requisitionId, userId, note)
    }

    return NextResponse.json({ 
      success: true, 
      message: result.message,
      approvalId: result.approvalId,
      statusHistoryId: result.statusHistoryId
    })
  } catch (error) {
    console.error("Error updating requisition:", error)
    return NextResponse.json({ error: "Failed to update requisition" }, { status: 500 })
  }
}
