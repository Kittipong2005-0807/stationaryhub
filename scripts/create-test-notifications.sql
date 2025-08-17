-- สร้างการแจ้งเตือนทดสอบสำหรับระบบ StationaryHub
-- ไฟล์นี้ใช้สำหรับทดสอบฟีเจอร์การแจ้งเตือน

-- ลบข้อมูลการแจ้งเตือนทดสอบเก่า (ถ้ามี)
DELETE FROM EMAIL_LOGS WHERE SUBJECT LIKE '%ทดสอบ%' OR SUBJECT LIKE '%สินค้ามาแล้ว%'

-- สร้างการแจ้งเตือนทดสอบสำหรับ admin
INSERT INTO EMAIL_LOGS (TO_USER_ID, SUBJECT, BODY, STATUS, SENT_AT) VALUES 
('admin', 'ทดสอบการแจ้งเตือน #1', 'นี่เป็นการแจ้งเตือนทดสอบเพื่อตรวจสอบระบบ', 'SENT', GETDATE()),
('admin', 'ทดสอบการแจ้งเตือน #2', 'การแจ้งเตือนทดสอบที่สองสำหรับการตรวจสอบ', 'SENT', DATEADD(HOUR, -1, GETDATE())),
('admin', 'ทดสอบการแจ้งเตือน #3', 'การแจ้งเตือนทดสอบที่สามสำหรับการตรวจสอบ', 'SENT', DATEADD(HOUR, -2, GETDATE()))

-- สร้างการแจ้งเตือนทดสอบสำหรับ manager1
INSERT INTO EMAIL_LOGS (TO_USER_ID, SUBJECT, BODY, STATUS, SENT_AT) VALUES 
('manager1', 'ทดสอบการแจ้งเตือน Manager #1', 'การแจ้งเตือนทดสอบสำหรับ Manager คนที่ 1', 'SENT', GETDATE()),
('manager1', 'ทดสอบการแจ้งเตือน Manager #2', 'การแจ้งเตือนทดสอบสำหรับ Manager คนที่ 2', 'SENT', DATEADD(HOUR, -1, GETDATE()))

-- สร้างการแจ้งเตือนทดสอบสำหรับ user1
INSERT INTO EMAIL_LOGS (TO_USER_ID, SUBJECT, BODY, STATUS, SENT_AT) VALUES 
('user1', 'ทดสอบการแจ้งเตือน User #1', 'การแจ้งเตือนทดสอบสำหรับ User คนที่ 1', 'SENT', GETDATE()),
('user1', 'ทดสอบการแจ้งเตือน User #2', 'การแจ้งเตือนทดสอบสำหรับ User คนที่ 2', 'SENT', DATEADD(HOUR, -1, GETDATE()))

-- สร้างการแจ้งเตือนทดสอบสำหรับสินค้ามาแล้ว
INSERT INTO EMAIL_LOGS (TO_USER_ID, SUBJECT, BODY, STATUS, SENT_AT) VALUES 
('admin', 'สินค้ามาแล้ว - Requisition #1', 'สินค้าที่คุณขอเบิก (Requisition #1) ได้มาถึงแล้ว กรุณาติดต่อแผนกจัดซื้อเพื่อรับสินค้า', 'SENT', GETDATE()),
('manager1', 'สินค้ามาแล้ว - Requisition #2', 'สินค้าที่คุณขอเบิก (Requisition #2) ได้มาถึงแล้ว กรุณาติดต่อแผนกจัดซื้อเพื่อรับสินค้า', 'SENT', DATEADD(HOUR, -1, GETDATE())),
('user1', 'สินค้ามาแล้ว - Requisition #3', 'สินค้าที่คุณขอเบิก (Requisition #3) ได้มาถึงแล้ว กรุณาติดต่อแผนกจัดซื้อเพื่อรับสินค้า', 'SENT', DATEADD(HOUR, -2, GETDATE()))

-- สร้างการแจ้งเตือนทดสอบสำหรับการอนุมัติ
INSERT INTO EMAIL_LOGS (TO_USER_ID, SUBJECT, BODY, STATUS, SENT_AT) VALUES 
('admin', 'คำขอเบิกได้รับการอนุมัติ', 'คำขอเบิกของคุณ (เลขที่ 1001) ได้รับการอนุมัติแล้ว', 'SENT', GETDATE()),
('manager1', 'คำขอเบิกได้รับการอนุมัติ', 'คำขอเบิกของคุณ (เลขที่ 1002) ได้รับการอนุมัติแล้ว', 'SENT', DATEADD(HOUR, -1, GETDATE()))

-- แสดงผลการสร้างการแจ้งเตือนทดสอบ
SELECT 
    'Created test notifications:' as Message,
    COUNT(*) as TotalNotifications,
    TO_USER_ID as UserID
FROM EMAIL_LOGS 
WHERE SUBJECT LIKE '%ทดสอบ%' OR SUBJECT LIKE '%สินค้ามาแล้ว%' OR SUBJECT LIKE '%อนุมัติ%'
GROUP BY TO_USER_ID

-- แสดงการแจ้งเตือนทั้งหมดที่สร้างขึ้น
SELECT 
    EMAIL_ID,
    TO_USER_ID,
    SUBJECT,
    BODY,
    STATUS,
    SENT_AT
FROM EMAIL_LOGS 
WHERE SUBJECT LIKE '%ทดสอบ%' OR SUBJECT LIKE '%สินค้ามาแล้ว%' OR SUBJECT LIKE '%อนุมัติ%'
ORDER BY SENT_AT DESC
