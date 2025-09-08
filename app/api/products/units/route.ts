import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // ดึงข้อมูลหน่วยสินค้าที่มีอยู่ในระบบ
    const units = await prisma.$queryRaw`
      SELECT DISTINCT ORDER_UNIT 
      FROM PRODUCTS 
      WHERE ORDER_UNIT IS NOT NULL 
        AND ORDER_UNIT != '' 
        AND ORDER_UNIT != 'null'
      ORDER BY ORDER_UNIT ASC
    `
    
    // แปลงผลลัพธ์เป็น array ของ string
    const unitList = (units as any[]).map(unit => unit.ORDER_UNIT).filter(Boolean)
    
    return NextResponse.json({
      success: true,
      data: unitList
    })
  } catch (error) {
    console.error("Error fetching units:", error)
    return NextResponse.json(
      { error: "Failed to fetch units" },
      { status: 500 }
    )
  }
}
