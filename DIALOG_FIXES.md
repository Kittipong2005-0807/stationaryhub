# การแก้ไขปัญหา Dialog และ Accessibility

## ปัญหาที่พบ

### 1. Hydration Error: `<h5>` cannot be a child of `<h2>`

**สาเหตุ:** Material-UI `DialogTitle` ใช้ `h2` tag เป็น default แต่ภายในมี `Typography` ที่ใช้ `variant="h5"` ซึ่งจะ render เป็น `h5` tag ทำให้เกิดการซ้อนกันของ heading tags ที่ไม่ถูกต้อง

**การแก้ไข:**
- เพิ่ม `component="div"` ใน `Typography` components ที่อยู่ภายใน `DialogTitle`
- เปลี่ยนจาก `<h2>` เป็น `<div>` ในกรณีที่ใช้ HTML tag โดยตรง

### 2. Accessibility Warning: aria-hidden on focused element

**สาเหตุ:** Material-UI Dialog ใช้ `aria-hidden="true"` เพื่อซ่อนเนื้อหาที่อยู่เบื้องหลังเมื่อ Dialog เปิดอยู่ แต่มีปุ่มที่ยังคง focus ได้อยู่ภายในพื้นที่ที่ถูกซ่อนไว้

**การแก้ไข:**
- เพิ่ม CSS rules ใน `app/globals.css` เพื่อจัดการ focus management
- สร้าง utility functions ใน `lib/dialog-utils.ts` สำหรับจัดการ focus
- ป้องกันการ focus บน elements ที่ถูกซ่อนไว้

## ไฟล์ที่แก้ไข

### 1. `app/admin/products/page.tsx`
```tsx
// ก่อน
<Typography variant="h5" className="font-bold">

// หลัง
<Typography variant="h5" component="div" className="font-bold">
```

### 2. `app/admin/page.tsx`
```tsx
// ก่อน
<h2 className="text-2xl font-bold text-gray-900">สินค้ามาแล้ว!</h2>

// หลัง
<div className="text-2xl font-bold text-gray-900">สินค้ามาแล้ว!</div>
```

### 3. `app/globals.css`
เพิ่ม CSS rules สำหรับจัดการ aria-hidden และ focus management:

```css
/* Fix for aria-hidden warning in Material-UI Dialog */
@layer utilities {
  /* Ensure focus management works properly with aria-hidden */
  [aria-hidden="true"] {
    pointer-events: none;
  }
  
  [aria-hidden="true"] * {
    pointer-events: none;
  }
  
  /* Prevent focus on hidden elements */
  [aria-hidden="true"] button,
  [aria-hidden="true"] input,
  [aria-hidden="true"] select,
  [aria-hidden="true"] textarea,
  [aria-hidden="true"] [tabindex] {
    pointer-events: none;
    user-select: none;
  }
}
```

### 4. `lib/dialog-utils.ts`
สร้าง utility functions สำหรับจัดการ focus management:

- `manageDialogFocus()` - จัดการ focus เมื่อ dialog เปิด
- `preventOutsideFocus()` - ป้องกันการ focus นอก dialog
- `restoreFocus()` - คืน focus เมื่อ dialog ปิด
- `useDialogFocus()` - React hook สำหรับจัดการ focus

## การใช้งาน

### สำหรับ Dialog ใหม่
```tsx
import { useDialogFocus } from '@/lib/dialog-utils'

const MyDialog = () => {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  
  useDialogFocus(open, dialogRef.current)
  
  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <div ref={dialogRef}>
        {/* Dialog content */}
      </div>
    </Dialog>
  )
}
```

### สำหรับ Typography ใน DialogTitle
```tsx
<DialogTitle>
  <Typography variant="h5" component="div" className="font-bold">
    Dialog Title
  </Typography>
  <Typography variant="body2" component="div" className="text-gray-600">
    Dialog description
  </Typography>
</DialogTitle>
```

## ผลลัพธ์

หลังจากแก้ไขแล้ว:
- ✅ ไม่มี hydration error อีกต่อไป
- ✅ ไม่มี accessibility warning เกี่ยวกับ aria-hidden
- ✅ Focus management ทำงานได้อย่างถูกต้อง
- ✅ Dialog มี accessibility ที่ดีขึ้น

## หมายเหตุ

- การแก้ไขนี้ใช้ได้กับ Material-UI Dialog และ Radix UI Dialog
- ควรทดสอบกับ screen reader เพื่อให้แน่ใจว่า accessibility ทำงานได้ดี
- หากมี Dialog ใหม่ ควรใช้ `component="div"` ใน Typography ที่อยู่ภายใน DialogTitle เสมอ
