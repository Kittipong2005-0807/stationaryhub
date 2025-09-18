const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCostCenterData() {
  try {
    console.log('🔍 ตรวจสอบข้อมูล CostCenter...');
    
    // ดูข้อมูล UserWithRoles ที่มี costcentercode
    console.log('\n📋 ข้อมูล UserWithRoles ที่มี costcentercode:');
    const users = await prisma.$queryRaw`
      SELECT TOP 10
        EmpCode,
        AdLoginName,
        CurrentEmail,
        FullNameEng,
        PostNameEng,
        costcentercode,
        OrgCode3,
        OrgCode4
      FROM UserWithRoles 
      WHERE costcentercode IS NOT NULL
      ORDER BY EmpCode
    `;
    
    console.log(`พบ User ที่มี costcentercode: ${users.length} คน`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.EmpCode} - ${user.FullNameEng} - CostCenter: ${user.costcentercode}`);
    });
    
    // ดูข้อมูล VS_DivisionMgr
    console.log('\n📋 ข้อมูล VS_DivisionMgr:');
    const managers = await prisma.$queryRaw`
      SELECT TOP 10
        CostCenter,
        L2,
        CurrentEmail,
        FullNameEng,
        PostNameEng,
        OrgCode3,
        OrgCode4
      FROM VS_DivisionMgr 
      ORDER BY CostCenter
    `;
    
    console.log(`พบ Manager ใน VS_DivisionMgr: ${managers.length} คน`);
    managers.forEach((manager, index) => {
      console.log(`${index + 1}. CostCenter: ${manager.CostCenter} - Manager: ${manager.FullNameEng} (${manager.L2}) - Email: ${manager.CurrentEmail}`);
    });
    
    // ตรวจสอบการจับคู่ CostCenter
    console.log('\n🔗 ตรวจสอบการจับคู่ CostCenter:');
    const matching = await prisma.$queryRaw`
      SELECT TOP 5
        u.EmpCode,
        u.FullNameEng,
        u.costcentercode,
        m.CostCenter,
        m.FullNameEng as ManagerName,
        m.CurrentEmail as ManagerEmail
      FROM UserWithRoles u
      LEFT JOIN VS_DivisionMgr m ON u.costcentercode = m.CostCenter
      WHERE u.costcentercode IS NOT NULL
      ORDER BY u.EmpCode
    `;
    
    console.log(`ตัวอย่างการจับคู่ CostCenter:`);
    matching.forEach((match, index) => {
      console.log(`${index + 1}. User: ${match.EmpCode} (${match.FullNameEng}) - CostCenter: ${match.costcentercode}`);
      if (match.ManagerName) {
        console.log(`   Manager: ${match.ManagerName} (${match.ManagerEmail})`);
      } else {
        console.log(`   ❌ ไม่พบ Manager สำหรับ CostCenter นี้`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCostCenterData();
