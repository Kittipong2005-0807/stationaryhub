import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to, subject, message, emailType = 'test' } = await request.json();
    // แสดง Log เฉพาะใน development
    if (process.env.NODE_ENV !== 'production') {
      console.log("📧 Test email request:", { to, subject, message, emailType });
    }

    if (!to || !subject) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ตรวจสอบการตั้งค่า SMTP
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      // แสดง Log เฉพาะใน development
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ SMTP credentials not configured!');
      }
      
      return NextResponse.json({ 
        error: "SMTP not configured",
        message: "กรุณาตั้งค่า SMTP_USER และ SMTP_PASS ใน .env.local"
      }, { status: 500 });
    }

    // สร้างเนื้อหาอีเมล HTML ตามประเภท
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();

    // สร้าง HTML content ตาม emailType
    let htmlContent = '';
    
    if (emailType === 'approval') {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">✅ คำขอเบิกได้รับการอนุมัติ</h1>
          </div>
          <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; line-height: 1.6; color: #333;">สวัสดีครับ/ค่ะ</p>
            <p style="font-size: 16px; line-height: 1.6; color: #333;">คำขอเบิกของคุณได้รับการอนุมัติแล้ว</p>
            <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #2c5aa0;">รายละเอียด:</p>
              <p style="margin: 5px 0; color: #333;">${message}</p>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">ส่งเมื่อ: ${currentDate} เวลา ${currentTime}</p>
            <p style="font-size: 14px; color: #666;">ระบบ Stationary Hub</p>
          </div>
        </div>
      `;
    } else if (emailType === 'rejection') {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">❌ คำขอเบิกถูกปฏิเสธ</h1>
          </div>
          <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; line-height: 1.6; color: #333;">สวัสดีครับ/ค่ะ</p>
            <p style="font-size: 16px; line-height: 1.6; color: #333;">ขออภัย คำขอเบิกของคุณถูกปฏิเสธ</p>
            <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #e65100;">เหตุผล:</p>
              <p style="margin: 5px 0; color: #333;">${message}</p>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">ส่งเมื่อ: ${currentDate} เวลา ${currentTime}</p>
            <p style="font-size: 14px; color: #666;">ระบบ Stationary Hub</p>
          </div>
        </div>
      `;
    } else {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">📧 ทดสอบระบบอีเมล</h1>
          </div>
          <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; line-height: 1.6; color: #333;">สวัสดีครับ/ค่ะ</p>
            <p style="font-size: 16px; line-height: 1.6; color: #333;">นี่คืออีเมลทดสอบจากระบบ Stationary Hub</p>
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #1976d2;">ข้อความ:</p>
              <p style="margin: 5px 0; color: #333;">${message}</p>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">ส่งเมื่อ: ${currentDate} เวลา ${currentTime}</p>
            <p style="font-size: 14px; color: #666;">ระบบ Stationary Hub</p>
          </div>
        </div>
      `;
    }

    // ==========================================
    // 📧 EMAIL SENDING ENABLED - SEND REAL EMAILS
    // ==========================================
    // แสดง Log เฉพาะใน development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 ===== EMAIL SENDING ENABLED - SENDING REAL EMAILS =====')
      console.log('📧 Sending test email with the following details:')
      console.log('  - To:', to)
      console.log('  - Subject:', subject)
      console.log('  - Email Type:', emailType)
      console.log('  - From:', process.env.SMTP_FROM || 'stationaryhub@ube.co.th')
      console.log('  - HTML Length:', htmlContent.length, 'characters')
      console.log('  - Timestamp:', new Date().toISOString())
      console.log('📧 ===== EMAIL SENDING IN PROGRESS =====')
    }
    
    // สร้าง transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    // ทดสอบการเชื่อมต่อ
    await transporter.verify();
    
    // แสดง Log เฉพาะใน development
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ SMTP connection verified successfully');
    }

    if (emailType === 'test') {
      htmlContent = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>การทดสอบระบบส่งอีเมล - StationaryHub</title>
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
          
          .features-list {
            margin-top: 15px;
          }
          
          .features-list ul {
            margin: 0;
            padding-left: 25px;
          }
          
          .features-list li {
            margin-bottom: 8px;
            font-size: 15px;
          }
          
          .contact-info {
            margin-top: 15px;
          }
          
          .contact-info ul {
            margin: 0;
            padding-left: 25px;
          }
          
          .contact-info li {
            margin-bottom: 5px;
            font-size: 15px;
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
          
          /* Desktop Layout - Full Width */
          @media only screen and (min-width: 1024px) {
            .email-container {
              width: 100%;
              max-width: none;
            }
            
            .content {
              padding: 50px 60px;
            }
            
            .section {
              padding: 25px;
              margin-bottom: 35px;
            }
            
            .section h3 {
              font-size: 20px;
            }
            
            .info-table td {
              font-size: 16px;
              padding: 10px 0;
            }
            
            .info-table td:first-child {
              width: 250px;
            }
            
            .message-box {
              font-size: 16px;
              padding: 25px;
            }
            
            .button {
              padding: 18px 35px;
              font-size: 18px;
            }
            
            .features-list li,
            .contact-info li {
              font-size: 16px;
            }
          }
          
          /* Tablet Layout */
          @media only screen and (min-width: 768px) and (max-width: 1023px) {
            .email-container {
              width: 100%;
            }
            
            .content {
              padding: 35px 45px;
            }
            
            .section {
              padding: 20px;
              margin-bottom: 25px;
            }
            
            .info-table td:first-child {
              width: 180px;
            }
          }
          
          /* Mobile Layout */
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
            
            .features-list li,
            .contact-info li {
              font-size: 14px;
            }
            
            .footer {
              padding: 20px 15px;
            }
          }
          
          /* Very Small Mobile */
          @media only screen and (max-width: 480px) {
            .header {
              padding: 15px 10px;
            }
            
            .header h1 {
              font-size: 18px;
            }
            
            .content {
              padding: 20px 10px;
            }
            
            .section {
              padding: 12px;
            }
            
            .info-table td:first-child {
              width: 100px;
              font-size: 12px;
            }
            
            .info-table td {
              font-size: 13px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>การทดสอบระบบส่งอีเมล</h1>
            <p>StationaryHub - ระบบจัดการวัสดุสำนักงาน</p>
          </div>
          
          <div class="content">
            <div class="section">
              <h3>สถานะการทดสอบ</h3>
              <p>ระบบส่งอีเมลของ StationaryHub ทำงานได้ปกติแล้ว นี่เป็นการทดสอบระบบส่งอีเมลแจ้งเตือนเพื่อยืนยันการทำงานของระบบ</p>
            </div>
            
            <div class="section">
              <h3>รายละเอียดการทดสอบ</h3>
              <table class="info-table">
                <tr>
                  <td>เลขที่การทดสอบ:</td>
                  <td>#TEST-${Date.now().toString().slice(-6)}</td>
                </tr>
                <tr>
                  <td>ผู้รับการทดสอบ:</td>
                  <td>${to}</td>
                </tr>
                <tr>
                  <td>วันที่ทดสอบ:</td>
                  <td>${currentDate} ${currentTime}</td>
                </tr>
                <tr>
                  <td>สถานะระบบ:</td>
                  <td>ทำงานปกติ</td>
                </tr>
                <tr>
                  <td>เซิร์ฟเวอร์ SMTP:</td>
                  <td>${process.env.SMTP_HOST || 'smtp.gmail.com'}</td>
                </tr>
              </table>
            </div>
            
            <div class="section">
              <h3>ข้อความการทดสอบ</h3>
              <div class="message-box">${message ? message.replace(/\n/g, '\n') : 'นี่เป็นข้อความทดสอบการส่งอีเมลจากระบบ StationaryHub เพื่อยืนยันว่าระบบส่งอีเมลทำงานได้ปกติ'}</div>
            </div>
            
            <div class="section">
              <h3>ฟีเจอร์ระบบที่พร้อมใช้งาน</h3>
              <div class="features-list">
                <ul>
                  <li>การแจ้งเตือนสินค้า - แจ้งเตือนเมื่อสินค้ามาถึงสถานที่</li>
                  <li>การอนุมัติคำขอ - แจ้งเตือนการอนุมัติหรือปฏิเสธคำขอเบิกวัสดุ</li>
                  <li>การแจ้งเตือนในระบบ - การแจ้งเตือนภายในแอปพลิเคชัน</li>
                  <li>อีเมล HTML - รูปแบบอีเมลที่เป็นทางการ</li>
                </ul>
              </div>
            </div>
            
            <div class="section">
              <h3>ข้อมูลติดต่อ</h3>
              <div class="contact-info">
                <p>หากท่านมีข้อสงสัยหรือต้องการความช่วยเหลือ กรุณาติดต่อ:</p>
                <ul>
                  <li>แผนกจัดซื้อ: 02-XXX-XXXX</li>
                  <li>อีเมล: purchasing@company.com</li>
                  <li>ทีมสนับสนุน IT: IT Support Team</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>นี่เป็นอีเมลทดสอบจากระบบ StationaryHub</p>
            <p>หากท่านมีข้อสงสัยหรือต้องการความช่วยเหลือ กรุณาติดต่อทีมสนับสนุน IT</p>
          </div>
        </div>
      </body>
      </html>
    `;
    } else {
      // ใช้รูปแบบอีเมลจริงๆ สำหรับประเภทอื่น
      const { NotificationService } = await import('@/lib/notification-service');
      
      // สร้างข้อมูลจำลองสำหรับการทดสอบ
      const mockData = {
        requisitionId: parseInt(Date.now().toString().slice(-6)),
        totalAmount: 1500.00,
        approvedBy: 'ผู้จัดการแผนก',
        rejectedBy: 'ผู้จัดการแผนก',
        reason: 'งบประมาณไม่เพียงพอ',
        userId: 'test-user',
        requesterName: 'ผู้ใช้งานทดสอบ',
        adminName: 'ผู้ดูแลระบบ',
        message: message || 'นี่เป็นข้อความทดสอบจากระบบ StationaryHub'
      };

      // สร้าง HTML content ตามประเภท
      switch (emailType) {
        case 'requisition_created':
          htmlContent = createRequisitionCreatedTemplate(mockData);
          break;
        case 'requisition_approved':
          htmlContent = createRequisitionApprovedTemplate(mockData);
          break;
        case 'requisition_rejected':
          htmlContent = createRequisitionRejectedTemplate(mockData);
          break;
        case 'requisition_pending':
          htmlContent = createRequisitionPendingTemplate(mockData);
          break;
        case 'product_arrival':
          htmlContent = NotificationService.createArrivalEmailTemplate(mockData);
          break;
        default:
          htmlContent = createRequisitionCreatedTemplate(mockData);
      }
    }

    // ส่งอีเมล
    const mailOptions = {
      from: process.env.SMTP_FROM || 'stationaryhub@ube.co.th',
      to: to,
      subject: subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    
    // แสดง Log เฉพาะใน development
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Test email sent successfully!');
      console.log('  - Message ID:', result.messageId);
      console.log('  - Response:', result.response);
      console.log('  - To:', to);
    }

    return NextResponse.json({
      success: true,
      message: "ส่งอีเมลทดสอบสำเร็จ",
      to: to,
      messageId: result.messageId,
      response: result.response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // แสดง Log เฉพาะใน development
    if (process.env.NODE_ENV !== 'production') {
      console.error('❌ Error sending test email:', error);
    }
    
    return NextResponse.json({
      error: "Failed to send email",
      message: error instanceof Error ? error.message : "Unknown error",
      details: error
    }, { status: 500 });
  }
}

