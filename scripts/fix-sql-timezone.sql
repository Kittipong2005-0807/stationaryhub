-- =====================================================
-- แก้ไขการตั้งค่า timezone ของ SQL Server ให้เป็น Thai time
-- =====================================================

USE StationaryNew;
GO

-- ตรวจสอบการตั้งค่า timezone ปัจจุบัน
PRINT '🔍 ตรวจสอบการตั้งค่า timezone ปัจจุบัน...';
SELECT 
    @@SERVERNAME as server_name,
    GETDATE() as current_datetime,
    SYSDATETIMEOFFSET() as current_datetime_with_offset,
    DATENAME(TZOFFSET, SYSDATETIMEOFFSET()) as timezone_offset;
GO

-- ตรวจสอบการตั้งค่า timezone ของ Windows
PRINT '🪟 ตรวจสอบการตั้งค่า timezone ของ Windows...';
EXEC xp_regread 
    'HKEY_LOCAL_MACHINE', 
    'SYSTEM\CurrentControlSet\Control\TimeZoneInformation', 
    'TimeZoneKeyName';
GO

-- สร้างฟังก์ชันสำหรับแปลงเวลาเป็น Thai time
PRINT '🔧 สร้างฟังก์ชันสำหรับแปลงเวลาเป็น Thai time...';
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

-- สร้างฟังก์ชันสำหรับแปลงเวลาเป็น Thai time จาก datetime ที่กำหนด
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

-- ทดสอบฟังก์ชันใหม่
PRINT '🧪 ทดสอบฟังก์ชันใหม่...';
SELECT 
    GETDATE() as current_utc_time,
    dbo.GetThaiTime() as current_thai_time,
    dbo.ConvertToThaiTime(GETDATE()) as converted_thai_time;
GO

-- อัปเดตตาราง PRODUCT_AUDIT_LOG ให้ใช้ Thai time
PRINT '📝 อัปเดตตาราง PRODUCT_AUDIT_LOG ให้ใช้ Thai time...';

-- สร้าง trigger สำหรับแปลงเวลาเป็น Thai time เมื่อ insert
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_PRODUCT_AUDIT_LOG_ThaiTime')
    DROP TRIGGER TR_PRODUCT_AUDIT_LOG_ThaiTime;
GO

CREATE TRIGGER TR_PRODUCT_AUDIT_LOG_ThaiTime
ON PRODUCT_AUDIT_LOG
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- อัปเดต CHANGED_AT เป็น Thai time สำหรับ records ใหม่
    UPDATE PRODUCT_AUDIT_LOG 
    SET CHANGED_AT = dbo.ConvertToThaiTime(CHANGED_AT)
    FROM PRODUCT_AUDIT_LOG p
    INNER JOIN inserted i ON p.AUDIT_ID = i.AUDIT_ID
    WHERE p.CHANGED_AT IS NOT NULL;
END;
GO

-- อัปเดตตาราง PRODUCTS ให้ใช้ Thai time
PRINT '📝 อัปเดตตาราง PRODUCTS ให้ใช้ Thai time...';

-- สร้าง trigger สำหรับแปลงเวลาเป็น Thai time เมื่อ insert/update
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_PRODUCTS_ThaiTime')
    DROP TRIGGER TR_PRODUCTS_ThaiTime;
GO

CREATE TRIGGER TR_PRODUCTS_ThaiTime
ON PRODUCTS
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- อัปเดต CREATED_AT เป็น Thai time สำหรับ records ใหม่
    UPDATE PRODUCTS 
    SET CREATED_AT = dbo.ConvertToThaiTime(CREATED_AT)
    FROM PRODUCTS p
    INNER JOIN inserted i ON p.PRODUCT_ID = i.PRODUCT_ID
    WHERE p.CREATED_AT IS NOT NULL;
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

PRINT '✅ การแก้ไข timezone เสร็จสิ้น!';
PRINT '📋 สรุปการเปลี่ยนแปลง:';
PRINT '   - สร้างฟังก์ชัน GetThaiTime() และ ConvertToThaiTime()';
PRINT '   - สร้าง trigger สำหรับแปลงเวลาเป็น Thai time อัตโนมัติ';
PRINT '   - อัปเดตข้อมูลที่มีอยู่แล้วให้เป็น Thai time';
GO
