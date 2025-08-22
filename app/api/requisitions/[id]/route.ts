import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ตรวจสอบ session
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requisitionId = parseInt(params.id)
    if (isNaN(requisitionId)) {
      return NextResponse.json({ error: "Invalid requisition ID" }, { status: 400 })
    }

    // ดึงข้อมูล requisition พร้อมรายละเอียด
    const requisition = await prisma.$queryRaw`
      SELECT 
        r.REQUISITION_ID,
        r.USER_ID,
        r.TOTAL_AMOUNT,
        r.STATUS,
        r.SUBMITTED_AT,
        r.ISSUE_NOTE,
        u.USERNAME,
        u.EMAIL,
        u.DEPARTMENT
      FROM REQUISITIONS r
      LEFT JOIN USERS u ON r.USER_ID = u.USER_ID
      WHERE r.REQUISITION_ID = ${requisitionId}
    `

    if (!requisition || Array.isArray(requisition) && requisition.length === 0) {
      return NextResponse.json({ error: "Requisition not found" }, { status: 404 })
    }

    const requisitionData = Array.isArray(requisition) ? requisition[0] : requisition

    // ดึงข้อมูล requisition items
    const requisitionItems = await prisma.$queryRaw`
      SELECT 
        ri.ITEM_ID,
        ri.PRODUCT_ID,
        ri.QUANTITY,
        ri.UNIT_PRICE,
        ri.TOTAL_PRICE,
        p.PRODUCT_NAME,
        pc.CATEGORY_NAME,
        p.PHOTO_URL
      FROM REQUISITION_ITEMS ri
      LEFT JOIN PRODUCTS p ON ri.PRODUCT_ID = p.PRODUCT_ID
      LEFT JOIN PRODUCT_CATEGORIES pc ON p.CATEGORY_ID = pc.CATEGORY_ID
      WHERE ri.REQUISITION_ID = ${requisitionId}
      ORDER BY ri.ITEM_ID
    `

    // รวมข้อมูล
    const result = {
      ...requisitionData,
      REQUISITION_ITEMS: Array.isArray(requisitionItems) ? requisitionItems : []
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error("❌ Error fetching requisition details:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 