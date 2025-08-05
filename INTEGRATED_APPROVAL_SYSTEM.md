# ระบบการอนุมัติแบบรวม (Integrated Approval System)

## ภาพรวม
ระบบได้ถูกปรับปรุงให้รวมความเชื่อมโยงระหว่างตาราง `APPROVALS` และ `STATUS_HISTORY` เข้าด้วยกัน โดยใช้ `ApprovalService` เป็นตัวกลางในการจัดการ

## ความเชื่อมโยงระหว่างตาราง

### 1. โครงสร้างความสัมพันธ์
```
REQUISITIONS (1) ←→ (N) APPROVALS
REQUISITIONS (1) ←→ (N) STATUS_HISTORY
USERS (1) ←→ (N) APPROVALS
USERS (1) ←→ (N) STATUS_HISTORY
```

### 2. หน้าที่ของแต่ละตาราง

#### APPROVALS Table
- **วัตถุประสงค์**: เก็บข้อมูลการอนุมัติหลัก
- **ข้อมูลที่เก็บ**:
  - `APPROVAL_ID`: ID การอนุมัติ
  - `REQUISITION_ID`: ID ของ requisition
  - `APPROVED_BY`: ผู้ที่อนุมัติ
  - `STATUS`: สถานะการอนุมัติ (APPROVED/REJECTED)
  - `APPROVED_AT`: เวลาที่อนุมัติ
  - `NOTE`: หมายเหตุการอนุมัติ

#### STATUS_HISTORY Table
- **วัตถุประสงค์**: เก็บประวัติการเปลี่ยนแปลงสถานะ
- **ข้อมูลที่เก็บ**:
  - `STATUS_ID`: ID ประวัติสถานะ
  - `REQUISITION_ID`: ID ของ requisition
  - `STATUS`: สถานะที่เปลี่ยนแปลง
  - `CHANGED_BY`: ผู้ที่เปลี่ยนแปลง
  - `CHANGED_AT`: เวลาที่เปลี่ยนแปลง
  - `COMMENT`: หมายเหตุการเปลี่ยนแปลง

## ApprovalService - ตัวกลางในการจัดการ

### หน้าที่หลัก
1. **รวมการทำงาน**: จัดการทั้ง `APPROVALS` และ `STATUS_HISTORY` พร้อมกัน
2. **Transaction Safety**: ใช้ database transaction เพื่อความปลอดภัยของข้อมูล
3. **Consistency**: รักษาความสอดคล้องของข้อมูลระหว่างตาราง

### ฟังก์ชันหลัก

#### `createApproval(approvalData)`
```typescript
// สร้างการอนุมัติใหม่พร้อมบันทึกประวัติ
const result = await ApprovalService.createApproval({
  REQUISITION_ID: 123,
  APPROVED_BY: "manager001",
  STATUS: "APPROVED",
  NOTE: "Approved with conditions"
})
```

#### `getLatestStatus(requisitionId)`
```typescript
// ดึงสถานะล่าสุดจาก APPROVALS
const status = await ApprovalService.getLatestStatus(123)
// Returns: "APPROVED" | "REJECTED" | "PENDING"
```

#### `getApprovalHistory(requisitionId)`
```typescript
// ดึงประวัติการอนุมัติทั้งหมด
const approvals = await ApprovalService.getApprovalHistory(123)
```

#### `getStatusHistory(requisitionId)`
```typescript
// ดึงประวัติการเปลี่ยนแปลงสถานะทั้งหมด
const history = await ApprovalService.getStatusHistory(123)
```

## API Routes ที่ปรับปรุง

### 1. `/api/requisitions/[id]/approve` (POST)
- **หน้าที่**: สร้างการอนุมัติใหม่
- **การทำงาน**: ใช้ `ApprovalService.createApproval()`
- **ผลลัพธ์**: บันทึกข้อมูลในทั้ง `APPROVALS` และ `STATUS_HISTORY`

### 2. `/api/requisitions` (GET)
- **หน้าที่**: ดึงข้อมูล requisitions ทั้งหมด
- **การทำงาน**: ใช้ `ApprovalService.getAllRequisitionsWithStatus()`
- **ผลลัพธ์**: แสดงสถานะล่าสุดจาก `APPROVALS`

### 3. `/api/requisitions/[id]` (GET)
- **หน้าที่**: ดึงข้อมูล requisition เฉพาะ
- **การทำงาน**: ใช้ `ApprovalService.getRequisitionWithHistory()`
- **ผลลัพธ์**: แสดงข้อมูลพร้อมประวัติการอนุมัติ

### 4. `/api/requisitions/[id]/approvals` (GET)
- **หน้าที่**: ดึงประวัติการอนุมัติ
- **การทำงาน**: ใช้ `ApprovalService.getApprovalHistory()`

### 5. `/api/requisitions/[id]/status-history` (GET) - ใหม่
- **หน้าที่**: ดึงประวัติการเปลี่ยนแปลงสถานะ
- **การทำงาน**: ใช้ `ApprovalService.getStatusHistory()`

## ประโยชน์ของการรวมระบบ

### 1. ความสมบูรณ์ของข้อมูล
- ✅ เก็บข้อมูลการอนุมัติใน `APPROVALS`
- ✅ เก็บประวัติการเปลี่ยนแปลงใน `STATUS_HISTORY`
- ✅ ข้อมูลสอดคล้องกันระหว่างตาราง

### 2. ความปลอดภัย
- ✅ ใช้ database transaction
- ✅ ข้อมูลไม่สูญหายหากเกิดข้อผิดพลาด
- ✅ การ rollback อัตโนมัติ

### 3. ความยืดหยุ่น
- ✅ สามารถดึงข้อมูลจากทั้งสองตาราง
- ✅ รองรับการขยายฟีเจอร์ในอนาคต
- ✅ แยกความรับผิดชอบของแต่ละตาราง

### 4. การตรวจสอบ
- ✅ ตรวจสอบประวัติการอนุมัติได้
- ✅ ตรวจสอบประวัติการเปลี่ยนแปลงสถานะได้
- ✅ ตรวจสอบผู้ที่เกี่ยวข้องได้

## การใช้งาน

### สำหรับ Manager
1. เข้าไปที่หน้า Approvals
2. กด "Approve" หรือ "Reject"
3. ระบบจะบันทึกข้อมูลในทั้ง `APPROVALS` และ `STATUS_HISTORY`
4. สถานะจะถูกอัปเดตอัตโนมัติ

### สำหรับ Developer
```typescript
// ใช้ ApprovalService โดยตรง
import { ApprovalService } from "@/lib/approval-service"

// สร้างการอนุมัติ
const result = await ApprovalService.createApproval(approvalData)

// ดึงสถานะล่าสุด
const status = await ApprovalService.getLatestStatus(requisitionId)

// ดึงประวัติทั้งหมด
const history = await ApprovalService.getRequisitionWithHistory(requisitionId)
```

## การ Migration
- ข้อมูลเก่าจะยังคงอยู่ในตารางเดิม
- ระบบใหม่จะใช้ `ApprovalService` เป็นหลัก
- การแสดงผลใน UI ยังคงเหมือนเดิม
- API response format ยังคงเหมือนเดิม

## หมายเหตุ
- ระบบใช้ Prisma transaction เพื่อความปลอดภัย
- การแสดงผลใน UI แสดงข้อมูลจากทั้งสองตาราง
- สามารถขยายฟีเจอร์ได้ง่ายในอนาคต 