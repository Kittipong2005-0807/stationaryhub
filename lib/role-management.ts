import { prisma } from "@/lib/prisma"

// กำหนด Role หลักของระบบ
export enum UserRole {
  USER = "USER",
  MANAGER = "MANAGER", 
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
  DEV = "DEV"
}

// กำหนด Permission ที่แต่ละ Role สามารถทำได้
export enum Permission {
  // การจัดการ Requisition
  CREATE_REQUISITION = "CREATE_REQUISITION",
  VIEW_REQUISITION = "VIEW_REQUISITION",
  EDIT_REQUISITION = "EDIT_REQUISITION",
  DELETE_REQUISITION = "DELETE_REQUISITION",
  
  // การอนุมัติ
  APPROVE_REQUISITION = "APPROVE_REQUISITION",
  REJECT_REQUISITION = "REJECT_REQUISITION",
  VIEW_APPROVAL_HISTORY = "VIEW_APPROVAL_HISTORY",
  
  // การจัดการ User
  VIEW_USERS = "VIEW_USERS",
  CREATE_USER = "CREATE_USER",
  EDIT_USER = "EDIT_USER",
  DELETE_USER = "DELETE_USER",
  ASSIGN_ROLE = "ASSIGN_ROLE",
  
  // การจัดการ Product
  VIEW_PRODUCTS = "VIEW_PRODUCTS",
  CREATE_PRODUCT = "CREATE_PRODUCT",
  EDIT_PRODUCT = "EDIT_PRODUCT",
  DELETE_PRODUCT = "DELETE_PRODUCT",
  
  // การจัดการระบบ
  VIEW_SYSTEM_LOGS = "VIEW_SYSTEM_LOGS",
  EXPORT_DATA = "EXPORT_DATA",
  MANAGE_SETTINGS = "MANAGE_SETTINGS",
  
  // การรายงาน
  VIEW_REPORTS = "VIEW_REPORTS",
  GENERATE_REPORTS = "GENERATE_REPORTS",
  
  // การจัดการ Department
  VIEW_DEPARTMENTS = "VIEW_DEPARTMENTS",
  MANAGE_DEPARTMENTS = "MANAGE_DEPARTMENTS"
}

// กำหนด Permission สำหรับแต่ละ Role
export const RolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    Permission.CREATE_REQUISITION,
    Permission.VIEW_REQUISITION,
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_REPORTS
  ],
  
  [UserRole.MANAGER]: [
    Permission.CREATE_REQUISITION,
    Permission.VIEW_REQUISITION,
    Permission.EDIT_REQUISITION,
    Permission.APPROVE_REQUISITION,
    Permission.REJECT_REQUISITION,
    Permission.VIEW_APPROVAL_HISTORY,
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_USERS,
    Permission.EDIT_USER, // ให้ Manager สามารถแก้ไขข้อมูลผู้ใช้ได้
    Permission.VIEW_REPORTS,
    Permission.GENERATE_REPORTS,
    Permission.EXPORT_DATA,
    Permission.VIEW_DEPARTMENTS
  ],
  
  [UserRole.ADMIN]: [
    Permission.CREATE_REQUISITION,
    Permission.VIEW_REQUISITION,
    Permission.EDIT_REQUISITION,
    Permission.DELETE_REQUISITION,
    Permission.APPROVE_REQUISITION,
    Permission.REJECT_REQUISITION,
    Permission.VIEW_APPROVAL_HISTORY,
    Permission.VIEW_USERS,
    Permission.CREATE_USER,
    Permission.EDIT_USER,
    Permission.ASSIGN_ROLE,
    Permission.VIEW_PRODUCTS,
    Permission.CREATE_PRODUCT,
    Permission.EDIT_PRODUCT,
    Permission.DELETE_PRODUCT,
    Permission.VIEW_REPORTS,
    Permission.GENERATE_REPORTS,
    Permission.EXPORT_DATA,
    Permission.VIEW_SYSTEM_LOGS,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_DEPARTMENTS,
    Permission.MANAGE_DEPARTMENTS
  ],
  
  [UserRole.SUPER_ADMIN]: [
    // ทุก Permission
    ...Object.values(Permission)
  ],
  
  [UserRole.DEV]: [
    // ทุก Permission เหมือน SUPER_ADMIN
    ...Object.values(Permission)
  ]
}

