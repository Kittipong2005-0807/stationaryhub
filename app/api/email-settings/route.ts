import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - ดึงการตั้งค่าอีเมล
export async function GET(request: NextRequest) {
  try {
    console.log('📧 Fetching email settings...');

    // ดึงการตั้งค่าจากฐานข้อมูล (หรือใช้ default values)
    const settings = await getEmailSettings();

    return NextResponse.json({
      success: true,
      settings: settings
    });

  } catch (error) {
    console.error('❌ Error fetching email settings:', error);
    
    return NextResponse.json({
      error: "Failed to fetch email settings",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// POST - บันทึกการตั้งค่าอีเมล
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('💾 Saving email settings...', body);

    // บันทึกการตั้งค่าลงฐานข้อมูล
    await saveEmailSettings(body.settings);

    return NextResponse.json({
      success: true,
      message: "บันทึกการตั้งค่าสำเร็จ"
    });

  } catch (error) {
    console.error('❌ Error saving email settings:', error);
    
    return NextResponse.json({
      error: "Failed to save email settings",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// ฟังก์ชันดึงการตั้งค่าอีเมล
async function getEmailSettings() {
  try {
    // ลองดึงจากฐานข้อมูลก่อน
    const dbSettings = await prisma.eMAIL_SETTINGS.findFirst({
      orderBy: {
        CREATED_DATE: 'desc'
      }
    });

    if (dbSettings) {
      return {
        enabled: dbSettings.ENABLED || true,
        schedule: {
          hour: dbSettings.SCHEDULE_HOUR || 10,
          minute: dbSettings.SCHEDULE_MINUTE || 0,
          timezone: dbSettings.TIMEZONE || 'Asia/Bangkok',
          frequency: dbSettings.FREQUENCY || 'daily'
        },
        filters: {
          minDaysPending: dbSettings.MIN_DAYS_PENDING || 1,
          maxDaysPending: dbSettings.MAX_DAYS_PENDING || 30
        },
        template: {
          subject: dbSettings.EMAIL_SUBJECT || '🔔 แจ้งเตือนซ้ำ - มีคำขอเบิกรอการอนุมัติ',
          headerColor: dbSettings.HEADER_COLOR || '#dc2626',
          urgencyLevel: dbSettings.URGENCY_LEVEL || 'medium',
          includeProductDetails: dbSettings.INCLUDE_PRODUCT_DETAILS || true,
          includeRequesterInfo: dbSettings.INCLUDE_REQUESTER_INFO || true,
          customMessage: dbSettings.CUSTOM_MESSAGE || ''
        }
      };
    }

    // ถ้าไม่มีในฐานข้อมูล ให้ใช้ค่า default
    return getDefaultEmailSettings();

  } catch (error) {
    console.error('❌ Error getting email settings from database:', error);
    return getDefaultEmailSettings();
  }
}

// ฟังก์ชันบันทึกการตั้งค่าอีเมล
async function saveEmailSettings(settings: any) {
  try {
    // ตรวจสอบว่ามีข้อมูลอยู่แล้วหรือไม่
    const existingSettings = await prisma.eMAIL_SETTINGS.findFirst({
      orderBy: {
        CREATED_DATE: 'desc'
      }
    });

    const settingsData = {
      ENABLED: settings.enabled,
      SCHEDULE_HOUR: settings.schedule.hour,
      SCHEDULE_MINUTE: settings.schedule.minute,
      TIMEZONE: settings.schedule.timezone,
      FREQUENCY: settings.schedule.frequency,
      MIN_DAYS_PENDING: settings.filters.minDaysPending,
      MAX_DAYS_PENDING: settings.filters.maxDaysPending,
      EMAIL_SUBJECT: settings.template.subject,
      HEADER_COLOR: settings.template.headerColor,
      URGENCY_LEVEL: settings.template.urgencyLevel,
      INCLUDE_PRODUCT_DETAILS: settings.template.includeProductDetails,
      INCLUDE_REQUESTER_INFO: settings.template.includeRequesterInfo,
      CUSTOM_MESSAGE: settings.template.customMessage,
      UPDATED_DATE: new Date()
    };

    if (existingSettings) {
      // อัปเดตข้อมูลเดิม
      await prisma.eMAIL_SETTINGS.update({
        where: { ID: existingSettings.ID },
        data: settingsData
      });
      console.log('✅ Email settings updated successfully');
    } else {
      // สร้างข้อมูลใหม่ถ้ายังไม่มี
      await prisma.eMAIL_SETTINGS.create({
        data: {
          ...settingsData,
          CREATED_DATE: new Date()
        }
      });
      console.log('✅ Email settings created successfully');
    }

  } catch (error) {
    console.error('❌ Error saving email settings to database:', error);
    throw error;
  }
}

// ฟังก์ชันค่า default
function getDefaultEmailSettings() {
  return {
    enabled: true,
    schedule: {
      hour: 10,
      minute: 0,
      timezone: 'Asia/Bangkok',
      frequency: 'daily'
    },
    filters: {
      minDaysPending: 1,
      maxDaysPending: 30
    },
    template: {
      subject: '🔔 แจ้งเตือนซ้ำ - มีคำขอเบิกรอการอนุมัติ',
      headerColor: '#dc2626',
      urgencyLevel: 'medium',
      includeProductDetails: true,
      includeRequesterInfo: true,
      customMessage: ''
    }
  };
}

