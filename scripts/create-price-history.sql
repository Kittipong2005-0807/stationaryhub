-- =============================================
-- สร้างตาราง PRICE_HISTORY
-- =============================================

-- เปลี่ยนชื่อฐานข้อมูลตามจริง
USE [StationaryHub_DB]; -- เปลี่ยนเป็นชื่อฐานข้อมูลของคุณ

-- ตรวจสอบว่าตารางมีอยู่แล้วหรือไม่
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PRICE_HISTORY]') AND type in (N'U'))
BEGIN
    -- สร้างตาราง PRICE_HISTORY
    CREATE TABLE PRICE_HISTORY (
        HISTORY_ID INT IDENTITY(1,1) PRIMARY KEY,
        PRODUCT_ID INT NOT NULL,
        OLD_PRICE DECIMAL(18,2),
        NEW_PRICE DECIMAL(18,2) NOT NULL,
        PRICE_CHANGE DECIMAL(18,2),
        PERCENTAGE_CHANGE DECIMAL(5,2),
        YEAR INT NOT NULL,
        RECORDED_DATE DATETIME DEFAULT GETDATE(),
        NOTES VARCHAR(1000),
        CREATED_BY VARCHAR(50)
    );

    -- สร้าง Foreign Key
    ALTER TABLE PRICE_HISTORY 
    ADD CONSTRAINT FK_PRICE_HISTORY_PRODUCTS 
    FOREIGN KEY (PRODUCT_ID) REFERENCES PRODUCTS(PRODUCT_ID);

    -- สร้าง Indexes
    CREATE INDEX IX_PRICE_HISTORY_PRODUCT_ID ON PRICE_HISTORY(PRODUCT_ID);
    CREATE INDEX IX_PRICE_HISTORY_YEAR ON PRICE_HISTORY(YEAR);
    CREATE INDEX IX_PRICE_HISTORY_RECORDED_DATE ON PRICE_HISTORY(RECORDED_DATE);

    PRINT 'ตาราง PRICE_HISTORY สร้างเสร็จแล้ว! 🎉';
END
ELSE
BEGIN
    PRINT 'ตาราง PRICE_HISTORY มีอยู่แล้ว!';
END

-- ตรวจสอบข้อมูลในตาราง
SELECT COUNT(*) as total_records FROM PRICE_HISTORY;
SELECT TOP 5 * FROM PRICE_HISTORY ORDER BY RECORDED_DATE DESC;
