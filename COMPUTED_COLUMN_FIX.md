# 🔧 การแก้ไขปัญหา Computed Column TOTAL_PRICE

## 🚨 **ปัญหาที่เกิดขึ้น**

### **อาการของปัญหา**
- Error: "The column 'TOTAL_PRICE' cannot be modified because it is either a computed column or is the result of a UNION operator"
- Prisma ไม่สามารถสร้าง requisition items ได้
- Database error code 271

### **สาเหตุของปัญหา**
1. **Computed Column**: `TOTAL_PRICE` ในตาราง `REQUISITION_ITEMS` เป็น computed column
2. **Invalid Insert**: พยายามใส่ค่าเข้าไปใน computed column
3. **Database Constraint**: SQL Server ป้องกันการแก้ไข computed column

## ✅ **วิธีแก้ไข**

### **1. แก้ไข lib/orgcode3-service.ts**

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
          // TOTAL_PRICE เป็น computed column ไม่ต้องใส่ค่า
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

### **2. Database Schema**

```sql
-- ตัวอย่าง computed column ใน SQL Server
CREATE TABLE REQUISITION_ITEMS (
  ITEM_ID BIGINT IDENTITY(1,1) PRIMARY KEY,
  REQUISITION_ID BIGINT NOT NULL,
  PRODUCT_ID INT NOT NULL,
  QUANTITY INT NOT NULL,
  UNIT_PRICE DECIMAL(10,2) NOT NULL,
  TOTAL_PRICE AS (QUANTITY * UNIT_PRICE) PERSISTED -- Computed column
)
```

## 🔧 **การเปลี่ยนแปลงที่สำคัญ**

### **ไฟล์ที่แก้ไข**:
1. **`lib/orgcode3-service.ts`**: ลบ `TOTAL_PRICE` ออกจาก data object
2. **`test-requisition-computed-column.js`**: สร้าง test script ใหม่

### **การปรับปรุง**:
- ✅ ลบ `TOTAL_PRICE` ออกจาก Prisma create operation
- ✅ เพิ่ม comment อธิบายว่าเป็น computed column
- ✅ ปรับปรุง error handling

## 🧪 **การทดสอบ**

### **ขั้นตอนการทดสอบ**
1. รัน `npm run dev`
2. รัน test script: `node test-requisition-computed-column.js`
3. ตรวจสอบ server logs เพื่อดู requisition creation
4. ทดสอบการสร้าง requisition จากหน้าเว็บ

### **ผลลัพธ์ที่คาดหวัง**
- ✅ ไม่มี computed column error
- ✅ Requisition items ถูกสร้างสำเร็จ
- ✅ TOTAL_PRICE ถูกคำนวณอัตโนมัติโดย database
- ✅ API ทำงานได้ปกติ

## 📝 **หมายเหตุ**

### **Computed Column Behavior**
1. **Automatic Calculation**: `TOTAL_PRICE = QUANTITY * UNIT_PRICE`
2. **No Manual Insert**: ไม่สามารถใส่ค่าเข้าไปได้
3. **Database Responsibility**: Database จะคำนวณค่าให้อัตโนมัติ

### **Prisma Best Practices**
- ✅ ไม่ใส่ computed columns ใน create operation
- ✅ ใช้ database functions สำหรับการคำนวณ
- ✅ ตรวจสอบ schema ก่อนการใช้งาน

### **Error Handling**
- ✅ จับ error และ log อย่างชัดเจน
- ✅ แสดง error message ที่เข้าใจง่าย
- ✅ ไม่ crash application

## 🎯 **ผลลัพธ์**

หลังจากแก้ไขแล้ว:
- ✅ ไม่มี computed column error
- ✅ Requisition items ถูกสร้างสำเร็จ
- ✅ TOTAL_PRICE ถูกคำนวณอัตโนมัติ
- ✅ API ทำงานได้ปกติ

## 🔄 **การ Deploy**

เมื่อ deploy ไป production:
1. Computed columns จะทำงานอัตโนมัติ
2. ไม่มี error เกี่ยวกับ computed columns
3. Data integrity ถูกต้อง

## 📋 **Checklist การแก้ไข**

### **Code Changes**
- [ ] ลบ TOTAL_PRICE ออกจาก Prisma create
- [ ] เพิ่ม comment อธิบาย computed column
- [ ] ปรับปรุง error handling

### **Database**
- [ ] Computed column ทำงานได้ถูกต้อง
- [ ] ไม่มี constraint violations
- [ ] Data integrity ถูกต้อง

### **Testing**
- [ ] Test script ทำงานได้
- [ ] Server logs แสดง success
- [ ] ไม่มี computed column error
- [ ] API response ถูกต้อง

### **Documentation**
- [ ] อธิบาย computed column behavior
- [ ] บันทึกการเปลี่ยนแปลง
- [ ] อัปเดต test scripts


