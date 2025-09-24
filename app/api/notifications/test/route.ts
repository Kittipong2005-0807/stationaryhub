import { NextRequest, NextResponse } from "next/server"
import { NotificationService } from "@/lib/notification-service"
import { ThaiTimeUtils } from "@/lib/thai-time-utils"

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
        // ==========================================
        // 🚫 EMAIL SENDING DISABLED - LOG ONLY MODE
        // ==========================================
        console.log('🚫 ===== TEST EMAIL DISABLED - LOG ONLY MODE =====')
        console.log('📧 Test email would have been sent with the following details:')
        console.log('  - To: test@example.com')
        console.log('  - Subject: Test Notification')
        console.log('  - Message: นี่เป็นการทดสอบระบบการแจ้งเตือน')
        console.log('  - Timestamp:', ThaiTimeUtils.getCurrentThaiTimeISO())
        console.log('🚫 ===== EMAIL NOT ACTUALLY SENT =====')
        
        // Simulate successful email sending for logging purposes
        console.log('✅ Test email logged successfully (not actually sent)')
        
        // ==========================================
        // 🔧 ORIGINAL EMAIL SENDING CODE (COMMENTED OUT)
        // ==========================================
        /*
        await NotificationService.sendTestEmail(
          'test@example.com',
          'Test Notification',
          'นี่เป็นการทดสอบระบบการแจ้งเตือน'
        )
        */
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