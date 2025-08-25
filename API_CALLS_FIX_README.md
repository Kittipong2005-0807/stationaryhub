# การแก้ไขปัญหา API Calls ใน StationaryHub

## ปัญหาที่พบ
1. **API calls ไปที่ `http://localhost:3000`** แต่ควรเป็น `http://localhost:3001/stationaryhub`
2. **การส่งคืน HTML แทนที่จะเป็น JSON** เนื่องจาก API endpoints ไม่สามารถเข้าถึงได้
3. **ไม่มีการใช้ basePath ใน API calls**

## สาเหตุของปัญหา
- การตั้งค่า `basePath: '/stationaryhub'` ใน `next.config.js`
- API calls ใช้ `fetch()` โดยตรงโดยไม่คำนึงถึง basePath
- ไม่มี utility function สำหรับจัดการ API calls

## วิธีแก้ไข

### 1. สร้าง Utility Function สำหรับ API Calls
```ts
// lib/api-utils.ts
export function getApiUrl(endpoint: string): string {
  // If running in browser, use relative path
  if (typeof window !== 'undefined') {
    return `/${cleanEndpoint}`
  }
  
  // If running on server, use full URL with base path
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001'
  return `${baseUrl}${BASE_PATH}/${cleanEndpoint}`
}

export async function apiFetch<T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(endpoint)
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    // Check if response is HTML (error page)
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('text/html')) {
      throw new Error(`API endpoint not found: ${endpoint}`)
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error)
    throw error
  }
}

export async function apiGet<T = any>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: 'GET' })
}

export async function apiPost<T = any>(endpoint: string, data: any): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
```

### 2. แทนที่ fetch() ด้วย Utility Functions
```tsx
// ก่อนแก้ไข
const response = await fetch(`/api/notifications?userId=${user.AdLoginName}`)
const data = await response.json()

// หลังแก้ไข
import { apiGet } from "@/lib/api-utils"
const data = await apiGet(`/api/notifications?userId=${user.AdLoginName}`)
```

### 3. ไฟล์ที่แก้ไขแล้ว
- ✅ `components/Layout.tsx` - notifications API calls
- ✅ `app/page.tsx` - products API calls
- ✅ `app/admin/page.tsx` - admin API calls
- 🔄 ไฟล์อื่นๆ ที่ยังต้องแก้ไข

## ไฟล์ที่ยังต้องแก้ไข
```bash
app/approvals/page.tsx
app/cart/page.tsx
app/create-user/page.tsx
app/change-role/page.tsx
app/admin/products/page.tsx
app/test-notifications/page.tsx
app/test-email/page.tsx
app/profile/change-role/page.tsx
app/orgcode3-status/page.tsx
app/orgcode3-info/page.tsx
app/orders/page.tsx
app/manager/page.tsx
app/manager/products/page.tsx
app/notifications/page.tsx
app/manager/cart/page.tsx
app/manager/orders/page.tsx
src/hooks/use-notifications.ts
```

## วิธีการแก้ไขไฟล์ที่เหลือ

### ขั้นตอนที่ 1: Import Utility Functions
```tsx
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-utils"
```

### ขั้นตอนที่ 2: แทนที่ fetch() calls
```tsx
// ก่อนแก้ไข
const response = await fetch('/api/endpoint')
const data = await response.json()

// หลังแก้ไข
const data = await apiGet('/api/endpoint')
```

### ขั้นตอนที่ 3: แก้ไข Error Handling
```tsx
// ก่อนแก้ไข
if (response.ok && data.success) {
  // handle success
}

// หลังแก้ไข
if (data.success) {
  // handle success
}
```

## ผลลัพธ์ที่คาดหวัง
- ✅ API calls ทำงานได้อย่างถูกต้อง
- ✅ ไม่มีการส่งคืน HTML แทน JSON
- ✅ Error handling ที่ดีขึ้น
- ✅ Code ที่อ่านง่ายและ maintain ได้ง่าย

## การทดสอบ
1. รีสตาร์ท development server
2. ตรวจสอบ console logs
3. ทดสอบการเรียก API ต่างๆ
4. ตรวจสอบว่าไม่มี 404 errors

## หมายเหตุ
- Utility functions จะจัดการ basePath อัตโนมัติ
- Error handling จะดีขึ้นเนื่องจากมีการตรวจสอบ content-type
- Code จะสั้นลงและอ่านง่ายขึ้น
