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

    if (action === "getRequisitionsForManager") {
      if (!userId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 })
      }

      try {
        const requisitions = await OrgCode3Service.getRequisitionsForManager(userId)
        return NextResponse.json({ requisitions })
      } catch (error) {
        console.error("Error getting requisitions for manager:", error)
        return NextResponse.json({ error: "Failed to get requisitions" }, { status: 500 })
      }
    }

    if (action === "getApprovedRequisitionsForAdmin") {
      const user = session.user as any
      if (user?.ROLE !== "ADMIN") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 })
      }

      try {
        const requisitions = await OrgCode3Service.getApprovedRequisitionsForAdmin()
        return NextResponse.json({ requisitions })
      } catch (error) {
        console.error("Error getting approved requisitions for admin:", error)
        return NextResponse.json({ error: "Failed to get approved requisitions" }, { status: 500 })
      }
    }

    switch (action) {
      case "getUserSiteId":
        if (!userId) {
          return NextResponse.json({ error: "User ID is required" }, { status: 400 })
        }
        const siteId = await OrgCode3Service.getUserSiteId(userId)
        return NextResponse.json({ siteId })

      case "getManagersBySiteId":
        if (!userId) {
          return NextResponse.json({ error: "User ID is required" }, { status: 400 })
        }
        const userSiteId = await OrgCode3Service.getUserSiteId(userId)
        if (!userSiteId) {
          return NextResponse.json({ managers: [] })
        }
        const managers = await OrgCode3Service.getManagersBySiteId(userSiteId)
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
        const stats = await OrgCode3Service.getSiteIdStats()
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

    const { action, userId, siteId, totalAmount, issueNote, REQUISITION_ITEMS } = await request.json()
    
    console.log("API orgcode3 POST request:", { action, userId, siteId, totalAmount, issueNote })

    switch (action) {
      case "updateUserSiteId":
        if (!userId || !siteId) {
          return NextResponse.json({ error: "User ID and siteId are required" }, { status: 400 })
        }
        const success = await OrgCode3Service.updateUserSiteId(userId, siteId)
        return NextResponse.json({ success })

      case "createRequisition":
        if (!userId || !totalAmount) {
          console.error("Missing required fields:", { userId, totalAmount })
          return NextResponse.json({ error: "User ID and total amount are required" }, { status: 400 })
        }
        console.log("Creating requisition for user:", userId)
        console.log("Request data:", { userId, totalAmount, issueNote, siteId })
        
        try {
          const requisitionId = await OrgCode3Service.createRequisitionWithSiteId(
            userId,
            totalAmount,
            issueNote,
            siteId
          )
          console.log("Requisition created with ID:", requisitionId)
          
          if (!requisitionId) {
            console.error("Failed to create requisition - no ID returned")
            return NextResponse.json({ error: "Failed to create requisition" }, { status: 500 })
          }
          
          return NextResponse.json({ requisitionId })
        } catch (error) {
          console.error("Error in createRequisition:", error)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }

      case "checkUserManagerRelationship":
        if (!userId) {
          return NextResponse.json({ error: "User ID is required" }, { status: 400 })
        }
        const managerUserId = (session.user as any).AdLoginName || session.user.name
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