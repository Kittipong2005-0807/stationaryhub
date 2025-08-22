import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { NotificationService } from '@/lib/notification-service'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ตรวจสอบ session
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notificationId = parseInt(params.id)
    if (isNaN(notificationId)) {
      return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 })
    }

    // อัปเดตสถานะการอ่าน
    const success = await NotificationService.markNotificationAsRead(notificationId)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Notification marked as read',
        data: {
          notificationId,
          isRead: true
        }
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to mark notification as read' }, 
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error marking notification as read:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 