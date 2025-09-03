import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendMail } from "@/lib/database"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { ApprovalService } from "@/lib/approval-service"
import { OrgCode3Service } from "@/lib/orgcode3-service"
import { NotificationService } from "@/lib/notification-service"

// ฟังก์ชันดึง EmpCode จาก session
async function getEmpCodeFromSession(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    // ใช้ AdLoginName จาก session โดยตรง
    const adLoginName = (session?.user as { AdLoginName?: string })?.AdLoginName
    
    if (!adLoginName) {
      console.log("No AdLoginName found in session")
      return null
    }
    
    console.log("Looking up EmpCode for AdLoginName:", adLoginName)
    
    // ดึงข้อมูลจาก view UserWithRoles โดยใช้ AdLoginName
    const userWithRole = await prisma.$queryRaw`
      SELECT EmpCode FROM UserWithRoles 
      WHERE AdLoginName = ${adLoginName}
    `
    
    console.log("UserWithRoles query result:", userWithRole)
    
    if (userWithRole && Array.isArray(userWithRole) && userWithRole.length > 0) {
      const empCode = userWithRole[0].EmpCode
      console.log("Found EmpCode:", empCode)
      return empCode
    }
    
    console.log("No EmpCode found for AdLoginName:", adLoginName)
    return null
  } catch (error) {
    console.error("Error getting EmpCode from session:", error)
    // ถ้าเกิด database error ให้ใช้ fallback
    try {
      const session = await getServerSession(authOptions)
      const adLoginName = (session?.user as { AdLoginName?: string })?.AdLoginName
      if (adLoginName) {
        console.log("Using AdLoginName as fallback EmpCode:", adLoginName)
        return adLoginName
      }
    } catch (fallbackError) {
      console.error("Fallback error:", fallbackError)
    }
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mine = searchParams.get("mine")
    
    if (mine === "1") {
      // ดึง EmpCode จาก session
      const empCode = await getEmpCodeFromSession(request)
      
      // ถ้าไม่มี EmpCode ให้ใช้ fallback
      let userId = empCode
      if (!userId) {
        console.log("No EmpCode found, using fallback")
        // ใช้ fallback user ID หรือ return empty array
        userId = "9C154" // fallback user ID
      }
      
      console.log("Fetching requisitions for User ID:", userId)
      
      // ดึงข้อมูล requisitions โดยตรงจาก database
      const requisitions = await prisma.rEQUISITIONS.findMany({
        where: { USER_ID: userId },
        orderBy: { SUBMITTED_AT: "desc" },
        include: {
          USERS: {
            select: {
              USERNAME: true,
              DEPARTMENT: true,
              ROLE: true
            }
          },
          REQUISITION_ITEMS: {
            include: {
              PRODUCTS: {
                select: {
                  PRODUCT_NAME: true
                }
              }
            }
          }
        }
      })
      
      // แปลงข้อมูลให้ตรงกับ interface และดึงสถานะล่าสุด
      const result = await Promise.all(requisitions.map(async (requisition: any) => {
        // ดึงสถานะล่าสุดจาก ApprovalService
        const latestStatus = await ApprovalService.getLatestStatus(requisition.REQUISITION_ID)
        
        return {
          REQUISITION_ID: requisition.REQUISITION_ID,
          USER_ID: requisition.USER_ID,
          USERNAME: requisition.USERS?.USERNAME || requisition.USER_ID,
          DEPARTMENT: requisition.USERS?.DEPARTMENT,
          USER_ROLE: requisition.USERS?.ROLE,
          SUBMITTED_AT: requisition.SUBMITTED_AT?.toISOString() || new Date().toISOString(),
          STATUS: latestStatus || requisition.STATUS || "PENDING",
          TOTAL_AMOUNT: requisition.TOTAL_AMOUNT || 0,
          ISSUE_NOTE: requisition.ISSUE_NOTE,
          REQUISITION_ITEMS: requisition.REQUISITION_ITEMS?.map((item: any) => ({
            REQUISITION_ITEM_ID: item.ITEM_ID,
            PRODUCT_ID: item.PRODUCT_ID,
            PRODUCT_NAME: item.PRODUCTS?.PRODUCT_NAME || "Unknown Product",
            QUANTITY: item.QUANTITY || 0,
            UNIT_PRICE: Number(item.UNIT_PRICE) || 0,
            TOTAL_PRICE: ((item.QUANTITY || 0) * Number(item.UNIT_PRICE || 0)) || 0
          })) || []
        }
      }))
      
      console.log("Requisitions result:", result)
      return NextResponse.json(result)
    } else {
      // ดึงข้อมูล requisitions ทั้งหมด
      const requisitions = await prisma.rEQUISITIONS.findMany({
        orderBy: { SUBMITTED_AT: "desc" },
        include: {
          USERS: {
            select: {
              USERNAME: true,
              DEPARTMENT: true,
              ROLE: true
            }
          },
          REQUISITION_ITEMS: {
            include: {
              PRODUCTS: {
                select: {
                  PRODUCT_NAME: true
                }
              }
            }
          }
        }
      })
      
      const result = requisitions.map((requisition: any) => ({
        REQUISITION_ID: requisition.REQUISITION_ID,
        USER_ID: requisition.USER_ID,
        USERNAME: requisition.USERS?.USERNAME || requisition.USER_ID,
        DEPARTMENT: requisition.USERS?.DEPARTMENT,
        USER_ROLE: requisition.USERS?.ROLE,
        SUBMITTED_AT: requisition.SUBMITTED_AT?.toISOString() || new Date().toISOString(),
        STATUS: requisition.STATUS || "PENDING",
        TOTAL_AMOUNT: requisition.TOTAL_AMOUNT || 0,
        ISSUE_NOTE: requisition.ISSUE_NOTE,
        REQUISITION_ITEMS: requisition.REQUISITION_ITEMS?.map((item: any) => ({
          REQUISITION_ITEM_ID: item.ITEM_ID,
          PRODUCT_ID: item.PRODUCT_ID,
          PRODUCT_NAME: item.PRODUCTS?.PRODUCT_NAME || "Unknown Product",
          QUANTITY: item.QUANTITY || 0,
          UNIT_PRICE: Number(item.UNIT_PRICE) || 0,
          TOTAL_PRICE: ((item.QUANTITY || 0) * Number(item.UNIT_PRICE || 0)) || 0
        })) || []
      }))
      
      return NextResponse.json(result)
    }
  } catch (error) {
    console.error("Error in GET /api/requisitions:", error)
    return NextResponse.json({ 
      error: "Failed to fetch requisitions",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log("Received data:", data)
    
    // ถ้ามี requisitionId แสดงว่าเป็นการสร้าง requisition items เท่านั้น
    if (data.requisitionId) {
      console.log("Creating requisition items for existing ID:", data.requisitionId)
      
      if (data.REQUISITION_ITEMS && Array.isArray(data.REQUISITION_ITEMS)) {
        for (const item of data.REQUISITION_ITEMS) {
          await prisma.rEQUISITION_ITEMS.create({
            data: {
              REQUISITION_ID: data.requisitionId,
              PRODUCT_ID: item.PRODUCT_ID,
              QUANTITY: item.QUANTITY,
              UNIT_PRICE: item.UNIT_PRICE,
            }
          })
        }
      }
      
      return NextResponse.json({ success: true }, { status: 201 })
    }
    
    // กรณีสร้าง requisition ใหม่ (จะใช้ OrgCode3Service แทน)
    console.log("Creating new requisition with OrgCode3Service")
    
    // ดึง EmpCode จาก session หรือ request headers
    const empCode = await getEmpCodeFromSession(request) || data.USER_ID
    
    if (!empCode) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }
    
    // ตรวจสอบว่ามี user ในตาราง USERS หรือไม่
    let user = await prisma.uSERS.findUnique({
      where: { USER_ID: empCode }
    })
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    // สร้าง requisition ใหม่
    const requisition = await prisma.rEQUISITIONS.create({
      data: {
        USER_ID: empCode,
        SUBMITTED_AT: new Date(),
        STATUS: "PENDING",
        TOTAL_AMOUNT: data.TOTAL_AMOUNT || 0,
        ISSUE_NOTE: data.ISSUE_NOTE || null,
      }
    })
    
    // สร้าง requisition items
    if (data.REQUISITION_ITEMS && Array.isArray(data.REQUISITION_ITEMS)) {
      for (const item of data.REQUISITION_ITEMS) {
        await prisma.rEQUISITION_ITEMS.create({
          data: {
            REQUISITION_ID: requisition.REQUISITION_ID,
            PRODUCT_ID: item.PRODUCT_ID,
            QUANTITY: item.QUANTITY,
            UNIT_PRICE: item.UNIT_PRICE,
          }
        })
      }
    }
    
    // ส่ง notification
    try {
      await NotificationService.notifyRequisitionCreated(requisition.REQUISITION_ID, empCode)
    } catch (notificationError) {
      console.error("Notification error:", notificationError)
    }
    
    return NextResponse.json({ 
      success: true, 
      requisitionId: requisition.REQUISITION_ID 
    }, { status: 201 })
    
  } catch (error) {
    console.error("Error in POST /api/requisitions:", error)
    return NextResponse.json({ 
      error: "Failed to create requisition",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
