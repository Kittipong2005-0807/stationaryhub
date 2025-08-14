
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
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
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
    
    const body = await request.json()
    
    // Add product to database
    const newProduct = await prisma.$executeRaw`
      INSERT INTO PRODUCTS (PRODUCT_NAME, CATEGORY_ID, UNIT_COST, STOCK_QUANTITY, PHOTO_URL, CREATED_AT)
      VALUES (${body.PRODUCT_NAME}, ${body.CATEGORY_ID}, ${body.UNIT_COST}, ${body.STOCK_QUANTITY}, ${body.PHOTO_URL}, GETDATE())
    `
    
    return NextResponse.json({ success: true, product: newProduct })
  } catch (error) {
    console.error("Error adding product:", error)
    return NextResponse.json(
      { error: "Failed to add product" },
      { status: 500 }
    )
  }
}
