/**
 * Thai Time Utilities - จัดการเวลาแบบไทยที่สอดคล้องกันทั้งระบบ
 * ใช้ timezone Asia/Bangkok (GMT+7) เหมือนกับการสั่งสินค้า
 */

export class ThaiTimeUtils {
  /**
   * ดึงเวลาปัจจุบันในรูปแบบ Date object (Asia/Bangkok timezone)
   * ใช้แทน new Date() ทั่วไป
   */
  static getCurrentThaiTime(): Date {
    const now = new Date();
    // แปลงเป็น Asia/Bangkok timezone
    const thaiTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    return thaiTime;
  }

  /**
   * ดึงเวลาปัจจุบันในรูปแบบ ISO string (Asia/Bangkok timezone)
   * ใช้แทน new Date().toISOString()
   */
  static getCurrentThaiTimeISO(): string {
    return this.getCurrentThaiTime().toISOString();
  }

  /**
   * ดึงเวลาปัจจุบันในรูปแบบ timestamp (Asia/Bangkok timezone)
   * ใช้แทน Date.now()
   */
  static getCurrentThaiTimestamp(): number {
    return this.getCurrentThaiTime().getTime();
  }

  /**
   * ดึงเวลาปัจจุบันในรูปแบบ string สำหรับ SQL GETDATE()
   * ใช้สำหรับการเปรียบเทียบกับฐานข้อมูล
   */
  static getCurrentThaiTimeForSQL(): string {
    const thaiTime = this.getCurrentThaiTime();
    return thaiTime.toISOString().slice(0, 19).replace('T', ' ');
  }

  /**
   * แปลง Date object เป็น Asia/Bangkok timezone
   */
  static toThaiTime(date: Date | string): Date {
    const d = new Date(date);
    return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  }

  /**
   * แปลง Date object เป็น string แบบไทย (Asia/Bangkok)
   */
  static toThaiTimeString(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const d = new Date(date);
    return d.toLocaleString("th-TH", { 
      timeZone: "Asia/Bangkok",
      ...options 
    });
  }

  /**
   * แปลง Date object เป็น date string แบบไทย (Asia/Bangkok)
   */
  static toThaiDateString(date: Date | string): string {
    return this.toThaiTimeString(date, { 
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * แปลง Date object เป็น time string แบบไทย (Asia/Bangkok)
   */
  static toThaiTimeOnlyString(date: Date | string): string {
    return this.toThaiTimeString(date, { 
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * คำนวณความแตกต่างของเวลา (ใน milliseconds)
   */
  static getTimeDifference(date1: Date | string, date2: Date | string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs(d1.getTime() - d2.getTime());
  }

  /**
   * คำนวณจำนวนวันที่แตกต่าง
   */
  static getDaysDifference(date1: Date | string, date2: Date | string): number {
    const diffInMs = this.getTimeDifference(date1, date2);
    return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  }

  /**
   * ตรวจสอบว่าเวลาอยู่ในช่วง 24 ชั่วโมงที่แล้วหรือไม่
   */
  static isWithin24Hours(date: Date | string): boolean {
    const targetDate = new Date(date);
    const now = this.getCurrentThaiTime();
    const diffInMs = now.getTime() - targetDate.getTime();
    return diffInMs <= (24 * 60 * 60 * 1000) && diffInMs >= 0;
  }

  /**
   * สร้าง timestamp สำหรับชื่อไฟล์ที่ไม่ซ้ำกัน
   */
  static getUniqueTimestamp(): string {
    return this.getCurrentThaiTimestamp().toString();
  }

  /**
   * สร้าง ID แบบไม่ซ้ำกัน (ใช้เวลาปัจจุบัน)
   */
  static generateUniqueId(): string {
    return this.getCurrentThaiTimestamp().toString().slice(-6);
  }
}

// Export default instance
export default ThaiTimeUtils;
