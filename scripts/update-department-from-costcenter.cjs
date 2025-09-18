// =============================================
// อัปเดต DEPARTMENT ในตาราง USERS จาก CostCenterEng ของ UserWithRoles
// =============================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateDepartmentFromCostCenter() {
  try {
    console.log('🔄 เริ่มอัปเดต DEPARTMENT จาก CostCenterEng...\n');

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
      WHERE CostCenterEng IS NOT NULL
      LIMIT 10
    `;
    
    if (userWithRoles.length > 0) {
      console.log('ตัวอย่างข้อมูล CostCenterEng:');
      userWithRoles.forEach(user => {
        console.log(`  - AdLoginName: ${user.AdLoginName || 'NULL'}`);
        console.log(`    EmpCode: ${user.EmpCode || 'NULL'}`);
        console.log(`    CostCenterEng: ${user.CostCenterEng || 'NULL'}`);
        console.log(`    OrgCode3: ${user.OrgCode3 || 'NULL'}`);
        console.log('  ---');
      });
    }

    // 3. อัปเดต DEPARTMENT จาก CostCenterEng
    console.log('\n🔄 กำลังอัปเดต DEPARTMENT จาก CostCenterEng...');
    const updateResult = await prisma.$executeRaw`
      UPDATE USERS 
      SET DEPARTMENT = (
          SELECT TOP 1 CostCenterEng 
          FROM userWithRoles 
          WHERE userWithRoles.AdLoginName = USERS.USER_ID
             OR userWithRoles.EmpCode = USERS.USER_ID
      )
      WHERE EXISTS (
          SELECT 1 
          FROM userWithRoles 
          WHERE (userWithRoles.AdLoginName = USERS.USER_ID
             OR userWithRoles.EmpCode = USERS.USER_ID)
            AND userWithRoles.CostCenterEng IS NOT NULL
      )
    `;

    console.log(`✅ อัปเดต DEPARTMENT สำเร็จ ${updateResult} รายการ`);

    // 4. ตรวจสอบผลลัพธ์หลังอัปเดต
    console.log('\n📊 ข้อมูลหลังอัปเดตในตาราง USERS:');
    const updatedUsers = await prisma.$queryRaw`
      SELECT USER_ID, USERNAME, DEPARTMENT, SITE_ID 
      FROM USERS
      WHERE DEPARTMENT IS NOT NULL
    `;
    
    updatedUsers.forEach(user => {
      console.log(`  - USER_ID: ${user.USER_ID}`);
      console.log(`    USERNAME: ${user.USERNAME}`);
      console.log(`    DEPARTMENT: ${user.DEPARTMENT || 'NULL'}`);
      console.log(`    SITE_ID: ${user.SITE_ID || 'NULL'}`);
      console.log('  ---');
    });

    // 5. สถิติการอัปเดต
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as TotalUsers,
        COUNT(DEPARTMENT) as UsersWithDepartment,
        COUNT(*) - COUNT(DEPARTMENT) as UsersWithoutDepartment
      FROM USERS
    `;

    console.log('\n📈 สถิติการอัปเดต:');
    console.log(`  - จำนวนผู้ใช้ทั้งหมด: ${stats[0].TotalUsers}`);
    console.log(`  - ผู้ใช้ที่มี DEPARTMENT: ${stats[0].UsersWithDepartment}`);
    console.log(`  - ผู้ใช้ที่ไม่มี DEPARTMENT: ${stats[0].UsersWithoutDepartment}`);

    console.log('\n🎉 อัปเดต DEPARTMENT จาก CostCenterEng เสร็จสิ้น!');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// รันฟังก์ชัน
updateDepartmentFromCostCenter();











