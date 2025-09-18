import { prisma } from './prisma'
import nodemailer from 'nodemailer'
import { Manager, User, Notification, Requisition } from '@/types'

export interface NotificationData {
  type: 'requisition_created' | 'requisition_approved' | 'requisition_rejected' | 'requisition_pending' | 'no_manager_found'
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

      // ดึง email จาก LDAP ก่อน
      const userEmail = await this.getUserEmailFromLDAP(userId)
      console.log(`📧 User email from LDAP: ${userEmail}`)

      if (!existingNotification) {
        // บันทึกการแจ้งเตือนในฐานข้อมูลพร้อมข้อมูลอีเมลครบถ้วน
        await this.logNotification({
          type: 'requisition_created',
          userId,
          requisitionId,
          message,
          email: userEmail || undefined, // ส่งอีเมลไปด้วย
          actorId: userId,
          priority: 'medium'
        })
        console.log(`📝 Created new notification for requisition ${requisitionId}`)
      } else {
        console.log(`⚠️ Notification already exists for requisition ${requisitionId}`)
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
        await this.sendEmail(
          userEmail,
          'คำขอเบิกได้รับการอนุมัติ',
          this.createEmailTemplate('requisition_approved', {
            requisitionId,
            approvedBy
          })
        )
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
        await this.sendEmail(
          userEmail,
          'คำขอเบิกถูกปฏิเสธ',
          this.createEmailTemplate('requisition_rejected', {
            requisitionId,
            rejectedBy,
            reason
          })
        )
        console.log(`✅ Rejection email sent to user ${requisition.USER_ID}`)
      }



