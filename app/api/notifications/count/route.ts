import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { NotificationService } from '@/lib/notification-service'

export async function GET(request: NextRequest) {
  try {
    // ตรวจสอบ session
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).USER_ID || session.user.name

    // นับจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
    const unreadCount = await NotificationService.getUnreadNotificationCount(userId)
    
    return NextResponse.json({
      success: true,
      data: {
        unreadCount
      }
    })

  } catch (error) {
    console.error('❌ Error getting unread notification count:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
