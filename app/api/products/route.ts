
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
          // ไม่ต้องส่ง CREATED_AT ให้ฐานข้อมูลใช้ GETDATE() อัตโนมัติ
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
    
    // Add product to database using GETDATE() เพื่อให้ได้เวลาที่ถูกต้อง
    const newProduct = await prisma.$executeRaw`
      INSERT INTO PRODUCTS (ITEM_ID, PRODUCT_NAME, CATEGORY_ID, UNIT_COST, ORDER_UNIT, PHOTO_URL, CREATED_AT)
      VALUES (${body.ITEM_ID || null}, ${body.PRODUCT_NAME}, ${parseInt(body.CATEGORY_ID)}, 
              ${body.UNIT_COST !== undefined && body.UNIT_COST !== null && body.UNIT_COST !== '' ? parseFloat(body.UNIT_COST) : 0}, 
              ${body.ORDER_UNIT}, ${body.PHOTO_URL || null}, GETDATE())
    `
    
    // ดึงข้อมูล product ที่เพิ่งสร้าง
    const createdProduct = await prisma.pRODUCTS.findFirst({
      where: {
        PRODUCT_NAME: body.PRODUCT_NAME,
        CATEGORY_ID: parseInt(body.CATEGORY_ID)
      },
      orderBy: { CREATED_AT: 'desc' },
      include: {
        PRODUCT_CATEGORIES: true,
      },
    })
    
    if (!createdProduct) {
      throw new Error("Failed to retrieve created product")
    }
    
    // Create audit log for product creation using raw query
    const newDataJson = JSON.stringify({
      ITEM_ID: createdProduct.ITEM_ID,
      PRODUCT_NAME: createdProduct.PRODUCT_NAME,
      CATEGORY_ID: createdProduct.CATEGORY_ID,
      UNIT_COST: createdProduct.UNIT_COST,
      ORDER_UNIT: createdProduct.ORDER_UNIT,
      PHOTO_URL: createdProduct.PHOTO_URL,
      CREATED_AT: createdProduct.CREATED_AT
    })
    
    await prisma.$executeRaw`
      INSERT INTO PRODUCT_AUDIT_LOG 
      (PRODUCT_ID, ACTION_TYPE, OLD_DATA, NEW_DATA, CHANGED_BY, CHANGED_AT, IP_ADDRESS, USER_AGENT, NOTES)
      VALUES (${createdProduct.PRODUCT_ID}, 'CREATE', NULL, ${newDataJson.replace(/'/g, "''")}, ${user.USER_ID}, GETDATE(), ${clientIP}, ${userAgent}, 'Product created successfully')
    `
    
    return NextResponse.json({ 
      success: true, 
      product: createdProduct,
      message: "Product added successfully with GETDATE()"
    })
  } catch (error) {
    console.error("Error adding product:", error)
    return NextResponse.json(
      { error: "Failed to add product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
