# ฟีเจอร์ตัวเลขแสดงจำนวนคำขอที่ Manager อนุมัติแล้ว

## ภาพรวม
ฟีเจอร์นี้จะแสดงตัวเลขบนปุ่ม "Approvals" ของ Admin เพื่อระบุจำนวนคำขอที่ Manager อนุมัติแล้ว เหมือนกับปุ่มแจ้งเตือนรูปกระดิ่ง

## ไฟล์ที่เกี่ยวข้อง

### 1. API Endpoint
- **`app/api/approvals/count/route.ts`** - API สำหรับดึงจำนวนคำขอที่ manager อนุมัติแล้ว

### 2. Hook
- **`src/hooks/use-approved-count.ts`** - Hook สำหรับดึงและจัดการข้อมูลจำนวนคำขอที่อนุมัติแล้ว

### 3. Layout Component
- **`components/Layout.tsx`** - แก้ไขเพื่อเพิ่มตัวเลขบนปุ่ม Approvals สำหรับ Admin

## การทำงาน

### 1. การแสดงตัวเลข
- ตัวเลขจะแสดงเฉพาะสำหรับ Admin เท่านั้น
- ตัวเลขจะแสดงจำนวนคำขอที่มี STATUS = 'APPROVED'
- ตัวเลขจะแสดงในรูปแบบ Badge เหมือนกับปุ่มแจ้งเตือน

### 2. การอัปเดตตัวเลข
- ตัวเลขจะอัปเดตอัตโนมัติเมื่อ Admin เข้าสู่ระบบ
- ตัวเลขจะแสดงจำนวนทั้งหมดของคำขอที่อนุมัติแล้ว

### 3. การเข้าถึง
- เฉพาะ Admin เท่านั้นที่สามารถเห็นตัวเลขนี้
- Manager และ User จะไม่เห็นตัวเลขนี้

## โครงสร้างข้อมูล

### API Response
```json
{
  "success": true,
  "data": {
    "approvedCount": 5
  }
}
```

### Hook Return
```typescript
{
  approvedCount: number,
  loading: boolean,
  error: string | null,
  refreshCount: () => void
}
```

## การใช้งาน

### ใน Layout Component
```typescript
const { approvedCount } = useApprovedCount()

// ใน getNavigationItems สำหรับ ADMIN
{ 
  label: "Approvals", 
  path: "/approvals", 
  icon: Assignment, 
  badge: approvedCount 
}
```

## การพัฒนาต่อ

### ฟีเจอร์ที่อาจเพิ่มในอนาคต
1. **การรีเซ็ตตัวเลขเมื่อ Admin เข้าดูหน้า Approvals**
   - เพิ่มฟิลด์ `ADMIN_VIEWED_AT` ในตาราง REQUISITIONS
   - รีเซ็ตตัวเลขเมื่อ Admin เข้าดูหน้า Approvals

2. **การแจ้งเตือนแบบ Real-time**
   - ใช้ WebSocket หรือ Server-Sent Events
   - อัปเดตตัวเลขแบบ Real-time เมื่อมีคำขอใหม่

3. **การกรองตามช่วงเวลา**
   - แสดงจำนวนคำขอที่อนุมัติในวันนี้/สัปดาห์นี้/เดือนนี้

## การทดสอบ

### ทดสอบการแสดงตัวเลข
1. เข้าสู่ระบบด้วยบัญชี Admin
2. ตรวจสอบว่าตัวเลขแสดงบนปุ่ม Approvals
3. ตรวจสอบว่าตัวเลขตรงกับจำนวนคำขอที่ STATUS = 'APPROVED'

### ทดสอบการอัปเดต
1. ให้ Manager อนุมัติคำขอใหม่
2. ตรวจสอบว่าตัวเลขอัปเดตอัตโนมัติ

### ทดสอบการเข้าถึง
1. เข้าสู่ระบบด้วยบัญชี Manager
2. ตรวจสอบว่าไม่เห็นตัวเลขบนปุ่ม Approvals
3. เข้าสู่ระบบด้วยบัญชี User
4. ตรวจสอบว่าไม่เห็นตัวเลขบนปุ่ม Approvals

## หมายเหตุ
- ฟีเจอร์นี้ใช้วิธีง่ายๆ โดยการนับจำนวนคำขอทั้งหมดที่มี STATUS = 'APPROVED'
- ในอนาคตอาจจะเพิ่มฟิลด์ `ADMIN_VIEWED_AT` เพื่อรีเซ็ตตัวเลขเมื่อ Admin เข้าดูหน้า Approvals
- ตัวเลขจะอัปเดตเมื่อ Admin เข้าสู่ระบบใหม่เท่านั้น (ไม่ใช่ Real-time)
