import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { RoleManagementService } from "@/lib/role-management"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = session.user as any
    const userId = user.AdLoginName || user.USER_ID
    const { permission, resourceId } = await request.json()

    if (!permission) {
      return NextResponse.json({ error: "Permission is required" }, { status: 400 })
    }

    // ตรวจสอบ Permission
    const hasPermission = await RoleManagementService.hasPermission(userId, permission)

    // ดึงข้อมูลเพิ่มเติม
    const userRole = await RoleManagementService.getUserRole(userId)
    const userPermissions = await RoleManagementService.getUserPermissions(userId)

    return NextResponse.json({
      hasPermission,
      userRole,
      userPermissions,
      requestedPermission: permission,
      resourceId
    })
  } catch (error) {
    console.error("Error checking permission:", error)
    return NextResponse.json({ error: "Failed to check permission" }, { status: 500 })
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = session.user as any
    const userId = user.AdLoginName || user.USER_ID

    // ดึงข้อมูล Permission ของ User
    const userRole = await RoleManagementService.getUserRole(userId)
    const userPermissions = await RoleManagementService.getUserPermissions(userId)

    // ตรวจสอบ Permission เฉพาะ
    const canApprove = await RoleManagementService.canApproveRequisition(userId)
    const canViewRequisition = await RoleManagementService.canViewRequisition(userId)
    const canCreateRequisition = await RoleManagementService.canCreateRequisition(userId)
    const canManageUsers = await RoleManagementService.canManageUsers(userId)
    const canManageProducts = await RoleManagementService.canManageProducts(userId)
    const canViewReports = await RoleManagementService.canViewReports(userId)
    const canManageSystem = await RoleManagementService.canManageSystem(userId)

    return NextResponse.json({
      userRole,
      userPermissions,
      specificPermissions: {
        canApprove,
        canViewRequisition,
        canCreateRequisition,
        canManageUsers,
        canManageProducts,
        canViewReports,
        canManageSystem
      }
    })
  } catch (error) {
    console.error("Error getting user permissions:", error)
    return NextResponse.json({ error: "Failed to get user permissions" }, { status: 500 })
  }
} 