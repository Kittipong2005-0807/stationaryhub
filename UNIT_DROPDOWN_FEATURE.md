# Unit Dropdown Feature for Add New Product

## ความต้องการ
หน้า Add New Product ตรง unit อยากให้ทำเป็น dropdown ที่มีหน่วยที่มีอยู่ในระบบและยังสามารถกรอกเองได้เหมือนเดิมด้วย

## การแก้ไข

### 1. เพิ่ม State สำหรับ Custom Unit
```typescript
const [customUnit, setCustomUnit] = useState("")
```

### 2. เพิ่มรายการหน่วยที่มีอยู่ในระบบ
```typescript
const commonUnits = [
  "EA", "Piece", "Box", "Pack", "Set", "Dozen", "Gross", "Bundle", 
  "Roll", "Sheet", "Pad", "Ream", "Carton", "Case", "Pallet", "Kg", 
  "Gram", "Liter", "Meter", "Yard", "Foot", "Inch", "Cm", "Mm"
]
```

### 3. แทนที่ TextField ด้วย Material-UI Autocomplete
- เปลี่ยนจาก TextField เป็น Material-UI Autocomplete
- ใช้ freeSolo เพื่อให้สามารถเลือกจาก list หรือกรอกเองได้
- มีหน่วยทั่วไปใน options
- สามารถกรอกหน่วยเองได้โดยตรง

### 4. การจัดการ State
- เมื่อเลือกจาก dropdown: เคลียร์ custom input
- เมื่อกรอก custom input: อัปเดต ORDER_UNIT
- เมื่อเคลียร์ custom input: เคลียร์ ORDER_UNIT ด้วย

### 5. การ Reset Form
- เพิ่มการ reset customUnit เมื่อเปิด dialog ใหม่
- ทั้งสำหรับการเพิ่มและแก้ไขสินค้า

## ฟีเจอร์ที่ได้

### ✅ Material-UI Autocomplete สำหรับหน่วยทั่วไป
- ใช้ Material-UI Autocomplete พร้อม freeSolo
- มีหน่วยที่ใช้บ่อยในระบบ: EA, Piece, Box, Pack, Set, Dozen, etc.
- รวมถึงหน่วยวัด: Kg, Gram, Liter, Meter, Yard, Foot, Inch, Cm, Mm
- มี styling ที่สอดคล้องกับ Material-UI components อื่นๆ

### ✅ การกรอกเองได้
- สามารถเลือกจาก dropdown หรือกรอกเองได้ในช่องเดียวกัน
- สามารถกรอกหน่วยที่ไม่มีใน list ได้
- มี helper text อธิบายการใช้งาน

### ✅ การทำงานที่สมบูรณ์
- เลือกจาก dropdown → อัปเดต ORDER_UNIT
- กรอกเอง → อัปเดต ORDER_UNIT
- Reset form → เคลียร์ค่าใน Autocomplete

## ไฟล์ที่แก้ไข
- `app/admin/products/page.tsx`

## วิธีการใช้งาน
1. เข้าหน้า Admin Products
2. คลิก "Add New Product"
3. เลือกหน่วยจาก dropdown หรือกรอกเองในช่อง "Custom Unit"
4. กรอกข้อมูลอื่นๆ และบันทึก

## หมายเหตุ
- หน่วยที่แสดงใน dropdown เป็นหน่วยที่ใช้บ่อยในระบบสำนักงาน
- สามารถเพิ่มหน่วยใหม่ในรายการ commonUnits ได้ตามต้องการ
- การทำงานของ dropdown และ custom input ไม่ขัดแย้งกัน