      console.log(`✅ Requisition rejection notification completed for ${requisitionId}`)

    } catch (error) {
      console.error('❌ Error notifying requisition rejected:', error)
    }
  }

  /**
   * แจ้งเตือน Manager ว่ามี requisition ใหม่รอการอนุมัติ
   * หา manager จาก OrgCode3, OrgCode4, และ superempcode ในตาราง UserWithRoles
   */
  static async notifyManagers(requisitionId: number, userId: string) {
    try {
      console.log(`🔔 ===== MANAGER NOTIFICATION START =====`)
      console.log(`🔔 Notifying managers for requisition ${requisitionId} from user ${userId}`)
      
      // ตรวจสอบว่าเป็น Manager หรือไม่ โดยใช้ VS_DivisionMgr
      console.log(`🔍 Checking if user ${userId} is a Manager in VS_DivisionMgr...`)
      const managerCheck = await prisma.$queryRaw<{ 
        L2: string, 
        CurrentEmail: string, 
        FullNameEng: string, 
        PostNameEng: string,
        CostCenter: string
      }[]>`
        SELECT L2, CurrentEmail, FullNameEng, PostNameEng, CostCenter
        FROM VS_DivisionMgr 
        WHERE L2 = ${userId}
      `

      console.log(`🔍 Manager check result:`, managerCheck)

      if (managerCheck && managerCheck.length > 0) {
        console.log(`✅ User ${userId} is a Manager in VS_DivisionMgr - ไม่ส่งแจ้งเตือนใคร (สามารถอนุมัติตัวเองได้)`)
        return
      }

      console.log(`🔍 User ${userId} is not a Manager - หา Manager ในแผนกเดียวกัน`)

      // ดึงข้อมูล user เพื่อหา CostCenter
      const user = await prisma.$queryRaw<{ 
        costcentercode: string,
        EmpCode: string 
      }[]>`
        SELECT costcentercode, EmpCode 
        FROM UserWithRoles 
        WHERE EmpCode = ${userId}
      `

      if (!user || user.length === 0) {
        console.log(`❌ User ${userId} not found in UserWithRoles`)
        return
      }

      const userData = user[0]
      const userCostCenter = userData.costcentercode
      
      if (!userCostCenter) {
        console.log(`❌ User ${userId} has no CostCenter assigned`)
        return
      }

      console.log(`🔍 User CostCenter: ${userCostCenter}`)

      // หา managers จาก VS_DivisionMgr โดยใช้ CostCenter
      console.log(`🔍 Looking for managers in VS_DivisionMgr with same CostCenter...`)
      const managers = await prisma.$queryRaw<{ 
        L2: string, 
        CurrentEmail: string, 
        FullNameEng: string, 
        PostNameEng: string,
        CostCenter: string
      }[]>`
        SELECT L2, CurrentEmail, FullNameEng, PostNameEng, CostCenter
        FROM VS_DivisionMgr 
        WHERE CostCenter = ${userCostCenter}
      `

      console.log(`🔔 Found ${managers.length} managers in VS_DivisionMgr:`, managers)
      console.log(`🔍 Manager details:`, managers.map((m: Manager) => ({
        L2: m.L2,
        Email: m.CurrentEmail,
        Name: m.FullNameEng,
        Position: m.PostNameEng,
        CostCenter: m.CostCenter
      })))

      // สร้าง Log รายละเอียดการส่งเมลให้ Manager
      const managerLogDetails = {
        requisitionId: requisitionId,
        requesterId: userId,
        costCenter: userCostCenter,
        totalManagers: managers.length,
        managers: managers.map((m: Manager) => ({
          L2: m.L2,
          Email: m.CurrentEmail,
          Name: m.FullNameEng,
          Position: m.PostNameEng,
          CostCenter: m.CostCenter
        })),
        timestamp: new Date().toISOString()
      };

      // แสดง Log เฉพาะใน development
      if (process.env.NODE_ENV !== 'production') {
        console.log('📋 ===== MANAGER NOTIFICATION LOG DETAILS =====');
        console.log('📋 Requisition Details:', {
          ID: managerLogDetails.requisitionId,
          RequesterID: managerLogDetails.requesterId,
          CostCenter: managerLogDetails.costCenter
        });
        console.log('📋 Manager Details:', {
          TotalManagers: managerLogDetails.totalManagers,
          Managers: managerLogDetails.managers
        });
        console.log('📋 ===== END MANAGER NOTIFICATION LOG =====');
      }

      // ส่งอีเมลแจ้งเตือน managers และบันทึกลงฐานข้อมูล
      console.log(`📧 Notifying managers for requisition ${requisitionId}`)
      for (const manager of managers) {
        if (manager.CurrentEmail) {
          try {
            // ส่งอีเมล
            await this.sendEmail(
              manager.CurrentEmail,
              'มีคำขอเบิกใหม่รอการอนุมัติ',
              this.createEmailTemplate('requisition_pending', {
                requisitionId,
                userId
              })
            )

            // ตรวจสอบว่า user นี้มีอยู่ในตาราง USERS หรือไม่
            console.log(`🔍 Checking if manager ${manager.L2} exists in USERS table...`)
            const existingUser = await prisma.uSERS.findUnique({
              where: { USER_ID: manager.L2 }
            })

            console.log(`🔍 Manager ${manager.L2} in USERS table:`, existingUser)

            if (!existingUser) {
              console.log(`⚠️ Manager ${manager.L2} ไม่มีอยู่ในตาราง USERS, ส่งเฉพาะ email เท่านั้น`)
              continue // ข้ามการสร้าง email log
            }

            // บันทึกการแจ้งเตือนลงฐานข้อมูลสำหรับ Manager
            console.log(`📝 Creating In-App notification for manager: ${manager.L2}`)
            
            const notificationResult = await this.logNotification({
              type: 'requisition_pending',
              userId: manager.L2, // ใช้ L2 ของ Manager จาก VS_DivisionMgr
              requisitionId,
              message: `มีคำขอเบิกใหม่ (เลขที่ ${requisitionId}) จาก ${userId} รอการอนุมัติ`
            })

            if (notificationResult) {
              console.log(`✅ ส่งการแจ้งเตือนและบันทึกลงฐานข้อมูลสำหรับ manager ${manager.L2}, Notification ID: ${notificationResult.EMAIL_ID}`)
            } else {
              console.log(`❌ ไม่สามารถสร้าง notification สำหรับ manager ${manager.L2}`)
            }
          } catch (error) {
            console.error(`❌ เกิดข้อผิดพลาดในการแจ้งเตือน manager ${manager.L2}:`, error)
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
          timestamp: new Date().toISOString()
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
                
                // ส่ง email แม้ว่าจะไม่มี user ในตาราง USERS
                try {
                  await this.sendEmail(
                    admin.EMAIL,
                    'ผู้ใช้งานแผนกไม่พบManager',
                    this.createEmailTemplate('no_manager_found', {
                      requisitionId,
                      userId,
                      costCenter: userCostCenter
                    })
                  )
                  console.log(`📧 ส่ง email ไปยัง admin ${admin.EMAIL} สำเร็จ (ไม่มี user ในระบบ)`)
                } catch (emailError) {
                  console.error(`❌ เกิดข้อผิดพลาดในการส่ง email ไปยัง admin ${admin.EMAIL}:`, emailError)
                }
                
                continue // ข้ามการสร้าง email log
              }

              // ส่งอีเมลแจ้งเตือน Admin
              console.log(`📧 Attempting to send admin notification email to ${admin.EMAIL}`)
              await this.sendEmail(
                admin.EMAIL,
                'ผู้ใช้งานแผนกไม่พบManager',
                this.createEmailTemplate('no_manager_found', {
                  requisitionId,
                  userId,
                  costCenter: userCostCenter
                })
              )

              // บันทึกการแจ้งเตือนลงฐานข้อมูล
              await this.logNotification({
                type: 'no_manager_found',
                userId: admin.USER_ID,
                requisitionId,
                message: `ผู้ใช้งานแผนก ${userCostCenter} (${userId}) ไม่พบManager - Requisition #${requisitionId}`,
                notificationType: 'both', // ส่งทั้ง email และ in-app
                priority: 'high'
              })

              console.log(`✅ ส่งการแจ้งเตือน admin ไปยัง ${admin.USER_ID} ที่ ${admin.EMAIL}`)
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
        timestamp: new Date().toISOString()
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
              
              // ส่ง email แม้ว่าจะไม่มี user ในตาราง USERS
              const emailSubject = isSelfApproval 
                ? 'Manager อนุมัติคำขอเบิกของตัวเอง' 
                : 'มีการอนุมัติคำขอเบิกใหม่'
              
              await this.sendEmail(
                admin.EMAIL,
                emailSubject,
                this.createEmailTemplate('requisition_approved_admin', {
                  requisitionId,
                  approvedBy,
                  requesterName: (requisition.USERS as any)?.FullNameThai || (requisition.USERS as any)?.FullNameEng || requisition.USER_ID,
                  totalAmount: requisition.TOTAL_AMOUNT,
                  submittedAt: requisition.SUBMITTED_AT,
                  isSelfApproval
                })
              )
              console.log(`📧 ส่ง email ไปยัง admin ${admin.EMAIL} สำเร็จ (ไม่มี user ในระบบ)`)
              
              continue // ข้ามการสร้าง email log
            }

            // ส่งอีเมลแจ้งเตือน
            console.log(`📧 Attempting to send admin notification email to ${admin.EMAIL}`)
            
            const emailSubject = isSelfApproval 
              ? 'Manager อนุมัติคำขอเบิกของตัวเอง' 
              : 'มีการอนุมัติคำขอเบิกใหม่'
            
            await this.sendEmail(
              admin.EMAIL,
              emailSubject,
              this.createEmailTemplate('requisition_approved_admin', {
                requisitionId,
                approvedBy,
                requesterName: (requisition.USERS as any)?.FullNameThai || (requisition.USERS as any)?.FullNameEng || requisition.USER_ID,
                totalAmount: requisition.TOTAL_AMOUNT,
                submittedAt: requisition.SUBMITTED_AT,
                isSelfApproval
              })
            )

            // บันทึกการแจ้งเตือนลงฐานข้อมูล
            const message = isSelfApproval 
              ? `Manager ${approvedBy} อนุมัติคำขอเบิกของตัวเอง (เลขที่ ${requisitionId}) จำนวนเงิน: ฿${requisition.TOTAL_AMOUNT?.toFixed(2)}`
              : `มีการอนุมัติคำขอเบิกใหม่ (เลขที่ ${requisitionId}) จาก ${(requisition.USERS as any)?.FullNameThai || (requisition.USERS as any)?.FullNameEng || requisition.USER_ID} โดย ${approvedBy} จำนวนเงิน: ฿${requisition.TOTAL_AMOUNT?.toFixed(2)}`
            
            await this.logNotification({
              type: 'requisition_approved',
              userId: admin.USER_ID,
              requisitionId,
              message,
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
      
      // บันทึกการแจ้งเตือนในฐานข้อมูล EMAIL_LOGS พร้อมข้อมูลอีเมลครบถ้วน
      const emailLog = await prisma.eMAIL_LOGS.create({
        data: {
          TO_USER_ID: data.userId,
          SUBJECT: `Notification: ${data.type}`,
          BODY: fullMessage,
          STATUS: 'PENDING', // เริ่มต้นเป็น PENDING ก่อนส่งอีเมล
          SENT_AT: new Date(),
          IS_READ: false,
          FROM_EMAIL: process.env.SMTP_FROM || 'stationaryhub@ube.co.th',
          TO_EMAIL: data.email || null,
          EMAIL_TYPE: data.type || 'notification',
          PRIORITY: data.priority || 'medium',
          DELIVERY_STATUS: 'pending',
          RETRY_COUNT: 0,
          CREATED_BY: data.actorId || 'system'
        }
      })
      
      // ถ้าเป็น email หรือ both ให้ส่ง email
      if (notificationType === 'email' || notificationType === 'both') {
        if (data.email) {
          try {
            // ส่งอีเมลและอัปเดตข้อมูลในฐานข้อมูล
            const emailResult = await this.sendEmailWithLogging(
              data.email, 
              `Notification: ${data.type}`, 
              data.message,
              emailLog.EMAIL_ID
            )
            
            if (emailResult.success) {
              // อัปเดตสถานะเป็น SENT และบันทึก MESSAGE_ID
              await prisma.eMAIL_LOGS.update({
                where: { EMAIL_ID: emailLog.EMAIL_ID },
                data: {
                  STATUS: 'SENT',
                  MESSAGE_ID: emailResult.messageId,
                  DELIVERY_STATUS: 'sent',
                  EMAIL_SIZE: BigInt(emailResult.emailSize || 0)
                }
              })
              console.log(`📧 Email sent to ${data.email} with Message ID: ${emailResult.messageId}`)
            } else {
              // อัปเดตสถานะเป็น FAILED และบันทึก error
              await prisma.eMAIL_LOGS.update({
                where: { EMAIL_ID: emailLog.EMAIL_ID },
                data: {
                  STATUS: 'FAILED',
                  DELIVERY_STATUS: 'failed',
                  ERROR_MESSAGE: emailResult.error,
                  RETRY_COUNT: 1
                }
              })
              console.error(`❌ Failed to send email to ${data.email}: ${emailResult.error}`)
            }
          } catch (error) {
            // อัปเดตสถานะเป็น FAILED และบันทึก error
            await prisma.eMAIL_LOGS.update({
              where: { EMAIL_ID: emailLog.EMAIL_ID },
              data: {
                STATUS: 'FAILED',
                DELIVERY_STATUS: 'failed',
                ERROR_MESSAGE: error instanceof Error ? error.message : String(error),
                RETRY_COUNT: 1
              }
            })
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
          await prisma.eMAIL_LOGS.update({
            where: { EMAIL_ID: emailLog.EMAIL_ID },
            data: {
              STATUS: 'PENDING',
              DELIVERY_STATUS: 'retrying',
              RETRY_COUNT: currentRetryCount + 1
            }
          })

          // ลองส่งอีเมลใหม่
          const emailResult = await this.sendEmailWithLogging(
            emailLog.TO_EMAIL || '',
            emailLog.SUBJECT || '',
            emailLog.BODY || '',
            emailLog.EMAIL_ID
          )

          if (emailResult.success) {
            // ส่งสำเร็จ
            await prisma.eMAIL_LOGS.update({
              where: { EMAIL_ID: emailLog.EMAIL_ID },
              data: {
                STATUS: 'SENT',
                MESSAGE_ID: emailResult.messageId,
                DELIVERY_STATUS: 'sent',
                EMAIL_SIZE: BigInt(emailResult.emailSize || 0),
                ERROR_MESSAGE: null // ลบ error message
              }
            })
            console.log(`✅ Email ID ${emailLog.EMAIL_ID} sent successfully on retry`)
            retryCount++
          } else {
            // ส่งไม่สำเร็จ
            await prisma.eMAIL_LOGS.update({
              where: { EMAIL_ID: emailLog.EMAIL_ID },
              data: {
                STATUS: 'FAILED',
                DELIVERY_STATUS: 'failed',
                ERROR_MESSAGE: emailResult.error
              }
            })
            console.log(`❌ Email ID ${emailLog.EMAIL_ID} failed on retry: ${emailResult.error}`)
          }

        } catch (retryError) {
          console.error(`❌ Error retrying email ID ${emailLog.EMAIL_ID}:`, retryError)
          
          // อัปเดตสถานะเป็น FAILED
          await prisma.eMAIL_LOGS.update({
            where: { EMAIL_ID: emailLog.EMAIL_ID },
            data: {
              STATUS: 'FAILED',
              DELIVERY_STATUS: 'failed',
              ERROR_MESSAGE: retryError instanceof Error ? retryError.message : String(retryError)
            }
          })
        }
      }

      console.log(`✅ Email retry process completed. Successfully retried: ${retryCount} emails`)
      return {
        success: true,
        totalFailed: failedEmails.length,
        retrySuccess: retryCount,
        retryFailed: failedEmails.length - retryCount
      }

    } catch (error) {
      console.error('❌ Error in email retry process:', error)
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
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 ชั่วโมงที่แล้ว
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
      return notifications.map((notification: any) => {
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
    }
  }

  /**
   * สร้าง HTML template สำหรับอีเมล
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
                <td>${data.requisitionId}</td>
              </tr>
              <tr>
                <td>จำนวนเงิน:</td>
                <td>฿${data.totalAmount?.toFixed(2)}</td>
              </tr>
              <tr>
                <td>สถานะ:</td>
                <td>รอการอนุมัติ</td>
              </tr>
            </table>
          <p>ระบบจะแจ้งเตือนเมื่อคำขอของคุณได้รับการอนุมัติหรือปฏิเสธ</p>
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
                <td>${data.requisitionId}</td>
              </tr>
              <tr>
                <td>อนุมัติโดย:</td>
                <td>${data.approvedBy}</td>
              </tr>
              <tr>
                <td>สถานะ:</td>
                <td>อนุมัติแล้ว</td>
              </tr>
            </table>
          <p>คุณสามารถติดตามสถานะได้ในระบบ</p>
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
                <td>${data.requisitionId}</td>
              </tr>
              <tr>
                <td>ปฏิเสธโดย:</td>
                <td>${data.rejectedBy}</td>
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
          <p>หากมีคำถาม กรุณาติดต่อผู้จัดการ</p>
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
                <td>${data.requisitionId}</td>
              </tr>
              <tr>
                <td>จากผู้ใช้:</td>
                <td>${data.userId}</td>
              </tr>
              <tr>
                <td>สถานะ:</td>
                <td>รอการอนุมัติ</td>
              </tr>
            </table>
          <p>กรุณาเข้าสู่ระบบเพื่อตรวจสอบและดำเนินการ</p>
            <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/approvals" class="button">ดูคำขอเบิก</a>
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
                <td>${new Date().toLocaleDateString()}</td>
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
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>สินค้ามาแล้ว - StationaryHub</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.5; 
            color: #333; 
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
          }
          
          .email-container { 
            width: 100%; 
            background-color: #ffffff;
            border: 1px solid #ddd;
          }
          
          .header { 
            background-color: #2c3e50; 
            color: white; 
            padding: 30px 40px; 
            text-align: center;
          }
          
          .header h1 { 
            font-size: 24px; 
            font-weight: bold; 
            margin: 0;
          }
          
          .header p { 
            font-size: 16px; 
            margin: 8px 0 0 0;
          }
          
          .content { 
            padding: 40px; 
            background-color: #ffffff;
          }
          
          .section { 
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #e0e0e0;
            background-color: #fafafa;
          }
          
          .section h3 { 
            color: #2c3e50; 
            font-size: 18px; 
            font-weight: bold; 
            margin: 0 0 15px 0;
            border-bottom: 2px solid #2c3e50;
            padding-bottom: 8px;
          }
          
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          
          .info-table td {
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
            font-size: 15px;
          }
          
          .info-table td:first-child {
            font-weight: bold;
            width: 200px;
            color: #2c3e50;
          }
          
          .message-box {
            background-color: #ffffff;
            border: 1px solid #ccc;
            padding: 20px;
            margin-top: 15px;
            font-size: 15px;
            line-height: 1.5;
            white-space: pre-line;
          }
          
          .button { 
            display: inline-block; 
            padding: 15px 30px; 
            background-color: #2c3e50; 
            color: #ffffff; 
            text-decoration: none; 
            border: none;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
          }
          
          .footer { 
            margin-top: 30px; 
            padding: 30px 40px; 
            background-color: #f8f9fa; 
            border-top: 1px solid #e0e0e0;
            font-size: 14px; 
            color: #666;
            text-align: center;
          }
          
          .footer p {
            margin: 8px 0;
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
              font-size: 14px;
              padding: 6px 0;
            }
            
            .info-table td:first-child {
              width: 120px;
              font-size: 13px;
            }
            
            .message-box {
              font-size: 14px;
              padding: 15px;
            }
            
            .button {
              width: 100%;
              display: block;
              text-align: center;
              padding: 12px 20px;
              font-size: 15px;
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
            <h1>สินค้ามาแล้ว</h1>
            <p>StationaryHub - การแจ้งเตือนสินค้ามาแล้ว</p>
          </div>
          <div class="content">
            <div class="section">
              <h3>สถานะสินค้า</h3>
              <p>สินค้าที่คุณขอเบิกได้มาถึงแล้ว กรุณาติดต่อแผนกจัดซื้อเพื่อรับสินค้า</p>
            </div>
            
            <div class="section">
              <h3>รายละเอียดคำขอเบิก</h3>
              <table class="info-table">
                <tr>
                  <td>เลขที่คำขอ:</td>
                  <td>#${data.requisitionId}</td>
                </tr>
                <tr>
                  <td>ผู้ขอเบิก:</td>
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
                  <td>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</td>
                </tr>
              </table>
            </div>
            
            <div class="section">
              <h3>ข้อความจากผู้ดูแลระบบ</h3>
              <div class="message-box">${data.message}</div>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/orders" class="button">ดูรายการคำขอเบิก</a>
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
              <p><strong>เวลาส่ง:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div class="footer">
              <p>นี่เป็นอีเมลทดสอบจากระบบ Stationary Hub</p>
            </div>
          </div>
        </body>
        </html>
      `

      await this.sendEmail(toEmail, subject, htmlContent)
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