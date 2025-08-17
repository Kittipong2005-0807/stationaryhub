# Stationary Hub - ระบบจัดการเบิกจ่ายวัสดุสินเปลือง

## 🚀 การติดตั้ง

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables
สร้างไฟล์ `.env.local` และเพิ่ม:
```env
# Database Configuration
DATABASE_URL="sqlserver://localhost:1433;database=StationeryDB;user=your_username;password=your_password;trustServerCertificate=true"

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3001

# LDAP Configuration
LDAP_URI=ldap://your-ldap-server:389
LDAP_BIND_DN=your-bind-dn
LDAP_BIND_PASSWORD=your-bind-password
LDAP_BASE_DN=DC=ube,DC=co,DC=th

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Performance Configuration
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=development

# Security Configuration
CORS_ORIGIN=http://localhost:3001
```

### 3. รัน Database Migration
```bash
npm run db:generate
npm run db:push
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

- **Frontend**: Next.js 14.2.31, React 18, TypeScript 5
- **UI Framework**: Material-UI (MUI) 5.18.0
- **Authentication**: NextAuth.js
- **Database**: SQL Server, Prisma ORM
- **LDAP**: ldapjs
- **Styling**: Tailwind CSS 3.4.17

## ⚡ Performance Optimizations

### **1. Next.js Optimizations**
- SWC Minification
- Image optimization (WebP, AVIF)
- Bundle splitting และ code splitting
- Tree shaking
- Lazy loading components

### **2. CSS Optimizations**
- Tailwind CSS JIT compilation
- CSS minification (cssnano)
- Critical CSS extraction
- CSS purging

### **3. JavaScript Optimizations**
- ES2022 target
- Module bundling optimization
- Dead code elimination
- Performance monitoring utilities

### **4. Build Optimizations**
- Webpack bundle analyzer
- Bundle size monitoring
- Tree shaking optimization
- Code splitting strategies

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
│   ├── performance.ts     # Performance utilities
│   └── ...
├── components/            # React Components
├── prisma/               # Database Schema
├── scripts/              # Database Scripts
└── types/                # TypeScript types
```

## 🧪 Testing

```bash
# รัน tests
npm test

# รัน tests แบบ watch mode
npm run test:watch

# รัน tests พร้อม coverage
npm run test:coverage
```

## 🔧 Scripts ที่มี

```bash
# Development
npm run dev              # รัน development server
npm run build            # Build สำหรับ production
npm run start            # รัน production server

# Code Quality
npm run lint             # ตรวจสอบ code quality
npm run lint:fix         # แก้ไข code quality อัตโนมัติ
npm run type-check       # ตรวจสอบ TypeScript types

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema ไป database
npm run db:studio        # เปิด Prisma Studio
npm run db:migrate       # รัน database migration
npm run db:reset         # Reset database

# Performance
npm run analyze          # วิเคราะห์ bundle size
npm run clean            # ลบ build files
```

## 🚀 Performance Monitoring

### **Bundle Analysis**
```bash
npm run analyze
```

### **Performance Metrics**
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- First Input Delay (FID)

### **Memory Usage**
- Heap size monitoring
- Memory leak detection
- Performance profiling

## 🔒 Security Features

- XSS Protection
- CSRF Protection
- Content Security Policy
- Secure Headers
- LDAP Authentication
- Role-based Access Control

## 📈 Monitoring และ Analytics

- Performance monitoring
- Error tracking
- User analytics
- Bundle size tracking
- Memory usage monitoring

## 🔧 การแก้ไขปัญหา

### LDAP Authentication Issues
1. ตรวจสอบ LDAP_URI ใน .env.local
2. ตรวจสอบ username และ password
3. ตรวจสอบการเชื่อมต่อ network

### Database Issues
1. ตรวจสอบ DATABASE_URL
2. รัน `npm run db:generate`
3. ตรวจสอบ database schema

### Performance Issues
1. ตรวจสอบ bundle size ด้วย `npm run analyze`
2. ตรวจสอบ memory usage
3. ตรวจสอบ network requests

## 📞 การติดต่อ

หากมีปัญหาหรือคำถาม กรุณาติดต่อทีมพัฒนา

## 📝 Changelog

### v0.1.0 (2025-08-17)
- ✅ แก้ไขปัญหาความปลอดภัย Next.js
- ✅ อัปเดต dependencies เป็นเวอร์ชันล่าสุด
- ✅ เพิ่ม performance optimizations
- ✅ ปรับปรุง TypeScript configuration
- ✅ เพิ่ม testing setup
- ✅ เพิ่ม performance monitoring utilities
- ✅ ปรับปรุง build optimization
- ✅ เพิ่ม security headers
- ✅ เพิ่ม CSS optimization
