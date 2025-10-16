import { prisma } from './prisma'
import nodemailer from 'nodemailer'
import { User } from '@/types'
import { ThaiTimeUtils } from './thai-time-utils'

export interface NotificationData {
  type: 'requisition_created' | 'requisition_approved' | 'requisition_rejected' | 'requisition_pending' | 'no_manager_found'
  userId: string
  requisitionId: number
  message: string
  email?: string
  notificationType?: 'email' | 'in-app' | 'both' // ประเภทการแจ้งเตือน
  actorId?: string // ผู้ที่ทำการกระทำ
  priority?: 'low' | 'medium' | 'high' // ความสำคัญ
  data?: any // ข้อมูลเพิ่มเติมสำหรับ email template
}



export class NotificationService {
  // เพิ่มการจัดการ memory
  private static memoryCleanup() {
    if (global.gc) {
      global.gc()
    }
  }

  /**
   * ส่งการแจ้งเตือนเมื่อสร้าง requisition ใหม่ - ส่งอีเมลไปยัง User และ Manager ทันทีโดยไม่มีเงื่อนไข
   */
    static async notifyRequisitionCreated(requisitionId: number, userId: string) {
    console.log(`🔔 Sending immediate email notifications for requisition: ${requisitionId} by ${userId}`)
    
    try {
      // ดึงข้อมูล requisition
      const requisition = await prisma.rEQUISITIONS.findUnique({
        where: { REQUISITION_ID: requisitionId },
        include: {
          USERS: {
            select: {
              USER_ID: true,
              USERNAME: true,
              EMAIL: true
            }
          },
          REQUISITION_ITEMS: {
            take: 50,
            include: {
              PRODUCTS: {
                select: {
                  PRODUCT_NAME: true,
                  PRODUCT_ID: true
                }
              }
            }
          }
        }
      })

      if (!requisition) {
        console.log(`❌ Requisition ${requisitionId} not found`)
        return
      }

      // สร้างข้อมูลสำหรับอีเมล
      const emailData = {
        requisitionId,
        requesterName: requisition.USERS?.USERNAME || userId,
        totalAmount: requisition.TOTAL_AMOUNT || 0,
        submittedAt: requisition.SUBMITTED_AT || new Date(),
        items: requisition.REQUISITION_ITEMS?.slice(0, 20).map((item: any) => ({
          productName: item.PRODUCTS?.PRODUCT_NAME || 'Unknown Product',
          quantity: item.QUANTITY || 0,
          unitPrice: Number(item.UNIT_PRICE || 0),
          totalPrice: Number(item.QUANTITY || 0) * Number(item.UNIT_PRICE || 0)
        })) || []
      }

      // 1. ส่งอีเมลให้ User ทันที (ไม่มีเงื่อนไข)
      const userEmail = await this.getUserEmailFromLDAP(userId)
      if (userEmail) {
        try {
          console.log(`📧 Sending email to user ${userId} at ${userEmail}`)
          
          const userEmailHtml = this.createSimpleEmailTemplate('requisition_created', emailData)
          
          await this.sendEmail(
            userEmail,
            'คำขอเบิกได้รับการส่งเรียบร้อยแล้ว',
            userEmailHtml
          )
          
          console.log(`✅ Email sent to user ${userId}`)
        } catch (emailError) {
          console.error(`❌ Error sending email to user ${userId}:`, emailError)
        }
      } else {
        console.log(`⚠️ No email found for user ${userId}`)
      }

      // 2. ส่งอีเมลให้ Manager ทันที (ไม่มีเงื่อนไข)
      await this.sendDirectManagerEmail(requisitionId, userId)

      // 3. บันทึกการแจ้งเตือนในฐานข้อมูล
      const message = `คำขอเบิกของคุณ (เลขที่ ${requisitionId}) ได้ทำการส่งเรียบร้อยแล้ว จำนวนเงิน: ฿${requisition.TOTAL_AMOUNT?.toFixed(2)}`
      
      await this.logNotification({
        type: 'requisition_created',
        userId,
        requisitionId,
        message,
        email: userEmail || undefined,
        actorId: userId,
        priority: 'medium'
      })

      console.log(`✅ All email notifications sent for requisition ${requisitionId}`)

      // ทำความสะอาด memory
      this.memoryCleanup()

    } catch (error) {
      console.error('❌ Error notifying requisition created:', error)
      this.memoryCleanup()
    }
  }

