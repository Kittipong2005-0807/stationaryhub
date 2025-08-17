// =====================================================
// ทดสอบ API notifications โดยตรง
// =====================================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAPI() {
  try {
    console.log('🔍 ทดสอบ API notifications...\n');

    // 1. ทดสอบการค้นหาด้วย USER_ID = '9C154'
    console.log('🔔 ทดสอบการค้นหาด้วย USER_ID = 9C154...');
    const notifications9C154 = await prisma.$queryRaw`
      SELECT 
        EMAIL_ID as id,
        TO_USER_ID as userId,
        SUBJECT as subject,
        BODY as body,
        STATUS as status,
        SENT_AT as sentAt
      FROM EMAIL_LOGS 
      WHERE TO_USER_ID = '9C154'
      ORDER BY SENT_AT DESC
    `;

    console.log(`📋 พบการแจ้งเตือน: ${notifications9C154.length} รายการ`);
    
    if (notifications9C154.length > 0) {
      console.log('📝 รายการการแจ้งเตือน:');
      notifications9C154.slice(0, 3).forEach((notification, index) => {
        console.log(`   ${index + 1}. ${notification.subject}`);
        console.log(`      สถานะ: ${notification.status}`);
        console.log(`      เวลา: ${notification.sentAt}`);
        console.log(`      TO_USER_ID: ${notification.userId}`);
        console.log('      ---');
      });
    }

    // 2. ทดสอบการค้นหาด้วย username = 'kittipong'
    console.log('\n🔔 ทดสอบการค้นหาด้วย username = kittipong...');
    const notificationsKittipong = await prisma.$queryRaw`
      SELECT 
        EMAIL_ID as id,
        TO_USER_ID as userId,
        SUBJECT as subject,
        BODY as body,
        STATUS as status,
        SENT_AT as sentAt
      FROM EMAIL_LOGS 
      WHERE TO_USER_ID = 'kittipong'
      ORDER BY SENT_AT DESC
    `;

    console.log(`📋 พบการแจ้งเตือน: ${notificationsKittipong.length} รายการ`);

    // 3. ทดสอบการค้นหาด้วย username = 'kittipong' แต่ใช้ USER_ID = '9C154'
    console.log('\n🔔 ทดสอบการค้นหาด้วย username = kittipong แต่ใช้ USER_ID = 9C154...');
    const notificationsFixed = await prisma.$queryRaw`
      SELECT 
        EMAIL_ID as id,
        TO_USER_ID as userId,
        SUBJECT as subject,
        BODY as body,
        STATUS as status,
        SENT_AT as sentAt
      FROM EMAIL_LOGS 
      WHERE TO_USER_ID = '9C154'
      ORDER BY SENT_AT DESC
    `;

    console.log(`📋 พบการแจ้งเตือน: ${notificationsFixed.length} รายการ`);

    // 4. แสดงข้อมูลที่ API จะส่งกลับ
    console.log('\n📤 ข้อมูลที่ API จะส่งกลับ:');
    console.log(JSON.stringify({
      success: true,
      notifications: notificationsFixed.slice(0, 3) // แสดงแค่ 3 รายการแรก
    }, null, 2));

    console.log('\n✅ การทดสอบเสร็จสิ้น!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// รันการทดสอบ
testAPI();
