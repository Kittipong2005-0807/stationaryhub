// Products API Route (PUT/DELETE) for specific products
// 1. ตรวจสอบ session และสิทธิ์ ADMIN
// 2. อัปเดตหรือลบสินค้าตาม PRODUCT_ID
// 3. ส่งผลลัพธ์กลับในรูปแบบ JSON

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

// ฟังก์ชันสำหรับลบไฟล์รูปภาพ
async function deleteImageFile(filename: string): Promise<boolean> {
  try {
    const pathFileUrl = process.env.PATH_FILE_URL || 'D:/stationaryhub';
    const filePath = join(pathFileUrl, filename);
    
    if (existsSync(filePath)) {
      await unlink(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting image file:', error);
    return false;
  }
}

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

    // Get current product data to compare prices
    const currentProduct = await prisma.pRODUCTS.findUnique({
      where: { PRODUCT_ID: productId },
      include: {
        PRODUCT_CATEGORIES: true,
      },
    })

    if (!currentProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    const oldPrice = currentProduct.UNIT_COST ? parseFloat(currentProduct.UNIT_COST.toString()) : 0
    const newPrice = updateData.UNIT_COST !== undefined && updateData.UNIT_COST !== null && updateData.UNIT_COST !== '' ? parseFloat(updateData.UNIT_COST) : 0

    // Update product
    const updatedProduct = await prisma.pRODUCTS.update({
      where: { PRODUCT_ID: productId },
      data: {
        PRODUCT_NAME: updateData.PRODUCT_NAME,
        CATEGORY_ID: updateData.CATEGORY_ID,
        UNIT_COST: newPrice,
        ORDER_UNIT: updateData.ORDER_UNIT,
        PHOTO_URL: updateData.PHOTO_URL,
      },
      include: {
        PRODUCT_CATEGORIES: true,
      },
    })

    // Record price history if price has changed
    if (oldPrice !== newPrice) {
      try {
        const currentYear = new Date().getFullYear()
        const priceChange = newPrice - oldPrice
        const percentageChange = oldPrice > 0 ? (priceChange / oldPrice) * 100 : 0

        await prisma.pRICE_HISTORY.create({
          data: {
            PRODUCT_ID: productId,
            OLD_PRICE: oldPrice,
            NEW_PRICE: newPrice,
            PRICE_CHANGE: priceChange,
            PERCENTAGE_CHANGE: percentageChange,
            YEAR: currentYear,
            RECORDED_DATE: new Date(),
            NOTES: `Price updated by admin from ฿${oldPrice} to ฿${newPrice}`,
            CREATED_BY: user?.USERNAME || 'ADMIN',
          },
        })

        console.log(`✅ Price history recorded: ${oldPrice} → ${newPrice} (${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%)`)
      } catch (historyError) {
        console.error('❌ Error recording price history:', historyError)
        // Continue with the update even if history recording fails
      }
    }

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

    // Check if product exists and get image info
    const existingProduct = await prisma.pRODUCTS.findUnique({
      where: { PRODUCT_ID: productId },
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    // Delete associated image file if exists
    if (existingProduct.PHOTO_URL) {
      await deleteImageFile(existingProduct.PHOTO_URL);
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


