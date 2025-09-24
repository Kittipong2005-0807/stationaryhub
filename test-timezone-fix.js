/**
 * ทดสอบการแก้ไข timezone ในตาราง APPROVALS และ STATUS_HISTORY
 * เปรียบเทียบกับตาราง EMAIL_LOGS และ REQUISITIONS ที่เก็บเวลาถูกต้อง
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function testTimezoneFix() {
  try {
    console.log('🕐 ทดสอบการแก้ไข timezone ในตาราง APPROVALS และ STATUS_HISTORY')
    console.log('=' .repeat(80))
    
    // 1. ตรวจสอบเวลาปัจจุบันของ SQL Server
    console.log('\n📅 1. ตรวจสอบเวลาปัจจุบันของ SQL Server:')
    const serverTime = await prisma.$queryRaw`SELECT GETDATE() as server_time`
    console.log(`   เวลาของ SQL Server: ${serverTime[0].server_time}`)
    
    // 2. ตรวจสอบเวลาปัจจุบันของ JavaScript
    console.log('\n📅 2. ตรวจสอบเวลาปัจจุบันของ JavaScript:')
    const jsTime = new Date()
    console.log(`   เวลาของ JavaScript: ${jsTime}`)
    console.log(`   เวลาของ JavaScript (ISO): ${jsTime.toISOString()}`)
    
    // 3. ตรวจสอบข้อมูลล่าสุดในตารางต่างๆ
    console.log('\n📊 3. ตรวจสอบข้อมูลล่าสุดในตารางต่างๆ:')
    
    // REQUISITIONS (ตารางที่เก็บเวลาถูกต้อง)
    const latestRequisition = await prisma.rEQUISITIONS.findFirst({
      orderBy: { SUBMITTED_AT: 'desc' },
      select: { REQUISITION_ID: true, SUBMITTED_AT: true }
    })
    if (latestRequisition) {
      console.log(`   REQUISITIONS ล่าสุด: ID ${latestRequisition.REQUISITION_ID}, เวลา: ${latestRequisition.SUBMITTED_AT}`)
    }
    
    // EMAIL_LOGS (ตารางที่เก็บเวลาถูกต้อง)
    const latestEmailLog = await prisma.eMAIL_LOGS.findFirst({
      orderBy: { SENT_AT: 'desc' },
      select: { EMAIL_ID: true, SENT_AT: true }
    })
    if (latestEmailLog) {
      console.log(`   EMAIL_LOGS ล่าสุด: ID ${latestEmailLog.EMAIL_ID}, เวลา: ${latestEmailLog.SENT_AT}`)
    }
    
    // APPROVALS (ตารางที่แก้ไขแล้ว)
    const latestApproval = await prisma.aPPROVALS.findFirst({
      orderBy: { APPROVED_AT: 'desc' },
      select: { APPROVAL_ID: true, APPROVED_AT: true }
    })
    if (latestApproval) {
      console.log(`   APPROVALS ล่าสุด: ID ${latestApproval.APPROVAL_ID}, เวลา: ${latestApproval.APPROVED_AT}`)
    }
    
    // STATUS_HISTORY (ตารางที่แก้ไขแล้ว)
    const latestStatusHistory = await prisma.sTATUS_HISTORY.findFirst({
      orderBy: { CHANGED_AT: 'desc' },
      select: { STATUS_ID: true, CHANGED_AT: true }
    })
    if (latestStatusHistory) {
      console.log(`   STATUS_HISTORY ล่าสุด: ID ${latestStatusHistory.STATUS_ID}, เวลา: ${latestStatusHistory.CHANGED_AT}`)
    }
    
    // 4. ทดสอบการสร้างข้อมูลใหม่ด้วย GETDATE()
    console.log('\n🧪 4. ทดสอบการสร้างข้อมูลใหม่ด้วย GETDATE():')
    
    // หา requisition ที่มีอยู่เพื่อทดสอบ
    const testRequisition = await prisma.rEQUISITIONS.findFirst({
      select: { REQUISITION_ID: true }
    })
    
    if (testRequisition) {
      console.log(`   ใช้ REQUISITION_ID: ${testRequisition.REQUISITION_ID} สำหรับทดสอบ`)
      
      // ทดสอบสร้าง APPROVAL ใหม่
      try {
        const testApproval = await prisma.$executeRaw`
          INSERT INTO APPROVALS (REQUISITION_ID, APPROVED_BY, STATUS, NOTE, APPROVED_AT)
          VALUES (${testRequisition.REQUISITION_ID}, 'TEST_USER', 'TEST', 'ทดสอบ timezone fix', GETDATE())
        `
        console.log(`   ✅ สร้าง APPROVAL ใหม่สำเร็จ (ใช้ GETDATE())`)
        
        // ตรวจสอบเวลาที่บันทึก
        const newApproval = await prisma.aPPROVALS.findFirst({
          where: { NOTE: 'ทดสอบ timezone fix' },
          orderBy: { APPROVED_AT: 'desc' },
          select: { APPROVAL_ID: true, APPROVED_AT: true }
        })
        if (newApproval) {
          console.log(`   เวลาที่บันทึก: ${newApproval.APPROVED_AT}`)
        }
        
      } catch (error) {
        console.log(`   ❌ เกิดข้อผิดพลาดในการสร้าง APPROVAL: ${error.message}`)
      }
      
      // ทดสอบสร้าง STATUS_HISTORY ใหม่
      try {
        const testStatusHistory = await prisma.$executeRaw`
          INSERT INTO STATUS_HISTORY (REQUISITION_ID, STATUS, CHANGED_BY, COMMENT, CHANGED_AT)
          VALUES (${testRequisition.REQUISITION_ID}, 'TEST', 'TEST_USER', 'ทดสอบ timezone fix', GETDATE())
        `
        console.log(`   ✅ สร้าง STATUS_HISTORY ใหม่สำเร็จ (ใช้ GETDATE())`)
        
        // ตรวจสอบเวลาที่บันทึก
        const newStatusHistory = await prisma.sTATUS_HISTORY.findFirst({
          where: { COMMENT: 'ทดสอบ timezone fix' },
          orderBy: { CHANGED_AT: 'desc' },
          select: { STATUS_ID: true, CHANGED_AT: true }
        })
        if (newStatusHistory) {
          console.log(`   เวลาที่บันทึก: ${newStatusHistory.CHANGED_AT}`)
        }
        
      } catch (error) {
        console.log(`   ❌ เกิดข้อผิดพลาดในการสร้าง STATUS_HISTORY: ${error.message}`)
      }
    } else {
      console.log(`   ❌ ไม่พบ REQUISITION สำหรับทดสอบ`)
    }
    
    // 5. เปรียบเทียบความแตกต่างของเวลา
    console.log('\n⏰ 5. เปรียบเทียบความแตกต่างของเวลา:')
    if (latestRequisition && latestApproval) {
      const reqTime = new Date(latestRequisition.SUBMITTED_AT)
      const appTime = new Date(latestApproval.APPROVED_AT)
      const diffMs = Math.abs(reqTime.getTime() - appTime.getTime())
      const diffHours = diffMs / (1000 * 60 * 60)
      
      console.log(`   ความแตกต่างระหว่าง REQUISITIONS และ APPROVALS: ${diffHours.toFixed(2)} ชั่วโมง`)
      
      if (diffHours < 1) {
        console.log(`   ✅ เวลาใกล้เคียงกัน (ความแตกต่าง < 1 ชั่วโมง)`)
      } else if (diffHours > 6 && diffHours < 8) {
        console.log(`   ⚠️  ยังมีความแตกต่างประมาณ 7 ชั่วโมง (อาจเป็นข้อมูลเก่า)`)
      } else {
        console.log(`   ❓ ความแตกต่าง: ${diffHours.toFixed(2)} ชั่วโมง`)
      }
    }
    
    console.log('\n✅ การทดสอบเสร็จสิ้น')
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// รันการทดสอบ
testTimezoneFix()
