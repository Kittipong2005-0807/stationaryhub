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
    
    if (!adLoginName) return null
    
    // ดึงข้อมูลจาก view UserWithRoles โดยใช้ AdLoginName
    const userWithRole = await prisma.$queryRaw`
      SELECT EmpCode FROM UserWithRoles 
      WHERE AdLoginName = ${adLoginName}
    `
    
    if (userWithRole && Array.isArray(userWithRole) && userWithRole.length > 0) {
      return userWithRole[0].EmpCode
    }
    
    return null
  } catch (error) {
    console.error("Error getting EmpCode from session:", error)
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
      if (!empCode) {
        return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
      }
      
      // ใช้ ApprovalService เพื่อดึงข้อมูล requisitions ของ user
      const result = await ApprovalService.getUserRequisitionsWithStatus(empCode)
      return NextResponse.json(result)
    } else {
      // ใช้ ApprovalService เพื่อดึงข้อมูล requisitions ทั้งหมด
      const result = await ApprovalService.getAllRequisitionsWithStatus()
      return NextResponse.json(result)
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch requisitions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log("Received data:", data)
    
    // ถ้ามี requisitionId แสดงว่าเป็นการสร้าง requisition items
    if (data.requisitionId) {
      console.log("Creating requisition items for ID:", data.requisitionId)
      
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
    
    // ถ้าไม่มี user ให้สร้างใหม่
    if (!user) {
      user = await prisma.uSERS.create({
        data: {
          USER_ID: empCode,
          USERNAME: empCode,
          PASSWORD: 'default_password',
          EMAIL: data.USER_ID || '',
          ROLE: 'USER',
          DEPARTMENT: 'General',
          SITE_ID: data.SITE_ID || "1700"
        }
      })
    }
    
    // ใช้ OrgCode3Service เพื่อสร้าง requisition พร้อม orgcode3
    const requisitionId = await OrgCode3Service.createRequisitionWithOrgCode3(
      user.USER_ID,
      parseFloat(data.TOTAL_AMOUNT?.toString() || '0'),
      data.ISSUE_NOTE || "",
      data.SITE_ID || "1700"
    )

    if (!requisitionId) {
      return NextResponse.json({ error: "Failed to create requisition" }, { status: 500 })
    }

    // สร้าง requisition items
    if (data.REQUISITION_ITEMS && Array.isArray(data.REQUISITION_ITEMS)) {
      for (const item of data.REQUISITION_ITEMS) {
        await prisma.rEQUISITION_ITEMS.create({
          data: {
            REQUISITION_ID: requisitionId,
            PRODUCT_ID: item.PRODUCT_ID,
            QUANTITY: item.QUANTITY,
            UNIT_PRICE: item.UNIT_PRICE,
          }
        })
      }
    }

    // ส่งการแจ้งเตือนเมื่อสร้าง requisition ใหม่
    if (requisitionId) {
      await NotificationService.notifyRequisitionCreated(requisitionId, user.USER_ID)
    }

    return NextResponse.json({ requisitionId }, { status: 201 })
  } catch (error) {
    console.error("Error in requisitions API:", error)
    return NextResponse.json({ error: "Failed to create requisition" }, { status: 500 })
  }
}
