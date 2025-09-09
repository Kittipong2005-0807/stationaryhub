/**
 * Utility functions for handling base path in StationaryHub
 */

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub';

/**
 * Get the full URL with base path
 * @param path - The path to append to base path
 * @returns Full URL with base path
 */
export function getBasePathUrl(path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  if (typeof window !== 'undefined') {
    // Client-side: Next.js จะจัดการ basePath ให้อัตโนมัติ
    // ดังนั้นเราใช้ path โดยตรง (ไม่ต้องเพิ่ม basePath)
    return path.startsWith('/') ? path : `/${path}`;
  }
  
  // Server-side: ใช้ BASE_PATH
  return `${BASE_PATH}/${cleanPath}`.replace(/\/+/g, '/');
}

/**
 * Get the base path for API routes
 * @returns Base path for API routes
 */
export function getApiBasePath(): string {
  if (typeof window !== 'undefined') {
    // Client-side: Next.js จะจัดการ basePath ให้อัตโนมัติ
    return '';
  }
  
  // Server-side: ใช้ BASE_PATH
  return BASE_PATH;
}

/**
 * Check if the current path matches the base path
 * @param path - The path to check
 * @returns True if the path matches the base path
 */
export function isBasePath(path: string): boolean {
  return path === BASE_PATH || path.startsWith(`${BASE_PATH}/`);
}

/**
 * Remove base path from a full path
 * @param fullPath - The full path including base path
 * @returns Path without base path
 */
export function removeBasePath(fullPath: string): string {
  if (fullPath.startsWith(BASE_PATH)) {
    return fullPath.slice(BASE_PATH.length) || '/';
  }
  return fullPath;
}

/**
 * Get the base path for static assets
 * @returns Base path for static assets
 */
export function getStaticBasePath(): string {
  return BASE_PATH;
}

/**
 * Get the base path for images
 * @returns Base path for images
 */
export function getImageBasePath(): string {
  return BASE_PATH;
}
