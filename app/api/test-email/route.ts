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

    const { to, subject, message } = await request.json();
    console.log("📧 Test email request:", { to, subject, message });

    if (!to || !subject) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ตรวจสอบการตั้งค่า SMTP
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('❌ SMTP credentials not configured!');
      return NextResponse.json({ 
        error: "SMTP not configured",
        message: "กรุณาตั้งค่า SMTP_USER และ SMTP_PASS ใน .env.local"
      }, { status: 500 });
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

    // สร้างเนื้อหาอีเมล HTML
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🧪 ทดสอบการส่งอีเมล</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">StationaryHub Email System</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">🎉 ยินดีด้วย!</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            การทดสอบการส่งอีเมลจากระบบ StationaryHub สำเร็จแล้ว!
          </p>
          
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
            <h3 style="color: #2e7d32; margin-top: 0;">📋 รายละเอียดการทดสอบ</h3>
            <ul style="color: #2e7d32; margin: 0; padding-left: 20px;">
              <li><strong>เวลา:</strong> ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</li>
              <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST || 'smtp.gmail.com'}</li>
              <li><strong>SMTP Port:</strong> ${process.env.SMTP_PORT || 587}</li>
              <li><strong>สถานะ:</strong> ✅ สำเร็จ</li>
            </ul>
          </div>
          
          <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
            <h3 style="color: #f57c00; margin-top: 0;">💬 ข้อความที่ส่ง</h3>
            <div style="color: #f57c00; margin: 0; padding: 15px; background: white; border-radius: 5px; border: 1px solid #ffcc02;">
              ${message ? message.replace(/\n/g, '<br>') : 'นี่เป็นข้อความทดสอบการส่งอีเมลจากระบบ StationaryHub'}
            </div>
          </div>
          
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
            <h3 style="color: #1976d2; margin-top: 0;">🔧 ฟีเจอร์ที่พร้อมใช้งาน</h3>
            <ul style="color: #1976d2; margin: 0; padding-left: 20px;">
              <li>📧 ส่งอีเมลแจ้งเตือนเมื่อสินค้ามาแล้ว</li>
              <li>🔔 ส่งอีเมลเมื่อสร้าง/อนุมัติ/ปฏิเสธ requisition</li>
              <li>📱 รองรับทั้ง In-App Notification และ Email</li>
              <li>🎨 อีเมลมีรูปแบบที่สวยงามและอ่านง่าย</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:3000/stationaryhub" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      display: inline-block;">
              🚀 เข้าสู่ระบบ StationaryHub
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 14px;">
          <p>นี่เป็นอีเมลทดสอบจากระบบ StationaryHub</p>
          <p>หากคุณได้รับอีเมลนี้ แสดงว่าระบบส่งอีเมลทำงานได้ปกติแล้ว! 🎉</p>
        </div>
      </div>
    `;

    // ส่งอีเมล
    const mailOptions = {
      from: process.env.SMTP_FROM || 'stationaryhub@ube.co.th',
      to: to,
      subject: subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Test email sent successfully!');
    console.log('  - Message ID:', result.messageId);
    console.log('  - Response:', result.response);
    console.log('  - To:', to);

    return NextResponse.json({
      success: true,
      message: "ส่งอีเมลทดสอบสำเร็จ",
      to: to,
      messageId: result.messageId,
      response: result.response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error sending test email:', error);
    
    return NextResponse.json({
      error: "Failed to send email",
      message: error instanceof Error ? error.message : "Unknown error",
      details: error
    }, { status: 500 });
  }
}
