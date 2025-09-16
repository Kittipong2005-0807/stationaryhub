// Product Audit Log API Route
// สำหรับดูประวัติการเปลี่ยนแปลงสินค้า (เพิ่ม, แก้ไข, ลบ)

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check ADMIN or MANAGER role
    const user = session.user as any
    if (user?.ROLE !== "ADMIN" && user?.ROLE !== "MANAGER") {
      return NextResponse.json(
        { error: "Access denied. Admin or Manager role required." },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const actionType = searchParams.get('actionType')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    // Build WHERE clause for raw query
    let whereConditions = []
    
    if (productId) {
      whereConditions.push(`pal.PRODUCT_ID = ${parseInt(productId)}`)
    }
    
    if (actionType) {
      whereConditions.push(`pal.ACTION_TYPE = '${actionType.toUpperCase()}'`)
    }
    
    if (startDate && endDate) {
      whereConditions.push(`pal.CHANGED_AT BETWEEN '${startDate}' AND '${endDate}'`)
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''
    
    // Get audit logs with pagination using raw query
    const auditLogsQuery = `
      SELECT 
        pal.AUDIT_ID,
        pal.PRODUCT_ID,
        pal.ACTION_TYPE,
        pal.OLD_DATA,
        pal.NEW_DATA,
        pal.CHANGED_BY,
        pal.CHANGED_AT,
        pal.IP_ADDRESS,
        pal.USER_AGENT,
        pal.NOTES,
        p.PRODUCT_NAME,
        pc.CATEGORY_NAME,
        u.USERNAME
      FROM PRODUCT_AUDIT_LOG pal
      LEFT JOIN PRODUCTS p ON pal.PRODUCT_ID = p.PRODUCT_ID
      LEFT JOIN PRODUCT_CATEGORIES pc ON p.CATEGORY_ID = pc.CATEGORY_ID
      LEFT JOIN USERS u ON pal.CHANGED_BY = u.USER_ID
      ${whereClause}
      ORDER BY pal.CHANGED_AT DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `
    
    const auditLogs = await prisma.$queryRawUnsafe(auditLogsQuery)
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM PRODUCT_AUDIT_LOG pal
      LEFT JOIN PRODUCTS p ON pal.PRODUCT_ID = p.PRODUCT_ID
      LEFT JOIN PRODUCT_CATEGORIES pc ON p.CATEGORY_ID = pc.CATEGORY_ID
      LEFT JOIN USERS u ON pal.CHANGED_BY = u.USER_ID
      ${whereClause}
    `
    
    const countResult = await prisma.$queryRawUnsafe(countQuery)
    const totalCount = (countResult as any)[0]?.total || 0

    // Parse JSON data for easier frontend consumption
    const formattedLogs = (auditLogs as any[]).map(log => {
      const oldData = log.OLD_DATA ? JSON.parse(log.OLD_DATA) : null
      const newData = log.NEW_DATA ? JSON.parse(log.NEW_DATA) : null
      
      // Get product name from OLD_DATA or NEW_DATA if PRODUCT_NAME is null
      let productName = log.PRODUCT_NAME || oldData?.PRODUCT_NAME || newData?.PRODUCT_NAME || 'Unknown Product'
      
      // Get category name from OLD_DATA or NEW_DATA if CATEGORY_NAME is null
      let categoryName = log.CATEGORY_NAME || oldData?.CATEGORY_NAME || newData?.CATEGORY_NAME || 'Unknown Category'
      
      return {
        ...log,
        OLD_DATA: oldData,
        NEW_DATA: newData,
        PRODUCT_NAME: productName,
        CATEGORY_NAME: categoryName,
        USERNAME: log.USERNAME || 'Unknown User'
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedLogs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error("Error fetching product audit logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch audit logs", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// API สำหรับดูสถิติการเปลี่ยนแปลงสินค้า
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check ADMIN role only for statistics
    const user = session.user as any
    if (user?.ROLE !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { startDate, endDate } = body

    // Get statistics using raw query
    let statsWhereClause = ''
    
    if (startDate && endDate) {
      statsWhereClause = `WHERE CHANGED_AT BETWEEN '${startDate}' AND '${endDate}'`
    }
    
    const statsQuery = `
      SELECT 
        ACTION_TYPE,
        COUNT(*) as count
      FROM PRODUCT_AUDIT_LOG
      ${statsWhereClause}
      GROUP BY ACTION_TYPE
    `
    
    const stats = await prisma.$queryRawUnsafe(statsQuery)

    // Get recent activities (last 10)
    const recentActivitiesQuery = `
      SELECT TOP 10
        pal.AUDIT_ID,
        pal.PRODUCT_ID,
        pal.ACTION_TYPE,
        pal.OLD_DATA,
        pal.NEW_DATA,
        pal.CHANGED_BY,
        pal.CHANGED_AT,
        pal.NOTES,
        p.PRODUCT_NAME,
        u.USERNAME
      FROM PRODUCT_AUDIT_LOG pal
      LEFT JOIN PRODUCTS p ON pal.PRODUCT_ID = p.PRODUCT_ID
      LEFT JOIN USERS u ON pal.CHANGED_BY = u.USER_ID
      ORDER BY pal.CHANGED_AT DESC
    `
    
    const recentActivities = await prisma.$queryRawUnsafe(recentActivitiesQuery)

    return NextResponse.json({
      success: true,
      statistics: stats,
      recentActivities: (recentActivities as any[]).map(activity => ({
        ...activity,
        OLD_DATA: activity.OLD_DATA ? JSON.parse(activity.OLD_DATA) : null,
        NEW_DATA: activity.NEW_DATA ? JSON.parse(activity.NEW_DATA) : null,
        PRODUCT_NAME: activity.PRODUCT_NAME || 'Unknown Product',
        USERNAME: activity.USERNAME || 'Unknown User'
      }))
    })

  } catch (error) {
    console.error("Error fetching product audit statistics:", error)
    return NextResponse.json(
      { error: "Failed to fetch audit statistics", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