// Helper functions to create email templates
function createRequisitionCreatedTemplate(data: any): string {
  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ยืนยันการส่งคำขอเบิก - StationaryHub</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
        .email-container { width: 100%; background-color: #ffffff; border: 1px solid #ddd; }
        .header { background-color: #2c3e50; color: white; padding: 30px 40px; text-align: center; }
        .header h1 { font-size: 24px; font-weight: bold; margin: 0; }
        .header p { font-size: 16px; margin: 8px 0 0 0; }
        .content { padding: 40px; background-color: #ffffff; }
        .section { margin-bottom: 30px; padding: 20px; border: 1px solid #e0e0e0; background-color: #fafafa; }
        .section h3 { color: #2c3e50; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 2px solid #2c3e50; padding-bottom: 8px; }
        .info-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .info-table td { padding: 8px 0; border-bottom: 1px solid #e0e0e0; font-size: 15px; }
        .info-table td:first-child { font-weight: bold; width: 200px; color: #2c3e50; }
        .footer { margin-top: 30px; padding: 30px 40px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; font-size: 14px; color: #666; text-align: center; }
        .footer p { margin: 8px 0; }
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
            <h3>ยืนยันการส่งคำขอเบิก</h3>
            <p>คำขอเบิกของคุณได้รับการส่งเรียบร้อยแล้ว</p>
            <table class="info-table">
              <tr><td>เลขที่คำขอ:</td><td>${data.requisitionId}</td></tr>
              <tr><td>จำนวนเงิน:</td><td>฿${data.totalAmount?.toFixed(2)}</td></tr>
              <tr><td>สถานะ:</td><td>รอการอนุมัติ</td></tr>
            </table>
            <p>ระบบจะแจ้งเตือนเมื่อคำขอของคุณได้รับการอนุมัติหรือปฏิเสธ</p>
          </div>
        </div>
        <div class="footer">
          <p>นี่เป็นอีเมลอัตโนมัติจากระบบ StationaryHub</p>
          <p>หากมีคำถาม กรุณาติดต่อทีมสนับสนุน IT</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function createRequisitionApprovedTemplate(data: any): string {
  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>คำขอเบิกได้รับการอนุมัติ - StationaryHub</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
        .email-container { width: 100%; background-color: #ffffff; border: 1px solid #ddd; }
        .header { background-color: #2c3e50; color: white; padding: 30px 40px; text-align: center; }
        .header h1 { font-size: 24px; font-weight: bold; margin: 0; }
        .header p { font-size: 16px; margin: 8px 0 0 0; }
        .content { padding: 40px; background-color: #ffffff; }
        .section { margin-bottom: 30px; padding: 20px; border: 1px solid #e0e0e0; background-color: #fafafa; }
        .section h3 { color: #2c3e50; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 2px solid #2c3e50; padding-bottom: 8px; }
        .info-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .info-table td { padding: 8px 0; border-bottom: 1px solid #e0e0e0; font-size: 15px; }
        .info-table td:first-child { font-weight: bold; width: 200px; color: #2c3e50; }
        .footer { margin-top: 30px; padding: 30px 40px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; font-size: 14px; color: #666; text-align: center; }
        .footer p { margin: 8px 0; }
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
            <h3>คำขอเบิกได้รับการอนุมัติ</h3>
            <p>คำขอเบิกของคุณได้รับการอนุมัติแล้ว</p>
            <table class="info-table">
              <tr><td>เลขที่คำขอ:</td><td>${data.requisitionId}</td></tr>
              <tr><td>อนุมัติโดย:</td><td>${data.approvedBy}</td></tr>
              <tr><td>สถานะ:</td><td>อนุมัติแล้ว</td></tr>
            </table>
            <p>คุณสามารถติดตามสถานะได้ในระบบ</p>
          </div>
        </div>
        <div class="footer">
          <p>นี่เป็นอีเมลอัตโนมัติจากระบบ StationaryHub</p>
          <p>หากมีคำถาม กรุณาติดต่อทีมสนับสนุน IT</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function createRequisitionRejectedTemplate(data: any): string {
  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>คำขอเบิกถูกปฏิเสธ - StationaryHub</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
        .email-container { width: 100%; background-color: #ffffff; border: 1px solid #ddd; }
        .header { background-color: #2c3e50; color: white; padding: 30px 40px; text-align: center; }
        .header h1 { font-size: 24px; font-weight: bold; margin: 0; }
        .header p { font-size: 16px; margin: 8px 0 0 0; }
        .content { padding: 40px; background-color: #ffffff; }
        .section { margin-bottom: 30px; padding: 20px; border: 1px solid #e0e0e0; background-color: #fafafa; }
        .section h3 { color: #2c3e50; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 2px solid #2c3e50; padding-bottom: 8px; }
        .info-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .info-table td { padding: 8px 0; border-bottom: 1px solid #e0e0e0; font-size: 15px; }
        .info-table td:first-child { font-weight: bold; width: 200px; color: #2c3e50; }
        .footer { margin-top: 30px; padding: 30px 40px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; font-size: 14px; color: #666; text-align: center; }
        .footer p { margin: 8px 0; }
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
            <h3>คำขอเบิกถูกปฏิเสธ</h3>
            <p>คำขอเบิกของคุณถูกปฏิเสธ</p>
            <table class="info-table">
              <tr><td>เลขที่คำขอ:</td><td>${data.requisitionId}</td></tr>
              <tr><td>ปฏิเสธโดย:</td><td>${data.rejectedBy}</td></tr>
              <tr><td>สถานะ:</td><td>ปฏิเสธ</td></tr>
              <tr><td>เหตุผล:</td><td>${data.reason}</td></tr>
            </table>
            <p>หากมีคำถาม กรุณาติดต่อผู้จัดการ</p>
          </div>
        </div>
        <div class="footer">
          <p>นี่เป็นอีเมลอัตโนมัติจากระบบ StationaryHub</p>
          <p>หากมีคำถาม กรุณาติดต่อทีมสนับสนุน IT</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function createRequisitionPendingTemplate(data: any): string {
  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>มีคำขอเบิกใหม่รอการอนุมัติ - StationaryHub</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
        .email-container { width: 100%; background-color: #ffffff; border: 1px solid #ddd; }
        .header { background-color: #2c3e50; color: white; padding: 30px 40px; text-align: center; }
        .header h1 { font-size: 24px; font-weight: bold; margin: 0; }
        .header p { font-size: 16px; margin: 8px 0 0 0; }
        .content { padding: 40px; background-color: #ffffff; }
        .section { margin-bottom: 30px; padding: 20px; border: 1px solid #e0e0e0; background-color: #fafafa; }
        .section h3 { color: #2c3e50; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 2px solid #2c3e50; padding-bottom: 8px; }
        .info-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .info-table td { padding: 8px 0; border-bottom: 1px solid #e0e0e0; font-size: 15px; }
        .info-table td:first-child { font-weight: bold; width: 200px; color: #2c3e50; }
        .button { display: inline-block; padding: 15px 30px; background-color: #2c3e50; color: #ffffff; text-decoration: none; border: none; font-size: 16px; text-align: center; margin: 20px 0; }
        .footer { margin-top: 30px; padding: 30px 40px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; font-size: 14px; color: #666; text-align: center; }
        .footer p { margin: 8px 0; }
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
            <h3>มีคำขอเบิกใหม่รอการอนุมัติ</h3>
            <p>มีคำขอเบิกใหม่ที่รอการอนุมัติจากคุณ</p>
            <table class="info-table">
              <tr><td>เลขที่คำขอ:</td><td>${data.requisitionId}</td></tr>
              <tr><td>จากผู้ใช้:</td><td>${data.userId}</td></tr>
              <tr><td>สถานะ:</td><td>รอการอนุมัติ</td></tr>
            </table>
            <p>กรุณาเข้าสู่ระบบเพื่อตรวจสอบและดำเนินการ</p>
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/approvals" class="button">ดูคำขอเบิก</a>
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
  `;
}
