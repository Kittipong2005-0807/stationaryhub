// Products API Route (PUT/DELETE) for specific products
// 1. ตรวจสอบ session และสิทธิ์ ADMIN
// 2. อัปเดตหรือลบสินค้าตาม PRODUCT_ID
// 3. ส่งผลลัพธ์กลับในรูปแบบ JSON

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check user session
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check ADMIN role
    const user = session.user as any
    if (user?.ROLE !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 }
      )
    }

    const productId = parseInt(params.id)
    const updateData = await request.json()

    // Update product
    const updatedProduct = await prisma.pRODUCTS.update({
      where: { PRODUCT_ID: productId },
      data: {
        PRODUCT_NAME: updateData.PRODUCT_NAME,
        CATEGORY_ID: updateData.CATEGORY_ID,
        UNIT_COST: updateData.UNIT_COST ? parseFloat(updateData.UNIT_COST) : null,
        ORDER_UNIT: updateData.ORDER_UNIT,
        PHOTO_URL: updateData.PHOTO_URL,
      },
      include: {
        PRODUCT_CATEGORIES: true,
      },
    })

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check user session
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check ADMIN role
    const user = session.user as any
    if (user?.ROLE !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 }
      )
    }

    const productId = parseInt(params.id)

    // Check if product exists
    const existingProduct = await prisma.pRODUCTS.findUnique({
      where: { PRODUCT_ID: productId },
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    // Delete product
    await prisma.pRODUCTS.delete({
      where: { PRODUCT_ID: productId },
    })

    return NextResponse.json({ success: true, message: "Product deleted successfully" })
  } catch (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    )
  }
}


