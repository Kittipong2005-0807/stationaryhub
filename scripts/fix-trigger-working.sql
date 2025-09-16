-- =====================================================
-- แก้ไข trigger ให้ทำงานได้จริง
-- =====================================================

USE StationaryNew;
GO

-- ลบ trigger เก่าที่ไม่ทำงาน
PRINT '🗑️ ลบ trigger เก่าที่ไม่ทำงาน...';
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_PRODUCT_AUDIT_LOG_ThaiTime')
    DROP TRIGGER TR_PRODUCT_AUDIT_LOG_ThaiTime;
GO

IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_PRODUCTS_ThaiTime')
    DROP TRIGGER TR_PRODUCTS_ThaiTime;
GO

-- สร้าง trigger ใหม่ที่ทำงานได้จริง
PRINT '🔧 สร้าง trigger ใหม่ที่ทำงานได้จริง...';
GO

-- Trigger สำหรับ PRODUCT_AUDIT_LOG
CREATE TRIGGER TR_PRODUCT_AUDIT_LOG_ThaiTime
ON PRODUCT_AUDIT_LOG
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- อัปเดต CHANGED_AT เป็น Thai time สำหรับ records ใหม่
    UPDATE PRODUCT_AUDIT_LOG 
    SET CHANGED_AT = DATEADD(HOUR, 7, CHANGED_AT)
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
    SET CREATED_AT = DATEADD(HOUR, 7, CREATED_AT)
    WHERE PRODUCT_ID IN (SELECT PRODUCT_ID FROM inserted)
    AND CREATED_AT IS NOT NULL;
END;
GO

-- ทดสอบ trigger
PRINT '🧪 ทดสอบ trigger...';

-- สร้าง audit log ทดสอบ
INSERT INTO PRODUCT_AUDIT_LOG 
(PRODUCT_ID, ACTION_TYPE, OLD_DATA, NEW_DATA, CHANGED_BY, IP_ADDRESS, USER_AGENT, NOTES)
VALUES (277, 'TRIGGER_TEST', '{"test": "trigger"}', '{"test": "trigger"}', '9C154', '127.0.0.1', 'test-agent', 'Test trigger working');

-- ตรวจสอบผลลัพธ์
SELECT TOP 1 
    AUDIT_ID,
    ACTION_TYPE,
    CHANGED_AT,
    NOTES
FROM PRODUCT_AUDIT_LOG 
WHERE NOTES = 'Test trigger working'
ORDER BY CHANGED_AT DESC;

PRINT '✅ การแก้ไข trigger เสร็จสิ้น!';
GO
