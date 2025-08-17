/**
 * Performance utilities for optimization
 */

// Debounce function for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle function for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Intersection Observer for lazy loading
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
) {
  if (typeof window === 'undefined') return null
  
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  }
  
  return new IntersectionObserver(callback, defaultOptions)
}

// Performance measurement
export function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    console.log(`${name} took ${end - start}ms`)
    return result
  }
  return fn()
}

// Async performance measurement
export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    console.log(`${name} took ${end - start}ms`)
    return result
  }
  return fn()
}

// Memory usage measurement
export function measureMemoryUsage() {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    }
  }
  return null
}

// Cache utility for expensive operations
export class Cache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>()
  private ttl: number

  constructor(ttl: number = 5 * 60 * 1000) { // 5 minutes default
    this.ttl = ttl
  }

  set(key: string, value: T): void {
    this.cache.set(key, { value, timestamp: Date.now() })
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key)
    if (!item) return undefined
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return undefined
    }
    
    return item.value
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Virtual scrolling utilities
export function calculateVisibleRange(
  scrollTop: number,
  viewportHeight: number,
  itemHeight: number,
  totalItems: number
) {
  const startIndex = Math.floor(scrollTop / itemHeight)
  const endIndex = Math.min(
    startIndex + Math.ceil(viewportHeight / itemHeight) + 1,
    totalItems
  )
  
  return {
    startIndex: Math.max(0, startIndex - 5), // Buffer
    endIndex: Math.min(totalItems, endIndex + 5), // Buffer
  }
}

// Image optimization utilities
export function getOptimizedImageUrl(
  src: string,
  width: number,
  height: number,
  quality: number = 75
): string {
  // Add image optimization parameters
  const url = new URL(src, window.location.origin)
  url.searchParams.set('w', width.toString())
  url.searchParams.set('h', height.toString())
  url.searchParams.set('q', quality.toString())
  url.searchParams.set('fm', 'webp')
  
  return url.toString()
}

// Bundle size optimization
export function preloadComponent(importFunc: () => Promise<any>) {
  if (typeof window !== 'undefined') {
    // Preload component when idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        importFunc()
      })
    } else {
      // Fallback for older browsers
      setTimeout(() => {
        importFunc()
      }, 1000)
    }
  }
}
