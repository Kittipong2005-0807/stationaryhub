import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    // ตรวจสอบ session
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    
    // ตรวจสอบว่าเป็น Admin หรือไม่
    if (user?.ROLE !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // นับจำนวนคำขอที่ manager อนุมัติแล้ว (STATUS = 'APPROVED')
               // นับเฉพาะ requisitions ที่ได้รับการอนุมัติและ Admin ยังไม่ได้ดู
           const approvedCount = await prisma.rEQUISITIONS.count({
             where: {
               STATUS: 'APPROVED',
               ADMIN_VIEWED_AT: null
             }
           })
    
    return NextResponse.json({
      success: true,
      data: {
        approvedCount
      }
    })

  } catch (error) {
    console.error('❌ Error getting approved requisitions count:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
