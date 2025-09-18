import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

// GET - ดึงรายการสินค้าในคำขอเบิก
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = session.user as any
    if (user?.ROLE !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 }
      )
    }

    const requisitionId = parseInt(params.id)
    if (isNaN(requisitionId)) {
      return NextResponse.json({ error: "Invalid requisition ID" }, { status: 400 })
    }

    // ดึงข้อมูล requisition items
    const items = await prisma.$queryRaw`
      SELECT 
        ri.ITEM_ID,
        ri.REQUISITION_ID,
        ri.PRODUCT_ID,
        ri.QUANTITY,
        ri.UNIT_PRICE,
        ri.TOTAL_PRICE,
        p.PRODUCT_NAME,
        p.PHOTO_URL,
        pc.CATEGORY_NAME,
        p.ORDER_UNIT
      FROM REQUISITION_ITEMS ri
      LEFT JOIN PRODUCTS p ON ri.PRODUCT_ID = p.PRODUCT_ID
      LEFT JOIN PRODUCT_CATEGORIES pc ON p.CATEGORY_ID = pc.CATEGORY_ID
      WHERE ri.REQUISITION_ID = ${requisitionId}
      ORDER BY ri.ITEM_ID
    `

    return NextResponse.json(items)
  } catch (error) {
    console.error("Error fetching requisition items:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - อัปเดตรายการสินค้าในคำขอเบิก
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = session.user as any
    if (user?.ROLE !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 }
      )
    }

    const requisitionId = parseInt(params.id)
    if (isNaN(requisitionId)) {
      return NextResponse.json({ error: "Invalid requisition ID" }, { status: 400 })
    }

    const { items } = await request.json()

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Items must be an array" }, { status: 400 })
    }

    // ตรวจสอบว่า requisition มีอยู่จริง
    const requisition = await prisma.rEQUISITIONS.findUnique({
      where: { REQUISITION_ID: requisitionId }
    })

    if (!requisition) {
      return NextResponse.json({ error: "Requisition not found" }, { status: 404 })
    }

    // ใช้ transaction เพื่อให้การอัปเดตเป็น atomic
    const result = await prisma.$transaction(async (tx: any) => {
      // ลบรายการเก่าทั้งหมด
      await tx.rEQUISITION_ITEMS.deleteMany({
        where: { REQUISITION_ID: requisitionId }
      })

      // เพิ่มรายการใหม่
      let totalAmount = 0
      const newItems = []

      for (const item of items) {
        if (!item.PRODUCT_ID || !item.QUANTITY || !item.UNIT_PRICE) {
          throw new Error("Missing required fields for item")
        }

        const quantity = parseFloat(item.QUANTITY)
        const unitPrice = parseFloat(item.UNIT_PRICE)
        const totalPrice = quantity * unitPrice

        const newItem = await tx.rEQUISITION_ITEMS.create({
          data: {
            REQUISITION_ID: requisitionId,
            PRODUCT_ID: parseInt(item.PRODUCT_ID),
            QUANTITY: quantity,
            UNIT_PRICE: unitPrice,
            TOTAL_PRICE: totalPrice
          }
        })

        totalAmount += totalPrice
        newItems.push(newItem)
      }

      // อัปเดตยอดรวมใน requisition
      await tx.rEQUISITIONS.update({
        where: { REQUISITION_ID: requisitionId },
        data: { TOTAL_AMOUNT: totalAmount }
      })

      return { newItems, totalAmount }
    })

    return NextResponse.json({
      success: true,
      message: "Requisition items updated successfully",
      totalAmount: result.totalAmount,
      itemsCount: result.newItems.length
    })
  } catch (error) {
    console.error("Error updating requisition items:", error)
    return NextResponse.json({ 
      error: "Failed to update requisition items",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// DELETE - ลบรายการสินค้าทั้งหมดในคำขอเบิก
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = session.user as any
    if (user?.ROLE !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 }
      )
    }

    const requisitionId = parseInt(params.id)
    if (isNaN(requisitionId)) {
      return NextResponse.json({ error: "Invalid requisition ID" }, { status: 400 })
    }

    // ใช้ transaction
    await prisma.$transaction(async (tx: any) => {
      // ลบรายการสินค้าทั้งหมด
      await tx.rEQUISITION_ITEMS.deleteMany({
        where: { REQUISITION_ID: requisitionId }
      })

      // อัปเดตยอดรวมเป็น 0
      await tx.rEQUISITIONS.update({
        where: { REQUISITION_ID: requisitionId },
        data: { TOTAL_AMOUNT: 0 }
      })
    })

    return NextResponse.json({
      success: true,
      message: "All requisition items deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting requisition items:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
