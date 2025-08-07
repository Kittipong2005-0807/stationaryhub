// Products API Route (PUT/DELETE) สำหรับสินค้าเฉพาะ
// 1. ตรวจสอบ session และสิทธิ์ ADMIN
// 2. อัปเดตหรือลบสินค้าตาม PRODUCT_ID
// 3. ส่งผลลัพธ์กลับ

'use server'

import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const productId = parseInt(params.id)
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    const productData = await request.json()
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!productData.PRODUCT_NAME) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 })
    }

    // อัปเดตสินค้า
    const updatedProduct = await prisma.pRODUCTS.update({
      where: { PRODUCT_ID: productId },
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

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const productId = parseInt(params.id)
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    // ตรวจสอบว่าสินค้ามีอยู่ในระบบหรือไม่
    const existingProduct = await prisma.pRODUCTS.findUnique({
      where: { PRODUCT_ID: productId },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // ลบสินค้า
    await prisma.pRODUCTS.delete({
      where: { PRODUCT_ID: productId },
    })

    return NextResponse.json({ message: "Product deleted successfully" })
  } catch (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}


