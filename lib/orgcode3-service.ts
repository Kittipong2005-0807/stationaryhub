import { prisma } from "./prisma"

export interface OrgCode3User {
  USER_ID: string
  USERNAME: string
  ROLE: string
  ORGCODE3: string
  DEPARTMENT?: string
}

export class OrgCode3Service {
  /**
   * ดึงข้อมูล Manager ที่มี orgcode3 เดียวกับ User
   */
  static async getManagersByOrgCode3(orgcode3: string): Promise<OrgCode3User[]> {
    try {
      const managers = await prisma.$queryRaw<OrgCode3User[]>`
        SELECT USER_ID, USERNAME, ROLE, ORGCODE3, DEPARTMENT
        FROM USERS 
        WHERE ORGCODE3 = ${orgcode3} 
        AND ROLE IN ('MANAGER', 'ADMIN', 'SUPER_ADMIN', 'DEV')
        ORDER BY ROLE DESC, USERNAME ASC
      `
      return managers || []
    } catch (error) {
      console.error('Error fetching managers by orgcode3:', error)
      return []
    }
  }

  /**
   * ดึงข้อมูล User และ orgcode3 จาก LDAP view
   */
  static async getUserOrgCode3(userId: string): Promise<string | null> {
    try {
      const userData = await prisma.$queryRaw<{ orgcode3: string }[]>`
        SELECT orgcode3 
        FROM userWithRoles 
        WHERE AdLoginName = ${userId}
      `
      return userData && userData.length > 0 ? userData[0].orgcode3 : null
    } catch (error) {
      console.error('Error fetching user orgcode3:', error)
      return null
    }
  }

  /**
   * อัปเดต orgcode3 ในตาราง USERS
   */
  static async updateUserOrgCode3(userId: string, orgcode3: string): Promise<boolean> {
    try {
      await prisma.$executeRaw`
        UPDATE USERS 
        SET ORGCODE3 = ${orgcode3}
        WHERE USER_ID = ${userId}
      `
      return true
    } catch (error) {
      console.error('Error updating user orgcode3:', error)
      return false
    }
  }

  /**
   * สร้าง Requisition พร้อม orgcode3
   */
  static async createRequisitionWithOrgCode3(
    userId: string,
    totalAmount: number,
    issueNote?: string,
    siteId?: string
  ): Promise<number | null> {
    try {
      // ดึง orgcode3 ของ user
      const orgcode3 = await this.getUserOrgCode3(userId)
      
      // สร้าง requisition
      const result = await prisma.$executeRaw`
        INSERT INTO REQUISITIONS (USER_ID, STATUS, TOTAL_AMOUNT, ISSUE_NOTE, SITE_ID, ORGCODE3)
        VALUES (${userId}, 'PENDING', ${totalAmount}, ${issueNote || ''}, ${siteId || 'HQ'}, ${orgcode3 || ''})
      `
      
      // ดึง ID ของ requisition ที่เพิ่งสร้าง
      const requisitionId = await prisma.$queryRaw<{ REQUISITION_ID: number }[]>`
        SELECT TOP 1 REQUISITION_ID 
        FROM REQUISITIONS 
        WHERE USER_ID = ${userId} 
        ORDER BY SUBMITTED_AT DESC
      `
      
      return requisitionId && requisitionId.length > 0 ? requisitionId[0].REQUISITION_ID : null
    } catch (error) {
      console.error('Error creating requisition with orgcode3:', error)
      return null
    }
  }

  /**
   * ดึง Requisitions ที่ Manager สามารถอนุมัติได้ (มี orgcode3 เดียวกัน)
   */
  static async getRequisitionsForManager(managerUserId: string): Promise<any[]> {
    try {
      // ดึง orgcode3 ของ manager
      const managerOrgCode3 = await this.getUserOrgCode3(managerUserId)
      
      if (!managerOrgCode3) {
        return []
      }

      // ดึง requisitions ที่มี orgcode3 เดียวกัน
      const requisitions = await prisma.$queryRaw`
        SELECT 
          r.REQUISITION_ID,
          r.USER_ID,
          r.STATUS,
          r.SUBMITTED_AT,
          r.TOTAL_AMOUNT,
          r.SITE_ID,
          r.ISSUE_NOTE,
          r.ORGCODE3,
          u.USERNAME,
          u.DEPARTMENT
        FROM REQUISITIONS r
        JOIN USERS u ON r.USER_ID = u.USER_ID
        WHERE r.ORGCODE3 = ${managerOrgCode3}
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
      const userOrgCode3 = await this.getUserOrgCode3(userId)
      const managerOrgCode3 = await this.getUserOrgCode3(managerUserId)
      
      return userOrgCode3 === managerOrgCode3 && userOrgCode3 !== null
    } catch (error) {
      console.error('Error checking user-manager relationship:', error)
      return false
    }
  }

  /**
   * ดึงรายการ Manager ทั้งหมดที่ User สามารถส่งคำขอได้
   */
  static async getAvailableManagersForUser(userId: string): Promise<OrgCode3User[]> {
    try {
      const userOrgCode3 = await this.getUserOrgCode3(userId)
      
      if (!userOrgCode3) {
        return []
      }

      return await this.getManagersByOrgCode3(userOrgCode3)
    } catch (error) {
      console.error('Error fetching available managers for user:', error)
      return []
    }
  }

  /**
   * ดึงสถิติการใช้งาน orgcode3
   */
  static async getOrgCode3Stats(): Promise<any> {
    try {
      // ดึงสถิติผู้ใช้
      const userStats = await prisma.$queryRaw<{ total: number, withOrgCode3: number }[]>`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN ORGCODE3 IS NOT NULL THEN 1 END) as withOrgCode3
        FROM USERS
      `

      // ดึงสถิติ requisitions
      const requisitionStats = await prisma.$queryRaw<{ total: number, withOrgCode3: number }[]>`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN ORGCODE3 IS NOT NULL THEN 1 END) as withOrgCode3
        FROM REQUISITIONS
      `

      // ดึงรายการ orgcode3 ที่มีในระบบ
      const orgCode3List = await prisma.$queryRaw<{ orgcode3: string }[]>`
        SELECT DISTINCT ORGCODE3 
        FROM USERS 
        WHERE ORGCODE3 IS NOT NULL 
        ORDER BY ORGCODE3
      `

      const userStat = userStats[0] || { total: 0, withOrgCode3: 0 }
      const requisitionStat = requisitionStats[0] || { total: 0, withOrgCode3: 0 }

      return {
        totalUsers: userStat.total,
        usersWithOrgCode3: userStat.withOrgCode3,
        totalRequisitions: requisitionStat.total,
        requisitionsWithOrgCode3: requisitionStat.withOrgCode3,
        orgCode3List: orgCode3List.map(item => item.orgcode3)
      }
    } catch (error) {
      console.error('Error fetching orgcode3 stats:', error)
      return {
        totalUsers: 0,
        usersWithOrgCode3: 0,
        totalRequisitions: 0,
        requisitionsWithOrgCode3: 0,
        orgCode3List: []
      }
    }
  }
} 