const { PrismaClient } = require('@prisma/client')

// ใช้การตั้งค่าฐานข้อมูลจาก .env.local
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "sqlserver://10.1.0.4;database=StationaryNew;user=kittipong;password=password@1;trustServerCertificate=true"
    }
  }
})

async function testProductsTime() {
  try {
    console.log('🔍 ตรวจสอบเวลาของ Products...\n')
    
    // ดึงข้อมูล Products ล่าสุด (เหมือน API route)
    const productsQuery = `
      SELECT TOP 5 
        PRODUCT_ID,
        PRODUCT_NAME,
        CREATED_AT
      FROM PRODUCTS 
      ORDER BY CREATED_AT DESC
    `
    
    const products = await prisma.$queryRawUnsafe(productsQuery)
    
    console.log('📦 ข้อมูล Products ที่ดึงมาจากฐานข้อมูล:')
    products.forEach((product, index) => {
      console.log(`\n${index + 1}. ID: ${product.PRODUCT_ID}`)
      console.log(`   Name: ${product.PRODUCT_NAME}`)
      console.log(`   Created At (Raw): ${product.CREATED_AT}`)
      console.log(`   Created At (Type): ${typeof product.CREATED_AT}`)
      console.log(`   Created At (String): ${product.CREATED_AT.toString()}`)
      
      // ทดสอบการแปลงเป็น Date object
      const dateObj = new Date(product.CREATED_AT)
      console.log(`   Date Object: ${dateObj}`)
      console.log(`   Date Object (ISO): ${dateObj.toISOString()}`)
      console.log(`   Date Object (Local): ${dateObj.toLocaleString()}`)
      console.log(`   Date Object (Thai): ${dateObj.toLocaleString('th-TH')}`)
      
      // ทดสอบการแสดงผลแบบที่ใช้ในหน้าเว็บ
      console.log(`\n🖥️ การแสดงผลแบบหน้าเว็บ:`)
      const day = dateObj.getDate().toString().padStart(2, '0')
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
      const year = dateObj.getFullYear()
      const hours = dateObj.getHours().toString().padStart(2, '0')
      const minutes = dateObj.getMinutes().toString().padStart(2, '0')
      const seconds = dateObj.getSeconds().toString().padStart(2, '0')
      
      console.log(`   Formatted: ${day}/${month}/${year} ${hours}:${minutes}:${seconds}`)
      
      // ทดสอบ ThaiDateUtils.formatShortThaiDate
      console.log(`\n🇹🇭 ทดสอบ ThaiDateUtils:`)
      try {
        const ThaiDateUtils = require('./lib/date-utils.js').default
        console.log(`   formatShortThaiDate: ${ThaiDateUtils.formatShortThaiDate(product.CREATED_AT)}`)
      } catch (importError) {
        console.log(`   ❌ ไม่สามารถ import ThaiDateUtils: ${importError.message}`)
      }
    })
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testProductsTime()
