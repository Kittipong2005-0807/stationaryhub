// =====================================================
// ตรวจสอบโครงสร้างตาราง EMAIL_LOGS
// =====================================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkEmailLogs() {
  try {
    console.log('📧 ตรวจสอบโครงสร้างตาราง EMAIL_LOGS...');

    // 1. ตรวจสอบข้อมูลในตาราง EMAIL_LOGS
    const totalRecords = await prisma.eMAIL_LOGS.count();
    console.log('📊 จำนวนรายการทั้งหมดใน EMAIL_LOGS:', totalRecords);

    // 2. แสดงข้อมูล EMAIL_LOGS ทั้งหมด
    const allEmailLogs = await prisma.eMAIL_LOGS.findMany({
      orderBy: {
        SENT_AT: 'desc'
      }
    });

    console.log('📋 รายการ EMAIL_LOGS:');
    allEmailLogs.forEach((email, index) => {
      console.log(`${index + 1}. ID: ${email.EMAIL_ID}, TO_USER_ID: ${email.TO_USER_ID}, SUBJECT: ${email.SUBJECT}, STATUS: ${email.STATUS}`);
    });

    // 3. ตรวจสอบ Foreign Key constraint
    console.log('\n🔗 ตรวจสอบ Foreign Key constraint...');
    
    // ลองหาว่า TO_USER_ID ใน EMAIL_LOGS ตรงกับ USERNAME ใน USERS หรือไม่
    const uniqueToUserIds = [...new Set(allEmailLogs.map(email => email.TO_USER_ID))];
    console.log('📝 TO_USER_ID ที่ไม่ซ้ำกัน:', uniqueToUserIds);

    for (const toUserId of uniqueToUserIds) {
      const user = await prisma.uSERS.findFirst({
        where: {
          USERNAME: toUserId
        }
      });

      if (user) {
        console.log(`✅ ${toUserId} -> พบในตาราง USERS (ID: ${user.USER_ID})`);
      } else {
        console.log(`❌ ${toUserId} -> ไม่พบในตาราง USERS`);
      }
    }

    // 4. ตรวจสอบว่า TO_USER_ID ใน EMAIL_LOGS ใช้ USER_ID หรือ USERNAME
    console.log('\n🔍 ตรวจสอบความสัมพันธ์ระหว่างตาราง...');
    
    // ลองหาว่า TO_USER_ID ใน EMAIL_LOGS ตรงกับ USER_ID ใน USERS หรือไม่
    for (const toUserId of uniqueToUserIds) {
      // ลองแปลงเป็นตัวเลข
      const numericUserId = parseInt(toUserId);
      if (!isNaN(numericUserId)) {
        const user = await prisma.uSERS.findFirst({
          where: {
            USER_ID: numericUserId
          }
        });

        if (user) {
          console.log(`✅ ${toUserId} (numeric) -> พบในตาราง USERS (Username: ${user.USERNAME})`);
        } else {
          console.log(`❌ ${toUserId} (numeric) -> ไม่พบในตาราง USERS`);
        }
      }
    }

    console.log('✅ การตรวจสอบเสร็จสิ้น!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// รันการตรวจสอบ
checkEmailLogs();
