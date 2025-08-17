import { NextRequest, NextResponse } from "next/server"
import { NotificationService } from "@/lib/notification-service"

export async function POST(request: NextRequest) {
  try {
    const { type, userId, requisitionId, message } = await request.json()
    
    console.log(`🧪 Testing notification: ${type} for user ${userId}`)
    
    switch (type) {
      case 'requisition_created':
        await NotificationService.notifyRequisitionCreated(requisitionId || 1, userId)
        break
        
      case 'requisition_approved':
        await NotificationService.notifyRequisitionApproved(requisitionId || 1, userId)
        break
        
      case 'requisition_rejected':
        await NotificationService.notifyRequisitionRejected(requisitionId || 1, userId, message)
        break
        
      case 'test_email':
        await NotificationService.sendTestEmail(
          'test@example.com',
          'Test Notification',
          'นี่เป็นการทดสอบระบบการแจ้งเตือน'
        )
        break
        
      default:
        return NextResponse.json({ error: "Invalid notification type" }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Test notification ${type} sent successfully` 
    })
    
  } catch (error: any) {
    console.error("❌ Error in test notification:", error)
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 })
  }
} 