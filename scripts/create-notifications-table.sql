-- =====================================================
-- สร้างตาราง NOTIFICATIONS สำหรับระบบการแจ้งเตือน
-- =====================================================

USE StationaryHub;
GO

-- สร้างตาราง NOTIFICATIONS
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[NOTIFICATIONS]') AND type in (N'U'))
BEGIN
    CREATE TABLE NOTIFICATIONS (
        NOTIFICATION_ID INT PRIMARY KEY IDENTITY(1,1),
        USER_ID INT NOT NULL,          -- ผู้ที่จะได้รับแจ้งเตือน
        ACTOR_ID INT NULL,             -- ผู้ที่ทำ action
        REQUISITION_ID INT NULL,       -- อ้างอิงคำขอเบิก
        TYPE NVARCHAR(50) NOT NULL,    -- REQUEST_CREATED, REQUEST_APPROVED, REQUEST_REJECTED, REQUEST_PREPARED
        MESSAGE NVARCHAR(MAX) NOT NULL,
        IS_READ BIT DEFAULT 0,
        CREATED_AT DATETIME DEFAULT GETDATE()
    );
    
    PRINT 'Table NOTIFICATIONS created successfully!';
END
ELSE
BEGIN
    PRINT 'Table NOTIFICATIONS already exists!';
END
GO

-- สร้าง Foreign Key Constraints
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_NOTIFICATIONS_USER_ID')
BEGIN
    ALTER TABLE NOTIFICATIONS 
    ADD CONSTRAINT FK_NOTIFICATIONS_USER_ID 
    FOREIGN KEY (USER_ID) REFERENCES USERS(USER_ID);
    
    PRINT 'Foreign key FK_NOTIFICATIONS_USER_ID created successfully!';
END
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_NOTIFICATIONS_ACTOR_ID')
BEGIN
    ALTER TABLE NOTIFICATIONS 
    ADD CONSTRAINT FK_NOTIFICATIONS_ACTOR_ID 
    FOREIGN KEY (ACTOR_ID) REFERENCES USERS(USER_ID);
    
    PRINT 'Foreign key FK_NOTIFICATIONS_ACTOR_ID created successfully!';
END
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_NOTIFICATIONS_REQUISITION_ID')
BEGIN
    ALTER TABLE NOTIFICATIONS 
    ADD CONSTRAINT FK_NOTIFICATIONS_REQUISITION_ID 
    FOREIGN KEY (REQUISITION_ID) REFERENCES REQUISITIONS(REQUISITION_ID);
    
    PRINT 'Foreign key FK_NOTIFICATIONS_REQUISITION_ID created successfully!';
END
GO

-- สร้าง Indexes สำหรับประสิทธิภาพ
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NOTIFICATIONS_USER_ID')
BEGIN
    CREATE INDEX IX_NOTIFICATIONS_USER_ID ON NOTIFICATIONS(USER_ID);
    PRINT 'Index IX_NOTIFICATIONS_USER_ID created successfully!';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NOTIFICATIONS_TYPE')
BEGIN
    CREATE INDEX IX_NOTIFICATIONS_TYPE ON NOTIFICATIONS(TYPE);
    PRINT 'Index IX_NOTIFICATIONS_TYPE created successfully!';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NOTIFICATIONS_CREATED_AT')
BEGIN
    CREATE INDEX IX_NOTIFICATIONS_CREATED_AT ON NOTIFICATIONS(CREATED_AT);
    PRINT 'Index IX_NOTIFICATIONS_CREATED_AT created successfully!';
END
GO

-- ตรวจสอบโครงสร้างตาราง
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'NOTIFICATIONS'
ORDER BY ORDINAL_POSITION;

-- ตรวจสอบ Foreign Keys
SELECT 
    fk.name AS ForeignKeyName,
    OBJECT_NAME(fk.parent_object_id) AS TableName,
    COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS ColumnName,
    OBJECT_NAME(fk.referenced_object_id) AS ReferencedTableName,
    COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS ReferencedColumnName
FROM sys.foreign_keys fk
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
WHERE OBJECT_NAME(fk.parent_object_id) = 'NOTIFICATIONS';

-- ตรวจสอบ Indexes
SELECT 
    i.name AS IndexName,
    i.type_desc AS IndexType,
    COL_NAME(ic.object_id, ic.column_id) AS ColumnName
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
WHERE OBJECT_NAME(i.object_id) = 'NOTIFICATIONS'
ORDER BY i.name, ic.key_ordinal;

PRINT 'NOTIFICATIONS table setup completed successfully!';
GO
