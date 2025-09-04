import { prisma } from "./prisma"
import { NotificationService } from "./notification-service"

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
      
      // Search by EmpCode only (according to authOptions that uses empCode as USER_ID)
      console.log("Querying userWithRoles view with EmpCode:", userId)
      const userData = await prisma.$queryRaw<{ orgcode3: string }[]>`
        SELECT orgcode3 
        FROM userWithRoles 
        WHERE EmpCode = ${userId}
      `
      console.log("User data from view with EmpCode:", userData)
      
      if (!userData || userData.length === 0) {
        console.log("No user found in userWithRoles view with EmpCode:", userId)
        
        // Fallback: Try to find user in USERS table
        console.log("Trying fallback: searching in USERS table...")
        const fallbackUser = await prisma.uSERS.findUnique({
          where: { USER_ID: userId },
          select: { SITE_ID: true }
        })
        
        if (fallbackUser?.SITE_ID) {
          console.log("Found SITE_ID in USERS table:", fallbackUser.SITE_ID)
          return fallbackUser.SITE_ID
        }
        
        // If still no SITE_ID, use default
        console.log("No SITE_ID found, using default 'HQ'")
        return 'HQ'
      }
      
      const orgcode3 = userData[0].orgcode3
      console.log("Found orgcode3:", orgcode3)
      return orgcode3 || 'HQ' // Fallback to 'HQ' if orgcode3 is null
    } catch (error: unknown) {
      console.error('Error fetching user SITE_ID:', error)
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        })
      }
      
      // Fallback: return default SITE_ID
      console.log("Error occurred, using fallback SITE_ID: 'HQ'")
      return 'HQ'
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
      console.log(`✅ Updated SITE_ID for user ${userId} to ${siteId}`)
      return true
    } catch (error) {
      console.error(`❌ Error updating SITE_ID for user ${userId}:`, error)
      return false
    }
  }

  /**
   * สร้าง Requisition พร้อม SITE_ID และ Items
   */
  static async createRequisitionWithSiteId(
    userId: string,
    totalAmount: number,
    issueNote?: string,
    siteId?: string,
    items?: Array<{
      PRODUCT_ID: number
      QUANTITY: number
      UNIT_PRICE: number
      TOTAL_PRICE: number
    }>
  ): Promise<number | null> {
    try {
      console.log("=== CREATE REQUISITION START ===")
      console.log("Creating requisition with params:", { userId, totalAmount, issueNote, siteId, itemsCount: items?.length })
      
      // ตรวจสอบ database connection
      try {
        await prisma.$queryRaw`SELECT 1`
        console.log("✅ Database connection OK")
      } catch (dbError) {
        console.error("❌ Database connection error:", dbError)
        throw new Error("Database connection failed")
      }
      
      // ตรวจสอบ schema ของตาราง REQUISITIONS
      try {
        const tableInfo = await prisma.$queryRaw`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'REQUISITIONS'
          ORDER BY ORDINAL_POSITION
        `
        console.log("✅ REQUISITIONS table schema:", tableInfo)
        
        // ตรวจสอบว่าตารางมีข้อมูลหรือไม่
        const tableExists = await prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_NAME = 'REQUISITIONS'
        `
        console.log("✅ REQUISITIONS table exists:", tableExists)
      } catch (schemaError) {
        console.error("❌ Schema check error:", schemaError)
        throw new Error("Database schema check failed")
      }
      
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
        
        // สร้าง user ใหม่ถ้าไม่มี
        console.log("Creating new user in USERS table:", userId)
        try {
          await prisma.uSERS.create({
            data: {
              USER_ID: userId,
              USERNAME: userId, // ใช้ userId เป็น username ชั่วคราว
              EMAIL: `${userId}@company.com`, // email ชั่วคราว
              PASSWORD: 'temp_password_123', // รหัสผ่านชั่วคราว
              ROLE: 'USER',
              SITE_ID: userSiteId || siteId || 'HQ'
            }
          })
          console.log("✅ Created new user:", userId)
        } catch (createError) {
          console.error("❌ Error creating user:", createError)
          throw new Error(`Failed to create user: ${createError instanceof Error ? createError.message : 'Unknown error'}`)
        }
      }
      
      // สร้าง requisition
      console.log("Executing INSERT query with values:", {
        USER_ID: userId,
        STATUS: 'PENDING',
        TOTAL_AMOUNT: totalAmount,
        ISSUE_NOTE: issueNote || '',
        SITE_ID: userSiteId || siteId || 'HQ'
      })
      
      try {
        const result = await prisma.$executeRaw`
          INSERT INTO REQUISITIONS (USER_ID, STATUS, TOTAL_AMOUNT, ISSUE_NOTE, SITE_ID)
          VALUES (${userId}, 'PENDING', ${totalAmount}, ${issueNote || ''}, ${userSiteId || siteId || 'HQ'})
        `
        console.log("✅ INSERT result:", result)
      } catch (insertError) {
        console.error("❌ INSERT error:", insertError)
        throw insertError
      }
      
      // ดึง ID ของ requisition ที่เพิ่งสร้าง
      let requisitionId: { REQUISITION_ID: number }[] = []
      try {
        requisitionId = await prisma.$queryRaw<{ REQUISITION_ID: number }[]>`
          SELECT TOP 1 REQUISITION_ID 
          FROM REQUISITIONS 
          WHERE USER_ID = ${userId} 
          ORDER BY SUBMITTED_AT DESC
        `
        console.log("✅ Retrieved requisition ID:", requisitionId)
      } catch (selectError) {
        console.error("❌ SELECT error:", selectError)
        throw selectError
      }
      
      const finalRequisitionId = requisitionId && requisitionId.length > 0 ? requisitionId[0].REQUISITION_ID : null
      
      if (!finalRequisitionId) {
        console.error("❌ Failed to retrieve requisition ID after creation")
        throw new Error("Failed to retrieve requisition ID after creation")
      }
      
      console.log("✅ Final requisition ID:", finalRequisitionId)
      
      // สร้าง requisition items ถ้ามี
      if (items && items.length > 0) {
        console.log(`Creating ${items.length} requisition items for requisition ${finalRequisitionId}`)
        
        try {
          for (const item of items) {
            console.log("Creating item:", item)
            await prisma.rEQUISITION_ITEMS.create({
              data: {
                REQUISITION_ID: finalRequisitionId,
                PRODUCT_ID: item.PRODUCT_ID,
                QUANTITY: item.QUANTITY,
                UNIT_PRICE: item.UNIT_PRICE,
                // TOTAL_PRICE เป็น computed column ไม่ต้องใส่ค่า
              }
            })
          }
          
          console.log(`✅ Created ${items.length} requisition items`)
        } catch (itemsError) {
          console.error("❌ Error creating requisition items:", itemsError)
          throw itemsError
        }
      }
      
      // สร้างการแจ้งเตือนเมื่อสร้าง requisition สำเร็จ
      try {
        await NotificationService.notifyRequisitionCreated(finalRequisitionId, userId)
        console.log(`✅ Notification created for requisition ${finalRequisitionId}`)
      } catch (notificationError) {
        console.error(`❌ Error creating notification for requisition ${finalRequisitionId}:`, notificationError)
        // ไม่ throw error เพราะ notification ไม่ใช่ส่วนสำคัญ
      }
      
      console.log("=== CREATE REQUISITION SUCCESS ===")
      console.log("Final requisition ID:", finalRequisitionId)
      return finalRequisitionId
    } catch (error: unknown) {
      console.error("=== CREATE REQUISITION ERROR ===")
      console.error('Error creating requisition with SITE_ID:', error)
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        })
        throw error // Re-throw the error so API route can catch it
      }
      throw new Error('Unknown error occurred while creating requisition')
    }
  }

  /**
   * ดึง Requisitions ที่ Manager สามารถอนุมัติได้ (มี SITE_ID เดียวกัน)
   */
  static async getRequisitionsForManager(managerUserId: string): Promise<unknown[]> {
    try {
      console.log("🔍 getRequisitionsForManager called with managerUserId:", managerUserId)
      
      // ดึง SITE_ID ของ manager
      const managerSiteId = await this.getUserSiteId(managerUserId)
      console.log("🔍 Manager SITE_ID:", managerSiteId)
      
      if (!managerSiteId) {
        console.log("❌ No SITE_ID found for manager, returning empty array")
        return []
      }

      // ดึง requisitions ที่มี SITE_ID เดียวกัน
      console.log("🔍 Querying requisitions with SITE_ID:", managerSiteId)
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
      
      console.log("🔍 Found requisitions:", requisitions)
      
      // ดึงข้อมูล requisition items สำหรับแต่ละ requisition
      if (Array.isArray(requisitions)) {
        const enrichedRequisitions = await Promise.all(
          requisitions.map(async (req: any) => {
            try {
              // ดึง requisition items
              const items = await prisma.$queryRaw`
                SELECT 
                  ri.ITEM_ID,
                  ri.REQUISITION_ID,
                  ri.PRODUCT_ID,
                  p.PRODUCT_NAME,
                  p.ORDER_UNIT,
                  p.PHOTO_URL,
                  pc.CATEGORY_NAME,
                  ri.QUANTITY,
                  ri.UNIT_PRICE,
                  ri.TOTAL_PRICE
                FROM REQUISITION_ITEMS ri
                JOIN PRODUCTS p ON ri.PRODUCT_ID = p.PRODUCT_ID
                LEFT JOIN PRODUCT_CATEGORIES pc ON p.CATEGORY_ID = pc.CATEGORY_ID
                WHERE ri.REQUISITION_ID = ${req.REQUISITION_ID}
              `
              
              return {
                ...req,
                REQUISITION_ITEMS: Array.isArray(items) ? items : []
              }
            } catch (itemError) {
              console.error(`Error fetching items for requisition ${req.REQUISITION_ID}:`, itemError)
              return {
                ...req,
                REQUISITION_ITEMS: []
              }
            }
          })
        )
        
        console.log("🔍 Enriched requisitions with items:", enrichedRequisitions)
        return enrichedRequisitions
      }
      
      return Array.isArray(requisitions) ? requisitions : []
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
   * ดึงข้อมูลคำสั่งซื้อทั้งหมดจากแผนกเดียวกัน (SITE_ID เดียวกัน)
   */
  static async getAllRequisitionsForDepartment(userId: string): Promise<unknown[]> {
    try {
      console.log("🏢 Getting all requisitions for department of user:", userId)
      
      // ดึง SITE_ID ของ user
      const userSiteId = await this.getUserSiteId(userId)
      
      console.log("🏢 User SITE_ID:", userSiteId)
      
      // ดึง requisitions ทั้งหมดจาก SITE_ID เดียวกัน
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
          u.DEPARTMENT,
          u.ROLE
        FROM REQUISITIONS r
        JOIN USERS u ON r.USER_ID = u.USER_ID
        WHERE r.SITE_ID = ${userSiteId}
        ORDER BY r.SUBMITTED_AT DESC
      `
      
      console.log("🏢 Found department requisitions:", requisitions)
      return Array.isArray(requisitions) ? requisitions : []
    } catch (error: unknown) {
      console.error('Error fetching department requisitions:', error)
      if (error instanceof Error) { 
        console.error('Error details:', { message: error.message, stack: error.stack }) 
      }
      return []
    }
  }

  /**
   * ดึงข้อมูลคำสั่งซื้อทั้งหมดจาก SITE_ID ที่กำหนด (สำหรับกรณีที่ต้องการข้อมูลจาก SITE_ID เฉพาะ)
   */
  static async getRequisitionsBySiteId(siteId: string): Promise<unknown[]> {
    try {
      console.log("🏢 Getting all requisitions for SITE_ID:", siteId)
      
      // ดึง requisitions ทั้งหมดจาก SITE_ID ที่กำหนด
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
          u.DEPARTMENT,
          u.ROLE
        FROM REQUISITIONS r
        JOIN USERS u ON r.USER_ID = u.USER_ID
        WHERE r.SITE_ID = ${siteId}
        ORDER BY r.SUBMITTED_AT DESC
      `
      
      console.log("🏢 Found requisitions for SITE_ID:", siteId, requisitions)
      return Array.isArray(requisitions) ? requisitions : []
    } catch (error: unknown) {
      console.error('Error fetching requisitions by SITE_ID:', error)
      if (error instanceof Error) { 
        console.error('Error details:', { message: error.message, stack: error.stack }) 
      }
      return []
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
  static async getSiteIdStats(): Promise<unknown> {
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

  static async getApprovedRequisitionsForAdmin(): Promise<unknown[]> {
    try {
      console.log("🔍 getApprovedRequisitionsForAdmin called")
      
      // ดึง requisitions ที่มี STATUS = 'APPROVED' (Manager approve แล้ว)
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
          u.DEPARTMENT,
          u.ROLE as USER_ROLE
        FROM REQUISITIONS r
        JOIN USERS u ON r.USER_ID = u.USER_ID
        WHERE r.STATUS = 'APPROVED'
        ORDER BY r.SUBMITTED_AT DESC
      `
      
      console.log("🔍 Found approved requisitions:", requisitions)
      
      // ดึงข้อมูล requisition items สำหรับแต่ละ requisition
      if (Array.isArray(requisitions)) {
        const enrichedRequisitions = await Promise.all(
          requisitions.map(async (req: any) => {
            try {
              // ดึง requisition items
              const items = await prisma.$queryRaw`
                SELECT 
                  ri.ITEM_ID,
                  ri.REQUISITION_ID,
                  ri.PRODUCT_ID,
                  p.PRODUCT_NAME,
                  p.ORDER_UNIT,
                  p.PHOTO_URL,
                  pc.CATEGORY_NAME,
                  ri.QUANTITY,
                  ri.UNIT_PRICE,
                  ri.TOTAL_PRICE
                FROM REQUISITION_ITEMS ri
                JOIN PRODUCTS p ON ri.PRODUCT_ID = p.PRODUCT_ID
                LEFT JOIN PRODUCT_CATEGORIES pc ON p.CATEGORY_ID = pc.CATEGORY_ID
                WHERE ri.REQUISITION_ID = ${req.REQUISITION_ID}
              `
              
              // ดึงข้อมูล approval history
              const approvals = await prisma.$queryRaw`
                SELECT 
                  a.APPROVAL_ID,
                  a.APPROVED_BY,
                  a.STATUS,
                  a.APPROVED_AT,
                  a.NOTE,
                  u.USERNAME as APPROVER_NAME
                FROM APPROVALS a
                JOIN USERS u ON a.APPROVED_BY = u.USER_ID
                WHERE a.REQUISITION_ID = ${req.REQUISITION_ID}
                ORDER BY a.APPROVED_AT DESC
              `
              
              return {
                ...req,
                REQUISITION_ITEMS: Array.isArray(items) ? items : [],
                APPROVALS: Array.isArray(approvals) ? approvals : []
              }
            } catch (itemError) {
              console.error(`Error fetching items for requisition ${req.REQUISITION_ID}:`, itemError)
              return {
                ...req,
                REQUISITION_ITEMS: [],
                APPROVALS: []
              }
            }
          })
        )
        
        console.log("🔍 Enriched requisitions with items and approvals:", enrichedRequisitions)
        return enrichedRequisitions
      }
      
      return []
    } catch (error: unknown) {
      console.error('Error fetching approved requisitions for admin:', error)
      if (error instanceof Error) { 
        console.error('Error details:', { message: error.message, stack: error.stack }) 
      }
      return []
    }
  }
}