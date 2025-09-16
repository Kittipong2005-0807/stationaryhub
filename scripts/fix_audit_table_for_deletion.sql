-- แก้ไขตาราง PRODUCT_AUDIT_LOG เพื่อให้สามารถลบสินค้าได้
USE StationeryDB;
GO

-- ลบ foreign key constraint เดิม
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_PRODUCT_AUDIT_LOG_PRODUCT_ID')
BEGIN
    ALTER TABLE PRODUCT_AUDIT_LOG DROP CONSTRAINT FK_PRODUCT_AUDIT_LOG_PRODUCT_ID;
    PRINT 'Foreign key constraint dropped successfully';
END
ELSE
BEGIN
    PRINT 'Foreign key constraint does not exist';
END
GO

-- แก้ไขคอลัมน์ PRODUCT_ID ให้สามารถเป็น NULL ได้
ALTER TABLE PRODUCT_AUDIT_LOG ALTER COLUMN PRODUCT_ID INT NULL;
GO

-- สร้าง foreign key constraint ใหม่ที่อนุญาตให้ลบสินค้าได้
ALTER TABLE PRODUCT_AUDIT_LOG 
ADD CONSTRAINT FK_PRODUCT_AUDIT_LOG_PRODUCT_ID 
FOREIGN KEY (PRODUCT_ID) REFERENCES PRODUCTS(PRODUCT_ID) 
ON DELETE SET NULL;
GO

PRINT 'Table PRODUCT_AUDIT_LOG updated successfully for product deletion';
GO
