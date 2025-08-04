import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // ใช้ getToken ของ next-auth เพื่อตรวจสอบโทเค่น
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }) || null;
  //console.log("token = ", token)
  // ถ้าผู้ใช้ล็อกอินแล้ว และกำลังเข้า /login ให้ redirect ไปหน้าหลัก

  try {
    if (token && request.nextUrl.pathname === '/login') {
      console.log("token =  Y ")
      return NextResponse.redirect(new URL('/', request.url));
    }

    // ถ้าไม่ได้ล็อกอิน และไม่ใช่หน้า /login ให้ redirect ไป /login
    if (!token && request.nextUrl.pathname !== '/login') {
      console.log("token =  N ")
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  catch (error) {
    console.log(error)
  }


  return NextResponse.next();
}

// สามารถกำหนด matcher ได้ถ้าต้องการให้ middleware ทำงานเฉพาะบาง path
export const config = {
  matcher: ['/login', '/','/cart/:path*', '/orders/:path*', '/requisitions/:path*'],
}; 