const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testManagerLookup() {
  try {
    console.log('🔍 Testing new manager lookup system...')
    
    // ทดสอบหา user ใน UserWithRoles
    console.log('\n📋 Testing user lookup in UserWithRoles...')
    const testUserId = 'test001' // เปลี่ยนเป็น user ID ที่มีจริงในระบบ
    
    const user = await prisma.$queryRaw`
      SELECT PostNameEng, OrgCode3, OrgCode4, superempcode, EmpCode 
      FROM UserWithRoles 
      WHERE EmpCode = ${testUserId}
    `
    
    console.log('User data:', user)
    
    if (user && user.length > 0) {
      const userData = user[0]
      const userOrgCode3 = userData.OrgCode3
      const userOrgCode4 = userData.OrgCode4
      const userSuperEmpCode = userData.superempcode
      
      console.log('\n🏢 User organization codes:', {
        OrgCode3: userOrgCode3,
        OrgCode4: userOrgCode4,
        superempcode: userSuperEmpCode
      })
      
      // ทดสอบหา managers
      console.log('\n👥 Testing manager lookup...')
      const managers = await prisma.$queryRaw`
        SELECT EmpCode, CurrentEmail, AdLoginName, PostNameEng, OrgCode3, OrgCode4, superempcode
        FROM UserWithRoles 
        WHERE PostNameEng LIKE '%Manager%'
        AND (
          OrgCode3 = ${userOrgCode3 || 'NULL'} 
          OR OrgCode4 = ${userOrgCode4 || 'NULL'} 
          OR superempcode = ${userSuperEmpCode || 'NULL'}
          OR EmpCode = ${userSuperEmpCode || 'NULL'}
        )
      `
      
      console.log(`Found ${managers.length} managers:`)
      managers.forEach((manager, index) => {
        console.log(`${index + 1}. ${manager.AdLoginName} (${manager.EmpCode})`)
        console.log(`   Email: ${manager.CurrentEmail}`)
        console.log(`   Position: ${manager.PostNameEng}`)
        console.log(`   OrgCode3: ${manager.OrgCode3}`)
        console.log(`   OrgCode4: ${manager.OrgCode4}`)
        console.log(`   superempcode: ${manager.superempcode}`)
        console.log('')
      })
      
      // ทดสอบหา managers แบบเก่า (เปรียบเทียบ)
      console.log('\n🔄 Comparing with old method...')
      const oldMethodManagers = await prisma.$queryRaw`
        SELECT EmpCode, CurrentEmail, AdLoginName, PostNameEng
        FROM UserWithRoles 
        WHERE OrgCode3 = ${userOrgCode3 || 'NULL'} 
        AND PostNameEng LIKE '%Manager%'
      `
      
      console.log(`Old method found ${oldMethodManagers.length} managers`)
      oldMethodManagers.forEach((manager, index) => {
        console.log(`${index + 1}. ${manager.AdLoginName} (${manager.EmpCode})`)
      })
      
    } else {
      console.log('❌ User not found in UserWithRoles')
    }
    
    // ทดสอบหา users ทั้งหมดที่มีข้อมูล OrgCode3, OrgCode4, superempcode
    console.log('\n📊 Testing all users with organization data...')
    const allUsers = await prisma.$queryRaw`
      SELECT EmpCode, PostNameEng, OrgCode3, OrgCode4, superempcode
      FROM UserWithRoles 
      WHERE OrgCode3 IS NOT NULL 
      OR OrgCode4 IS NOT NULL 
      OR superempcode IS NOT NULL
      ORDER BY EmpCode
    `
    
    console.log(`Found ${allUsers.length} users with organization data`)
    
    // แสดงตัวอย่างข้อมูล
    console.log('\n📋 Sample users with organization data:')
    allUsers.slice(0, 10).forEach((user, index) => {
      console.log(`${index + 1}. ${user.EmpCode} - ${user.PostNameEng}`)
      console.log(`   OrgCode3: ${user.OrgCode3}`)
      console.log(`   OrgCode4: ${user.OrgCode4}`)
      console.log(`   superempcode: ${user.superempcode}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Error testing manager lookup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// รันการทดสอบ
testManagerLookup()
