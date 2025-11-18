// =====================================================
// ทดสอบระบบการแจ้งเตือนผ่าน Prisma
// =====================================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNotifications() {
  try {
    console.log('🔔 เริ่มทดสอบระบบการแจ้งเตือน...');

    // 1. ตรวจสอบข้อมูลในตาราง EMAIL_LOGS
    const totalRecords = await prisma.eMAIL_LOGS.count();
    console.log('📊 จำนวนรายการทั้งหมดใน EMAIL_LOGS:', totalRecords);

    // 2. ตรวจสอบข้อมูลสำหรับ user kittipong
    const kittipongNotifications = await prisma.eMAIL_LOGS.findMany({
      where: {
        TO_USER_ID: 'kittipong'
      },
      orderBy: {
        SENT_AT: 'desc'
      }
    });

    console.log('👤 จำนวนการแจ้งเตือนสำหรับ kittipong:', kittipongNotifications.length);

    // 3. แสดงข้อมูลการแจ้งเตือน
    if (kittipongNotifications.length > 0) {
      console.log('📋 รายการการแจ้งเตือน:');
      kittipongNotifications.forEach((notification, index) => {
        console.log(`${index + 1}. ${notification.SUBJECT}`);
        console.log(`   ${notification.BODY}`);
        console.log(`   สถานะ: ${notification.STATUS}`);
        console.log(`   เวลา: ${notification.SENT_AT}`);
        console.log('---');
      });
    } else {
      console.log('❌ ไม่พบการแจ้งเตือนสำหรับ kittipong');
      
      // 4. เพิ่มข้อมูลทดสอบ
      console.log('➕ เพิ่มข้อมูลทดสอบ...');
      
      const testNotifications = [
        {
          TO_USER_ID: 'kittipong',
          SUBJECT: 'สินค้ามาแล้ว! 🎉',
          BODY: 'สินค้าที่คุณสั่งซื้อส่งครบเรียบร้อยแล้ว',
          STATUS: 'SENT',
          SENT_AT: new Date()
        },
        {
          TO_USER_ID: 'kittipong',
          SUBJECT: 'คำขอเบิกได้รับการอนุมัติ ✅',
          BODY: 'คำขอเบิกของคุณได้รับการอนุมัติแล้ว สามารถจัดเตรียมสินค้าได้',
          STATUS: 'SENT',
          SENT_AT: new Date(Date.now() - 30 * 60 * 1000) // 30 นาทีที่แล้ว
        },
        {
          TO_USER_ID: 'kittipong',
          SUBJECT: 'มีคำขอเบิกใหม่ 📦',
          BODY: 'มีคำขอเบิกใหม่จาก User อื่น กรุณาตรวจสอบและอนุมัติ',
          STATUS: 'SENT',
          SENT_AT: new Date(Date.now() - 60 * 60 * 1000) // 1 ชั่วโมงที่แล้ว
        }
      ];

      for (const notification of testNotifications) {
        await prisma.eMAIL_LOGS.create({
          data: notification
        });
        console.log(`✅ เพิ่ม: ${notification.SUBJECT}`);
      }

      // 5. ตรวจสอบข้อมูลหลังจากเพิ่ม
      const newNotifications = await prisma.eMAIL_LOGS.findMany({
        where: {
          TO_USER_ID: 'kittipong'
        },
        orderBy: {
          SENT_AT: 'desc'
        }
      });

      console.log('🎉 จำนวนการแจ้งเตือนหลังจากเพิ่ม:', newNotifications.length);
    }

    console.log('✅ การทดสอบเสร็จสิ้น!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// รันการทดสอบ
testNotifications();
