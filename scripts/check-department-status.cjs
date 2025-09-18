// =============================================
// ตรวจสอบสถานะ DEPARTMENT ในตาราง USERS
// =============================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDepartmentStatus() {
  try {
    console.log('🔍 ตรวจสอบสถานะ DEPARTMENT ในตาราง USERS...\n');

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

    // 2. สถิติ DEPARTMENT
    const departmentStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as TotalUsers,
        COUNT(DEPARTMENT) as UsersWithDepartment,
        COUNT(*) - COUNT(DEPARTMENT) as UsersWithoutDepartment
      FROM USERS
    `;

    console.log('\n📈 สถิติ DEPARTMENT:');
    console.log(`  - จำนวนผู้ใช้ทั้งหมด: ${departmentStats[0].TotalUsers}`);
    console.log(`  - ผู้ใช้ที่มี DEPARTMENT: ${departmentStats[0].UsersWithDepartment}`);
    console.log(`  - ผู้ใช้ที่ไม่มี DEPARTMENT: ${departmentStats[0].UsersWithoutDepartment}`);

    // 3. ตรวจสอบข้อมูลใน UserWithRoles
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

    // 4. ตรวจสอบการเชื่อมโยงข้อมูล
    console.log('\n🔗 ตรวจสอบการเชื่อมโยงข้อมูล:');
    try {
      const linkedData = await prisma.$queryRaw`
        SELECT 
          u.USER_ID,
          u.USERNAME,
          u.DEPARTMENT as CurrentDepartment,
          uwr.CostCenterEng as SourceDepartment
        FROM USERS u
        LEFT JOIN userWithRoles uwr ON (
          uwr.AdLoginName = u.USER_ID 
          OR uwr.EmpCode = u.USER_ID
        )
        WHERE uwr.CostCenterEng IS NOT NULL
        ORDER BY u.USER_ID
      `;

      if (linkedData.length > 0) {
        console.log('ข้อมูลที่สามารถเชื่อมโยงได้:');
        linkedData.forEach((item, index) => {
          console.log(`${index + 1}. USER_ID: ${item.USER_ID}`);
          console.log(`   USERNAME: ${item.USERNAME}`);
          console.log(`   Current DEPARTMENT: ${item.CurrentDepartment || 'NULL'}`);
          console.log(`   Source CostCenterEng: ${item.SourceDepartment || 'NULL'}`);
          console.log(`   Match: ${item.CurrentDepartment === item.SourceDepartment ? '✅' : '❌'}`);
          console.log('   ---');
        });
      } else {
        console.log('❌ ไม่พบข้อมูลที่สามารถเชื่อมโยงได้');
      }
    } catch (error) {
      console.log('❌ ไม่สามารถตรวจสอบการเชื่อมโยง:', error.message);
    }

    // 5. สรุปสถานะ
    console.log('\n📋 สรุปสถานะ:');
    const hasDepartment = departmentStats[0].UsersWithDepartment > 0;
    const hasCostCenterData = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM userWithRoles WHERE CostCenterEng IS NOT NULL
    `;

    console.log(`  - ตาราง USERS มีฟิลด์ DEPARTMENT: ✅`);
    console.log(`  - มีข้อมูล DEPARTMENT ในตาราง USERS: ${hasDepartment ? '✅' : '❌'}`);
    console.log(`  - มีข้อมูล CostCenterEng ใน UserWithRoles: ${hasCostCenterData[0].count > 0 ? '✅' : '❌'}`);
    
    if (hasDepartment && hasCostCenterData[0].count > 0) {
      console.log(`  - สถานะ: ✅ ข้อมูล DEPARTMENT ได้รับการอัปเดตจาก CostCenterEng แล้ว`);
    } else if (hasCostCenterData[0].count > 0) {
      console.log(`  - สถานะ: ❌ ข้อมูล DEPARTMENT ยังไม่ได้อัปเดตจาก CostCenterEng`);
      console.log(`  - แนะนำ: รันสคริปต์ update-department-from-costcenter.cjs`);
    } else {
      console.log(`  - สถานะ: ❌ ไม่มีข้อมูล CostCenterEng ใน UserWithRoles`);
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// รันฟังก์ชัน
checkDepartmentStatus();











