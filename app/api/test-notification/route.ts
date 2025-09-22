import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notification-service'

export async function POST(request: NextRequest) {
  try {
    const { requisitionId, userId } = await request.json()

    if (!requisitionId || !userId) {
      return NextResponse.json(
        { error: 'Missing requisitionId or userId' },
        { status: 400 }
      )
    }

    console.log(`🧪 Testing notification for requisition ${requisitionId} by user ${userId}`)

    // เรียกใช้ระบบแจ้งเตือน
    await NotificationService.notifyRequisitionCreated(requisitionId, userId)

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      requisitionId,
      userId
    })

  } catch (error) {
    console.error('❌ Error in test notification API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send notification',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
