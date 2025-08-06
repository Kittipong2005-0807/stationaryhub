import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }) || null;

  // ตรวจสอบ path ที่ต้องการ authentication
  const protectedPaths = ['/admin', '/manager', '/orders', '/approvals', '/profile'];
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

  // ตรวจสอบ path ที่ไม่ต้องการ authentication
  const publicPaths = ['/login', '/api/auth'];
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));

  // ถ้าเป็น public path ให้ผ่านไปได้
  if (isPublicPath) {
    return NextResponse.next();
  }

  // ถ้าเป็น protected path แต่ไม่มี token ให้ redirect ไป login
  if (isProtectedPath && !token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // ถ้ามี token ให้ตรวจสอบ role
  if (token && isProtectedPath) {
    const userRole = (token as any).ROLE;

    // ตรวจสอบ admin path
    if (request.nextUrl.pathname.startsWith('/admin') && userRole !== 'ADMIN') {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }

    // ตรวจสอบ manager path
    if (request.nextUrl.pathname.startsWith('/manager') && userRole !== 'MANAGER') {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }

    // ตรวจสอบ user path
    if (request.nextUrl.pathname.startsWith('/orders') && userRole !== 'USER') {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 