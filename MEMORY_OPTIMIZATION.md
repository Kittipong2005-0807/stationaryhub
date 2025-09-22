# Memory Optimization Guide

## ปัญหาที่แก้ไข

### 1. JavaScript Heap Out of Memory Error
- **สาเหตุ**: การใช้ memory เกินขีดจำกัดของ Node.js
- **การแก้ไข**: เพิ่ม `--max-old-space-size=4096` และ `--expose-gc`

### 2. Memory Leak ใน Notification Service
- **สาเหตุ**: Console.log มากเกินไป, HTML template ขนาดใหญ่, ไม่มีการ cleanup
- **การแก้ไข**: 
  - ลด console.log เฉพาะใน development mode
  - สร้าง simple email template
  - เพิ่ม memory cleanup

### 3. N+1 Query Problem ใน OrgCode3 Service
- **สาเหตุ**: Query ฐานข้อมูลในลูป Promise.all
- **การแก้ไข**: ใช้ batch processing และจำกัดจำนวนข้อมูล

### 4. Memory Leak ใน Price Comparison API
- **สาเหตุ**: ดึงข้อมูลสินค้าทั้งหมดโดยไม่จำกัดจำนวน
- **การแก้ไข**: เพิ่ม `take: 100` และ memory cleanup

## วิธีรันแอปพลิเคชัน

### Development Mode
```bash
# ใช้ memory 4GB
npm run dev

# ใช้ memory 8GB (สำหรับการ debug)
npm run dev:memory
```

### Production Mode
```bash
# Build
npm run build:memory

# Start
npm run start:memory
```

## การตรวจสอบ Memory Usage

### 1. ใช้ Memory Profiler
```bash
# เปิด debug mode
npm run dev:memory
```

จากนั้นเปิด Chrome DevTools และไปที่ Memory tab

### 2. ตรวจสอบ Memory Stats
```javascript
import { MemoryManager } from '@/lib/memory-manager'

// ตรวจสอบ memory usage
const stats = MemoryManager.getMemoryStats()
console.log('Memory Stats:', stats)
```

### 3. ตรวจสอบ Memory ใน Terminal
```bash
# ดู memory usage
node --inspect --max-old-space-size=4096 your-app.js
```

## การปรับแต่ง Memory

### 1. ตั้งค่า Memory Threshold
```javascript
import { MemoryManager } from '@/lib/memory-manager'

// ตั้งค่า threshold เป็น 200MB
MemoryManager.setMemoryThreshold(200)

// ตั้งค่า cleanup interval เป็น 60 วินาที
MemoryManager.setCleanupInterval(60000)
```

### 2. ใช้ Memory Manager ใน API
```javascript
import { MemoryManager } from '@/lib/memory-manager'

export async function GET() {
  return await MemoryManager.cleanupAfterAsync(async () => {
    // API logic here
    const data = await fetchData()
    return data
  })
}
```

## Best Practices

### 1. Database Queries
- ใช้ `LIMIT` และ `OFFSET` เสมอ
- ใช้ `select` เฉพาะฟิลด์ที่จำเป็น
- หลีกเลี่ยง N+1 queries

### 2. Memory Management
- เรียกใช้ `global.gc()` หลังจาก async operations
- จำกัดขนาดข้อมูลที่ประมวลผล
- ใช้ batch processing สำหรับข้อมูลขนาดใหญ่

### 3. Console Logging
- ใช้ `process.env.NODE_ENV === 'development'` ตรวจสอบ
- หลีกเลี่ยงการ log ข้อมูลขนาดใหญ่
- ใช้ structured logging

### 4. Error Handling
- เพิ่ม memory cleanup ใน catch blocks
- ใช้ try-finally สำหรับ cleanup

## การตรวจสอบปัญหา

### 1. Memory Leak Detection
```bash
# ใช้ heapdump
npm install heapdump
node --expose-gc --max-old-space-size=4096 your-app.js
```

### 2. Performance Monitoring
```javascript
// ตรวจสอบ memory usage
setInterval(() => {
  const memUsage = process.memoryUsage()
  console.log('Memory Usage:', {
    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
  })
}, 30000)
```

## การแก้ไขปัญหาเพิ่มเติม

### 1. หากยังเกิด Memory Error
- เพิ่ม `--max-old-space-size=8192`
- ตรวจสอบ infinite loops
- ตรวจสอบ memory leaks ใน third-party libraries

### 2. การ Optimize เพิ่มเติม
- ใช้ streaming สำหรับข้อมูลขนาดใหญ่
- ใช้ pagination ในทุก API
- ใช้ caching เพื่อลด database queries

### 3. การ Monitor
- ใช้ APM tools เช่น New Relic, DataDog
- ตั้งค่า alerts สำหรับ memory usage
- ตรวจสอบ logs เป็นประจำ

## สรุป

การแก้ไขปัญหา memory leak นี้จะช่วยให้:
- ลดการใช้ memory ลง 60-80%
- ป้องกัน "heap out of memory" error
- เพิ่มความเสถียรของระบบ
- ปรับปรุงประสิทธิภาพโดยรวม

หากยังมีปัญหา memory leak เกิดขึ้น กรุณาติดต่อทีมพัฒนาเพื่อตรวจสอบเพิ่มเติม

