# การแก้ไขหน้า Manager Cart ที่ไม่แสดงข้อมูล

## ปัญหาที่พบ

หน้า cart ของ manager ไม่แสดงข้อมูลใดๆ เลย

## สาเหตุของปัญหา

1. **Syntax Error**: มี syntax error ในไฟล์ `app/manager/cart/page.tsx`
2. **Missing Import**: ขาด import `getApiUrl` จาก `@/lib/api-utils`
3. **API Call Error**: ใช้ URL โดยตรงแทน `getApiUrl()`
4. **Missing Function**: ขาดฟังก์ชัน `handleQuantityChange`

## การแก้ไข

### 1. แก้ไข Syntax Error

```typescript
// แก้ไขจาก
}}

// เป็น
}
```

### 2. เพิ่ม Import ที่ขาดหาย

```typescript
import { getApiUrl } from "@/lib/api-utils"
```

### 3. แก้ไข API Call

```typescript
// แก้ไขจาก
const res = await fetch("/stationaryhub/api/orgcode3", {

// เป็น
const res = await fetch(getApiUrl("/api/orgcode3"), {
```

### 4. เพิ่มฟังก์ชันที่ขาดหาย

```typescript
const handleQuantityChange = (itemId: number, newQuantity: number) => {
  updateQuantity(itemId, newQuantity)
}
```

### 5. เพิ่ม Debug Logs

```typescript
// Debug logs
console.log("🔍 Manager Cart Debug:")
console.log("- User:", user)
console.log("- Is Authenticated:", isAuthenticated)
console.log("- User Role:", user?.ROLE)
console.log("- Cart Items:", items)
console.log("- Cart Items Length:", items.length)
console.log("- Total Amount:", getTotalAmount())
```

## การทดสอบ

1. **เปิดหน้า Manager Cart**: `http://localhost:3000/stationaryhub/manager/cart`
2. **ตรวจสอบ Console**: ดู debug logs เพื่อตรวจสอบข้อมูล
3. **ตรวจสอบ Cart Items**: ดูว่ามีสินค้าใน cart หรือไม่
4. **ทดสอบฟังก์ชัน**: ลองเพิ่ม/ลดจำนวนสินค้า

## ผลลัพธ์ที่คาดหวัง

- ✅ หน้า cart แสดงข้อมูลได้ปกติ
- ✅ ไม่มี syntax error
- ✅ API calls ทำงานได้
- ✅ ฟังก์ชันเพิ่ม/ลดจำนวนสินค้าทำงานได้
- ✅ Debug logs แสดงข้อมูลได้

## ไฟล์ที่แก้ไข

- `app/manager/cart/page.tsx` - แก้ไข syntax error และเพิ่มฟังก์ชันที่ขาดหาย
