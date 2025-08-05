-- ตั้งค่า orgcode3 แบบ manual สำหรับ user ที่มีอยู่

-- ตัวอย่าง: ตั้งค่า orgcode3 สำหรับ user 9C154
UPDATE USERS 
SET ORGCODE3 = 'IT_DEPT'  -- เปลี่ยนเป็น orgcode3 ที่ถูกต้อง
WHERE USER_ID = '9C154';

-- ตั้งค่า orgcode3 สำหรับ user อื่นๆ
UPDATE USERS 
SET ORGCODE3 = 'HR_DEPT'  -- เปลี่ยนเป็น orgcode3 ที่ถูกต้อง
WHERE USER_ID IN ('user1', 'user2');  -- เปลี่ยนเป็น user ID ที่ถูกต้อง

-- ตรวจสอบผลลัพธ์
SELECT USER_ID, USERNAME, ORGCODE3, ROLE 
FROM USERS 
WHERE ORGCODE3 IS NOT NULL
ORDER BY ORGCODE3, USERNAME;

-- ตรวจสอบ user ที่ยังไม่มี orgcode3
SELECT USER_ID, USERNAME, ROLE 
FROM USERS 
WHERE ORGCODE3 IS NULL
ORDER BY USERNAME; 