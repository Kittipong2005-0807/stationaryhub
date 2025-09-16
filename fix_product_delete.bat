@echo off
echo ========================================
echo แก้ไขปัญหาการลบสินค้า (Product Delete Fix)
echo ========================================
echo.

echo 1. กำลังหยุด development server...
taskkill /f /im node.exe 2>nul
echo.

echo 2. กำลังอัปเดต Prisma client...
npx prisma generate
echo.

echo 3. กำลังเริ่ม development server...
npm run dev
echo.

echo ========================================
echo เสร็จสิ้น! ตอนนี้สามารถลบสินค้าได้แล้ว
echo ========================================
pause
