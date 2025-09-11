# การใช้งาน Image Upload API

## 1. การอัพโหลดรูปภาพใหม่ (แทนที่รูปเก่า)

```typescript
import { uploadProductImage } from '@/lib/image-utils';

// ในกรณีแก้ไขสินค้า - จะลบรูปเก่าและอัพโหลดรูปใหม่
const handleImageUpload = async (file: File, oldImageUrl?: string) => {
  const result = await uploadProductImage(file, oldImageUrl);

  if (result.success) {
    console.log('อัพโหลดสำเร็จ:', result.imageUrl);
    // อัพเดทฐานข้อมูลด้วย result.imageUrl
  } else {
    console.error('อัพโหลดล้มเหลว:', result.error);
  }
};

// ตัวอย่างในการแก้ไขสินค้า
const updateProduct = async (productData: any, newImageFile?: File) => {
  let imageUrl = productData.currentImageUrl;

  // ถ้ามีรูปใหม่ให้อัพโหลด (จะลบรูปเก่าอัตโนมัติ)
  if (newImageFile) {
    const uploadResult = await uploadProductImage(
      newImageFile,
      productData.currentImageUrl
    );
    if (uploadResult.success) {
      imageUrl = uploadResult.imageUrl;
    } else {
      throw new Error('Failed to upload image');
    }
  }

  // อัพเดทข้อมูลในฐานข้อมูล
  const response = await fetch('/api/products/update', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...productData,
      imageUrl: imageUrl
    })
  });
};
```

## 2. การลบข้อมูลสินค้า (ลบรูปด้วย)

```typescript
import { deleteProductImage } from '@/lib/image-utils';

const deleteProduct = async (productId: string, imageUrl: string) => {
  try {
    // ลบข้อมูลจากฐานข้อมูล
    const response = await fetch(`/api/products/${productId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      // ลบรูปภาพ
      if (imageUrl) {
        await deleteProductImage(imageUrl);
      }
      console.log('ลบสินค้าและรูปภาพสำเร็จ');
    }
  } catch (error) {
    console.error('Error deleting product:', error);
  }
};
```

## 3. การแสดงรูปภาพ

```typescript
import { getProductImageUrl } from '@/lib/image-utils';

// ในคอมโพเนนต์
const ProductImage = ({ imageUrl }: { imageUrl: string }) => {
  return (
    <img
      src={getProductImageUrl(imageUrl)}
      alt="Product"
      width={200}
      height={200}
    />
  );
};
```

## API Endpoints

### POST /api/upload-product-image

- **Body**: FormData with `file` and optional `oldImageUrl`
- **Response**:
  `{ success: boolean, imageUrl: string, fileName: string, message: string }`

### DELETE /api/upload-product-image?filename=<filename>

- **Response**: `{ success: boolean, message: string }`

## คุณสมบัติ

1. **Auto Delete Old Image**: เมื่อส่ง `oldImageUrl` จะลบรูปเก่าอัตโนมัติ
2. **File Validation**: ตรวจสอบประเภทไฟล์ (JPEG, PNG, WebP) และขนาด (สูงสุด 5MB)
3. **Unique Filename**: สร้างชื่อไฟล์ที่ไม่ซ้ำกันด้วย timestamp และ random
   string
4. **PATH_FILE_URL Support**: ใช้ environment variable สำหรับ path ไฟล์
5. **Error Handling**: จัดการ error และส่ง response ที่เหมาะสม
