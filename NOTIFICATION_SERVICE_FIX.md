# 🔧 การแก้ไขปัญหา NotificationService - Invalid column name 'USER_ID'

## 🚨 **ปัญหาที่พบ**

### **1. Error หลัก**
```typescript
prisma:error Invalid column name 'USER_ID'.
prisma:query
        SELECT USER_ID, CurrentEmail, FullNameThai, AdLoginName
        FROM userWithRoles
        WHERE PostNameEng LIKE '%Admin%' OR PostNameEng LIKE '%Manager%'
```

### **2. สาเหตุของปัญหา**
- **`userWithRoles` view** ไม่มีคอลัมน์ `USER_ID`
- **NotificationService** พยายามใช้คอลัมน์ที่ไม่มีอยู่
- **Email notifications** ไม่สามารถทำงานได้

## ✅ **สิ่งที่แก้ไขแล้ว**

### **1. แก้ไข Query ใน notifyAdmins**
```typescript
// ก่อนแก้ไข (ผิด)
const admins = await prisma.$queryRaw<{ USER_ID: string, CurrentEmail: string, FullNameThai: string, AdLoginName: string }[]>`
  SELECT USER_ID, CurrentEmail, FullNameThai, AdLoginName
  FROM userWithRoles 
  WHERE PostNameEng LIKE '%Admin%' OR PostNameEng LIKE '%Manager%'
`

// หลังแก้ไข (ถูกต้อง)
const admins = await prisma.$queryRaw<{ CurrentEmail: string, FullNameThai: string, AdLoginName: string }[]>`
  SELECT CurrentEmail, FullNameThai, AdLoginName
  FROM userWithRoles 
  WHERE PostNameEng LIKE '%Admin%' OR PostNameEng LIKE '%Manager%'
`
```

### **2. แก้ไข Query ใน notifyManagers**
```typescript
// ก่อนแก้ไข (ผิด)
const generalManagers = await prisma.$queryRaw<{ USER_ID: string, CurrentEmail: string, AdLoginName: string }[]>`
  SELECT USER_ID, CurrentEmail, AdLoginName
  FROM userWithRoles 
  WHERE PostNameEng LIKE '%Manager%' OR PostNameEng LIKE '%หัวหน้า%'
`

// หลังแก้ไข (ถูกต้อง)
const generalManagers = await prisma.$queryRaw<{ CurrentEmail: string, AdLoginName: string }[]>`
  SELECT CurrentEmail, AdLoginName
  FROM userWithRoles 
  WHERE PostNameEng LIKE '%Manager%' OR PostNameEng LIKE '%หัวหน้า%'
`
```

### **3. ปรับปรุง getUserEmailFromLDAP**
```typescript
// เพิ่มการค้นหาด้วย EmpCode หากไม่เจอด้วย AdLoginName
static async getUserEmailFromLDAP(userId: string): Promise<string | null> {
  try {
    console.log(`🔍 Searching for email of user: ${userId}`)
    
    // ลองค้นหาด้วย AdLoginName ก่อน
    let user = await prisma.$queryRaw<{ CurrentEmail: string }[]>`
      SELECT CurrentEmail FROM userWithRoles WHERE AdLoginName = ${userId}
    `
    
    // ถ้าไม่เจอ ให้ลองค้นหาด้วย EmpCode
    if (!user || user.length === 0) {
      console.log(`🔍 AdLoginName not found, trying EmpCode: ${userId}`)
      user = await prisma.$queryRaw<{ CurrentEmail: string }[]>`
        SELECT CurrentEmail FROM userWithRoles WHERE EmpCode = ${userId}
      `
    }
    
    // ... rest of the function
  } catch (error) {
    console.error(`❌ Error fetching email for ${userId}:`, error)
    return null
  }
}
```

## 🔍 **โครงสร้างของ userWithRoles view**

### **คอลัมน์ที่มีอยู่จริง**
```sql
SELECT
  CAST(ADLoginName AS VARCHAR(50)) AS AdLoginName,
  CAST(EmpCode AS VARCHAR(50)) AS EmpCode,
  CAST(CurrentEmail AS VARCHAR(100)) AS CurrentEmail,
  CAST(FullNameEng AS VARCHAR(100)) AS FullNameEng,
  CAST(FullNameThai AS VARCHAR(100)) AS FullNameThai,
  CAST(PostNameEng AS VARCHAR(100)) AS PostNameEng,
  CAST(costcentereng AS VARCHAR(100)) AS CostCenterEng,
  OrgCode3
FROM
  THRYGSD002.ICTPortal_PRD.dbo.vwHR_SC_Employee AS u;
```

