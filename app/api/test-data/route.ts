import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบว่ามี products ในฐานข้อมูลหรือไม่
    const existingProducts = await prisma.pRODUCTS.findMany({
      take: 2,
      select: {
        PRODUCT_ID: true,
        PRODUCT_NAME: true
      }
    })

    if (existingProducts.length === 0) {
      return NextResponse.json({ 
        error: "ไม่พบข้อมูลสินค้าในฐานข้อมูล กรุณาเพิ่มสินค้าก่อน"
      }, { status: 400 })
    }

    // สร้างข้อมูลทดสอบ
    const testRequisition = await prisma.rEQUISITIONS.create({
      data: {
        USER_ID: "9C154", // ใช้ EmpCode ของ user
        SUBMITTED_AT: new Date(),
        STATUS: "PENDING",
        TOTAL_AMOUNT: 1500.00,
        ISSUE_NOTE: "ทดสอบการสร้างคำสั่งซื้อ"
      }
    })

    // สร้าง requisition items โดยใช้ PRODUCT_ID ที่มีอยู่จริง
    const testItems = existingProducts.map((product, index) => ({
      REQUISITION_ID: testRequisition.REQUISITION_ID,
      PRODUCT_ID: product.PRODUCT_ID,
      QUANTITY: index + 1,
      UNIT_PRICE: 500.00
    }))

    for (const item of testItems) {
      await prisma.rEQUISITION_ITEMS.create({
        data: item
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: "สร้างข้อมูลทดสอบสำเร็จ",
      requisitionId: testRequisition.REQUISITION_ID,
      productsUsed: existingProducts.map(p => p.PRODUCT_NAME)
    })

  } catch (error) {
    console.error("Error creating test data:", error)
    return NextResponse.json({ 
      error: "ไม่สามารถสร้างข้อมูลทดสอบได้",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 