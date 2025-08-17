// =====================================================
// ตรวจสอบข้อมูลการแจ้งเตือนในฐานข้อมูล
// =====================================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugNotifications() {
  try {
    console.log('🔍 เริ่มตรวจสอบระบบการแจ้งเตือน...\n');

    // 1. ตรวจสอบการเชื่อมต่อฐานข้อมูล
    console.log('📊 ตรวจสอบการเชื่อมต่อฐานข้อมูล...');
    const totalEmailLogs = await prisma.eMAIL_LOGS.count();
    const totalUsers = await prisma.uSERS.count();
    console.log(`✅ EMAIL_LOGS: ${totalEmailLogs} รายการ`);
    console.log(`✅ USERS: ${totalUsers} รายการ\n`);

    // 2. ตรวจสอบข้อมูล user kittipong
    console.log('👤 ตรวจสอบข้อมูล user kittipong...');
    const kittipongUser = await prisma.uSERS.findFirst({
      where: {
        USERNAME: {
          contains: 'kitt'
        }
      }
    });

    if (kittipongUser) {
      console.log(`✅ พบ user: ${kittipongUser.USERNAME} (ID: ${kittipongUser.USER_ID})`);
    } else {
      console.log('❌ ไม่พบ user ที่มีชื่อใกล้เคียง kittipong');
    }

    // 3. ตรวจสอบการแจ้งเตือนสำหรับ USER_ID = '9C154'
    console.log('\n🔔 ตรวจสอบการแจ้งเตือนสำหรับ USER_ID = 9C154...');
    const notifications9C154 = await prisma.eMAIL_LOGS.findMany({
      where: {
        TO_USER_ID: '9C154'
      },
      orderBy: {
        SENT_AT: 'desc'
      }
    });

    console.log(`📋 พบการแจ้งเตือน: ${notifications9C154.length} รายการ`);
    
    if (notifications9C154.length > 0) {
      console.log('📝 รายการการแจ้งเตือน:');
      notifications9C154.slice(0, 5).forEach((notification, index) => {
        console.log(`   ${index + 1}. ${notification.SUBJECT}`);
        console.log(`      สถานะ: ${notification.STATUS}`);
        console.log(`      เวลา: ${notification.SENT_AT}`);
        console.log(`      TO_USER_ID: ${notification.TO_USER_ID}`);
        console.log('      ---');
      });
      
      if (notifications9C154.length > 5) {
        console.log(`   ... และอีก ${notifications9C154.length - 5} รายการ`);
      }
    }

    // 4. ตรวจสอบการแจ้งเตือนสำหรับ username = 'kittipong'
    console.log('\n🔔 ตรวจสอบการแจ้งเตือนสำหรับ username = kittipong...');
    const notificationsKittipong = await prisma.eMAIL_LOGS.findMany({
      where: {
        TO_USER_ID: 'kittipong'
      },
      orderBy: {
        SENT_AT: 'desc'
      }
    });

    console.log(`📋 พบการแจ้งเตือน: ${notificationsKittipong.length} รายการ`);

    // 5. ตรวจสอบ TO_USER_ID ทั้งหมดใน EMAIL_LOGS
    console.log('\n🔍 ตรวจสอบ TO_USER_ID ทั้งหมดใน EMAIL_LOGS...');
    const allEmailLogs = await prisma.eMAIL_LOGS.findMany({
      select: {
        TO_USER_ID: true
      }
    });

    const uniqueToUserIds = [...new Set(allEmailLogs.map(email => email.TO_USER_ID))];
    console.log(`📝 TO_USER_ID ที่ไม่ซ้ำกัน: ${uniqueToUserIds.join(', ')}`);

    // 6. ตรวจสอบความสัมพันธ์ระหว่าง USERS และ EMAIL_LOGS
    console.log('\n🔗 ตรวจสอบความสัมพันธ์ระหว่างตาราง...');
    for (const toUserId of uniqueToUserIds) {
      const user = await prisma.uSERS.findFirst({
        where: {
          USER_ID: toUserId
        }
      });

      if (user) {
        console.log(`✅ ${toUserId} -> พบใน USERS (Username: ${user.USERNAME})`);
      } else {
        console.log(`❌ ${toUserId} -> ไม่พบใน USERS`);
      }
    }

    console.log('\n✅ การตรวจสอบเสร็จสิ้น!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// รันการตรวจสอบ
debugNotifications();
