// Real SQL Server connection utility
// Install: npm install mssql @types/mssql

import sql from "mssql"

const config: sql.config = {
  user: process.env.DB_USER || "your_username",
  password: process.env.DB_PASSWORD || "your_password",
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_NAME || "StationeryDB",
  options: {
    encrypt: true, // Use encryption
    trustServerCertificate: true, // For development only
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let pool: sql.ConnectionPool | null = null

export async function getConnection(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = new sql.ConnectionPool(config)
    await pool.connect()
  }
  return pool
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.close()
    pool = null
  }
}

// Example query functions using your exact schema
export async function getUserById(userId: number) {
  const connection = await getConnection()
  const result = await connection
    .request()
    .input("userId", sql.Int, userId)
    .query(`
      SELECT USER_ID, USERNAME, EMAIL, ROLE, DEPARTMENT, SITE_ID, CREATED_AT
      FROM USERS 
      WHERE USER_ID = @userId
    `)
  return result.recordset[0]
}

export async function getProductsWithCategories() {
  const connection = await getConnection()
  const result = await connection.request().query(`
      SELECT 
        p.PRODUCT_ID,
        p.PRODUCT_NAME,
        p.CATEGORY_ID,
        pc.CATEGORY_NAME,
        p.STOCK_TYPE,
        p.STOCK_QUANTITY,
        p.UNIT_COST,
        p.ORDER_UNIT,
        p.PHOTO_URL,
        p.CREATED_AT
      FROM PRODUCTS p
      JOIN PRODUCT_CATEGORIES pc ON p.CATEGORY_ID = pc.CATEGORY_ID
      ORDER BY p.PRODUCT_NAME
    `)
  return result.recordset
}

export async function getRequisitionsWithDetails(userId?: number, role?: string) {
  const connection = await getConnection()
  let query = `
    SELECT 
      r.REQUISITION_ID,
      r.USER_ID,
      u.USERNAME,
      r.STATUS,
      r.SUBMITTED_AT,
      r.TOTAL_AMOUNT,
      r.SITE_ID,
      r.ISSUE_NOTE
    FROM REQUISITIONS r
    JOIN USERS u ON r.USER_ID = u.USER_ID
  `

  const request = connection.request()

  if (role === "USER" && userId) {
    query += " WHERE r.USER_ID = @userId"
    request.input("userId", sql.Int, userId)
  }

  query += " ORDER BY r.SUBMITTED_AT DESC"

  const result = await request.query(query)
  return result.recordset
}

export async function createRequisition(requisitionData: {
  USER_ID: number
  TOTAL_AMOUNT: number
  SITE_ID: string
  ISSUE_NOTE: string
  items: Array<{
    PRODUCT_ID: number
    QUANTITY: number
    UNIT_PRICE: number
    TOTAL_PRICE: number
  }>
}) {
  const connection = await getConnection()
  const transaction = new sql.Transaction(connection)

  try {
    await transaction.begin()

    // Insert requisition
    const requisitionResult = await transaction
      .request()
      .input("userId", sql.Int, requisitionData.USER_ID)
      .input("totalAmount", sql.Decimal(10, 2), requisitionData.TOTAL_AMOUNT)
      .input("siteId", sql.VarChar(50), requisitionData.SITE_ID)
      .input("issueNote", sql.VarChar(500), requisitionData.ISSUE_NOTE)
      .query(`
        INSERT INTO REQUISITIONS (USER_ID, TOTAL_AMOUNT, SITE_ID, ISSUE_NOTE)
        OUTPUT INSERTED.REQUISITION_ID
        VALUES (@userId, @totalAmount, @siteId, @issueNote)
      `)

    const requisitionId = requisitionResult.recordset[0].REQUISITION_ID

    // Insert requisition items
    for (const item of requisitionData.items) {
      await transaction
        .request()
        .input("requisitionId", sql.Int, requisitionId)
        .input("productId", sql.Int, item.PRODUCT_ID)
        .input("quantity", sql.Int, item.QUANTITY)
        .input("unitPrice", sql.Decimal(10, 2), item.UNIT_PRICE)
        .input("totalPrice", sql.Decimal(10, 2), item.TOTAL_PRICE)
        .query(`
          INSERT INTO REQUISITION_ITEMS (REQUISITION_ID, PRODUCT_ID, QUANTITY, UNIT_PRICE, TOTAL_PRICE)
          VALUES (@requisitionId, @productId, @quantity, @unitPrice, @totalPrice)
        `)
    }

    await transaction.commit()
    return requisitionId
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

export async function updateRequisitionStatus(
  requisitionId: number,
  status: "APPROVED" | "REJECTED",
  approvedBy: number,
  note?: string,
) {
  const connection = await getConnection()
  const transaction = new sql.Transaction(connection)

  try {
    await transaction.begin()

    // Update requisition status
    await transaction
      .request()
      .input("requisitionId", sql.Int, requisitionId)
      .input("status", sql.VarChar(20), status)
      .query(`
        UPDATE REQUISITIONS 
        SET STATUS = @status 
        WHERE REQUISITION_ID = @requisitionId
      `)

    // Insert approval record
    await transaction
      .request()
      .input("requisitionId", sql.Int, requisitionId)
      .input("approvedBy", sql.Int, approvedBy)
      .input("status", sql.VarChar(20), status)
      .input("note", sql.VarChar(500), note || "")
      .query(`
        INSERT INTO APPROVALS (REQUISITION_ID, APPROVED_BY, STATUS, NOTE)
        VALUES (@requisitionId, @approvedBy, @status, @note)
      `)

    // Insert status history
    await transaction
      .request()
      .input("requisitionId", sql.Int, requisitionId)
      .input("status", sql.VarChar(20), status)
      .input("changedBy", sql.Int, approvedBy)
      .input("comment", sql.VarChar(500), note || "")
      .query(`
        INSERT INTO STATUS_HISTORY (REQUISITION_ID, STATUS, CHANGED_BY, COMMENT)
        VALUES (@requisitionId, @status, @changedBy, @comment)
      `)

    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
