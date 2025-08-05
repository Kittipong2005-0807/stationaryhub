-- ตรวจสอบโครงสร้างของ userWithRoles view
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'userWithRoles' 
ORDER BY ORDINAL_POSITION;

-- ตรวจสอบข้อมูลใน userWithRoles view
SELECT TOP 10 * FROM userWithRoles;

-- หากต้องการเพิ่มฟิลด์ orgcode3 ใน userWithRoles view
-- (ต้องแก้ไข view definition ใน SQL Server Management Studio)
-- ตัวอย่าง:
/*
CREATE OR ALTER VIEW userWithRoles AS
SELECT 
    AdLoginName,
    EmpCode,
    CurrentEmail,
    FullNameEng,
    FullNameThai,
    PostNameEng,
    CostCenterEng,
    orgcode3  -- เพิ่มฟิลด์นี้
FROM your_source_table
*/ 