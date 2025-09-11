import { getBasePathUrl } from './base-path';

// ฟังก์ชันสำหรับอัพโหลดรูปภาพ (แทนที่รูปเก่าถ้ามี)
export async function uploadProductImage(
  file: File,
  oldImageUrl?: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    // ส่งชื่อไฟล์เก่าเพื่อลบ (ถ้ามี)
    if (oldImageUrl) {
      formData.append('oldImageUrl', oldImageUrl);
    }

    const response = await fetch(getBasePathUrl('/api/upload-product-image'), {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return { success: true, imageUrl: result.imageUrl };
    } else {
      return { success: false, error: result.error || 'Upload failed' };
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    return { success: false, error: 'Network error' };
  }
}

// ฟังก์ชันสำหรับลบรูปภาพ
export async function deleteProductImage(
  filename: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(
      getBasePathUrl(
        `/api/upload-product-image?filename=${encodeURIComponent(filename)}`
      ),
      {
        method: 'DELETE'
      }
    );

    const result = await response.json();

    if (response.ok) {
      return { success: result.success, message: result.message };
    } else {
      return { success: false, error: result.error || 'Delete failed' };
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    return { success: false, error: 'Network error' };
  }
}

// ฟังก์ชันสำหรับสร้าง URL รูปภาพ
export function getProductImageUrl(filename: string): string {
  if (!filename) return '';
  return getBasePathUrl(`/api/image/${filename}`);
}
