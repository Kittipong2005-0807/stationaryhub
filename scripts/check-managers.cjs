// =====================================================
// ตรวจสอบ Manager ในระบบ
// =====================================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkManagers() {
  try {
    console.log('🔍 ตรวจสอบ Manager ในระบบ...\n');

    // 1. ตรวจสอบ Users ทั้งหมด
    console.log('👥 ตรวจสอบ Users ทั้งหมด...');
    const allUsers = await prisma.uSERS.findMany({
      select: {
        USER_ID: true,
        USERNAME: true,
        ROLE: true,
        DEPARTMENT: true,
        SITE_ID: true
      },
      orderBy: {
        USER_ID: 'asc'
      }
    });

    console.log(`📊 จำนวน Users ทั้งหมด: ${allUsers.length}`);
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.USER_ID}, Username: ${user.USERNAME}, Role: ${user.ROLE}, Department: ${user.DEPARTMENT}, Site: ${user.SITE_ID}`);
    });

    // 2. ตรวจสอบ Manager โดยเฉพาะ
    console.log('\n👑 ตรวจสอบ Manager...');
    const managers = allUsers.filter(user => 
      user.ROLE && user.ROLE.toUpperCase().includes('MANAGER')
    );

    if (managers.length > 0) {
      console.log(`✅ พบ Manager: ${managers.length} คน`);
      managers.forEach((manager, index) => {
        console.log(`${index + 1}. ${manager.USERNAME} (ID: ${manager.USER_ID}) - ${manager.ROLE}`);
      });
    } else {
      console.log('❌ ไม่พบ Manager ในระบบ');
      
      // ตรวจสอบ Roles ที่มีอยู่
      const uniqueRoles = [...new Set(allUsers.map(user => user.ROLE))];
      console.log('🔍 Roles ที่มีอยู่ในระบบ:', uniqueRoles.join(', '));
    }

    // 3. ตรวจสอบการแจ้งเตือนสำหรับ Manager
    console.log('\n🔔 ตรวจสอบการแจ้งเตือนสำหรับ Manager...');
    if (managers.length > 0) {
      for (const manager of managers) {
        const managerNotifications = await prisma.eMAIL_LOGS.findMany({
          where: {
            TO_USER_ID: manager.USER_ID
          },
          orderBy: {
            SENT_AT: 'desc'
          }
        });

        console.log(`📋 ${manager.USERNAME} (${manager.USER_ID}): ${managerNotifications.length} รายการ`);
        
        if (managerNotifications.length > 0) {
          managerNotifications.slice(0, 3).forEach((notification, index) => {
            console.log(`   ${index + 1}. ${notification.SUBJECT}`);
            console.log(`      สถานะ: ${notification.STATUS}`);
            console.log(`      เวลา: ${notification.SENT_AT}`);
            console.log('      ---');
          });
        }
      }
    }

    // 4. แนะนำการสร้างการแจ้งเตือนสำหรับ Manager
    console.log('\n💡 แนะนำการสร้างการแจ้งเตือนสำหรับ Manager...');
    if (managers.length > 0) {
      console.log('✅ Manager พร้อมรับการแจ้งเตือนแล้ว');
      console.log('📝 ตัวอย่างการแจ้งเตือนที่ควรมี:');
      console.log('   - คำขอเบิกใหม่จาก User');
      console.log('   - คำขอเบิกที่รอการอนุมัติ');
      console.log('   - สถิติการเบิกสินค้า');
    } else {
      console.log('⚠️  ต้องสร้าง Manager ก่อน');
      console.log('📝 วิธีสร้าง Manager:');
      console.log('   1. เพิ่ม User ใหม่ในตาราง USERS');
      console.log('   2. ตั้งค่า ROLE = "MANAGER"');
      console.log('   3. ตั้งค่า DEPARTMENT และ SITE_ID');
    }

    console.log('\n✅ การตรวจสอบเสร็จสิ้น!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// รันการตรวจสอบ
checkManagers();
