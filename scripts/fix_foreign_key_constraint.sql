-- แก้ไข Foreign Key Constraint สำหรับ PRODUCT_AUDIT_LOG
-- เพื่อให้สามารถลบสินค้าได้โดยไม่ต้องลบ audit log

USE StationeryDB;
GO

-- ลบ foreign key constraint เดิม
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_PRODUCT_AUDIT_LOG_PRODUCT_ID')
BEGIN
    ALTER TABLE PRODUCT_AUDIT_LOG DROP CONSTRAINT FK_PRODUCT_AUDIT_LOG_PRODUCT_ID;
    PRINT 'Foreign key constraint FK_PRODUCT_AUDIT_LOG_PRODUCT_ID dropped successfully';
END
ELSE
BEGIN
    PRINT 'Foreign key constraint FK_PRODUCT_AUDIT_LOG_PRODUCT_ID does not exist';
END
GO

-- สร้าง foreign key constraint ใหม่ที่อนุญาตให้ลบสินค้าได้
-- โดยตั้งค่า PRODUCT_ID เป็น NULL เมื่อสินค้าถูกลบ
ALTER TABLE PRODUCT_AUDIT_LOG 
ADD CONSTRAINT FK_PRODUCT_AUDIT_LOG_PRODUCT_ID 
FOREIGN KEY (PRODUCT_ID) REFERENCES PRODUCTS(PRODUCT_ID) 
ON DELETE SET NULL;
GO

PRINT 'New foreign key constraint FK_PRODUCT_AUDIT_LOG_PRODUCT_ID created successfully with ON DELETE SET NULL';
GO

-- ตรวจสอบ constraint ที่สร้างขึ้น
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE CONSTRAINT_NAME = 'FK_PRODUCT_AUDIT_LOG_PRODUCT_ID';
GO
