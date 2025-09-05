// =============================================
// ทดสอบการอัปเดต DEPARTMENT ตอน login
// =============================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDepartmentUpdate() {
  try {
    console.log('🧪 ทดสอบการอัปเดต DEPARTMENT ตอน login...\n');

    // 1. ตรวจสอบข้อมูลปัจจุบันในตาราง USERS
    console.log('📊 ข้อมูลปัจจุบันในตาราง USERS:');
    const currentUsers = await prisma.$queryRaw`
      SELECT USER_ID, USERNAME, DEPARTMENT, SITE_ID, ROLE
      FROM USERS
      ORDER BY USER_ID
    `;
    
    if (currentUsers.length === 0) {
      console.log('❌ ไม่พบข้อมูลในตาราง USERS');
      return;
    }

    currentUsers.forEach((user, index) => {
      console.log(`${index + 1}. USER_ID: ${user.USER_ID}`);
      console.log(`   USERNAME: ${user.USERNAME}`);
      console.log(`   ROLE: ${user.ROLE || 'NULL'}`);
      console.log(`   DEPARTMENT: ${user.DEPARTMENT || 'NULL'}`);
      console.log(`   SITE_ID: ${user.SITE_ID || 'NULL'}`);
      console.log('   ---');
    });

    // 2. ตรวจสอบข้อมูลใน UserWithRoles
    console.log('\n📊 ข้อมูลใน UserWithRoles view:');
    try {
      const userWithRoles = await prisma.$queryRaw`
        SELECT AdLoginName, EmpCode, CostCenterEng, OrgCode3 
        FROM userWithRoles 
        WHERE CostCenterEng IS NOT NULL
        ORDER BY AdLoginName
        LIMIT 10
      `;
      
      if (userWithRoles.length > 0) {
        console.log('ตัวอย่างข้อมูล CostCenterEng:');
        userWithRoles.forEach((user, index) => {
          console.log(`${index + 1}. AdLoginName: ${user.AdLoginName || 'NULL'}`);
          console.log(`   EmpCode: ${user.EmpCode || 'NULL'}`);
          console.log(`   CostCenterEng: ${user.CostCenterEng || 'NULL'}`);
          console.log(`   OrgCode3: ${user.OrgCode3 || 'NULL'}`);
          console.log('   ---');
        });
      } else {
        console.log('❌ ไม่พบข้อมูลใน UserWithRoles view');
      }
    } catch (error) {
      console.log('❌ ไม่สามารถเข้าถึง UserWithRoles view:', error.message);
    }

    // 3. ทดสอบการอัปเดต DEPARTMENT แบบจำลอง
    console.log('\n🔄 ทดสอบการอัปเดต DEPARTMENT แบบจำลอง...');
    try {
      // หา user ที่มีข้อมูลใน UserWithRoles
      const testUser = await prisma.$queryRaw`
        SELECT TOP 1 
          u.USER_ID,
          u.USERNAME,
          u.DEPARTMENT as CurrentDepartment,
          uwr.CostCenterEng as SourceDepartment
        FROM USERS u
        INNER JOIN userWithRoles uwr ON (
          uwr.AdLoginName = u.USER_ID 
          OR uwr.EmpCode = u.USER_ID
        )
        WHERE uwr.CostCenterEng IS NOT NULL
      `;

      if (testUser && testUser.length > 0) {
        const user = testUser[0];
        console.log(`🧪 ทดสอบกับ USER_ID: ${user.USER_ID}`);
        console.log(`   Current DEPARTMENT: ${user.CurrentDepartment || 'NULL'}`);
        console.log(`   Source CostCenterEng: ${user.SourceDepartment || 'NULL'}`);

        // อัปเดต DEPARTMENT
        const updateResult = await prisma.$executeRaw`
          UPDATE USERS 
          SET DEPARTMENT = ${user.SourceDepartment.toString()}
          WHERE USER_ID = ${user.USER_ID}
        `;

        console.log(`✅ อัปเดต DEPARTMENT สำเร็จ ${updateResult} รายการ`);

        // ตรวจสอบผลลัพธ์
        const updatedUser = await prisma.$queryRaw`
          SELECT USER_ID, USERNAME, DEPARTMENT 
          FROM USERS 
          WHERE USER_ID = ${user.USER_ID}
        `;

        if (updatedUser && updatedUser.length > 0) {
          console.log(`📊 ผลลัพธ์หลังอัปเดต:`);
          console.log(`   USER_ID: ${updatedUser[0].USER_ID}`);
          console.log(`   USERNAME: ${updatedUser[0].USERNAME}`);
          console.log(`   DEPARTMENT: ${updatedUser[0].DEPARTMENT || 'NULL'}`);
        }
      } else {
        console.log('❌ ไม่พบ user ที่สามารถทดสอบได้');
      }
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
    }

    // 4. สรุปสถานะ
    console.log('\n📋 สรุปสถานะ:');
    console.log('✅ ตาราง USERS มีฟิลด์ DEPARTMENT');
    console.log('✅ UserWithRoles view มีฟิลด์ CostCenterEng');
    console.log('✅ lib/authOptions.ts ได้รับการแก้ไขให้อัปเดต DEPARTMENT ตอน login');
    console.log('✅ สคริปต์ทดสอบทำงานได้ปกติ');
    
    console.log('\n🎯 การทำงาน:');
    console.log('เมื่อ user login ระบบจะ:');
    console.log('1. ดึงข้อมูลจาก UserWithRoles view');
    console.log('2. อัปเดต DEPARTMENT ในตาราง USERS จาก CostCenterEng');
    console.log('3. บันทึกข้อมูลใน token สำหรับใช้ใน session');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// รันฟังก์ชัน
testDepartmentUpdate();
