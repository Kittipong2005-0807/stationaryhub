// =====================================================
// ตรวจสอบโครงสร้างตาราง USERS
// =====================================================

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsersTable() {
  try {
    console.log('🔍 ตรวจสอบโครงสร้างตาราง USERS...\n');

    // 1. ตรวจสอบข้อมูลในตาราง USERS
    const totalUsers = await prisma.uSERS.count();
    console.log(`📊 จำนวนผู้ใช้ทั้งหมดในตาราง USERS: ${totalUsers}`);

    if (totalUsers === 0) {
      console.log('❌ ไม่มีข้อมูลในตาราง USERS');
      return;
    }

    // 2. แสดงข้อมูล USERS ล่าสุด 5 รายการ
    const recentUsers = await prisma.uSERS.findMany({
      take: 5
    });

    console.log('\n📋 รายการ USERS ล่าสุด 5 รายการ:');
    recentUsers.forEach((user, index) => {
      console.log(`${index + 1}. USER_ID: ${user.USER_ID}`);
      console.log(`   USERNAME: ${user.USERNAME}`);
      console.log(`   EMAIL: ${user.EMAIL}`);
      console.log(`   ROLE: ${user.ROLE}`);
      console.log(`   DEPARTMENT: ${user.DEPARTMENT}`);
      console.log('   ---');
    });

    // 3. ตรวจสอบ UserWithRoles view
    console.log('\n🔍 ตรวจสอบ UserWithRoles view...');
    try {
      const userWithRoles = await prisma.$queryRaw`
        SELECT TOP 5 AdLoginName, EmpCode, CurrentEmail, FullNameEng, FullNameThai
        FROM UserWithRoles
      `;
      
      console.log('📋 รายการ UserWithRoles ล่าสุด 5 รายการ:');
      userWithRoles.forEach((user, index) => {
        console.log(`${index + 1}. AdLoginName: ${user.AdLoginName}`);
        console.log(`   EmpCode: ${user.EmpCode}`);
        console.log(`   CurrentEmail: ${user.CurrentEmail}`);
        console.log(`   FullNameEng: ${user.FullNameEng}`);
        console.log(`   FullNameThai: ${user.FullNameThai}`);
        console.log('   ---');
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการเข้าถึง UserWithRoles:', error.message);
    }

    // 4. ตรวจสอบ VS_DivisionMgr view
    console.log('\n🔍 ตรวจสอบ VS_DivisionMgr view...');
    try {
      const divisionMgrs = await prisma.$queryRaw`
        SELECT TOP 5 L2, CurrentEmail, FullNameEng, PostNameEng, CostCenter
        FROM VS_DivisionMgr
      `;
      
      console.log('📋 รายการ VS_DivisionMgr ล่าสุด 5 รายการ:');
      divisionMgrs.forEach((mgr, index) => {
        console.log(`${index + 1}. L2: ${mgr.L2}`);
        console.log(`   CurrentEmail: ${mgr.CurrentEmail}`);
        console.log(`   FullNameEng: ${mgr.FullNameEng}`);
        console.log(`   PostNameEng: ${mgr.PostNameEng}`);
        console.log(`   CostCenter: ${mgr.CostCenter}`);
        console.log('   ---');
      });
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการเข้าถึง VS_DivisionMgr:', error.message);
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsersTable();