### **คอลัมน์ที่ไม่มี (ที่เคยใช้ผิด)**
- ❌ `USER_ID` - ไม่มีใน view
- ❌ `id` - ไม่มีใน view

### **คอลัมน์ที่ใช้ได้ (ที่แก้ไขแล้ว)**
- ✅ `AdLoginName` - ชื่อ login
- ✅ `EmpCode` - รหัสพนักงาน
- ✅ `CurrentEmail` - อีเมลปัจจุบัน
- ✅ `FullNameThai` - ชื่อภาษาไทย
- ✅ `PostNameEng` - ตำแหน่งงาน

## 📋 **ไฟล์ที่แก้ไข**

### **1. ไฟล์หลัก**
- `lib/notification-service.ts` - แก้ไข queries และ getUserEmailFromLDAP

### **2. การเปลี่ยนแปลง**
- **ลบคอลัมน์ `USER_ID`** ออกจาก queries ทั้งหมด
- **ปรับปรุง getUserEmailFromLDAP** ให้ค้นหาด้วย EmpCode ได้
- **แก้ไข TypeScript types** ให้ตรงกับโครงสร้างจริง

## 🧪 **วิธีทดสอบ**

### **ขั้นตอนที่ 1: ทดสอบ Email Notifications**
1. **สร้าง requisition ใหม่**
2. **ให้ Manager approve**
3. **ดู Console Logs** ว่ามี error หรือไม่

### **ขั้นตอนที่ 2: ตรวจสอบ Console**
```typescript
// ควรเห็น logs แบบนี้ (ไม่มี error)
🔍 Searching for email of user: 9C154
🔍 AdLoginName not found, trying EmpCode: 9C154
✅ Found email for 9C154: kittipong@ube.co.th
```

### **ขั้นตอนที่ 3: ตรวจสอบ Email**
- **User ควรได้รับ email** เมื่อ requisition ถูก approve
- **Manager ควรได้รับ email** เมื่อมี requisition ใหม่
- **Admin ควรได้รับ email** เมื่อมีการอนุมัติ

## ⚠️ **สิ่งที่ต้องตรวจสอบ**

### **1. Database View**
- **`userWithRoles` view** ต้องมีข้อมูลครบถ้วน
- **`CurrentEmail`** ต้องไม่เป็น null
- **`EmpCode` และ `AdLoginName`** ต้องตรงกับข้อมูลในระบบ

### **2. SMTP Settings**
- **SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS** ต้องถูกต้อง
- **Network** ต้องเชื่อมต่อได้
- **Firewall** ต้องอนุญาต port 587

### **3. User Data**
- **User ในระบบ** ต้องมีข้อมูลใน `userWithRoles`
- **Email addresses** ต้องถูกต้องและใช้งานได้

## 🎯 **ผลลัพธ์ที่คาดหวัง**

### **✅ หลังแก้ไข**
- **ไม่มี error** เกี่ยวกับ `Invalid column name 'USER_ID'`
- **Email notifications** ทำงานได้ปกติ
- **ระบบแจ้งเตือน** ทำงานได้ครบถ้วน
- **Logs แสดงข้อมูล** ที่ถูกต้อง

### **✅ การทำงานที่คาดหวัง**
1. **User สร้าง requisition** → Manager ได้รับ email
2. **Manager approve requisition** → User ได้รับ email
3. **Admin ได้รับ notification** เมื่อมีการอนุมัติ
4. **ระบบบันทึก logs** ลงฐานข้อมูล

## 🚀 **การพัฒนาต่อ**

### **ฟีเจอร์ที่อาจเพิ่ม**
1. **📧 Email Templates** ที่สวยงามมากขึ้น
2. **🔔 Push Notifications** ในแอป
3. **📱 SMS Notifications** สำหรับกรณีฉุกเฉิน
4. **📊 Notification Analytics** - สถิติการส่ง
5. **⚙️ Notification Settings** - ให้ user เลือกประเภทการแจ้งเตือน

## 📝 **สรุป**

การแก้ไขนี้ทำให้:
- **NotificationService** ทำงานได้โดยไม่มี error
- **Email notifications** ส่งได้ปกติ
- **ระบบแจ้งเตือน** ทำงานได้ครบถ้วน
- **Queries** ใช้คอลัมน์ที่ถูกต้องตามโครงสร้างจริง

ตอนนี้ระบบแจ้งเตือนควรจะทำงานได้ปกติแล้วครับ! 🎉
