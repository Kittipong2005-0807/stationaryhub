import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendMail } from "@/lib/database"
import { Requisition, RequisitionItem } from "@/types/requisition"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mine = searchParams.get("mine")
    if (mine === "1") {
      // TODO: ดึง user id จาก session จริง ๆ
      // const userId = 1 // mock user id (ควรแก้เป็น auth จริง)
      // สมมติว่ามีฟังก์ชัน getUserIdFromSession(request) ที่ return number
      const userId = getUserIdFromSession(request) // ต้อง implement ฟังก์ชันนี้จริง
      const requisitions = await prisma.requisition.findMany({
        where: { USER_ID: userId },
        orderBy: { SUBMITTED_AT: "desc" },
        include: {
          REQUISITION_ITEMS: {
            include: { PRODUCTS: { select: { PRODUCT_NAME: true } } },
          },
        },
      })
      // map รายการสินค้าให้แสดงชื่อสินค้า
      const result = requisitions.map((r: Requisition) => ({
        ...r,
        REQUISITION_ITEMS: r.REQUISITION_ITEMS?.map((item: RequisitionItem) => ({
          PRODUCT_NAME: item.PRODUCTS?.PRODUCT_NAME || "",
          QUANTITY: item.QUANTITY,
          UNIT_PRICE: item.UNIT_PRICE,
          TOTAL_PRICE: item.TOTAL_PRICE,
        })),
      }))
      return NextResponse.json(result)
    } else {
      const requisitions = await prisma.requisition.findMany()
      return NextResponse.json(requisitions)
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch requisitions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const newRequisition = await prisma.requisition.create({ data })

    // ดึงอีเมลของ user (ถ้ามี USER_ID)
    let userEmail = null
    if (data.USER_ID) {
      const user = await prisma.users.findUnique({
        where: { USER_ID: data.USER_ID },
      })
      userEmail = user?.EMAIL
    }
    // ส่งอีเมลแจ้งเตือน
    if (userEmail) {
      await sendMail(
        userEmail,
        "ยืนยันการสั่งซื้อ/ขอเบิกสำเร็จ",
        `ระบบได้รับคำสั่งซื้อ/ขอเบิกของคุณแล้ว (เลขที่ ${newRequisition.REQUISITION_ID})`
      )
    }
    return NextResponse.json(newRequisition, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create requisition" }, { status: 500 })
  }
}
