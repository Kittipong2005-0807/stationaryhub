const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrgCode4() {
  try {
    console.log('🔍 ตรวจสอบข้อมูล OrgCode4 ใน UserWithRoles...');
    
    // ดูข้อมูล OrgCode4 ทั้งหมด
    const orgCode4Data = await prisma.$queryRaw`
      SELECT 
        EmpCode,
        FullNameEng,
        OrgCode4,
        OrgTDesc4,
        OrgCode3,
        OrgTDesc3
      FROM userWithRoles 
      WHERE OrgCode4 IS NOT NULL
      ORDER BY OrgCode4, EmpCode
      LIMIT 20
    `;
    
    console.log('\n📋 ข้อมูล OrgCode4 (20 รายการแรก):');
    orgCode4Data.forEach((user, index) => {
      console.log(`${index + 1}. ${user.EmpCode} - ${user.FullNameEng}`);
      console.log(`   OrgCode4: ${user.OrgCode4} (${user.OrgTDesc4})`);
      console.log(`   OrgCode3: ${user.OrgCode3} (${user.OrgTDesc3})`);
      console.log('');
    });
    
    // ดูจำนวน OrgCode4 ที่แตกต่างกัน
    const uniqueOrgCode4 = await prisma.$queryRaw`
      SELECT 
        OrgCode4,
        OrgTDesc4,
        COUNT(*) as UserCount
      FROM userWithRoles 
      WHERE OrgCode4 IS NOT NULL
      GROUP BY OrgCode4, OrgTDesc4
      ORDER BY OrgCode4
    `;
    
    console.log('\n🏢 OrgCode4 ที่แตกต่างกัน:');
    uniqueOrgCode4.forEach((org) => {
      console.log(`${org.OrgCode4} - ${org.OrgTDesc4} (${org.UserCount} คน)`);
    });
    
    // ตรวจสอบข้อมูลในตาราง REQUISITIONS
    console.log('\n📋 ตรวจสอบข้อมูลในตาราง REQUISITIONS:');
    const requisitions = await prisma.$queryRaw`
      SELECT 
        r.REQUISITION_ID,
        r.USER_ID,
        r.SITE_ID,
        u.FullNameEng,
        u.OrgCode4,
        u.OrgTDesc4
      FROM REQUISITIONS r
      LEFT JOIN userWithRoles u ON r.USER_ID = u.EmpCode
      ORDER BY r.REQUISITION_ID DESC
      LIMIT 10
    `;
    
    requisitions.forEach((req) => {
      console.log(`Requisition #${req.REQUISITION_ID}:`);
      console.log(`  User: ${req.USER_ID} - ${req.FullNameEng}`);
      console.log(`  SITE_ID: ${req.SITE_ID}`);
      console.log(`  OrgCode4: ${req.OrgCode4} (${req.OrgTDesc4})`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrgCode4();
