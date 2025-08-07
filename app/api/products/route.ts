
// Products API Route (GET/POST)
// 1. ตรวจสอบ session ด้วย getServerSession (next-auth)
// 2. ถ้าไม่มี session ให้ตอบ Unauthorized (401)
// 3. ถ้ามี session ให้ดึงข้อมูลสินค้าจากฐานข้อมูล (prisma)
//    - ดึงข้อมูล PRODUCTS ทั้งหมด พร้อมข้อมูลหมวดหมู่ (PRODUCT_CATEGORIES)
//    - เรียงตาม PRODUCT_ID
// 4. ส่งข้อมูลสินค้ากลับในรูปแบบ JSON
// 5. ถ้าเกิด error ขณะดึงข้อมูล ตอบ Failed to fetch products (500)

'use server'

import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"

export async function GET(request: NextRequest) {
  // ตรวจสอบ session ผู้ใช้งาน
  const session = await getServerSession(authOptions)
  if (!session) {
    // ถ้าไม่มี session (ยังไม่ได้ login) ตอบ Unauthorized
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // ดึงข้อมูลสินค้าจากฐานข้อมูล
    const products = await prisma.pRODUCTS.findMany({
      include: {
        PRODUCT_CATEGORIES: true,
      },
      orderBy: { PRODUCT_ID: "asc" },
    })
    
    // ส่งข้อมูลสินค้ากลับ
    return NextResponse.json(products)
  } catch (error) {
    // ถ้าเกิด error ขณะดึงข้อมูล
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // ตรวจสอบ session ผู้ใช้งาน
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ตรวจสอบสิทธิ์ ADMIN
  const user = session.user as any
  if (user?.ROLE !== "ADMIN") {
    return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 })
  }

  try {
    const productData = await request.json()
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!productData.PRODUCT_NAME) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 })
    }

    // เพิ่มสินค้าลงฐานข้อมูล
    const newProduct = await prisma.pRODUCTS.create({
      data: {
        ITEM_ID: productData.ITEM_ID || null,
        PRODUCT_NAME: productData.PRODUCT_NAME,
        CATEGORY_ID: productData.CATEGORY_ID || 1,
        UNIT_COST: productData.UNIT_COST ? parseFloat(productData.UNIT_COST) : null,
        ORDER_UNIT: productData.ORDER_UNIT || "PIECE",
        PHOTO_URL: productData.PHOTO_URL || null,
      },
      include: {
        PRODUCT_CATEGORIES: true,
      },
    })

    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
