-- =====================================================
-- เพิ่มฟิลด์ IS_READ ในตาราง EMAIL_LOGS
-- =====================================================

USE StationaryNew;
GO

-- 1. เพิ่มฟิลด์ IS_READ ในตาราง EMAIL_LOGS
ALTER TABLE EMAIL_LOGS 
ADD IS_READ BIT DEFAULT 0;
GO

-- 2. อัปเดตข้อมูลที่มีอยู่ให้ IS_READ = 0 (false)
UPDATE EMAIL_LOGS 
SET IS_READ = 0 
WHERE IS_READ IS NULL;
GO

-- 3. สร้าง Index สำหรับการค้นหา
CREATE INDEX IX_EMAIL_LOGS_IS_READ ON EMAIL_LOGS(IS_READ);
GO

-- 4. ตรวจสอบผลลัพธ์
SELECT 
    EMAIL_ID,
    TO_USER_ID,
    SUBJECT,
    STATUS,
    IS_READ,
    SENT_AT
FROM EMAIL_LOGS
ORDER BY EMAIL_ID DESC;
GO

PRINT '✅ เพิ่มฟิลด์ IS_READ เสร็จสิ้น!';
GO
