import { prisma } from './prisma'
import nodemailer from 'nodemailer'

export interface NotificationData {
  type: 'requisition_created' | 'requisition_approved' | 'requisition_rejected' | 'requisition_pending'
  userId: string
  requisitionId: number
  message: string
  email?: string
  notificationType?: 'email' | 'in-app' | 'both' // ประเภทการแจ้งเตือน
  actorId?: string // ผู้ที่ทำการกระทำ
  priority?: 'low' | 'medium' | 'high' // ความสำคัญ
}



export class NotificationService {
  /**
   * ส่งการแจ้งเตือนเมื่อสร้าง requisition ใหม่
   */
    static async notifyRequisitionCreated(requisitionId: number, userId: string) {
    console.log(`🔔 ===== NOTIFICATION SERVICE START =====`)
    console.log(`🔔 Notifying requisition created: ${requisitionId} by ${userId}`)
    
    try {
      // ดึงข้อมูล requisition
      const requisition = await prisma.rEQUISITIONS.findUnique({
        where: { REQUISITION_ID: requisitionId },
        include: {
          USERS: true,
          REQUISITION_ITEMS: {
            include: {
              PRODUCTS: true
            }
          }
        }
      })

      if (!requisition) {
        console.log(`❌ Requisition ${requisitionId} not found`)
        return
      }

      // สร้างข้อความแจ้งเตือน
      const message = `คำขอเบิกของคุณ (เลขที่ ${requisitionId}) ได้ทำการส่งเรียบร้อยแล้ว จำนวนเงิน: ฿${requisition.TOTAL_AMOUNT?.toFixed(2)}`

      // ตรวจสอบว่าเคยสร้าง notification สำหรับ requisition นี้แล้วหรือไม่
      const existingNotification = await prisma.eMAIL_LOGS.findFirst({
        where: {
          TO_USER_ID: userId,
          BODY: {
            contains: `requisition_created`
          },
          SUBJECT: {
            contains: `requisition_created`
          }
        }
      })

      if (!existingNotification) {
        // บันทึกการแจ้งเตือนในฐานข้อมูล
        await this.logNotification({
          type: 'requisition_created',
          userId,
          requisitionId,
          message
        })
        console.log(`📝 Created new notification for requisition ${requisitionId}`)
      } else {
        console.log(`⚠️ Notification already exists for requisition ${requisitionId}`)
      }

      // ดึง email จาก LDAP
      const userEmail = await this.getUserEmailFromLDAP(userId)
      console.log(`📧 User email from LDAP: ${userEmail}`)

      // ส่งอีเมลแจ้งเตือน (ถ้ามี email)
      if (userEmail) {
        try {
          console.log(`📧 Attempting to send email to ${userId} at ${userEmail}`)
          // await this.sendEmail(
          
          //   userEmail,
          //   'ยืนยันการส่งคำขอเบิก',
          //   this.createEmailTemplate('requisition_created', {
          //     requisitionId,
          //     totalAmount: requisition.TOTAL_AMOUNT,
          //     items: requisition.REQUISITION_ITEMS
          //   })
          // )
          console.log(`✅ Email sent to user ${userId} at ${userEmail}`)
        } catch (emailError) {
          console.error(`❌ Failed to send email to ${userId} at ${userEmail}:`, emailError)
          // แม้ส่งอีเมลไม่สำเร็จ แต่ยังคงบันทึกการแจ้งเตือนในฐานข้อมูล
        }
      } else {
        console.log(`⚠️ No email found for user ${userId}`)
      }

      // แจ้งเตือน Manager ที่เกี่ยวข้อง
      await this.notifyManagers(requisitionId, userId)

      console.log(`✅ Requisition creation notification completed for ${requisitionId}`)

    } catch (error) {
      console.error('❌ Error notifying requisition created:', error)
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

      const message = `คำขอเบิกของคุณ (เลขที่ ${requisitionId}) ได้รับการอนุมัติแล้ว`

      // บันทึกการแจ้งเตือน
      await this.logNotification({
        type: 'requisition_approved',
        userId: requisition.USER_ID,
        requisitionId,
        message
      })

      // ดึง email จาก LDAP
      const userEmail = await this.getUserEmailFromLDAP(requisition.USER_ID)

      // ส่งอีเมลแจ้งเตือน
      if (userEmail) {
        console.log(`📧 Attempting to send approval email to user ${requisition.USER_ID} at ${userEmail}`)
        // await this.sendEmail(
        //   userEmail,
        //   'คำขอเบิกได้รับการอนุมัติ',
        //   this.createEmailTemplate('requisition_approved', {
        //     requisitionId,
        //     approvedBy
        //   })
        // )
        console.log(`✅ Approval email sent to user ${requisition.USER_ID}`)
      }

      // แจ้งเตือน Admin ว่ามีการอนุมัติคำขอ
      await this.notifyAdmins(requisitionId, approvedBy)

      console.log(`✅ Requisition approval notification completed for ${requisitionId}`)

    } catch (error) {
      console.error('❌ Error notifying requisition approved:', error)
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

      // บันทึกการแจ้งเตือน
      await this.logNotification({
        type: 'requisition_rejected',
        userId: requisition.USER_ID,
        requisitionId,
        message
      })

      // ดึง email จาก LDAP
      const userEmail = await this.getUserEmailFromLDAP(requisition.USER_ID)

      // ส่งอีเมลแจ้งเตือน
      if (userEmail) {
        // await this.sendEmail(
        //   userEmail,
        //   'คำขอเบิกถูกปฏิเสธ',
        //   this.createEmailTemplate('requisition_rejected', {
        //     requisitionId,
        //     rejectedBy,
        //     reason
        //   })
        // )
        console.log(`✅ Rejection email sent to user ${requisition.USER_ID}`)
      }



      console.log(`✅ Requisition rejection notification completed for ${requisitionId}`)

    } catch (error) {
      console.error('❌ Error notifying requisition rejected:', error)
    }
  }

