// =====================================================
// สร้าง Admin โดยเปลี่ยน Role ของ User ที่มีอยู่
// =====================================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('👑 สร้าง Admin ในระบบ...\n');

    // 1. ตรวจสอบ Users ที่มีอยู่
    console.log('👥 ตรวจสอบ Users ที่มีอยู่...');
    const allUsers = await prisma.uSERS.findMany({
      select: {
        USER_ID: true,
        USERNAME: true,
        ROLE: true,
        DEPARTMENT: true,
        SITE_ID: true
      }
    });

    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.USER_ID}, Username: ${user.USERNAME}, Role: ${user.ROLE}, Department: ${user.DEPARTMENT}, Site: ${user.SITE_ID}`);
    });

    // 2. เลือก User ที่จะเปลี่ยนเป็น Admin
    // เลือก Opas Sookdoang (USER) เป็น Admin เพราะ Kittipong เป็น MANAGER แล้ว
    const targetUser = allUsers.find(user => user.USERNAME === 'Opas Sookdoang');
    
    if (!targetUser) {
      console.log('❌ ไม่พบ User ที่จะเปลี่ยนเป็น Admin');
      return;
    }

    console.log(`\n🎯 เลือก User: ${targetUser.USERNAME} (ID: ${targetUser.USER_ID}) เป็น Admin`);

    // 3. เปลี่ยน Role เป็น ADMIN
    console.log('\n🔄 เปลี่ยน Role เป็น ADMIN...');
    
    const updatedUser = await prisma.uSERS.update({
      where: {
        USER_ID: targetUser.USER_ID
      },
      data: {
        ROLE: 'ADMIN'
      }
    });

    console.log(`✅ เปลี่ยน Role ของ ${updatedUser.USERNAME} เป็น ${updatedUser.ROLE} เรียบร้อย`);

    // 4. ตรวจสอบ Users หลังจากอัปเดต
    console.log('\n📊 ตรวจสอบ Users หลังจากอัปเดต...');
    const updatedUsers = await prisma.uSERS.findMany({
      select: {
        USER_ID: true,
        USERNAME: true,
        ROLE: true,
        DEPARTMENT: true,
        SITE_ID: true
      }
    });

    updatedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.USER_ID}, Username: ${user.USERNAME}, Role: ${user.ROLE}, Department: ${user.DEPARTMENT}, Site: ${user.SITE_ID}`);
    });

    // 5. สร้างการแจ้งเตือนสำหรับ Admin
    console.log('\n🔔 สร้างการแจ้งเตือนสำหรับ Admin...');
    
    const adminNotifications = [
      {
        TO_USER_ID: targetUser.USER_ID,
        SUBJECT: 'ยินดีต้อนรับสู่ระบบ Admin! 👑',
        BODY: 'คุณได้รับการแต่งตั้งเป็น Admin แล้ว สามารถจัดการระบบได้ทั้งหมด',
        STATUS: 'SENT',
        SENT_AT: new Date()
      },
      {
        TO_USER_ID: targetUser.USER_ID,
        SUBJECT: 'คำขอเบิกที่ได้รับการอนุมัติแล้ว ✅',
        BODY: 'มีคำขอเบิก 5 รายการที่ได้รับการอนุมัติแล้ว รอการจัดเตรียมสินค้า',
        STATUS: 'SENT',
        SENT_AT: new Date(Date.now() - 15 * 60 * 1000) // 15 นาทีที่แล้ว
      },
      {
        TO_USER_ID: targetUser.USER_ID,
        SUBJECT: 'สินค้าที่จัดเตรียมเสร็จแล้ว 📦',
        BODY: 'มีสินค้า 3 รายการที่จัดเตรียมเสร็จแล้ว พร้อมส่งมอบให้ User',
        STATUS: 'SENT',
        SENT_AT: new Date(Date.now() - 45 * 60 * 1000) // 45 นาทีที่แล้ว
      },
      {
        TO_USER_ID: targetUser.USER_ID,
        SUBJECT: 'สถิติการเบิกสินค้าทั้งหมด 📊',
        BODY: 'เดือนนี้มีคำขอเบิกสินค้าทั้งหมด 25 รายการ อนุมัติแล้ว 20 รายการ รอการอนุมัติ 3 รายการ จัดเตรียมแล้ว 2 รายการ',
        STATUS: 'SENT',
        SENT_AT: new Date(Date.now() - 75 * 60 * 1000) // 1.25 ชั่วโมงที่แล้ว
      },
      {
        TO_USER_ID: targetUser.USER_ID,
        SUBJECT: 'รายงานการเบิกสินค้าประจำเดือน 📈',
        BODY: 'เดือนนี้มีมูลค่าการเบิกสินค้าทั้งหมด 150,000 บาท สินค้าที่นิยม: กระดาษ, ปากกา, แฟ้ม',
        STATUS: 'SENT',
        SENT_AT: new Date(Date.now() - 105 * 60 * 1000) // 1.75 ชั่วโมงที่แล้ว
      }
    ];

    console.log('➕ สร้างการแจ้งเตือนใหม่...');
    
    for (const notification of adminNotifications) {
      await prisma.eMAIL_LOGS.create({
        data: notification
      });
      console.log(`✅ สร้าง: ${notification.SUBJECT}`);
    }

    // 6. ตรวจสอบการแจ้งเตือนสำหรับ Admin
    const totalAdminNotifications = await prisma.eMAIL_LOGS.findMany({
      where: {
        TO_USER_ID: targetUser.USER_ID
      }
    });

    console.log(`\n🎉 การแจ้งเตือนสำหรับ Admin: ${totalAdminNotifications.length} รายการ`);
    console.log('📝 รายการการแจ้งเตือนล่าสุด:');
    
    totalAdminNotifications.slice(0, 5).forEach((notification, index) => {
      console.log(`${index + 1}. ${notification.SUBJECT}`);
      console.log(`   สถานะ: ${notification.STATUS}`);
      console.log(`   เวลา: ${notification.SENT_AT}`);
      console.log('   ---');
    });

    console.log('\n✅ สร้าง Admin และการแจ้งเตือนเสร็จสิ้น!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// รันการสร้าง Admin
createAdmin();
