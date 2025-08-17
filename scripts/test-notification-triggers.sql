-- =====================================================
-- ทดสอบ Triggers สำหรับระบบการแจ้งเตือน
-- =====================================================

USE StationaryHub;
GO

-- ตรวจสอบข้อมูลในตารางก่อนทดสอบ
PRINT '=== ข้อมูลในตารางก่อนทดสอบ ===';
SELECT 'USERS' AS TableName, COUNT(*) AS RecordCount FROM USERS
UNION ALL
SELECT 'REQUISITIONS', COUNT(*) FROM REQUISITIONS
UNION ALL
SELECT 'NOTIFICATIONS', COUNT(*) FROM NOTIFICATIONS;
GO

-- =====================================================
-- ทดสอบ 1: INSERT REQUISITIONS (สร้างคำขอเบิกใหม่)
-- =====================================================
PRINT '=== ทดสอบ 1: สร้างคำขอเบิกใหม่ ===';

-- สร้างคำขอเบิกใหม่
INSERT INTO REQUISITIONS (USER_ID, STATUS, SUBMITTED_AT, TOTAL_AMOUNT, SITE_ID, ISSUE_NOTE)
VALUES (1, 'PENDING', GETDATE(), 2500.00, 'SITE001', 'ทดสอบการสร้างคำขอเบิกใหม่');

-- ตรวจสอบการแจ้งเตือนที่สร้างขึ้น
SELECT 
    'After INSERT' AS TestStep,
    n.NOTIFICATION_ID,
    n.TYPE,
    n.MESSAGE,
    n.IS_READ,
    n.CREATED_AT,
    u.USERNAME AS RecipientName,
    u.ROLE AS RecipientRole
FROM NOTIFICATIONS n
INNER JOIN USERS u ON u.USER_ID = n.USER_ID
WHERE n.REQUISITION_ID = (SELECT MAX(REQUISITION_ID) FROM REQUISITIONS)
ORDER BY n.CREATED_AT DESC;
GO

-- =====================================================
-- ทดสอบ 2: UPDATE STATUS = 'APPROVED' (Manager อนุมัติ)
-- =====================================================
PRINT '=== ทดสอบ 2: Manager อนุมัติคำขอเบิก ===';

-- อัปเดตสถานะเป็น APPROVED
UPDATE REQUISITIONS 
SET STATUS = 'APPROVED' 
WHERE REQUISITION_ID = (SELECT MAX(REQUISITION_ID) FROM REQUISITIONS);

-- ตรวจสอบการแจ้งเตือนที่สร้างขึ้น
SELECT 
    'After APPROVED' AS TestStep,
    n.NOTIFICATION_ID,
    n.TYPE,
    n.MESSAGE,
    n.IS_READ,
    n.CREATED_AT,
    u.USERNAME AS RecipientName,
    u.ROLE AS RecipientRole
FROM NOTIFICATIONS n
INNER JOIN USERS u ON u.USER_ID = n.USER_ID
WHERE n.REQUISITION_ID = (SELECT MAX(REQUISITION_ID) FROM REQUISITIONS)
ORDER BY n.CREATED_AT DESC;
GO

-- =====================================================
-- ทดสอบ 3: UPDATE STATUS = 'PREPARED' (Admin จัดเตรียมของ)
-- =====================================================
PRINT '=== ทดสอบ 3: Admin จัดเตรียมของเสร็จ ===';

-- อัปเดตสถานะเป็น PREPARED
UPDATE REQUISITIONS 
SET STATUS = 'PREPARED' 
WHERE REQUISITION_ID = (SELECT MAX(REQUISITION_ID) FROM REQUISITIONS);

-- ตรวจสอบการแจ้งเตือนที่สร้างขึ้น
SELECT 
    'After PREPARED' AS TestStep,
    n.NOTIFICATION_ID,
    n.TYPE,
    n.MESSAGE,
    n.IS_READ,
    n.CREATED_AT,
    u.USERNAME AS RecipientName,
    u.ROLE AS RecipientRole
