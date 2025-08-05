-- ตรวจสอบ Role ของ User 9C154 ในฐานข้อมูล

-- 1. ตรวจสอบในตาราง USERS
SELECT 
    USER_ID,
    USERNAME,
    EMAIL,
    ROLE,
    DEPARTMENT,
    SITE_ID,
    CREATED_AT
FROM USERS 
WHERE USER_ID = '9C154';

-- 2. ตรวจสอบใน view userWithRoles
SELECT 
    AdLoginName,
    CurrentEmail,
    FullNameEng,
    FullNameThai,
    Role,
    Department
FROM userWithRoles 
WHERE AdLoginName = '9C154';

-- 3. ตรวจสอบ Role ทั้งหมดในระบบ
SELECT 
    ROLE,
    COUNT(*) as UserCount
FROM USERS 
GROUP BY ROLE
ORDER BY UserCount DESC;

-- 4. ตรวจสอบ User ที่มี Role DEV
SELECT 
    USER_ID,
    USERNAME,
    EMAIL,
    ROLE,
    DEPARTMENT
FROM USERS 
WHERE ROLE = 'DEV'; 