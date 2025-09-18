import { prisma } from "@/lib/prisma"
import { NotificationService } from "./notification-service"
import { PrismaTransaction } from "@/types"

export interface ApprovalData {
  REQUISITION_ID: number
  APPROVED_BY: string
  STATUS: "APPROVED" | "REJECTED"
  NOTE?: string
}

export interface StatusHistoryData {
  REQUISITION_ID: number
  STATUS: string
  CHANGED_BY: string
  COMMENT?: string
}

export interface ApprovalResult {
  approvalId: number
  statusHistoryId: number
  status: string
  message: string
}

/**
 * บริการจัดการการอนุมัติที่รวมความเชื่อมโยงระหว่าง APPROVALS และ STATUS_HISTORY
 */
export class ApprovalService {
  
  /**
   * ดึงสถานะล่าสุดจากตาราง APPROVALS
   */
  static async getLatestStatus(requisitionId: number): Promise<string> {
    try {
      const latestApproval = await prisma.aPPROVALS.findFirst({
        where: { REQUISITION_ID: requisitionId },
        orderBy: { APPROVED_AT: "desc" }
      })
      
      return latestApproval?.STATUS || "PENDING"
    } catch (error) {
      console.error("Error getting latest status:", error)
      return "PENDING"
    }
  }

  /**
   * ดึงประวัติการอนุมัติทั้งหมดของ requisition
   */
  static async getApprovalHistory(requisitionId: number) {
    try {
      const approvals = await prisma.aPPROVALS.findMany({
        where: { REQUISITION_ID: requisitionId },
        orderBy: { APPROVED_AT: "desc" },
        include: {
          USERS: {
            select: {
              USER_ID: true,
              USERNAME: true,
              EMAIL: true
            }
          }
        }
      })

      return approvals
    } catch (error) {
      console.error("Error getting approval history:", error)
      return []
    }
  }

  /**
   * ดึงประวัติการเปลี่ยนแปลงสถานะทั้งหมด
   */
  static async getStatusHistory(requisitionId: number) {
    try {
      const statusHistory = await prisma.sTATUS_HISTORY.findMany({
        where: { REQUISITION_ID: requisitionId },
        orderBy: { CHANGED_AT: "desc" },
        include: {
          USERS: {
            select: {
              USER_ID: true,
              USERNAME: true,
              EMAIL: true
            }
          }
        }
      })

      return statusHistory
    } catch (error) {
      console.error("Error getting status history:", error)
      return []
    }
  }

  /**
   * ดึงข้อมูลรวมของ requisition พร้อมสถานะและประวัติ
   */
  static async getRequisitionWithHistory(requisitionId: number) {
    try {
      const requisition = await prisma.rEQUISITIONS.findUnique({
        where: { REQUISITION_ID: requisitionId },
        include: {
          REQUISITION_ITEMS: {
            include: { PRODUCTS: { select: { PRODUCT_NAME: true } } }
          },
          APPROVALS: {
            orderBy: { APPROVED_AT: "desc" },
            include: {
              USERS: {
                select: {
                  USER_ID: true,
                  USERNAME: true,
                  EMAIL: true
                }
              }
            }
          },
          STATUS_HISTORY: {
            orderBy: { CHANGED_AT: "desc" },
            include: {
              USERS: {
                select: {
                  USER_ID: true,
                  USERNAME: true,
                  EMAIL: true
                }
              }
            }
          }
        }
      })

      if (!requisition) {
        return null
      }

      // ดึงสถานะล่าสุด
      const latestStatus = await this.getLatestStatus(requisitionId)

      return {
        ...requisition,
        STATUS: latestStatus,
        REQUISITION_ITEMS: requisition.REQUISITION_ITEMS?.map((item: any) => ({
          PRODUCT_NAME: item.PRODUCTS?.PRODUCT_NAME || "",
          QUANTITY: item.QUANTITY,
          UNIT_PRICE: item.UNIT_PRICE,
          TOTAL_PRICE: item.TOTAL_PRICE,
        }))
      }
    } catch (error) {
      console.error("Error getting requisition with history:", error)
      return null
    }
  }

  /**
   * ดึงข้อมูล requisitions ทั้งหมดพร้อมสถานะ
   */
  static async getAllRequisitionsWithStatus() {
    try {
      const requisitions = await prisma.rEQUISITIONS.findMany({
        orderBy: { SUBMITTED_AT: "desc" },
        include: {
          REQUISITION_ITEMS: {
            include: { PRODUCTS: { select: { PRODUCT_NAME: true } } }
          }
        }
      })

      // ดึงสถานะสำหรับแต่ละ requisition
      const result = await Promise.all(requisitions.map(async (r: any) => {
        const status = await this.getLatestStatus(r.REQUISITION_ID)
        return {
          ...r,
          STATUS: status,
          REQUISITION_ITEMS: r.REQUISITION_ITEMS?.map((item: any) => ({
            PRODUCT_NAME: item.PRODUCTS?.PRODUCT_NAME || "",
            QUANTITY: item.QUANTITY,
            UNIT_PRICE: item.UNIT_PRICE,
            TOTAL_PRICE: item.TOTAL_PRICE,
          }))
        }
      }))

      return result
    } catch (error) {
      console.error("Error getting all requisitions with status:", error)
      return []
    }
  }

