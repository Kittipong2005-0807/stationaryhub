# 🔄 การแก้ไขปัญหาการสร้าง Order ซ้ำ

## 🚫 **ปัญหาที่เกิดขึ้น**

### **อาการของปัญหา**
- เมื่อกดปุ่ม "Submit Requisition" จะมีการสร้าง Order 2 ครั้ง
- เกิดการเรียก API ซ้ำซ้อน
- ข้อมูลในฐานข้อมูลซ้ำกัน

### **สาเหตุของปัญหา**
1. **การเรียก API ซ้ำซ้อน**: 
   - ครั้งแรก: เรียก `/api/orgcode3` เพื่อสร้าง requisition
   - ครั้งที่สอง: เรียก `/api/requisitions` เพื่อสร้าง requisition items แต่ API นี้มี logic ที่สร้าง requisition ใหม่ด้วย

2. **Logic ใน API `/api/requisitions` ไม่ถูกต้อง**:
   - เมื่อส่ง `requisitionId` ไป API นี้จะสร้าง requisition items
   - แต่ถ้าไม่มี `requisitionId` จะสร้าง requisition ใหม่

## ✅ **วิธีแก้ไข**

### **1. ปรับปรุง OrgCode3Service**

```typescript
// เพิ่ม parameter items ในฟังก์ชัน createRequisitionWithSiteId
static async createRequisitionWithSiteId(
  userId: string,
  totalAmount: number,
  issueNote?: string,
  siteId?: string,
  items?: Array<{
    PRODUCT_ID: number
    QUANTITY: number
    UNIT_PRICE: number
    TOTAL_PRICE: number
  }>
): Promise<number | null>
```

### **2. เพิ่มการสร้าง Requisition Items ใน OrgCode3Service**

```typescript
// สร้าง requisition items ถ้ามี
if (finalRequisitionId && items && items.length > 0) {
  console.log(`Creating ${items.length} requisition items for requisition ${finalRequisitionId}`)
  
  for (const item of items) {
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
}
```

### **3. อัปเดต API `/api/orgcode3`**

```typescript
// ส่ง REQUISITION_ITEMS ไปยัง OrgCode3Service
const requisitionId = await OrgCode3Service.createRequisitionWithSiteId(
  userId,
  totalAmount,
  issueNote,
  siteId,
  REQUISITION_ITEMS  // เพิ่ม parameter นี้
)
```

### **4. ลบการเรียก API `/api/requisitions` ซ้ำ**

```typescript
// ลบโค้ดนี้ออกจาก app/cart/page.tsx และ app/manager/cart/page.tsx
// สร้าง requisition items
if (result.requisitionId && requisitionData.REQUISITION_ITEMS.length > 0) {
  const itemsRes = await fetch("/stationaryhub/api/requisitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...requisitionData,
      requisitionId: result.requisitionId
    }),
  })
  
  if (!itemsRes.ok) {
    console.warn("Failed to create requisition items")
  }
}
```

### **5. ปรับปรุง API `/api/requisitions`**

```typescript
// เพิ่ม return statement เมื่อสร้าง requisition items
if (data.requisitionId) {
  console.log("Creating requisition items for existing ID:", data.requisitionId)
  
  if (data.REQUISITION_ITEMS && Array.isArray(data.REQUISITION_ITEMS)) {
    for (const item of data.REQUISITION_ITEMS) {
      await prisma.rEQUISITION_ITEMS.create({
        data: {
          REQUISITION_ID: data.requisitionId,
          PRODUCT_ID: item.PRODUCT_ID,
          QUANTITY: item.QUANTITY,
          UNIT_PRICE: item.UNIT_PRICE,
        }
      })
    }
  }
  
  return NextResponse.json({ success: true }, { status: 201 })  // เพิ่ม return นี้
}
```

## 🔧 **การเปลี่ยนแปลงที่สำคัญ**

### **ไฟล์ที่แก้ไข**:
1. **`lib/orgcode3-service.ts`**: เพิ่มการสร้าง requisition items
2. **`app/api/orgcode3/route.ts`**: ส่ง items ไปยัง OrgCode3Service
3. **`app/cart/page.tsx`**: ลบการเรียก API ซ้ำ
4. **`app/manager/cart/page.tsx`**: ลบการเรียก API ซ้ำ
5. **`app/api/requisitions/route.ts`**: เพิ่ม return statement

## 🧪 **การทดสอบ**

### **ขั้นตอนการทดสอบ**
1. เข้าสู่ระบบด้วย user account
2. เพิ่มสินค้าลงตะกร้า
3. กดปุ่ม "Submit Requisition"
4. ตรวจสอบในฐานข้อมูลว่ามี requisition เพียง 1 รายการ
5. ตรวจสอบว่า requisition items ถูกสร้างครบถ้วน

### **ผลลัพธ์ที่คาดหวัง**
- ✅ สร้าง requisition เพียง 1 รายการ
- ✅ สร้าง requisition items ครบถ้วน
- ✅ ไม่มีการเรียก API ซ้ำซ้อน
- ✅ ไม่มีข้อมูลซ้ำในฐานข้อมูล

## 📝 **หมายเหตุ**

- การแก้ไขนี้จะทำให้การสร้าง requisition มีประสิทธิภาพมากขึ้น
- ลดการเรียก API ที่ไม่จำเป็น
- ป้องกันการสร้างข้อมูลซ้ำในฐานข้อมูล
- ใช้ transaction ใน OrgCode3Service เพื่อความปลอดภัยของข้อมูล

## 🎯 **ผลลัพธ์**

หลังจากแก้ไขแล้ว:
- ✅ ไม่มีการสร้าง Order ซ้ำ
- ✅ การสร้าง requisition มีประสิทธิภาพมากขึ้น
- ✅ ข้อมูลในฐานข้อมูลถูกต้องและไม่ซ้ำ
- ✅ ลดการเรียก API ที่ไม่จำเป็น

