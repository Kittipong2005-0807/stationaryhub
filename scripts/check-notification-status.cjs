// =====================================================
// ตรวจสอบสถานะการแจ้งเตือนในฐานข้อมูล
// =====================================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkNotificationStatus() {
  try {
    console.log('🔍 ตรวจสอบสถานะการแจ้งเตือนในฐานข้อมูล...\n');

    // 1. ตรวจสอบการแจ้งเตือนสำหรับ Manager (kittipong)
    console.log('👑 ตรวจสอบการแจ้งเตือนสำหรับ Manager (kittipong)...');
    const managerNotifications = await prisma.eMAIL_LOGS.findMany({
      where: {
        TO_USER_ID: '9C154'
      },
      select: {
        EMAIL_ID: true,
        TO_USER_ID: true,
        SUBJECT: true,
        STATUS: true,
        SENT_AT: true
      },
      orderBy: {
        SENT_AT: 'desc'
      }
    });

    console.log(`📋 พบการแจ้งเตือน: ${managerNotifications.length} รายการ`);
    
    // แยกตามสถานะ
    const sentNotifications = managerNotifications.filter(n => n.STATUS === 'SENT');
    const readNotifications = managerNotifications.filter(n => n.STATUS === 'READ');
    
    console.log(`📤 สถานะ SENT: ${sentNotifications.length} รายการ`);
    console.log(`📖 สถานะ READ: ${readNotifications.length} รายการ`);

    // แสดงรายละเอียด
    if (sentNotifications.length > 0) {
      console.log('\n📤 การแจ้งเตือนที่มีสถานะ SENT:');
      sentNotifications.slice(0, 3).forEach((notification, index) => {
        console.log(`   ${index + 1}. ID: ${notification.EMAIL_ID} - ${notification.SUBJECT}`);
        console.log(`      สถานะ: ${notification.STATUS}`);
        console.log(`      เวลา: ${notification.SENT_AT}`);
        console.log('      ---');
      });
    }

    if (readNotifications.length > 0) {
      console.log('\n📖 การแจ้งเตือนที่มีสถานะ READ:');
      readNotifications.slice(0, 3).forEach((notification, index) => {
        console.log(`   ${index + 1}. ID: ${notification.EMAIL_ID} - ${notification.SUBJECT}`);
        console.log(`      สถานะ: ${notification.STATUS}`);
        console.log(`      เวลา: ${notification.SENT_AT}`);
        console.log('      ---');
      });
    }

    // 2. ตรวจสอบการแจ้งเตือนสำหรับ Admin (opas)
    console.log('\n👑 ตรวจสอบการแจ้งเตือนสำหรับ Admin (opas)...');
    const adminNotifications = await prisma.eMAIL_LOGS.findMany({
      where: {
        TO_USER_ID: '90423'
      },
      select: {
        EMAIL_ID: true,
        TO_USER_ID: true,
        SUBJECT: true,
        STATUS: true,
        SENT_AT: true
      },
      orderBy: {
        SENT_AT: 'desc'
      }
    });

    console.log(`📋 พบการแจ้งเตือน: ${adminNotifications.length} รายการ`);
    
    // แยกตามสถานะ
    const adminSentNotifications = adminNotifications.filter(n => n.STATUS === 'SENT');
    const adminReadNotifications = adminNotifications.filter(n => n.STATUS === 'READ');
    
    console.log(`📤 สถานะ SENT: ${adminSentNotifications.length} รายการ`);
    console.log(`📖 สถานะ READ: ${adminReadNotifications.length} รายการ`);

    // 3. สรุปสถานะทั้งหมด
    console.log('\n📊 สรุปสถานะการแจ้งเตือนทั้งหมด:');
    const allNotifications = await prisma.eMAIL_LOGS.findMany({
      select: {
        STATUS: true
      }
    });

    const totalSent = allNotifications.filter(n => n.STATUS === 'SENT').length;
    const totalRead = allNotifications.filter(n => n.STATUS === 'READ').length;
    const totalNotifications = allNotifications.length;

    console.log(`📤 สถานะ SENT ทั้งหมด: ${totalSent} รายการ`);
    console.log(`📖 สถานะ READ ทั้งหมด: ${totalRead} รายการ`);
    console.log(`📋 รวมทั้งหมด: ${totalNotifications} รายการ`);

    // 4. ตรวจสอบการอัปเดตสถานะ
    console.log('\n🔍 ตรวจสอบการอัปเดตสถานะ...');
    
    // ลองอัปเดตการแจ้งเตือนแรกของ Manager เป็น READ
    if (managerNotifications.length > 0) {
      const firstNotification = managerNotifications[0];
      console.log(`🔄 ลองอัปเดตการแจ้งเตือน ID: ${firstNotification.EMAIL_ID} เป็น READ...`);
      
      const updatedNotification = await prisma.eMAIL_LOGS.update({
        where: { EMAIL_ID: firstNotification.EMAIL_ID },
        data: { STATUS: 'READ' }
      });

      console.log(`✅ อัปเดตสำเร็จ: ID ${updatedNotification.EMAIL_ID} เป็น ${updatedNotification.STATUS}`);
      
      // ตรวจสอบอีกครั้ง
      const checkNotification = await prisma.eMAIL_LOGS.findUnique({
        where: { EMAIL_ID: firstNotification.EMAIL_ID }
      });
      
      console.log(`🔍 ตรวจสอบอีกครั้ง: ID ${checkNotification.EMAIL_ID} เป็น ${checkNotification.STATUS}`);
    }

    console.log('\n✅ การตรวจสอบเสร็จสิ้น!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// รันการตรวจสอบ
checkNotificationStatus();
