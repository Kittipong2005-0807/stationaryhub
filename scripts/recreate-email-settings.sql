-- ลบตาราง EMAIL_SETTINGS เก่าและสร้างใหม่ (ระวัง! จะลบข้อมูลเก่าทั้งหมด)

USE StationaryHub;
GO

-- ตรวจสอบว่าตาราง EMAIL_SETTINGS มีอยู่หรือไม่
IF EXISTS (SELECT * FROM sysobjects WHERE name='EMAIL_SETTINGS' AND xtype='U')
BEGIN
    PRINT '⚠️ EMAIL_SETTINGS table exists, dropping...';
    
    -- แสดงข้อมูลเก่าก่อนลบ
    SELECT 
        ID,
        ENABLED,
        SCHEDULE_HOUR,
        SCHEDULE_MINUTE,
        TIMEZONE,
        FREQUENCY,
        MANAGER_EMAILS,
        ADMIN_EMAILS,
        EMAIL_SUBJECT,
        CREATED_DATE,
        UPDATED_DATE
    FROM EMAIL_SETTINGS;
    
    PRINT '📋 Old data shown above (will be deleted)';
    
    -- ลบตาราง
    DROP TABLE EMAIL_SETTINGS;
    PRINT '🗑️ EMAIL_SETTINGS table dropped';
END
ELSE
BEGIN
    PRINT '📝 EMAIL_SETTINGS table does not exist';
END
GO

-- สร้างตาราง EMAIL_SETTINGS ใหม่
CREATE TABLE EMAIL_SETTINGS (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    ENABLED BIT NOT NULL DEFAULT 1,
    SCHEDULE_HOUR INT NOT NULL DEFAULT 10,
    SCHEDULE_MINUTE INT NOT NULL DEFAULT 0,
    TIMEZONE NVARCHAR(50) NOT NULL DEFAULT 'Asia/Bangkok',
    FREQUENCY NVARCHAR(20) NOT NULL DEFAULT 'daily',
    MIN_DAYS_PENDING INT NOT NULL DEFAULT 1,
    MAX_DAYS_PENDING INT NOT NULL DEFAULT 30,
    MANAGER_EMAILS NVARCHAR(MAX),
    ADMIN_EMAILS NVARCHAR(MAX),
    CUSTOM_EMAILS NVARCHAR(MAX),
    EMAIL_SUBJECT NVARCHAR(255),
    HEADER_COLOR NVARCHAR(20),
    URGENCY_LEVEL NVARCHAR(20),
    INCLUDE_PRODUCT_DETAILS BIT NOT NULL DEFAULT 1,
    INCLUDE_REQUESTER_INFO BIT NOT NULL DEFAULT 1,
    CUSTOM_MESSAGE NVARCHAR(MAX),
    CREATED_DATE DATETIME2 NOT NULL DEFAULT GETDATE(),
    UPDATED_DATE DATETIME2 NOT NULL DEFAULT GETDATE()
);
PRINT '✅ EMAIL_SETTINGS table created successfully';
GO

-- เพิ่มข้อมูลเริ่มต้น
INSERT INTO EMAIL_SETTINGS (
    ENABLED,
    SCHEDULE_HOUR,
    SCHEDULE_MINUTE,
    TIMEZONE,
    FREQUENCY,
    MIN_DAYS_PENDING,
    MAX_DAYS_PENDING,
    MANAGER_EMAILS,
    ADMIN_EMAILS,
    CUSTOM_EMAILS,
    EMAIL_SUBJECT,
    HEADER_COLOR,
    URGENCY_LEVEL,
    INCLUDE_PRODUCT_DETAILS,
    INCLUDE_REQUESTER_INFO,
    CUSTOM_MESSAGE
) VALUES (
    1, -- ENABLED
    10, -- SCHEDULE_HOUR (10 โมงเช้า)
    0, -- SCHEDULE_MINUTE
    'Asia/Bangkok', -- TIMEZONE
    'daily', -- FREQUENCY
    1, -- MIN_DAYS_PENDING
    30, -- MAX_DAYS_PENDING
    '["manager@company.com"]', -- MANAGER_EMAILS
    '["admin@company.com"]', -- ADMIN_EMAILS
    '[]', -- CUSTOM_EMAILS
    '🔔 แจ้งเตือนซ้ำ - มีคำขอเบิกรอการอนุมัติ', -- EMAIL_SUBJECT
    '#dc2626', -- HEADER_COLOR
    'medium', -- URGENCY_LEVEL
    1, -- INCLUDE_PRODUCT_DETAILS
    1, -- INCLUDE_REQUESTER_INFO
    '' -- CUSTOM_MESSAGE
);
PRINT '✅ Default data inserted successfully';
GO

-- แสดงข้อมูลใหม่
SELECT 
    ID,
    ENABLED,
    SCHEDULE_HOUR,
    SCHEDULE_MINUTE,
    TIMEZONE,
    FREQUENCY,
    MIN_DAYS_PENDING,
    MAX_DAYS_PENDING,
    MANAGER_EMAILS,
    ADMIN_EMAILS,
    EMAIL_SUBJECT,
    HEADER_COLOR,
    URGENCY_LEVEL,
    CREATED_DATE,
    UPDATED_DATE
FROM EMAIL_SETTINGS;
GO

PRINT '🎉 EMAIL_SETTINGS recreation completed!';
PRINT '📧 Default schedule: Every day at 10:00 AM';
PRINT '📧 Default recipients: manager@company.com, admin@company.com';
PRINT '📧 Default subject: 🔔 แจ้งเตือนซ้ำ - มีคำขอเบิกรอการอนุมัติ';
PRINT '⚠️ Warning: All old data has been deleted!';

