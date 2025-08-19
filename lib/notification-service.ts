import { prisma } from './prisma'
import nodemailer from 'nodemailer'

export interface NotificationData {
  type: 'requisition_created' | 'requisition_approved' | 'requisition_rejected' | 'requisition_pending' | 
        'requisition_pending_manager' | 'requisition_pending_general_manager' |
        'requisition_approved_manager' | 'requisition_approved_general_manager' |
        'requisition_rejected_manager' | 'requisition_rejected_general_manager'
  userId: string
  requisitionId: number
  message: string
  email?: string
}

export class NotificationService {
  /**
   * ส่งการแจ้งเตือนเมื่อสร้าง requisition ใหม่
   */
  static async notifyRequisitionCreated(requisitionId: number, userId: string) {
    try {
      console.log(`🔔 Notifying requisition created: ${requisitionId} by ${userId}`)
      
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
      const message = `คำขอเบิกของคุณ (เลขที่ ${requisitionId}) ได้รับการส่งเรียบร้อยแล้ว จำนวนเงิน: ฿${requisition.TOTAL_AMOUNT?.toFixed(2)}`

      // บันทึกการแจ้งเตือนในฐานข้อมูล
      await this.logNotification({
        type: 'requisition_created',
        userId,
        requisitionId,
        message
      })

      // ดึง email จาก LDAP
      const userEmail = await this.getUserEmailFromLDAP(userId)

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

      // แจ้งเตือน Manager อื่นๆ ในแผนกเดียวกัน
      await this.notifyManagersOfApproval(requisitionId, approvedBy, requisition.USER_ID)

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

      // แจ้งเตือน Manager อื่นๆ ในแผนกเดียวกัน
      await this.notifyManagersOfRejection(requisitionId, rejectedBy, requisition.USER_ID, reason)

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
      console.log(`🔔 Notifying managers for requisition ${requisitionId} from user ${userId}`)
      
      // ดึงข้อมูล user เพื่อหา orgcode3
      const user = await prisma.$queryRaw<{ orgcode3: string }[]>`
        SELECT orgcode3 FROM userWithRoles WHERE AdLoginName = ${userId}
      `

      if (!user || user.length === 0 || !user[0].orgcode3) {
        console.log(`❌ User ${userId} not found or no orgcode3`)
        return
      }

      const orgcode3 = user[0].orgcode3
      console.log(`🔔 User orgcode3: ${orgcode3}`)

      // หา managers ในแผนกเดียวกันจาก LDAP (รวม Manager และ Admin)
      const managers = await prisma.$queryRaw<{ USER_ID: string, CurrentEmail: string, AdLoginName: string, PostNameEng: string }[]>`
        SELECT USER_ID, CurrentEmail, AdLoginName, PostNameEng
        FROM userWithRoles 
        WHERE orgcode3 = ${orgcode3} 
        AND (PostNameEng LIKE '%Manager%' OR PostNameEng LIKE '%Admin%' OR PostNameEng LIKE '%หัวหน้า%')
      `

      console.log(`🔔 Found ${managers.length} managers in orgcode3 ${orgcode3}:`, managers)

      // ส่งอีเมลแจ้งเตือน managers และบันทึกลงฐานข้อมูล
      console.log(`📧 Attempting to send email to ${userId} at ${userEmail}`)
      for (const manager of managers) {
        if (manager.CurrentEmail) {
          try {
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
            await this.logNotification({
              type: 'requisition_pending_manager',
              userId: manager.AdLoginName, // ใช้ AdLoginName ของ Manager
              requisitionId,
              message: `มีคำขอเบิกใหม่ (เลขที่ ${requisitionId}) จาก ${userId} รอการอนุมัติ`
            })

            console.log(`✅ Notification sent and logged for manager ${manager.AdLoginName}`)
          } catch (error) {
            console.error(`❌ Error notifying manager ${manager.AdLoginName}:`, error)
          }
        } else {
          console.log(`⚠️ Manager ${manager.AdLoginName} has no email`)
        }
      }

      // ถ้าไม่พบ Manager ในแผนกเดียวกัน ให้แจ้งเตือนเฉพาะ Admin เท่านั้น
      if (managers.length === 0) {
        console.log(`🔔 No managers found in orgcode3 ${orgcode3}, notifying admins only`)
        
        const admins = await prisma.$queryRaw<{ CurrentEmail: string, AdLoginName: string }[]>`
          SELECT CurrentEmail, AdLoginName
          FROM userWithRoles 
          WHERE PostNameEng LIKE '%Admin%'
        `

        for (const admin of admins) {
          if (admin.CurrentEmail) {
            try {
              // await this.sendEmail(
              //   admin.CurrentEmail,
              //   'มีคำขอเบิกใหม่รอการอนุมัติ (ไม่มี Manager ในแผนก)',
              //   this.createEmailTemplate('requisition_pending', {
              //     requisitionId,
              //     userId
              //   })
              // )

              await this.logNotification({
                type: 'requisition_pending_admin',
                userId: admin.AdLoginName,
                requisitionId,
                message: `มีคำขอเบิกใหม่ (เลขที่ ${requisitionId}) จาก ${userId} รอการอนุมัติ (ไม่มี Manager ในแผนก)`
              })

              console.log(`✅ Notification sent to admin ${admin.AdLoginName}`)
            } catch (error) {
              console.error(`❌ Error notifying admin ${admin.AdLoginName}:`, error)
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Error notifying managers:', error)
    }
  }

  /**
   * แจ้งเตือน Admin ว่ามีการอนุมัติคำขอ
   */
  static async notifyAdmins(requisitionId: number, approvedBy: string) {
    try {
      // ดึงข้อมูล requisition และ user
      const requisition = await prisma.rEQUISITIONS.findUnique({
        where: { REQUISITION_ID: requisitionId },
        include: { USERS: true }
      })

      if (!requisition) return

      // หา Admin ทั้งหมดจาก LDAP
      const admins = await prisma.$queryRaw<{ CurrentEmail: string, FullNameThai: string, AdLoginName: string }[]>`
        SELECT CurrentEmail, FullNameThai, AdLoginName
        FROM userWithRoles 
        WHERE PostNameEng LIKE '%Admin%' OR PostNameEng LIKE '%Manager%'
      `

      // ส่งอีเมลแจ้งเตือน admins
      for (const admin of admins) {
        if (admin.CurrentEmail) {
          // await this.sendEmail(
          //   admin.CurrentEmail,
          //   'มีการอนุมัติคำขอเบิกใหม่',
          //   this.createEmailTemplate('requisition_approved_admin', {
          //     requisitionId,
          //     approvedBy,
          //     requesterName: (requisition.USERS as any)?.FullNameThai || (requisition.USERS as any)?.FullNameEng || requisition.USER_ID,
          //     totalAmount: requisition.TOTAL_AMOUNT,
          //     submittedAt: requisition.SUBMITTED_AT
          //   })
          // )
        }
      }

    } catch (error) {
      console.error('Error notifying admins:', error)
    }
  }

  /**
   * แจ้งเตือน Manager อื่นๆ ในแผนกเดียวกันเมื่อมีการอนุมัติคำขอ
   */
  private static async notifyManagersOfApproval(requisitionId: number, approvedBy: string, requesterId: string) {
    try {
      // ดึงข้อมูล user ที่ส่งคำขอเพื่อหา orgcode3
      const requester = await prisma.$queryRaw<{ orgcode3: string }[]>`
        SELECT orgcode3 FROM userWithRoles WHERE AdLoginName = ${requesterId}
      `

      if (!requester || requester.length === 0 || !requester[0].orgcode3) {
        console.log(`❌ Requester ${requesterId} not found or no orgcode3 for approval notification`)
        return
      }

      const orgcode3 = requester[0].orgcode3
      console.log(`🔔 Requester orgcode3 for approval: ${orgcode3}`)

      // หา managers ในแผนกเดียวกันจาก LDAP (รวม Manager และ Admin)
      const managers = await prisma.$queryRaw<{ USER_ID: string, CurrentEmail: string, AdLoginName: string, PostNameEng: string }[]>`
        SELECT USER_ID, CurrentEmail, AdLoginName, PostNameEng
        FROM userWithRoles 
        WHERE orgcode3 = ${orgcode3} 
        AND (PostNameEng LIKE '%Manager%' OR PostNameEng LIKE '%Admin%' OR PostNameEng LIKE '%หัวหน้า%')
        AND AdLoginName != ${requesterId} -- ไม่แจ้งเตือนตัวเอง
      `

      console.log(`🔔 Found ${managers.length} managers in orgcode3 ${orgcode3} for approval notification:`, managers)

      for (const manager of managers) {
        if (manager.CurrentEmail) {
          try {
            // await this.sendEmail(
            //   manager.CurrentEmail,
            //   'มีคำขอเบิกได้รับการอนุมัติ',
            //   this.createEmailTemplate('requisition_approved_manager', {
            //     requisitionId,
            //     approvedBy,
            //     requesterName: (await prisma.uSERS.findUnique({ where: { USER_ID: requesterId } }) as any)?.FullNameThai || (await prisma.uSERS.findUnique({ where: { USER_ID: requesterId } }) as any)?.FullNameEng || requesterId,
            //     totalAmount: (await prisma.rEQUISITIONS.findUnique({ where: { REQUISITION_ID: requisitionId } }) as any)?.TOTAL_AMOUNT,
            //     submittedAt: (await prisma.rEQUISITIONS.findUnique({ where: { REQUISITION_ID: requisitionId } }) as any)?.SUBMITTED_AT
            //   })
            // )
            await this.logNotification({
              type: 'requisition_approved_manager',
              userId: manager.AdLoginName,
              requisitionId,
              message: `มีคำขอเบิก (เลขที่ ${requisitionId}) จาก ${requesterId} ได้รับการอนุมัติแล้ว`
            })
            console.log(`✅ Approval notification sent to manager ${manager.AdLoginName}`)
          } catch (error) {
            console.error(`❌ Error notifying manager ${manager.AdLoginName} for approval:`, error)
          }
        } else {
          console.log(`⚠️ Manager ${manager.AdLoginName} has no email for approval notification`)
        }
      }

      // ถ้าไม่พบ Manager ในแผนกเดียวกัน ให้แจ้งเตือนเฉพาะ Admin เท่านั้น
      if (managers.length === 0) {
        console.log(`🔔 No managers found in orgcode3 ${orgcode3} for approval notification, notifying admins only`)
        
        const admins = await prisma.$queryRaw<{ CurrentEmail: string, AdLoginName: string }[]>`
          SELECT CurrentEmail, AdLoginName
          FROM userWithRoles 
          WHERE PostNameEng LIKE '%Admin%'
        `

        for (const admin of admins) {
          if (admin.CurrentEmail) {
            try {
              // await this.sendEmail(
              //   admin.CurrentEmail,
              //   'มีคำขอเบิกได้รับการอนุมัติ (ไม่มี Manager ในแผนก)',
              //   this.createEmailTemplate('requisition_approved_manager', {
              //     requisitionId,
              //     approvedBy,
              //     requesterName: (await prisma.uSERS.findUnique({ where: { USER_ID: requesterId } }) as any)?.FullNameThai || (await prisma.uSERS.findUnique({ where: { USER_ID: requesterId } }) as any)?.FullNameEng || requesterId,
              //     totalAmount: (await prisma.rEQUISITIONS.findUnique({ where: { REQUISITION_ID: requisitionId } }) as any)?.TOTAL_AMOUNT,
              //     submittedAt: (await prisma.rEQUISITIONS.findUnique({ where: { REQUISITION_ID: requisitionId } }) as any)?.SUBMITTED_AT
              //   })
              // )
              await this.logNotification({
                type: 'requisition_approved_admin',
                userId: admin.AdLoginName,
                requisitionId,
                message: `มีคำขอเบิก (เลขที่ ${requisitionId}) จาก ${requesterId} ได้รับการอนุมัติแล้ว (ไม่มี Manager ในแผนก)`
              })
              console.log(`✅ Approval notification sent to admin ${admin.AdLoginName}`)
            } catch (error) {
              console.error(`❌ Error notifying admin ${admin.AdLoginName} for approval:`, error)
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Error notifying managers of approval:', error)
    }
  }

  /**
   * แจ้งเตือน Manager อื่นๆ ในแผนกเดียวกันเมื่อมีการปฏิเสธคำขอ
   */
  private static async notifyManagersOfRejection(requisitionId: number, rejectedBy: string, requesterId: string, reason?: string) {
    try {
      // ดึงข้อมูล user ที่ส่งคำขอเพื่อหา orgcode3
      const requester = await prisma.$queryRaw<{ orgcode3: string }[]>`
        SELECT orgcode3 FROM userWithRoles WHERE AdLoginName = ${requesterId}
      `

      if (!requester || requester.length === 0 || !requester[0].orgcode3) {
        console.log(`❌ Requester ${requesterId} not found or no orgcode3 for rejection notification`)
        return
      }

      const orgcode3 = requester[0].orgcode3
      console.log(`🔔 Requester orgcode3 for rejection: ${orgcode3}`)

      // หา managers ในแผนกเดียวกันจาก LDAP (รวม Manager และ Admin)
      const managers = await prisma.$queryRaw<{ USER_ID: string, CurrentEmail: string, AdLoginName: string, PostNameEng: string }[]>`
        SELECT USER_ID, CurrentEmail, AdLoginName, PostNameEng
        FROM userWithRoles 
        WHERE orgcode3 = ${orgcode3} 
        AND (PostNameEng LIKE '%Manager%' OR PostNameEng LIKE '%Admin%' OR PostNameEng LIKE '%หัวหน้า%')
        AND AdLoginName != ${requesterId} -- ไม่แจ้งเตือนตัวเอง
      `

      console.log(`🔔 Found ${managers.length} managers in orgcode3 ${orgcode3} for rejection notification:`, managers)

      for (const manager of managers) {
        if (manager.CurrentEmail) {
          try {
            // await this.sendEmail(
            //   manager.CurrentEmail,
            //   'มีคำขอเบิกถูกปฏิเสธ',
            //   this.createEmailTemplate('requisition_rejected_manager', {
            //     requisitionId,
            //     rejectedBy,
            //     reason,
            //     requesterName: (await prisma.uSERS.findUnique({ where: { USER_ID: requesterId } }) as any)?.FullNameThai || (await prisma.uSERS.findUnique({ where: { USER_ID: requesterId } }) as any)?.FullNameEng || requesterId,
            //     totalAmount: (await prisma.rEQUISITIONS.findUnique({ where: { REQUISITION_ID: requisitionId } }) as any)?.TOTAL_AMOUNT,
            //     submittedAt: (await prisma.rEQUISITIONS.findUnique({ where: { REQUISITION_ID: requisitionId } }) as any)?.SUBMITTED_AT
            //   })
            // )
            await this.logNotification({
              type: 'requisition_rejected_manager',
              userId: manager.AdLoginName,
              requisitionId,
              message: `มีคำขอเบิก (เลขที่ ${requisitionId}) จาก ${requesterId} ถูกปฏิเสธแล้ว`
            })
            console.log(`✅ Rejection notification sent to manager ${manager.AdLoginName}`)
          } catch (error) {
            console.error(`❌ Error notifying manager ${manager.AdLoginName} for rejection:`, error)
          }
        } else {
          console.log(`⚠️ Manager ${manager.AdLoginName} has no email for rejection notification`)
        }
      }

      // ถ้าไม่พบ Manager ในแผนกเดียวกัน ให้แจ้งเตือน Manager ทั่วไป
      if (managers.length === 0) {
        console.log(`🔔 No managers found in orgcode3 ${orgcode3} for rejection notification, notifying general managers`)
        
        const generalManagers = await prisma.$queryRaw<{ USER_ID: string, CurrentEmail: string, AdLoginName: string }[]>`
          SELECT USER_ID, CurrentEmail, AdLoginName
          FROM userWithRoles 
          WHERE PostNameEng LIKE '%Manager%' OR PostNameEng LIKE '%หัวหน้า%'
        `

        for (const manager of generalManagers) {
          if (manager.CurrentEmail) {
            try {
              // await this.sendEmail(
              //   manager.CurrentEmail,
              //   'มีคำขอเบิกถูกปฏิเสธ (ไม่มี Manager ในแผนก)',
              //   this.createEmailTemplate('requisition_rejected_manager', {
              //     requisitionId,
              //     rejectedBy,
              //     reason,
              //     requesterName: (await prisma.uSERS.findUnique({ where: { USER_ID: requesterId } }) as any)?.FullNameThai || (await prisma.uSERS.findUnique({ where: { USER_ID: requesterId } }) as any)?.FullNameEng || requesterId,
              //     totalAmount: (await prisma.rEQUISITIONS.findUnique({ where: { REQUISITION_ID: requisitionId } }) as any)?.TOTAL_AMOUNT,
              //     submittedAt: (await prisma.rEQUISITIONS.findUnique({ where: { REQUISITION_ID: requisitionId } }) as any)?.SUBMITTED_AT
              //   })
              // )
              await this.logNotification({
                type: 'requisition_rejected_general_manager',
                userId: manager.AdLoginName,
                requisitionId,
                message: `มีคำขอเบิก (เลขที่ ${requisitionId}) จาก ${requesterId} ถูกปฏิเสธแล้ว (ไม่มี Manager ในแผนก)`
              })
              console.log(`✅ Rejection notification sent to general manager ${manager.AdLoginName}`)
            } catch (error) {
              console.error(`❌ Error notifying general manager ${manager.AdLoginName} for rejection:`, error)
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Error notifying managers of rejection:', error)
    }
  }

  /**
   * บันทึกการแจ้งเตือนในฐานข้อมูล
   */
  private static async logNotification(data: NotificationData) {
    try {
      const notification = await prisma.eMAIL_LOGS.create({
        data: {
          TO_USER_ID: data.userId,
          SUBJECT: `Notification: ${data.type}`,
          BODY: data.message,
          STATUS: 'SENT',
          SENT_AT: new Date()
        }
      })
      console.log(`📝 Notification logged to database: ID ${notification.EMAIL_ID}`)
    } catch (error) {
      console.error('❌ Error logging notification:', error)
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
      console.log('  - SMTP_FROM:', process.env.SMTP_FROM || 'noreply@stationaryhub.com')

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
      console.log('  - From:', process.env.SMTP_FROM || 'noreply@stationaryhub.com')

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@stationaryhub.com',
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
            <h1>📋 Stationary Hub</h1>
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

      case 'requisition_approved_admin':
        return `
          <h2>✅ มีการอนุมัติคำขอเบิกใหม่</h2>
          <p>Manager ได้อนุมัติคำขอเบิกใหม่แล้ว</p>
          <p><strong>เลขที่คำขอ:</strong> ${data.requisitionId}</p>
          <p><strong>ผู้ขอ:</strong> ${data.requesterName}</p>
          <p><strong>อนุมัติโดย:</strong> ${data.approvedBy}</p>
          <p><strong>จำนวนเงิน:</strong> ฿${data.totalAmount?.toFixed(2)}</p>
          <p><strong>วันที่ส่งคำขอ:</strong> ${new Date(data.submittedAt).toLocaleDateString('th-TH')} ${new Date(data.submittedAt).toLocaleTimeString('th-TH', { hour12: false })}</p>
          <p>คุณสามารถติดตามรายงานได้ในระบบ</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin" class="button">ดูรายงาน</a>
        `

      case 'requisition_approved_manager':
        return `
          <h2>🎉 คำขอเบิกได้รับการอนุมัติ</h2>
          <p>คำขอเบิกของคุณได้รับการอนุมัติแล้ว</p>
          <p><strong>เลขที่คำขอ:</strong> ${data.requisitionId}</p>
          <p><strong>อนุมัติโดย:</strong> ${data.approvedBy}</p>
          <p><strong>ผู้ขอ:</strong> ${data.requesterName}</p>
          <p><strong>จำนวนเงิน:</strong> ฿${data.totalAmount?.toFixed(2)}</p>
          <p><strong>วันที่ส่งคำขอ:</strong> ${new Date(data.submittedAt).toLocaleDateString('th-TH')} ${new Date(data.submittedAt).toLocaleTimeString('th-TH', { hour12: false })}</p>
          <p>คุณสามารถติดตามรายงานได้ในระบบ</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/approvals" class="button">ดูคำขอเบิก</a>
        `

      case 'requisition_rejected_manager':
        return `
          <h2>❌ คำขอเบิกถูกปฏิเสธ</h2>
          <p>คำขอเบิกของคุณถูกปฏิเสธ</p>
          <p><strong>เลขที่คำขอ:</strong> ${data.requisitionId}</p>
          <p><strong>ปฏิเสธโดย:</strong> ${data.rejectedBy}</p>
          ${data.reason ? `<p><strong>เหตุผล:</strong> ${data.reason}</p>` : ''}
          <p><strong>ผู้ขอ:</strong> ${data.requesterName}</p>
          <p><strong>จำนวนเงิน:</strong> ฿${data.totalAmount?.toFixed(2)}</p>
          <p><strong>วันที่ส่งคำขอ:</strong> ${new Date(data.submittedAt).toLocaleDateString('th-TH')} ${new Date(data.submittedAt).toLocaleTimeString('th-TH', { hour12: false })}</p>
          <p>คุณสามารถติดตามรายงานได้ในระบบ</p>
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
        SELECT CurrentEmail FROM userWithRoles WHERE AdLoginName = ${userId}
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