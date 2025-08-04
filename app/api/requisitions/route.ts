import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendMail } from "@/lib/database"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

// ฟังก์ชันดึง EmpCode จาก session
async function getEmpCodeFromSession(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    // ใช้ AdLoginName จาก session โดยตรง
    const adLoginName = (session?.user as any)?.AdLoginName
    
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
      // TODO: ดึง user id จาก session จริง ๆ
      // const userId = 1 // mock user id (ควรแก้เป็น auth จริง)
      // ดึง EmpCode จาก session
      const empCode = await getEmpCodeFromSession(request)
      if (!empCode) {
        return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
      }
      
      const requisitions = await prisma.rEQUISITIONS.findMany({
        where: { USER_ID: empCode },
        orderBy: { SUBMITTED_AT: "desc" },
        include: {
          REQUISITION_ITEMS: {
            include: { PRODUCTS: { select: { PRODUCT_NAME: true } } },
          },
        },
      })
      // map รายการสินค้าให้แสดงชื่อสินค้า
      const result = requisitions.map((r: any) => ({
        ...r,
        REQUISITION_ITEMS: r.REQUISITION_ITEMS?.map((item: any) => ({
          PRODUCT_NAME: item.PRODUCTS?.PRODUCT_NAME || "",
          QUANTITY: item.QUANTITY,
          UNIT_PRICE: item.UNIT_PRICE,
          TOTAL_PRICE: item.TOTAL_PRICE,
        })),
      }))
      return NextResponse.json(result)
    } else {
      const requisitions = await prisma.rEQUISITIONS.findMany()
      return NextResponse.json(requisitions)
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch requisitions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log("Received data:", data)
    console.log("REQUISITION_ITEMS from request:", data.REQUISITION_ITEMS)
    
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
          USERNAME: empCode, // ใช้ EmpCode เป็น username
          PASSWORD: 'default_password', // ต้องเปลี่ยนเป็น password ที่ปลอดภัย
          EMAIL: data.USER_ID || '', // ใช้ email จาก request ถ้ามี
          ROLE: 'USER',
          DEPARTMENT: 'General',
          SITE_ID: data.SITE_ID || "1700"
        }
      })
    }
    
    let result = {
      USER_ID: user.USER_ID,
      STATUS: data.STATUS || "PENDING",
      TOTAL_AMOUNT: data.TOTAL_AMOUNT,
      SITE_ID: data.SITE_ID || "1700",
      ISSUE_NOTE: data.ISSUE_NOTE || "",
      REQUISITION_ITEMS: {
        create: data.REQUISITION_ITEMS?.map((item: any) => ({
          PRODUCT_ID: item.PRODUCT_ID,
          QUANTITY: item.QUANTITY,
          UNIT_PRICE: item.UNIT_PRICE,
          // TOTAL_PRICE จะถูกคำนวณอัตโนมัติโดยฐานข้อมูล
        })) || [],
      },
    }
    console.log("Requisition data:", result)

    const newRequisition = await prisma.rEQUISITIONS.create({ data: result })

    // // ดึงอีเมลของ user (ถ้ามี USER_ID)
    // let userEmail = null
    // if (data.USER_ID) {
    //   const user = await prisma.userWithRoles.findUnique({
    //     where: { USER_ID: data.USER_ID },
    //   })
    //   userEmail = user?.EMAIL
    // }
    // // ส่งอีเมลแจ้งเตือน
    // if (userEmail) {
    //   await sendMail(
    //     userEmail,
    //     "ยืนยันการสั่งซื้อ/ขอเบิกสำเร็จ",
    //     `ระบบได้รับคำสั่งซื้อ/ขอเบิกของคุณแล้ว (เลขที่ ${newRequisition.REQUISITION_ID})`
    //   )
    // }
    return NextResponse.json('', { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create requisition" }, { status: 500 })
  }
}
