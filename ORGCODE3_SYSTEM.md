# ระบบ OrgCode3 สำหรับการจัดการแผนก

## ภาพรวม

ระบบ OrgCode3 ถูกออกแบบมาเพื่อให้ User ส่งคำขอไปยัง Manager ที่อยู่ในแผนกเดียวกัน (มี orgcode3 เดียวกัน) โดยอัตโนมัติ

## โครงสร้างฐานข้อมูล

### ตาราง REQUISITIONS
- เพิ่มฟิลด์ `ORGCODE3 VARCHAR(50)` เพื่อเก็บรหัสแผนก

### ตาราง USERS  
- เพิ่มฟิลด์ `ORGCODE3 VARCHAR(50)` เพื่อเก็บรหัสแผนก

## การทำงานของระบบ

### 1. การดึงข้อมูล OrgCode3 จาก LDAP
```typescript
// ใน lib/authOptions.ts
token.orgcode3 = userData?.orgcode3;
```

### 2. การสร้าง Requisition พร้อม OrgCode3
```typescript
// ใช้ OrgCode3Service.createRequisitionWithOrgCode3()
const requisitionId = await OrgCode3Service.createRequisitionWithOrgCode3(
  userId,
  totalAmount,
  issueNote,
  siteId
)
```

### 3. การตรวจสอบสิทธิ์การอนุมัติ
```typescript
// ตรวจสอบว่า Manager สามารถอนุมัติ requisition ได้หรือไม่
const canApprove = await OrgCode3Service.canUserSubmitToManager(
  managerUserId,
  userUserId
)
```

## API Endpoints

### GET /api/orgcode3
- `action=getUserOrgCode3&userId={userId}` - ดึง orgcode3 ของ user
- `action=getAvailableManagers&userId={userId}` - ดึงรายการ Manager ที่มี orgcode3 เดียวกัน
- `action=getRequisitionsForManager&userId={managerId}` - ดึง requisitions ที่ Manager สามารถอนุมัติได้

### POST /api/orgcode3
- `action=createRequisition` - สร้าง requisition พร้อม orgcode3
- `action=updateUserOrgCode3` - อัปเดต orgcode3 ของ user
- `action=checkUserManagerRelationship` - ตรวจสอบความสัมพันธ์ User-Manager

## Service Classes

### OrgCode3Service
```typescript
// ดึง Manager ที่มี orgcode3 เดียวกัน
static async getManagersByOrgCode3(orgcode3: string): Promise<OrgCode3User[]>

// ดึง orgcode3 ของ user จาก LDAP
static async getUserOrgCode3(userId: string): Promise<string | null>

// สร้าง requisition พร้อม orgcode3
static async createRequisitionWithOrgCode3(
  userId: string,
  totalAmount: number,
  issueNote?: string,
  siteId?: string
): Promise<number | null>

// ตรวจสอบสิทธิ์การอนุมัติ
static async canUserSubmitToManager(userId: string, managerUserId: string): Promise<boolean>
```

## การใช้งาน

### สำหรับ User
1. เมื่อ User สร้าง requisition ใหม่ ระบบจะดึง orgcode3 จาก LDAP อัตโนมัติ
2. Requisition จะถูกส่งไปยัง Manager ที่มี orgcode3 เดียวกันเท่านั้น

### สำหรับ Manager
1. Manager จะเห็นเฉพาะ requisitions ที่มาจาก User ในแผนกเดียวกัน
2. ระบบจะตรวจสอบ orgcode3 ก่อนอนุญาตให้อนุมัติ

### สำหรับ Admin
1. สามารถดูข้อมูล orgcode3 ของทุก user ได้ที่ `/orgcode3-info`
2. สามารถจัดการความสัมพันธ์ User-Manager ได้

## การติดตั้ง

### 1. รัน SQL Script
```sql
-- เพิ่มฟิลด์ ORGCODE3 ในตาราง REQUISITIONS
ALTER TABLE REQUISITIONS ADD ORGCODE3 VARCHAR(50);

-- เพิ่มฟิลด์ ORGCODE3 ในตาราง USERS
ALTER TABLE USERS ADD ORGCODE3 VARCHAR(50);

-- สร้าง index
CREATE INDEX IX_REQUISITIONS_ORGCODE3 ON REQUISITIONS(ORGCODE3);
CREATE INDEX IX_USERS_ORGCODE3 ON USERS(ORGCODE3);
```

### 2. อัปเดต Prisma Schema
```prisma
model REQUISITIONS {
  // ... existing fields
  ORGCODE3 String? @db.VarChar(50)
}

model USERS {
  // ... existing fields  
  ORGCODE3 String? @db.VarChar(50)
}
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

## ข้อดีของระบบ

1. **ความปลอดภัย**: User สามารถส่งคำขอไปยัง Manager ในแผนกเดียวกันเท่านั้น
2. **อัตโนมัติ**: ไม่ต้องกำหนด Manager เอง ระบบจะเลือกให้อัตโนมัติ
3. **ยืดหยุ่น**: รองรับการเปลี่ยนแปลงโครงสร้างองค์กร
4. **ตรวจสอบได้**: มีระบบ audit trail ที่ชัดเจน

## การแก้ไขปัญหา

### ปัญหา: ไม่พบ orgcode3
**สาเหตุ**: ข้อมูลใน LDAP ไม่มี orgcode3 หรือการเชื่อมต่อ LDAP มีปัญหา
**วิธีแก้**: ตรวจสอบข้อมูลใน userWithRoles view และการเชื่อมต่อ LDAP

### ปัญหา: Manager ไม่เห็น requisitions
**สาเหตุ**: Manager และ User มี orgcode3 ต่างกัน
**วิธีแก้**: ตรวจสอบ orgcode3 ของทั้ง User และ Manager

### ปัญหา: ไม่สามารถอนุมัติได้
**สาเหตุ**: Manager ไม่มีสิทธิ์หรือ orgcode3 ไม่ตรงกัน
**วิธีแก้**: ตรวจสอบ Role และ orgcode3 ของ Manager 