# การแก้ไขปัญหา Logout Redirect ใน StationaryHub

## ปัญหาที่พบ
เมื่อผู้ใช้ logout ระบบ redirect ไปหน้า `http://localhost:3000/login` แทนที่จะไปหน้า `http://localhost:3000/stationaryhub/login` ตามที่ควรจะเป็น

## สาเหตุของปัญหา
1. **การตั้งค่า pages ใน authOptions.ts ไม่ถูกต้อง**: กำหนด `signIn: '/login'` แทนที่จะเป็น `'/stationaryhub/login'`
2. **การตั้งค่า NEXTAUTH_URL ไม่ตรงกัน**: ใน `next.config.js` ใช้ port 3000 แต่ใน `env.example` ใช้ port 3001
3. **การ redirect ซ้ำซ้อน**: ใน `Layout.tsx` มีการเรียก `logout()` และ `router.push()` แยกกัน

## วิธีแก้ไข

### 1. แก้ไข authOptions.ts
```typescript
// lib/authOptions.ts
export const authOptions: AuthOptions = {
  pages: {
    signIn: '/stationaryhub/login',  // แก้จาก '/login'
    error: '/stationaryhub/login',   // แก้จาก '/login'
  },
  // ... rest of config
}
```

### 2. แก้ไข next.config.js
```javascript
// next.config.js
env: {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3001/stationaryhub',  // แก้จาก 3000 เป็น 3001
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
  NEXTAUTH_URL_DEV: 'http://localhost:3001/stationaryhub',  // แก้จาก 3000 เป็น 3001
  NEXTAUTH_URL_PROD: process.env.NEXTAUTH_URL || 'http://localhost:3001/stationaryhub',  // แก้จาก 3000 เป็น 3001
},
```

### 3. แก้ไข Layout.tsx
```typescript
// components/Layout.tsx
const handleLogout = () => {
  setIsNavigating(true)
  logout()  // ใช้ logout() จาก AuthContext ที่มี callbackUrl ถูกต้องแล้ว
  handleClose()
  // ลบ router.push(getBasePathUrl("/login")) ออก เพราะ logout() จะจัดการ redirect ให้แล้ว
}
```

## การทำงานของระบบหลังแก้ไข

### AuthContext.tsx
```typescript
const logout = () => {
  signOut({ 
    callbackUrl: getBasePathUrl("/login"),  // จะได้ '/stationaryhub/login'
    redirect: true
  })
}
```

### middleware.ts
```typescript
// ถ้าเป็น protected path แต่ไม่มี token ให้ redirect ไป login
if (isProtectedPath && !token) {
  const loginUrl = new URL(`${basePath}/login`, request.url);  // จะได้ '/stationaryhub/login'
  return NextResponse.redirect(loginUrl);
}
```

## Environment Variables ที่ต้องตั้งค่า
```bash
# .env.local
NEXTAUTH_URL=http://localhost:3001/stationaryhub
NEXTAUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_BASE_PATH=/stationaryhub
```

## การทดสอบ
1. รีสตาร์ท development server
2. เข้าสู่ระบบ
3. กด logout
4. ตรวจสอบว่า redirect ไป `http://localhost:3000/stationaryhub/login` หรือไม่

## หมายเหตุ
- การใช้ `getBasePathUrl()` ใน AuthContext ช่วยให้ระบบจัดการ base path ได้อย่างถูกต้อง
- การลบ `router.push()` ออกจาก `handleLogout` ป้องกันการ redirect ซ้ำซ้อน
- การตั้งค่า `pages` ใน `authOptions.ts` เป็นสิ่งสำคัญที่ NextAuth.js ใช้ในการ redirect
