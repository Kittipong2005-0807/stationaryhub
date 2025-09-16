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

    // Get client IP and User Agent for audit log
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

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

    // Create audit log for product update using raw query
    const oldDataJson = JSON.stringify({
      ITEM_ID: currentProduct.ITEM_ID,
      PRODUCT_NAME: currentProduct.PRODUCT_NAME,
      CATEGORY_ID: currentProduct.CATEGORY_ID,
      UNIT_COST: currentProduct.UNIT_COST,
      ORDER_UNIT: currentProduct.ORDER_UNIT,
      PHOTO_URL: currentProduct.PHOTO_URL,
      CREATED_AT: currentProduct.CREATED_AT,
      CATEGORY_NAME: currentProduct.PRODUCT_CATEGORIES?.CATEGORY_NAME
    })
    
    const newDataJson = JSON.stringify({
      ITEM_ID: updatedProduct.ITEM_ID,
      PRODUCT_NAME: updatedProduct.PRODUCT_NAME,
      CATEGORY_ID: updatedProduct.CATEGORY_ID,
      UNIT_COST: updatedProduct.UNIT_COST,
      ORDER_UNIT: updatedProduct.ORDER_UNIT,
      PHOTO_URL: updatedProduct.PHOTO_URL,
      CREATED_AT: updatedProduct.CREATED_AT,
      CATEGORY_NAME: updatedProduct.PRODUCT_CATEGORIES?.CATEGORY_NAME
    })
    
    const auditLogQuery = `
      INSERT INTO PRODUCT_AUDIT_LOG 
      (PRODUCT_ID, ACTION_TYPE, OLD_DATA, NEW_DATA, CHANGED_BY, CHANGED_AT, IP_ADDRESS, USER_AGENT, NOTES)
      VALUES (${productId}, 'UPDATE', '${oldDataJson.replace(/'/g, "''")}', '${newDataJson.replace(/'/g, "''")}', '${user.USER_ID}', DATEADD(HOUR, -7, GETDATE()), '${clientIP}', '${userAgent}', 'Product updated - Price changed from ฿${oldPrice} to ฿${newPrice}')
    `
    
    await prisma.$executeRawUnsafe(auditLogQuery)

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

    // Get client IP and User Agent for audit log
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Check if product exists and get image info
    const existingProduct = await prisma.pRODUCTS.findUnique({
      where: { PRODUCT_ID: productId },
      include: {
        PRODUCT_CATEGORIES: true,
      },
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    // Create audit log for product deletion BEFORE deleting the product using raw query
    const oldDataJson = JSON.stringify({
      ITEM_ID: existingProduct.ITEM_ID,
      PRODUCT_NAME: existingProduct.PRODUCT_NAME,
      CATEGORY_ID: existingProduct.CATEGORY_ID,
      UNIT_COST: existingProduct.UNIT_COST,
      ORDER_UNIT: existingProduct.ORDER_UNIT,
      PHOTO_URL: existingProduct.PHOTO_URL,
      CREATED_AT: existingProduct.CREATED_AT,
      CATEGORY_NAME: existingProduct.PRODUCT_CATEGORIES?.CATEGORY_NAME
    })
    
    const auditLogQuery = `
      INSERT INTO PRODUCT_AUDIT_LOG 
      (PRODUCT_ID, ACTION_TYPE, OLD_DATA, NEW_DATA, CHANGED_BY, CHANGED_AT, IP_ADDRESS, USER_AGENT, NOTES)
      VALUES (${productId}, 'DELETE', '${oldDataJson.replace(/'/g, "''")}', NULL, '${user.USER_ID}', DATEADD(HOUR, -7, GETDATE()), '${clientIP}', '${userAgent}', 'Product "${existingProduct.PRODUCT_NAME}" deleted successfully')
    `
    
    // Insert the audit log for deletion FIRST (while product still exists)
    await prisma.$executeRawUnsafe(auditLogQuery)
    
    // Delete associated image file if exists
    if (existingProduct.PHOTO_URL) {
      await deleteImageFile(existingProduct.PHOTO_URL);
    }

    // Delete product (audit log will remain with the original PRODUCT_ID)
    await prisma.$executeRawUnsafe(`DELETE FROM PRODUCTS WHERE PRODUCT_ID = ${productId}`)

    return NextResponse.json({ success: true, message: "Product deleted successfully" })
  } catch (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    )
  }
}


