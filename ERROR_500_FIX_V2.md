# 🔧 การแก้ไขปัญหา Error 500 - ครั้งที่ 2

## 🚨 **ปัญหาที่เกิดขึ้น**

### **อาการของปัญหา**
- API `/api/orgcode3` ส่งกลับ error 500
- Error message: "Failed to create requisition - user may not exist or database error occurred"
- ฟังก์ชัน `createRequisitionWithSiteId` ส่งคืน `null` แทนที่จะ throw error

### **สาเหตุของปัญหา**
1. **Error Handling**: ฟังก์ชัน `createRequisitionWithSiteId` ส่งคืน `null` เมื่อเกิด error
2. **API Route Logic**: API route ไม่สามารถจับ error ได้เพราะฟังก์ชันไม่ throw error
3. **Database Connection**: ไม่มีการตรวจสอบ database connection ที่เพียงพอ

## ✅ **วิธีแก้ไข**

### **1. ปรับปรุง Error Handling ใน OrgCode3Service**

```typescript
// เปลี่ยนจาก return null เป็น throw error
} catch (error: unknown) {
  console.error("=== CREATE REQUISITION ERROR ===")
  console.error('Error creating requisition with SITE_ID:', error)
  if (error instanceof Error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    })
    throw error // Re-throw the error so API route can catch it
  }
  throw new Error('Unknown error occurred while creating requisition')
}
```

### **2. เพิ่มการตรวจสอบ Database Schema**

```typescript
// ตรวจสอบ schema ของตาราง REQUISITIONS
try {
  const tableInfo = await prisma.$queryRaw`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'REQUISITIONS'
    ORDER BY ORDINAL_POSITION
  `
  console.log("✅ REQUISITIONS table schema:", tableInfo)
  
  // ตรวจสอบว่าตารางมีข้อมูลหรือไม่
  const tableExists = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'REQUISITIONS'
  `
  console.log("✅ REQUISITIONS table exists:", tableExists)
} catch (schemaError) {
  console.error("❌ Schema check error:", schemaError)
  throw new Error("Database schema check failed")
}
```

### **3. ปรับปรุงการสร้าง User**

```typescript
// สร้าง user ใหม่ถ้าไม่มี
try {
  await prisma.uSERS.create({
    data: {
      USER_ID: userId,
      USERNAME: userId,
      EMAIL: `${userId}@company.com`,
      ROLE: 'USER',
      SITE_ID: userSiteId || siteId || 'HQ'
    }
  })
  console.log("✅ Created new user:", userId)
} catch (createError) {
  console.error("❌ Error creating user:", createError)
  throw new Error(`Failed to create user: ${createError instanceof Error ? createError.message : 'Unknown error'}`)
}
```

## 🔧 **การเปลี่ยนแปลงที่สำคัญ**

### **ไฟล์ที่แก้ไข**:
1. **`lib/orgcode3-service.ts`**: ปรับปรุง error handling
2. **`test-requisition-fix.js`**: สร้าง test script ใหม่

### **การปรับปรุง**:
- ✅ เปลี่ยนจาก `return null` เป็น `throw error`
- ✅ เพิ่มการตรวจสอบ database schema
- ✅ ปรับปรุงการสร้าง user เมื่อไม่มีในระบบ
- ✅ เพิ่ม error details ที่ชัดเจน

## 🧪 **การทดสอบ**

### **ขั้นตอนการทดสอบ**
1. รัน `npm run dev`
2. รัน test script: `node test-requisition-fix.js`
3. ตรวจสอบ server logs เพื่อดู error details
4. ทดสอบการสร้าง requisition จากหน้าเว็บ

### **ผลลัพธ์ที่คาดหวัง**
- ✅ เห็น error details ที่ชัดเจนใน server logs
- ✅ API route สามารถจับ error ได้
- ✅ Error message มีรายละเอียดมากขึ้น
- ✅ การ debug ง่ายขึ้น

## 📝 **หมายเหตุ**

### **Error Flow**
1. Database error เกิดขึ้นใน `createRequisitionWithSiteId`
2. ฟังก์ชัน throw error แทน return null
3. API route จับ error ได้
4. ส่งกลับ error response ที่มีรายละเอียด

### **Logging**
- ✅ Database connection status
- ✅ Table schema information
- ✅ User creation status
- ✅ Detailed error messages

## 🎯 **ผลลัพธ์**

หลังจากแก้ไขแล้ว:
- ✅ Error handling ดีขึ้น
- ✅ Error messages มีรายละเอียดมากขึ้น
- ✅ การ debug ง่ายขึ้น
- ✅ API route ทำงานได้ถูกต้อง

## 🔄 **การทดสอบ**

### **Test Script**
```javascript
// test-requisition-fix.js
const testRequisition = async () => {
  const testData = {
    action: "createRequisition",
    userId: "9C154",
    totalAmount: 100,
    issueNote: "Test requisition after fix",
    siteId: "1700",
    REQUISITION_ITEMS: [
      {
        PRODUCT_ID: 1,
        QUANTITY: 2,
        UNIT_PRICE: 50,
        TOTAL_PRICE: 100
      }
    ]
  }
  
  const response = await fetch("http://localhost:3000/stationaryhub/api/orgcode3", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testData)
  })
  
  console.log("Response status:", response.status)
  const result = await response.json()
  console.log("Result:", result)
}
```

## 📋 **Checklist การแก้ไข**

### **Error Handling**
- [ ] ฟังก์ชัน throw error แทน return null
- [ ] API route จับ error ได้
- [ ] Error messages มีรายละเอียด

### **Database Checks**
- [ ] Database connection check
- [ ] Table schema check
- [ ] User creation error handling

### **Testing**
- [ ] Test script ทำงานได้
- [ ] Server logs แสดง error details
- [ ] API response ถูกต้อง







