# 🔧 การตั้งค่า Port 3000 สำหรับ StationaryHub

## 🎯 **วัตถุประสงค์**

ตั้งค่าให้ StationaryHub รันที่ port 3000 ใน development mode

## ✅ **การตั้งค่าที่ใช้**

### **1. แก้ไข Test Script**

```javascript
// test-requisition-fix.js
const response = await fetch("http://localhost:3000/stationaryhub/api/orgcode3", {
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
  
  // Environment variables
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000/stationaryhub',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
    NEXTAUTH_URL_DEV: 'http://localhost:3000/stationaryhub',
    NEXTAUTH_URL_PROD: process.env.NEXTAUTH_URL || 'http://localhost:3000/stationaryhub',
  },
}
```

### **3. หยุด Process ที่ใช้ Port 3000**

```bash
# ตรวจสอบ process ที่ใช้ port 3000
netstat -ano | findstr :3000

# หยุด process (แทนที่ PID ด้วย PID ที่ได้จากคำสั่งข้างต้น)
taskkill /PID <PID> /F
```

## 🌐 **URL Structure**

### **Development Mode (Port 3000)**
- **Base URL**: `http://localhost:3000/stationaryhub`
- **Cart Page**: `http://localhost:3000/stationaryhub/cart`
- **Admin Page**: `http://localhost:3000/stationaryhub/admin`
- **Manager Page**: `http://localhost:3000/stationaryhub/manager`
- **Orders Page**: `http://localhost:3000/stationaryhub/orders`
- **Login Page**: `http://localhost:3000/stationaryhub/login`
- **API Routes**: `http://localhost:3000/stationaryhub/api/...`

### **Production Mode**
- **Base URL**: `http://your-domain.com/stationaryhub`
- **Cart Page**: `http://your-domain.com/stationaryhub/cart`
- **Admin Page**: `http://your-domain.com/stationaryhub/admin`

## 🔧 **การเปลี่ยนแปลงที่สำคัญ**

### **ไฟล์ที่แก้ไข**:
1. **`next.config.js`**: ปรับปรุง environment variables ให้ใช้ port 3000
2. **`test-requisition-fix.js`**: แก้ไข port จาก 3001 เป็น 3000

### **การปรับปรุง**:
- ✅ ใช้ port 3000 ในทุก environment
- ✅ ปิดการใช้งาน asset prefix ใน development mode
- ✅ แก้ไข test script ให้ใช้ port 3000
- ✅ ปรับปรุง environment variables

## 🧪 **การทดสอบ**

### **ขั้นตอนการทดสอบ**
1. หยุด process ที่ใช้ port 3000 (ถ้ามี)
2. ลบโฟลเดอร์ `.next`
3. รัน `npm run dev`
4. เปิด browser ไปที่ `http://localhost:3000/stationaryhub`
5. ตรวจสอบว่า static files โหลดได้ปกติ

### **ผลลัพธ์ที่คาดหวัง**
- ✅ Server รันที่ port 3000
- ✅ Static files โหลดได้ปกติ
- ✅ หน้าเว็บแสดงผลได้ถูกต้อง
- ✅ ไม่มี error 404

## 📝 **หมายเหตุ**

### **Port Configuration**
- **Development**: `http://localhost:3000/stationaryhub`
- **Production**: `http://localhost:3000/stationaryhub` (หรือตามที่กำหนด)

### **Static Files**
- **Development**: โหลดจาก root path (ไม่มี asset prefix)
- **Production**: โหลดจาก `/stationaryhub/_next/static/`

### **API Routes**
- **Development**: `http://localhost:3000/stationaryhub/api/...`
- **Production**: `http://your-domain.com/stationaryhub/api/...`

## 🎯 **ผลลัพธ์**

หลังจากตั้งค่าแล้ว:
- ✅ ใช้ port 3000 ในทุก environment
- ✅ Static files โหลดได้ปกติ
- ✅ Navigation ทำงานได้ถูกต้อง
- ✅ API calls ทำงานได้

## 🔄 **การ Deploy**

เมื่อ deploy ไป production:
1. ตั้งค่า `NODE_ENV=production`
2. ตั้งค่า `NEXT_PUBLIC_BASE_PATH=/stationaryhub`
3. รัน `npm run build`
4. รัน `npm start`

ระบบจะใช้ port 3000 และ base path `/stationaryhub` ตามที่กำหนดไว้

## 📋 **Checklist การตั้งค่า**

### **Port Configuration**
- [ ] Server รันที่ port 3000
- [ ] Test script ใช้ port 3000
- [ ] Browser เข้าถึง port 3000

### **Static Files**
- [ ] Asset prefix ปิดใน development
- [ ] Static files โหลดได้ปกติ
- [ ] ไม่มี error 404

### **Environment Variables**
- [ ] NEXTAUTH_URL ใช้ port 3000
- [ ] NEXTAUTH_URL_DEV ใช้ port 3000
- [ ] NEXTAUTH_URL_PROD ใช้ port 3000

### **Testing**
- [ ] หน้าเว็บโหลดได้ที่ port 3000
- [ ] Static files โหลดได้ปกติ
- [ ] Navigation ทำงานได้
- [ ] API calls ทำงานได้




