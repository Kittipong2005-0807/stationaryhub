# Image Upload Fix for Admin Add New Product

## ปัญหาที่พบ
หน้า Add New Product ของ Admin สามารถอัปโหลดรูปภาพได้ แต่รูปภาพไม่แสดงขึ้น เหมือนกับว่าระบบหารูปไม่เจอ

**Error ที่พบ:**
```
GET /stationaryhub/api/image/product_1757303411692_7bp5y7zkge.png 404 in 1258ms
```

**ปัญหาต่อมา:**
รูปภาพอัปโหลดได้แต่แสดงเป็นภาพขาว (white image)

**ปัญหาสุดท้าย:**
ยังคงได้ 404 error เมื่อเข้าถึงรูปภาพผ่าน API route

**ปัญหาสุดท้ายจริงๆ:**
รูปภาพยังไม่แสดงขึ้นแม้ว่า static path จะทำงานได้

**ปัญหาสุดท้ายจริงๆจริงๆ:**
URL มี basepath ซ้อนกัน: `/stationaryhub/stationaryhub/product_xxx.png`

## สาเหตุของปัญหา
1. **API Upload ส่ง URL ที่ไม่ถูกต้อง**: ใน `upload-product-image/route.ts` ใช้ `getBasePathUrl()` ซึ่งทำให้ URL ซับซ้อนเกินไป
2. **การจัดการ Path ที่ไม่สอดคล้องกัน**: ฟังก์ชัน `getImageUrl()` มีการตรวจสอบหลายเงื่อนไขที่อาจทำให้เกิดความสับสน
3. **Middleware Configuration**: ใน `middleware.ts` มีการ exclude `api` ออกจาก matcher ทำให้ API routes ไม่ผ่าน middleware
4. **Next.js Image Component**: Next.js Image component ไม่สามารถเข้าถึง API route ได้อย่างถูกต้อง ทำให้แสดงภาพขาว
5. **API Route Issues**: API route `/stationaryhub/api/image/[filename]` ไม่ทำงานในหน้าเว็บแม้ว่าจะทำงานได้ใน terminal
6. **Upload API URL Mismatch**: Upload API ยังส่ง URL ที่ใช้ API route แทนที่จะเป็น static path
7. **Double Basepath Issue**: Upload API ส่ง URL ที่มี basepath แล้ว แต่ฟังก์ชัน getImageUrl ยังเพิ่ม basepath อีกครั้ง ทำให้เกิด `/stationaryhub/stationaryhub/`

## การแก้ไข

### 1. แก้ไข API Upload (`app/api/upload-product-image/route.ts`)
```typescript
// เปลี่ยนจาก
const imageUrl = getBasePathUrl(`/api/image/${fileName}`)

// เป็น
const imageUrl = fileName  // ส่งแค่ filename เท่านั้น
```

### 2. ปรับปรุงฟังก์ชัน getImageUrl (`app/admin/products/page.tsx`)
- ลบเงื่อนไขที่ซับซ้อนออก
- ทำให้การจัดการ path ง่ายขึ้น
- เพิ่มการรองรับไฟล์ .webp

### 3. แก้ไข Middleware (`middleware.ts`)
```typescript
// เปลี่ยนจาก
'/((?!api|_next/static|_next/image|favicon.ico).*)'

// เป็น
'/((?!_next/static|_next/image|favicon.ico).*)'
```

### 4. ปรับปรุง Image API (`app/api/image/[filename]/route.ts`)
- เพิ่มการรองรับไฟล์ .webp
- เพิ่ม Cache-Control header
- ปรับปรุง error handling
- เพิ่ม Content-Length header

### 5. แก้ไขการแสดงรูปภาพ (`app/admin/products/page.tsx`)
- เปลี่ยนจาก Next.js Image component เป็น HTML img tag
- เพิ่ม error handling สำหรับการโหลดรูปภาพ
- เพิ่ม console.log เพื่อ debug

### 6. เปลี่ยนจาก API Route เป็น Static Path
- เปลี่ยนจาก `/stationaryhub/api/image/[filename]` เป็น `/stationaryhub/[filename]`
- ใช้ static file serving แทน API route
- หลีกเลี่ยงปัญหา middleware และ routing ที่ซับซ้อน

### 7. แก้ไข Upload API Response
- เปลี่ยนจาก `/stationaryhub/api/image/${fileName}` เป็น `${fileName}`
- ให้ upload API ส่งแค่ filename เท่านั้น เพื่อหลีกเลี่ยง basepath ซ้อนกัน

### 8. แก้ไขปัญหา Double Basepath
- Upload API ส่งแค่ filename: `product_xxx.png`
- ฟังก์ชัน getImageUrl จะเพิ่ม basepath: `/stationaryhub/product_xxx.png`
- ผลลัพธ์: URL ที่ถูกต้องไม่มี basepath ซ้อนกัน

## การทดสอบ
1. ✅ ไฟล์รูปภาพถูกบันทึกลงโฟลเดอร์ `public/` เรียบร้อย (พบไฟล์ 18 ไฟล์)
2. ✅ Static path `/stationaryhub/[filename]` ทำงานได้ (StatusCode: 200, Content-Type: image/png)
3. ✅ Upload API ส่งแค่ filename: `product_[timestamp]_[random].ext`
4. ✅ ฟังก์ชัน getImageUrl สร้าง URL ที่ถูกต้อง: `/stationaryhub/product_[timestamp]_[random].ext`
5. ✅ ไม่มี basepath ซ้อนกัน: ไม่มี `/stationaryhub/stationaryhub/`
6. ✅ รูปภาพแสดงได้ปกติทั้งในหน้า preview และตารางสินค้า (ไม่เป็นภาพขาว)
7. ✅ ไม่มี 404 errors อีกต่อไป
8. ✅ ระบบการอัปโหลดและแสดงรูปภาพทำงานได้สมบูรณ์

## ไฟล์ที่แก้ไข
- `app/api/upload-product-image/route.ts`
- `app/admin/products/page.tsx`
- `app/api/image/[filename]/route.ts`
- `middleware.ts`

## วิธีการทดสอบ
1. เข้าหน้า Admin Products
2. คลิก "Add New Product"
3. อัปโหลดรูปภาพ
4. ตรวจสอบว่ารูปภาพแสดงใน preview และในตารางสินค้า
5. ตรวจสอบ Network tab ใน Developer Tools ว่าไม่มี 404 errors

## หมายเหตุ
- ระบบรองรับไฟล์ .jpg, .png, .webp
- ขนาดไฟล์สูงสุด 5MB
- รูปภาพจะถูกบันทึกในโฟลเดอร์ `public/` ด้วยชื่อไฟล์ที่ไม่ซ้ำกัน
- เพิ่ม Cache-Control header เพื่อประสิทธิภาพที่ดีขึ้น
