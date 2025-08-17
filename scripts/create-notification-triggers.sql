-- =====================================================
-- สร้าง Triggers สำหรับระบบการแจ้งเตือน StationaryHub
-- =====================================================

USE StationaryHub;
GO

-- ลบ Triggers เก่าถ้ามี
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_REQUISITIONS_INSERT_NOTIFICATION')
    DROP TRIGGER TR_REQUISITIONS_INSERT_NOTIFICATION;
GO

IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_REQUISITIONS_APPROVED_NOTIFICATION')
    DROP TRIGGER TR_REQUISITIONS_APPROVED_NOTIFICATION;
GO

IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_REQUISITIONS_PREPARED_NOTIFICATION')
    DROP TRIGGER TR_REQUISITIONS_PREPARED_NOTIFICATION;
GO

IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_REQUISITIONS_REJECTED_NOTIFICATION')
    DROP TRIGGER TR_REQUISITIONS_REJECTED_NOTIFICATION;
GO

-- =====================================================
-- 1. Trigger สำหรับ INSERT REQUISITIONS (สร้างคำขอเบิก)
-- =====================================================
CREATE TRIGGER TR_REQUISITIONS_INSERT_NOTIFICATION
ON REQUISITIONS
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- สร้างการแจ้งเตือนไปหา MANAGER ทั้งหมด
    INSERT INTO NOTIFICATIONS (USER_ID, ACTOR_ID, REQUISITION_ID, TYPE, MESSAGE)
    SELECT 
        u.USER_ID,                    -- ผู้ที่จะได้รับแจ้งเตือน (MANAGER)
        i.USER_ID,                    -- ผู้ที่ทำ action (USER ที่สร้างคำขอเบิก)
        i.REQUISITION_ID,             -- อ้างอิงคำขอเบิก
        'REQUEST_CREATED',            -- ประเภทการแจ้งเตือน
        CONCAT(
            'มีคำขอเบิกใหม่จาก ', 
            COALESCE(actor.USERNAME, 'User #' + CAST(i.USER_ID AS VARCHAR(10))),
            ' จำนวนเงิน ฿', 
            FORMAT(i.TOTAL_AMOUNT, 'N2'),
            ' สถานะ: ', i.STATUS
        ) AS MESSAGE
    FROM inserted i
    CROSS JOIN USERS u
    INNER JOIN USERS actor ON actor.USER_ID = i.USER_ID
    WHERE u.ROLE = 'MANAGER' 
        AND u.SITE_ID = i.SITE_ID     -- MANAGER ใน SITE เดียวกัน
        AND i.STATUS = 'PENDING';
    
    PRINT 'Created notifications for new requisition requests';
END;
GO

-- =====================================================
-- 2. Trigger สำหรับ UPDATE REQUISITIONS.STATUS = 'APPROVED'
-- =====================================================
CREATE TRIGGER TR_REQUISITIONS_APPROVED_NOTIFICATION
ON REQUISITIONS
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- สร้างการแจ้งเตือนไปหา USER ที่สร้างคำขอเบิก
    INSERT INTO NOTIFICATIONS (USER_ID, ACTOR_ID, REQUISITION_ID, TYPE, MESSAGE)
    SELECT 
        i.USER_ID,                    -- ผู้ที่จะได้รับแจ้งเตือน (USER ที่สร้างคำขอเบิก)
        NULL,                         -- ไม่ระบุ ACTOR_ID (ระบบอัตโนมัติ)
        i.REQUISITION_ID,             -- อ้างอิงคำขอเบิก
        'REQUEST_APPROVED',           -- ประเภทการแจ้งเตือน
        CONCAT(
            'คำขอเบิกของคุณได้รับการอนุมัติแล้ว! ',
            'จำนวนเงิน: ฿', FORMAT(i.TOTAL_AMOUNT, 'N2'),
            ' สถานะ: ', i.STATUS
        ) AS MESSAGE
    FROM inserted i
    INNER JOIN deleted d ON d.REQUISITION_ID = i.REQUISITION_ID
    WHERE d.STATUS = 'PENDING' 
        AND i.STATUS = 'APPROVED';
    
    -- สร้างการแจ้งเตือนไปหา ADMIN ทั้งหมด
    INSERT INTO NOTIFICATIONS (USER_ID, ACTOR_ID, REQUISITION_ID, TYPE, MESSAGE)
    SELECT 
        u.USER_ID,                    -- ผู้ที่จะได้รับแจ้งเตือน (ADMIN)
        NULL,                         -- ไม่ระบุ ACTOR_ID (ระบบอัตโนมัติ)
        i.REQUISITION_ID,             -- อ้างอิงคำขอเบิก
        'REQUEST_APPROVED',           -- ประเภทการแจ้งเตือน
        CONCAT(
            'มีคำขอเบิกได้รับการอนุมัติแล้ว! ',
            'จาก User: ', COALESCE(requester.USERNAME, 'User #' + CAST(i.USER_ID AS VARCHAR(10))),
            ' จำนวนเงิน: ฿', FORMAT(i.TOTAL_AMOUNT, 'N2'),
            ' กรุณาจัดเตรียมสินค้า'
        ) AS MESSAGE
    FROM inserted i
    CROSS JOIN USERS u
    INNER JOIN USERS requester ON requester.USER_ID = i.USER_ID
    INNER JOIN deleted d ON d.REQUISITION_ID = i.REQUISITION_ID
    WHERE u.ROLE = 'ADMIN' 
        AND d.STATUS = 'PENDING' 
        AND i.STATUS = 'APPROVED';
    
    PRINT 'Created notifications for approved requisitions';
