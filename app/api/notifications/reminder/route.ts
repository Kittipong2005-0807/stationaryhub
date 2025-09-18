import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/notification-service";

// ฟังก์ชันหา Manager อัตโนมัติสำหรับคำขอเบิก โดยใช้ CostCenter
async function findManagersForRequisition(requisition: any): Promise<string[]> {
  try {
    console.log(`🔍 Finding managers for requisition ${requisition.REQUISITION_ID} from user ${requisition.USER_ID}`);
    
    // ดึงข้อมูล user ที่ส่งคำขอเบิก
    const user = await prisma.$queryRaw<{ costcentercode: string, CurrentEmail: string }[]>`
      SELECT costcentercode, CurrentEmail FROM UserWithRoles WHERE EmpCode = ${requisition.USER_ID}
    `;

    if (!user || user.length === 0 || !user[0].costcentercode) {
      console.log(`❌ User ${requisition.USER_ID} not found or no costcentercode`);
      return [];
    }

    const costCenter = user[0].costcentercode;
    console.log(`🔔 User CostCenter: ${costCenter}`);

    // หา managers จาก VS_DivisionMgr โดยใช้ CostCenter
    const managers = await prisma.$queryRaw<{ CurrentEmail: string, FullNameEng: string, PostNameEng: string }[]>`
      SELECT CurrentEmail, FullNameEng, PostNameEng
      FROM VS_DivisionMgr 
      WHERE CostCenter = ${costCenter}
      AND CurrentEmail IS NOT NULL
      AND CurrentEmail != ''
    `;

    console.log(`🔔 Found ${managers.length} managers for CostCenter ${costCenter}:`, managers.map((m: any) => ({
      Name: m.FullNameEng,
      Position: m.PostNameEng,
      Email: m.CurrentEmail
    })));

    // ถ้าไม่มี Manager ใน CostCenter เดียวกัน ไม่ส่งอีเมล
    if (managers.length === 0) {
      console.log(`❌ No managers found for CostCenter ${costCenter}, skipping email notification`);
      return [];
    }

    return managers.map((m: any) => m.CurrentEmail).filter((email: any) => email);

  } catch (error) {
    console.error('❌ Error finding managers for requisition:', error);
    return [];
  }
}