// Interface สำหรับ Role Management
export interface RoleAssignment {
  userId: string
  role: UserRole
  assignedBy: string
  assignedAt: Date
  reason?: string
}

export interface PermissionCheck {
  userId: string
  permission: Permission
  resourceId?: string | number
}

/**
 * บริการจัดการ Role และ Permission
 */
export class RoleManagementService {
  
  /**
   * ตรวจสอบว่า User มี Permission หรือไม่
   */
  static async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    try {
      const user = await prisma.uSERS.findUnique({
        where: { USER_ID: userId }
      })
      
      if (!user || !user.ROLE) {
        return false
      }
      
      const userRole = user.ROLE as UserRole
      const permissions = RolePermissions[userRole] || []
      
      return permissions.includes(permission)
    } catch (error) {
      console.error("Error checking permission:", error)
      return false
    }
  }
  
  /**
   * ตรวจสอบว่า User มี Role ที่ต้องการหรือไม่
   */
  static async hasRole(userId: string, role: UserRole): Promise<boolean> {
    try {
      const user = await prisma.uSERS.findUnique({
        where: { USER_ID: userId }
      })
      
      if (!user || !user.ROLE) {
        return false
      }
      
      return user.ROLE === role
    } catch (error) {
      console.error("Error checking role:", error)
      return false
    }
  }
  
  /**
   * ตรวจสอบว่า User มี Role ใดๆ ในรายการที่กำหนด
   */
  static async hasAnyRole(userId: string, roles: UserRole[]): Promise<boolean> {
    try {
      const user = await prisma.uSERS.findUnique({
        where: { USER_ID: userId }
      })
      
      if (!user || !user.ROLE) {
        return false
      }
      
      return roles.includes(user.ROLE as UserRole)
    } catch (error) {
      console.error("Error checking roles:", error)
      return false
    }
  }
  
  /**
   * ดึง Role ของ User
   */
  static async getUserRole(userId: string): Promise<UserRole | null> {
    try {
      const user = await prisma.uSERS.findUnique({
        where: { USER_ID: userId }
      })
      
      if (!user || !user.ROLE) {
        return null
      }
      
      return user.ROLE as UserRole
    } catch (error) {
      console.error("Error getting user role:", error)
      return null
    }
  }
  
  /**
   * ดึง Permissions ของ User
   */
  static async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const role = await this.getUserRole(userId)
      
      if (!role) {
        return []
      }
      
      return RolePermissions[role] || []
    } catch (error) {
      console.error("Error getting user permissions:", error)
      return []
    }
  }
  
  /**
   * เปลี่ยน Role ของ User
   */
  static async assignRole(userId: string, newRole: UserRole, assignedBy: string, reason?: string): Promise<boolean> {
    try {
      await prisma.uSERS.update({
        where: { USER_ID: userId },
        data: { ROLE: newRole }
      })
      
      // บันทึกประวัติการเปลี่ยน Role (ถ้ามีตาราง)
      // await prisma.roleHistory.create({
      //   data: {
      //     userId,
      //     role: newRole,
      //     assignedBy,
      //     assignedAt: new Date(),
      //     reason
      //   }
      // })
      
      return true
    } catch (error) {
      console.error("Error assigning role:", error)
      return false
    }
  }
  
  /**
   * ดึงรายการ Users ตาม Role
   */
  static async getUsersByRole(role: UserRole): Promise<any[]> {
    try {
      const users = await prisma.uSERS.findMany({
        where: { ROLE: role },
        select: {
          USER_ID: true,
          USERNAME: true,
          EMAIL: true,
          ROLE: true,
          DEPARTMENT: true,
          SITE_ID: true,
          CREATED_AT: true
        }
      })
      
      return users
    } catch (error) {
      console.error("Error getting users by role:", error)
      return []
    }
  }
  
  /**
   * ดึงสถิติ Users ตาม Role
   */
  static async getRoleStatistics(): Promise<Record<UserRole, number>> {
    try {
      const stats: Record<UserRole, number> = {
        [UserRole.USER]: 0,
        [UserRole.MANAGER]: 0,
        [UserRole.ADMIN]: 0,
        [UserRole.SUPER_ADMIN]: 0,
        [UserRole.DEV]: 0
      }
      
      const users = await prisma.uSERS.findMany({
        select: { ROLE: true }
      })
      
      users.forEach(user => {
        if (user.ROLE && stats.hasOwnProperty(user.ROLE)) {
          stats[user.ROLE as UserRole]++
        }
      })
      
      return stats
    } catch (error) {
      console.error("Error getting role statistics:", error)
      return {
        [UserRole.USER]: 0,
        [UserRole.MANAGER]: 0,
        [UserRole.ADMIN]: 0,
        [UserRole.SUPER_ADMIN]: 0,
        [UserRole.DEV]: 0
      }
    }
  }
  
  /**
   * ตรวจสอบ Permission สำหรับการอนุมัติ
   */
  static async canApproveRequisition(userId: string): Promise<boolean> {
    return this.hasPermission(userId, Permission.APPROVE_REQUISITION)
  }
  
  /**
   * ตรวจสอบ Permission สำหรับการดู Requisition
   */
  static async canViewRequisition(userId: string): Promise<boolean> {
    return this.hasPermission(userId, Permission.VIEW_REQUISITION)
  }
  
  /**
   * ตรวจสอบ Permission สำหรับการสร้าง Requisition
   */
  static async canCreateRequisition(userId: string): Promise<boolean> {
    return this.hasPermission(userId, Permission.CREATE_REQUISITION)
  }
  
  /**
   * ตรวจสอบ Permission สำหรับการจัดการ User
   */
  static async canManageUsers(userId: string): Promise<boolean> {
    return this.hasPermission(userId, Permission.EDIT_USER)
  }
  
  /**
   * ตรวจสอบ Permission สำหรับการจัดการ Product
   */
  static async canManageProducts(userId: string): Promise<boolean> {
    return this.hasPermission(userId, Permission.CREATE_PRODUCT)
  }
  
  /**
   * ตรวจสอบ Permission สำหรับการดูรายงาน
   */
  static async canViewReports(userId: string): Promise<boolean> {
    return this.hasPermission(userId, Permission.VIEW_REPORTS)
  }
  
  /**
   * ตรวจสอบ Permission สำหรับการจัดการระบบ
   */
  static async canManageSystem(userId: string): Promise<boolean> {
    return this.hasPermission(userId, Permission.MANAGE_SETTINGS)
  }
}

/**
 * Utility functions สำหรับตรวจสอบ Role และ Permission
 */
export const RoleUtils = {
  /**
   * ตรวจสอบว่า Role มี Permission หรือไม่
   */
  roleHasPermission: (role: UserRole, permission: Permission): boolean => {
    const permissions = RolePermissions[role] || []
    return permissions.includes(permission)
  },
  
  /**
   * ดึง Permissions ของ Role
   */
  getRolePermissions: (role: UserRole): Permission[] => {
    return RolePermissions[role] || []
  },
  
  /**
   * ดึงรายการ Roles ทั้งหมด
   */
  getAllRoles: (): UserRole[] => {
    return Object.values(UserRole)
  },
  
  /**
   * ดึงรายการ Permissions ทั้งหมด
   */
  getAllPermissions: (): Permission[] => {
    return Object.values(Permission)
  },
  
  /**
   * ตรวจสอบว่า Role สามารถทำอะไรได้บ้าง
   */
  getRoleCapabilities: (role: UserRole): string[] => {
    const permissions = RolePermissions[role] || []
    return permissions.map(p => p.replace(/_/g, ' ').toLowerCase())
  }
} 