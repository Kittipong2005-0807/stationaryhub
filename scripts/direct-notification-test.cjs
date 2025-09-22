// =====================================================
// ทดสอบระบบแจ้งเตือนโดยตรง
// =====================================================

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

// คัดลอกฟังก์ชันจาก NotificationService
class TestNotificationService {
  static async getUserEmailFromLDAP(userId) {
    try {
      console.log(`🔍 Searching for email of user: ${userId}`);
      
      const user = await prisma.$queryRaw`
        SELECT CurrentEmail FROM userWithRoles WHERE EmpCode = ${userId}
      `;
      
      console.log(`🔍 Query result for ${userId}:`, user);
      
      if (user && user.length > 0) {
        const email = user[0].CurrentEmail;
        if (email && email.trim() !== '') {
          console.log(`✅ Found email for ${userId}: ${email}`);
          return email;
        } else {
          console.log(`⚠️ User ${userId} has empty or null email`);
          return null;
        }
      } else {
        console.log(`⚠️ No user found in userWithRoles for ${userId}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error fetching email for ${userId}:`, error);
      return null;
    }
  }

  static async sendEmail(to, subject, html) {
    try {
      console.log(`📧 Sending email to ${to}`);
      
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ SMTP credentials not configured!');
        return;
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });

      await transporter.verify();
      console.log('✅ SMTP connection verified');

      const mailOptions = {
        from: process.env.SMTP_FROM,
        to,
        subject,
        html,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully! Message ID: ${result.messageId}`);
      
      transporter.close();
      
    } catch (error) {
      console.error('❌ Error sending email:', error);
    }
  }

  static async notifyRequisitionCreated(requisitionId, userId) {
    console.log(`🔔 ===== NOTIFICATION SERVICE START =====`);
    console.log(`🔔 Notifying requisition created: ${requisitionId} by ${userId}`);
    
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
      });

      if (!requisition) {
        console.log(`❌ Requisition ${requisitionId} not found`);
        return;
      }

      console.log(`✅ Found requisition: ${requisition.REQUISITION_ID}`);

      // ดึง email จาก LDAP
      const userEmail = await this.getUserEmailFromLDAP(userId);
      console.log(`📧 User email from LDAP: ${userEmail}`);

      if (userEmail) {
        try {
          console.log(`📧 Sending HTML email to user ${userId} at ${userEmail}`);
          
          // สร้างข้อมูลรายการสินค้า
          const items = requisition.REQUISITION_ITEMS?.map((item) => ({
            productName: item.PRODUCTS?.PRODUCT_NAME || 'Unknown Product',
            quantity: item.QUANTITY || 0,
            unitPrice: Number(item.UNIT_PRICE || 0),
            totalPrice: Number(item.QUANTITY || 0) * Number(item.UNIT_PRICE || 0)
          })) || [];
          
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>คำขอเบิกได้รับการส่งเรียบร้อยแล้ว</title>
            </head>
            <body>
              <h1>คำขอเบิกได้รับการส่งเรียบร้อยแล้ว</h1>
              <p>คำขอเบิกของคุณ (เลขที่ ${requisitionId}) ได้ทำการส่งเรียบร้อยแล้ว</p>
              <p>จำนวนเงิน: ฿${requisition.TOTAL_AMOUNT?.toFixed(2)}</p>
              <p>วันที่ส่ง: ${requisition.SUBMITTED_AT ? new Date(requisition.SUBMITTED_AT).toLocaleDateString('th-TH') : new Date().toLocaleDateString('th-TH')}</p>
              <p>รายการสินค้า:</p>
              <ul>
                ${items.map(item => `<li>${item.productName} x ${item.quantity} = ฿${item.totalPrice.toFixed(2)}</li>`).join('')}
              </ul>
            </body>
            </html>
          `;
          
          await this.sendEmail(
            userEmail,
            'คำขอเบิกได้รับการส่งเรียบร้อยแล้ว',
            emailHtml
          );
          console.log(`✅ HTML email sent to user ${userId}`);
        } catch (emailError) {
          console.error(`❌ Error sending HTML email to user ${userId}:`, emailError);
        }
      }

      // แจ้งเตือน Manager ที่เกี่ยวข้อง
      await this.notifyManagers(requisitionId, userId);

