# การเปลี่ยนแปลงระบบการอนุมัติ (Approval System Changes)

## ภาพรวม
ระบบได้ถูกปรับปรุงให้ใช้ตาราง `APPROVALS` เป็นหลักในการจัดการสถานะการอนุมัติ แทนการอัปเดตฟิลด์ `STATUS` ในตาราง `REQUISITIONS` โดยตรง

## การเปลี่ยนแปลงหลัก

### 1. ตารางที่ใช้เก็บสถานะ
- **เดิม**: ใช้ฟิลด์ `STATUS` ในตาราง `REQUISITIONS`
- **ใหม่**: ใช้ตาราง `APPROVALS` แยกต่างหาก

### 2. โครงสร้างข้อมูลใหม่
```sql
-- ตาราง APPROVALS
APPROVAL_ID (Primary Key)
REQUISITION_ID (Foreign Key)
APPROVED_BY (ผู้ที่อนุมัติ)
STATUS (APPROVED/REJECTED)
APPROVED_AT (เวลาที่อนุมัติ)
NOTE (หมายเหตุ)
```

### 3. API Routes ที่ปรับปรุง

#### `/api/requisitions/[id]/approve` (POST)
- **เดิม**: อัปเดต `STATUS` ใน `REQUISITIONS`
- **ใหม่**: สร้าง record ใหม่ใน `APPROVALS`

#### `/api/requisitions` (GET)
- **เดิม**: ดึง `STATUS` จาก `REQUISITIONS`
- **ใหม่**: ดึงสถานะล่าสุดจาก `APPROVALS`

#### `/api/requisitions/[id]` (GET)
- **เดิม**: ดึง `STATUS` จาก `REQUISITIONS`
- **ใหม่**: ดึงสถานะล่าสุดจาก `APPROVALS`

### 4. ฟังก์ชันใหม่
```typescript
// ฟังก์ชันดึงสถานะล่าสุดจากตาราง APPROVALS
async function getLatestStatus(requisitionId: number) {
  const latestApproval = await prisma.aPPROVALS.findFirst({
    where: { REQUISITION_ID: requisitionId },
    orderBy: { APPROVED_AT: "desc" }
  })
  
  return latestApproval?.STATUS || "PENDING"
}
```

## ประโยชน์ของการเปลี่ยนแปลง

### 1. ประวัติการอนุมัติ
- สามารถติดตามประวัติการอนุมัติได้ครบถ้วน
- เก็บข้อมูลผู้ที่อนุมัติและเวลาที่อนุมัติ
- รองรับการอนุมัติหลายครั้ง

### 2. ความยืดหยุ่น
- แยกข้อมูลการอนุมัติออกจากข้อมูลหลัก
- สามารถเพิ่มฟิลด์ใหม่ได้ง่าย
- รองรับการอนุมัติหลายระดับ

### 3. การตรวจสอบ
- สามารถตรวจสอบประวัติการอนุมัติได้
- เก็บหมายเหตุการอนุมัติ
- ตรวจสอบผู้ที่อนุมัติได้

## การใช้งาน

### สำหรับ Manager
1. เข้าไปที่หน้า Approvals
2. กด "Approve" หรือ "Reject"
3. ระบบจะบันทึกข้อมูลในตาราง `APPROVALS`
4. สถานะจะถูกอัปเดตอัตโนมัติ

### สำหรับ User
1. ดูสถานะ requisition ได้เหมือนเดิม
2. สถานะจะแสดงจากข้อมูลล่าสุดใน `APPROVALS`
3. ถ้าไม่มีข้อมูลใน `APPROVALS` จะแสดงเป็น "PENDING"

## การ Migration
- ข้อมูลเก่าจะยังคงอยู่ในตาราง `REQUISITIONS`
- ระบบใหม่จะใช้ข้อมูลจาก `APPROVALS` เป็นหลัก
- ถ้าไม่มีข้อมูลใน `APPROVALS` จะใช้ "PENDING" เป็นค่าเริ่มต้น

## หมายเหตุ
- ระบบยังคงเก็บข้อมูลใน `STATUS_HISTORY` เพื่อประวัติการเปลี่ยนแปลง
- การแสดงผลใน UI ยังคงเหมือนเดิม
- API response format ยังคงเหมือนเดิม 