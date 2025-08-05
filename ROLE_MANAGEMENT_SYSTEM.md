# ระบบจัดการ Role และ Permission (Role Management System)

## ภาพรวม
ระบบจัดการ Role และ Permission ที่ครอบคลุมและยืดหยุ่น ใช้สำหรับควบคุมการเข้าถึงฟีเจอร์ต่างๆ ของระบบ

## โครงสร้าง Role

### 1. User Roles
```typescript
enum UserRole {
  USER = "USER",           // ผู้ใช้ทั่วไป
  MANAGER = "MANAGER",     // ผู้จัดการ
  ADMIN = "ADMIN",         // ผู้ดูแลระบบ
  SUPER_ADMIN = "SUPER_ADMIN" // ผู้ดูแลระบบสูงสุด
}
```

### 2. Permissions
```typescript
enum Permission {
  // การจัดการ Requisition
  CREATE_REQUISITION = "CREATE_REQUISITION",
  VIEW_REQUISITION = "VIEW_REQUISITION",
  EDIT_REQUISITION = "EDIT_REQUISITION",
  DELETE_REQUISITION = "DELETE_REQUISITION",
  
  // การอนุมัติ
  APPROVE_REQUISITION = "APPROVE_REQUISITION",
  REJECT_REQUISITION = "REJECT_REQUISITION",
  VIEW_APPROVAL_HISTORY = "VIEW_APPROVAL_HISTORY",
  
  // การจัดการ User
  VIEW_USERS = "VIEW_USERS",
  CREATE_USER = "CREATE_USER",
  EDIT_USER = "EDIT_USER",
  DELETE_USER = "DELETE_USER",
  ASSIGN_ROLE = "ASSIGN_ROLE",
  
  // การจัดการ Product
  VIEW_PRODUCTS = "VIEW_PRODUCTS",
  CREATE_PRODUCT = "CREATE_PRODUCT",
  EDIT_PRODUCT = "EDIT_PRODUCT",
  DELETE_PRODUCT = "DELETE_PRODUCT",
  
  // การจัดการระบบ
  VIEW_SYSTEM_LOGS = "VIEW_SYSTEM_LOGS",
  EXPORT_DATA = "EXPORT_DATA",
  MANAGE_SETTINGS = "MANAGE_SETTINGS",
  
  // การรายงาน
  VIEW_REPORTS = "VIEW_REPORTS",
  GENERATE_REPORTS = "GENERATE_REPORTS",
  
  // การจัดการ Department
  VIEW_DEPARTMENTS = "VIEW_DEPARTMENTS",
  MANAGE_DEPARTMENTS = "MANAGE_DEPARTMENTS"
}
```

## การกำหนด Permission สำหรับแต่ละ Role

### USER
- ✅ สร้าง Requisition
- ✅ ดู Requisition ของตัวเอง
- ✅ ดู Products
- ✅ ดูรายงาน

### MANAGER
- ✅ สร้าง Requisition
- ✅ ดู Requisition ทั้งหมด
- ✅ แก้ไข Requisition
- ✅ อนุมัติ/ปฏิเสธ Requisition
- ✅ ดูประวัติการอนุมัติ
- ✅ ดู Products
- ✅ ดู Users
- ✅ ดูรายงาน
- ✅ สร้างรายงาน
- ✅ Export ข้อมูล
- ✅ ดู Departments

### ADMIN
- ✅ ทุก Permission ของ MANAGER
- ✅ ลบ Requisition
- ✅ สร้าง User
- ✅ แก้ไข User
- ✅ กำหนด Role
- ✅ สร้าง/แก้ไข/ลบ Product
- ✅ ดู System Logs
- ✅ จัดการ Settings
- ✅ จัดการ Departments

### SUPER_ADMIN
- ✅ ทุก Permission ในระบบ

## RoleManagementService

### ฟังก์ชันหลัก

#### ตรวจสอบ Permission
```typescript
// ตรวจสอบว่า User มี Permission หรือไม่
const hasPermission = await RoleManagementService.hasPermission(userId, Permission.APPROVE_REQUISITION)

// ตรวจสอบว่า User มี Role หรือไม่
const hasRole = await RoleManagementService.hasRole(userId, UserRole.MANAGER)

// ตรวจสอบว่า User มี Role ใดๆ ในรายการ
const hasAnyRole = await RoleManagementService.hasAnyRole(userId, [UserRole.MANAGER, UserRole.ADMIN])
```

#### ฟังก์ชันเฉพาะ
```typescript
// ตรวจสอบ Permission สำหรับการอนุมัติ
const canApprove = await RoleManagementService.canApproveRequisition(userId)

// ตรวจสอบ Permission สำหรับการดู Requisition
const canView = await RoleManagementService.canViewRequisition(userId)

// ตรวจสอบ Permission สำหรับการจัดการ User
const canManageUsers = await RoleManagementService.canManageUsers(userId)
```

