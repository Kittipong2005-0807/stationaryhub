# 🔧 การตั้งค่า Base Path สำหรับ StationaryHub

## 🎯 **วัตถุประสงค์**

ตั้งค่าให้ StationaryHub ใช้ base path `/stationaryhub` ในทุก environment (development และ production)

## ✅ **การตั้งค่าที่ใช้**

### **1. next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Base path configuration - ใช้ในทุก mode
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub',
  
  // Development server configuration
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  
  // Environment variables
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000/stationaryhub',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
    NEXTAUTH_URL_DEV: 'http://localhost:3000/stationaryhub',
    NEXTAUTH_URL_PROD: process.env.NEXTAUTH_URL || 'http://localhost:3001/stationaryhub',
  },
}
```

### **2. lib/base-path.ts**

```typescript
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub';
```

### **3. middleware.ts**

```typescript
export async function middleware(request: NextRequest) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub'
  
  // ตรวจสอบว่าเป็น basePath หรือไม่
  if (!request.nextUrl.pathname.startsWith(basePath)) {
    return NextResponse.next()
  }
  
  // ลบ basePath ออกจาก pathname เพื่อตรวจสอบ
  const pathWithoutBase = request.nextUrl.pathname.replace(basePath, '') || '/'
  
  // ... rest of middleware logic
}
```

## 🌐 **URL Structure**

### **Development Mode**
- **Base URL**: `http://localhost:3000/stationaryhub`
- **Cart Page**: `http://localhost:3000/stationaryhub/cart`
- **Admin Page**: `http://localhost:3000/stationaryhub/admin`
- **Manager Page**: `http://localhost:3000/stationaryhub/manager`
- **Orders Page**: `http://localhost:3000/stationaryhub/orders`
- **Login Page**: `http://localhost:3000/stationaryhub/login`

### **Production Mode**
- **Base URL**: `http://your-domain.com/stationaryhub`
- **Cart Page**: `http://your-domain.com/stationaryhub/cart`
- **Admin Page**: `http://your-domain.com/stationaryhub/admin`
- **Manager Page**: `http://your-domain.com/stationaryhub/manager`
- **Orders Page**: `http://your-domain.com/stationaryhub/orders`
- **Login Page**: `http://your-domain.com/stationaryhub/login`

## 🔧 **การเปลี่ยนแปลงที่สำคัญ**

### **ไฟล์ที่แก้ไข**:
1. **`next.config.js`**: ใช้ base path ในทุก mode
2. **`lib/base-path.ts`**: ใช้ base path เสมอ
3. **`middleware.ts`**: ตรวจสอบ base path เสมอ

### **การปรับปรุง**:
- ✅ ใช้ base path `/stationaryhub` ในทุก environment
- ✅ Static files โหลดจาก `/stationaryhub/_next/static/`
- ✅ API routes ใช้ `/stationaryhub/api/`
- ✅ Navigation ทำงานได้ถูกต้อง

## 🧪 **การทดสอบ**

### **ขั้นตอนการทดสอบ**
1. รัน `npm run dev`
2. เปิด browser ไปที่ `http://localhost:3000/stationaryhub`
3. ตรวจสอบว่า static files โหลดได้ปกติ
4. ทดสอบ navigation ไปยังหน้าต่างๆ

### **ผลลัพธ์ที่คาดหวัง**
- ✅ หน้าเว็บโหลดได้ปกติที่ `/stationaryhub`
- ✅ Static files โหลดได้ปกติ
- ✅ Navigation ทำงานได้
- ✅ API calls ทำงานได้

## 📝 **หมายเหตุ**

### **Static Files**
- CSS: `http://localhost:3000/stationaryhub/_next/static/css/...`
- JavaScript: `http://localhost:3000/stationaryhub/_next/static/chunks/...`
- Images: `http://localhost:3000/stationaryhub/_next/image/...`

### **API Routes**
- API calls: `http://localhost:3000/stationaryhub/api/...`
- Auth routes: `http://localhost:3000/stationaryhub/api/auth/...`

### **Navigation**
- Internal links ใช้ `getBasePathUrl()` function
- External links ใช้ full URL with base path

## 🎯 **ผลลัพธ์**

หลังจากตั้งค่าแล้ว:
- ✅ ใช้ base path `/stationaryhub` ในทุก environment
- ✅ Static files โหลดได้ปกติ
- ✅ Navigation ทำงานได้ถูกต้อง
- ✅ API calls ทำงานได้
- ✅ Authentication ทำงานได้

## 🔄 **การ Deploy**

เมื่อ deploy ไป production:
1. ตั้งค่า `NEXT_PUBLIC_BASE_PATH=/stationaryhub`
2. ตั้งค่า `NEXTAUTH_URL=http://your-domain.com/stationaryhub`
3. รัน `npm run build`
4. รัน `npm start`

ระบบจะใช้ base path `/stationaryhub` ตามที่กำหนดไว้

## 📋 **Checklist การตั้งค่า**

### **Configuration Files**
- [ ] `next.config.js` ใช้ base path
- [ ] `lib/base-path.ts` ใช้ base path
- [ ] `middleware.ts` ตรวจสอบ base path

### **Environment Variables**
- [ ] `NEXT_PUBLIC_BASE_PATH=/stationaryhub`
- [ ] `NEXTAUTH_URL=http://localhost:3000/stationaryhub`

### **Testing**
- [ ] หน้าเว็บโหลดได้ที่ `/stationaryhub`
- [ ] Static files โหลดได้ปกติ
- [ ] Navigation ทำงานได้
- [ ] API calls ทำงานได้



