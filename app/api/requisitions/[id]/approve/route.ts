import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { ApprovalService } from "@/lib/approval-service"
import { RoleManagementService, Permission } from "@/lib/role-management"
import { OrgCode3Service } from "@/lib/orgcode3-service"
import { NotificationService } from "@/lib/notification-service"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("🔍 Approve API called with params:", params)
    
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.log("❌ No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = session.user as any
    const userId = String(user.USER_ID) // แปลงเป็น string เพื่อให้แน่ใจ
    console.log("🔍 User data:", { 
      AdLoginName: user.AdLoginName, 
      USER_ID: user.USER_ID, 
      EmpCode: user.EmpCode,
      ROLE: user.ROLE,
      userId 
    })

    // ตรวจสอบว่า user มีอยู่ใน USERS table หรือไม่
    const userExists = await prisma.uSERS.findUnique({
      where: { USER_ID: userId }
    })
    
    if (!userExists) {
      console.log("❌ User not found in USERS table:", userId)
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    // ตรวจสอบ Permission แทนการตรวจสอบ Role
    console.log("🔍 Checking approval permission for userId:", userId)
    const canApprove = await RoleManagementService.canApproveRequisition(userId)
    console.log("🔍 Can approve result:", canApprove)
    if (!canApprove) {
      console.log("❌ Insufficient permissions to approve requisitions")
      return NextResponse.json({ error: "Insufficient permissions to approve requisitions" }, { status: 403 })
    }

    const { action, note } = await request.json()
    const requisitionId = parseInt(params.id)

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // ดึงข้อมูล requisition เพื่อตรวจสอบ orgcode3
    console.log("🔍 Fetching requisition with ID:", requisitionId)
    const requisition = await prisma.rEQUISITIONS.findUnique({
      where: { REQUISITION_ID: requisitionId }
    })
    
    console.log("🔍 Found requisition:", requisition)
    
    if (!requisition) {
      console.log("❌ Requisition not found")
      return NextResponse.json({ error: "Requisition not found" }, { status: 404 })
    }

    // ตรวจสอบสถานะปัจจุบันของ requisition
    const latestStatus = await ApprovalService.getLatestStatus(requisitionId)
    console.log("🔍 Current requisition status:", latestStatus)
    
    if (latestStatus === "APPROVED") {
      console.log("❌ Requisition already approved")
      return NextResponse.json({ error: "Requisition already approved" }, { status: 400 })
    }
    if (latestStatus === "REJECTED") {
      console.log("❌ Requisition already rejected")
      return NextResponse.json({ error: "Requisition already rejected" }, { status: 400 })
    }
    
    // ตรวจสอบว่า Manager สามารถอนุมัติ requisition นี้ได้หรือไม่ (มี orgcode3 เดียวกัน)
    console.log("🔍 Checking if manager can approve this requisition")
    console.log("🔍 Requisition USER_ID:", requisition.USER_ID, "Manager userId:", userId)
    
    const canApproveThisRequisition = await OrgCode3Service.canUserSubmitToManager(
      requisition.USER_ID, // user ID จาก requisition
      userId  // manager ID
    )
    
    console.log("🔍 Can approve this requisition result:", canApproveThisRequisition)
    
    if (!canApproveThisRequisition) {
      console.log("❌ Manager cannot approve this requisition - different department")
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
    console.log("🔍 Creating approval with data:", { action, note, requisitionId, userId })
    
    const approvalData = {
      REQUISITION_ID: requisitionId,
      APPROVED_BY: userId,
      STATUS: action === "approve" ? "APPROVED" : "REJECTED" as "APPROVED" | "REJECTED",
      NOTE: note
    }

    console.log("🔍 Approval data:", approvalData)
    const result = await ApprovalService.createApproval(approvalData)
    console.log("🔍 Approval result:", result)

    // การแจ้งเตือนจะถูกส่งโดย ApprovalService.createApproval แล้ว
    // ไม่ต้องส่งซ้ำที่นี่

    console.log("✅ Approval successful")
    return NextResponse.json({ 
      success: true, 
      message: result.message,
      approvalId: result.approvalId,
      statusHistoryId: result.statusHistoryId
    })
  } catch (error) {
    console.error("❌ Error in approval API:", error)
    if (error instanceof Error) {
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack
      })
    }
    return NextResponse.json({ error: "Failed to update requisition" }, { status: 500 })
  }
}
