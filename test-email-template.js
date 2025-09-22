import { NotificationService } from './lib/notification-service.js';

async function testEmailTemplate() {
  try {
    console.log('🧪 ทดสอบการส่งอีเมล template ใหม่...');
    
    // ทดสอบส่งอีเมล template
    await NotificationService.sendTestEmail(
      'test@example.com',
      'ทดสอบ Email Template ใหม่',
      'นี่คือการทดสอบ email template ที่ปรับปรุงแล้ว'
    );
    
    console.log('✅ การทดสอบเสร็จสิ้น');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

testEmailTemplate();

