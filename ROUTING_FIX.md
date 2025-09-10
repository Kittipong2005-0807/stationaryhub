# 🔧 การแก้ไขปัญหา Routing 404

## 🚨 **ปัญหาที่เกิดขึ้น**

### **อาการของปัญหา**
- เกิด error 404 เมื่อเข้าถึง `/stationaryhub/cart`:
  ```
  GET http://localhost:3000/stationaryhub/cart 404 (Not Found)
  ```
- Next.js พยายามเข้าถึง path ที่ไม่ถูกต้องใน development mode

### **สาเหตุของปัญหา**
1. **Middleware Configuration**: Middleware ยังคงใช้ base path `/stationaryhub` ใน development mode
2. **Directory Structure**: มีโฟลเดอร์ `stationaryhub` ที่ไม่จำเป็นใน app directory
3. **Base Path Logic**: การจัดการ base path ไม่สอดคล้องกับ environment

## ✅ **วิธีแก้ไข**

### **1. ปรับปรุง middleware.ts**

```typescript
export async function middleware(request: NextRequest) {
  const basePath = process.env.NODE_ENV === 'development' ? '' : (process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub')
  
  // ใน development mode ไม่ต้องตรวจสอบ basePath
  if (process.env.NODE_ENV === 'development') {
    const pathWithoutBase = request.nextUrl.pathname
  } else {
    // ตรวจสอบว่าเป็น basePath หรือไม่
    if (!request.nextUrl.pathname.startsWith(basePath)) {
      return NextResponse.next()
    }
    
    // ลบ basePath ออกจาก pathname เพื่อตรวจสอบ
    const pathWithoutBase = request.nextUrl.pathname.replace(basePath, '') || '/'
  }
  
  // ... rest of middleware logic with environment-aware redirects
}
```

### **2. ลบโฟลเดอร์ที่ไม่จำเป็น**

```bash
# ลบโฟลเดอร์ stationaryhub ที่ไม่จำเป็น
Remove-Item -Recurse -Force app/stationaryhub
Remove-Item -Recurse -Force stationaryhub
```

### **3. ปรับปรุงการ Redirect URLs**

```typescript
// ถ้าเป็น protected path แต่ไม่มี token ให้ redirect ไป login
if (isProtectedPath && !token) {
  const loginUrl = process.env.NODE_ENV === 'development' 
    ? new URL('/login', request.url)
    : new URL(`${basePath}/login`, request.url);
  return NextResponse.redirect(loginUrl);
}

// ถ้ามี token ให้ตรวจสอบ role
if (token && isProtectedPath) {
  const userRole = (token as any).ROLE;

  // ตรวจสอบ admin path
  if (pathWithoutBase.startsWith('/admin') && userRole !== 'ADMIN') {
    const homeUrl = process.env.NODE_ENV === 'development'
      ? new URL('/', request.url)
      : new URL(basePath, request.url);
    return NextResponse.redirect(homeUrl);
  }
  
  // ... similar logic for other roles
}
```

## 🔧 **การเปลี่ยนแปลงที่สำคัญ**

### **ไฟล์ที่แก้ไข**:
1. **`middleware.ts`**: ปรับปรุงการจัดการ base path ตาม environment
2. **โฟลเดอร์ที่ไม่จำเป็น**: ลบโฟลเดอร์ `stationaryhub` ที่ทำให้เกิดปัญหา

### **การปรับปรุง**:
- ✅ ปิดการใช้งาน base path ใน development mode
- ✅ ปรับปรุง redirect URLs ให้เหมาะสมกับ environment
- ✅ ลบโฟลเดอร์ที่ไม่จำเป็น
- ✅ ปรับปรุง middleware logic

## 🧪 **การทดสอบ**

### **ขั้นตอนการทดสอบ**
1. หยุด server ที่กำลังรันอยู่
2. ลบโฟลเดอร์ `.next` (ถ้ามี)
3. รัน `npm run dev`
4. เปิด browser ไปที่ `http://localhost:3000/cart`
5. ตรวจสอบว่า routing ทำงานได้ปกติ

### **ผลลัพธ์ที่คาดหวัง**
- ✅ ไม่มี error 404 สำหรับ routing
- ✅ หน้าเว็บโหลดได้ปกติ
- ✅ Navigation ทำงานได้
- ✅ ไม่มีปัญหาใน development mode

## 📝 **หมายเหตุ**

### **Development Mode**
- ไม่ใช้ base path
- URLs: `http://localhost:3000/cart`, `http://localhost:3000/admin`, etc.
- Middleware ไม่ตรวจสอบ base path

### **Production Mode**
- ใช้ base path `/stationaryhub`
- URLs: `http://localhost:3000/stationaryhub/cart`, `http://localhost:3000/stationaryhub/admin`, etc.
- Middleware ตรวจสอบ base path

## 🎯 **ผลลัพธ์**

หลังจากแก้ไขแล้ว:
- ✅ Routing ทำงานได้ปกติใน development
- ✅ ไม่มี error 404 อีกต่อไป
- ✅ Navigation ทำงานได้ถูกต้อง
- ✅ Production deployment ยังคงทำงานได้ปกติ

## 🔄 **การ Deploy**

เมื่อ deploy ไป production:
1. ตั้งค่า `NODE_ENV=production`
2. ตั้งค่า `NEXT_PUBLIC_BASE_PATH=/stationaryhub`
3. รัน `npm run build`
4. รัน `npm start`

ระบบจะใช้ base path และ routing ตามที่กำหนดไว้

## 📋 **Checklist การแก้ไข**

### **Middleware Issues**
- [ ] Base path ถูกจัดการตาม environment
- [ ] Redirect URLs ถูกต้อง
- [ ] Authentication logic ทำงานได้

### **Directory Issues**
- [ ] ลบโฟลเดอร์ที่ไม่จำเป็น
- [ ] โครงสร้าง app directory ถูกต้อง
- [ ] ไม่มีโฟลเดอร์ที่ขัดแย้งกัน

### **Environment Issues**
- [ ] Development mode ไม่ใช้ base path
- [ ] Production mode ใช้ base path
- [ ] Environment variables ถูกต้อง







