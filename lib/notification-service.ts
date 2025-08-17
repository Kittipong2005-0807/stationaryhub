import { prisma } from './prisma'
import nodemailer from 'nodemailer'

export interface NotificationData {
  type: 'requisition_created' | 'requisition_approved' | 'requisition_rejected' | 'requisition_pending'
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

      if (!requisition) return

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
        await this.sendEmail(
          userEmail,
          'ยืนยันการส่งคำขอเบิก',
          this.createEmailTemplate('requisition_created', {
            requisitionId,
            totalAmount: requisition.TOTAL_AMOUNT,
            items: requisition.REQUISITION_ITEMS
          })
        )
      }

      // แจ้งเตือน Manager ที่เกี่ยวข้อง
      await this.notifyManagers(requisitionId, userId)

    } catch (error) {
      console.error('Error notifying requisition created:', error)
    }
  }

  /**
   * ส่งการแจ้งเตือนเมื่อ requisition ได้รับการอนุมัติ
   */
  static async notifyRequisitionApproved(requisitionId: number, approvedBy: string) {
    try {
      const requisition = await prisma.rEQUISITIONS.findUnique({
        where: { REQUISITION_ID: requisitionId },
        include: { USERS: true }
      })

      if (!requisition) return

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
        await this.sendEmail(
          userEmail,
          'คำขอเบิกได้รับการอนุมัติ',
          this.createEmailTemplate('requisition_approved', {
            requisitionId,
            approvedBy
          })
        )
      }

      // แจ้งเตือน Admin ว่ามีการอนุมัติคำขอ
      await this.notifyAdmins(requisitionId, approvedBy)

    } catch (error) {
      console.error('Error notifying requisition approved:', error)
    }
  }

  /**
   * ส่งการแจ้งเตือนเมื่อ requisition ถูกปฏิเสธ
   */
  static async notifyRequisitionRejected(requisitionId: number, rejectedBy: string, reason?: string) {
    try {
      const requisition = await prisma.rEQUISITIONS.findUnique({
        where: { REQUISITION_ID: requisitionId },
        include: { USERS: true }
      })

      if (!requisition) return

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
        await this.sendEmail(
          userEmail,
          'คำขอเบิกถูกปฏิเสธ',
          this.createEmailTemplate('requisition_rejected', {
            requisitionId,
            rejectedBy,
            reason
          })
        )
      }

    } catch (error) {
      console.error('Error notifying requisition rejected:', error)
    }
  }

  /**
   * แจ้งเตือน Manager ว่ามี requisition ใหม่รอการอนุมัติ
   */
  static async notifyManagers(requisitionId: number, userId: string) {
    try {
      // ดึงข้อมูล user เพื่อหา orgcode3
      const user = await prisma.$queryRaw<{ orgcode3: string }[]>`
        SELECT orgcode3 FROM userWithRoles WHERE AdLoginName = ${userId}
      `

      if (!user || user.length === 0 || !user[0].orgcode3) return

      const orgcode3 = user[0].orgcode3

      // หา managers ในแผนกเดียวกันจาก LDAP
      const managers = await prisma.$queryRaw<{ USER_ID: string, CurrentEmail: string, AdLoginName: string }[]>`
        SELECT USER_ID, CurrentEmail, AdLoginName
        FROM userWithRoles 
        WHERE orgcode3 = ${orgcode3} 
        AND PostNameEng LIKE '%Manager%'
      `

      // ส่งอีเมลแจ้งเตือน managers
      for (const manager of managers) {
        if (manager.CurrentEmail) {
          await this.sendEmail(
            manager.CurrentEmail,
            'มีคำขอเบิกใหม่รอการอนุมัติ',
            this.createEmailTemplate('requisition_pending', {
              requisitionId,
              userId
            })
          )
        }
      }

    } catch (error) {
      console.error('Error notifying managers:', error)
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
      const admins = await prisma.$queryRaw<{ USER_ID: string, CurrentEmail: string, FullNameThai: string, AdLoginName: string }[]>`
        SELECT USER_ID, CurrentEmail, FullNameThai, AdLoginName
        FROM userWithRoles 
        WHERE PostNameEng LIKE '%Admin%' OR PostNameEng LIKE '%Manager%'
      `

      // ส่งอีเมลแจ้งเตือน admins
      for (const admin of admins) {
        if (admin.CurrentEmail) {
          await this.sendEmail(
            admin.CurrentEmail,
            'มีการอนุมัติคำขอเบิกใหม่',
            this.createEmailTemplate('requisition_approved_admin', {
              requisitionId,
              approvedBy,
              requesterName: (requisition.USERS as any)?.FullNameThai || (requisition.USERS as any)?.FullNameEng || requisition.USER_ID,
              totalAmount: requisition.TOTAL_AMOUNT,
              submittedAt: requisition.SUBMITTED_AT
            })
          )
        }
      }

    } catch (error) {
      console.error('Error notifying admins:', error)
    }
  }

  /**
   * บันทึกการแจ้งเตือนในฐานข้อมูล
   */
  private static async logNotification(data: NotificationData) {
    try {
      await prisma.eMAIL_LOGS.create({
        data: {
          TO_USER_ID: data.userId,
          SUBJECT: `Notification: ${data.type}`,
          BODY: data.message,
          STATUS: 'SENT',
          SENT_AT: new Date()
        }
      })
    } catch (error) {
      console.error('Error logging notification:', error)
    }
  }

  /**
   * ส่งอีเมล
   */
  private static async sendEmail(to: string, subject: string, html: string) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@stationaryhub.com',
        to,
        subject,
        html,
      })

      console.log(`Email sent to ${to}: ${subject}`)
    } catch (error) {
      console.error('Error sending email:', error)
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

      default:
        return '<p>การแจ้งเตือนจากระบบ Stationary Hub</p>'
    }
  }

  /**
   * ดึง email จาก LDAP ตาม AdLoginName
   */
  private static async getUserEmailFromLDAP(adLoginName: string): Promise<string | null> {
    try {
      const user = await prisma.$queryRaw<{ CurrentEmail: string }[]>`
        SELECT CurrentEmail FROM userWithRoles WHERE AdLoginName = ${adLoginName}
      `
      return user && user.length > 0 ? user[0].CurrentEmail : null
    } catch (error) {
      console.error(`Error fetching email for AdLoginName: ${adLoginName}`, error)
      return null
    }
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

      await this.sendEmail(toEmail, subject, htmlContent)
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