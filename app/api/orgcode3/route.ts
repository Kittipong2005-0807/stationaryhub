import { NextRequest, NextResponse } from "next/server"
import { OrgCode3Service } from "@/lib/orgcode3-service"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const userId = searchParams.get("userId")

    switch (action) {
      case "getUserOrgCode3":
        if (!userId) {
          return NextResponse.json({ error: "User ID is required" }, { status: 400 })
        }
        const orgcode3 = await OrgCode3Service.getUserOrgCode3(userId)
        return NextResponse.json({ orgcode3 })

      case "getManagersByOrgCode3":
        if (!userId) {
          return NextResponse.json({ error: "User ID is required" }, { status: 400 })
        }
        const userOrgCode3 = await OrgCode3Service.getUserOrgCode3(userId)
        if (!userOrgCode3) {
          return NextResponse.json({ managers: [] })
        }
        const managers = await OrgCode3Service.getManagersByOrgCode3(userOrgCode3)
        return NextResponse.json({ managers })

      case "getAvailableManagers":
        if (!userId) {
          return NextResponse.json({ error: "User ID is required" }, { status: 400 })
        }
        const availableManagers = await OrgCode3Service.getAvailableManagersForUser(userId)
        return NextResponse.json({ managers: availableManagers })

      case "getRequisitionsForManager":
        if (!userId) {
          return NextResponse.json({ error: "Manager ID is required" }, { status: 400 })
        }
        const requisitions = await OrgCode3Service.getRequisitionsForManager(userId)
        return NextResponse.json({ requisitions })

      case "getStats":
        const stats = await OrgCode3Service.getOrgCode3Stats()
        return NextResponse.json(stats)

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Error in orgcode3 API:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, userId, orgcode3, totalAmount, issueNote, siteId } = await request.json()

    switch (action) {
      case "updateUserOrgCode3":
        if (!userId || !orgcode3) {
          return NextResponse.json({ error: "User ID and orgcode3 are required" }, { status: 400 })
        }
        const success = await OrgCode3Service.updateUserOrgCode3(userId, orgcode3)
        return NextResponse.json({ success })

      case "createRequisition":
        if (!userId || !totalAmount) {
          return NextResponse.json({ error: "User ID and total amount are required" }, { status: 400 })
        }
        const requisitionId = await OrgCode3Service.createRequisitionWithOrgCode3(
          userId,
          totalAmount,
          issueNote,
          siteId
        )
        return NextResponse.json({ requisitionId })

      case "checkUserManagerRelationship":
        if (!userId) {
          return NextResponse.json({ error: "User ID is required" }, { status: 400 })
        }
        const managerUserId = session.user.AdLoginName || session.user.name
        const canSubmit = await OrgCode3Service.canUserSubmitToManager(userId, managerUserId)
        return NextResponse.json({ canSubmit })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Error in orgcode3 API POST:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
} 