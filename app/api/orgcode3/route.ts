import { NextRequest, NextResponse } from "next/server"
import { OrgCode3Service } from "@/lib/orgcode3-service"
import { authOptions } from "@/lib/authOptions"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

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

    if (action === "getAllRequisitionsForAdmin") {
      const user = session.user as any
      if (user?.ROLE !== "ADMIN") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 })
      }

      try {
        const requisitions = await OrgCode3Service.getAllRequisitionsForAdmin()
        return NextResponse.json({ requisitions })
      } catch (error) {
        console.error("Error getting all requisitions for admin:", error)
        return NextResponse.json({ error: "Failed to get all requisitions" }, { status: 500 })
      }
    }

    switch (action) {
      case "getUserSiteId":
        if (!userId) {
          return NextResponse.json({ error: "User ID is required" }, { status: 400 })
        }
        const userSiteIdResult = await OrgCode3Service.getUserSiteId(userId)
        return NextResponse.json({ siteId: userSiteIdResult })

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
        
      case "getAllRequisitionsForDepartment":
        if (!userId) {
          return NextResponse.json({ error: "User ID is required" }, { status: 400 })
        }
        const departmentRequisitions = await OrgCode3Service.getAllRequisitionsForDepartment(userId)
        return NextResponse.json({ requisitions: departmentRequisitions })
        
      case "getRequisitionsBySiteId":
        const siteId = searchParams.get("siteId")
        if (!siteId) {
          return NextResponse.json({ error: "Site ID is required" }, { status: 400 })
        }
        const siteRequisitions = await OrgCode3Service.getRequisitionsBySiteId(siteId)
        return NextResponse.json({ requisitions: siteRequisitions })

      case "getStats":
        const stats = await OrgCode3Service.getSiteIdStats()
        return NextResponse.json(stats)

      case "getUserOrgCode4":
        if (!userId) {
          return NextResponse.json({ error: "User ID is required" }, { status: 400 })
        }
        try {
          const userData = await prisma.$queryRaw<{ OrgCode4: string, OrgTDesc3: string, FullNameEng: string, FullNameThai: string }[]>`
            SELECT OrgCode4, OrgTDesc3, FullNameEng, FullNameThai 
            FROM userWithRoles 
            WHERE EmpCode = ${userId}
          `
          const orgCode4 = userData && userData.length > 0 ? userData[0].OrgCode4 : null
          const orgTDesc3 = userData && userData.length > 0 ? userData[0].OrgTDesc3 : null
          const fullNameEng = userData && userData.length > 0 ? userData[0].FullNameEng : null
          const fullNameThai = userData && userData.length > 0 ? userData[0].FullNameThai : null
          return NextResponse.json({ orgCode4, orgTDesc3, fullNameEng, fullNameThai })
        } catch (error) {
          console.error("Error fetching user OrgCode4:", error)
          return NextResponse.json({ error: "Failed to fetch OrgCode4" }, { status: 500 })
        }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("=== API ORGCODE3 ERROR ===")
    console.error("Error in orgcode3 API:", error)
    console.error("Error type:", typeof error)
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)
    
    return NextResponse.json({ 
      error: error.message || "Internal server error",
      type: typeof error,
      details: "Check server logs for more information"
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== API ORGCODE3 POST START ===")
    
    const session = await getServerSession(authOptions)
    console.log("Session:", session)
    
    if (!session?.user) {
      console.error("❌ No session user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    console.log("✅ Session user found:", session.user)

    const { action, userId, siteId, totalAmount, issueNote, REQUISITION_ITEMS } = await request.json()
    
    console.log("=== API ORGCODE3 POST REQUEST ===")
    console.log("Request data:", { 
      action, 
      userId, 
      siteId, 
      totalAmount, 
      issueNote, 
      itemsCount: REQUISITION_ITEMS?.length,
      items: REQUISITION_ITEMS 
    })

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
        
        // ตรวจสอบข้อมูลเพิ่มเติม
        if (totalAmount <= 0) {
          console.error("Invalid total amount:", totalAmount)
          return NextResponse.json({ error: "Total amount must be greater than 0" }, { status: 400 })
        }
        
        if (!REQUISITION_ITEMS || !Array.isArray(REQUISITION_ITEMS) || REQUISITION_ITEMS.length === 0) {
          console.error("Invalid or empty REQUISITION_ITEMS:", REQUISITION_ITEMS)
          return NextResponse.json({ error: "Requisition items are required" }, { status: 400 })
        }
        
        console.log("Creating requisition for user:", userId)
        console.log("Request data:", { userId, totalAmount, issueNote, siteId, itemsCount: REQUISITION_ITEMS.length })
        
        try {
          console.log("=== CALLING ORGCODE3SERVICE ===")
          const requisitionId = await OrgCode3Service.createRequisitionWithSiteId(
            userId,
            totalAmount,
            issueNote,
            siteId,
            REQUISITION_ITEMS
          )
          console.log("=== ORGCODE3SERVICE RESULT ===")
          console.log("Requisition created with ID:", requisitionId)
          
          if (!requisitionId) {
            console.error("Failed to create requisition - no ID returned")
            return NextResponse.json({ 
              error: "Failed to create requisition - user may not exist or database error occurred" 
            }, { status: 500 })
          }
          
          return NextResponse.json({ requisitionId })
        } catch (error) {
          console.error("Error in createRequisition:", error)
          const errorMessage = error instanceof Error ? error.message : "Internal server error"
          return NextResponse.json({ 
            error: errorMessage,
            details: "Please check if user exists and database connection is working"
          }, { status: 500 })
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