#### การจัดการ Role
```typescript
// เปลี่ยน Role ของ User
const success = await RoleManagementService.assignRole(userId, UserRole.MANAGER, assignedBy, reason)

// ดึง Role ของ User
const role = await RoleManagementService.getUserRole(userId)

// ดึง Permissions ของ User
const permissions = await RoleManagementService.getUserPermissions(userId)
```

#### การดึงข้อมูล
```typescript
// ดึง Users ตาม Role
const users = await RoleManagementService.getUsersByRole(UserRole.MANAGER)

// ดึงสถิติ Role
const stats = await RoleManagementService.getRoleStatistics()
```

## API Routes

### 1. `/api/roles` (GET)
- **หน้าที่**: ดึงข้อมูล Role และ Permission
- **Parameters**:
  - `action=statistics` - ดึงสถิติ Role
  - `action=permissions` - ดึง Permissions ของ User ปัจจุบัน
  - `action=capabilities&role=MANAGER` - ดึง Capabilities ของ Role
  - `action=users&role=USER` - ดึง Users ตาม Role

### 2. `/api/roles` (POST)
- **หน้าที่**: กำหนด Role ให้ User
- **Body**:
  ```json
  {
    "targetUserId": "user123",
    "newRole": "MANAGER",
    "reason": "Promoted to manager"
  }
  ```

### 3. `/api/permissions/check` (GET)
- **หน้าที่**: ดึง Permissions ของ User ปัจจุบัน
- **Response**:
  ```json
  {
    "userRole": "MANAGER",
    "userPermissions": ["CREATE_REQUISITION", "APPROVE_REQUISITION", ...],
    "specificPermissions": {
      "canApprove": true,
      "canViewRequisition": true,
      "canCreateRequisition": true,
      "canManageUsers": false,
      "canManageProducts": false,
      "canViewReports": true,
      "canManageSystem": false
    }
  }
  ```

### 4. `/api/permissions/check` (POST)
- **หน้าที่**: ตรวจสอบ Permission เฉพาะ
- **Body**:
  ```json
  {
    "permission": "APPROVE_REQUISITION",
    "resourceId": "123"
  }
  ```

## การใช้งานใน Frontend

### ตรวจสอบ Permission
```typescript
// ตรวจสอบ Permission ก่อนแสดงปุ่ม
const canApprove = await fetch("/api/permissions/check", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ permission: "APPROVE_REQUISITION" })
}).then(res => res.json()).then(data => data.hasPermission)

if (canApprove) {
  // แสดงปุ่ม Approve
}
```

### ตรวจสอบ Role
```typescript
// ตรวจสอบ Role ก่อนเข้าถึงหน้า
const userPermissions = await fetch("/api/permissions/check").then(res => res.json())

if (userPermissions.specificPermissions.canManageUsers) {
  // แสดงหน้า User Management
}
```

## การปรับปรุง API Routes ที่มีอยู่

### `/api/requisitions/[id]/approve`
```typescript
// ตรวจสอบ Permission แทนการตรวจสอบ Role
const canApprove = await RoleManagementService.canApproveRequisition(userId)
if (!canApprove) {
  return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
}
```

## หน้า UI สำหรับจัดการ Role

### `/admin/roles`
- แสดงสถิติ Role ทั้งหมด
- แสดง Permissions ของ User ปัจจุบัน
- จัดการ Users และ Role
- เปลี่ยน Role ของ Users

## ประโยชน์ของระบบ

### 1. ความยืดหยุ่น
- ✅ กำหนด Permission ได้ละเอียด
- ✅ เพิ่ม Permission ใหม่ได้ง่าย
- ✅ สร้าง Role ใหม่ได้
- ✅ ตรวจสอบ Permission เฉพาะได้

### 2. ความปลอดภัย
- ✅ ตรวจสอบ Permission ทุกครั้ง
- ✅ แยก Permission ตามฟีเจอร์
- ✅ ควบคุมการเข้าถึงได้ละเอียด

### 3. การจัดการ
- ✅ ดูสถิติ Role ได้
- ✅ เปลี่ยน Role ได้ง่าย
- ✅ ติดตามการเปลี่ยนแปลงได้

### 4. การขยาย
- ✅ เพิ่ม Permission ใหม่ได้
- ✅ สร้าง Role ใหม่ได้
- ✅ ปรับ Permission ได้

## การ Migration
- ระบบเก่ายังคงทำงานได้
- เพิ่มระบบ Permission ใหม่
- ค่อยๆ ย้ายไปใช้ระบบใหม่
- รองรับการใช้งานทั้งสองระบบ

## หมายเหตุ
- ใช้ Prisma สำหรับจัดการข้อมูล
- ตรวจสอบ Permission ทุกครั้งที่เข้าถึง API
- บันทึกประวัติการเปลี่ยน Role
- รองรับการขยายในอนาคต 