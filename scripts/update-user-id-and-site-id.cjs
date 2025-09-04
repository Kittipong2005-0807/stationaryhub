// =============================================
// อัปเดต USER_ID ให้เก็บ EmpCode และ SITE_ID ให้เก็บ OrgCode3
// =============================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUserIdAndSiteId() {
  try {
    console.log('🔄 เริ่มอัปเดต USER_ID และ SITE_ID...\n');

    // 1. ตรวจสอบข้อมูลปัจจุบัน
    console.log('📊 ข้อมูลปัจจุบันในตาราง USERS:');
    const currentUsers = await prisma.$queryRaw`
      SELECT USER_ID, USERNAME, DEPARTMENT, SITE_ID 
      FROM USERS
    `;
    
    currentUsers.forEach(user => {
      console.log(`  - USER_ID: ${user.USER_ID}`);
      console.log(`    USERNAME: ${user.USERNAME}`);
      console.log(`    DEPARTMENT: ${user.DEPARTMENT || 'NULL'}`);
      console.log(`    SITE_ID: ${user.SITE_ID || 'NULL'}`);
      console.log('  ---');
    });

    // 2. ตรวจสอบข้อมูลใน UserWithRoles
    console.log('\n📊 ข้อมูลใน UserWithRoles view:');
    const userWithRoles = await prisma.$queryRaw`
      SELECT AdLoginName, EmpCode, CostCenterEng, OrgCode3 
      FROM userWithRoles 
      WHERE AdLoginName = 'kittipong' OR EmpCode = 'kittipong'
    `;
    
    if (userWithRoles.length > 0) {
      userWithRoles.forEach(user => {
        console.log(`  - AdLoginName: ${user.AdLoginName || 'NULL'}`);
        console.log(`    EmpCode: ${user.EmpCode || 'NULL'}`);
        console.log(`    CostCenterEng: ${user.CostCenterEng || 'NULL'}`);
        console.log(`    OrgCode3: ${user.OrgCode3 || 'NULL'}`);
        console.log('  ---');
      });
    }

    // 3. อัปเดต USER_ID และ SITE_ID
    console.log('\n🔄 กำลังอัปเดต USER_ID และ SITE_ID...');
    const updateResult = await prisma.$executeRaw`
      UPDATE USERS 
      SET 
        USER_ID = (
            SELECT TOP 1 EmpCode 
            FROM userWithRoles 
            WHERE userWithRoles.AdLoginName = USERS.USER_ID
               OR userWithRoles.EmpCode = USERS.USER_ID
        ),
        SITE_ID = (
            SELECT TOP 1 OrgCode3 
            FROM userWithRoles 
            WHERE userWithRoles.AdLoginName = USERS.USER_ID
               OR userWithRoles.EmpCode = USERS.USER_ID
        )
      WHERE EXISTS (
          SELECT 1 
          FROM userWithRoles 
          WHERE userWithRoles.AdLoginName = USERS.USER_ID
             OR userWithRoles.EmpCode = USERS.USER_ID
      )
    `;

    console.log(`✅ อัปเดตสำเร็จ ${updateResult} รายการ`);

    // 4. ตรวจสอบผลลัพธ์หลังอัปเดต
    console.log('\n📊 ข้อมูลหลังอัปเดตในตาราง USERS:');
    const updatedUsers = await prisma.$queryRaw`
      SELECT USER_ID, USERNAME, DEPARTMENT, SITE_ID 
      FROM USERS
    `;
    
    updatedUsers.forEach(user => {
      console.log(`  - USER_ID: ${user.USER_ID}`);
      console.log(`    USERNAME: ${user.USERNAME}`);
      console.log(`    DEPARTMENT: ${user.DEPARTMENT || 'NULL'}`);
      console.log(`    SITE_ID: ${user.SITE_ID || 'NULL'}`);
      console.log('  ---');
    });

    console.log('\n🎉 อัปเดต USER_ID และ SITE_ID เสร็จสิ้น!');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// รันฟังก์ชัน
updateUserIdAndSiteId();
