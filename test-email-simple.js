import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testEmail() {
  console.log('🧪 ===== ทดสอบการส่งอีเมล =====\n');
  
  // ตรวจสอบการตั้งค่า
  console.log('🔧 การตั้งค่า SMTP:');
  console.log(`  📧 Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
  console.log(`  🔌 Port: ${process.env.SMTP_PORT || 587}`);
  console.log(`  👤 User: ${process.env.SMTP_USER ? '***configured***' : '❌ NOT CONFIGURED'}`);
  console.log(`  🔑 Pass: ${process.env.SMTP_PASS ? '***configured***' : '❌ NOT CONFIGURED'}`);
  console.log(`  📤 From: ${process.env.SMTP_FROM || 'stationaryhub@ube.co.th'}\n`);

  // ตรวจสอบว่ามีการตั้งค่าครบหรือไม่
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ การตั้งค่า SMTP ไม่ครบถ้วน!');
    console.error('❌ กรุณาตรวจสอบไฟล์ .env.local');
    console.error('❌ ต้องมี SMTP_USER และ SMTP_PASS');
    return;
  }

  try {
    // สร้าง transporter
    console.log('📧 กำลังสร้าง SMTP transporter...');
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
    console.log('🔌 กำลังทดสอบการเชื่อมต่อ SMTP...');
    await transporter.verify();
    console.log('✅ การเชื่อมต่อ SMTP สำเร็จ!\n');

    // ข้อมูลอีเมลทดสอบ - กรอกอีเมลของคุณที่นี่
    const testEmail = 'your-email@domain.com'; // ⚠️ กรุณาเปลี่ยนเป็นอีเมลจริงของคุณ
    const currentTime = new Date().toLocaleString();

    console.log(`📤 กำลังส่งอีเมลทดสอบไปยัง: ${testEmail}`);
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'stationaryhub@ube.co.th',
      to: testEmail,
      subject: '🧪 ทดสอบการส่งอีเมลจาก StationaryHub',
      html: `
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
                <li><strong>เวลา:</strong> ${currentTime}</li>
                <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST || 'smtp.gmail.com'}</li>
                <li><strong>SMTP Port:</strong> ${process.env.SMTP_PORT || 587}</li>
                <li><strong>สถานะ:</strong> ✅ สำเร็จ</li>
              </ul>
            </div>
            
            <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
              <h3 style="color: #f57c00; margin-top: 0;">🔧 ฟีเจอร์ที่พร้อมใช้งาน</h3>
              <ul style="color: #f57c00; margin: 0; padding-left: 20px;">
                <li>📧 ส่งอีเมลแจ้งเตือนเมื่อสินค้ามาแล้ว</li>
                <li>🔔 ส่งอีเมลเมื่อสร้าง/อนุมัติ/ปฏิเสธ requisition</li>
                <li>📱 รองรับทั้ง In-App Notification และ Email</li>
                <li>🎨 อีเมลมีรูปแบบที่สวยงามและอ่านง่าย</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="http://localhost:3001/stationaryhub" 
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
      `
    };

    // ส่งอีเมล
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ ส่งอีเมลสำเร็จ!');
    console.log(`  📧 Message ID: ${result.messageId}`);
    console.log(`  📨 Response: ${result.response}`);
    console.log(`  📤 To: ${testEmail}`);
    console.log(`  ⏰ Time: ${currentTime}\n`);
    
    console.log('🎉 การทดสอบสำเร็จ! ระบบส่งอีเมลทำงานได้ปกติ');
    console.log('💡 หากต้องการทดสอบด้วยอีเมลจริง ให้แก้ไขตัวแปร testEmail ในไฟล์นี้');
    
    transporter.close();
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    console.error('❌ Error code:', error.code);
    
    if (error.code === 'EAUTH') {
      console.error('\n🔧 วิธีแก้ไข:');
      console.error('  - ตรวจสอบ SMTP_USER และ SMTP_PASS ใน .env.local');
      console.error('  - สำหรับ Gmail ต้องใช้ App Password ไม่ใช่รหัสผ่านปกติ');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n🔧 วิธีแก้ไข:');
      console.error('  - ตรวจสอบ SMTP_HOST และ SMTP_PORT');
      console.error('  - ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
      console.error('  - ตรวจสอบ Firewall อนุญาต port 587 หรือไม่');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n🔧 วิธีแก้ไข:');
      console.error('  - ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
      console.error('  - ตรวจสอบความพร้อมใช้งานของ SMTP server');
    }
  }
}

// รันการทดสอบ
testEmail();
