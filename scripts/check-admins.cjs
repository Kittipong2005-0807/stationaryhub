// =====================================================
// ตรวจสอบ Admin ในระบบ
// =====================================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdmins() {
  try {
    console.log('🔍 ตรวจสอบ Admin ในระบบ...\n');

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

    // 2. ตรวจสอบ Admin โดยเฉพาะ
    console.log('\n👑 ตรวจสอบ Admin...');
    const admins = allUsers.filter(user => 
      user.ROLE && user.ROLE.toUpperCase().includes('ADMIN')
    );

    if (admins.length > 0) {
      console.log(`✅ พบ Admin: ${admins.length} คน`);
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.USERNAME} (ID: ${admin.USER_ID}) - ${admin.ROLE}`);
      });
    } else {
      console.log('❌ ไม่พบ Admin ในระบบ');
      
      // ตรวจสอบ Roles ที่มีอยู่
      const uniqueRoles = [...new Set(allUsers.map(user => user.ROLE))];
      console.log('🔍 Roles ที่มีอยู่ในระบบ:', uniqueRoles.join(', '));
    }

    // 3. ตรวจสอบการแจ้งเตือนสำหรับ Admin
    console.log('\n🔔 ตรวจสอบการแจ้งเตือนสำหรับ Admin...');
    if (admins.length > 0) {
      for (const admin of admins) {
        const adminNotifications = await prisma.eMAIL_LOGS.findMany({
          where: {
            TO_USER_ID: admin.USER_ID
          },
          orderBy: {
            SENT_AT: 'desc'
          }
        });

        console.log(`📋 ${admin.USERNAME} (${admin.USER_ID}): ${adminNotifications.length} รายการ`);
        
        if (adminNotifications.length > 0) {
          adminNotifications.slice(0, 3).forEach((notification, index) => {
            console.log(`   ${index + 1}. ${notification.SUBJECT}`);
            console.log(`      สถานะ: ${notification.STATUS}`);
            console.log(`      เวลา: ${notification.SENT_AT}`);
            console.log('      ---');
          });
        }
      }
    }

    // 4. แนะนำการสร้าง Admin
    console.log('\n💡 แนะนำการสร้าง Admin...');
    if (admins.length > 0) {
      console.log('✅ Admin พร้อมรับการแจ้งเตือนแล้ว');
      console.log('📝 ตัวอย่างการแจ้งเตือนที่ควรมี:');
      console.log('   - คำขอเบิกที่ได้รับการอนุมัติแล้ว');
      console.log('   - สินค้าที่จัดเตรียมเสร็จแล้ว');
      console.log('   - สถิติการเบิกสินค้าทั้งหมด');
      console.log('   - รายงานการเบิกสินค้าประจำเดือน');
    } else {
      console.log('⚠️  ต้องสร้าง Admin ก่อน');
      console.log('📝 วิธีสร้าง Admin:');
      console.log('   1. เพิ่ม User ใหม่ในตาราง USERS');
      console.log('   2. ตั้งค่า ROLE = "ADMIN"');
      console.log('   3. ตั้งค่า DEPARTMENT และ SITE_ID');
      console.log('   4. หรือเปลี่ยน Role ของ User ที่มีอยู่เป็น "ADMIN"');
    }

    console.log('\n✅ การตรวจสอบเสร็จสิ้น!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// รันการตรวจสอบ
checkAdmins();
