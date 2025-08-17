-- =====================================================
-- เพิ่มข้อมูลทดสอบในตาราง NOTIFICATIONS
-- =====================================================

USE StationaryHub;
GO

-- ตรวจสอบข้อมูลในตารางก่อน
PRINT '=== ข้อมูลในตารางก่อนเพิ่มข้อมูลทดสอบ ===';
SELECT 'USERS' AS TableName, COUNT(*) AS RecordCount FROM USERS
UNION ALL
SELECT 'REQUISITIONS', COUNT(*) FROM REQUISITIONS
UNION ALL
SELECT 'NOTIFICATIONS', COUNT(*) FROM NOTIFICATIONS;
GO

-- เพิ่มข้อมูลทดสอบในตาราง NOTIFICATIONS
PRINT '=== เพิ่มข้อมูลทดสอบในตาราง NOTIFICATIONS ===';

-- สมมติว่า USER_ID 1 เป็น USER, USER_ID 2 เป็น MANAGER, USER_ID 3 เป็น ADMIN
-- สร้างการแจ้งเตือนทดสอบ

-- 1. การแจ้งเตือนสำหรับ USER (REQUEST_CREATED)
INSERT INTO NOTIFICATIONS (USER_ID, ACTOR_ID, REQUISITION_ID, TYPE, MESSAGE, IS_READ, CREATED_AT)
VALUES 
(1, 1, 1, 'REQUEST_CREATED', 'มีคำขอเบิกใหม่จาก User1 จำนวนเงิน ฿2,500.00 สถานะ: PENDING', 0, GETDATE()),
(1, 1, 1, 'REQUEST_APPROVED', 'คำขอเบิกของคุณได้รับการอนุมัติแล้ว! จำนวนเงิน: ฿2,500.00 สถานะ: APPROVED', 0, DATEADD(MINUTE, -30, GETDATE())),
(1, 1, 1, 'REQUEST_PREPARED', '🎉 สินค้าของคุณพร้อมแล้ว! คำขอเบิก #1 ได้รับการจัดเตรียมเรียบร้อยแล้ว จำนวนเงิน: ฿2,500.00 กรุณาติดต่อแผนกจัดซื้อเพื่อรับสินค้า', 0, DATEADD(MINUTE, -15, GETDATE()));

-- 2. การแจ้งเตือนสำหรับ MANAGER
INSERT INTO NOTIFICATIONS (USER_ID, ACTOR_ID, REQUISITION_ID, TYPE, MESSAGE, IS_READ, CREATED_AT)
VALUES 
(2, 1, 1, 'REQUEST_CREATED', 'มีคำขอเบิกใหม่จาก User1 จำนวนเงิน ฿2,500.00 สถานะ: PENDING', 0, GETDATE()),
(2, 1, 2, 'REQUEST_CREATED', 'มีคำขอเบิกใหม่จาก User2 จำนวนเงิน ฿1,800.00 สถานะ: PENDING', 0, DATEADD(MINUTE, -45, GETDATE()));

-- 3. การแจ้งเตือนสำหรับ ADMIN
INSERT INTO NOTIFICATIONS (USER_ID, ACTOR_ID, REQUISITION_ID, TYPE, MESSAGE, IS_READ, CREATED_AT)
VALUES 
(3, 1, 1, 'REQUEST_APPROVED', 'มีคำขอเบิกได้รับการอนุมัติแล้ว! จาก User: User1 จำนวนเงิน: ฿2,500.00 กรุณาจัดเตรียมสินค้า', 0, DATEADD(MINUTE, -30, GETDATE())),
(3, 1, 2, 'REQUEST_APPROVED', 'มีคำขอเบิกได้รับการอนุมัติแล้ว! จาก User: User2 จำนวนเงิน: ฿1,800.00 กรุณาจัดเตรียมสินค้า', 0, DATEADD(MINUTE, -20, GETDATE()));

-- 4. การแจ้งเตือนที่อ่านแล้วแล้ว
INSERT INTO NOTIFICATIONS (USER_ID, ACTOR_ID, REQUISITION_ID, TYPE, MESSAGE, IS_READ, CREATED_AT)
VALUES 
(1, 1, 3, 'REQUEST_CREATED', 'มีคำขอเบิกใหม่จาก User3 จำนวนเงิน ฿3,200.00 สถานะ: PENDING', 1, DATEADD(HOUR, -2, GETDATE())),
(2, 3, 3, 'REQUEST_CREATED', 'มีคำขอเบิกใหม่จาก User3 จำนวนเงิน ฿3,200.00 สถานะ: PENDING', 1, DATEADD(HOUR, -2, GETDATE()));

PRINT '=== เพิ่มข้อมูลทดสอบเสร็จสิ้น ===';

-- ตรวจสอบข้อมูลที่เพิ่มเข้าไป
SELECT 
    'After INSERT' AS Status,
    n.NOTIFICATION_ID,
    n.TYPE,
    n.MESSAGE,
    n.IS_READ,
    n.CREATED_AT,
    u.USERNAME AS RecipientName,
    u.ROLE AS RecipientRole
FROM NOTIFICATIONS n
INNER JOIN USERS u ON u.USER_ID = n.USER_ID
ORDER BY n.CREATED_AT DESC;
GO

-- สรุปข้อมูล
SELECT 
    'Summary' AS Info,
    COUNT(*) AS TotalNotifications,
    COUNT(CASE WHEN IS_READ = 1 THEN 1 END) AS ReadNotifications,
    COUNT(CASE WHEN IS_READ = 0 THEN 1 END) AS UnreadNotifications
FROM NOTIFICATIONS;
GO

-- แยกตามประเภท
SELECT 
    TYPE AS NotificationType,
    COUNT(*) AS Count,
    COUNT(CASE WHEN IS_READ = 1 THEN 1 END) AS ReadCount,
    COUNT(CASE WHEN IS_READ = 0 THEN 1 END) AS UnreadCount
FROM NOTIFICATIONS
GROUP BY TYPE
ORDER BY TYPE;
GO

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
GO

PRINT 'การเพิ่มข้อมูลทดสอบเสร็จสิ้น!';
GO
