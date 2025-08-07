import { prisma } from "./prisma"

export interface SiteIdUser {
  USER_ID: string
  USERNAME: string
  ROLE: string
  SITE_ID: string
  DEPARTMENT?: string
}

export class OrgCode3Service {
  /**
   * ดึงข้อมูล Manager ที่มี SITE_ID เดียวกับ User
   */
  static async getManagersBySiteId(siteId: string): Promise<SiteIdUser[]> {
    try {
      const managers = await prisma.$queryRaw<SiteIdUser[]>`
        SELECT USER_ID, USERNAME, ROLE, SITE_ID, DEPARTMENT
        FROM USERS 
        WHERE SITE_ID = ${siteId} 
        AND ROLE IN ('MANAGER', 'ADMIN', 'SUPER_ADMIN', 'DEV')
        ORDER BY ROLE DESC, USERNAME ASC
      `
      return managers || []
    } catch (error) {
      console.error('Error fetching managers by SITE_ID:', error)
      return []
    }
  }

  /**
   * ดึงข้อมูล User และ SITE_ID จาก LDAP view
   */
  static async getUserSiteId(userId: string): Promise<string | null> {
    try {
      console.log("Getting SITE_ID for userId:", userId)
      
      // ตรวจสอบว่า userId ไม่เป็น null หรือ undefined
      if (!userId) {
        console.error("userId is null or undefined")
        return null
      }
      
      // ค้นหาด้วย EmpCode เท่านั้น (ตาม authOptions ที่ใช้ empCode เป็น USER_ID)
      console.log("Querying userWithRoles view with EmpCode:", userId)
      const userData = await prisma.$queryRaw<{ orgcode3: string }[]>`
        SELECT orgcode3 
        FROM userWithRoles 
        WHERE EmpCode = ${userId}
      `
      console.log("User data from view with EmpCode:", userData)
      
      if (!userData || userData.length === 0) {
        console.log("No user found in userWithRoles view with EmpCode:", userId)
        return null
      }
      
      const orgcode3 = userData[0].orgcode3
      console.log("Found orgcode3:", orgcode3)
      return orgcode3
    } catch (error) {
      console.error('Error fetching user SITE_ID:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      })
      return null
    }
  }

  /**
   * อัปเดต SITE_ID ในตาราง USERS
   */
  static async updateUserSiteId(userId: string, siteId: string): Promise<boolean> {
    try {
      await prisma.$executeRaw`
        UPDATE USERS 
        SET SITE_ID = ${siteId}
        WHERE USER_ID = ${userId}
      `
      return true
    } catch (error) {
      console.error('Error updating user SITE_ID:', error)
      return false
    }
  }

  /**
   * สร้าง Requisition พร้อม SITE_ID
   */
  static async createRequisitionWithSiteId(
    userId: string,
    totalAmount: number,
    issueNote?: string,
    siteId?: string
  ): Promise<number | null> {
    try {
      console.log("Creating requisition with params:", { userId, totalAmount, issueNote, siteId })
      
      // ดึง SITE_ID ของ user
      const userSiteId = await this.getUserSiteId(userId)
      console.log("User SITE_ID from view:", userSiteId)
      
      // ตรวจสอบว่า user มีอยู่ใน USERS table หรือไม่
      console.log("Checking for user in USERS table with USER_ID:", userId)
      const existingUser = await prisma.uSERS.findUnique({
        where: { USER_ID: userId }
      })
      console.log("Existing user in USERS table:", existingUser)
      
      if (!existingUser) {
        console.error("User not found in USERS table:", userId)
        console.log("Available users in USERS table:")
        const allUsers = await prisma.uSERS.findMany({
          select: { USER_ID: true, USERNAME: true }
        })
        console.log("All users:", allUsers)
        return null
      }
      
      // สร้าง requisition
      console.log("Executing INSERT query with values:", {
        USER_ID: userId,
        STATUS: 'PENDING',
        TOTAL_AMOUNT: totalAmount,
        ISSUE_NOTE: issueNote || '',
        SITE_ID: userSiteId || siteId || 'HQ'
      })
      
      const result = await prisma.$executeRaw`
        INSERT INTO REQUISITIONS (USER_ID, STATUS, TOTAL_AMOUNT, ISSUE_NOTE, SITE_ID)
        VALUES (${userId}, 'PENDING', ${totalAmount}, ${issueNote || ''}, ${userSiteId || siteId || 'HQ'})
      `
      
      console.log("INSERT result:", result)
      
      // ดึง ID ของ requisition ที่เพิ่งสร้าง
      const requisitionId = await prisma.$queryRaw<{ REQUISITION_ID: number }[]>`
        SELECT TOP 1 REQUISITION_ID 
        FROM REQUISITIONS 
        WHERE USER_ID = ${userId} 
        ORDER BY SUBMITTED_AT DESC
      `
      
      console.log("Retrieved requisition ID:", requisitionId)
      
      return requisitionId && requisitionId.length > 0 ? requisitionId[0].REQUISITION_ID : null
    } catch (error) {
      console.error('Error creating requisition with SITE_ID:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      })
      return null
    }
  }

  /**
   * ดึง Requisitions ที่ Manager สามารถอนุมัติได้ (มี SITE_ID เดียวกัน)
   */
  static async getRequisitionsForManager(managerUserId: string): Promise<any[]> {
    try {
      // ดึง SITE_ID ของ manager
      const managerSiteId = await this.getUserSiteId(managerUserId)
      
      if (!managerSiteId) {
        return []
      }

      // ดึง requisitions ที่มี SITE_ID เดียวกัน
      const requisitions = await prisma.$queryRaw`
        SELECT 
          r.REQUISITION_ID,
          r.USER_ID,
          r.STATUS,
          r.SUBMITTED_AT,
          r.TOTAL_AMOUNT,
          r.SITE_ID,
          r.ISSUE_NOTE,
          u.USERNAME,
          u.DEPARTMENT
        FROM REQUISITIONS r
        JOIN USERS u ON r.USER_ID = u.USER_ID
        WHERE r.SITE_ID = ${managerSiteId}
        ORDER BY r.SUBMITTED_AT DESC
      `
      
      return requisitions || []
    } catch (error) {
      console.error('Error fetching requisitions for manager:', error)
      return []
    }
  }

  /**
   * ตรวจสอบว่า User สามารถส่งคำขอไปยัง Manager ได้หรือไม่
   */
  static async canUserSubmitToManager(userId: string, managerUserId: string): Promise<boolean> {
    try {
      const userSiteId = await this.getUserSiteId(userId)
      const managerSiteId = await this.getUserSiteId(managerUserId)
      
      return userSiteId === managerSiteId && userSiteId !== null
    } catch (error) {
      console.error('Error checking user-manager relationship:', error)
      return false
    }
  }

  /**
   * ดึงรายการ Manager ทั้งหมดที่ User สามารถส่งคำขอได้
   */
  static async getAvailableManagersForUser(userId: string): Promise<SiteIdUser[]> {
    try {
      const userSiteId = await this.getUserSiteId(userId)
      
      if (!userSiteId) {
        return []
      }

      return await this.getManagersBySiteId(userSiteId)
    } catch (error) {
      console.error('Error fetching available managers for user:', error)
      return []
    }
  }

  /**
   * ดึงสถิติการใช้งาน SITE_ID
   */
  static async getSiteIdStats(): Promise<any> {
    try {
      // ดึงสถิติผู้ใช้
      const userStats = await prisma.$queryRaw<{ total: number, withSiteId: number }[]>`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN SITE_ID IS NOT NULL THEN 1 END) as withSiteId
        FROM USERS
      `

      // ดึงสถิติ requisitions
      const requisitionStats = await prisma.$queryRaw<{ total: number, withSiteId: number }[]>`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN SITE_ID IS NOT NULL THEN 1 END) as withSiteId
        FROM REQUISITIONS
      `

      // ดึงรายการ SITE_ID ที่มีในระบบ
      const siteIdList = await prisma.$queryRaw<{ siteId: string }[]>`
        SELECT DISTINCT SITE_ID 
        FROM USERS 
        WHERE SITE_ID IS NOT NULL 
        ORDER BY SITE_ID
      `

      const userStat = userStats[0] || { total: 0, withSiteId: 0 }
      const requisitionStat = requisitionStats[0] || { total: 0, withSiteId: 0 }

      return {
        totalUsers: userStat.total,
        usersWithSiteId: userStat.withSiteId,
        totalRequisitions: requisitionStat.total,
        requisitionsWithSiteId: requisitionStat.withSiteId,
        siteIdList: siteIdList.map(item => item.siteId)
      }
    } catch (error) {
      console.error('Error fetching SITE_ID stats:', error)
      return {
        totalUsers: 0,
        usersWithSiteId: 0,
        totalRequisitions: 0,
        requisitionsWithSiteId: 0,
        siteIdList: []
      }
    }
  }
} 