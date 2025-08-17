// =====================================================
// ตรวจสอบข้อมูลในตาราง USERS
// =====================================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('👥 ตรวจสอบข้อมูลในตาราง USERS...');

    // 1. ตรวจสอบจำนวน user ทั้งหมด
    const totalUsers = await prisma.uSERS.count();
    console.log('📊 จำนวน user ทั้งหมด:', totalUsers);

    // 2. แสดงข้อมูล user ทั้งหมด
    const allUsers = await prisma.uSERS.findMany({
      select: {
        USER_ID: true,
        USERNAME: true,
        ROLE: true,
        DEPARTMENT: true,
        SITE_ID: true
      },
      orderBy: {
        USER_ID: 'asc'
      }
    });

    console.log('📋 รายการ Users:');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.USER_ID}, Username: ${user.USERNAME}, Role: ${user.ROLE}, Department: ${user.DEPARTMENT}, Site: ${user.SITE_ID}`);
    });

    // 3. ตรวจสอบ user kittipong
    const kittipongUser = await prisma.uSERS.findFirst({
      where: {
        USERNAME: 'kittipong'
      }
    });

    if (kittipongUser) {
      console.log('✅ พบ user kittipong:', kittipongUser);
    } else {
      console.log('❌ ไม่พบ user kittipong');
      
      // 4. แสดง user ที่มี username ใกล้เคียง
      const similarUsers = await prisma.uSERS.findMany({
        where: {
          USERNAME: {
            contains: 'kitt'
          }
        }
      });
      
      if (similarUsers.length > 0) {
        console.log('🔍 Users ที่มีชื่อใกล้เคียง:');
        similarUsers.forEach(user => {
          console.log(`   - ${user.USERNAME} (ID: ${user.USER_ID})`);
        });
      }
    }

    console.log('✅ การตรวจสอบเสร็จสิ้น!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// รันการตรวจสอบ
checkUsers();