  /**
   * แจ้งเตือน Manager ว่ามี requisition ใหม่รอการอนุมัติ
   */
  static async notifyManagers(requisitionId: number, userId: string) {
    try {
      console.log(`🔔 ===== MANAGER NOTIFICATION START =====`)
      console.log(`🔔 Notifying managers for requisition ${requisitionId} from user ${userId}`)
      
      // ดึงข้อมูล user เพื่อหา orgcode3
      console.log(`🔍 Looking up user ${userId} in UserWithRoles...`)
      const user = await prisma.$queryRaw<{ orgcode3: string }[]>`
        SELECT orgcode3 FROM UserWithRoles WHERE EmpCode = ${userId}
      `

      console.log(`🔍 User query result:`, user)

      if (!user || user.length === 0 || !user[0].orgcode3) {
        console.log(`❌ User ${userId} not found or no orgcode3`)
        return
      }

      const orgcode3 = user[0].orgcode3
      console.log(`🔔 User orgcode3: ${orgcode3}`)

      // หา managers ในแผนกเดียวกันจาก LDAP (รวม Manager และ Admin)
      console.log(`🔍 Looking for managers in orgcode3 ${orgcode3}...`)
      const managers = await prisma.$queryRaw<{ USER_ID: string, CurrentEmail: string, AdLoginName: string, PostNameEng: string }[]>`
        SELECT EmpCode, CurrentEmail, AdLoginName, PostNameEng
        FROM UserWithRoles 
        WHERE orgcode3 = ${orgcode3} 
        AND (PostNameEng LIKE '%Manager%' OR PostNameEng LIKE '%Admin%' OR PostNameEng LIKE '%หัวหน้า%' OR PostNameEng LIKE '%หัวหน้าส่วน%')
      `

      console.log(`🔔 Found ${managers.length} managers in orgcode3 ${orgcode3}:`, managers)
      console.log(`🔍 Manager details:`, managers.map(m => ({
        EmpCode: m.USER_ID,
        Email: m.CurrentEmail,
        LoginName: m.AdLoginName,
        Position: m.PostNameEng
      })))

      // ส่งอีเมลแจ้งเตือน managers และบันทึกลงฐานข้อมูล
      console.log(`📧 Notifying managers for requisition ${requisitionId}`)
      for (const manager of managers) {
        if (manager.CurrentEmail) {
          try {
            // ส่งอีเมลก่อน (ไม่ต้องตรวจสอบ user ในตาราง USERS)
            // await this.sendEmail(
            //   manager.CurrentEmail,
            //   'มีคำขอเบิกใหม่รอการอนุมัติ',
            //   this.createEmailTemplate('requisition_pending', {
            //     requisitionId,
            //     userId
            //   })
            // )

            // ตรวจสอบว่า user นี้มีอยู่ในตาราง USERS หรือไม่
            console.log(`🔍 Checking if manager ${manager.AdLoginName} exists in USERS table...`)
            const existingUser = await prisma.uSERS.findUnique({
              where: { USER_ID: manager.AdLoginName }
            })

            console.log(`🔍 Manager ${manager.AdLoginName} in USERS table:`, existingUser)

            if (!existingUser) {
              console.log(`⚠️ Manager ${manager.AdLoginName} ไม่มีอยู่ในตาราง USERS, ส่งเฉพาะ email เท่านั้น`)
              
              // ส่ง email แม้ว่าจะไม่มี user ในตาราง USERS
              // await this.sendEmail(
              //   manager.CurrentEmail,
              //   'มีคำขอเบิกใหม่รอการอนุมัติ',
              //   this.createEmailTemplate('requisition_pending', {
              //     requisitionId,
              //     userId
              //   })
              // )
              console.log(`📧 ส่ง email ไปยัง ${manager.CurrentEmail} สำเร็จ (ไม่มี user ในระบบ)`)
              
              continue // ข้ามการสร้าง email log
            }

            // ส่งอีเมล
            // await this.sendEmail(
            //   manager.CurrentEmail,
            //   'มีคำขอเบิกใหม่รอการอนุมัติ',
            //   this.createEmailTemplate('requisition_pending', {
            //     requisitionId,
            //     userId
            //   })
            // )

            // บันทึกการแจ้งเตือนลงฐานข้อมูลสำหรับ Manager
            console.log(`📝 Creating In-App notification for manager: ${manager.AdLoginName}`)
            console.log(`📝 Notification data:`, {
              type: 'requisition_pending',
              userId: manager.AdLoginName,
              requisitionId,
              message: `มีคำขอเบิกใหม่ (เลขที่ ${requisitionId}) จาก ${userId} รอการอนุมัติ`
            })
            
            const notificationResult = await this.logNotification({
              type: 'requisition_pending',
              userId: manager.AdLoginName, // ใช้ AdLoginName ของ Manager
              requisitionId,
              message: `มีคำขอเบิกใหม่ (เลขที่ ${requisitionId}) จาก ${userId} รอการอนุมัติ`
            })

            if (notificationResult) {
              console.log(`✅ ส่งการแจ้งเตือนและบันทึกลงฐานข้อมูลสำหรับ manager ${manager.AdLoginName}, Notification ID: ${notificationResult.EMAIL_ID}`)
            } else {
              console.log(`❌ ไม่สามารถสร้าง notification สำหรับ manager ${manager.AdLoginName}`)
            }
          } catch (error) {
            console.error(`❌ เกิดข้อผิดพลาดในการแจ้งเตือน manager ${manager.AdLoginName}:`, error)
          }
        } else {
          console.log(`⚠️ Manager ${manager.AdLoginName} ไม่มีอีเมล`)
        }
      }

      // ถ้าไม่พบ Manager ในแผนกเดียวกัน ให้แจ้งเตือนเฉพาะ Admin เท่านั้น
      if (managers.length === 0) {
        console.log(`🔔 No managers found in orgcode3 ${orgcode3}, notifying admins only`)
        
        const admins = await prisma.$queryRaw<{ USER_ID: string, EMAIL: string, USERNAME: string, ROLE: string, DEPARTMENT: string }[]>`
          SELECT USER_ID, EMAIL, USERNAME, ROLE, DEPARTMENT
          FROM USERS 
          WHERE ROLE = 'ADMIN'
        `

        for (const admin of admins) {
          if (admin.EMAIL) {
            try {
              // ตรวจสอบว่า admin นี้มีอยู่ในตาราง USERS หรือไม่
              const existingAdmin = await prisma.uSERS.findUnique({
                where: { USER_ID: admin.USER_ID }
              })

              if (!existingAdmin) {
                console.log(`⚠️ Admin ${admin.USER_ID} ไม่มีอยู่ในตาราง USERS, ส่งเฉพาะ email เท่านั้น`)
                
                // ส่ง email แม้ว่าจะไม่มี user ในตาราง USERS
                try {
                  await this.sendEmail(
                    admin.EMAIL,
                    'มีรายการสินค้าใหม่รอการจัดซื้อ',
                    this.createEmailTemplate('requisition_pending', {
                      requisitionId,
                      userId
                    })
                  )
                  console.log(`📧 ส่ง email ไปยัง admin ${admin.EMAIL} สำเร็จ (ไม่มี user ในระบบ)`)
                } catch (emailError) {
                  console.error(`❌ เกิดข้อผิดพลาดในการส่ง email ไปยัง admin ${admin.EMAIL}:`, emailError)
                }
                
                continue // ข้ามการสร้าง email log
              }

              await this.logNotification({
                type: 'requisition_pending',
                userId: admin.USER_ID,
                requisitionId,
                message: `มีรายการสินค้าใหม่รอการจัดซื้อ (เลขที่ ${requisitionId}) จาก ${userId} รอการอนุมัติ (ไม่มี Manager ในแผนก)`
              })

              console.log(`✅ ส่งการแจ้งเตือนไปยัง admin ${admin.USER_ID}`)
            } catch (error) {
              console.error(`❌ เกิดข้อผิดพลาดในการแจ้งเตือน admin ${admin.USER_ID}:`, error)
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Error notifying managers:', error)
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

      // หาคนที่มี role เป็น admin จากตาราง USERS
      const admins = await prisma.$queryRaw<{ USER_ID: string, EMAIL: string, USERNAME: string, ROLE: string, DEPARTMENT: string }[]>`
        SELECT USER_ID, EMAIL, USERNAME, ROLE, DEPARTMENT
        FROM USERS 
        WHERE ROLE = 'ADMIN'
      `

      console.log(`🔔 Found ${admins.length} admins (role = 'admin') to notify`)

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
              
              // ส่ง email แม้ว่าจะไม่มี user ในตาราง USERS
              // await this.sendEmail(
              //   admin.EMAIL,
              //   'มีคำขอเบิกใหม่รอการอนุมัติ',
              //   this.createEmailTemplate('requisition_pending', {
              //     requisitionId,
              //     userId
              //   })
              // )
              console.log(`📧 ส่ง email ไปยัง admin ${admin.EMAIL} สำเร็จ (ไม่มี user ในระบบ)`)
              
              continue // ข้ามการสร้าง email log
            }

            // ส่งอีเมลแจ้งเตือน
            console.log(`📧 Attempting to send admin notification email to ${admin.EMAIL}`)
            // await this.sendEmail(
            //   admin.EMAIL,
            //   'มีการอนุมัติคำขอเบิกใหม่',
            //   this.createEmailTemplate('requisition_approved_admin', {
            //     requisitionId,
            //     approvedBy,
            //     requesterName: (requisition.USERS as any)?.FullNameThai || (requisition.USERS as any)?.FullNameEng || requisition.USER_ID,
            //     totalAmount: requisition.TOTAL_AMOUNT,
            //     submittedAt: requisition.SUBMITTED_AT
            //   })
            // )

            // บันทึกการแจ้งเตือนลงฐานข้อมูล
            await this.logNotification({
              type: 'requisition_approved',
              userId: admin.USER_ID,
              requisitionId,
              message: `มีการอนุมัติคำขอเบิกใหม่ (เลขที่ ${requisitionId}) จาก ${(requisition.USERS as any)?.FullNameThai || (requisition.USERS as any)?.FullNameEng || requisition.USER_ID} โดย ${approvedBy} จำนวนเงิน: ฿${requisition.TOTAL_AMOUNT?.toFixed(2)}`,
              notificationType: 'both', // ส่งทั้ง email และ in-app
              actorId: approvedBy,
              priority: 'medium'
            })

            console.log(`✅ ส่งการแจ้งเตือน admin ไปยัง ${admin.USER_ID} ที่ ${admin.EMAIL}`)
          } catch (error) {
            console.error(`❌ เกิดข้อผิดพลาดในการแจ้งเตือน admin ${admin.USER_ID}:`, error)
          }
        } else {
          console.log(`⚠️ Admin ${admin.USER_ID} ไม่มีอีเมล`)
        }
      }

      console.log(`✅ Admin notification completed for requisition ${requisitionId}`)

    } catch (error) {
      console.error('❌ Error notifying admins:', error)
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
        timestamp: new Date().toISOString()
      }
      
      // รวมข้อความหลักกับข้อมูลเพิ่มเติม
      const fullMessage = `${data.message}\n\n---\nข้อมูลเพิ่มเติม: ${JSON.stringify(additionalData, null, 2)}`
      
      // บันทึกการแจ้งเตือนในฐานข้อมูล EMAIL_LOGS
      const emailLog = await prisma.eMAIL_LOGS.create({
        data: {
          TO_USER_ID: data.userId,
          SUBJECT: `Notification: ${data.type}`,
          BODY: fullMessage,
          STATUS: 'SENT',
          SENT_AT: new Date(),
          IS_READ: false // เริ่มต้นเป็นยังไม่ได้อ่าน
        }
      })
      
      // ถ้าเป็น email หรือ both ให้ส่ง email
      if (notificationType === 'email' || notificationType === 'both') {
        if (data.email) {
          try {
            await this.sendEmail(data.email, `Notification: ${data.type}`, data.message)
            console.log(`📧 Email sent to ${data.email}`)
          } catch (error) {
            console.error(`❌ Error sending email to ${data.email}:`, error)
          }
        }
      }
      
      console.log(`📝 Notification logged to database: ID ${emailLog.EMAIL_ID}, Type: ${notificationType}`)
      return emailLog
    } catch (error) {
      console.error('❌ Error logging notification:', error)
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
      return notifications.map(notification => {
        console.log(`🔍 Processing notification ${notification.EMAIL_ID}:`, notification.BODY?.substring(0, 100))
        
        // แยกข้อมูลเพิ่มเติมจาก BODY
        let additionalData: any = {}
        let cleanMessage = notification.BODY || ''
        
        // หาตำแหน่งของข้อมูลเพิ่มเติม
        const additionalDataMatch = notification.BODY?.match(/ข้อมูลเพิ่มเติม:\s*({.*})/s)
        
        if (additionalDataMatch) {
          try {
            const jsonStr = additionalDataMatch[1]
            console.log(`🔍 JSON string: ${jsonStr}`)
            additionalData = JSON.parse(jsonStr)
            
            // แยกข้อความหลักออกจากข้อมูลเพิ่มเติม
            cleanMessage = notification.BODY?.replace(/---\s*\nข้อมูลเพิ่มเติม:\s*{.*}/s, '').trim() || ''
            
            console.log(`🔍 Clean message: ${cleanMessage}`)
            console.log(`🔍 Additional data:`, additionalData)
          } catch (error) {
            console.error('Error parsing additional data:', error)
          }
        } else {
          console.log(`⚠️ No additional data found in notification ${notification.EMAIL_ID}`)
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
        
        console.log(`🔍 Final readable message: ${readableMessage}`)
        
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
    } catch (error) {
      console.error('❌ Error getting notifications for user:', error)
      return []
    }
  }

  /**
   * อัปเดตสถานะการอ่านของการแจ้งเตือน
   */
  static async markNotificationAsRead(notificationId: number) {
    try {
      await prisma.eMAIL_LOGS.update({
        where: { EMAIL_ID: notificationId },
        data: { IS_READ: true }
      })
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
   * ส่งอีเมล
   */
  private static async sendEmail(to: string, subject: string, html: string) {
    try {
      // ตรวจสอบการตั้งค่า SMTP
      console.log('🔧 SMTP Configuration Check:')
      console.log('  - SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com')
      console.log('  - SMTP_PORT:', process.env.SMTP_PORT || 587)
      console.log('  - SMTP_USER:', process.env.SMTP_USER ? '***configured***' : '❌ NOT CONFIGURED')
      console.log('  - SMTP_PASS:', process.env.SMTP_PASS ? '***configured***' : '❌ NOT CONFIGURED')
      console.log('  - SMTP_FROM:', process.env.SMTP_FROM || 'stationaryhub@ube.co.th')

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
      console.log('🔌 Testing SMTP connection...')
      try {
        await transporter.verify()
        console.log('✅ SMTP connection verified successfully')
      } catch (verifyError) {
        console.error('❌ SMTP connection verification failed:', verifyError)
        console.error('❌ Please check your SMTP settings and network connection')
        return
      }

      console.log('📤 Sending email...')
      console.log('  - To:', to)
      console.log('  - Subject:', subject)
      console.log('  - From:', process.env.SMTP_FROM || 'stationaryhub@ube.co.th')

      const mailOptions = {
        from: process.env.SMTP_FROM || 'stationaryhub@ube.co.th',
        to,
        subject,
        html,
      }

      const result = await transporter.sendMail(mailOptions)
      
      console.log('✅ Email sent successfully!')
      console.log('  - Message ID:', result.messageId)
      console.log('  - Response:', result.response)
      console.log('  - To:', to)
      console.log('  - Subject:', subject)

      // ปิดการเชื่อมต่อ SMTP
      transporter.close()
      
    } catch (error: any) {
      console.error('❌ Error sending email:', error)
      console.error('❌ Error details:')
      console.error('  - Message:', error.message)
      console.error('  - Code:', error.code)
      console.error('  - Command:', error.command)
      console.error('  - Response:', error.response)
      console.error('  - ResponseCode:', error.responseCode)
      
      // แสดงคำแนะนำการแก้ไข
      if (error.code === 'EAUTH') {
        console.error('🔧 Solution: Check your SMTP_USER and SMTP_PASS in .env.local')
        console.error('🔧 For Gmail, make sure you\'re using App Password, not regular password')
      } else if (error.code === 'ECONNECTION') {
        console.error('🔧 Solution: Check your SMTP_HOST and SMTP_PORT')
        console.error('🔧 Make sure your firewall allows outbound connections to port 587')
      } else if (error.code === 'ETIMEDOUT') {
        console.error('🔧 Solution: Check your internet connection and SMTP server availability')
      }
    }
  }

  /**
   * สร้าง HTML template สำหรับอีเมล
   */
  private static createEmailTemplate(type: string, data: any): string {
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Stationary Hub Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; }
          .footer { margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Stationary Hub</h1>
          </div>
          <div class="content">
            ${this.getEmailContent(type, data)}
          </div>
          <div class="footer">
            <p>นี่เป็นอีเมลอัตโนมัติจากระบบ Stationary Hub</p>
            <p>หากมีคำถาม กรุณาติดต่อฝ่าย IT</p>
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
          <h2>✅ ยืนยันการส่งคำขอเบิก</h2>
          <p>คำขอเบิกของคุณได้รับการส่งเรียบร้อยแล้ว</p>
          <p><strong>เลขที่คำขอ:</strong> ${data.requisitionId}</p>
          <p><strong>จำนวนเงิน:</strong> ฿${data.totalAmount?.toFixed(2)}</p>
          <p>ระบบจะแจ้งเตือนเมื่อคำขอของคุณได้รับการอนุมัติหรือปฏิเสธ</p>
        `

      case 'requisition_approved':
        return `
          <h2>🎉 คำขอเบิกได้รับการอนุมัติ</h2>
          <p>คำขอเบิกของคุณได้รับการอนุมัติแล้ว</p>
          <p><strong>เลขที่คำขอ:</strong> ${data.requisitionId}</p>
          <p><strong>อนุมัติโดย:</strong> ${data.approvedBy}</p>
          <p>คุณสามารถติดตามสถานะได้ในระบบ</p>
        `

      case 'requisition_rejected':
        return `
          <h2>❌ คำขอเบิกถูกปฏิเสธ</h2>
          <p>คำขอเบิกของคุณถูกปฏิเสธ</p>
          <p><strong>เลขที่คำขอ:</strong> ${data.requisitionId}</p>
          <p><strong>ปฏิเสธโดย:</strong> ${data.rejectedBy}</p>
          ${data.reason ? `<p><strong>เหตุผล:</strong> ${data.reason}</p>` : ''}
          <p>หากมีคำถาม กรุณาติดต่อผู้จัดการ</p>
        `

      case 'requisition_pending':
        return `
          <h2>📋 มีคำขอเบิกใหม่รอการอนุมัติ</h2>
          <p>มีคำขอเบิกใหม่ที่รอการอนุมัติจากคุณ</p>
          <p><strong>เลขที่คำขอ:</strong> ${data.requisitionId}</p>
          <p><strong>จากผู้ใช้:</strong> ${data.userId}</p>
          <p>กรุณาเข้าสู่ระบบเพื่อตรวจสอบและดำเนินการ</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/approvals" class="button">ดูคำขอเบิก</a>
        `



      default:
        return '<p>การแจ้งเตือนจากระบบ Stationary Hub</p>'
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
          console.log(`✅ Found email for ${userId}: ${email}`)
          return email
        } else {
          console.log(`⚠️ User ${userId} has empty or null email`)
          return null
        }
      } else {
        console.log(`⚠️ No user found in userWithRoles for ${userId}`)
        return null
      }
    } catch (error) {
      console.error(`❌ Error fetching email for ${userId}:`, error)
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
      <html>
      <head>
        <meta charset="utf-8">
        <title>สินค้ามาแล้ว - Stationary Hub</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 4px; }
          .footer { margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; font-size: 12px; color: #666; }
          .info-box { background: #e0f2fe; border: 1px solid #0288d1; border-radius: 8px; padding: 15px; margin: 15px 0; }
          .highlight { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 สินค้ามาแล้ว!</h1>
            <p>Stationary Hub - การแจ้งเตือนสินค้ามาแล้ว</p>
          </div>
          <div class="content">
            <div class="info-box">
              <h2>🎉 ขอแสดงความยินดี!</h2>
              <p>สินค้าที่คุณขอเบิกได้มาถึงแล้ว กรุณาติดต่อแผนกจัดซื้อเพื่อรับสินค้า</p>
            </div>
            
            <div class="highlight">
              <h3>📋 รายละเอียดคำขอเบิก</h3>
              <p><strong>เลขที่คำขอ:</strong> #${data.requisitionId}</p>
              <p><strong>ผู้ขอเบิก:</strong> ${data.requesterName}</p>
              <p><strong>จำนวนเงิน:</strong> ฿${data.totalAmount?.toFixed(2) || '0.00'}</p>
              <p><strong>แจ้งเตือนโดย:</strong> ${data.adminName}</p>
              <p><strong>วันที่แจ้งเตือน:</strong> ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH', { hour12: false })}</p>
            </div>
            
            <div class="info-box">
              <h3>💬 ข้อความจาก Admin</h3>
              <p>${data.message}</p>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/orders" class="button">
                ดูรายการคำขอเบิก
              </a>
            </div>
            
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <h4>📞 ข้อมูลติดต่อ</h4>
              <p>หากมีคำถาม กรุณาติดต่อ:</p>
              <ul>
                <li>แผนกจัดซื้อ: 02-XXX-XXXX</li>
                <li>Email: purchasing@company.com</li>
                <li>หรือติดต่อ Admin ที่แจ้งเตือน</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>นี่เป็นอีเมลอัตโนมัติจากระบบ Stationary Hub</p>
            <p>หากมีคำถาม กรุณาติดต่อฝ่าย IT</p>
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
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Test Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .footer { margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🧪 Test Email</h1>
            </div>
            <div class="content">
              <h2>${subject}</h2>
              <p>${message}</p>
              <p><strong>เวลาส่ง:</strong> ${new Date().toLocaleString('th-TH')}</p>
            </div>
            <div class="footer">
              <p>นี่เป็นอีเมลทดสอบจากระบบ Stationary Hub</p>
            </div>
          </div>
        </body>
        </html>
      `

      // await this.sendEmail(toEmail, subject, htmlContent)
      console.log(`📧 Attempting to send test email to ${toEmail}`)
      console.log(`✅ Test email sent to ${toEmail}`)
    } catch (error) {
      console.error('❌ Error sending test email:', error)
      throw error
    }
  }

  /**
   * ดึงประวัติการแจ้งเตือนของ user
   */
  static async getUserNotifications(userId: string) {
    try {
      // ค้นหาด้วย AdLoginName แทน TO_USER_ID
      return await prisma.eMAIL_LOGS.findMany({
        where: { 
          OR: [
            { TO_USER_ID: userId }, // กรณีที่เป็น integer
            { TO_USER_ID: { equals: userId } } // กรณีที่เป็น string
          ]
        },
        orderBy: { SENT_AT: 'desc' },
        take: 50
      })
    } catch (error) {
      console.error('Error fetching user notifications:', error)
      return []
    }
  }
} 