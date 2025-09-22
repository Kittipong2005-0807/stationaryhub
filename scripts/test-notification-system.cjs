// =====================================================
// ทดสอบระบบแจ้งเตือนจริง
// =====================================================

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNotificationSystem() {
  try {
    console.log('🔔 ทดสอบระบบแจ้งเตือนจริง...\n');

    // 1. หาผู้ใช้ทดสอบ
    console.log('🔍 หาผู้ใช้ทดสอบ...');
    const testUser = await prisma.uSERS.findFirst({
      where: {
        ROLE: 'USER'
      }
    });

    if (!testUser) {
      console.log('❌ ไม่พบผู้ใช้ทดสอบ');
      return;
    }

    console.log(`👤 ผู้ใช้ทดสอบ: ${testUser.USERNAME} (${testUser.USER_ID})`);

    // 2. หาสินค้าทดสอบ
    console.log('\n🔍 หาสินค้าทดสอบ...');
    const testProduct = await prisma.pRODUCTS.findFirst();

    if (!testProduct) {
      console.log('❌ ไม่พบสินค้าทดสอบ');
      return;
    }

    console.log(`📦 สินค้าทดสอบ: ${testProduct.PRODUCT_NAME} (${testProduct.PRODUCT_ID})`);

    // 3. สร้างคำขอเบิกทดสอบ
    console.log('\n📝 สร้างคำขอเบิกทดสอบ...');
    const testRequisition = await prisma.rEQUISITIONS.create({
      data: {
        USER_ID: testUser.USER_ID,
        STATUS: 'PENDING',
        TOTAL_AMOUNT: 100.00,
        SUBMITTED_AT: new Date()
      }
    });

    console.log(`✅ สร้างคำขอเบิกทดสอบสำเร็จ (ID: ${testRequisition.REQUISITION_ID})`);

    // 4. เพิ่มรายการสินค้า
    console.log('\n📦 เพิ่มรายการสินค้า...');
    const testItem = await prisma.rEQUISITION_ITEMS.create({
      data: {
        REQUISITION_ID: testRequisition.REQUISITION_ID,
        PRODUCT_ID: testProduct.PRODUCT_ID,
        QUANTITY: 1,
        UNIT_PRICE: 100.00,
        TOTAL_PRICE: 100.00
      }
    });

    console.log(`✅ เพิ่มรายการสินค้าสำเร็จ (ID: ${testItem.ITEM_ID})`);

    // 5. เรียกใช้ระบบแจ้งเตือน
    console.log('\n🔔 เรียกใช้ระบบแจ้งเตือน...');
    
    // ใช้การเรียกใช้ผ่าน API endpoint แทน
    try {
      const response = await fetch('http://localhost:3000/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requisitionId: testRequisition.REQUISITION_ID,
          userId: testUser.USER_ID
        })
      });
      
      if (response.ok) {
        console.log('✅ ระบบแจ้งเตือนทำงานสำเร็จ');
      } else {
        console.log('❌ ระบบแจ้งเตือนทำงานไม่สำเร็จ');
      }
    } catch (notificationError) {
      console.error('❌ เกิดข้อผิดพลาดในระบบแจ้งเตือน:', notificationError.message);
    }

    // 6. ตรวจสอบ EMAIL_LOGS
    console.log('\n📧 ตรวจสอบ EMAIL_LOGS...');
    const emailLogs = await prisma.eMAIL_LOGS.findMany({
      where: {
        TO_USER_ID: testUser.USER_ID,
        EMAIL_TYPE: {
          in: ['requisition_created', 'requisition_pending']
        }
      },
      orderBy: {
        SENT_AT: 'desc'
      },
      take: 5
    });

    console.log(`📋 พบ EMAIL_LOGS ${emailLogs.length} รายการ:`);
    emailLogs.forEach((log, index) => {
      console.log(`${index + 1}. ID: ${log.EMAIL_ID}`);
      console.log(`   TO_EMAIL: ${log.TO_EMAIL}`);
      console.log(`   SUBJECT: ${log.SUBJECT}`);
      console.log(`   STATUS: ${log.STATUS}`);
      console.log(`   EMAIL_TYPE: ${log.EMAIL_TYPE}`);
      console.log(`   SENT_AT: ${log.SENT_AT}`);
      console.log(`   ERROR_MESSAGE: ${log.ERROR_MESSAGE || 'ไม่มี'}`);
      console.log('   ---');
    });

    // 7. ลบข้อมูลทดสอบ
    console.log('\n🗑️ ลบข้อมูลทดสอบ...');
    await prisma.rEQUISITION_ITEMS.delete({
      where: { ITEM_ID: testItem.ITEM_ID }
    });
    await prisma.rEQUISITIONS.delete({
      where: { REQUISITION_ID: testRequisition.REQUISITION_ID }
    });
    console.log('✅ ลบข้อมูลทดสอบสำเร็จ');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotificationSystem();
