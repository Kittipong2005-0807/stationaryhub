
// Products API Route (GET)
// 1. ตรวจสอบ session ด้วย getServerSession (next-auth)
// 2. ถ้าไม่มี session ให้ตอบ Unauthorized (401)
// 3. ถ้ามี session ให้ดึงข้อมูลสินค้าจากฐานข้อมูล (prisma)
//    - ดึงข้อมูล pRODUCTS ทั้งหมด พร้อมข้อมูลหมวดหมู่ (PRODUCT_CATEGORIES)
//    - เรียงตาม PRODUCT_ID
//    - (สามารถ map CATEGORY_NAME เพิ่มเติมได้ถ้าต้องการ)
// 4. ส่งข้อมูลสินค้ากลับในรูปแบบ JSON
// 5. ถ้าเกิด error ขณะดึงข้อมูล ตอบ Failed to fetch products (500)

'use sever'

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
    // map ให้มี CATEGORY_NAME ในแต่ละ product
    /* const result = products.map((p) => ({
      ...p,
      CATEGORY_NAME: p.PRODUCT_CATEGORIES?.CATEGORY_NAME || "",
    })) */
    // ส่งข้อมูลสินค้ากลับ
    return NextResponse.json(products)
  } catch (error) {
    // ถ้าเกิด error ขณะดึงข้อมูล
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

/* export async function POST(request: NextRequest) {
// POST: เพิ่มสินค้าใหม่ (สำหรับ ADMIN)
// 1. ตรวจสอบสิทธิ์ ADMIN
// 2. รับข้อมูลสินค้าใหม่จาก request
// 3. เพิ่มสินค้าลงฐานข้อมูล
// 4. ส่งข้อมูลสินค้าที่เพิ่มกลับ (201)
// 5. ถ้า error ตอบ Failed to create product (500)
  const authResult = requireAuth(request, ["ADMIN"])
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const productData = await request.json()
    // เพิ่มสินค้าลงฐานข้อมูลจริง
    const newProduct = await prisma.product.create({ data: productData })
    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
} */