  /**
   * ดึงข้อมูล requisitions ของ user เฉพาะพร้อมสถานะ
   */
  static async getUserRequisitionsWithStatus(userId: string) {
    try {
      const requisitions = await prisma.rEQUISITIONS.findMany({
        where: { USER_ID: userId },
        orderBy: { SUBMITTED_AT: "desc" },
        include: {
          REQUISITION_ITEMS: {
            include: { PRODUCTS: { select: { PRODUCT_NAME: true } } }
          }
        }
      })

      // ดึงสถานะสำหรับแต่ละ requisition
      const result = await Promise.all(requisitions.map(async (r: any) => {
        const status = await this.getLatestStatus(r.REQUISITION_ID)
        return {
          ...r,
          STATUS: status,
          REQUISITION_ITEMS: r.REQUISITION_ITEMS?.map((item: any) => ({
            PRODUCT_NAME: item.PRODUCTS?.PRODUCT_NAME || "",
            QUANTITY: item.QUANTITY,
            UNIT_PRICE: item.UNIT_PRICE,
            TOTAL_PRICE: item.TOTAL_PRICE,
          }))
        }
      }))

      return result
    } catch (error) {
      console.error("Error getting user requisitions with status:", error)
      return []
    }
  }

  /**
   * สร้างการอนุมัติใหม่พร้อมบันทึกประวัติ
   */
  static async createApproval(approvalData: ApprovalData): Promise<ApprovalResult> {
    try {
      console.log(`🔔 Creating approval for requisition ${approvalData.REQUISITION_ID} with status ${approvalData.STATUS}`)
      
      // ใช้ transaction เพื่อให้แน่ใจว่าข้อมูลถูกบันทึกทั้งสามตาราง
      const result = await prisma.$transaction(async (tx: PrismaTransaction) => {
        // อัพเดทสถานะในตาราง REQUISITIONS
        await tx.rEQUISITIONS.update({
          where: { REQUISITION_ID: approvalData.REQUISITION_ID },
          data: { 
            STATUS: approvalData.STATUS
          }
        })

        // สร้าง record ในตาราง APPROVALS
        const approval = await tx.aPPROVALS.create({
          data: {
            REQUISITION_ID: approvalData.REQUISITION_ID,
            APPROVED_BY: approvalData.APPROVED_BY,
            STATUS: approvalData.STATUS,
            NOTE: approvalData.NOTE || `${approvalData.STATUS} by ${approvalData.APPROVED_BY}`,
          },
        })

        // สร้าง record ในตาราง STATUS_HISTORY
        const statusHistory = await tx.sTATUS_HISTORY.create({
          data: {
            REQUISITION_ID: approvalData.REQUISITION_ID,
            STATUS: approvalData.STATUS,
            CHANGED_BY: approvalData.APPROVED_BY,
            COMMENT: approvalData.NOTE || `${approvalData.STATUS} by ${approvalData.APPROVED_BY}`,
          },
        })

        return {
          approvalId: approval.APPROVAL_ID,
          statusHistoryId: statusHistory.STATUS_ID,
          status: approvalData.STATUS,
          message: `Requisition ${approvalData.STATUS.toLowerCase()} successfully`
        }
      })

      // ส่งการแจ้งเตือนหลังจาก transaction สำเร็จ
      try {
        if (approvalData.STATUS === "APPROVED") {
          await NotificationService.notifyRequisitionApproved(approvalData.REQUISITION_ID, approvalData.APPROVED_BY)
          console.log(`✅ Approval notification sent for requisition ${approvalData.REQUISITION_ID}`)
        } else if (approvalData.STATUS === "REJECTED") {
          await NotificationService.notifyRequisitionRejected(approvalData.REQUISITION_ID, approvalData.APPROVED_BY, approvalData.NOTE)
          console.log(`✅ Rejection notification sent for requisition ${approvalData.REQUISITION_ID}`)
        }
      } catch (notificationError) {
        console.error("❌ Error sending notification:", notificationError)
        // ไม่ throw error เพราะ transaction สำเร็จแล้ว
      }

      return result
    } catch (error) {
      console.error("❌ Error creating approval:", error)
      throw new Error("Failed to create approval")
    }
  }

  /**
   * ดึงสถิติการอนุมัติ
   */
  static async getApprovalStats() {
    try {
      const [pending, approved, rejected] = await Promise.all([
        prisma.aPPROVALS.count({
          where: { STATUS: "PENDING" }
        }),
        prisma.aPPROVALS.count({
          where: { STATUS: "APPROVED" }
        }),
        prisma.aPPROVALS.count({
          where: { STATUS: "REJECTED" }
        })
      ])

      return {
        pending,
        approved,
        rejected,
        total: pending + approved + rejected
      }
    } catch (error) {
      console.error("Error getting approval stats:", error)
      return {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
      }
    }
  }
} 