-- =====================================================
-- แก้ไข timezone ของ SQL Server ให้เป็น Thai time อย่างสมบูรณ์
-- =====================================================

USE StationaryNew;
GO

PRINT '🔍 ตรวจสอบการตั้งค่า timezone ปัจจุบัน...';
SELECT 
    @@SERVERNAME as server_name,
    GETDATE() as current_db_time,
    GETUTCDATE() as current_utc_time,
    SYSDATETIMEOFFSET() as current_time_with_offset;
GO

-- ลบ trigger เก่าที่มีปัญหา
PRINT '🗑️ ลบ trigger เก่าที่มีปัญหา...';
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_PRODUCT_AUDIT_LOG_ThaiTime')
    DROP TRIGGER TR_PRODUCT_AUDIT_LOG_ThaiTime;
GO

IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_PRODUCTS_ThaiTime')
    DROP TRIGGER TR_PRODUCTS_ThaiTime;
GO

-- สร้างฟังก์ชันใหม่ที่ทำงานได้ดีกว่า
PRINT '🔧 สร้างฟังก์ชันใหม่...';
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'FN' AND name = 'GetThaiTime')
    DROP FUNCTION GetThaiTime;
GO

CREATE FUNCTION GetThaiTime()
RETURNS DATETIME
AS
BEGIN
    -- แปลงจาก UTC เป็น Thai time (+7 hours)
    RETURN DATEADD(HOUR, 7, GETUTCDATE());
END;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'FN' AND name = 'ConvertToThaiTime')
    DROP FUNCTION ConvertToThaiTime;
GO

CREATE FUNCTION ConvertToThaiTime(@utcDateTime DATETIME)
RETURNS DATETIME
AS
BEGIN
    -- แปลงจาก UTC เป็น Thai time (+7 hours)
    RETURN DATEADD(HOUR, 7, @utcDateTime);
END;
GO

-- สร้าง trigger ใหม่ที่ทำงานได้ดีกว่า
PRINT '🔧 สร้าง trigger ใหม่...';

-- Trigger สำหรับ PRODUCT_AUDIT_LOG
CREATE TRIGGER TR_PRODUCT_AUDIT_LOG_ThaiTime
ON PRODUCT_AUDIT_LOG
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- อัปเดต CHANGED_AT เป็น Thai time สำหรับ records ใหม่
    UPDATE PRODUCT_AUDIT_LOG 
    SET CHANGED_AT = dbo.ConvertToThaiTime(CHANGED_AT)
    WHERE AUDIT_ID IN (SELECT AUDIT_ID FROM inserted)
    AND CHANGED_AT IS NOT NULL;
END;
GO

-- Trigger สำหรับ PRODUCTS
CREATE TRIGGER TR_PRODUCTS_ThaiTime
ON PRODUCTS
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- อัปเดต CREATED_AT เป็น Thai time สำหรับ records ใหม่
    UPDATE PRODUCTS 
    SET CREATED_AT = dbo.ConvertToThaiTime(CREATED_AT)
    WHERE PRODUCT_ID IN (SELECT PRODUCT_ID FROM inserted)
    AND CREATED_AT IS NOT NULL;
END;
GO

-- อัปเดตข้อมูลที่มีอยู่แล้วให้เป็น Thai time
PRINT '🔄 อัปเดตข้อมูลที่มีอยู่แล้วให้เป็น Thai time...';

-- อัปเดต PRODUCT_AUDIT_LOG
UPDATE PRODUCT_AUDIT_LOG 
SET CHANGED_AT = dbo.ConvertToThaiTime(CHANGED_AT)
WHERE CHANGED_AT IS NOT NULL;

-- อัปเดต PRODUCTS
UPDATE PRODUCTS 
SET CREATED_AT = dbo.ConvertToThaiTime(CREATED_AT)
WHERE CREATED_AT IS NOT NULL;

-- ทดสอบฟังก์ชันใหม่
PRINT '🧪 ทดสอบฟังก์ชันใหม่...';
SELECT 
    GETDATE() as current_db_time,
    GETUTCDATE() as current_utc_time,
    dbo.GetThaiTime() as thai_time_function,
    dbo.ConvertToThaiTime(GETDATE()) as converted_thai_time;

-- ตรวจสอบข้อมูลที่อัปเดตแล้ว
PRINT '📋 ตรวจสอบข้อมูลที่อัปเดตแล้ว...';
SELECT TOP 3 
    AUDIT_ID,
    ACTION_TYPE,
    CHANGED_AT,
    NOTES
FROM PRODUCT_AUDIT_LOG 
ORDER BY CHANGED_AT DESC;

SELECT TOP 3 
    PRODUCT_ID,
    PRODUCT_NAME,
    CREATED_AT
FROM PRODUCTS 
ORDER BY CREATED_AT DESC;

PRINT '✅ การแก้ไข timezone เสร็จสิ้น!';
PRINT '📋 สรุปการเปลี่ยนแปลง:';
PRINT '   - ลบ trigger เก่าที่มีปัญหา';
PRINT '   - สร้างฟังก์ชันใหม่ที่ทำงานได้ดีกว่า';
PRINT '   - สร้าง trigger ใหม่ที่ทำงานได้ดีกว่า';
PRINT '   - อัปเดตข้อมูลที่มีอยู่แล้วให้เป็น Thai time';
GO
