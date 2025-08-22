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

    const userId = session.user.USER_ID || session.user.name
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')

    // ดึงการแจ้งเตือนสำหรับผู้ใช้
    const notifications = await NotificationService.getNotificationsForUser(userId, limit)
    
    // คำนวณ pagination
    const totalNotifications = notifications.length
    const hasMore = totalNotifications === limit

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total: totalNotifications,
          hasMore
        }
      }
    })

  } catch (error) {
    console.error('❌ Error getting notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบ session
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, notificationId } = body

    switch (action) {
      case 'markAsRead':
        if (!notificationId) {
          return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
        }
        
        const success = await NotificationService.markNotificationAsRead(notificationId)
        if (success) {
          return NextResponse.json({ success: true, message: 'Notification marked as read' })
        } else {
          return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 })
        }

      case 'markAllAsRead':
        // TODO: Implement mark all as read functionality
        return NextResponse.json({ error: 'Not implemented yet' }, { status: 501 })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Error processing notification action:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 