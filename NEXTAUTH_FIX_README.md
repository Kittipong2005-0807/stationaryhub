# การแก้ไขปัญหา NextAuth.js ใน StationaryHub

## ปัญหาที่พบ
1. **NextAuth.js ไม่สามารถเชื่อมต่อกับ API endpoints ได้**
2. **การส่งคืน HTML แทนที่จะเป็น JSON**
3. **SessionProvider ไม่มีการตั้งค่า basePath**
4. **Middleware ไม่สามารถจัดการ basePath ได้อย่างถูกต้อง**

## สาเหตุของปัญหา
- การตั้งค่า `basePath: '/stationaryhub'` ใน `next.config.js`
- SessionProvider ไม่มีการตั้งค่า `basePath` สำหรับ NextAuth.js
- Middleware ไม่ได้จัดการ basePath อย่างถูกต้อง

## วิธีแก้ไข

### 1. แก้ไข SessionProvider
```tsx
// components/ThemeProviderClient.tsx
<SessionProvider 
  basePath={`${BASE_PATH}/api/auth`}
  refetchInterval={5 * 60}
  refetchOnWindowFocus={true}
>
```

### 2. แก้ไข next.config.js
```js
// ใช้ environment variable สำหรับ basePath
basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub',

// เพิ่ม environment variables
env: {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3001/stationaryhub',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
},

// เพิ่ม CORS headers
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
      ],
    },
  ]
}
```

### 3. แก้ไข middleware.ts
```ts
// ตรวจสอบ basePath ก่อน
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub'

if (!request.nextUrl.pathname.startsWith(basePath)) {
  return NextResponse.next()
}

// ลบ basePath ออกจาก pathname เพื่อตรวจสอบ
const pathWithoutBase = request.nextUrl.pathname.replace(basePath, '') || '/'
```

### 4. แก้ไข AuthContext
```tsx
// เพิ่ม error handling และ redirect logic
const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await signIn("credentials", {
      redirect: false,
      username,
      password,
    })
    
    if (res?.ok && !res.error) {
      return { success: true }
    } else {
      return { 
        success: false, 
        error: res?.error || "การเข้าสู่ระบบล้มเหลว" 
      }
    }
  } catch (error) {
    console.error("Login error:", error)
    return { 
      success: false, 
      error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" 
    }
  }
}

// เพิ่ม auto-redirect เมื่อไม่ได้ authenticate
useEffect(() => {
  if (!isAuthLoading && !isAuthenticated) {
    const currentPath = window.location.pathname
    if (currentPath !== "/login" && !currentPath.includes("/api/")) {
      console.log("Redirecting to login - user not authenticated")
      router.push("/login")
    }
  }
}, [isAuthenticated, isAuthLoading, router])
```

## Environment Variables ที่ต้องตั้งค่า
```bash
# .env.local
NEXTAUTH_URL=http://localhost:3001/stationaryhub
NEXTAUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_BASE_PATH=/stationaryhub
NEXTAUTH_DEBUG=true
```

## การทดสอบ
1. รีสตาร์ท development server
2. ตรวจสอบ console logs
3. ทดสอบการเข้าสู่ระบบ
4. ตรวจสอบ session management

## ผลลัพธ์ที่คาดหวัง
- NextAuth.js สามารถเชื่อมต่อกับ API endpoints ได้
- ไม่มีการส่งคืน HTML แทน JSON
- Session management ทำงานได้อย่างถูกต้อง
- Middleware จัดการ authentication ได้อย่างถูกต้อง