  /**
   * ส่งการแจ้งเตือนเมื่อ requisition ได้รับการอนุมัติ
   */
  static async notifyRequisitionApproved(requisitionId: number, approvedBy: string) {
    try {
      console.log(`🔔 Notifying requisition approved: ${requisitionId} by ${approvedBy}`)
      
      const requisition = await prisma.rEQUISITIONS.findUnique({
        where: { REQUISITION_ID: requisitionId },
        include: { USERS: true }
      })

      if (!requisition) {
        console.log(`❌ Requisition ${requisitionId} not found`)
        return
      }

      // ตรวจสอบว่าเป็น Manager อนุมัติตัวเองหรือไม่
      const isSelfApproval = requisition.USER_ID === approvedBy
      console.log(`🔍 Is self approval: ${isSelfApproval}`)
      console.log(`🔍 Requester: ${requisition.USER_ID}, Approver: ${approvedBy}`)

      if (isSelfApproval) {
        console.log(`✅ Manager ${approvedBy} approved their own requisition - ส่งแจ้งเตือนเฉพาะ Admin`)
        
        // แจ้งเตือน Admin เท่านั้น
        await this.notifyAdmins(requisitionId, approvedBy)
        
        console.log(`✅ Self-approval notification completed for ${requisitionId}`)
        return
      }

      // กรณีปกติ: Manager อนุมัติให้ User อื่น
      const message = `คำขอเบิกของคุณ (เลขที่ ${requisitionId}) ได้รับการอนุมัติแล้ว`

      // ดึง email จาก LDAP
      const userEmail = await this.getUserEmailFromLDAP(requisition.USER_ID)

      // ดึงข้อมูล requisition items สำหรับ User
      const requisitionWithItems = await prisma.rEQUISITIONS.findUnique({
        where: { REQUISITION_ID: requisitionId },
        include: {
          USERS: true,
          REQUISITION_ITEMS: {
            take: 50,
            include: {
              PRODUCTS: {
                select: {
                  PRODUCT_NAME: true,
                  PRODUCT_ID: true
                }
              }
            }
          }
        }
      })

      // สร้างข้อมูลรายการสินค้า
      const items = requisitionWithItems?.REQUISITION_ITEMS?.map((item: any) => ({
        productName: item.PRODUCTS?.PRODUCT_NAME || 'Unknown Product',
        quantity: item.QUANTITY || 0,
        unitPrice: Number(item.UNIT_PRICE || 0),
        totalPrice: Number(item.QUANTITY || 0) * Number(item.UNIT_PRICE || 0)
      })) || []

      // บันทึกการแจ้งเตือนและส่งอีเมลผ่าน logNotification
      await this.logNotification({
        type: 'requisition_approved',
        userId: requisition.USER_ID,
        requisitionId,
        message,
        email: userEmail || undefined,
        notificationType: userEmail ? 'both' : 'in-app', // ส่งทั้ง email และ in-app ถ้ามี email
        // เพิ่มข้อมูลสำหรับ email template
        data: {
          requisitionId,
          requesterName: (requisition.USERS as any)?.FullNameThai || (requisition.USERS as any)?.FullNameEng || requisition.USER_ID,
          approvedBy,
          totalAmount: requisition.TOTAL_AMOUNT,
          items: items,
          submittedAt: requisition.SUBMITTED_AT
        }
      })

      if (userEmail) {
        console.log(`✅ Approval notification sent to user ${requisition.USER_ID} at ${userEmail}`)
      }

      // แจ้งเตือน Admin ว่ามีการอนุมัติคำขอ
      await this.notifyAdmins(requisitionId, approvedBy)

      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Requisition approval notification completed for ${requisitionId}`)
      }

      // ทำความสะอาด memory
      this.memoryCleanup()

    } catch (error) {
      console.error('❌ Error notifying requisition approved:', error)
      // ทำความสะอาด memory แม้เกิด error
      this.memoryCleanup()
    }
  }

  /**
   * ส่งการแจ้งเตือนเมื่อ requisition ถูกปฏิเสธ
   */
  static async notifyRequisitionRejected(requisitionId: number, rejectedBy: string, reason?: string) {
    try {
      console.log(`🔔 Notifying requisition rejected: ${requisitionId} by ${rejectedBy}`)
      
      const requisition = await prisma.rEQUISITIONS.findUnique({
        where: { REQUISITION_ID: requisitionId },
        include: { USERS: true }
      })

      if (!requisition) {
        console.log(`❌ Requisition ${requisitionId} not found`)
        return
      }

      const message = `คำขอเบิกของคุณ (เลขที่ ${requisitionId}) ถูกปฏิเสธ${reason ? `: ${reason}` : ''}`

      // ดึง email จาก LDAP
      const userEmail = await this.getUserEmailFromLDAP(requisition.USER_ID)

      // ดึงข้อมูล requisition items สำหรับ User
      const requisitionWithItems = await prisma.rEQUISITIONS.findUnique({
        where: { REQUISITION_ID: requisitionId },
        include: {
          USERS: true,
          REQUISITION_ITEMS: {
            take: 50,
            include: {
              PRODUCTS: {
                select: {
                  PRODUCT_NAME: true,
                  PRODUCT_ID: true
                }
              }
            }
          }
        }
      })

      // สร้างข้อมูลรายการสินค้า
      const items = requisitionWithItems?.REQUISITION_ITEMS?.map((item: any) => ({
        productName: item.PRODUCTS?.PRODUCT_NAME || 'Unknown Product',
        quantity: item.QUANTITY || 0,
        unitPrice: Number(item.UNIT_PRICE || 0),
        totalPrice: Number(item.QUANTITY || 0) * Number(item.UNIT_PRICE || 0)
      })) || []

      // บันทึกการแจ้งเตือนและส่งอีเมลผ่าน logNotification
      await this.logNotification({
        type: 'requisition_rejected',
        userId: requisition.USER_ID,
        requisitionId,
        message,
        email: userEmail || undefined,
        notificationType: userEmail ? 'both' : 'in-app', // ส่งทั้ง email และ in-app ถ้ามี email
        // เพิ่มข้อมูลสำหรับ email template
        data: {
          requisitionId,
          requesterName: (requisition.USERS as any)?.FullNameThai || (requisition.USERS as any)?.FullNameEng || requisition.USER_ID,
          rejectedBy,
          totalAmount: requisition.TOTAL_AMOUNT,
          items: items,
          submittedAt: requisition.SUBMITTED_AT,
          reason
        }
      })

      if (userEmail) {
        console.log(`✅ Rejection notification sent to user ${requisition.USER_ID} at ${userEmail}`)
      }



      console.log(`✅ Requisition rejection notification completed for ${requisitionId}`)

    } catch (error) {
      console.error('❌ Error notifying requisition rejected:', error)
    }
  }

  /**
   * ส่งอีเมลหา Manager ตรงๆ โดยไม่มีเงื่อนไข - ส่งทันทีเมื่อมีการสั่งของ
   */
  static async sendDirectManagerEmail(requisitionId: number, userId: string) {
    try {
      console.log(`📧 Sending immediate email to managers for requisition ${requisitionId} from user ${userId}`)
      
      // ดึงข้อมูล user เพื่อหา CostCenter
      const user = await prisma.$queryRaw<{ 
        costcentercode: string,
        EmpCode: string 
      }[]>` 
        SELECT TOP 1 costcentercode, EmpCode 
        FROM UserWithRoles 
        WHERE EmpCode = ${userId}
      `;

      if (!user || user.length === 0) {
        console.log(`❌ User ${userId} not found in UserWithRoles`)
        return;
      }

      const userCostCenter = user[0].costcentercode;
      if (!userCostCenter) {
        console.log(`❌ User ${userId} has no CostCenter assigned`)
        return;
      }

      console.log(`🔍 User CostCenter: ${userCostCenter}`)

      // หา managers จาก VS_DivisionMgr - ส่งให้ทุกคนที่เจอ
      const managers = await prisma.$queryRaw<{ 
        L2: string, 
        CurrentEmail: string, 
        FullNameEng: string, 
        PostNameEng: string,
        CostCenter: string
      }[]>` 
        SELECT TOP 10 L2, CurrentEmail, FullNameEng, PostNameEng, CostCenter
        FROM VS_DivisionMgr 
        WHERE CostCenter = ${userCostCenter}
        AND CurrentEmail IS NOT NULL
        AND CurrentEmail != ''
      `;

      console.log(`🔔 Found ${managers.length} managers for CostCenter ${userCostCenter}`)

      // ส่งอีเมลให้ทุก Manager ที่เจอ (ไม่มีเงื่อนไข)
      if (managers.length === 0) {
        console.log(`⚠️ No managers found for CostCenter ${userCostCenter} - but continuing anyway`)
      }

      // ดึงข้อมูล requisition สำหรับสร้างอีเมล
      const requisition = await prisma.rEQUISITIONS.findUnique({
        where: { REQUISITION_ID: requisitionId },
        include: {
          USERS: {
            select: {
              USERNAME: true,
              EMAIL: true
            }
          },
          REQUISITION_ITEMS: {
            take: 20,
            include: {
              PRODUCTS: {
                select: {
                  PRODUCT_NAME: true,
                  PRODUCT_ID: true
                }
              }
            }
          }
        }
      });

      if (!requisition) {
        console.log(`❌ Requisition ${requisitionId} not found`)
        return;
      }

      // สร้างข้อมูลสำหรับอีเมล
      const emailData = {
        requisitionId,
        requesterName: requisition.USERS?.USERNAME || userId,
        totalAmount: requisition.TOTAL_AMOUNT || 0,
        submittedAt: requisition.SUBMITTED_AT || new Date(),
        items: requisition.REQUISITION_ITEMS?.map((item: any) => ({
          productName: item.PRODUCTS?.PRODUCT_NAME || 'Unknown Product',
          quantity: item.QUANTITY || 0,
          unitPrice: Number(item.UNIT_PRICE || 0),
          totalPrice: Number(item.QUANTITY || 0) * Number(item.UNIT_PRICE || 0)
        })) || []
      };

      // ส่งอีเมลไปยัง managers แต่ละคน (ไม่มีเงื่อนไข)
      for (const manager of managers) {
        try {
          console.log(`📤 Sending immediate email to manager: ${manager.FullNameEng} (${manager.CurrentEmail})`)
          
          // สร้าง HTML email template พร้อมระบุชื่อผู้จัดการ
          const emailHtml = this.createEmailTemplate('requisition_pending', {
            ...emailData,
            managerName: manager.FullNameEng
          })
          
          // บันทึกลง EMAIL_LOGS ก่อนส่งอีเมล (ใช้ userId แทน manager.L2 เพื่อหลีกเลี่ยง Foreign Key constraint)
          await prisma.$executeRaw`
            INSERT INTO EMAIL_LOGS (TO_USER_ID, SUBJECT, BODY, STATUS, SENT_AT, IS_READ, FROM_EMAIL, TO_EMAIL, EMAIL_TYPE, PRIORITY, DELIVERY_STATUS, RETRY_COUNT, CREATED_BY)
            VALUES (${userId}, ${`มีคำขอเบิกใหม่รอการอนุมัติ - Requisition #${requisitionId}`}, ${`มีคำขอเบิกใหม่รอการอนุมัติ - Requisition #${requisitionId}`}, 'PENDING', GETDATE(), 0, ${process.env.SMTP_FROM || 'stationaryhub@ube.co.th'}, ${manager.CurrentEmail}, 'requisition_pending', 'medium', 'pending', 0, 'system')
          `;
          
          // ส่งอีเมลตรงๆ (ไม่มีเงื่อนไข)
          const emailResult = await this.sendEmail(
            manager.CurrentEmail,
            `มีคำขอเบิกใหม่รอการอนุมัติ - Requisition #${requisitionId}`,
            emailHtml
          );

          if (emailResult) {
            console.log(`✅ Email sent successfully to manager ${manager.FullNameEng} (${manager.CurrentEmail})`)
            
            // อัปเดตสถานะเป็น SENT ใน EMAIL_LOGS
            await prisma.$executeRaw`
              UPDATE EMAIL_LOGS 
              SET STATUS = 'SENT', 
                  DELIVERY_STATUS = 'sent',
                  UPDATED_AT = GETDATE()
              WHERE TO_USER_ID = ${userId} 
              AND EMAIL_TYPE = 'requisition_pending'
              AND TO_EMAIL = ${manager.CurrentEmail}
              AND STATUS = 'PENDING'
            `;
          } else {
            console.log(`❌ Failed to send email to manager ${manager.FullNameEng}`)
            
            // อัปเดตสถานะเป็น FAILED ใน EMAIL_LOGS
            await prisma.$executeRaw`
              UPDATE EMAIL_LOGS 
              SET STATUS = 'FAILED', 
                  DELIVERY_STATUS = 'failed',
                  ERROR_MESSAGE = 'Direct email sending failed',
                  UPDATED_AT = GETDATE()
              WHERE TO_USER_ID = ${userId} 
              AND EMAIL_TYPE = 'requisition_pending'
              AND TO_EMAIL = ${manager.CurrentEmail}
              AND STATUS = 'PENDING'
            `;
          }
        } catch (emailError) {
          console.error(`❌ Error sending email to manager ${manager.FullNameEng}:`, emailError)
          
          // อัปเดตสถานะเป็น FAILED ใน EMAIL_LOGS
          try {
            await prisma.$executeRaw`
              UPDATE EMAIL_LOGS 
              SET STATUS = 'FAILED', 
                  DELIVERY_STATUS = 'failed',
                  ERROR_MESSAGE = ${emailError instanceof Error ? emailError.message : String(emailError)},
                  UPDATED_AT = GETDATE()
              WHERE TO_USER_ID = ${userId} 
              AND EMAIL_TYPE = 'requisition_pending'
              AND TO_EMAIL = ${manager.CurrentEmail}
              AND STATUS = 'PENDING'
            `;
          } catch (updateError) {
            console.error(`❌ Error updating EMAIL_LOGS for manager ${manager.L2}:`, updateError)
          }
        }
      }

      console.log(`✅ Direct manager email sending completed for requisition ${requisitionId}`)

    } catch (error) {
      console.error('❌ Error in sendDirectManagerEmail:', error)
    }
  }

  /**
   * แจ้งเตือน Manager ว่ามี requisition ใหม่รอการอนุมัติ
   * หา manager จาก OrgCode3, OrgCode4, และ superempcode ในตาราง UserWithRoles
   */
  static async notifyManagers(requisitionId: number, userId: string) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔔 Notifying managers for requisition ${requisitionId} from user ${userId}`)
      }
      
      // ตรวจสอบว่าเป็น Manager หรือไม่ โดยใช้ VS_DivisionMgr
      const managerCheck = await prisma.$queryRaw<{ 
        L2: string, 
        CurrentEmail: string, 
        FullNameEng: string, 
        PostNameEng: string,
        CostCenter: string
      }[]>`
        SELECT TOP 1 L2, CurrentEmail, FullNameEng, PostNameEng, CostCenter
        FROM VS_DivisionMgr 
        WHERE L2 = ${userId}
      `

      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Manager check result:`, managerCheck)
      }

      if (managerCheck && managerCheck.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ User ${userId} is a Manager in VS_DivisionMgr - ไม่ส่งแจ้งเตือนใคร (สามารถอนุมัติตัวเองได้)`)
        }
        return
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 User ${userId} is not a Manager - หา Manager ในแผนกเดียวกัน`)
      }

      // ดึงข้อมูล user เพื่อหา CostCenter
      const user = await prisma.$queryRaw<{ 
        costcentercode: string,
        EmpCode: string 
      }[]>`
        SELECT TOP 1 costcentercode, EmpCode 
        FROM UserWithRoles 
        WHERE EmpCode = ${userId}
      `

      if (!user || user.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`❌ User ${userId} not found in UserWithRoles`)
        }
        return
      }

      const userData = user[0]
      const userCostCenter = userData.costcentercode
      
      if (!userCostCenter) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`❌ User ${userId} has no CostCenter assigned`)
        }
        return
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 User CostCenter: ${userCostCenter}`)
      }

      // หา managers จาก VS_DivisionMgr โดยใช้ CostCenter พร้อมจำกัดจำนวน
      const managers = await prisma.$queryRaw<{ 
        L2: string, 
        CurrentEmail: string, 
        FullNameEng: string, 
        PostNameEng: string,
        CostCenter: string
      }[]>`
        SELECT TOP 10 L2, CurrentEmail, FullNameEng, PostNameEng, CostCenter
        FROM VS_DivisionMgr 
        WHERE CostCenter = ${userCostCenter}
      `

      if (process.env.NODE_ENV === 'development') {
        console.log(`🔔 Found ${managers.length} managers in VS_DivisionMgr`)
      }

      // ส่งอีเมลแจ้งเตือน managers และบันทึกลงฐานข้อมูล
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 Notifying managers for requisition ${requisitionId}`)
      }
      for (const manager of managers) {
        if (manager.CurrentEmail) {
          try {
            if (process.env.NODE_ENV === 'development') {
              console.log(`📧 Sending email to manager: ${manager.FullNameEng} (${manager.CurrentEmail})`)
            }

            // ตรวจสอบว่า user นี้มีอยู่ในตาราง USERS หรือไม่
            const existingUser = await prisma.uSERS.findUnique({
              where: { USER_ID: manager.L2 },
              select: { USER_ID: true }
            })

            if (process.env.NODE_ENV === 'development') {
              console.log(`🔍 Manager ${manager.L2} in USERS table:`, existingUser ? 'exists' : 'not found')
            }

            if (!existingUser) {
              console.log(`⚠️ Manager ${manager.L2} ไม่มีอยู่ในตาราง USERS, ส่งเฉพาะ email เท่านั้น`)
              
              // ส่งอีเมลผ่าน logNotification แม้ว่าจะไม่มี user ในตาราง USERS
              try {
                const notificationResult = await this.logNotification({
                  type: 'requisition_pending',
                  userId: manager.L2,
                  requisitionId,
                  message: `มีคำขอเบิกใหม่ (เลขที่ ${requisitionId}) จาก ${userId} รอการอนุมัติ`,
                  email: manager.CurrentEmail,
                  notificationType: 'email' // ส่งเฉพาะ email เท่านั้น
                })
                
                if (notificationResult) {
                  console.log(`✅ Email sent to manager ${manager.L2} (no user in USERS table)`)                       
                } else {
                  console.log(`❌ ไม่สามารถส่ง email ให้ manager ${manager.L2}`)
                }
              } catch (logError) {
                console.error(`❌ Error sending email to manager ${manager.L2}:`, logError)
              }
              
              continue // ข้ามการสร้าง notification log ซ้ำ
            }

            // บันทึกการแจ้งเตือนลงฐานข้อมูลสำหรับ Manager
            console.log(`📝 Creating In-App notification for manager: ${manager.L2}`)
            
            // ดึงข้อมูล requisition เพื่อส่งรายการสินค้าให้ Manager
            const requisitionForManager = await prisma.rEQUISITIONS.findUnique({
              where: { REQUISITION_ID: requisitionId },
              include: {
                USERS: {
                  select: {
                    USERNAME: true,
                    EMAIL: true
                  }
                },
                REQUISITION_ITEMS: {
                  take: 50,
                  include: {
                    PRODUCTS: {
                      select: {
                        PRODUCT_NAME: true,
                        PRODUCT_ID: true
                      }
                    }
                  }
                }
              }
            })

            // สร้างข้อมูลรายการสินค้า
            const items = requisitionForManager?.REQUISITION_ITEMS?.map((item: any) => ({
              productName: item.PRODUCTS?.PRODUCT_NAME || 'Unknown Product',
              quantity: item.QUANTITY || 0,
              unitPrice: Number(item.UNIT_PRICE || 0),
              totalPrice: Number(item.QUANTITY || 0) * Number(item.UNIT_PRICE || 0)
            })) || []

            const notificationResult = await this.logNotification({
              type: 'requisition_pending',
              userId: manager.L2, // ใช้ L2 ของ Manager จาก VS_DivisionMgr
              requisitionId,
              message: `มีคำขอเบิกใหม่ (เลขที่ ${requisitionId}) จาก ${userId} รอการอนุมัติ`,
              email: manager.CurrentEmail,
              notificationType: 'both', // ส่งทั้ง email และ in-app
              // เพิ่มข้อมูลสำหรับ email template
              data: {
                requisitionId,
                requesterName: requisitionForManager?.USERS?.USERNAME || userId,
                managerName: manager.FullNameEng,
                totalAmount: requisitionForManager?.TOTAL_AMOUNT,
                items: items,
                submittedAt: requisitionForManager?.SUBMITTED_AT
              }
            })

            if (notificationResult) {
              console.log(`✅ ส่งการแจ้งเตือนและบันทึกลงฐานข้อมูลสำหรับ manager ${manager.L2}`)
            } else {
              console.log(`❌ ไม่สามารถสร้าง notification สำหรับ manager ${manager.L2}`)
            }
          } catch (error) {
            console.error(`❌ เกิดข้อผิดพลาดในการแจ้งเตือน manager ${manager.L2}:`, error)
            
            // บันทึก error log
            try {
            await prisma.$executeRaw`
              INSERT INTO EMAIL_LOGS (TO_USER_ID, SUBJECT, BODY, STATUS, SENT_AT, IS_READ, FROM_EMAIL, TO_EMAIL, EMAIL_TYPE, PRIORITY, DELIVERY_STATUS, ERROR_MESSAGE, RETRY_COUNT, CREATED_BY)
              VALUES (${manager.L2}, ${'มีคำขอเบิกใหม่รอการอนุมัติ'}, ${'มีคำขอเบิกใหม่รอการอนุมัติ'}, 'FAILED', GETDATE(), 0, ${process.env.SMTP_FROM || 'stationaryhub@ube.co.th'}, ${manager.CurrentEmail}, 'requisition_pending', 'medium', 'failed', ${error instanceof Error ? error.message : String(error)}, 1, 'system')
            `
              console.log(`📝 Error log created for manager ${manager.L2}`)
            } catch (logError) {
              console.error(`❌ Error creating error log for manager ${manager.L2}:`, logError)
            }
          }
        } else {
          console.log(`⚠️ Manager ${manager.L2} ไม่มีอีเมล`)
        }
      }

      // ถ้าไม่พบ Manager ในองค์กรเดียวกัน ให้แจ้งเตือน Admin
      if (managers.length === 0) {
        console.log(`🔔 No managers found in same organization - แจ้งเตือน Admin`)
        console.log(`🔔 User ${userId} from CostCenter ${userCostCenter} has no Manager assigned`)
        
        const admins = await prisma.$queryRaw<{ USER_ID: string, EMAIL: string, USERNAME: string, ROLE: string, DEPARTMENT: string }[]>`
          SELECT USER_ID, EMAIL, USERNAME, ROLE, DEPARTMENT
          FROM USERS 
          WHERE ROLE = 'ADMIN'
        `

        console.log(`🔔 Found ${admins.length} admins to notify about missing Manager`)

        // สร้าง Log รายละเอียดการส่งเมลให้ Admin (กรณีไม่มี Manager)
        const noManagerLogDetails = {
          requisitionId: requisitionId,
          requesterId: userId,
          costCenter: userCostCenter,
          reason: 'No Manager Found',
          totalAdmins: admins.length,
          admins: admins.map((a: User) => ({
            USER_ID: a.USER_ID,
            EMAIL: a.EMAIL,
            USERNAME: a.USERNAME,
            ROLE: a.ROLE,
            DEPARTMENT: a.DEPARTMENT
          })),
          timestamp: ThaiTimeUtils.getCurrentThaiTimeISO()
        };

        // แสดง Log เฉพาะใน development
        if (process.env.NODE_ENV !== 'production') {
          console.log('📋 ===== NO MANAGER FOUND LOG DETAILS =====');
          console.log('📋 Requisition Details:', {
            ID: noManagerLogDetails.requisitionId,
            RequesterID: noManagerLogDetails.requesterId,
            CostCenter: noManagerLogDetails.costCenter,
            Reason: noManagerLogDetails.reason
          });
          console.log('📋 Admin Details:', {
            TotalAdmins: noManagerLogDetails.totalAdmins,
            Admins: noManagerLogDetails.admins
          });
          console.log('📋 ===== END NO MANAGER FOUND LOG =====');
        }

        for (const admin of admins) {
          if (admin.EMAIL) {
            try {
              // ตรวจสอบว่า admin นี้มีอยู่ในตาราง USERS หรือไม่
              const existingAdmin = await prisma.uSERS.findUnique({
                where: { USER_ID: admin.USER_ID }
              })

              if (!existingAdmin) {
                console.log(`⚠️ Admin ${admin.USER_ID} ไม่มีอยู่ในตาราง USERS, ส่งเฉพาะ email เท่านั้น`)
                
                // ส่งอีเมลผ่าน logNotification แม้ว่าจะไม่มี user ในตาราง USERS
                try {
                  await this.logNotification({
                    type: 'no_manager_found',
                    userId: admin.USER_ID,
                    requisitionId,
                    message: `ผู้ใช้งานแผนก ${userCostCenter} (${userId}) ไม่พบManager - Requisition #${requisitionId}`,
                    email: admin.EMAIL,
                    notificationType: 'email', // ส่งเฉพาะ email เท่านั้น
                    priority: 'high'
                  })
                  console.log(`✅ No manager found notification sent to admin ${admin.USER_ID} (no user in USERS table)`)
                } catch (emailError) {
                  console.error(`❌ เกิดข้อผิดพลาดในการส่ง email ไปยัง admin ${admin.EMAIL}:`, emailError)
                }
                
                continue // ข้ามการสร้าง notification log ซ้ำ
              }

              // บันทึกการแจ้งเตือนและส่งอีเมลผ่าน logNotification
              console.log(`📧 Preparing to send admin notification email to ${admin.EMAIL}`)
              await this.logNotification({
                type: 'no_manager_found',
                userId: admin.USER_ID,
                requisitionId,
                message: `ผู้ใช้งานแผนก ${userCostCenter} (${userId}) ไม่พบManager - Requisition #${requisitionId}`,
                email: admin.EMAIL,
                notificationType: 'both', // ส่งทั้ง email และ in-app
                priority: 'high'
              })

              console.log(`✅ No manager found notification sent to admin ${admin.USER_ID} at ${admin.EMAIL}`)
            } catch (error) {
              console.error(`❌ เกิดข้อผิดพลาดในการแจ้งเตือน admin ${admin.USER_ID}:`, error)
            }
          } else {
            console.log(`⚠️ Admin ${admin.USER_ID} ไม่มีอีเมล`)
          }
        }
      }

    } catch (error) {
      console.error('❌ Error notifying managers:', error)
      // ทำความสะอาด memory แม้เกิด error
      this.memoryCleanup()
    } finally {
      // ทำความสะอาด memory เสมอ
      this.memoryCleanup()
    }
  }

  /**
   * แจ้งเตือนคนที่มี role เป็น admin ว่ามีการอนุมัติคำขอ
   * Admin จะได้รับการแจ้งเตือนทุกครั้งที่มี Manager อนุมัติคำขอเบิก
   */
  static async notifyAdmins(requisitionId: number, approvedBy: string) {
    try {
      console.log(`🔔 Notifying admins about approved requisition: ${requisitionId} by ${approvedBy}`)
      
      // ดึงข้อมูล requisition และ user
      const requisition = await prisma.rEQUISITIONS.findUnique({
        where: { REQUISITION_ID: requisitionId },
        include: { USERS: true }
      })

      if (!requisition) {
        console.log(`❌ Requisition ${requisitionId} not found for admin notification`)
        return
      }

      // ตรวจสอบว่าเป็น Manager อนุมัติตัวเองหรือไม่
      const isSelfApproval = requisition.USER_ID === approvedBy
      console.log(`🔍 Is self approval: ${isSelfApproval}`)

      // หาคนที่มี role เป็น admin จากตาราง USERS
      const admins = await prisma.$queryRaw<{ USER_ID: string, EMAIL: string, USERNAME: string, ROLE: string, DEPARTMENT: string }[]>`
        SELECT USER_ID, EMAIL, USERNAME, ROLE, DEPARTMENT
        FROM USERS 
        WHERE ROLE = 'ADMIN'
      `

      console.log(`🔔 Found ${admins.length} admins (role = 'admin') to notify`)

      // สร้าง Log รายละเอียดการส่งเมลให้ Admin
      const adminLogDetails = {
        requisitionId: requisitionId,
        approvedBy: approvedBy,
        requesterId: requisition.USER_ID,
        requesterName: (requisition.USERS as any)?.FullNameThai || (requisition.USERS as any)?.FullNameEng || requisition.USER_ID,
        totalAmount: requisition.TOTAL_AMOUNT,
        isSelfApproval: isSelfApproval,
        totalAdmins: admins.length,
        admins: admins.map((a: User) => ({
          USER_ID: a.USER_ID,
          EMAIL: a.EMAIL,
          USERNAME: a.USERNAME,
          ROLE: a.ROLE,
          DEPARTMENT: a.DEPARTMENT
        })),
        timestamp: ThaiTimeUtils.getCurrentThaiTimeISO()
      };

      // แสดง Log เฉพาะใน development
      if (process.env.NODE_ENV !== 'production') {
        console.log('📋 ===== ADMIN NOTIFICATION LOG DETAILS =====');
        console.log('📋 Requisition Details:', {
          ID: adminLogDetails.requisitionId,
          ApprovedBy: adminLogDetails.approvedBy,
          RequesterID: adminLogDetails.requesterId,
          RequesterName: adminLogDetails.requesterName,
          TotalAmount: adminLogDetails.totalAmount,
          IsSelfApproval: adminLogDetails.isSelfApproval
        });
        console.log('📋 Admin Details:', {
          TotalAdmins: adminLogDetails.totalAdmins,
          Admins: adminLogDetails.admins
        });
        console.log('📋 ===== END ADMIN NOTIFICATION LOG =====');
      }

      // ส่งอีเมลแจ้งเตือน admins และบันทึกลงฐานข้อมูล
      for (const admin of admins) {
        if (admin.EMAIL) {
          try {
            // ตรวจสอบว่า admin นี้มีอยู่ในตาราง USERS หรือไม่
            const existingAdmin = await prisma.uSERS.findUnique({
              where: { USER_ID: admin.USER_ID }
            })

            if (!existingAdmin) {
              console.log(`⚠️ Admin ${admin.USER_ID} ไม่มีอยู่ในตาราง USERS, ส่งเฉพาะ email เท่านั้น`)
              
              // ส่งอีเมลผ่าน logNotification แม้ว่าจะไม่มี user ในตาราง USERS
              const message = isSelfApproval 
                ? `Manager ${approvedBy} อนุมัติคำขอเบิกของตัวเอง (เลขที่ ${requisitionId}) จำนวนเงิน: ฿${requisition.TOTAL_AMOUNT?.toFixed(2)}`
                : `มีการอนุมัติคำขอเบิกใหม่ (เลขที่ ${requisitionId}) จาก ${(requisition.USERS as any)?.FullNameThai || (requisition.USERS as any)?.FullNameEng || requisition.USER_ID} โดย ${approvedBy} จำนวนเงิน: ฿${requisition.TOTAL_AMOUNT?.toFixed(2)}`
              
              // ดึงข้อมูล requisition items สำหรับ Admin (กรณีไม่มี user ในตาราง USERS)
              const requisitionWithItemsForEmail = await prisma.rEQUISITIONS.findUnique({
                where: { REQUISITION_ID: requisitionId },
                include: {
                  USERS: true,
                  REQUISITION_ITEMS: {
                    take: 50,
                    include: {
                      PRODUCTS: {
                        select: {
                          PRODUCT_NAME: true,
                          PRODUCT_ID: true
                        }
                      }
                    }
                  }
                }
              })

              // สร้างข้อมูลรายการสินค้า
              const itemsForEmail = requisitionWithItemsForEmail?.REQUISITION_ITEMS?.map((item: any) => ({
                productName: item.PRODUCTS?.PRODUCT_NAME || 'Unknown Product',
                quantity: item.QUANTITY || 0,
                unitPrice: Number(item.UNIT_PRICE || 0),
                totalPrice: Number(item.QUANTITY || 0) * Number(item.UNIT_PRICE || 0)
              })) || []

              await this.logNotification({
                type: 'requisition_approved',
                userId: admin.USER_ID,
                requisitionId,
                message,
                email: admin.EMAIL,
                notificationType: 'email', // ส่งเฉพาะ email เท่านั้น
                actorId: approvedBy,
                priority: 'medium',
                // เพิ่มข้อมูลสำหรับ email template
                data: {
                  requisitionId,
                  requesterName: (requisition.USERS as any)?.FullNameThai || (requisition.USERS as any)?.FullNameEng || requisition.USER_ID,
                  approvedBy,
                  totalAmount: requisition.TOTAL_AMOUNT,
                  items: itemsForEmail,
                  submittedAt: requisition.SUBMITTED_AT,
                  isSelfApproval
                }
              })
              console.log(`✅ Admin approval notification sent to ${admin.USER_ID} (no user in USERS table)`)
              
              continue // ข้ามการสร้าง notification log ซ้ำ
            }

            // บันทึกการแจ้งเตือนและส่งอีเมลผ่าน logNotification
            console.log(`📧 Preparing to send admin notification email to ${admin.EMAIL}`)
            
            // ดึงข้อมูล requisition items สำหรับ Admin
            const requisitionWithItems = await prisma.rEQUISITIONS.findUnique({
              where: { REQUISITION_ID: requisitionId },
              include: {
                USERS: true,
                REQUISITION_ITEMS: {
                  take: 50,
                  include: {
                    PRODUCTS: {
                      select: {
                        PRODUCT_NAME: true,
                        PRODUCT_ID: true
                      }
                    }
                  }
                }
              }
            })

            // สร้างข้อมูลรายการสินค้า
            const items = requisitionWithItems?.REQUISITION_ITEMS?.map((item: any) => ({
              productName: item.PRODUCTS?.PRODUCT_NAME || 'Unknown Product',
              quantity: item.QUANTITY || 0,
              unitPrice: Number(item.UNIT_PRICE || 0),
              totalPrice: Number(item.QUANTITY || 0) * Number(item.UNIT_PRICE || 0)
            })) || []
            
            const message = isSelfApproval 
              ? `Manager ${approvedBy} อนุมัติคำขอเบิกของตัวเอง (เลขที่ ${requisitionId}) จำนวนเงิน: ฿${requisition.TOTAL_AMOUNT?.toFixed(2)}`
              : `มีการอนุมัติคำขอเบิกใหม่ (เลขที่ ${requisitionId}) จาก ${(requisition.USERS as any)?.FullNameThai || (requisition.USERS as any)?.FullNameEng || requisition.USER_ID} โดย ${approvedBy} จำนวนเงิน: ฿${requisition.TOTAL_AMOUNT?.toFixed(2)}`
            
            await this.logNotification({
              type: 'requisition_approved',
              userId: admin.USER_ID,
              requisitionId,
              message,
              email: admin.EMAIL,
              notificationType: 'both', // ส่งทั้ง email และ in-app
              actorId: approvedBy,
              priority: 'medium',
              // เพิ่มข้อมูลสำหรับ email template
              data: {
                requisitionId,
                requesterName: (requisition.USERS as any)?.FullNameThai || (requisition.USERS as any)?.FullNameEng || requisition.USER_ID,
                approvedBy,
                totalAmount: requisition.TOTAL_AMOUNT,
                items: items,
                submittedAt: requisition.SUBMITTED_AT,
                isSelfApproval
              }
            })

            console.log(`✅ Admin approval notification sent to ${admin.USER_ID} at ${admin.EMAIL}`)
          } catch (error) {
            console.error(`❌ เกิดข้อผิดพลาดในการแจ้งเตือน admin ${admin.USER_ID}:`, error)
          }
        } else {
          console.log(`⚠️ Admin ${admin.USER_ID} ไม่มีอีเมล`)
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Admin notification completed for requisition ${requisitionId}`)
      }

      // ทำความสะอาด memory
      this.memoryCleanup()

    } catch (error) {
      console.error('❌ Error notifying admins:', error)
      // ทำความสะอาด memory แม้เกิด error
      this.memoryCleanup()
    }
  }












  /**
   * บันทึกการแจ้งเตือนในฐานข้อมูล EMAIL_LOGS (ใช้เป็นตารางหลักสำหรับการแจ้งเตือน)
   */
  private static async logNotification(data: NotificationData) {
    try {
      const notificationType = data.notificationType || 'both' // ค่าเริ่มต้นคือทั้ง email และ in-app
      
      // สร้างข้อความเพิ่มเติมสำหรับเก็บข้อมูลที่จำเป็น
      const additionalData = {
        type: data.type,
        requisitionId: data.requisitionId,
        actorId: data.actorId,
        priority: data.priority || 'medium',
        timestamp: ThaiTimeUtils.getCurrentThaiTimeISO()
      }
      
      // รวมข้อความหลักกับข้อมูลเพิ่มเติม (ไม่ใช้เก็บใน BODY อีกต่อไป)
      const _fullMessage = `${data.message}\n\n---\nข้อมูลเพิ่มเติม: ${JSON.stringify(additionalData, null, 2)}`
      
      // บันทึกการแจ้งเตือนในฐานข้อมูล EMAIL_LOGS พร้อมข้อมูลอีเมลครบถ้วน
      await prisma.$executeRaw`
        INSERT INTO EMAIL_LOGS (TO_USER_ID, SUBJECT, BODY, STATUS, SENT_AT, IS_READ, FROM_EMAIL, TO_EMAIL, EMAIL_TYPE, PRIORITY, DELIVERY_STATUS, RETRY_COUNT, CREATED_BY)
        VALUES (${data.userId}, ${`Notification: ${data.type}`}, ${`Notification: ${data.type}`}, 'PENDING', GETDATE(), 0, ${process.env.SMTP_FROM || 'stationaryhub@ube.co.th'}, ${data.email || null}, ${data.type || 'notification'}, ${data.priority || 'medium'}, 'pending', 0, ${data.actorId || 'system'})
      `
      
      // ถ้าเป็น email หรือ both ให้ส่ง email (ยกเว้น requisition_created ที่ส่งแล้ว)
      if ((notificationType === 'email' || notificationType === 'both') && data.type !== 'requisition_created') {
        if (data.email) {
          try {
            // สร้าง HTML email template
            let emailHtml = data.message
            if (data.data && (data.type === 'requisition_pending' || data.type === 'requisition_approved' || data.type === 'requisition_rejected')) {
              emailHtml = this.createEmailTemplate(data.type, data.data)
            }
            
            // ส่งอีเมลและอัปเดตข้อมูลในฐานข้อมูล
            const emailResult = await this.sendEmailWithLogging(
              data.email, 
              `Notification: ${data.type}`, 
              emailHtml,
              0 // ไม่ใช้ EMAIL_ID เพราะใช้ raw SQL แล้ว
            )
            
            if (emailResult.success) {
              // อัปเดตสถานะเป็น SENT และบันทึก MESSAGE_ID พร้อมเวลาส่งจริง
              // ไม่สามารถอัปเดตได้เพราะไม่มี EMAIL_ID จาก raw SQL
              console.log(`📧 Email sent to ${data.email} with Message ID: ${emailResult.messageId}`)
            } else {
              // ไม่สามารถอัปเดตได้เพราะไม่มี EMAIL_ID จาก raw SQL
              console.error(`❌ Failed to send email to ${data.email}: ${emailResult.error}`)
            }
          } catch (error) {
            // ไม่สามารถอัปเดตได้เพราะไม่มี EMAIL_ID จาก raw SQL
            console.error(`❌ Error sending email to ${data.email}:`, error)
          }
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📝 Notification logged to database with GETDATE(), Type: ${notificationType}`)
      }
      
      // ทำความสะอาด memory
      this.memoryCleanup()
      
      return true
    } catch (error) {
      console.error('❌ Error logging notification:', error)
      // ทำความสะอาด memory แม้เกิด error
      this.memoryCleanup()
      return null
    }
  }

  /**
   * ลองส่งอีเมลซ้ำสำหรับอีเมลที่ส่งไม่สำเร็จ
   */
  static async retryFailedEmails(maxRetries: number = 3) {
    try {
      console.log(`🔄 Starting email retry process (max retries: ${maxRetries})`)
      
      // ดึงอีเมลที่ส่งไม่สำเร็จและยังไม่เกินจำนวนครั้งที่กำหนด
      const failedEmails = await prisma.eMAIL_LOGS.findMany({
        where: {
          STATUS: 'FAILED',
          RETRY_COUNT: {
            lt: maxRetries
          }
        },
        orderBy: {
          SENT_AT: 'asc' // ลองส่งอีเมลเก่าก่อน
        }
      })

      console.log(`📧 Found ${failedEmails.length} failed emails to retry`)

      let retryCount = 0
      for (const emailLog of failedEmails) {
        try {
          const currentRetryCount = emailLog.RETRY_COUNT || 0
          console.log(`🔄 Retrying email ID ${emailLog.EMAIL_ID} (attempt ${currentRetryCount + 1}/${maxRetries})`)
          
          // อัปเดตสถานะเป็น PENDING ก่อนลองส่งใหม่
          await prisma.$executeRaw`
            UPDATE EMAIL_LOGS 
            SET STATUS = 'PENDING', 
                DELIVERY_STATUS = 'retrying', 
                RETRY_COUNT = ${currentRetryCount + 1},
                UPDATED_AT = GETDATE()
            WHERE EMAIL_ID = ${emailLog.EMAIL_ID}
          `

          // ลองส่งอีเมลใหม่
          const emailResult = await this.sendEmailWithLogging(
            emailLog.TO_EMAIL || '',
            emailLog.SUBJECT || '',
            emailLog.BODY || '',
            emailLog.EMAIL_ID
          )

          if (emailResult.success) {
            // ส่งสำเร็จ
            await prisma.$executeRaw`
              UPDATE EMAIL_LOGS 
              SET STATUS = 'SENT', 
                  MESSAGE_ID = ${emailResult.messageId}, 
                  DELIVERY_STATUS = 'sent', 
                  EMAIL_SIZE = ${emailResult.emailSize || 0},
                  ERROR_MESSAGE = NULL,
                  SENT_AT = GETDATE(),
                  UPDATED_AT = GETDATE()
              WHERE EMAIL_ID = ${emailLog.EMAIL_ID}
            `
            console.log(`✅ Email ID ${emailLog.EMAIL_ID} sent successfully on retry`)
            retryCount++
          } else {
            // ส่งไม่สำเร็จ
            await prisma.$executeRaw`
              UPDATE EMAIL_LOGS 
              SET STATUS = 'FAILED', 
                  DELIVERY_STATUS = 'failed', 
                  ERROR_MESSAGE = ${emailResult.error}, 
                  UPDATED_AT = GETDATE()
              WHERE EMAIL_ID = ${emailLog.EMAIL_ID}
            `
            console.log(`❌ Email ID ${emailLog.EMAIL_ID} failed on retry: ${emailResult.error}`)
          }

        } catch (retryError) {
          console.error(`❌ Error retrying email ID ${emailLog.EMAIL_ID}:`, retryError)
          
          // อัปเดตสถานะเป็น FAILED
          await prisma.$executeRaw`
            UPDATE EMAIL_LOGS 
            SET STATUS = 'FAILED', 
                DELIVERY_STATUS = 'failed', 
                ERROR_MESSAGE = ${retryError instanceof Error ? retryError.message : String(retryError)},
                UPDATED_AT = GETDATE()
            WHERE EMAIL_ID = ${emailLog.EMAIL_ID}
          `
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Email retry process completed. Successfully retried: ${retryCount} emails`)
      }
      
      // ทำความสะอาด memory
      this.memoryCleanup()
      
      return {
        success: true,
        totalFailed: failedEmails.length,
        retrySuccess: retryCount,
        retryFailed: failedEmails.length - retryCount
      }

    } catch (error) {
      console.error('❌ Error in email retry process:', error)
      // ทำความสะอาด memory แม้เกิด error
      this.memoryCleanup()
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * ดึงสถิติการส่งอีเมล
   */
  static async getEmailStats() {
    try {
      const stats = await prisma.eMAIL_LOGS.groupBy({
        by: ['STATUS'],
        _count: {
          EMAIL_ID: true
        }
      })

      const totalEmails = await prisma.eMAIL_LOGS.count()
      const recentEmails = await prisma.eMAIL_LOGS.count({
        where: {
          SENT_AT: {
            gte: new Date(ThaiTimeUtils.getCurrentThaiTimestamp() - 24 * 60 * 60 * 1000) // 24 ชั่วโมงที่แล้ว
          }
        }
      })

      return {
        totalEmails,
        recentEmails,
        statusBreakdown: stats.reduce((acc: Record<string, number>, stat: any) => {
          acc[stat.STATUS || 'unknown'] = stat._count.EMAIL_ID
          return acc
        }, {} as Record<string, number>)
      }
    } catch (error) {
      console.error('❌ Error getting email stats:', error)
      return null
    }
  }

  /**
   * ดึงการแจ้งเตือนสำหรับผู้ใช้จากตาราง EMAIL_LOGS
   */
  static async getNotificationsForUser(userId: string, limit: number = 50) {
    try {
      const notifications = await prisma.eMAIL_LOGS.findMany({
        where: {
          TO_USER_ID: userId,
          STATUS: 'SENT'
        },
        orderBy: {
          SENT_AT: 'desc'
        },
        take: limit,
        select: {
          EMAIL_ID: true,
          SUBJECT: true,
          BODY: true,
          SENT_AT: true,
          IS_READ: true,
          TO_USER_ID: true
        }
      })
      
      // แยกข้อมูลเพิ่มเติมจาก BODY และสร้างข้อความที่อ่านง่าย
      const processedNotifications = notifications.map((notification: any) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 Processing notification ${notification.EMAIL_ID}:`, notification.BODY?.substring(0, 100))
        }
        
        // แยกข้อมูลเพิ่มเติมจาก BODY
        let additionalData: any = {}
        let cleanMessage = notification.BODY || ''
        
        // หาตำแหน่งของข้อมูลเพิ่มเติม
        const additionalDataMatch = notification.BODY?.match(/ข้อมูลเพิ่มเติม:\s*({.*})/s)
        
        if (additionalDataMatch) {
          try {
            const jsonStr = additionalDataMatch[1]
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔍 JSON string: ${jsonStr}`)
            }
            additionalData = JSON.parse(jsonStr)
            
            // แยกข้อความหลักออกจากข้อมูลเพิ่มเติม
            cleanMessage = notification.BODY?.replace(/---\s*\nข้อมูลเพิ่มเติม:\s*{.*}/s, '').trim() || ''
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔍 Clean message: ${cleanMessage}`)
              console.log(`🔍 Additional data:`, additionalData)
            }
          } catch (error) {
            console.error('Error parsing additional data:', error)
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log(`⚠️ No additional data found in notification ${notification.EMAIL_ID}`)
          }
        }
        
        // สร้างข้อความที่อ่านง่ายตามประเภทการแจ้งเตือน
        let readableMessage = cleanMessage
        if (additionalData.type === 'requisition_created') {
          readableMessage = `คำขอเบิกใหม่ (เลขที่ ${additionalData.requisitionId}) ได้รับการส่งเรียบร้อยแล้ว`
        } else if (additionalData.type === 'requisition_approved') {
          readableMessage = `คำขอเบิก (เลขที่ ${additionalData.requisitionId}) ได้รับการอนุมัติแล้ว`
        } else if (additionalData.type === 'requisition_rejected') {
          readableMessage = `คำขอเบิก (เลขที่ ${additionalData.requisitionId}) ถูกปฏิเสธ`
        } else if (additionalData.type === 'requisition_pending') {
          readableMessage = `มีคำขอเบิกใหม่ (เลขที่ ${additionalData.requisitionId}) รอการอนุมัติ`
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 Final readable message: ${readableMessage}`)
        }
        
        return {
          id: notification.EMAIL_ID,
          userId: notification.TO_USER_ID,
          subject: notification.SUBJECT,
          message: readableMessage,
          sentAt: notification.SENT_AT,
          isRead: notification.IS_READ || false,
          type: additionalData.type || 'unknown',
          requisitionId: additionalData.requisitionId,
          actorId: additionalData.actorId,
          priority: additionalData.priority || 'medium',
          timestamp: additionalData.timestamp
        }
      })
      
      // ทำความสะอาด memory
      this.memoryCleanup()
      
      return processedNotifications
    } catch (error) {
      console.error('❌ Error getting notifications for user:', error)
      // ทำความสะอาด memory แม้เกิด error
      this.memoryCleanup()
      return []
    }
  }

  /**
   * อัปเดตสถานะการอ่านของการแจ้งเตือน
   */
  static async markNotificationAsRead(notificationId: number) {
    try {
      await prisma.$executeRaw`
        UPDATE EMAIL_LOGS 
        SET IS_READ = 1,
            UPDATED_AT = GETDATE()
        WHERE EMAIL_ID = ${notificationId}
      `
      console.log(`✅ Notification ${notificationId} marked as read`)
      return true
    } catch (error) {
      console.error('❌ Error marking notification as read:', error)
      return false
    }
  }

  /**
   * นับจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
   */
  static async getUnreadNotificationCount(userId: string) {
    try {
      const count = await prisma.eMAIL_LOGS.count({
        where: {
          TO_USER_ID: userId,
          STATUS: 'SENT',
          IS_READ: false
        }
      })
      return count
    } catch (error) {
      console.error('❌ Error getting unread notification count:', error)
      return 0
    }
  }

  /**
   * ส่งอีเมลพร้อมการบันทึกข้อมูลในฐานข้อมูล
   */
  private static async sendEmailWithLogging(to: string, subject: string, html: string, emailLogId: number) {
    try {
      // ==========================================
      // 📧 EMAIL SENDING ENABLED - SEND REAL EMAILS
      // ==========================================
      // แสดง Log เฉพาะใน development
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 ===== EMAIL SENDING ENABLED - SENDING REAL EMAILS =====')
        console.log('📧 Sending email with the following details:')
        console.log('  - To:', to)
        console.log('  - Subject:', subject)
        console.log('  - From:', process.env.SMTP_FROM || 'stationaryhub@ube.co.th')
        console.log('  - HTML Length:', html.length, 'characters')
        console.log('  - Email Log ID:', emailLogId)
        console.log('  - Timestamp:', new Date().toISOString())
        console.log('📧 ===== EMAIL SENDING IN PROGRESS =====')
        
        // ตรวจสอบการตั้งค่า SMTP
        console.log('🔧 SMTP Configuration Check:')
        console.log('  - SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com')
        console.log('  - SMTP_PORT:', process.env.SMTP_PORT || 587)
        console.log('  - SMTP_USER:', process.env.SMTP_USER ? '***configured***' : '❌ NOT CONFIGURED')
        console.log('  - SMTP_PASS:', process.env.SMTP_PASS ? '***configured***' : '❌ NOT CONFIGURED')
        console.log('  - SMTP_FROM:', process.env.SMTP_FROM || 'stationaryhub@ube.co.th')
      }

      // ตรวจสอบว่ามีการตั้งค่า SMTP หรือไม่
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ SMTP credentials not configured! Email will not be sent.')
        console.error('❌ Please check your .env.local file for SMTP_USER and SMTP_PASS')
        return {
          success: false,
          error: 'SMTP credentials not configured',
          messageId: null,
          emailSize: 0
        }
      }

      // ใช้ Gmail SMTP เป็น fallback หาก server หลักไม่ทำงาน
      const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
      const smtpPort = Number(process.env.SMTP_PORT) || 587
      
      console.log(`📧 Using SMTP: ${smtpHost}:${smtpPort}`)

      console.log('📧 Creating SMTP transporter...')
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        // เพิ่ม timeout และ debug options
        connectionTimeout: 30000, // 30 seconds
        greetingTimeout: 30000,   // 30 seconds
        socketTimeout: 30000,     // 30 seconds
        tls: {
          rejectUnauthorized: false
        }
      })

      // ทดสอบการเชื่อมต่อ SMTP
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔌 Testing SMTP connection...')
      }
      try {
        await transporter.verify()
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ SMTP connection verified successfully')
        }
      } catch (verifyError) {
        console.error('❌ SMTP connection verification failed:', verifyError)
        console.error('❌ Please check your SMTP settings and network connection')
        
        // ลองใช้ Gmail SMTP หาก server หลักไม่ทำงาน
        if (smtpHost !== 'smtp.gmail.com') {
          console.log('🔄 Trying Gmail SMTP as fallback...')
          try {
            const gmailTransporter = nodemailer.createTransport({
              host: 'smtp.gmail.com',
              port: 587,
              secure: false,
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              },
              connectionTimeout: 30000,
              greetingTimeout: 30000,
              socketTimeout: 30000,
              tls: {
                rejectUnauthorized: false
              }
            })
            
            await gmailTransporter.verify()
            console.log('✅ Gmail SMTP connection verified successfully')
            
            // ใช้ Gmail transporter แทน
            const result = await gmailTransporter.sendMail({
              from: process.env.SMTP_FROM || 'stationaryhub@ube.co.th',
              to,
              subject,
              html
            })
            
            console.log('✅ Email sent via Gmail SMTP successfully!')
            return {
              success: true,
              error: null,
              messageId: result.messageId,
              emailSize: html.length
            }
          } catch (gmailError) {
            console.error('❌ Gmail SMTP also failed:', gmailError)
          }
        }
        
        return {
          success: false,
          error: `SMTP connection failed: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`,
          messageId: null,
          emailSize: 0
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('📤 Sending email...')
        console.log('  - To:', to)
        console.log('  - Subject:', subject)
        console.log('  - From:', process.env.SMTP_FROM || 'stationaryhub@ube.co.th')
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'stationaryhub@ube.co.th',
        to,
        subject,
        html,
      }

      const result = await transporter.sendMail(mailOptions)
      
      // แสดง Log เฉพาะใน development
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Email sent successfully!')
        console.log('  - Message ID:', result.messageId)
        console.log('  - Response:', result.response)
        console.log('  - To:', to)
        console.log('  - Subject:', subject)
      }

      // ปิดการเชื่อมต่อ SMTP
      transporter.close()
      
      // ทำความสะอาด memory
      this.memoryCleanup()
      
      return {
        success: true,
        error: null,
        messageId: result.messageId,
        emailSize: html.length,
        response: result.response
      }
      
    } catch (error: any) {
      // แสดง Log เฉพาะใน development
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Error in email sending:', error)
        console.error('❌ Error details:')
        console.error('  - Message:', error.message)
        console.error('  - Code:', error.code)
        console.error('  - Command:', error.command)
        console.error('  - Response:', error.response)
        console.error('  - ResponseCode:', error.responseCode)
      }
      
      // ทำความสะอาด memory แม้เกิด error
      this.memoryCleanup()
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        messageId: null,
        emailSize: 0
      }
    }
  }

  /**
   * ส่งอีเมล (ฟังก์ชันเดิม - ใช้สำหรับ backward compatibility)
   */
  private static async sendEmail(to: string, subject: string, html: string) {
    try {
      // ==========================================
      // 📧 EMAIL SENDING ENABLED - SEND REAL EMAILS
      // ==========================================
      // แสดง Log เฉพาะใน development
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 ===== EMAIL SENDING ENABLED - SENDING REAL EMAILS =====')
        console.log('📧 Sending email with the following details:')
        console.log('  - To:', to)
        console.log('  - Subject:', subject)
        console.log('  - From:', process.env.SMTP_FROM || 'stationaryhub@ube.co.th')
        console.log('  - HTML Length:', html.length, 'characters')
        console.log('  - Timestamp:', new Date().toISOString())
        console.log('📧 ===== EMAIL SENDING IN PROGRESS =====')
        
        // ตรวจสอบการตั้งค่า SMTP
        console.log('🔧 SMTP Configuration Check:')
        console.log('  - SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com')
        console.log('  - SMTP_PORT:', process.env.SMTP_PORT || 587)
        console.log('  - SMTP_USER:', process.env.SMTP_USER ? '***configured***' : '❌ NOT CONFIGURED')
        console.log('  - SMTP_PASS:', process.env.SMTP_PASS ? '***configured***' : '❌ NOT CONFIGURED')
        console.log('  - SMTP_FROM:', process.env.SMTP_FROM || 'stationaryhub@ube.co.th')
      }

      // ตรวจสอบว่ามีการตั้งค่า SMTP หรือไม่
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ SMTP credentials not configured! Email will not be sent.')
        console.error('❌ Please check your .env.local file for SMTP_USER and SMTP_PASS')
        return
      }

      console.log('📧 Creating SMTP transporter...')
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        // เพิ่ม timeout และ debug options
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,   // 10 seconds
        socketTimeout: 10000,     // 10 seconds
      })

      // ทดสอบการเชื่อมต่อ SMTP
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔌 Testing SMTP connection...')
      }
      try {
        await transporter.verify()
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ SMTP connection verified successfully')
        }
      } catch (verifyError) {
        console.error('❌ SMTP connection verification failed:', verifyError)
        console.error('❌ Please check your SMTP settings and network connection')
        return
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('📤 Sending email...')
        console.log('  - To:', to)
        console.log('  - Subject:', subject)
        console.log('  - From:', process.env.SMTP_FROM || 'stationaryhub@ube.co.th')
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'stationaryhub@ube.co.th',
        to,
        subject,
        html,
      }

      const result = await transporter.sendMail(mailOptions)
      
      // แสดง Log เฉพาะใน development
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Email sent successfully!')
        console.log('  - Message ID:', result.messageId)
        console.log('  - Response:', result.response)
        console.log('  - To:', to)
        console.log('  - Subject:', subject)
      }

      // ปิดการเชื่อมต่อ SMTP
      transporter.close()
      
      // ทำความสะอาด memory
      this.memoryCleanup()
      
      return true // ส่งอีเมลสำเร็จ
      
    } catch (error: any) {
      // แสดง Log เฉพาะใน development
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Error in email logging:', error)
        console.error('❌ Error details:')
        console.error('  - Message:', error.message)
        console.error('  - Code:', error.code)
        console.error('  - Command:', error.command)
        console.error('  - Response:', error.response)
        console.error('  - ResponseCode:', error.responseCode)
      }
      
      // ทำความสะอาด memory แม้เกิด error
      this.memoryCleanup()
      
      return false // ส่งอีเมลล้มเหลว
    }
  }

  /**
   * สร้าง HTML template แบบง่ายเพื่อประหยัด memory
   */
  private static createSimpleEmailTemplate(type: string, data: any): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    switch (type) {
      case 'requisition_created':
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>คำขอเบิกได้รับการส่งเรียบร้อยแล้ว</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
              .header { background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
              .content { background: white; padding: 20px; border-radius: 0 0 8px 8px; }
              .info { margin: 10px 0; }
              .info strong { display: inline-block; width: 120px; }
              .button { display: inline-block; background: #2c3e50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>คำขอเบิกได้รับการส่งเรียบร้อยแล้ว</h1>
              </div>
              <div class="content">
                <div class="info"><strong>เลขที่คำขอ:</strong> #${data.requisitionId}</div>
                <div class="info"><strong>ผู้ขอเบิก:</strong> ${data.requesterName || 'ไม่ระบุ'}</div>
                <div class="info"><strong>จำนวนเงิน:</strong> ฿${data.totalAmount?.toFixed(2) || '0.00'}</div>
                <div class="info"><strong>วันที่ส่ง:</strong> ${data.submittedAt ? ThaiTimeUtils.toThaiDateString(data.submittedAt) : ThaiTimeUtils.toThaiDateString(ThaiTimeUtils.getCurrentThaiTime())}</div>
                <div class="info"><strong>สถานะ:</strong> รอการอนุมัติ</div>
                <p>คำขอเบิกของคุณจะถูกส่งไปยัง Manager เพื่อพิจารณาอนุมัติ</p>
                <a href="${baseUrl}/orders" class="button">ดูรายการคำขอเบิก</a>
              </div>
            </div>
          </body>
          </html>
        `
      default:
        return `<p>การแจ้งเตือนจากระบบ StationaryHub</p>`
    }
  }

  /**
   * สร้าง HTML template สำหรับอีเมล (แบบเต็ม)
   */
  private static createEmailTemplate(type: string, data: any): string {
    const baseTemplate = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>การแจ้งเตือน - StationaryHub</title>
        <style>
          body { 
            font-family: 'Times New Roman', serif; 
            line-height: 1.6; 
            color: #000000; 
            background-color: #ffffff;
            margin: 0;
            padding: 0;
          }
          
          .email-container { 
            width: 100%; 
            max-width: 800px;
            background-color: #ffffff;
            border: 1px solid #000000;
            margin: 0 auto;
          }
          
          .header { 
            background-color: #ffffff; 
            color: #000000; 
            padding: 30px 40px; 
            text-align: center;
            border-bottom: 2px solid #000000;
          }
          
          .header h1 { 
            font-size: 24px; 
            font-weight: bold; 
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .header p { 
            font-size: 16px; 
            margin: 8px 0 0 0;
            font-style: italic;
          }
          
          .content { 
            padding: 40px; 
            background-color: #ffffff;
          }
          
          .section { 
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #000000;
            background-color: #ffffff;
          }
          
          .section h3 { 
            color: #000000; 
            font-size: 18px; 
            font-weight: bold; 
            margin: 0 0 15px 0;
            border-bottom: 1px solid #000000;
            padding-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            border: 1px solid #000000;
          }
          
          .info-table td {
            padding: 12px 15px;
            border: 1px solid #000000;
            font-size: 14px;
            vertical-align: top;
          }
          
          .info-table td:first-child {
            font-weight: bold;
            width: 200px;
            background-color: #f5f5f5;
            text-transform: uppercase;
            font-size: 13px;
            letter-spacing: 0.5px;
          }
          
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #ffffff; 
            color: #000000; 
            text-decoration: none; 
            border: 2px solid #000000;
            font-size: 14px;
            text-align: center;
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: bold;
          }
          
          .button:hover {
            background-color: #000000;
            color: #ffffff;
          }
          
          .footer { 
            margin-top: 30px; 
            padding: 30px 40px; 
            background-color: #ffffff; 
            border-top: 2px solid #000000;
            font-size: 12px; 
            color: #000000;
            text-align: center;
          }
          
          .footer p {
            margin: 8px 0;
            font-style: italic;
          }
          
          .warning-box {
            background-color: #ffffff;
            border: 2px solid #000000;
            padding: 20px;
            margin: 20px 0;
            font-size: 14px;
          }
          
          .warning-box p {
            margin: 10px 0;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .warning-box ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          
          .warning-box li {
            margin-bottom: 8px;
            font-size: 13px;
          }
          
          /* Responsive Design */
          @media only screen and (max-width: 767px) {
            .email-container {
              width: 100%;
              margin: 0;
            }
            
            .header {
              padding: 20px 15px;
            }
            
            .header h1 {
              font-size: 20px;
            }
            
            .header p {
              font-size: 14px;
            }
            
            .content {
              padding: 25px 15px;
            }
            
            .section {
              padding: 15px;
              margin-bottom: 20px;
            }
            
            .section h3 {
              font-size: 16px;
            }
            
            .info-table td {
              font-size: 13px;
              padding: 10px 12px;
            }
            
            .info-table td:first-child {
              width: 120px;
              font-size: 12px;
            }
            
            .button {
              width: 100%;
              display: block;
              text-align: center;
              padding: 12px 20px;
              font-size: 14px;
            }
            
            .footer {
              padding: 20px 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>การแจ้งเตือนระบบ</h1>
            <p>StationaryHub - ระบบจัดการวัสดุสำนักงาน</p>
          </div>
          <div class="content">
            ${this.getEmailContent(type, data)}
          </div>
          <div class="footer">
            <p>นี่เป็นอีเมลอัตโนมัติจากระบบ StationaryHub</p>
            <p>หากมีคำถาม กรุณาติดต่อทีมสนับสนุน IT</p>
          </div>
        </div>
      </body>
      </html>
    `

    return baseTemplate
  }

  /**
   * สร้างเนื้อหาอีเมลตามประเภท
   */
  private static getEmailContent(type: string, data: any): string {
    switch (type) {
      case 'requisition_created':
        return `
          <div class="section">
            <h3>ยืนยันการส่งคำขอเบิก</h3>
            <p>คำขอเบิกของคุณได้รับการส่งเรียบร้อยแล้ว</p>
            <table class="info-table">
              <tr>
                <td>เลขที่คำขอ:</td>
                <td>#${data.requisitionId}</td>
              </tr>
              <tr>
                <td>ผู้ขอเบิก:</td>
                <td>${data.requesterName || 'ไม่ระบุ'}</td>
              </tr>
              <tr>
                <td>จำนวนเงิน:</td>
                <td>฿${data.totalAmount?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td>วันที่ส่ง:</td>
                <td>${data.submittedAt ? ThaiTimeUtils.toThaiDateString(data.submittedAt) : ThaiTimeUtils.toThaiDateString(ThaiTimeUtils.getCurrentThaiTime())}</td>
              </tr>
              <tr>
                <td>เวลาส่ง:</td>
                <td>${data.submittedAt ? ThaiTimeUtils.toThaiTimeOnlyString(data.submittedAt) : ThaiTimeUtils.toThaiTimeOnlyString(ThaiTimeUtils.getCurrentThaiTime())}</td>
              </tr>
              <tr>
                <td>สถานะ:</td>
                <td>รอการอนุมัติ</td>
              </tr>
            </table>
            
            ${data.items && data.items.length > 0 ? `
            <div class="section" style="margin-top: 20px;">
              <h3>รายการสินค้า</h3>
              <table class="info-table">
                <thead>
                  <tr style="background-color: #f5f5f5; font-weight: bold;">
                    <td style="border: 1px solid #000000; padding: 8px;">สินค้า</td>
                    <td style="border: 1px solid #000000; padding: 8px; text-align: center;">จำนวน</td>
                    <td style="border: 1px solid #000000; padding: 8px; text-align: right;">ราคาต่อหน่วย</td>
                    <td style="border: 1px solid #000000; padding: 8px; text-align: right;">รวม</td>
                  </tr>
                </thead>
                <tbody>
                  ${data.items.map((item: any) => `
                    <tr>
                      <td style="border: 1px solid #000000; padding: 8px;">${item.productName}</td>
                      <td style="border: 1px solid #000000; padding: 8px; text-align: center;">${item.quantity}</td>
                      <td style="border: 1px solid #000000; padding: 8px; text-align: right;">฿${item.unitPrice.toFixed(2)}</td>
                      <td style="border: 1px solid #000000; padding: 8px; text-align: right;">฿${item.totalPrice.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
            <p><strong>ขั้นตอนต่อไป:</strong></p>
            <ul>
              <li>คำขอเบิกของคุณจะถูกส่งไปยัง Manager เพื่อพิจารณาอนุมัติ</li>
              <li>ระบบจะแจ้งเตือนเมื่อคำขอของคุณได้รับการอนุมัติหรือปฏิเสธ</li>
              <li>คุณสามารถติดตามสถานะได้ในระบบ</li>
            </ul>
            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/orders" class="button">ดูรายการคำขอเบิก</a>
            </div>
          </div>
        `

      case 'requisition_approved':
        return `
          <div class="section">
            <h3>คำขอเบิกได้รับการอนุมัติ</h3>
            <p>คำขอเบิกของคุณได้รับการอนุมัติแล้ว</p>
            <table class="info-table">
              <tr>
                <td>เลขที่คำขอ:</td>
                <td>#${data.requisitionId}</td>
              </tr>
              <tr>
                <td>ผู้ขอเบิก:</td>
                <td>${data.requesterName || 'ไม่ระบุ'}</td>
              </tr>
              <tr>
                <td>อนุมัติโดย:</td>
                <td>${data.approvedBy}</td>
              </tr>
              <tr>
                <td>จำนวนเงิน:</td>
                <td>฿${data.totalAmount?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td>วันที่อนุมัติ:</td>
                <td>${ThaiTimeUtils.toThaiDateString(ThaiTimeUtils.getCurrentThaiTime())}</td>
              </tr>
              <tr>
                <td>เวลาอนุมัติ:</td>
                <td>${ThaiTimeUtils.toThaiTimeOnlyString(ThaiTimeUtils.getCurrentThaiTime())}</td>
              </tr>
              <tr>
                <td>สถานะ:</td>
                <td>อนุมัติแล้ว</td>
              </tr>
            </table>
            
            ${data.items && data.items.length > 0 ? `
            <div class="section" style="margin-top: 20px;">
              <h3>รายการสินค้า</h3>
              <table class="info-table">
                <thead>
                  <tr style="background-color: #f5f5f5; font-weight: bold;">
                    <td style="border: 1px solid #000000; padding: 8px;">สินค้า</td>
                    <td style="border: 1px solid #000000; padding: 8px; text-align: center;">จำนวน</td>
                    <td style="border: 1px solid #000000; padding: 8px; text-align: right;">ราคาต่อหน่วย</td>
                    <td style="border: 1px solid #000000; padding: 8px; text-align: right;">รวม</td>
                  </tr>
                </thead>
                <tbody>
                  ${data.items.map((item: any) => `
                    <tr>
                      <td style="border: 1px solid #000000; padding: 8px;">${item.productName}</td>
                      <td style="border: 1px solid #000000; padding: 8px; text-align: center;">${item.quantity}</td>
                      <td style="border: 1px solid #000000; padding: 8px; text-align: right;">฿${item.unitPrice.toFixed(2)}</td>
                      <td style="border: 1px solid #000000; padding: 8px; text-align: right;">฿${item.totalPrice.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            <p><strong>ขั้นตอนต่อไป:</strong></p>
            <ul>
              <li>คำขอเบิกของคุณได้รับการอนุมัติแล้ว</li>
              <li>ระบบจะดำเนินการจัดซื้อสินค้าตามรายการที่อนุมัติ</li>
              <li>คุณจะได้รับการแจ้งเตือนเมื่อสินค้ามาถึง</li>
            </ul>
            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/orders" class="button">ดูรายการคำขอเบิก</a>
            </div>
          </div>
        `

      case 'requisition_rejected':
        return `
          <div class="section">
            <h3>คำขอเบิกถูกปฏิเสธ</h3>
            <p>คำขอเบิกของคุณถูกปฏิเสธ</p>
            <table class="info-table">
              <tr>
                <td>เลขที่คำขอ:</td>
                <td>#${data.requisitionId}</td>
              </tr>
              <tr>
                <td>ผู้ขอเบิก:</td>
                <td>${data.requesterName || 'ไม่ระบุ'}</td>
              </tr>
              <tr>
                <td>ปฏิเสธโดย:</td>
                <td>${data.rejectedBy}</td>
              </tr>
              <tr>
                <td>จำนวนเงิน:</td>
                <td>฿${data.totalAmount?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td>วันที่ปฏิเสธ:</td>
                <td>${ThaiTimeUtils.toThaiDateString(ThaiTimeUtils.getCurrentThaiTime())}</td>
              </tr>
              <tr>
                <td>เวลาปฏิเสธ:</td>
                <td>${ThaiTimeUtils.toThaiTimeOnlyString(ThaiTimeUtils.getCurrentThaiTime())}</td>
              </tr>
              <tr>
                <td>สถานะ:</td>
                <td>ปฏิเสธ</td>
              </tr>
              ${data.reason ? `
              <tr>
                <td>เหตุผล:</td>
                <td>${data.reason}</td>
              </tr>
              ` : ''}
            </table>
            
            ${data.items && data.items.length > 0 ? `
            <div class="section" style="margin-top: 20px;">
              <h3>รายการสินค้าที่ถูกปฏิเสธ</h3>
              <table class="info-table">
                <thead>
                  <tr style="background-color: #f5f5f5; font-weight: bold;">
                    <td style="border: 1px solid #000000; padding: 8px;">สินค้า</td>
                    <td style="border: 1px solid #000000; padding: 8px; text-align: center;">จำนวน</td>
                    <td style="border: 1px solid #000000; padding: 8px; text-align: right;">ราคาต่อหน่วย</td>
                    <td style="border: 1px solid #000000; padding: 8px; text-align: right;">รวม</td>
                  </tr>
                </thead>
                <tbody>
                  ${data.items.map((item: any) => `
                    <tr>
                      <td style="border: 1px solid #000000; padding: 8px;">${item.productName}</td>
                      <td style="border: 1px solid #000000; padding: 8px; text-align: center;">${item.quantity}</td>
                      <td style="border: 1px solid #000000; padding: 8px; text-align: right;">฿${item.unitPrice.toFixed(2)}</td>
                      <td style="border: 1px solid #000000; padding: 8px; text-align: right;">฿${item.totalPrice.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            <p><strong>ขั้นตอนต่อไป:</strong></p>
            <ul>
              <li>คำขอเบิกของคุณถูกปฏิเสธ</li>
              <li>หากมีคำถาม กรุณาติดต่อผู้จัดการ</li>
              <li>คุณสามารถสร้างคำขอเบิกใหม่ได้</li>
            </ul>
            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/orders" class="button">ดูรายการคำขอเบิก</a>
            </div>
          </div>
        `

      case 'requisition_pending':
        return `
          <div class="section">
            <h3>มีคำขอเบิกใหม่รอการอนุมัติ</h3>
            <p>มีคำขอเบิกใหม่ที่รอการอนุมัติจากคุณ</p>
            <table class="info-table">
              <tr>
                <td>เลขที่คำขอ:</td>
                <td>#${data.requisitionId}</td>
              </tr>
              <tr>
                <td>จากผู้ใช้:</td>
                <td>${data.requesterName || data.userId}</td>
              </tr>
              <tr>
                <td>Manager:</td>
                <td>${data.managerName || 'ไม่ระบุ'}</td>
              </tr>
              <tr>
                <td>จำนวนเงิน:</td>
                <td>฿${data.totalAmount?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td>วันที่ส่ง:</td>
                <td>${ThaiTimeUtils.toThaiDateString(ThaiTimeUtils.getCurrentThaiTime())}</td>
              </tr>
              <tr>
                <td>เวลาส่ง:</td>
                <td>${ThaiTimeUtils.toThaiTimeOnlyString(ThaiTimeUtils.getCurrentThaiTime())}</td>
              </tr>
              <tr>
                <td>สถานะ:</td>
                <td>รอการอนุมัติ</td>
              </tr>
            </table>
            
            ${data.items && data.items.length > 0 ? `
            <div class="section" style="margin-top: 20px;">
              <h3>รายการสินค้า</h3>
              <table class="info-table">
                <thead>
                  <tr style="background-color: #f5f5f5; font-weight: bold;">
                    <td style="border: 1px solid #000000; padding: 8px;">สินค้า</td>
                    <td style="border: 1px solid #000000; padding: 8px; text-align: center;">จำนวน</td>
                    <td style="border: 1px solid #000000; padding: 8px; text-align: right;">ราคาต่อหน่วย</td>
                    <td style="border: 1px solid #000000; padding: 8px; text-align: right;">รวม</td>
                  </tr>
                </thead>
                <tbody>
                  ${data.items.map((item: any) => `
                    <tr>
                      <td style="border: 1px solid #000000; padding: 8px;">${item.productName}</td>
                      <td style="border: 1px solid #000000; padding: 8px; text-align: center;">${item.quantity}</td>
                      <td style="border: 1px solid #000000; padding: 8px; text-align: right;">฿${item.unitPrice.toFixed(2)}</td>
                      <td style="border: 1px solid #000000; padding: 8px; text-align: right;">฿${item.totalPrice.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            <p><strong>ขั้นตอนต่อไป:</strong></p>
            <ul>
              <li>กรุณาเข้าสู่ระบบเพื่อตรวจสอบรายละเอียดคำขอเบิก</li>
              <li>พิจารณาอนุมัติหรือปฏิเสธคำขอเบิก</li>
              <li>ระบบจะแจ้งเตือนผู้ขอเบิกเมื่อมีการดำเนินการ</li>
            </ul>
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/approvals" class="button">ดูคำขอเบิก</a>
            </div>
          </div>
        `

      case 'requisition_approved_admin':
        return `
          <div class="section">
            <h3>${data.isSelfApproval ? 'Manager อนุมัติคำขอเบิกของตัวเอง' : 'มีการอนุมัติคำขอเบิกใหม่'}</h3>
            <p>${data.isSelfApproval ? 'Manager ได้อนุมัติคำขอเบิกของตัวเองแล้ว' : 'มีการอนุมัติคำขอเบิกใหม่ในระบบ'}</p>
            <table class="info-table">
              <tr>
                <td>เลขที่คำขอ:</td>
                <td>${data.requisitionId}</td>
              </tr>
              <tr>
                <td>ผู้ขอเบิก:</td>
                <td>${data.requesterName}</td>
              </tr>
              <tr>
                <td>อนุมัติโดย:</td>
                <td>${data.approvedBy}</td>
              </tr>
              <tr>
                <td>จำนวนเงิน:</td>
                <td>฿${data.totalAmount?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td>วันที่ส่ง:</td>
                <td>${data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : 'ไม่ระบุ'}</td>
              </tr>
              <tr>
                <td>สถานะ:</td>
                <td>อนุมัติแล้ว</td>
              </tr>
            </table>
            
            ${data.items && data.items.length > 0 ? `
            <div class="section" style="margin-top: 20px;">
              <h3>รายการสินค้า</h3>
              <table class="info-table">
                <thead>
                  <tr style="background-color: #f5f5f5; font-weight: bold;">
                    <td style="border: 1px solid #000000; padding: 8px;">สินค้า</td>
                    <td style="border: 1px solid #000000; padding: 8px; text-align: center;">จำนวน</td>
                    <td style="border: 1px solid #000000; padding: 8px; text-align: right;">ราคาต่อหน่วย</td>
                    <td style="border: 1px solid #000000; padding: 8px; text-align: right;">รวม</td>
                  </tr>
                </thead>
                <tbody>
                  ${data.items.map((item: any) => `
                    <tr>
                      <td style="border: 1px solid #000000; padding: 8px;">${item.productName}</td>
                      <td style="border: 1px solid #000000; padding: 8px; text-align: center;">${item.quantity}</td>
                      <td style="border: 1px solid #000000; padding: 8px; text-align: right;">฿${item.unitPrice.toFixed(2)}</td>
                      <td style="border: 1px solid #000000; padding: 8px; text-align: right;">฿${item.totalPrice.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            ${data.isSelfApproval ? 
              '<p><strong>หมายเหตุ:</strong> Manager ได้อนุมัติคำขอเบิกของตัวเอง กรุณาติดตามการจัดซื้อ</p>' : 
              '<p>กรุณาติดตามการจัดซื้อและจัดส่งสินค้า</p>'
            }
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin" class="button">ดูรายการคำขอเบิก</a>
            </div>
          </div>
        `

      case 'no_manager_found':
        return `
          <div class="section">
            <h3>⚠️ ผู้ใช้งานแผนกไม่พบManager</h3>
            <p>มีผู้ใช้งานในแผนกที่ไม่มีManager กำหนดไว้</p>
            <table class="info-table">
              <tr>
                <td>เลขที่คำขอ:</td>
                <td>${data.requisitionId}</td>
              </tr>
              <tr>
                <td>ผู้ขอเบิก:</td>
                <td>${data.userId}</td>
              </tr>
              <tr>
                <td>แผนก (CostCenter):</td>
                <td>${data.costCenter}</td>
              </tr>
              <tr>
                <td>สถานะ:</td>
                <td>รอการอนุมัติ</td>
              </tr>
              <tr>
                <td>วันที่สร้าง:</td>
                <td>${ThaiTimeUtils.toThaiDateString(ThaiTimeUtils.getCurrentThaiTime())}</td>
              </tr>
            </table>
            <div class="warning-box">
              <p>คำแนะนำ</p>
              <ul>
                <li>กรุณาตรวจสอบการกำหนดManager สำหรับแผนก ${data.costCenter}</li>
                <li>หรือกำหนดManager ให้กับผู้ใช้ ${data.userId}</li>
                <li>หรืออนุมัติคำขอเบิกนี้โดยตรง</li>
              </ul>
            </div>
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin" class="button">จัดการคำขอเบิก</a>
            </div>
          </div>
        `

      default:
        return `
          <div class="section">
            <h3>การแจ้งเตือนจากระบบ</h3>
            <p>การแจ้งเตือนจากระบบ StationaryHub</p>
          </div>
        `
    }
  }

  /**
   * ดึง email จาก LDAP ตาม AdLoginName
   */
  static async getUserEmailFromLDAP(userId: string): Promise<string | null> {
    try {
      console.log(`🔍 Searching for email of user: ${userId}`)
      
      // ลองค้นหาด้วย AdLoginName ก่อน
      let user = await prisma.$queryRaw<{ CurrentEmail: string }[]>`
        SELECT CurrentEmail FROM userWithRoles WHERE EmpCode = ${userId}
      `
      
      // ถ้าไม่เจอ ให้ลองค้นหาด้วย EmpCode
      if (!user || user.length === 0) {
        console.log(`🔍 AdLoginName not found, trying EmpCode: ${userId}`)
        user = await prisma.$queryRaw<{ CurrentEmail: string }[]>`
          SELECT CurrentEmail FROM userWithRoles WHERE EmpCode = ${userId}
        `
      }
      
      console.log(`🔍 Query result for ${userId}:`, user)
      
      if (user && user.length > 0) {
        const email = user[0].CurrentEmail
        if (email && email.trim() !== '') {
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Found email for ${userId}: ${email}`)
          }
          // ทำความสะอาด memory
          this.memoryCleanup()
          return email
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log(`⚠️ User ${userId} has empty or null email`)
          }
          // ทำความสะอาด memory
          this.memoryCleanup()
          return null
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`⚠️ No user found in userWithRoles for ${userId}`)
        }
        // ทำความสะอาด memory
        this.memoryCleanup()
        return null
      }
    } catch (error) {
      console.error(`❌ Error fetching email for ${userId}:`, error)
      // ทำความสะอาด memory แม้เกิด error
      this.memoryCleanup()
      return null
    }
  }

  /**
   * สร้าง HTML template สำหรับอีเมลแจ้งเตือนสินค้ามาแล้ว
   */
  static createArrivalEmailTemplate(data: {
    requisitionId: number
    message: string
    adminName: string
    totalAmount?: number
    requesterName: string
  }): string {
    const baseTemplate = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>สินค้ามาแล้ว - StationaryHub</title>
        <style>
          body { 
            font-family: 'Times New Roman', serif; 
            line-height: 1.6; 
            color: #000000; 
            background-color: #ffffff;
            margin: 0;
            padding: 20px;
          }
          
          .email-container { 
            width: 100%; 
            max-width: 800px;
            background-color: #ffffff;
            border: 1px solid #000000;
            margin: 0 auto 40px auto;
          }
          
          .header { 
            background-color: #ffffff; 
            color: #000000; 
            padding: 30px 40px; 
            text-align: center;
            border-bottom: 2px solid #000000;
          }
          
          .header h1 { 
            font-size: 24px; 
            font-weight: bold; 
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .header p { 
            font-size: 16px; 
            margin: 8px 0 0 0;
            font-style: italic;
          }
          
          .content { 
            padding: 40px; 
            background-color: #ffffff;
          }
          
          .section { 
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #000000;
            background-color: #ffffff;
          }
          
          .section h3 { 
            color: #000000; 
            font-size: 18px; 
            font-weight: bold; 
            margin: 0 0 15px 0;
            border-bottom: 1px solid #000000;
            padding-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            border: 1px solid #000000;
          }
          
          .info-table td {
            padding: 12px 15px;
            border: 1px solid #000000;
            font-size: 14px;
            vertical-align: top;
          }
          
          .info-table td:first-child {
            font-weight: bold;
            width: 200px;
            background-color: #f5f5f5;
            text-transform: uppercase;
            font-size: 13px;
            letter-spacing: 0.5px;
          }
          
          .message-box {
            background-color: #ffffff;
            border: 2px solid #000000;
            padding: 20px;
            margin: 20px 0;
            font-size: 14px;
            line-height: 1.5;
            white-space: pre-line;
          }
          
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #ffffff; 
            color: #000000; 
            text-decoration: none; 
            border: 2px solid #000000;
            font-size: 14px;
            text-align: center;
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: bold;
          }
          
          .button:hover {
            background-color: #000000;
            color: #ffffff;
          }
          
          .footer { 
            margin-top: 30px; 
            padding: 30px 40px; 
            background-color: #ffffff; 
            border-top: 2px solid #000000;
            font-size: 12px; 
            color: #000000;
            text-align: center;
          }
          
          .footer p {
            margin: 8px 0;
            font-style: italic;
          }
          
          .warning-box {
            background-color: #ffffff;
            border: 2px solid #000000;
            padding: 20px;
            margin: 20px 0;
            font-size: 14px;
          }
          
          .warning-box p {
            margin: 10px 0;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .warning-box ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          
          .warning-box li {
            margin-bottom: 8px;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>การแจ้งเตือนระบบ</h1>
            <p>StationaryHub - ระบบจัดการวัสดุสำนักงาน</p>
          </div>
          <div class="content">
            <div class="section">
              <h3>สินค้ามาถึงแล้ว</h3>
              <p>สินค้าที่คุณสั่งซื้อมาถึงแล้ว กรุณามารับสินค้า</p>
              <table class="info-table">
                <tr>
                  <td>เลขที่คำขอ:</td>
                  <td>#${data.requisitionId}</td>
                </tr>
                <tr>
                  <td>ผู้สั่งซื้อ:</td>
                  <td>${data.requesterName}</td>
                </tr>
                <tr>
                  <td>จำนวนเงิน:</td>
                  <td>฿${data.totalAmount?.toFixed(2) || '0.00'}</td>
                </tr>
                <tr>
                  <td>แจ้งเตือนโดย:</td>
                  <td>${data.adminName}</td>
                </tr>
                <tr>
                  <td>วันที่แจ้งเตือน:</td>
                  <td>${ThaiTimeUtils.toThaiDateString(ThaiTimeUtils.getCurrentThaiTime())} ${ThaiTimeUtils.toThaiTimeOnlyString(ThaiTimeUtils.getCurrentThaiTime())}</td>
                </tr>
              </table>
              
              <div class="message-box">
                <p><strong>ข้อความจากผู้ดูแลระบบ:</strong></p>
                <p>${data.message}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/orders" class="button">ดูรายละเอียดสินค้า</a>
              </div>
            </div>
          </div>
          <div class="footer">
            <p>นี่เป็นอีเมลอัตโนมัติจากระบบ StationaryHub</p>
            <p>หากมีคำถาม กรุณาติดต่อทีมสนับสนุน IT</p>
          </div>
        </div>
      </body>
      </html>
    `

    return baseTemplate
  }

  /**
   * ส่งอีเมลทดสอบ
   */
  static async sendTestEmail(toEmail: string, subject: string, message: string) {
    try {
      // ใช้ message ที่ส่งมาเป็น HTML template โดยตรง
      const htmlContent = message

      await this.sendEmail(toEmail, subject, htmlContent)
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 Attempting to send test email to ${toEmail}`)
        console.log(`✅ Test email sent to ${toEmail}`)
      }
      
      // ทำความสะอาด memory
      this.memoryCleanup()
    } catch (error) {
      console.error('❌ Error sending test email:', error)
      // ทำความสะอาด memory แม้เกิด error
      this.memoryCleanup()
      throw error
    }
  }

  /**
   * ดึงประวัติการแจ้งเตือนของ user
   */
  static async getUserNotifications(userId: string) {
    try {
      // ค้นหาด้วย AdLoginName แทน TO_USER_ID
      const notifications = await prisma.eMAIL_LOGS.findMany({
        where: { 
          OR: [
            { TO_USER_ID: userId }, // กรณีที่เป็น integer
            { TO_USER_ID: { equals: userId } } // กรณีที่เป็น string
          ]
        },
        orderBy: { SENT_AT: 'desc' },
        take: 50
      })
      
      // ทำความสะอาด memory
      this.memoryCleanup()
      
      return notifications
    } catch (error) {
      console.error('Error fetching user notifications:', error)
      // ทำความสะอาด memory แม้เกิด error
      this.memoryCleanup()
      return []
    }
  }
} 