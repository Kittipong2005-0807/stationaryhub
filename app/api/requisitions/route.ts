import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendMail } from "@/lib/database"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { ApprovalService } from "@/lib/approval-service"
import { OrgCode3Service } from "@/lib/orgcode3-service"
import { NotificationService } from "@/lib/notification-service"
import { ThaiTimeUtils } from "@/lib/thai-time-utils"

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
      const requisitions = await prisma.$queryRaw`
        SELECT 
          r.REQUISITION_ID,
          r.USER_ID,
          r.STATUS,
          r.SUBMITTED_AT,
          r.TOTAL_AMOUNT,
          r.SITE_ID,
          r.ISSUE_NOTE,
          u.USERNAME,
          uwr.CostCenterEng as DEPARTMENT,
          uwr.costcentercode as SITE_ID,
          u.ROLE
        FROM REQUISITIONS r
        LEFT JOIN USERS u ON r.USER_ID = u.USER_ID
        LEFT JOIN UserWithRoles uwr ON r.USER_ID = uwr.EmpCode
        WHERE r.USER_ID = ${userId}
        ORDER BY r.SUBMITTED_AT DESC
      `
      
      // แปลงข้อมูลให้ตรงกับ interface และดึงสถานะล่าสุด
      const result = await Promise.all((requisitions as any[]).map(async (requisition: any) => {
        // ดึงสถานะล่าสุดจาก ApprovalService
        const latestStatus = await ApprovalService.getLatestStatus(requisition.REQUISITION_ID)
        
        return {
          REQUISITION_ID: requisition.REQUISITION_ID,
          USER_ID: requisition.USER_ID,
          USERNAME: requisition.USERNAME || requisition.USER_ID,
          DEPARTMENT: requisition.DEPARTMENT,
          USER_ROLE: requisition.ROLE,
          SUBMITTED_AT: requisition.SUBMITTED_AT || null,
          STATUS: latestStatus || requisition.STATUS || "PENDING",
          TOTAL_AMOUNT: requisition.TOTAL_AMOUNT || 0,
          ISSUE_NOTE: requisition.ISSUE_NOTE,
          SITE_ID: requisition.SITE_ID,
          REQUISITION_ITEMS: [] // จะต้องดึงแยกหากต้องการรายละเอียด items
        }
      }))
      
      console.log("Requisitions result:", result)
      return NextResponse.json(result)
    } else {
      // ดึงข้อมูล requisitions ทั้งหมด
      const requisitions = await prisma.$queryRaw`
        SELECT 
          r.REQUISITION_ID,
          r.USER_ID,
          r.STATUS,
          r.SUBMITTED_AT,
          r.TOTAL_AMOUNT,
          r.SITE_ID,
          r.ISSUE_NOTE,
          u.USERNAME,
          uwr.CostCenterEng as DEPARTMENT,
          uwr.costcentercode as SITE_ID,
          u.ROLE
        FROM REQUISITIONS r
        LEFT JOIN USERS u ON r.USER_ID = u.USER_ID
        LEFT JOIN UserWithRoles uwr ON r.USER_ID = uwr.EmpCode
        ORDER BY r.SUBMITTED_AT DESC
      `
      
      const result = (requisitions as any[]).map((requisition: any) => ({
        REQUISITION_ID: requisition.REQUISITION_ID,
        USER_ID: requisition.USER_ID,
        USERNAME: requisition.USERNAME || requisition.USER_ID,
        DEPARTMENT: requisition.DEPARTMENT,
        USER_ROLE: requisition.ROLE,
        SUBMITTED_AT: requisition.SUBMITTED_AT || null,
        STATUS: requisition.STATUS || "PENDING",
        TOTAL_AMOUNT: requisition.TOTAL_AMOUNT || 0,
        ISSUE_NOTE: requisition.ISSUE_NOTE,
        SITE_ID: requisition.SITE_ID,
        REQUISITION_ITEMS: [] // จะต้องดึงแยกหากต้องการรายละเอียด items
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
    
    // สร้าง requisition ใหม่ ใช้ GETDATE() เพื่อให้ได้เวลาที่ถูกต้อง
    const result = await prisma.$executeRaw`
      INSERT INTO REQUISITIONS (USER_ID, STATUS, SUBMITTED_AT, TOTAL_AMOUNT, ISSUE_NOTE)
      VALUES (${empCode}, 'PENDING', GETDATE(), ${data.TOTAL_AMOUNT || 0}, ${data.ISSUE_NOTE || null})
    `
    
    // ดึงข้อมูล requisition ที่เพิ่งสร้าง

    const requisition = await prisma.rEQUISITIONS.findFirst({
      where: { USER_ID: empCode },
      orderBy: { REQUISITION_ID: 'desc' }
    })
    
    if (!requisition) {
      return NextResponse.json({ error: "Failed to create requisition" }, { status: 500 })
    }
    
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
    
    // การแจ้งเตือนจะถูกส่งโดย OrgCode3Service.createRequisitionWithSiteId แล้ว
    // ไม่ต้องส่งซ้ำที่นี่
    
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
