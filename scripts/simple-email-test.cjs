// =====================================================
// ทดสอบการส่งอีเมลแบบง่าย
// =====================================================

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

async function simpleEmailTest() {
  try {
    console.log('📧 ทดสอบการส่งอีเมลแบบง่าย...\n');

    // 1. ตรวจสอบการตั้งค่า SMTP
    console.log('🔧 ตรวจสอบการตั้งค่า SMTP:');
    console.log(`   SMTP_HOST: ${process.env.SMTP_HOST}`);
    console.log(`   SMTP_PORT: ${process.env.SMTP_PORT}`);
    console.log(`   SMTP_USER: ${process.env.SMTP_USER ? '***configured***' : '❌ NOT CONFIGURED'}`);
    console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '***configured***' : '❌ NOT CONFIGURED'}`);
    console.log(`   SMTP_FROM: ${process.env.SMTP_FROM}`);

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('❌ SMTP credentials not configured!');
      return;
    }

    // 2. สร้าง SMTP transporter
    console.log('\n📧 สร้าง SMTP transporter...');
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

    // 3. ทดสอบการเชื่อมต่อ SMTP
    console.log('🔌 ทดสอบการเชื่อมต่อ SMTP...');
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('❌ SMTP connection verification failed:', verifyError.message);
      return;
    }

    // 4. หาอีเมลทดสอบจากฐานข้อมูล
    console.log('\n🔍 หาอีเมลทดสอบจากฐานข้อมูล...');
    const testUser = await prisma.uSERS.findFirst();

    if (!testUser || !testUser.EMAIL) {
      console.log('❌ ไม่พบผู้ใช้ที่มีอีเมลในฐานข้อมูล');
      return;
    }

    console.log(`📧 จะส่งอีเมลทดสอบไปยัง: ${testUser.EMAIL}`);

    // 5. สร้างอีเมลทดสอบ
    const testEmailHtml = `
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
            <h2>ทดสอบการส่งอีเมล</h2>
            <p>นี่เป็นอีเมลทดสอบจากระบบ StationaryHub</p>
            <p><strong>เวลาส่ง:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>ผู้รับ:</strong> ${testUser.USERNAME} (${testUser.EMAIL})</p>
          </div>
          <div class="footer">
            <p>นี่เป็นอีเมลทดสอบจากระบบ Stationary Hub</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 6. ส่งอีเมลทดสอบ
    console.log('📤 ส่งอีเมลทดสอบ...');
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: testUser.EMAIL,
      subject: '🧪 ทดสอบการส่งอีเมล - StationaryHub',
      html: testEmailHtml,
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ อีเมลทดสอบส่งสำเร็จ!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Response: ${result.response}`);
    console.log(`   To: ${testUser.EMAIL}`);

    // 7. บันทึกลงฐานข้อมูล
    console.log('\n📝 บันทึกลงฐานข้อมูล EMAIL_LOGS...');
    const emailLog = await prisma.eMAIL_LOGS.create({
      data: {
        TO_USER_ID: testUser.USER_ID,
        SUBJECT: '🧪 ทดสอบการส่งอีเมล - StationaryHub',
        BODY: 'นี่เป็นอีเมลทดสอบจากระบบ StationaryHub',
        STATUS: 'SENT',
        SENT_AT: new Date(),
        IS_READ: false,
        FROM_EMAIL: process.env.SMTP_FROM,
        TO_EMAIL: testUser.EMAIL,
        EMAIL_TYPE: 'test',
        PRIORITY: 'low',
        DELIVERY_STATUS: 'sent',
        RETRY_COUNT: 0,
        CREATED_BY: 'system',
        MESSAGE_ID: result.messageId
      }
    });

    console.log(`✅ บันทึก EMAIL_LOGS สำเร็จ (ID: ${emailLog.EMAIL_ID})`);

    // ปิดการเชื่อมต่อ SMTP
    transporter.close();

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simpleEmailTest();
