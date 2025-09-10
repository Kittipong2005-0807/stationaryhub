/**
 * Utility functions for API calls with base path support
 */

import { BASE_PATH } from './base-path';

/**
 * Get the full API URL with base path
 * @param endpoint - The API endpoint (e.g., '/api/products')
 * @returns Full API URL with base path
 */
export function getApiUrl(endpoint: string): string {
  // ถ้า endpoint เริ่มต้นด้วย basePath แล้ว ให้ใช้เลย
  if (endpoint.startsWith(BASE_PATH)) {
    return endpoint;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  if (typeof window !== 'undefined') {
    // Client-side: ใช้ basePath สำหรับ API calls
    return `${BASE_PATH}/${cleanEndpoint}`.replace(/\/+/g, '/');
  }

  // Server-side: use NEXTAUTH_URL with BASE_PATH
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}${BASE_PATH}/${cleanEndpoint}`.replace(/\/+/g, '/');
}

/**
 * Make a fetch request to the API with proper error handling
 * @param endpoint - The API endpoint
 * @param options - Fetch options
 * @returns Promise with the response data
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(endpoint);

  // Debug: แสดง URL ที่ใช้
  console.log(`API call: ${endpoint} -> ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include session cookies by default
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Check if response is HTML (error page)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error(`API endpoint not found: ${endpoint}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Make a GET request to the API
 * @param endpoint - The API endpoint
 * @returns Promise with the response data
 */
export async function apiGet<T = any>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: 'GET' });
}

/**
 * Make a POST request to the API
 * @param endpoint - The API endpoint
 * @param data - The data to send
 * @returns Promise with the response data
 */
export async function apiPost<T = any>(
  endpoint: string,
  data: any
): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Make a PUT request to the API
 * @param endpoint - The API endpoint
 * @param data - The data to send
 * @returns Promise with the response data
 */
export async function apiPut<T = any>(endpoint: string, data: any): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

/**
 * Make a DELETE request to the API
 * @param endpoint - The API endpoint
 * @returns Promise with the response data
 */
export async function apiDelete<T = any>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: 'DELETE' });
}

/**
 * Get the base URL for the current environment
 * @returns Base URL string
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser environment
    return window.location.origin;
  }

  // Server environment
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}
