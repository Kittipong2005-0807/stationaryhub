# 🔍 Debug Guide: การแก้ไขปัญหา Error 500

## 🚨 **ปัญหาที่เกิดขึ้น**

### **อาการ**
- API `/api/orgcode3` ส่งกลับ error 500
- Error message: "Failed to create requisition - user may not exist or database error occurred"
- ไม่สามารถสร้าง requisition ได้

## 🔧 **การ Debug ที่เพิ่มเข้ามา**

### **1. เพิ่ม Logging ใน OrgCode3Service**

```typescript
// เพิ่ม logging ในทุกขั้นตอน
console.log("=== CREATE REQUISITION START ===")
console.log("Creating requisition with params:", { userId, totalAmount, issueNote, siteId, itemsCount: items?.length })

// ตรวจสอบ database connection
try {
  await prisma.$queryRaw`SELECT 1`
  console.log("✅ Database connection OK")
} catch (dbError) {
  console.error("❌ Database connection error:", dbError)
  throw new Error("Database connection failed")
}

// ตรวจสอบ schema ของตาราง
const tableInfo = await prisma.$queryRaw`
  SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'REQUISITIONS'
  ORDER BY ORDINAL_POSITION
`
console.log("✅ REQUISITIONS table schema:", tableInfo)
```

### **2. เพิ่ม Error Handling ในทุกขั้นตอน**

```typescript
// INSERT query
try {
  const result = await prisma.$executeRaw`
    INSERT INTO REQUISITIONS (USER_ID, STATUS, TOTAL_AMOUNT, ISSUE_NOTE, SITE_ID)
    VALUES (${userId}, 'PENDING', ${totalAmount}, ${issueNote || ''}, ${userSiteId || siteId || 'HQ'})
  `
  console.log("✅ INSERT result:", result)
} catch (insertError) {
  console.error("❌ INSERT error:", insertError)
  throw insertError
}

// SELECT query
try {
  const requisitionId = await prisma.$queryRaw<{ REQUISITION_ID: number }[]>`
    SELECT TOP 1 REQUISITION_ID 
    FROM REQUISITIONS 
    WHERE USER_ID = ${userId} 
    ORDER BY SUBMITTED_AT DESC
  `
  console.log("✅ Retrieved requisition ID:", requisitionId)
} catch (selectError) {
  console.error("❌ SELECT error:", selectError)
  throw selectError
}
```

### **3. เพิ่ม Logging ใน API Route**

```typescript
console.log("=== API ORGCODE3 POST START ===")
console.log("Session:", session)
console.log("✅ Session user found:", session.user)

console.log("=== API ORGCODE3 POST REQUEST ===")
console.log("Request data:", { 
  action, 
  userId, 
  siteId, 
  totalAmount, 
  issueNote, 
  itemsCount: REQUISITION_ITEMS?.length,
  items: REQUISITION_ITEMS 
})

console.log("=== CALLING ORGCODE3SERVICE ===")
// ... call service
console.log("=== ORGCODE3SERVICE RESULT ===")
```

### **4. เพิ่ม Error Details**

```typescript
} catch (error: any) {
  console.error("=== API ORGCODE3 ERROR ===")
  console.error("Error in orgcode3 API:", error)
  console.error("Error type:", typeof error)
  console.error("Error message:", error.message)
  console.error("Error stack:", error.stack)
  
  return NextResponse.json({ 
    error: error.message || "Internal server error",
    type: typeof error,
    details: "Check server logs for more information"
  }, { status: 500 })
}
```

## 🧪 **การทดสอบ**

### **1. ใช้ Test Script**

```javascript
// test-requisition.js
const testRequisition = async () => {
  const testData = {
    action: "createRequisition",
    userId: "9C154",
    totalAmount: 100,
    issueNote: "Test requisition",
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

### **2. ตรวจสอบ Server Logs**

```bash
# ดู server logs
npm run dev

# หรือใช้ browser console
# เปิด Developer Tools > Console
```

## 📋 **Checklist การ Debug**

### **Database Issues**
- [ ] Database connection ทำงานได้
- [ ] ตาราง REQUISITIONS มีอยู่
- [ ] Schema ของตารางถูกต้อง
- [ ] User มีอยู่ในตาราง USERS

### **API Issues**
- [ ] Session ถูกต้อง
- [ ] Request data ครบถ้วน
- [ ] Validation ผ่าน
- [ ] OrgCode3Service ทำงานได้

### **Data Issues**
- [ ] userId ไม่เป็น null
- [ ] totalAmount > 0
- [ ] REQUISITION_ITEMS เป็น array
- [ ] Items มีข้อมูลครบ

## 🎯 **ผลลัพธ์ที่คาดหวัง**

หลังจากเพิ่ม logging แล้ว:
- ✅ เห็น error ที่ชัดเจนใน server logs
- ✅ รู้ว่าปัญหาเกิดจากขั้นตอนไหน
- ✅ สามารถแก้ไขปัญหาได้ตรงจุด
- ✅ การ debug ง่ายขึ้น

## 📝 **หมายเหตุ**

- Logging จะช่วยให้เห็นปัญหาได้ชัดเจน
- Error handling ที่ดีจะป้องกันการ crash
- การตรวจสอบ database connection จะช่วยหาปัญหาได้เร็วขึ้น