// ฟังก์ชันดึงการตั้งค่าอีเมล
async function getEmailSettings() {
  try {
    const dbSettings = await prisma.eMAIL_SETTINGS.findFirst({
      orderBy: {
        CREATED_DATE: 'desc'
      }
    });

    if (dbSettings) {
      return {
        enabled: dbSettings.ENABLED || true,
        schedule: {
          hour: dbSettings.SCHEDULE_HOUR || 10,
          minute: dbSettings.SCHEDULE_MINUTE || 0,
          timezone: dbSettings.TIMEZONE || 'Asia/Bangkok',
          frequency: dbSettings.FREQUENCY || 'daily'
        },
        filters: {
          minDaysPending: dbSettings.MIN_DAYS_PENDING || 1,
          maxDaysPending: dbSettings.MAX_DAYS_PENDING || 30
        },
        recipients: {
          managers: dbSettings.MANAGER_EMAILS ? JSON.parse(dbSettings.MANAGER_EMAILS) : ['manager@company.com'],
          admins: dbSettings.ADMIN_EMAILS ? JSON.parse(dbSettings.ADMIN_EMAILS) : ['admin@company.com'],
          customEmails: dbSettings.CUSTOM_EMAILS ? JSON.parse(dbSettings.CUSTOM_EMAILS) : []
        },
        template: {
          subject: dbSettings.EMAIL_SUBJECT || '🔔 แจ้งเตือนซ้ำ - มีคำขอเบิกรอการอนุมัติ',
          headerColor: dbSettings.HEADER_COLOR || '#dc2626',
          urgencyLevel: dbSettings.URGENCY_LEVEL || 'medium',
          includeProductDetails: dbSettings.INCLUDE_PRODUCT_DETAILS || true,
          includeRequesterInfo: dbSettings.INCLUDE_REQUESTER_INFO || true,
          customMessage: dbSettings.CUSTOM_MESSAGE || ''
        }
      };
    }

    // ถ้าไม่มีในฐานข้อมูล ให้ใช้ค่า default
    return {
      enabled: true,
      schedule: {
        hour: 10,
        minute: 0,
        timezone: 'Asia/Bangkok',
        frequency: 'daily'
      },
      filters: {
        minDaysPending: 1,
        maxDaysPending: 30
      },
      recipients: {
        managers: ['manager@company.com'],
        admins: ['admin@company.com'],
        customEmails: []
      },
      template: {
        subject: '🔔 แจ้งเตือนซ้ำ - มีคำขอเบิกรอการอนุมัติ',
        headerColor: '#dc2626',
        urgencyLevel: 'medium',
        includeProductDetails: true,
        includeRequesterInfo: true,
        customMessage: ''
      }
    };

  } catch (error) {
    console.error('❌ Error getting email settings from database:', error);
    return {
      enabled: true,
      schedule: { hour: 10, minute: 0, timezone: 'Asia/Bangkok', frequency: 'daily' },
      filters: { minDaysPending: 1, maxDaysPending: 30 },
      recipients: {
        managers: ['manager@company.com'],
        admins: ['admin@company.com'],
        customEmails: []
      },
      template: {
        subject: '🔔 แจ้งเตือนซ้ำ - มีคำขอเบิกรอการอนุมัติ',
        headerColor: '#dc2626',
        urgencyLevel: 'medium',
        includeProductDetails: true,
        includeRequesterInfo: true,
        customMessage: ''
      }
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 ===== EMAIL REMINDER SYSTEM START =====');
    console.log('🔔 Starting daily reminder check at:', new Date().toLocaleString());

    // ดึงคำขอที่รอการอนุมัติ (สถานะ PENDING)
    const pendingRequisitions = await prisma.rEQUISITIONS.findMany({
      where: {
        STATUS: 'PENDING'
      },
      include: {
        USERS: true,
        REQUISITION_ITEMS: {
          include: {
            PRODUCTS: true
          }
        }
      },
      orderBy: {
        SUBMITTED_AT: 'asc' // เรียงตามวันที่ส่งคำขอ (เก่าที่สุดก่อน)
      }
    });

    console.log(`📋 Found ${pendingRequisitions.length} pending requisitions`);

    if (pendingRequisitions.length === 0) {
      console.log('✅ No pending requisitions found. No reminders needed.');
      return NextResponse.json({
        success: true,
        message: "ไม่มีคำขอที่รอการอนุมัติ",
        pendingCount: 0,
        remindersSent: 0
      });
    }

    let remindersSent = 0;
    const results = [];

    // ส่งอีเมลแจ้งเตือนซ้ำสำหรับแต่ละคำขอ
    for (const requisition of pendingRequisitions) {
      try {
        console.log(`📧 Processing reminder for requisition: ${requisition.REQUISITION_ID}`);

        // คำนวณจำนวนวันที่รอการอนุมัติ
        const submittedDate = requisition.SUBMITTED_AT || new Date();
        const daysPending = Math.floor(
          (new Date().getTime() - new Date(submittedDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        // สร้างข้อมูลสำหรับอีเมลแจ้งเตือนซ้ำ
        const reminderData = {
          requisitionId: requisition.REQUISITION_ID,
          userId: requisition.USER_ID,
          requesterName: requisition.USERS?.USERNAME || requisition.USER_ID,
          totalAmount: Number(requisition.TOTAL_AMOUNT || 0),
          daysPending: daysPending,
          createdDate: submittedDate,
          items: requisition.REQUISITION_ITEMS?.map((item: any) => ({
            productName: item.PRODUCTS?.PRODUCT_NAME || 'Unknown Product',
            quantity: item.QUANTITY || 0,
            unitPrice: Number(item.UNIT_PRICE || 0)
          })) || []
        };

        // สร้าง HTML content สำหรับอีเมลแจ้งเตือนซ้ำ
        const htmlContent = createReminderEmailTemplate(reminderData);

        // หา Manager อัตโนมัติจาก UserWithRoles (ส่งเฉพาะ Manager เท่านั้น)
        const autoManagers = await findManagersForRequisition(requisition);
        
        // ส่งเฉพาะ Manager ในแผนกเดียวกัน
        const recipients = [...autoManagers];

        console.log(`📧 Sending reminders to ${recipients.length} managers:`, recipients);

        // สร้าง Log รายละเอียดการส่งเมล (ปิดการแสดงในโปรดักชั่น)
        const emailLogDetails = {
          requisitionId: requisition.REQUISITION_ID,
          requesterName: reminderData.requesterName,
          requesterId: requisition.USER_ID,
          costCenter: requisition.USERS?.DEPARTMENT,
          totalRecipients: recipients.length,
          recipients: recipients,
          daysPending: daysPending,
          totalAmount: reminderData.totalAmount,
          timestamp: new Date().toISOString()
        };

        // แสดง Log เฉพาะใน development
        if (process.env.NODE_ENV !== 'production') {
          console.log('📋 ===== EMAIL REMINDER LOG DETAILS =====');
          console.log('📋 Requisition Details:', {
            ID: emailLogDetails.requisitionId,
            Requester: emailLogDetails.requesterName,
            RequesterID: emailLogDetails.requesterId,
            CostCenter: emailLogDetails.costCenter,
            DaysPending: emailLogDetails.daysPending,
            TotalAmount: emailLogDetails.totalAmount
          });
          console.log('📋 Recipients Details:', {
            TotalManagers: emailLogDetails.totalRecipients,
            ManagerEmails: emailLogDetails.recipients
          });
          console.log('📋 ===== END EMAIL REMINDER LOG =====');
        }

        // ส่งอีเมลให้ Manager เท่านั้น
        for (const recipient of recipients) {
          try {
            // ==========================================
            // 📧 EMAIL SENDING ENABLED - SEND REAL EMAILS
            // ==========================================
            // แสดง Log เฉพาะใน development
            if (process.env.NODE_ENV !== 'production') {
              console.log('📧 ===== EMAIL REMINDER ENABLED - SENDING REAL EMAILS =====')
              console.log('📧 Sending reminder email with the following details:')
              console.log('  - To:', recipient)
              console.log('  - Subject:', `🔔 แจ้งเตือนซ้ำ - มีคำขอเบิกรอการอนุมัติ #${requisition.REQUISITION_ID}`)
              console.log('  - Requisition ID:', requisition.REQUISITION_ID)
              console.log('  - Requester:', reminderData.requesterName)
              console.log('  - CostCenter:', requisition.USERS?.DEPARTMENT)
              console.log('  - Days Pending:', daysPending)
              console.log('  - Total Amount:', reminderData.totalAmount)
              console.log('  - Timestamp:', new Date().toISOString())
              console.log('📧 ===== EMAIL SENDING IN PROGRESS =====')
            }
            
            // ส่งอีเมลจริง
            await NotificationService.sendTestEmail(
              recipient,
              `🔔 แจ้งเตือนซ้ำ - มีคำขอเบิกรอการอนุมัติ #${requisition.REQUISITION_ID}`,
              htmlContent
            );
            remindersSent++;
            console.log(`✅ Reminder sent to ${recipient} for requisition: ${requisition.REQUISITION_ID}`);
            
            // บันทึก log การส่งอีเมลแจ้งเตือนซ้ำ
            await prisma.eMAIL_LOGS.create({
              data: {
                TO_USER_ID: recipient,
                SUBJECT: `🔔 แจ้งเตือนซ้ำ - มีคำขอเบิกรอการอนุมัติ #${requisition.REQUISITION_ID}`,
                BODY: htmlContent,
                STATUS: 'sent',
                SENT_AT: new Date()
              }
            });

          } catch (emailError) {
            console.log(`❌ Failed to send reminder to ${recipient} for requisition: ${requisition.REQUISITION_ID}`, emailError);
            
            // บันทึก log การส่งอีเมลล้มเหลว
              await prisma.eMAIL_LOGS.create({
                data: {
                  TO_USER_ID: recipient,
                  SUBJECT: `🔔 แจ้งเตือนซ้ำ - มีคำขอเบิกรอการอนุมัติ #${requisition.REQUISITION_ID}`,
                  BODY: htmlContent,
                  STATUS: 'failed',
                  SENT_AT: new Date()
                }
              });
          }
        }

        results.push({
          requisitionId: requisition.REQUISITION_ID,
          requesterName: reminderData.requesterName,
          daysPending: daysPending,
          status: 'sent'
        });

      } catch (error) {
        console.error(`❌ Error processing reminder for requisition ${requisition.REQUISITION_ID}:`, error);
        results.push({
          requisitionId: requisition.REQUISITION_ID,
          requesterName: requisition.USERS?.USERNAME || requisition.USER_ID,
          daysPending: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`✅ Email reminder process completed. Sent ${remindersSent} reminders out of ${pendingRequisitions.length} pending requisitions`);

    return NextResponse.json({
      success: true,
      message: `ส่งอีเมลแจ้งเตือนซ้ำสำเร็จ ${remindersSent}/${pendingRequisitions.length} คำขอ`,
      pendingCount: pendingRequisitions.length,
      remindersSent: remindersSent,
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in email reminder system:', error);
    
    return NextResponse.json({
      error: "Failed to process email reminders",
      message: error instanceof Error ? error.message : "Unknown error",
      details: error
    }, { status: 500 });
  }
}

// สร้าง HTML template สำหรับอีเมลแจ้งเตือนซ้ำ
function createReminderEmailTemplate(data: {
  requisitionId: number;
  userId: string;
  requesterName: string;
  totalAmount: number;
  daysPending: number;
  createdDate: Date;
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
}): string {
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();

  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>แจ้งเตือนซ้ำ - คำขอเบิกรอการอนุมัติ - StationaryHub</title>
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
          background-color: #dc2626; 
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
          color: #dc2626; 
          font-size: 18px; 
          font-weight: bold; 
          margin: 0 0 15px 0;
          border-bottom: 2px solid #dc2626;
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
          color: #dc2626;
        }
        
        .urgent-box {
          background-color: #fef2f2;
          border: 2px solid #dc2626;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }
        
        .urgent-box h2 {
          color: #dc2626;
          font-size: 20px;
          margin: 0 0 10px 0;
        }
        
        .urgent-box p {
          color: #374151;
          font-size: 16px;
          margin: 0;
        }
        
        .button { 
          display: inline-block; 
          padding: 15px 30px; 
          background-color: #dc2626; 
          color: white; 
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
          <h1>🔔 แจ้งเตือนซ้ำ</h1>
          <p>StationaryHub - คำขอเบิกรอการอนุมัติ</p>
        </div>
        
        <div class="content">
          <div class="urgent-box">
            <h2>⚠️ คำขอเบิกรอการอนุมัติ</h2>
            <p>มีคำขอเบิกที่รอการอนุมัติจากคุณเป็นเวลา ${data.daysPending} วัน กรุณาตรวจสอบและดำเนินการ</p>
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
                <td>฿${data.totalAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td>วันที่ส่งคำขอ:</td>
                <td>${new Date(data.createdDate).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td>จำนวนวันที่รอ:</td>
                <td>${data.daysPending} วัน</td>
              </tr>
              <tr>
                <td>สถานะ:</td>
                <td>รอการอนุมัติ</td>
              </tr>
            </table>
          </div>
          
          <div class="section">
            <h3>รายการสินค้า</h3>
            <table class="info-table">
              ${data.items.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td>${item.quantity} ชิ้น × ฿${item.unitPrice.toFixed(2)}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/approvals" class="button">
              ตรวจสอบและอนุมัติคำขอ
            </a>
          </div>
          
          <div class="section">
            <h3>หมายเหตุ</h3>
            <p>นี่เป็นอีเมลแจ้งเตือนซ้ำที่ส่งทุกวันเวลา 10:00 น. จนกว่าคำขอจะได้รับการอนุมัติหรือปฏิเสธ</p>
            <p>หากคำขอได้รับการอนุมัติแล้ว กรุณาไม่สนใจอีเมลนี้</p>
          </div>
        </div>
        
        <div class="footer">
          <p>นี่เป็นอีเมลอัตโนมัติจากระบบ StationaryHub</p>
          <p>ส่งเมื่อ: ${currentDate} ${currentTime}</p>
          <p>หากมีคำถาม กรุณาติดต่อทีมสนับสนุน IT</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

