// สคริปต์ดูข้อมูล Manager จาก OrgCode3, OrgCode4, และ superempcode
// ใช้การเชื่อมต่อฐานข้อมูลโดยตรง

const { PrismaClient } = require('@prisma/client')

// ตั้งค่าการเชื่อมต่อฐานข้อมูลโดยตรง
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "sqlserver://localhost:1433;database=StationeryDB;user=sa;password=your_password;trustServerCertificate=true"
    }
  }
})

async function viewManagerData() {
  try {
    console.log('🔍 ดูข้อมูล Manager จาก OrgCode3, OrgCode4, และ superempcode...')
    
    // 1. ดูข้อมูล Manager ทั้งหมดที่มีตำแหน่งเป็น Manager
    console.log('\n📋 ข้อมูล Manager ทั้งหมด:')
    const managers = await prisma.$queryRaw`
      SELECT 
        EmpCode,
        AdLoginName,
        CurrentEmail,
        FullNameEng,
        FullNameThai,
        PostNameEng,
        OrgCode3,
        OrgCode4,
        superempcode,
        OrgTDesc3,
        OrgTDesc4
      FROM UserWithRoles 
      WHERE PostNameEng LIKE '%Manager%'
      ORDER BY OrgCode3, OrgCode4, EmpCode
    `
    
    console.log(`พบ Manager ทั้งหมด: ${managers.length} คน`)
    managers.forEach((manager, index) => {
      console.log(`${index + 1}. ${manager.EmpCode} - ${manager.FullNameEng}`)
      console.log(`   ตำแหน่ง: ${manager.PostNameEng}`)
      console.log(`   Email: ${manager.CurrentEmail}`)
      console.log(`   OrgCode3: ${manager.OrgCode3}`)
      console.log(`   OrgCode4: ${manager.OrgCode4}`)
      console.log(`   superempcode: ${manager.superempcode}`)
      console.log(`   OrgTDesc3: ${manager.OrgTDesc3}`)
      console.log(`   OrgTDesc4: ${manager.OrgTDesc4}`)
      console.log('')
    })

    // 2. ดูข้อมูล Manager แยกตาม OrgCode3
    console.log('\n🏢 Manager แยกตาม OrgCode3:')
    const orgCode3Groups = await prisma.$queryRaw`
      SELECT 
        OrgCode3,
        OrgTDesc3,
        COUNT(*) as ManagerCount
      FROM UserWithRoles 
      WHERE PostNameEng LIKE '%Manager%'
        AND OrgCode3 IS NOT NULL
      GROUP BY OrgCode3, OrgTDesc3
      ORDER BY OrgCode3
    `
    
    orgCode3Groups.forEach((org) => {
      console.log(`${org.OrgCode3} - ${org.OrgTDesc3}`)
      console.log(`   จำนวน Manager: ${org.ManagerCount}`)
      
      // แสดงรายละเอียด Manager ในแต่ละ OrgCode3
      const managersInOrg = await prisma.$queryRaw`
        SELECT EmpCode, FullNameEng, PostNameEng, CurrentEmail
        FROM UserWithRoles 
        WHERE PostNameEng LIKE '%Manager%'
          AND OrgCode3 = ${org.OrgCode3}
        ORDER BY EmpCode
      `
      
      managersInOrg.forEach((manager) => {
        console.log(`     - ${manager.EmpCode}: ${manager.FullNameEng} (${manager.PostNameEng})`)
      })
      console.log('')
    })

    // 3. ดูข้อมูล Manager แยกตาม OrgCode4
    console.log('\n🏢 Manager แยกตาม OrgCode4:')
    const orgCode4Groups = await prisma.$queryRaw`
      SELECT 
        OrgCode4,
        OrgTDesc4,
        COUNT(*) as ManagerCount
      FROM UserWithRoles 
      WHERE PostNameEng LIKE '%Manager%'
        AND OrgCode4 IS NOT NULL
      GROUP BY OrgCode4, OrgTDesc4
      ORDER BY OrgCode4
    `
    
    orgCode4Groups.forEach((org) => {
      console.log(`${org.OrgCode4} - ${org.OrgTDesc4}`)
      console.log(`   จำนวน Manager: ${org.ManagerCount}`)
      
      // แสดงรายละเอียด Manager ในแต่ละ OrgCode4
      const managersInOrg = await prisma.$queryRaw`
        SELECT EmpCode, FullNameEng, PostNameEng, CurrentEmail
        FROM UserWithRoles 
        WHERE PostNameEng LIKE '%Manager%'
          AND OrgCode4 = ${org.OrgCode4}
        ORDER BY EmpCode
      `
      
      managersInOrg.forEach((manager) => {
        console.log(`     - ${manager.EmpCode}: ${manager.FullNameEng} (${manager.PostNameEng})`)
      })
      console.log('')
    })

    // 4. ดูข้อมูล superempcode และ Manager ที่เกี่ยวข้อง
    console.log('\n👥 ข้อมูล superempcode และ Manager:')
    const superEmpGroups = await prisma.$queryRaw`
      SELECT 
        superempcode,
        COUNT(*) as EmployeeCount
      FROM UserWithRoles 
      WHERE superempcode IS NOT NULL
      GROUP BY superempcode
      ORDER BY superempcode
    `
    
    superEmpGroups.forEach((superEmp) => {
      console.log(`superempcode: ${superEmp.superempcode}`)
      console.log(`   จำนวนพนักงาน: ${superEmp.EmployeeCount}`)
      
      // แสดงรายละเอียดพนักงานในแต่ละ superempcode
      const employeesInSuper = await prisma.$queryRaw`
        SELECT EmpCode, FullNameEng, PostNameEng
        FROM UserWithRoles 
        WHERE superempcode = ${superEmp.superempcode}
        ORDER BY EmpCode
      `
      
      employeesInSuper.forEach((employee) => {
        console.log(`     - ${employee.EmpCode}: ${employee.FullNameEng} (${employee.PostNameEng})`)
      })
      console.log('')
    })

    // 5. ดูข้อมูล Manager ที่มี superempcode
    console.log('\n👨‍💼 Manager ที่มี superempcode:')
    const managerWithSuper = await prisma.$queryRaw`
      SELECT 
        EmpCode,
        AdLoginName,
        CurrentEmail,
        FullNameEng,
        PostNameEng,
        OrgCode3,
        OrgCode4,
        superempcode
      FROM UserWithRoles 
      WHERE PostNameEng LIKE '%Manager%'
        AND superempcode IS NOT NULL
      ORDER BY superempcode, EmpCode
    `
    
    managerWithSuper.forEach((manager) => {
      console.log(`${manager.EmpCode} - ${manager.FullNameEng}`)
      console.log(`   ตำแหน่ง: ${manager.PostNameEng}`)
      console.log(`   Email: ${manager.CurrentEmail}`)
      console.log(`   superempcode: ${manager.superempcode}`)
      console.log('')
    })

    // 6. ดูข้อมูลตัวอย่างการหา Manager สำหรับ User ตัวอย่าง
    console.log('\n🧪 ตัวอย่างการหา Manager สำหรับ User ตัวอย่าง:')
    
    // หา User ตัวอย่างที่มีข้อมูลองค์กร
    const sampleUser = await prisma.$queryRaw`
      SELECT TOP 1
        EmpCode,
        AdLoginName,
        CurrentEmail,
        FullNameEng,
        PostNameEng,
        OrgCode3,
        OrgCode4,
        superempcode
      FROM UserWithRoles 
      WHERE OrgCode3 IS NOT NULL 
         OR OrgCode4 IS NOT NULL 
         OR superempcode IS NOT NULL
      ORDER BY EmpCode
    `
    
    if (sampleUser.length > 0) {
      const user = sampleUser[0]
      console.log(`ข้อมูล User ตัวอย่าง ${user.EmpCode}:`)
      console.log(`   ชื่อ: ${user.FullNameEng}`)
      console.log(`   ตำแหน่ง: ${user.PostNameEng}`)
      console.log(`   OrgCode3: ${user.OrgCode3}`)
      console.log(`   OrgCode4: ${user.OrgCode4}`)
      console.log(`   superempcode: ${user.superempcode}`)
      console.log('')
      
      // หา Manager ที่เกี่ยวข้องกับ User นี้
      const relatedManagers = await prisma.$queryRaw`
        SELECT 
          EmpCode,
          AdLoginName,
          CurrentEmail,
          FullNameEng,
          PostNameEng,
          OrgCode3,
          OrgCode4,
          superempcode
        FROM UserWithRoles 
        WHERE PostNameEng LIKE '%Manager%'
          AND (
            OrgCode3 = ${user.OrgCode3 || 'NULL'}
            OR OrgCode4 = ${user.OrgCode4 || 'NULL'}
            OR superempcode = ${user.superempcode || 'NULL'}
            OR EmpCode = ${user.superempcode || 'NULL'}
          )
      `
      
      console.log(`Manager ที่เกี่ยวข้องกับ User ${user.EmpCode}:`)
      if (relatedManagers.length > 0) {
        relatedManagers.forEach((manager, index) => {
          console.log(`${index + 1}. ${manager.EmpCode} - ${manager.FullNameEng}`)
          console.log(`   ตำแหน่ง: ${manager.PostNameEng}`)
          console.log(`   Email: ${manager.CurrentEmail}`)
          console.log(`   OrgCode3: ${manager.OrgCode3}`)
          console.log(`   OrgCode4: ${manager.OrgCode4}`)
          console.log(`   superempcode: ${manager.superempcode}`)
          console.log('')
        })
      } else {
        console.log('   ไม่พบ Manager ที่เกี่ยวข้อง')
      }
    } else {
      console.log('ไม่พบ User ตัวอย่างที่มีข้อมูลองค์กร')
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message)
    console.error('💡 ตรวจสอบการตั้งค่าการเชื่อมต่อฐานข้อมูล')
    console.error('💡 หรือรันสคริปต์ SQL โดยตรง: scripts/check-manager-data.sql')
  } finally {
    await prisma.$disconnect()
    console.log('\n🔒 ปิดการเชื่อมต่อฐานข้อมูล')
  }
}

// รันการตรวจสอบ
viewManagerData()

