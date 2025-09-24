import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 ===== TEST REMINDER API START =====');
    console.log('🔔 Test API called at:', new Date().toLocaleString('th-TH', {timeZone: 'Asia/Bangkok'}));

    // สร้างข้อมูลจำลอง
    const mockData = {
      pendingCount: 3,
      remindersSent: 2,
      results: [
        {
          requisitionId: 12345,
          requesterName: 'ผู้ใช้งานทดสอบ 1',
          daysPending: 2,
          status: 'sent'
        },
        {
          requisitionId: 12346,
          requesterName: 'ผู้ใช้งานทดสอบ 2',
          daysPending: 5,
          status: 'sent'
        },
        {
          requisitionId: 12347,
          requesterName: 'ผู้ใช้งานทดสอบ 3',
          daysPending: 1,
          status: 'failed',
          error: 'SMTP connection timeout'
        }
      ]
    };

    console.log('✅ Test reminder API completed successfully');
    console.log('📊 Results:', mockData);

    return NextResponse.json({
      success: true,
      message: "ทดสอบระบบแจ้งเตือนสำเร็จ",
      ...mockData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in test reminder API:', error);
    
    return NextResponse.json({
      error: "Failed to process test reminder",
      message: error instanceof Error ? error.message : "Unknown error",
      details: error
    }, { status: 500 });
  }
}

