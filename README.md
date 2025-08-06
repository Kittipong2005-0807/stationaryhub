# Stationary Hub - ระบบจัดการเบิกจ่ายวัสดุสิ้นเปลือง

## 🚀 การติดตั้ง

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables
สร้างไฟล์ `.env.local` และเพิ่ม:
```env
# LDAP Configuration
LDAP_URI=ldap://your-ldap-server:389

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3001

# Database Configuration
DATABASE_URL="sqlserver://localhost:1433;database=StationeryDB;user=your_username;password=your_password;trustServerCertificate=true"
```

### 3. รัน Database Migration
```bash
npx prisma generate
npx prisma db push
```

### 4. รัน Development Server
```bash
npm run dev
```

## 🔐 การ Authentication

ระบบใช้ LDAP Authentication ผ่าน NextAuth.js

### รูปแบบการ Bind ที่รองรับ:
- `username@ube.co.th` (userPrincipalName)
- `username` (Simple)
- `CN=username,OU=Users,DC=ube,DC=co,DC=th` (Distinguished Name)

## 📊 ฟีเจอร์หลัก

### 1. **ระบบ Authentication**
- ✅ LDAP Authentication
- ✅ Session Management
- ✅ Role-based Access Control
- ✅ User Profile Management

### 2. **ระบบจัดการสินค้า**
- ✅ ดูรายการสินค้า
- ✅ ค้นหาและกรองสินค้า
- ✅ เพิ่มสินค้าลงตะกร้า

### 3. **ระบบจัดการคำขอ**
- ✅ สร้างคำขอเบิกจ่าย
- ✅ อนุมัติคำขอ
- ✅ ติดตามสถานะ

### 4. **ระบบจัดการผู้ใช้**
- ✅ จัดการ Role และ Permission
- ✅ ดูประวัติการใช้งาน
- ✅ จัดการข้อมูลผู้ใช้

## 🛠️ เทคโนโลยีที่ใช้

- **Frontend**: Next.js 14, React, TypeScript
- **UI Framework**: Material-UI (MUI)
- **Authentication**: NextAuth.js
- **Database**: SQL Server, Prisma ORM
- **LDAP**: ldapjs
- **Styling**: Tailwind CSS

## 📁 โครงสร้างโปรเจค

```
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── login/             # หน้า Login
│   ├── admin/             # หน้า Admin
│   ├── manager/           # หน้า Manager
│   └── page.tsx           # หน้าหลัก
├── lib/                   # Utilities และ Configurations
│   ├── authOptions.ts     # NextAuth Configuration
│   ├── prisma.ts          # Database Connection
│   └── ...
├── components/            # React Components
├── prisma/               # Database Schema
└── scripts/              # Database Scripts
```

## 🔧 การแก้ไขปัญหา

### LDAP Authentication Issues
1. ตรวจสอบ LDAP_URI ใน .env.local
2. ตรวจสอบ username และ password
3. ตรวจสอบการเชื่อมต่อ network

### Database Issues
1. ตรวจสอบ DATABASE_URL
2. รัน `npx prisma generate`
3. ตรวจสอบ database schema

## 📞 การติดต่อ

หากมีปัญหาหรือคำถาม กรุณาติดต่อทีมพัฒนา