END;
GO

-- =====================================================
-- 3. Trigger สำหรับ UPDATE REQUISITIONS.STATUS = 'PREPARED'
-- =====================================================
CREATE TRIGGER TR_REQUISITIONS_PREPARED_NOTIFICATION
ON REQUISITIONS
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- สร้างการแจ้งเตือนไปหา USER ที่สร้างคำขอเบิก
    INSERT INTO NOTIFICATIONS (USER_ID, ACTOR_ID, REQUISITION_ID, TYPE, MESSAGE)
    SELECT 
        i.USER_ID,                    -- ผู้ที่จะได้รับแจ้งเตือน (USER ที่สร้างคำขอเบิก)
        NULL,                         -- ไม่ระบุ ACTOR_ID (ระบบอัตโนมัติ)
        i.REQUISITION_ID,             -- อ้างอิงคำขอเบิก
        'REQUEST_PREPARED',           -- ประเภทการแจ้งเตือน
        CONCAT(
            '🎉 สินค้าของคุณพร้อมแล้ว! ',
            'คำขอเบิก #', i.REQUISITION_ID,
            ' ได้รับการจัดเตรียมเรียบร้อยแล้ว ',
            'จำนวนเงิน: ฿', FORMAT(i.TOTAL_AMOUNT, 'N2'),
            ' กรุณาติดต่อแผนกจัดซื้อเพื่อรับสินค้า'
        ) AS MESSAGE
    FROM inserted i
    INNER JOIN deleted d ON d.REQUISITION_ID = i.REQUISITION_ID
    WHERE d.STATUS = 'APPROVED' 
        AND i.STATUS = 'PREPARED';
    
    PRINT 'Created notifications for prepared requisitions';
END;
GO

-- =====================================================
-- 4. Trigger สำหรับ UPDATE REQUISITIONS.STATUS = 'REJECTED'
-- =====================================================
CREATE TRIGGER TR_REQUISITIONS_REJECTED_NOTIFICATION
ON REQUISITIONS
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- สร้างการแจ้งเตือนไปหา USER ที่สร้างคำขอเบิก
    INSERT INTO NOTIFICATIONS (USER_ID, ACTOR_ID, REQUISITION_ID, TYPE, MESSAGE)
    SELECT 
        i.USER_ID,                    -- ผู้ที่จะได้รับแจ้งเตือน (USER ที่สร้างคำขอเบิก)
        NULL,                         -- ไม่ระบุ ACTOR_ID (ระบบอัตโนมัติ)
        i.REQUISITION_ID,             -- อ้างอิงคำขอเบิก
        'REQUEST_REJECTED',           -- ประเภทการแจ้งเตือน
        CONCAT(
            '❌ คำขอเบิกของคุณถูกปฏิเสธ ',
            'คำขอเบิก #', i.REQUISITION_ID,
            ' จำนวนเงิน: ฿', FORMAT(i.TOTAL_AMOUNT, 'N2'),
            ' กรุณาติดต่อ Manager เพื่อทราบรายละเอียด'
        ) AS MESSAGE
    FROM inserted i
    INNER JOIN deleted d ON d.REQUISITION_ID = i.REQUISITION_ID
    WHERE d.STATUS = 'PENDING' 
        AND i.STATUS = 'REJECTED';
    
    PRINT 'Created notifications for rejected requisitions';
END;
GO

-- =====================================================
-- ตรวจสอบ Triggers ที่สร้างขึ้น
-- =====================================================
SELECT 
    name AS TriggerName,
    parent_class_desc AS ParentType,
    create_date AS CreatedDate,
    is_disabled AS IsDisabled
FROM sys.triggers 
WHERE name LIKE 'TR_REQUISITIONS_%'
ORDER BY name;

PRINT 'All notification triggers created successfully!';
GO

-- =====================================================
-- ตัวอย่างการทดสอบ Triggers
-- =====================================================
/*
-- ทดสอบ Trigger INSERT
INSERT INTO REQUISITIONS (USER_ID, STATUS, SUBMITTED_AT, TOTAL_AMOUNT, SITE_ID, ISSUE_NOTE)
VALUES (1, 'PENDING', GETDATE(), 1500.00, 'SITE001', 'ทดสอบการสร้างคำขอเบิก');

-- ทดสอบ Trigger UPDATE APPROVED
UPDATE REQUISITIONS 
SET STATUS = 'APPROVED' 
WHERE REQUISITION_ID = 1;

-- ทดสอบ Trigger UPDATE PREPARED
UPDATE REQUISITIONS 
SET STATUS = 'PREPARED' 
WHERE REQUISITION_ID = 1;

-- ทดสอบ Trigger UPDATE REJECTED
UPDATE REQUISITIONS 
SET STATUS = 'REJECTED' 
WHERE REQUISITION_ID = 1;
*/