FROM NOTIFICATIONS n
INNER JOIN USERS u ON u.USER_ID = n.USER_ID
WHERE n.REQUISITION_ID = (SELECT MAX(REQUISITION_ID) FROM REQUISITIONS)
ORDER BY n.CREATED_AT DESC;
GO

-- =====================================================
-- ทดสอบ 4: สร้างคำขอเบิกใหม่และปฏิเสธ
-- =====================================================
PRINT '=== ทดสอบ 4: สร้างคำขอเบิกใหม่และปฏิเสธ ===';

-- สร้างคำขอเบิกใหม่
INSERT INTO REQUISITIONS (USER_ID, STATUS, SUBMITTED_AT, TOTAL_AMOUNT, SITE_ID, ISSUE_NOTE)
VALUES (2, 'PENDING', GETDATE(), 1800.00, 'SITE001', 'ทดสอบการปฏิเสธคำขอเบิก');

-- อัปเดตสถานะเป็น REJECTED
UPDATE REQUISITIONS 
SET STATUS = 'REJECTED' 
WHERE REQUISITION_ID = (SELECT MAX(REQUISITION_ID) FROM REQUISITIONS);

-- ตรวจสอบการแจ้งเตือนที่สร้างขึ้น
SELECT 
    'After REJECTED' AS TestStep,
    n.NOTIFICATION_ID,
    n.TYPE,
    n.MESSAGE,
    n.IS_READ,
    n.CREATED_AT,
    u.USERNAME AS RecipientName,
    u.ROLE AS RecipientRole
FROM NOTIFICATIONS n
INNER JOIN USERS u ON u.USER_ID = n.USER_ID
WHERE n.REQUISITION_ID = (SELECT MAX(REQUISITION_ID) FROM REQUISITIONS)
ORDER BY n.CREATED_AT DESC;
GO

-- =====================================================
-- สรุปผลการทดสอบ
-- =====================================================
PRINT '=== สรุปผลการทดสอบ Triggers ===';

-- จำนวนการแจ้งเตือนทั้งหมด
SELECT 
    COUNT(*) AS TotalNotifications,
    COUNT(CASE WHEN IS_READ = 1 THEN 1 END) AS ReadNotifications,
    COUNT(CASE WHEN IS_READ = 0 THEN 1 END) AS UnreadNotifications
FROM NOTIFICATIONS;

-- แยกตามประเภทการแจ้งเตือน
SELECT 
    TYPE AS NotificationType,
    COUNT(*) AS Count,
    COUNT(CASE WHEN IS_READ = 1 THEN 1 END) AS ReadCount,
    COUNT(CASE WHEN IS_READ = 0 THEN 1 END) AS UnreadCount
FROM NOTIFICATIONS
GROUP BY TYPE
ORDER BY TYPE;

-- แยกตามผู้รับ
SELECT 
    u.USERNAME AS RecipientName,
    u.ROLE AS RecipientRole,
    COUNT(*) AS NotificationCount,
    COUNT(CASE WHEN n.IS_READ = 1 THEN 1 END) AS ReadCount,
    COUNT(CASE WHEN n.IS_READ = 0 THEN 1 END) AS UnreadCount
FROM NOTIFICATIONS n
INNER JOIN USERS u ON u.USER_ID = n.USER_ID
GROUP BY u.USERNAME, u.ROLE
ORDER BY u.ROLE, u.USERNAME;

-- แยกตาม Requisition
SELECT 
    n.REQUISITION_ID,
    r.STATUS AS RequisitionStatus,
    COUNT(*) AS NotificationCount,
    STRING_AGG(n.TYPE, ', ') AS NotificationTypes
FROM NOTIFICATIONS n
INNER JOIN REQUISITIONS r ON r.REQUISITION_ID = n.REQUISITION_ID
GROUP BY n.REQUISITION_ID, r.STATUS
ORDER BY n.REQUISITION_ID;

PRINT 'การทดสอบ Triggers เสร็จสิ้น!';
GO
