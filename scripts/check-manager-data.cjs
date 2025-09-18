const sql = require('mssql')

// การตั้งค่าการเชื่อมต่อฐานข้อมูล
const config = {
  server: 'localhost', // เปลี่ยนเป็น server ของคุณ
  database: 'StationeryDB', // เปลี่ยนเป็นชื่อฐานข้อมูลของคุณ
  user: 'your_username', // เปลี่ยนเป็น username ของคุณ
  password: 'your_password', // เปลี่ยนเป็น password ของคุณ
  options: {
    encrypt: false, // ใช้ true ถ้าเป็น Azure SQL
    trustServerCertificate: true
  }
}

async function checkManagerData() {
  try {
    console.log('🔍 เชื่อมต่อฐานข้อมูล...')
    await sql.connect(config)
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ')

    // 1. ดูข้อมูล Manager ทั้งหมดที่มีตำแหน่งเป็น Manager
    console.log('\n📋 ข้อมูล Manager ทั้งหมด:')
    const managerResult = await sql.query`
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
    
    console.log(`พบ Manager ทั้งหมด: ${managerResult.recordset.length} คน`)
    managerResult.recordset.forEach((manager, index) => {
      console.log(`${index + 1}. ${manager.EmpCode} - ${manager.FullNameEng}`)
      console.log(`   ตำแหน่ง: ${manager.PostNameEng}`)
      console.log(`   Email: ${manager.CurrentEmail}`)
      console.log(`   OrgCode3: ${manager.OrgCode3}`)
      console.log(`   OrgCode4: ${manager.OrgCode4}`)
      console.log(`   superempcode: ${manager.superempcode}`)
      console.log('')
    })

    // 2. ดูข้อมูล Manager แยกตาม OrgCode3
    console.log('\n🏢 Manager แยกตาม OrgCode3:')
    const orgCode3Result = await sql.query`
      SELECT 
        OrgCode3,
        OrgTDesc3,
        COUNT(*) as ManagerCount,
        STRING_AGG(EmpCode, ', ') as ManagerCodes
      FROM UserWithRoles 
      WHERE PostNameEng LIKE '%Manager%'
        AND OrgCode3 IS NOT NULL
      GROUP BY OrgCode3, OrgTDesc3
      ORDER BY OrgCode3
    `
    
    orgCode3Result.recordset.forEach((org) => {
      console.log(`${org.OrgCode3} - ${org.OrgTDesc3}`)
      console.log(`   จำนวน Manager: ${org.ManagerCount}`)
      console.log(`   รหัส Manager: ${org.ManagerCodes}`)
      console.log('')
    })

    // 3. ดูข้อมูล Manager แยกตาม OrgCode4
    console.log('\n🏢 Manager แยกตาม OrgCode4:')
    const orgCode4Result = await sql.query`
      SELECT 
        OrgCode4,
        OrgTDesc4,
        COUNT(*) as ManagerCount,
        STRING_AGG(EmpCode, ', ') as ManagerCodes
      FROM UserWithRoles 
      WHERE PostNameEng LIKE '%Manager%'
        AND OrgCode4 IS NOT NULL
      GROUP BY OrgCode4, OrgTDesc4
      ORDER BY OrgCode4
    `
    
    orgCode4Result.recordset.forEach((org) => {
      console.log(`${org.OrgCode4} - ${org.OrgTDesc4}`)
      console.log(`   จำนวน Manager: ${org.ManagerCount}`)
      console.log(`   รหัส Manager: ${org.ManagerCodes}`)
      console.log('')
    })

    // 4. ดูข้อมูล superempcode และ Manager ที่เกี่ยวข้อง
    console.log('\n👥 ข้อมูล superempcode และ Manager:')
    const superEmpResult = await sql.query`
      SELECT 
        superempcode,
        COUNT(*) as EmployeeCount,
        STRING_AGG(EmpCode, ', ') as EmployeeCodes
      FROM UserWithRoles 
      WHERE superempcode IS NOT NULL
      GROUP BY superempcode
      ORDER BY superempcode
    `
    
    superEmpResult.recordset.forEach((superEmp) => {
      console.log(`superempcode: ${superEmp.superempcode}`)
      console.log(`   จำนวนพนักงาน: ${superEmp.EmployeeCount}`)
      console.log(`   รหัสพนักงาน: ${superEmp.EmployeeCodes}`)
      console.log('')
    })

    // 5. ดูข้อมูล Manager ที่มี superempcode
    console.log('\n👨‍💼 Manager ที่มี superempcode:')
    const managerWithSuperResult = await sql.query`
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
    
    managerWithSuperResult.recordset.forEach((manager) => {
      console.log(`${manager.EmpCode} - ${manager.FullNameEng}`)
      console.log(`   ตำแหน่ง: ${manager.PostNameEng}`)
      console.log(`   Email: ${manager.CurrentEmail}`)
      console.log(`   superempcode: ${manager.superempcode}`)
      console.log('')
    })

    // 6. ดูข้อมูลตัวอย่างการหา Manager สำหรับ User ตัวอย่าง
    console.log('\n🧪 ตัวอย่างการหา Manager สำหรับ User ตัวอย่าง:')
    const testUserId = 'EMP001' // เปลี่ยนเป็น user ID ที่มีจริงในระบบ
    
    // หาข้อมูล User
    const userResult = await sql.query`
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
      WHERE EmpCode = ${testUserId}
    `
    
    if (userResult.recordset.length > 0) {
      const user = userResult.recordset[0]
      console.log(`ข้อมูล User ${testUserId}:`)
      console.log(`   ชื่อ: ${user.FullNameEng}`)
      console.log(`   ตำแหน่ง: ${user.PostNameEng}`)
      console.log(`   OrgCode3: ${user.OrgCode3}`)
      console.log(`   OrgCode4: ${user.OrgCode4}`)
      console.log(`   superempcode: ${user.superempcode}`)
      console.log('')
      
      // หา Manager ที่เกี่ยวข้องกับ User นี้
      const relatedManagerResult = await sql.query`
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
      
      console.log(`Manager ที่เกี่ยวข้องกับ User ${testUserId}:`)
      if (relatedManagerResult.recordset.length > 0) {
        relatedManagerResult.recordset.forEach((manager, index) => {
          console.log(`${index + 1}. ${manager.EmpCode} - ${manager.FullNameEng}`)
          console.log(`   ตำแหน่ง: ${manager.PostNameEng}`)
          console.log(`   Email: ${manager.CurrentEmail}`)
          console.log('')
        })
      } else {
        console.log('   ไม่พบ Manager ที่เกี่ยวข้อง')
      }
    } else {
      console.log(`ไม่พบ User ${testUserId} ในระบบ`)
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message)
    console.error('💡 ตรวจสอบการตั้งค่าการเชื่อมต่อฐานข้อมูลในไฟล์ scripts/check-manager-data.cjs')
  } finally {
    await sql.close()
    console.log('\n🔒 ปิดการเชื่อมต่อฐานข้อมูล')
  }
}

// รันการตรวจสอบ
checkManagerData()

