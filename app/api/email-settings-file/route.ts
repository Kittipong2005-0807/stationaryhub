import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

// ตั้งค่า path ของไฟล์ config
const CONFIG_FILE_PATH = path.join(process.cwd(), 'config', 'email-settings.json');

// GET - ดึงการตั้งค่าอีเมลจากไฟล์
export async function GET(request: NextRequest) {
  try {
    console.log('📧 Fetching email settings from file...');

    // อ่านไฟล์ config
    const settings = await readEmailSettingsFromFile();

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

// POST - บันทึกการตั้งค่าอีเมลลงไฟล์
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('💾 Saving email settings to file...', body);

    // บันทึกการตั้งค่าลงไฟล์
    await saveEmailSettingsToFile(body.settings);

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

// ฟังก์ชันอ่านการตั้งค่าจากไฟล์
async function readEmailSettingsFromFile() {
  try {
    // ตรวจสอบว่าไฟล์มีอยู่หรือไม่
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      console.log('📁 Config file not found, creating default...');
      await createDefaultConfigFile();
    }

    // อ่านไฟล์
    const fileContent = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
    const settings = JSON.parse(fileContent);

    console.log('✅ Email settings loaded from file successfully');
    return settings;

  } catch (error) {
    console.error('❌ Error reading email settings from file:', error);
    
    // ถ้าอ่านไฟล์ไม่ได้ ให้ใช้ค่า default
    return getDefaultEmailSettings();
  }
}

// ฟังก์ชันบันทึกการตั้งค่าลงไฟล์
async function saveEmailSettingsToFile(settings: any) {
  try {
    // สร้างโฟลเดอร์ config ถ้ายังไม่มี
    const configDir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // เพิ่ม timestamp
    const settingsWithTimestamp = {
      ...settings,
      lastUpdated: new Date().toISOString()
    };

    // บันทึกลงไฟล์
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(settingsWithTimestamp, null, 2), 'utf8');

    console.log('✅ Email settings saved to file successfully');

  } catch (error) {
    console.error('❌ Error saving email settings to file:', error);
    throw error;
  }
}

// ฟังก์ชันสร้างไฟล์ config เริ่มต้น
async function createDefaultConfigFile() {
  try {
    const defaultSettings = getDefaultEmailSettings();
    await saveEmailSettingsToFile(defaultSettings);
    console.log('✅ Default config file created');
  } catch (error) {
    console.error('❌ Error creating default config file:', error);
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
    recipients: {
      managers: ['manager@company.com'],
      admins: ['admin@company.com'],
      customEmails: []
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

