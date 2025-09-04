// =====================================================
// ทดสอบการเชื่อมต่อฐานข้อมูลและข้อมูล userWithRoles
// =====================================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('🧪 ทดสอบการเชื่อมต่อฐานข้อมูลและข้อมูล userWithRoles...\n');

    // 1. ทดสอบการเชื่อมต่อ
    console.log('📊 ทดสอบการเชื่อมต่อฐานข้อมูล...');
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ การเชื่อมต่อฐานข้อมูลสำเร็จ');

    // 2. ตรวจสอบตาราง USERS
    console.log('\n📊 ตรวจสอบตาราง USERS...');
    const userCount = await prisma.uSERS.count();
    console.log(`✅ พบ ${userCount} users ในตาราง USERS`);

    // 3. ตรวจสอบ userWithRoles view
    console.log('\n📊 ตรวจสอบ userWithRoles view...');
    try {
      const viewCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM userWithRoles`;
      console.log(`✅ พบ ${viewCount[0].count} records ใน userWithRoles view`);
    } catch (viewError) {
      console.log('❌ ไม่สามารถเข้าถึง userWithRoles view:', viewError.message);
      return;
    }

    // 4. แสดงข้อมูลตัวอย่างจาก userWithRoles
    console.log('\n📊 ข้อมูลตัวอย่างจาก userWithRoles view:');
    const sampleUsers = await prisma.$queryRaw`
      SELECT TOP 5 AdLoginName, EmpCode, FullNameEng, PostNameEng, orgcode3
      FROM userWithRoles
      ORDER BY AdLoginName
    `;

    sampleUsers.forEach((user, index) => {
      console.log(`${index + 1}. AdLoginName: "${user.AdLoginName}" | EmpCode: "${user.EmpCode}" | FullNameEng: "${user.FullNameEng}" | PostNameEng: "${user.PostNameEng}" | orgcode3: "${user.orgcode3}"`);
    });

    // 5. ค้นหา kittipong โดยเฉพาะ
    console.log('\n🔍 ค้นหา kittipong ใน userWithRoles:');
    const kittipongData = await prisma.$queryRaw`
      SELECT AdLoginName, EmpCode, FullNameEng, PostNameEng, orgcode3, CurrentEmail
      FROM userWithRoles
      WHERE AdLoginName = 'kittipong'
    `;

    if (kittipongData && kittipongData.length > 0) {
      console.log('✅ พบข้อมูล kittipong:');
      console.log('   AdLoginName:', kittipongData[0].AdLoginName);
      console.log('   EmpCode:', kittipongData[0].EmpCode);
      console.log('   FullNameEng:', kittipongData[0].FullNameEng);
      console.log('   PostNameEng:', kittipongData[0].PostNameEng);
      console.log('   orgcode3:', kittipongData[0].orgcode3);
      console.log('   CurrentEmail:', kittipongData[0].CurrentEmail);
    } else {
      console.log('❌ ไม่พบข้อมูล kittipong ใน userWithRoles');
      
      // ค้นหาคล้ายๆ kittipong
      console.log('\n🔍 ค้นหาคล้ายๆ kittipong:');
      const similarUsers = await prisma.$queryRaw`
        SELECT AdLoginName, EmpCode, FullNameEng, PostNameEng, orgcode3
        FROM userWithRoles
        WHERE AdLoginName LIKE '%kitt%' OR AdLoginName LIKE '%kit%'
        ORDER BY AdLoginName
      `;
      
      if (similarUsers && similarUsers.length > 0) {
        console.log('✅ พบผู้ใช้ที่คล้ายๆ kittipong:');
        similarUsers.forEach((user, index) => {
          console.log(`${index + 1}. AdLoginName: "${user.AdLoginName}" | EmpCode: "${user.EmpCode}" | FullNameEng: "${user.FullNameEng}"`);
        });
      } else {
        console.log('❌ ไม่พบผู้ใช้ที่คล้ายๆ kittipong');
      }
    }

    // 6. ตรวจสอบ kittipong ในตาราง USERS
    console.log('\n🔍 ค้นหา kittipong ในตาราง USERS:');
    const kittipongInDB = await prisma.uSERS.findUnique({
      where: { USER_ID: 'kittipong' }
    });

    if (kittipongInDB) {
      console.log('✅ พบ kittipong ในตาราง USERS:');
      console.log('   USER_ID:', kittipongInDB.USER_ID);
      console.log('   USERNAME:', kittipongInDB.USERNAME);
      console.log('   EMAIL:', kittipongInDB.EMAIL);
      console.log('   ROLE:', kittipongInDB.ROLE);
      console.log('   SITE_ID:', kittipongInDB.SITE_ID);
    } else {
      console.log('❌ ไม่พบ kittipong ในตาราง USERS');
    }

    // 7. แสดงข้อมูลทั้งหมดในตาราง USERS
    console.log('\n📊 ข้อมูลทั้งหมดในตาราง USERS:');
    const allUsers = await prisma.uSERS.findMany({
      select: {
        USER_ID: true,
        USERNAME: true,
        EMAIL: true,
        ROLE: true,
        SITE_ID: true
      },
      orderBy: {
        CREATED_AT: 'desc'
      }
    });

    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. USER_ID: "${user.USER_ID}" | USERNAME: "${user.USERNAME}" | ROLE: ${user.ROLE} | SITE_ID: ${user.SITE_ID}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
