-- อัปเดตข้อมูลในตาราง EMAIL_SETTINGS (สำหรับกรณีที่ตารางมีอยู่แล้ว)

USE StationaryHub;
GO

-- ตรวจสอบว่าตาราง EMAIL_SETTINGS มีอยู่หรือไม่
IF EXISTS (SELECT * FROM sysobjects WHERE name='EMAIL_SETTINGS' AND xtype='U')
BEGIN
    PRINT '✅ EMAIL_SETTINGS table exists';
    
    -- ตรวจสอบว่ามีข้อมูลหรือไม่
    IF EXISTS (SELECT * FROM EMAIL_SETTINGS)
    BEGIN
        PRINT '⚠️ EMAIL_SETTINGS table already has data';
        
        -- แสดงข้อมูลปัจจุบัน
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
        
        PRINT '📋 Current data shown above';
    END
    ELSE
    BEGIN
        PRINT '📝 EMAIL_SETTINGS table is empty, inserting default data...';
        
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
    END
END
ELSE
BEGIN
    PRINT '❌ EMAIL_SETTINGS table does not exist';
    PRINT 'Please run scripts/create-email-settings-table.sql first';
END
GO

-- แสดงข้อมูลล่าสุด
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
FROM EMAIL_SETTINGS
ORDER BY CREATED_DATE DESC;
GO

PRINT '🎉 EMAIL_SETTINGS update completed!';
PRINT '📧 Default schedule: Every day at 10:00 AM';
PRINT '📧 Default recipients: manager@company.com, admin@company.com';
PRINT '📧 Default subject: 🔔 แจ้งเตือนซ้ำ - มีคำขอเบิกรอการอนุมัติ';

