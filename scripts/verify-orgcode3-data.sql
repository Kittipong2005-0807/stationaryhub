-- ตรวจสอบข้อมูล orgcode3 ใน userWithRoles view
SELECT TOP 10 AdLoginName, EmpCode, orgcode3, FullNameThai
FROM userWithRoles 
WHERE orgcode3 IS NOT NULL
ORDER BY orgcode3, AdLoginName;

-- ตรวจสอบจำนวน user ที่มี orgcode3
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN orgcode3 IS NOT NULL THEN 1 END) as users_with_orgcode3,
    COUNT(CASE WHEN orgcode3 IS NULL THEN 1 END) as users_without_orgcode3
FROM userWithRoles;

-- ตรวจสอบ orgcode3 ที่มีในระบบ
SELECT 
    orgcode3,
    COUNT(*) as user_count
FROM userWithRoles 
WHERE orgcode3 IS NOT NULL
GROUP BY orgcode3
ORDER BY user_count DESC, orgcode3;

-- ตรวจสอบข้อมูลในตาราง USERS หลังจากอัปเดต
SELECT 
    USER_ID,
    USERNAME,
    ORGCODE3,
    ROLE
FROM USERS 
WHERE ORGCODE3 IS NOT NULL
ORDER BY ORGCODE3, USERNAME;

-- ตรวจสอบข้อมูลในตาราง REQUISITIONS หลังจากอัปเดต
SELECT 
    REQUISITION_ID,
    USER_ID,
    ORGCODE3,
    STATUS,
    TOTAL_AMOUNT
FROM REQUISITIONS 
WHERE ORGCODE3 IS NOT NULL
ORDER BY SUBMITTED_AT DESC; 