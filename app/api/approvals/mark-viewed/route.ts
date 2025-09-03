import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'

export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any

    if (user?.ROLE !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // อัพเดท ADMIN_VIEWED_AT สำหรับ requisitions ที่ได้รับการอนุมัติและยังไม่ได้ดู
    const result = await prisma.rEQUISITIONS.updateMany({
      where: {
        STATUS: 'APPROVED',
        ADMIN_VIEWED_AT: null
      },
      data: {
        ADMIN_VIEWED_AT: new Date()
      }
    })

    console.log(`✅ Marked ${result.count} approved requisitions as viewed by Admin`)

    return NextResponse.json({
      success: true,
      data: {
        markedCount: result.count
      }
    })

  } catch (error) {
    console.error('❌ Error marking requisitions as viewed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
