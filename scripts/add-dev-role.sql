-- เพิ่มค่า DEV ในฐานข้อมูล SQL Server
-- รันคำสั่งนี้ใน SQL Server Management Studio หรือ Azure Data Studio

-- 1. ตรวจสอบ constraint ปัจจุบัน
SELECT 
    CONSTRAINT_NAME,
    CONSTRAINT_TYPE,
    CHECK_CLAUSE
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS 
WHERE CONSTRAINT_NAME = 'CK__USERS__ROLE__3E52440B';

-- 2. ลบ constraint เดิม (ถ้ามี)
-- ALTER TABLE USERS DROP CONSTRAINT CK__USERS__ROLE__3E52440B;

-- 3. สร้าง constraint ใหม่ที่รวม DEV
-- ALTER TABLE USERS ADD CONSTRAINT CK__USERS__ROLE__3E52440B 
-- CHECK (ROLE IN ('USER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN', 'DEV'));

-- หรือถ้าไม่สามารถลบ constraint ได้ ให้อัปเดตโดยตรง
-- UPDATE USERS SET ROLE = 'DEV' WHERE USER_ID = '9C154';

-- 4. ตรวจสอบว่าอัปเดตสำเร็จหรือไม่
SELECT USER_ID, USERNAME, EMAIL, ROLE FROM USERS WHERE USER_ID = '9C154'; 