
// Products API Route (GET/POST)
// 1. ถ้าไม่มี session จะส่งข้อมูลสินค้าจากไฟล์ JSON
// 2. ถ้ามี session ให้ดึงข้อมูลสินค้าจากฐานข้อมูล (prisma)
//    - ดึงข้อมูล PRODUCTS ทั้งหมด พร้อมข้อมูลหมวดหมู่ (PRODUCT_CATEGORIES)
//    - รวมข้อมูลจากตาราง PRODUCTS และ PRODUCT_CATEGORIES
// 3. ส่งข้อมูลสินค้ากลับในรูปแบบ JSON
// 4. เพิ่มสินค้าลงฐานข้อมูล

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (session) {
      // Fetch products from database
      const products = await prisma.$queryRaw`
        SELECT 
          p.*,
          pc.CATEGORY_NAME
        FROM PRODUCTS p
        LEFT JOIN PRODUCT_CATEGORIES pc ON p.CATEGORY_ID = pc.CATEGORY_ID
        ORDER BY p.CREATED_AT DESC
      `
      
      // Return products data
      return NextResponse.json(products)
    } else {
      // Return static JSON data if no session
      const staticProducts = [
        {
          PRODUCT_ID: "P001",
          PRODUCT_NAME: "Ballpoint Pen",
          CATEGORY_NAME: "Writing Tools",
          UNIT_COST: 15.00,
          STOCK_QUANTITY: 100,
          PHOTO_URL: "/placeholder.jpg",
          CREATED_AT: new Date().toISOString()
        }
      ]
      
      return NextResponse.json(staticProducts)
    }
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check ADMIN role
    const user = session.user as any
    if (user?.ROLE !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.PRODUCT_NAME || !body.CATEGORY_ID || !body.ORDER_UNIT) {
      return NextResponse.json(
        { error: "Missing required fields: PRODUCT_NAME, CATEGORY_ID, ORDER_UNIT" },
        { status: 400 }
      )
    }
    
    // Get client IP and User Agent for audit log
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Add product to database using Prisma
    const newProduct = await prisma.pRODUCTS.create({
      data: {
        ITEM_ID: body.ITEM_ID || null,
        PRODUCT_NAME: body.PRODUCT_NAME,
        CATEGORY_ID: parseInt(body.CATEGORY_ID),
        UNIT_COST: body.UNIT_COST !== undefined && body.UNIT_COST !== null && body.UNIT_COST !== '' ? parseFloat(body.UNIT_COST) : 0,
        ORDER_UNIT: body.ORDER_UNIT,
        PHOTO_URL: body.PHOTO_URL || null,
      },
      include: {
        PRODUCT_CATEGORIES: true,
      },
    })
    
    // Create audit log for product creation using raw query
    const newDataJson = JSON.stringify({
      ITEM_ID: newProduct.ITEM_ID,
      PRODUCT_NAME: newProduct.PRODUCT_NAME,
      CATEGORY_ID: newProduct.CATEGORY_ID,
      UNIT_COST: newProduct.UNIT_COST,
      ORDER_UNIT: newProduct.ORDER_UNIT,
      PHOTO_URL: newProduct.PHOTO_URL,
      CREATED_AT: newProduct.CREATED_AT
    })
    
    const auditLogQuery = `
      INSERT INTO PRODUCT_AUDIT_LOG 
      (PRODUCT_ID, ACTION_TYPE, OLD_DATA, NEW_DATA, CHANGED_BY, CHANGED_AT, IP_ADDRESS, USER_AGENT, NOTES)
      VALUES (${newProduct.PRODUCT_ID}, 'CREATE', NULL, '${newDataJson.replace(/'/g, "''")}', '${user.USER_ID}', DATEADD(HOUR, -7, GETDATE()), '${clientIP}', '${userAgent}', 'Product created successfully')
    `
    
    await prisma.$executeRawUnsafe(auditLogQuery)
    
    return NextResponse.json({ 
      success: true, 
      product: newProduct,
      message: "Product added successfully"
    })
  } catch (error) {
    console.error("Error adding product:", error)
    return NextResponse.json(
      { error: "Failed to add product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
