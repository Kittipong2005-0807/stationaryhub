# การแก้ไขปัญหา Basepath ซ้อนซ้อนกัน

## ปัญหาที่พบ

ในโปรเจค StationaryHub มีปัญหา basepath ซ้อนซ้อนกัน ทำให้เกิด URL แบบ `/stationaryhub/stationaryhub/api/...` และ `/stationaryhub/stationaryhub/manager` ซึ่งไม่ถูกต้อง

## สาเหตุของปัญหา

1. **Next.js Config**: ตั้งค่า `basePath: '/stationaryhub'` ใน `next.config.js`
2. **Manual Basepath**: โค้ดยังเพิ่ม `/stationaryhub` เข้าไปใน URL อีกครั้ง
3. **Client vs Server**: ไม่แยกการจัดการระหว่าง client-side และ server-side
4. **หน้า Manager**: มีการใช้ fetch โดยตรงกับ API endpoints แทนที่จะใช้ getApiUrl
5. **Navigation**: getBasePathUrl ใน client-side ยังเพิ่ม basepath อีกครั้ง
6. **API Calls**: Client-side ไม่ใช้ basepath ทำให้ API endpoints ไม่พบ

## การแก้ไข

### 1. แก้ไข `lib/api-utils.ts`

```typescript
export function getApiUrl(endpoint: string): string {
  // ถ้า endpoint เริ่มต้นด้วย /stationaryhub แล้ว ให้ใช้เลย
  if (endpoint.startsWith('/stationaryhub')) {
    return endpoint
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint

  if (typeof window !== 'undefined') {
    // For client-side, ใช้ BASE_PATH เพื่อให้ API calls ทำงานถูกต้อง
    return `${BASE_PATH}/${cleanEndpoint}`.replace(/\/+/g, '/')
  }

  // For server-side, use NEXTAUTH_URL with BASE_PATH
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001'
  return `${baseUrl}${BASE_PATH}/${cleanEndpoint}`.replace(/\/+/g, '/') // Ensure single slashes
}
```

### 2. แก้ไข `lib/base-path.ts`

```typescript
export function getBasePathUrl(path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  if (typeof window !== 'undefined') {
    // For client-side, Next.js จะจัดการ basePath ให้อัตโนมัติ
    // ดังนั้นเราใช้ path โดยตรง (ไม่ต้องเพิ่ม /)
    return path.startsWith('/') ? path : `/${path}`;
  }
  
  // For server-side, use BASE_PATH
  return `${BASE_PATH}/${cleanPath}`.replace(/\/+/g, '/');
}

export function getApiBasePath(): string {
  if (typeof window !== 'undefined') {
    // For client-side, Next.js จะจัดการ basePath ให้อัตโนมัติ
    return '';
  }
  
  // For server-side, use BASE_PATH
  return BASE_PATH;
}

export function getStaticBasePath(): string {
  return BASE_PATH;
}

export function getImageBasePath(): string {
  return BASE_PATH;
}
```

### 3. แก้ไขหน้า Manager

#### `app/manager/page.tsx`
- เพิ่ม import `getApiUrl` จาก `@/lib/api-utils`
- แก้ไข API calls ให้ใช้ `getApiUrl()` แทน fetch โดยตรง

#### `app/manager/products/page.tsx`
- เพิ่ม import `getApiUrl` จาก `@/lib/api-utils`
- แก้ไข API calls ให้ใช้ `getApiUrl()` แทน fetch โดยตรง

#### `app/manager/cart/page.tsx`
- เพิ่ม import `getApiUrl` จาก `@/lib/api-utils`
- แก้ไข API calls ให้ใช้ `getApiUrl()` แทน fetch โดยตรง
- แก้ไขฟังก์ชัน `getImageUrl()` ให้ไม่ซ้อน basepath

#### `app/manager/orders/page.tsx`
- เพิ่ม import `getApiUrl` จาก `@/lib/api-utils`
- แก้ไข API calls ให้ใช้ `getApiUrl()` แทน fetch โดยตรง

## หลักการทำงาน

### Client-side (Browser)
- **API Calls**: ใช้ BASE_PATH + endpoint เช่น `/stationaryhub/api/products`
- **Navigation**: ใช้ path โดยตรง เช่น `/manager` แทน `/stationaryhub/manager`
- Next.js จะจัดการ basepath ให้อัตโนมัติสำหรับ navigation

### Server-side (API Routes)
- ต้องใช้ `BASE_PATH` เพราะ Next.js ไม่จัดการให้
- ใช้ `NEXTAUTH_URL` + `BASE_PATH` + endpoint

## การทดสอบ

1. **Client-side Navigation**: ตรวจสอบว่า URL ไม่ซ้อนซ้อนกัน
2. **API Calls**: ตรวจสอบว่า API calls ทำงานถูกต้องทั้ง client และ server
3. **Static Assets**: ตรวจสอบว่า images และ CSS โหลดถูกต้อง
4. **หน้า Manager**: ตรวจสอบว่า navigation และ API calls ทำงานถูกต้อง
5. **Notifications**: ตรวจสอบว่า API `/api/notifications` ทำงานถูกต้อง

## ไฟล์ที่แก้ไข

- `lib/api-utils.ts` - แก้ไขฟังก์ชัน `getApiUrl`
- `lib/base-path.ts` - แก้ไขฟังก์ชัน basepath ทั้งหมด
- `app/manager/page.tsx` - แก้ไข API calls
- `app/manager/products/page.tsx` - แก้ไข API calls
- `app/manager/cart/page.tsx` - แก้ไข API calls และ image URLs
- `app/manager/orders/page.tsx` - แก้ไข API calls

## ผลลัพธ์ที่คาดหวัง

- URL จะไม่ซ้อนซ้อนกันอีกต่อไป
- Client-side API: `/stationaryhub/api/products` (ถูกต้อง)
- Server-side API: `http://localhost:3001/stationaryhub/api/products` (ถูกต้อง)
- Navigation: `/stationaryhub/manager` (ถูกต้อง)
- ไม่มี URL แบบ `/stationaryhub/stationaryhub/api/products` อีกต่อไป
- ไม่มี URL แบบ `/stationaryhub/stationaryhub/manager` อีกต่อไป
- หน้า Manager ทำงานได้ปกติโดยไม่มีปัญหา basepath
- API notifications ทำงานได้ปกติ
