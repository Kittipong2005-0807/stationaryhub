/**
 * Memory Management Utility
 * จัดการ memory usage และป้องกัน memory leak
 */

export class MemoryManager {
  private static memoryThreshold = 100 * 1024 * 1024; // 100MB
  private static lastCleanup = Date.now();
  private static cleanupInterval = 30000; // 30 seconds
  private static idempotencyStore: Map<string, { createdAt: number; response: any } > = new Map();

  /**
   * ตรวจสอบ memory usage และทำความสะอาดถ้าจำเป็น
   */
  static checkAndCleanup(): void {
    const now = Date.now();
    
    // ตรวจสอบ memory usage
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🧠 Memory Usage: ${Math.round(heapUsed / 1024 / 1024)}MB`);
    }
    
    // ทำความสะอาดถ้า memory ใช้มากเกินไป หรือผ่านไป 30 วินาที
    if (heapUsed > this.memoryThreshold || (now - this.lastCleanup) > this.cleanupInterval) {
      this.forceCleanup();
      this.lastCleanup = now;
    }
  }

  /**
   * บังคับทำความสะอาด memory
   */
  static forceCleanup(): void {
    if (global.gc) {
      global.gc();
      if (process.env.NODE_ENV === 'development') {
        console.log('🧹 Memory cleanup performed');
      }
    }

    // Cleanup idempotency store entries older than 2 minutes
    const now = Date.now();
    const ttlMs = 2 * 60 * 1000;
    for (const [key, value] of this.idempotencyStore.entries()) {
      if (now - value.createdAt > ttlMs) {
        this.idempotencyStore.delete(key);
      }
    }
  }

  /**
   * ตรวจสอบและทำความสะอาด memory หลังจาก async operation
   */
  static async cleanupAfterAsync<T>(operation: () => Promise<T>): Promise<T> {
    try {
      const result = await operation();
      this.checkAndCleanup();
      return result;
    } catch (error) {
      this.checkAndCleanup();
      throw error;
    }
  }

  /**
   * จำกัดขนาดข้อมูลที่ประมวลผล
   */
  static limitDataSize<T>(data: T[], maxSize: number = 100): T[] {
    if (data.length > maxSize) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚠️ Data size limited from ${data.length} to ${maxSize} items`);
      }
      return data.slice(0, maxSize);
    }
    return data;
  }

  /**
   * ตรวจสอบ memory usage และ return สถิติ
   */
  static getMemoryStats() {
    const memUsage = process.memoryUsage();
    return {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024), // MB
      isHighMemory: memUsage.heapUsed > this.memoryThreshold
    };
  }

  /**
   * ตั้งค่า memory threshold
   */
  static setMemoryThreshold(thresholdMB: number): void {
    this.memoryThreshold = thresholdMB * 1024 * 1024;
  }

  /**
   * ตั้งค่า cleanup interval
   */
  static setCleanupInterval(intervalMs: number): void {
    this.cleanupInterval = intervalMs;
  }

  /**
   * Idempotency helpers: store and retrieve responses by key (short TTL)
   */
  static getIdempotentResponse(key: string) {
    const entry = this.idempotencyStore.get(key);
    if (!entry) return null;
    // TTL 2 minutes
    if (Date.now() - entry.createdAt > 2 * 60 * 1000) {
      this.idempotencyStore.delete(key);
      return null;
    }
    return entry.response;
  }

  static setIdempotentResponse(key: string, response: any) {
    this.idempotencyStore.set(key, { createdAt: Date.now(), response });
  }
}

// เริ่มต้น memory monitoring
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    MemoryManager.checkAndCleanup();
  }, 10000); // ตรวจสอบทุก 10 วินาที
}

