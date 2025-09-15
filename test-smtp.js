import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testSMTP() {
  console.log('🔧 SMTP Configuration Check:');
  console.log('  - SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com');
  console.log('  - SMTP_PORT:', process.env.SMTP_PORT || 587);
  console.log('  - SMTP_USER:', process.env.SMTP_USER ? '***configured***' : '❌ NOT CONFIGURED');
  console.log('  - SMTP_PASS:', process.env.SMTP_PASS ? '***configured***' : '❌ NOT CONFIGURED');
  console.log('  - SMTP_FROM:', process.env.SMTP_FROM || 'stationaryhub@ube.co.th');

  // ตรวจสอบว่ามีการตั้งค่า SMTP หรือไม่
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP credentials not configured!');
    console.error('❌ Please check your .env.local file for SMTP_USER and SMTP_PASS');
    return;
  }

  try {
    console.log('📧 Creating SMTP transporter...');
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

    // ทดสอบการเชื่อมต่อ SMTP
    console.log('🔌 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');

    // ทดสอบการส่งเมล
    console.log('📤 Sending test email...');
    const mailOptions = {
      from: process.env.SMTP_FROM || 'stationaryhub@ube.co.th',
      to: 'test@example.com',
      subject: 'ทดสอบการส่งเมลจาก StationaryHub',
      html: `
        <h2>🧪 ทดสอบการส่งเมล</h2>
        <p>นี่เป็นข้อความทดสอบการส่งเมลจากระบบ StationaryHub</p>
        <p>เวลาส่ง: ${new Date().toLocaleString('th-TH')}</p>
        <hr>
        <p><small>นี่เป็นอีเมลทดสอบจากระบบ StationaryHub</small></p>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('  - Message ID:', result.messageId);
    console.log('  - Response:', result.response);

    transporter.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('❌ Error code:', error.code);
    
    if (error.code === 'EAUTH') {
      console.error('🔧 Solution: Check your SMTP_USER and SMTP_PASS in .env.local');
      console.error('🔧 For Gmail, make sure you\'re using App Password, not regular password');
    } else if (error.code === 'ECONNECTION') {
      console.error('🔧 Solution: Check your SMTP_HOST and SMTP_PORT');
      console.error('🔧 Make sure your firewall allows outbound connections to port 587');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('🔧 Solution: Check your internet connection and SMTP server availability');
    }
  }
}

testSMTP();
