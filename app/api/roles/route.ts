import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { RoleManagementService, UserRole, Permission, RoleUtils } from "@/lib/role-management"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = session.user as any
    const userId = user.AdLoginName || user.USER_ID

    // ตรวจสอบ Permission
    const canViewUsers = await RoleManagementService.hasPermission(userId, Permission.VIEW_USERS)
    if (!canViewUsers) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    switch (action) {
      case "statistics":
        // ดึงสถิติ Role
        const stats = await RoleManagementService.getRoleStatistics()
        return NextResponse.json(stats)

      case "permissions":
        // ดึง Permissions ของ User
        const userPermissions = await RoleManagementService.getUserPermissions(userId)
        return NextResponse.json(userPermissions)

      case "capabilities":
        // ดึง Capabilities ของ Role
        const role = searchParams.get("role") as UserRole
        if (!role) {
          return NextResponse.json({ error: "Role parameter is required" }, { status: 400 })
        }
        const capabilities = RoleUtils.getRoleCapabilities(role)
        return NextResponse.json(capabilities)

      case "users":
        // ดึง Users ตาม Role
        const targetRole = searchParams.get("role") as UserRole
        if (!targetRole) {
          return NextResponse.json({ error: "Role parameter is required" }, { status: 400 })
        }
        const users = await RoleManagementService.getUsersByRole(targetRole)
        return NextResponse.json(users)

      default:
        // ดึงข้อมูล Role ทั้งหมด
        const roles = RoleUtils.getAllRoles()
        const permissions = RoleUtils.getAllPermissions()
        
        return NextResponse.json({
          roles,
          permissions,
          rolePermissions: RoleUtils.getRolePermissions
        })
    }
  } catch (error) {
    console.error("Error in roles API:", error)
    return NextResponse.json({ error: "Failed to fetch role data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = session.user as any
    const userId = user.AdLoginName || user.USER_ID

    // ตรวจสอบ Permission - อนุญาตให้เปลี่ยน Role ของตัวเองได้
    const { targetUserId, newRole, reason } = await request.json()

    if (!targetUserId || !newRole) {
      return NextResponse.json({ error: "targetUserId and newRole are required" }, { status: 400 })
    }

    // ตรวจสอบว่า Role ที่จะกำหนดมีอยู่จริงหรือไม่
    if (!Object.values(UserRole).includes(newRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // อนุญาตให้เปลี่ยน Role ของตัวเองได้ หรือมีสิทธิ์ ASSIGN_ROLE
    const isChangingOwnRole = targetUserId === userId
    const canAssignRole = await RoleManagementService.hasPermission(userId, Permission.ASSIGN_ROLE)
    const canEditUser = await RoleManagementService.hasPermission(userId, Permission.EDIT_USER)
    
    // อนุญาตให้เปลี่ยน Role ของตัวเองได้เสมอ หรือมีสิทธิ์ ASSIGN_ROLE สำหรับเปลี่ยน Role ของคนอื่น
    if (!isChangingOwnRole && !canAssignRole) {
      return NextResponse.json({ error: "Insufficient permissions to change other users' roles" }, { status: 403 })
    }

    // อนุญาตให้เปลี่ยน Role ของตัวเองได้เสมอ
    if (isChangingOwnRole) {
      // No need to check additional permissions - always allow users to change their own role
    }

    // เปลี่ยน Role
    const success = await RoleManagementService.assignRole(targetUserId, newRole, userId, reason)

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: `Role assigned successfully to user ${targetUserId}` 
      })
    } else {
      return NextResponse.json({ error: "Failed to assign role" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error assigning role:", error)
    return NextResponse.json({ error: "Failed to assign role" }, { status: 500 })
  }
} 