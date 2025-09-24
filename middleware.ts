import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ดึง basePath จาก next.config.js
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub';

// กำหนด paths ที่ต้องการ authentication
const PROTECTED_PATHS = [
  '/admin',
  '/manager',
  '/orders',
  '/approvals',
  '/profile'
];

// กำหนด paths ที่เป็น public (ไม่ต้องการ authentication)
const PUBLIC_PATHS = ['/login', '/api/auth', '/', '/api'];

// กำหนด role permissions
const ROLE_PERMISSIONS = {
  ADMIN: ['/admin'],
  MANAGER: ['/manager'],
  USER: ['/orders', '/approvals', '/profile']
} as const;

export async function middleware(request: NextRequest) {
  // ตรวจสอบว่า request เป็นไปยัง basePath หรือไม่
  if (!request.nextUrl.pathname.startsWith(basePath)) {
    return NextResponse.next();
  }

  // ลบ basePath ออกจาก pathname เพื่อตรวจสอบ path จริง
  const pathWithoutBase = request.nextUrl.pathname.replace(basePath, '') || '/';

  try {
    // ดึง token สำหรับตรวจสอบ authentication
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });

    // ตรวจสอบว่าเป็น protected path หรือไม่
    const isProtectedPath = PROTECTED_PATHS.some((path) =>
      pathWithoutBase.startsWith(path)
    );
    const isPublicPath = PUBLIC_PATHS.some((path) =>
      pathWithoutBase.startsWith(path)
    );

    // ถ้าเป็น public path ให้ผ่านไปได้
    if (isPublicPath && !token) {
      const loginUrl = new URL(
        `${basePath}${pathWithoutBase}`,
        request.nextUrl.origin
      );
      console.log('loginUrl : ', loginUrl);
      return NextResponse.redirect(loginUrl);
    }

    // ถ้าเป็น protected path แต่ไม่มี token ให้ redirect ไป login
    if (isProtectedPath && !token) {
      const loginUrl = new URL(`${basePath}/login`, request.nextUrl.origin);
      return NextResponse.redirect(loginUrl);
    }

    // ถ้ามี token และเป็น protected path ให้ตรวจสอบ role permission
    if (token && isProtectedPath) {
      const userRole = token.ROLE as keyof typeof ROLE_PERMISSIONS;

      // ตรวจสอบว่า role มีสิทธิ์เข้าถึง path นี้หรือไม่
      const hasPermission = checkRolePermission(userRole, pathWithoutBase);

      if (!hasPermission) {
        // redirect ไปหน้าแรกถ้าไม่มีสิทธิ์
        const homeUrl = new URL(basePath, request.nextUrl.origin);
        return NextResponse.redirect(homeUrl);
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // ถ้าเกิด error ให้ redirect ไป login
    const loginUrl = new URL(`${basePath}/login`, request.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }
}

/**
 * ตรวจสอบว่า role มีสิทธิ์เข้าถึง path หรือไม่
 */
function checkRolePermission(
  role: keyof typeof ROLE_PERMISSIONS,
  path: string
): boolean {
  // ADMIN มีสิทธิ์เข้าถึงทุก path
  if (role === 'ADMIN') {
    return true;
  }

  // ตรวจสอบ role อื่นๆ
  if (role in ROLE_PERMISSIONS) {
    const allowedPaths = ROLE_PERMISSIONS[role];
    return allowedPaths.some((allowedPath) => path.startsWith(allowedPath));
  }

  return false;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)'
  ]
};