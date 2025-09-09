# 🔧 การแก้ไขปัญหา Port และ Static Files

## 🚨 **ปัญหาที่เกิดขึ้น**

### **อาการของปัญหา**
1. **Port Mismatch**: Server รันที่ port 3001 แต่พยายามเข้าถึง port 3000
2. **Static Files 404**: Static files ไม่โหลดได้
   ```
   GET http://localhost:3000/stationaryhub/_next/static/css/app/layout.css?v=1756799609885 net::ERR_ABORTED 404 (Not Found)
   GET http://localhost:3000/stationaryhub/_next/static/chunks/main-app.js?v=1756799609885 net::ERR_ABORTED 404 (Not Found)
   GET http://localhost:3000/stationaryhub/_next/static/chunks/app-pages-internals.js net::ERR_ABORTED 404 (Not Found)
   ```

### **สาเหตุของปัญหา**
1. **Port Conflict**: Port 3000 ถูกใช้งานโดย process อื่น
2. **Asset Prefix**: Static files ใช้ asset prefix ใน development mode
3. **Next.js Configuration**: การตั้งค่า experimental features ไม่ถูกต้อง

## ✅ **วิธีแก้ไข**

### **1. แก้ไข Port ใน Test Script**

```javascript
// เปลี่ยนจาก port 3000 เป็น 3001
const response = await fetch("http://localhost:3001/stationaryhub/api/orgcode3", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(testData)
})
```

### **2. ปรับปรุง next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Base path configuration - ใช้ในทุก mode
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub',
  
  // Fix for static files in development
  ...(process.env.NODE_ENV === 'development' && {
    // Disable asset prefix in development to fix static files
    assetPrefix: '',
  }),
  
  // Development server configuration
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  
  // Experimental features
  experimental: {
    // Disable static optimization in development
    optimizeCss: process.env.NODE_ENV === 'production',
  },
}
```

### **3. ลบ Experimental appDir**

```javascript
// ลบ appDir ออกจาก experimental features
experimental: {
  // Disable static optimization in development
  optimizeCss: process.env.NODE_ENV === 'production',
},
```

## 🔧 **การเปลี่ยนแปลงที่สำคัญ**

### **ไฟล์ที่แก้ไข**:
1. **`next.config.js`**: ปรับปรุงการตั้งค่า asset prefix และ experimental features
2. **`test-requisition-fix.js`**: แก้ไข port จาก 3000 เป็น 3001

### **การปรับปรุง**:
- ✅ ปิดการใช้งาน asset prefix ใน development mode
- ✅ ลบ experimental appDir ที่ไม่จำเป็น
- ✅ แก้ไข port ใน test script
- ✅ ปรับปรุง static files loading

## 🧪 **การทดสอบ**

### **ขั้นตอนการทดสอบ**
1. หยุด server ที่กำลังรันอยู่
2. ลบโฟลเดอร์ `.next`
3. รัน `npm run dev`
4. เปิด browser ไปที่ `http://localhost:3001/stationaryhub`
5. ตรวจสอบว่า static files โหลดได้ปกติ

### **ผลลัพธ์ที่คาดหวัง**
- ✅ Server รันที่ port 3001
- ✅ Static files โหลดได้ปกติ
- ✅ หน้าเว็บแสดงผลได้ถูกต้อง
- ✅ ไม่มี error 404

## 📝 **หมายเหตุ**

### **Port Configuration**
- **Development**: `http://localhost:3001/stationaryhub`
- **Production**: `http://localhost:3000/stationaryhub` (หรือตามที่กำหนด)

### **Static Files**
- **Development**: โหลดจาก root path (ไม่มี asset prefix)
- **Production**: โหลดจาก `/stationaryhub/_next/static/`

### **URL Structure**
- **Cart Page**: `http://localhost:3001/stationaryhub/cart`
- **Admin Page**: `http://localhost:3001/stationaryhub/admin`
- **API Routes**: `http://localhost:3001/stationaryhub/api/...`

## 🎯 **ผลลัพธ์**

หลังจากแก้ไขแล้ว:
- ✅ Server รันที่ port 3001
- ✅ Static files โหลดได้ปกติ
- ✅ ไม่มี error 404
- ✅ การพัฒนาเว็บไซต์สะดวกขึ้น

## 🔄 **การ Deploy**

เมื่อ deploy ไป production:
1. ตั้งค่า `NODE_ENV=production`
2. ตั้งค่า `NEXT_PUBLIC_BASE_PATH=/stationaryhub`
3. รัน `npm run build`
4. รัน `npm start`

ระบบจะใช้ port 3000 และ asset prefix ตามที่กำหนดไว้

## 📋 **Checklist การแก้ไข**

### **Port Issues**
- [ ] Server รันที่ port 3001
- [ ] Test script ใช้ port 3001
- [ ] Browser เข้าถึง port 3001

### **Static Files**
- [ ] Asset prefix ปิดใน development
- [ ] Static files โหลดได้ปกติ
- [ ] ไม่มี error 404

### **Configuration**
- [ ] next.config.js ถูกต้อง
- [ ] Experimental features ถูกต้อง
- [ ] Base path ทำงานได้






