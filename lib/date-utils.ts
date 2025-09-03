/**
 * Utility functions สำหรับจัดการวันที่และเวลาแบบไทย
 */

export class ThaiDateUtils {
  /**
   * แปลงวันที่เป็น Date object ที่ตรงกับฐานข้อมูล
   * ลบ 7 ชั่วโมงเพื่อแปลงจาก local time (UTC+7) กลับเป็น database time (UTC+0)
   */
  private static toDatabaseTime(date: Date | string): Date {
    const d = new Date(date)
    // ลบ 7 ชั่วโมงเพื่อแปลงจาก local time (UTC+7) กลับเป็น database time (UTC+0)
    d.setHours(d.getHours() - 7)
    return d
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบเต็ม
   * ตัวอย่าง: "วันพุธที่ 15 มกราคม 2567 เวลา 14:30 น."
   */
  static formatFullThaiDate(date: Date | string): string {
    const d = this.toDatabaseTime(date)
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ]
    const thaiDays = [
      'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
    ]
    
    const day = thaiDays[d.getDay()]
    const dateNum = d.getDate()
    const month = thaiMonths[d.getMonth()]
    const year = d.getFullYear() + 543 // แปลงเป็นปี พ.ศ.
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    
    return `${day}ที่ ${dateNum} ${month} ${year} เวลา ${hours}:${minutes} น.`
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบย่อ
   * ตัวอย่าง: "15 ม.ค. 2567 14:30"
   */
  static formatShortThaiDate(date: Date | string): string {
    const d = this.toDatabaseTime(date)
    const thaiMonthsShort = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ]
    
    const dateNum = d.getDate().toString().padStart(2, '0')
    const month = thaiMonthsShort[d.getMonth()]
    const year = (d.getFullYear() + 543).toString().slice(-4) // ปี พ.ศ. 4 หลัก
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    
    return `${dateNum} ${month} ${year} ${hours}:${minutes}`
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบกลาง
   * ตัวอย่าง: "15 มกราคม 2567 เวลา 14:30 น."
   */
  static formatMediumThaiDate(date: Date | string): string {
    const d = this.toDatabaseTime(date)
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ]
    
    const dateNum = d.getDate()
    const month = thaiMonths[d.getMonth()]
    const year = d.getFullYear() + 543
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    
    return `${dateNum} ${month} ${year} เวลา ${hours}:${minutes} น.`
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบวันที่เท่านั้น
   * ตัวอย่าง: "15 มกราคม 2567"
   */
  static formatThaiDateOnly(date: Date | string): string {
    const d = this.toDatabaseTime(date)
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ]
    
    const dateNum = d.getDate()
    const month = thaiMonths[d.getMonth()]
    const year = d.getFullYear() + 543
    
    return `${dateNum} ${month} ${year}`
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบเวลาที่เท่านั้น
   * ตัวอย่าง: "14:30 น."
   */
  static formatThaiTimeOnly(date: Date | string): string {
    const d = this.toDatabaseTime(date)
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    
    return `${hours}:${minutes} น.`
  }

  /**
   * แปลงวันที่เป็นรูปแบบ "เมื่อ X ที่แล้ว"
   * ตัวอย่าง: "2 ชั่วโมงที่แล้ว", "3 วันที่แล้ว"
   */
  static formatRelativeTime(date: Date | string): string {
    const d = this.toDatabaseTime(date)
    const now = new Date()
    // ลบ 7 ชั่วโมงจากเวลาปัจจุบันเพื่อเปรียบเทียบกับ database time
    now.setHours(now.getHours() - 7)
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
   * ตัวอย่าง: "15/01/2567 14:30"
   */
  static formatThaiTableDate(date: Date | string): string {
    const d = this.toDatabaseTime(date)
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const year = (d.getFullYear() + 543).toString().slice(-4)
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    
    return `${day}/${month}/${year} ${hours}:${minutes}`
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบอีเมล
   * ตัวอย่าง: "15 มกราคม 2567 เวลา 14:30 น."
   */
  static formatThaiEmailDate(date: Date | string): string {
    return this.formatMediumThaiDate(date)
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบการแจ้งเตือน
   * ตัวอย่าง: "เมื่อ 2 ชั่วโมงที่แล้ว" หรือ "15 ม.ค. 2567"
   */
  static formatThaiNotificationDate(date: Date | string): string {
    const d = this.toDatabaseTime(date)
    const now = new Date()
    // ลบ 7 ชั่วโมงจากเวลาปัจจุบันเพื่อเปรียบเทียบกับ database time
    now.setHours(now.getHours() - 7)
    const diffInHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return this.formatRelativeTime(date)
    } else {
      return this.formatShortThaiDate(date)
    }
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบรายงาน
   * ตัวอย่าง: "วันที่ 15 มกราคม 2567"
   */
  static formatThaiReportDate(date: Date | string): string {
    const d = this.toDatabaseTime(date)
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ]
    
    const dateNum = d.getDate()
    const month = thaiMonths[d.getMonth()]
    const year = d.getFullYear() + 543
    
    return `วันที่ ${dateNum} ${month} ${year}`
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบการพิมพ์
   * ตัวอย่าง: "พิมพ์เมื่อวันที่ 15 มกราคม 2567 เวลา 14:30 น."
   */
  static formatThaiPrintDate(date: Date | string): string {
    return `พิมพ์เมื่อ${this.formatMediumThaiDate(date)}`
  }

  /**
   * แปลงวันที่เป็นรูปแบบไทยแบบการแสดงผลในตาราง
   * ตัวอย่าง: "15 ม.ค. 2567"
   */
  static formatThaiTableDateOnly(date: Date | string): string {
    const d = this.toDatabaseTime(date)
    const thaiMonthsShort = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ]
    
    const dateNum = d.getDate().toString().padStart(2, '0')
    const month = thaiMonthsShort[d.getMonth()]
    const year = (d.getFullYear() + 543).toString().slice(-4)
    
    return `${dateNum} ${month} ${year}`
  }
}

// Export default instance สำหรับการใช้งานง่าย
export default ThaiDateUtils