      console.log(`✅ Requisition creation notification completed for ${requisitionId}`);

    } catch (error) {
      console.error('❌ Error notifying requisition created:', error);
    }
  }

  static async notifyManagers(requisitionId, userId) {
    try {
      console.log(`🔔 ===== MANAGER NOTIFICATION START =====`);
      console.log(`🔔 Notifying managers for requisition ${requisitionId} from user ${userId}`);
      
      // ตรวจสอบว่าเป็น Manager หรือไม่
      const managerCheck = await prisma.$queryRaw`
        SELECT L2, CurrentEmail, FullNameEng, PostNameEng, CostCenter
        FROM VS_DivisionMgr 
        WHERE L2 = ${userId}
      `;

      console.log(`🔍 Manager check result:`, managerCheck);

      if (managerCheck && managerCheck.length > 0) {
        console.log(`✅ User ${userId} is a Manager - ไม่ส่งแจ้งเตือนใคร (สามารถอนุมัติตัวเองได้)`);
        return;
      }

      console.log(`🔍 User ${userId} is not a Manager - หา Manager ในแผนกเดียวกัน`);

      // ดึงข้อมูล user เพื่อหา CostCenter
      const user = await prisma.$queryRaw`
        SELECT costcentercode, EmpCode 
        FROM UserWithRoles 
        WHERE EmpCode = ${userId}
      `;

      if (!user || user.length === 0) {
        console.log(`❌ User ${userId} not found in UserWithRoles`);
        return;
      }

      const userData = user[0];
      const userCostCenter = userData.costcentercode;
      
      if (!userCostCenter) {
        console.log(`❌ User ${userId} has no CostCenter assigned`);
        return;
      }

      console.log(`🔍 User CostCenter: ${userCostCenter}`);

      // หา managers จาก VS_DivisionMgr โดยใช้ CostCenter
      const managers = await prisma.$queryRaw`
        SELECT L2, CurrentEmail, FullNameEng, PostNameEng, CostCenter
        FROM VS_DivisionMgr 
        WHERE CostCenter = ${userCostCenter}
      `;

      console.log(`🔔 Found ${managers.length} managers in VS_DivisionMgr:`, managers);

      // ส่งอีเมลแจ้งเตือน managers
      console.log(`📧 Notifying managers for requisition ${requisitionId}`);
      for (const manager of managers) {
        if (manager.CurrentEmail) {
          try {
            console.log(`📧 Sending email to manager: ${manager.FullNameEng} (${manager.CurrentEmail})`);
            
            // ดึงข้อมูลชื่อผู้ขอเบิกจริง
            const requesterInfo = await prisma.$queryRaw`
              SELECT FullNameEng, FullNameThai, AdLoginName 
              FROM UserWithRoles 
              WHERE EmpCode = ${userId}
            `;
            
            const requesterName = requesterInfo && requesterInfo.length > 0 
              ? (requesterInfo[0].FullNameThai || requesterInfo[0].FullNameEng || requesterInfo[0].AdLoginName || userId)
              : userId;
            
            const emailHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <title>มีคำขอเบิกใหม่รอการอนุมัติ</title>
              </head>
              <body>
                <h1>มีคำขอเบิกใหม่รอการอนุมัติ</h1>
                <p>มีคำขอเบิกใหม่ที่รอการอนุมัติจากคุณ</p>
                <p>เลขที่คำขอ: #${requisitionId}</p>
                <p>จากผู้ใช้: ${requesterName}</p>
                <p>Manager: ${manager.FullNameEng}</p>
                <p>วันที่ส่ง: ${new Date().toLocaleDateString('th-TH')}</p>
                <p>เวลาส่ง: ${new Date().toLocaleTimeString('th-TH')}</p>
                <p>สถานะ: รอการอนุมัติ</p>
              </body>
              </html>
            `;
            
            await this.sendEmail(
              manager.CurrentEmail,
              'มีคำขอเบิกใหม่รอการอนุมัติ',
              emailHtml
            );
            
            console.log(`✅ Email sent successfully to manager ${manager.L2} at ${manager.CurrentEmail}`);

          } catch (error) {
            console.error(`❌ เกิดข้อผิดพลาดในการแจ้งเตือน manager ${manager.L2}:`, error);
          }
        } else {
          console.log(`⚠️ Manager ${manager.L2} ไม่มีอีเมล`);
        }
      }

    } catch (error) {
      console.error('❌ Error notifying managers:', error);
    }
  }
}

async function testDirectNotification() {
  try {
    console.log('🔔 ทดสอบระบบแจ้งเตือนโดยตรง...\n');

    // หาผู้ใช้ทดสอบ
    const testUser = await prisma.uSERS.findFirst({
      where: {
        ROLE: 'USER'
      }
    });

    if (!testUser) {
      console.log('❌ ไม่พบผู้ใช้ทดสอบ');
      return;
    }

    console.log(`👤 ผู้ใช้ทดสอบ: ${testUser.USERNAME} (${testUser.USER_ID})`);

    // หาสินค้าทดสอบ
    const testProduct = await prisma.pRODUCTS.findFirst();

    if (!testProduct) {
      console.log('❌ ไม่พบสินค้าทดสอบ');
      return;
    }

    console.log(`📦 สินค้าทดสอบ: ${testProduct.PRODUCT_NAME} (${testProduct.PRODUCT_ID})`);

    // สร้างคำขอเบิกทดสอบ
    const testRequisition = await prisma.rEQUISITIONS.create({
      data: {
        USER_ID: testUser.USER_ID,
        STATUS: 'PENDING',
        TOTAL_AMOUNT: 100.00,
        SUBMITTED_AT: new Date()
      }
    });

    console.log(`✅ สร้างคำขอเบิกทดสอบสำเร็จ (ID: ${testRequisition.REQUISITION_ID})`);

    // เพิ่มรายการสินค้า
    const testItem = await prisma.rEQUISITION_ITEMS.create({
      data: {
        REQUISITION_ID: testRequisition.REQUISITION_ID,
        PRODUCT_ID: testProduct.PRODUCT_ID,
        QUANTITY: 1,
        UNIT_PRICE: 100.00,
        TOTAL_PRICE: 100.00
      }
    });

    console.log(`✅ เพิ่มรายการสินค้าสำเร็จ (ID: ${testItem.ITEM_ID})`);

    // เรียกใช้ระบบแจ้งเตือน
    console.log('\n🔔 เรียกใช้ระบบแจ้งเตือน...');
    await TestNotificationService.notifyRequisitionCreated(
      testRequisition.REQUISITION_ID, 
      testUser.USER_ID
    );

    // ตรวจสอบ EMAIL_LOGS
    console.log('\n📧 ตรวจสอบ EMAIL_LOGS...');
    const emailLogs = await prisma.eMAIL_LOGS.findMany({
      where: {
        TO_USER_ID: testUser.USER_ID,
        EMAIL_TYPE: {
          in: ['requisition_created', 'requisition_pending']
        }
      },
      orderBy: {
        SENT_AT: 'desc'
      },
      take: 5
    });

    console.log(`📋 พบ EMAIL_LOGS ${emailLogs.length} รายการ:`);
    emailLogs.forEach((log, index) => {
      console.log(`${index + 1}. ID: ${log.EMAIL_ID}`);
      console.log(`   TO_EMAIL: ${log.TO_EMAIL}`);
      console.log(`   SUBJECT: ${log.SUBJECT}`);
      console.log(`   STATUS: ${log.STATUS}`);
      console.log(`   EMAIL_TYPE: ${log.EMAIL_TYPE}`);
      console.log(`   SENT_AT: ${log.SENT_AT}`);
      console.log(`   ERROR_MESSAGE: ${log.ERROR_MESSAGE || 'ไม่มี'}`);
      console.log('   ---');
    });

    // ลบข้อมูลทดสอบ
    console.log('\n🗑️ ลบข้อมูลทดสอบ...');
    await prisma.rEQUISITION_ITEMS.delete({
      where: { ITEM_ID: testItem.ITEM_ID }
    });
    await prisma.rEQUISITIONS.delete({
      where: { REQUISITION_ID: testRequisition.REQUISITION_ID }
    });
    console.log('✅ ลบข้อมูลทดสอบสำเร็จ');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectNotification();
