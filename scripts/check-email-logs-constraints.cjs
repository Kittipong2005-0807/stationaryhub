// =====================================================
// ตรวจสอบ Check Constraint ในตาราง EMAIL_LOGS
// =====================================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkEmailLogsConstraints() {
  try {
    console.log('🔍 ตรวจสอบ Check Constraint ในตาราง EMAIL_LOGS...\n');

    // 1. ตรวจสอบข้อมูลในตาราง EMAIL_LOGS
    console.log('📊 ตรวจสอบข้อมูลในตาราง EMAIL_LOGS...');
    const allEmailLogs = await prisma.eMAIL_LOGS.findMany({
      select: {
        EMAIL_ID: true,
        TO_USER_ID: true,
        SUBJECT: true,
        STATUS: true,
        SENT_AT: true
      },
      orderBy: {
        EMAIL_ID: 'asc'
      }
    });

    console.log(`📋 จำนวนรายการทั้งหมด: ${allEmailLogs.length}`);

    // 2. ตรวจสอบค่า STATUS ที่มีอยู่
    console.log('\n🔍 ตรวจสอบค่า STATUS ที่มีอยู่...');
    const uniqueStatuses = [...new Set(allEmailLogs.map(email => email.STATUS))];
    console.log(`📝 ค่า STATUS ที่ไม่ซ้ำกัน: ${uniqueStatuses.join(', ')}`);

    // 3. นับจำนวนแต่ละ STATUS
    console.log('\n📊 นับจำนวนแต่ละ STATUS:');
    uniqueStatuses.forEach(status => {
      const count = allEmailLogs.filter(email => email.STATUS === status).length;
      console.log(`   ${status}: ${count} รายการ`);
    });

    // 4. ตรวจสอบโครงสร้างตาราง
    console.log('\n🏗️ ตรวจสอบโครงสร้างตาราง...');
    
    // ลองสร้างการแจ้งเตือนใหม่ด้วย STATUS ต่างๆ
    const testStatuses = ['SENT', 'READ', 'PENDING', 'DELIVERED'];
    
    for (const testStatus of testStatuses) {
      try {
        console.log(`🔄 ทดสอบสร้างการแจ้งเตือนด้วย STATUS: ${testStatus}...`);
        
        const testNotification = await prisma.eMAIL_LOGS.create({
          data: {
            TO_USER_ID: '9C154',
            SUBJECT: `Test Notification - ${testStatus}`,
            BODY: `This is a test notification with status: ${testStatus}`,
            STATUS: testStatus,
            SENT_AT: new Date()
          }
        });

        console.log(`✅ สร้างสำเร็จ: ID ${testNotification.EMAIL_ID} ด้วย STATUS: ${testNotification.STATUS}`);
        
        // ลบการทดสอบ
        await prisma.eMAIL_LOGS.delete({
          where: { EMAIL_ID: testNotification.EMAIL_ID }
        });
        console.log(`🗑️ ลบการทดสอบ: ID ${testNotification.EMAIL_ID}`);
        
      } catch (error) {
        console.log(`❌ ไม่สามารถสร้างด้วย STATUS: ${testStatus} - ${error.message}`);
      }
    }

    // 5. ตรวจสอบ Check Constraint
    console.log('\n🔒 ตรวจสอบ Check Constraint...');
    console.log('📝 จากผลการทดสอบข้างต้น:');
    
    const allowedStatuses = [];
    const disallowedStatuses = [];
    
    for (const testStatus of testStatuses) {
      try {
        await prisma.eMAIL_LOGS.create({
          data: {
            TO_USER_ID: '9C154',
            SUBJECT: `Test - ${testStatus}`,
            BODY: `Test body`,
            STATUS: testStatus,
            SENT_AT: new Date()
          }
        });
        
        allowedStatuses.push(testStatus);
        
        // ลบการทดสอบ
        await prisma.eMAIL_LOGS.delete({
          where: { 
            TO_USER_ID: '9C154',
            SUBJECT: `Test - ${testStatus}`
          }
        });
        
      } catch (error) {
        disallowedStatuses.push(testStatus);
      }
    }

    console.log(`✅ STATUS ที่อนุญาต: ${allowedStatuses.join(', ')}`);
    console.log(`❌ STATUS ที่ไม่อนุญาต: ${disallowedStatuses.join(', ')}`);

    // 6. แนะนำการแก้ไข
    console.log('\n💡 แนะนำการแก้ไข...');
    if (disallowedStatuses.includes('READ')) {
      console.log('⚠️  STATUS "READ" ไม่ได้รับอนุญาต');
      console.log('📝 วิธีแก้ไข:');
      console.log('   1. เปลี่ยน Check Constraint ในฐานข้อมูล');
      console.log('   2. หรือใช้ STATUS อื่นแทน เช่น "DELIVERED", "PROCESSED"');
      console.log('   3. หรือใช้ฟิลด์อื่นแทน เช่น "IS_READ" (boolean)');
    }

    console.log('\n✅ การตรวจสอบเสร็จสิ้น!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// รันการตรวจสอบ
checkEmailLogsConstraints();
