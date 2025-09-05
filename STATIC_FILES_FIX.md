# 🔧 การแก้ไขปัญหา Static Files 404

## 🚨 **ปัญหาที่เกิดขึ้น**

### **อาการของปัญหา**
- เกิด error 404 เมื่อโหลด static files:
  ```
  GET http://localhost:3000/stationaryhub/_next/static/css/app/layout.css?v=1756798654135 net::ERR_ABORTED 404 (Not Found)
  GET http://localhost:3000/stationaryhub/_next/static/chunks/app/cart/page.js net::ERR_ABORTED 404 (Not Found)
  GET http://localhost:3000/stationaryhub/_next/static/chunks/main-app.js?v=1756798654135 net::ERR_ABORTED 404 (Not Found)
  GET http://localhost:3000/stationaryhub/_next/static/chunks/app-pages-internals.js net::ERR_ABORTED 404 (Not Found)
  ```

### **สาเหตุของปัญหา**
1. **Base Path Configuration**: Next.js กำลังใช้ base path `/stationaryhub` ใน development mode
2. **Asset Prefix**: Static files ถูกโหลดจาก path ที่ไม่ถูกต้อง
3. **Environment Configuration**: การตั้งค่า environment variables ไม่เหมาะสมสำหรับ development

## ✅ **วิธีแก้ไข**

### **1. ปรับปรุง next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Base path configuration - ใช้เฉพาะใน production
  ...(process.env.NODE_ENV === 'production' && {
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub',
    assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub',
  }),
  
  // Development server configuration
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  
  // Experimental features
  experimental: {
    appDir: true,
    optimizeCss: process.env.NODE_ENV === 'production',
  },
  
  // Environment variables
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'http://localhost:3000/stationaryhub'),
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
    NEXTAUTH_URL_DEV: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'http://localhost:3000/stationaryhub',
    NEXTAUTH_URL_PROD: process.env.NEXTAUTH_URL || 'http://localhost:3001/stationaryhub',
  },
}
```

### **2. ปรับปรุง lib/base-path.ts**

```typescript
export const BASE_PATH = process.env.NODE_ENV === 'development' ? '' : (process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub');
```

### **3. การตั้งค่า Environment Variables**

#### **Development (.env.local)**
```bash
NODE_ENV=development
NEXT_PUBLIC_BASE_PATH=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

#### **Production (.env.production)**
```bash
NODE_ENV=production
NEXT_PUBLIC_BASE_PATH=/stationaryhub
NEXTAUTH_URL=http://localhost:3000/stationaryhub
NEXTAUTH_SECRET=your-secret-key-here
```

## 🔧 **การเปลี่ยนแปลงที่สำคัญ**

### **ไฟล์ที่แก้ไข**:
1. **`next.config.js`**: ปรับปรุงการตั้งค่า base path และ asset prefix
2. **`lib/base-path.ts`**: ปรับปรุงการกำหนด BASE_PATH ตาม environment

### **การปรับปรุง**:
- ✅ ปิดการใช้งาน base path ใน development mode
- ✅ ปิดการใช้งาน asset prefix ใน development mode
- ✅ ปรับปรุง environment variables ให้เหมาะสม
- ✅ เพิ่ม experimental features เพื่อแก้ไขปัญหา

## 🧪 **การทดสอบ**

### **ขั้นตอนการทดสอบ**
1. หยุด server ที่กำลังรันอยู่
2. ลบโฟลเดอร์ `.next` (ถ้ามี)
3. รัน `npm run dev`
4. เปิด browser ไปที่ `http://localhost:3000`
5. ตรวจสอบว่า static files โหลดได้ปกติ

### **ผลลัพธ์ที่คาดหวัง**
- ✅ ไม่มี error 404 สำหรับ static files
- ✅ หน้าเว็บโหลดได้ปกติ
- ✅ CSS และ JavaScript ทำงานได้
- ✅ ไม่มีปัญหาใน development mode

## 📝 **หมายเหตุ**

### **Development Mode**
- ไม่ใช้ base path
- Static files โหลดจาก root path
- URL: `http://localhost:3000`

### **Production Mode**
- ใช้ base path `/stationaryhub`
- Static files โหลดจาก `/stationaryhub/_next/static/`
- URL: `http://localhost:3000/stationaryhub`

## 🎯 **ผลลัพธ์**

หลังจากแก้ไขแล้ว:
- ✅ Static files โหลดได้ปกติใน development
- ✅ ไม่มี error 404 อีกต่อไป
- ✅ การพัฒนาเว็บไซต์สะดวกขึ้น
- ✅ Production deployment ยังคงทำงานได้ปกติ

## 🔄 **การ Deploy**

เมื่อ deploy ไป production:
1. ตั้งค่า `NODE_ENV=production`
2. ตั้งค่า `NEXT_PUBLIC_BASE_PATH=/stationaryhub`
3. รัน `npm run build`
4. รัน `npm start`

ระบบจะใช้ base path และ asset prefix ตามที่กำหนดไว้



