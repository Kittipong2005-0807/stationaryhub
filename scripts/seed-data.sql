-- Insert sample data for testing

-- Insert categories first
INSERT INTO PRODUCT_CATEGORIES (CATEGORY_NAME) VALUES 
('Office Supplies'),
('Stationery'),
('Electronics'),
('Furniture'),
('Cleaning Supplies');

-- Insert sample users with varchar SITE_ID
INSERT INTO USERS (USERNAME, PASSWORD, EMAIL, ROLE, DEPARTMENT, SITE_ID) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@company.com', 'ADMIN', 'IT', 'SITE001'),
('manager1', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager@company.com', 'MANAGER', 'Operations', 'SITE001'),
('user1', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user@company.com', 'USER', 'Sales', 'SITE001');

-- Insert sample products
INSERT INTO PRODUCTS (PRODUCT_NAME, CATEGORY_ID, STOCK_TYPE, STOCK_QUANTITY, UNIT_COST, ORDER_UNIT, PHOTO_URL) VALUES 
('A4 Paper', 2, 'CONSUMABLE', 100, 5.50, 'REAM', '/images/a4-paper.jpg'),
('Blue Pen', 2, 'CONSUMABLE', 200, 1.20, 'PIECE', '/images/blue-pen.jpg'),
('Stapler', 1, 'DURABLE', 50, 15.00, 'PIECE', '/images/stapler.jpg'),
('Laptop', 3, 'DURABLE', 10, 800.00, 'PIECE', '/images/laptop.jpg'),
('Office Chair', 4, 'DURABLE', 25, 150.00, 'PIECE', '/images/office-chair.jpg'),
('Pencil HB', 2, 'CONSUMABLE', 300, 0.80, 'PIECE', '/images/pencil-hb.jpg'),
('Eraser', 2, 'CONSUMABLE', 250, 0.50, 'PIECE', '/images/eraser.jpg'),
('Highlighter', 2, 'CONSUMABLE', 120, 2.00, 'PIECE', '/images/highlighter.jpg'),
('Whiteboard Marker', 2, 'CONSUMABLE', 80, 3.00, 'PIECE', '/images/whiteboard-marker.jpg'),
('Document Folder', 1, 'CONSUMABLE', 180, 2.50, 'PIECE', '/images/document-folder.jpg'),
('Correction Tape', 2, 'CONSUMABLE', 90, 1.80, 'PIECE', '/images/correction-tape.jpg'),
('Paper Clip', 1, 'CONSUMABLE', 500, 0.10, 'PIECE', '/images/paper-clip.jpg'),
('Desk Lamp', 3, 'DURABLE', 15, 35.00, 'PIECE', '/images/desk-lamp.jpg'),
('Trash Bin', 4, 'DURABLE', 40, 12.00, 'PIECE', '/images/trash-bin.jpg'),
('Cleaning Spray', 5, 'CONSUMABLE', 60, 4.50, 'BOTTLE', '/images/cleaning-spray.jpg');

-- Insert sample requisition
INSERT INTO REQUISITIONS (USER_ID, STATUS, TOTAL_AMOUNT, SITE_ID, ISSUE_NOTE) VALUES 
(3, 'PENDING', 25.40, 'SITE001', 'Urgent office supplies needed');

-- Insert sample requisition items
INSERT INTO REQUISITION_ITEMS (REQUISITION_ID, PRODUCT_ID, QUANTITY, UNIT_PRICE, TOTAL_PRICE) VALUES 
(1, 1, 2, 5.50, 11.00),
(1, 2, 12, 1.20, 14.40);
