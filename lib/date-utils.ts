/**
 * Utility functions สำหรับจัดการวันที่และเวลาแบบไทย
 * ใช้ ThaiTimeUtils สำหรับการจัดการ timezone ที่สอดคล้องกัน
 */

import { ThaiTimeUtils } from './thai-time-utils'

export class ThaiDateUtils {
  /**
   * แปลงวันที่เป็น Date object โดยตรง ไม่แปลง timezone
   * ฐานข้อมูลเก็บเวลาไทยแล้ว (GETDATE()) ไม่ต้องแปลงอะไรเพิ่ม
   */
  private static parseDate(date: Date | string): Date {
    // ถ้าเป็น string ให้แปลงเป็น Date object โดยตรง
    // ฐานข้อมูลเก็บเวลาไทยแล้ว (GETDATE()) ไม่ต้องแปลง timezone
    if (typeof date === 'string') {
      // แปลง string เป็น Date object โดยตรง ไม่แปลง timezone
      return new Date(date)
    }
    return date
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบเต็ม
   * ตัวอย่าง: "15 ม.ค. 2567 14:30"
   */
  static formatFullThaiDate(date: Date | string): string {
    return this.formatShortThaiDate(date)
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบย่อ
   * ตัวอย่าง: "15 ม.ค. 2567 14:30"
   * แสดงเวลาตามที่เก็บในฐานข้อมูลโดยตรง (GETDATE())
   */
  static formatShortThaiDate(date: Date | string): string {
    const d = this.parseDate(date)
    
    // แสดงเวลาตามที่เก็บในฐานข้อมูลจริงๆ (GETDATE()) ไม่แก้ไข timezone
    const thaiMonthsShort = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ]
    
    // ใช้ UTC methods เพื่อแสดงเวลาตามที่เก็บในฐานข้อมูลโดยตรง
    const dateNum = d.getUTCDate().toString().padStart(2, '0')
    const month = thaiMonthsShort[d.getUTCMonth()]
    const year = (d.getUTCFullYear() + 543).toString().slice(-4) // ปี พ.ศ. 4 หลัก
    const hours = d.getUTCHours().toString().padStart(2, '0')
    const minutes = d.getUTCMinutes().toString().padStart(2, '0')
    
    return `${dateNum} ${month} ${year} ${hours}:${minutes}`
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบกลาง
   * ตัวอย่าง: "15 ม.ค. 2567 14:30"
   */
  static formatMediumThaiDate(date: Date | string): string {
    return this.formatShortThaiDate(date)
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบวันที่เท่านั้น
   * ตัวอย่าง: "15 ม.ค. 2567"
   */
  static formatThaiDateOnly(date: Date | string): string {
    const shortDate = this.formatShortThaiDate(date)
    return shortDate.split(' ').slice(0, 3).join(' ')
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบเวลาที่เท่านั้น
   * ตัวอย่าง: "14:30"
   */
  static formatThaiTimeOnly(date: Date | string): string {
    const shortDate = this.formatShortThaiDate(date)
    return shortDate.split(' ').slice(3).join(' ')
  }

  /**
   * แปลงวันที่เป็นรูปแบบ "เมื่อ X ที่แล้ว"
   * ตัวอย่าง: "2 ชั่วโมงที่แล้ว", "3 วันที่แล้ว"
   * เปรียบเทียบกับเวลาปัจจุบันของ SQL Server (GETDATE())
   */
  static formatRelativeTime(date: Date | string): string {
    const d = this.parseDate(date)
    const now = new Date() // เวลาปัจจุบันของ client
    
    // เปรียบเทียบกับเวลาปัจจุบันโดยตรง
    const diffInMs = now.getTime() - d.getTime()
    
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    const diffInWeeks = Math.floor(diffInDays / 7)
    const diffInMonths = Math.floor(diffInDays / 30)
    const diffInYears = Math.floor(diffInDays / 365)
    
    if (diffInMinutes < 1) {
      return 'ไม่กี่วินาทีที่แล้ว'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} นาทีที่แล้ว`
    } else if (diffInHours < 24) {
      return `${diffInHours} ชั่วโมงที่แล้ว`
    } else if (diffInDays < 7) {
      return `${diffInDays} วันที่แล้ว`
    } else if (diffInWeeks < 4) {
      return `${diffInWeeks} สัปดาห์ที่แล้ว`
    } else if (diffInMonths < 12) {
      return `${diffInMonths} เดือนที่แล้ว`
    } else {
      return `${diffInYears} ปีที่แล้ว`
    }
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบตาราง
   * ตัวอย่าง: "15 ม.ค. 2567 14:30"
   */
  static formatThaiTableDate(date: Date | string): string {
    return this.formatShortThaiDate(date)
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบอีเมล
   * ตัวอย่าง: "15 ม.ค. 2567 14:30"
   */
  static formatThaiEmailDate(date: Date | string): string {
    return this.formatShortThaiDate(date)
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบการแจ้งเตือน
   * ตัวอย่าง: "เมื่อ 2 ชั่วโมงที่แล้ว" หรือ "15 ม.ค. 2567 14:30"
   */
  static formatThaiNotificationDate(date: Date | string): string {
    const d = this.parseDate(date)
    const now = new Date() // เวลาปัจจุบันของ client
    const diffInHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return this.formatRelativeTime(date)
    } else {
      return this.formatShortThaiDate(date)
    }
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบรายงาน
   * ตัวอย่าง: "วันที่ 15 ม.ค. 2567"
   */
  static formatThaiReportDate(date: Date | string): string {
    const shortDate = this.formatShortThaiDate(date)
    return `วันที่ ${shortDate}`
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบการพิมพ์
   * ตัวอย่าง: "พิมพ์เมื่อ 15 ม.ค. 2567 14:30"
   */
  static formatThaiPrintDate(date: Date | string): string {
    return `พิมพ์เมื่อ ${this.formatShortThaiDate(date)}`
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบการแสดงผลในตาราง
   * ตัวอย่าง: "15 ม.ค. 2567"
   */
  static formatThaiTableDateOnly(date: Date | string): string {
    const shortDate = this.formatShortThaiDate(date)
    return shortDate.split(' ').slice(0, 3).join(' ')
  }
}

// Export default instance สำหรับการใช้งานง่าย
export default ThaiDateUtils
