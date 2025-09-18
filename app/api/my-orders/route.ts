import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ดึง USER_ID จาก session
    const currentUserId = (session.user as any).USER_ID || (session.user as any).AdLoginName || session.user.name
    
    console.log("🔍 Fetching orders for user:", currentUserId)
    console.log("🔍 Session user data:", session.user)

    if (!currentUserId) {
      console.error("❌ No user ID found in session")
      return NextResponse.json({ error: "User ID not found" }, { status: 400 })
    }

    // กรองข้อมูลตาม USER_ID ของผู้ที่ login
    const requisitions = await prisma.rEQUISITIONS.findMany({
      where: { 
        USER_ID: currentUserId
      },
      include: { 
        USERS: true, 
        REQUISITION_ITEMS: {
          include: {
            PRODUCTS: {
              include: {
                PRODUCT_CATEGORIES: true
              }
            }
          }
        }
      },
      orderBy: { 
        SUBMITTED_AT: 'desc' 
      }
    })

    console.log(`✅ Found ${requisitions.length} orders for user ${currentUserId}`)
    console.log("🔍 Orders:", requisitions.map((r: any) => ({ id: r.REQUISITION_ID, status: r.STATUS, amount: r.TOTAL_AMOUNT })))

    return NextResponse.json(requisitions)
  } catch (error) {
    console.error("❌ Error fetching my orders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
