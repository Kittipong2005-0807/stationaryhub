# 🔧 การแก้ไขปัญหา RequisitionId ไม่ถูกกำหนด

## 🚨 **ปัญหาที่เกิดขึ้น**

### **อาการของปัญหา**
- API `/api/orgcode3` ส่งกลับ error 500
- Error message: "requisitionId is not defined"
- ฟังก์ชัน `createRequisitionWithSiteId` ไม่สามารถส่งคืน requisition ID ได้

### **สาเหตุของปัญหา**
1. **Variable Scope**: `requisitionId` ถูกประกาศใน try block แต่ไม่ได้ถูกใช้ใน scope ที่ถูกต้อง
2. **Error Handling**: ไม่มีการตรวจสอบว่า `finalRequisitionId` เป็น null หรือไม่
3. **Database Query**: การดึง requisition ID อาจล้มเหลว

## ✅ **วิธีแก้ไข**

### **1. แก้ไข Variable Scope**

```typescript
// เปลี่ยนจาก const เป็น let และประกาศนอก try block
let requisitionId: { REQUISITION_ID: number }[] = []
try {
  requisitionId = await prisma.$queryRaw<{ REQUISITION_ID: number }[]>`
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

### **2. เพิ่มการตรวจสอบ Requisition ID**

```typescript
const finalRequisitionId = requisitionId && requisitionId.length > 0 ? requisitionId[0].REQUISITION_ID : null

if (!finalRequisitionId) {
  console.error("❌ Failed to retrieve requisition ID after creation")
  throw new Error("Failed to retrieve requisition ID after creation")
}

console.log("✅ Final requisition ID:", finalRequisitionId)
```

### **3. ปรับปรุงการสร้าง Requisition Items**

```typescript
// สร้าง requisition items ถ้ามี
if (items && items.length > 0) {
  console.log(`Creating ${items.length} requisition items for requisition ${finalRequisitionId}`)
  
  try {
    for (const item of items) {
      console.log("Creating item:", item)
      await prisma.rEQUISITION_ITEMS.create({
        data: {
          REQUISITION_ID: finalRequisitionId,
          PRODUCT_ID: item.PRODUCT_ID,
          QUANTITY: item.QUANTITY,
          UNIT_PRICE: item.UNIT_PRICE,
          TOTAL_PRICE: item.TOTAL_PRICE,
        }
      })
    }
    
    console.log(`✅ Created ${items.length} requisition items`)
  } catch (itemsError) {
    console.error("❌ Error creating requisition items:", itemsError)
    throw itemsError
  }
}
```

## 🔧 **การเปลี่ยนแปลงที่สำคัญ**

### **ไฟล์ที่แก้ไข**:
1. **`lib/orgcode3-service.ts`**: แก้ไข variable scope และเพิ่มการตรวจสอบ
2. **`test-requisition-final.js`**: สร้าง test script ใหม่

### **การปรับปรุง**:
- ✅ แก้ไข variable scope ของ `requisitionId`
- ✅ เพิ่มการตรวจสอบ `finalRequisitionId`
- ✅ ปรับปรุง error handling
- ✅ เพิ่ม logging ที่ชัดเจน

## 🧪 **การทดสอบ**

### **ขั้นตอนการทดสอบ**
1. รัน `npm run dev`
2. รัน test script: `node test-requisition-final.js`
3. ตรวจสอบ server logs เพื่อดู requisition ID
4. ทดสอบการสร้าง requisition จากหน้าเว็บ

### **ผลลัพธ์ที่คาดหวัง**
- ✅ เห็น requisition ID ใน server logs
- ✅ API ส่งคืน requisition ID
- ✅ ไม่มี error "requisitionId is not defined"
- ✅ Requisition items ถูกสร้างสำเร็จ

## 📝 **หมายเหตุ**

### **Error Flow**
1. สร้าง requisition ในตาราง REQUISITIONS
2. ดึง requisition ID ที่เพิ่งสร้าง
3. ตรวจสอบว่า requisition ID ไม่เป็น null
4. สร้าง requisition items (ถ้ามี)
5. สร้าง notification
6. ส่งคืน requisition ID

### **Logging**
- ✅ Database connection status
- ✅ Requisition creation status
- ✅ Requisition ID retrieval
- ✅ Items creation status
- ✅ Notification creation status

## 🎯 **ผลลัพธ์**

หลังจากแก้ไขแล้ว:
- ✅ Requisition ID ถูกส่งคืนอย่างถูกต้อง
- ✅ ไม่มี error "requisitionId is not defined"
- ✅ Requisition items ถูกสร้างสำเร็จ
- ✅ API ทำงานได้ปกติ

## 🔄 **การทดสอบ**

### **Test Script**
```javascript
// test-requisition-final.js
const testRequisition = async () => {
  const testData = {
    action: "createRequisition",
    userId: "9C154",
    totalAmount: 100,
    issueNote: "Test requisition after requisitionId fix",
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
  console.log("Requisition ID:", result.requisitionId)
}
```

## 📋 **Checklist การแก้ไข**

### **Variable Scope**
- [ ] requisitionId ถูกประกาศใน scope ที่ถูกต้อง
- [ ] finalRequisitionId ถูกตรวจสอบว่าไม่เป็น null
- [ ] Error handling ทำงานได้

### **Database Operations**
- [ ] Requisition creation สำเร็จ
- [ ] Requisition ID retrieval สำเร็จ
- [ ] Items creation สำเร็จ

### **Testing**
- [ ] Test script ทำงานได้
- [ ] Server logs แสดง requisition ID
- [ ] API response มี requisition ID
- [ ] ไม่มี error "requisitionId is not defined"

