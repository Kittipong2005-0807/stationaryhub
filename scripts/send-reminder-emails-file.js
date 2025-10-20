#!/usr/bin/env node

/**
 * Script สำหรับส่งอีเมลแจ้งเตือนซ้ำทุก 10 โมงเช้า
 * อ่านการตั้งค่าจากไฟล์ config โดยตรง (ไม่ต้องผ่าน API)
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

// ตั้งค่า URL ของ API
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stationaryhub.ube.co.th';
const REMINDER_ENDPOINT = '/stationaryhub/api/notifications/reminder';

// ตั้งค่า path ของไฟล์ config
const CONFIG_FILE_PATH = path.join(process.cwd(), 'config', 'email-settings.json');

async function sendReminderEmails() {
  try {
    console.log('🔔 ===== DAILY REMINDER EMAIL SCRIPT START =====');
    console.log('🔔 Running at:', new Date().toLocaleString());
    
    // ดึงการตั้งค่าจากไฟล์
    const settings = await getEmailSettingsFromFile();
    console.log('⚙️ Email settings loaded:', {
      enabled: settings.enabled,
      schedule: `${settings.schedule.hour}:${settings.schedule.minute.toString().padStart(2, '0')}`,
      timezone: settings.schedule.timezone,
      frequency: settings.schedule.frequency
    });
    
    // ตรวจสอบว่าระบบเปิดใช้งานหรือไม่
    if (!settings.enabled) {
      console.log('⏸️ Email reminder system is disabled');
      return;
    }
    
    // ตรวจสอบเวลาปัจจุบันกับเวลาที่ตั้งค่า
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if (currentHour !== settings.schedule.hour || currentMinute !== settings.schedule.minute) {
      console.log(`⏰ Current time (${currentHour}:${currentMinute.toString().padStart(2, '0')}) doesn't match scheduled time (${settings.schedule.hour}:${settings.schedule.minute.toString().padStart(2, '0')})`);
      console.log('⏸️ Skipping reminder email execution');
      return;
    }
    
    const url = `${API_URL}${REMINDER_ENDPOINT}`;
    console.log('📡 Calling API:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'StationaryHub-Reminder-Script/1.0'
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        source: 'cron-job'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Reminder email script completed successfully');
    console.log('📊 Results:', {
      pendingCount: result.pendingCount,
      remindersSent: result.remindersSent,
      message: result.message
    });
    
    if (result.results && result.results.length > 0) {
      console.log('📋 Detailed results:');
      result.results.forEach((item, index) => {
        console.log(`  ${index + 1}. Req #${item.requisitionId} - ${item.requesterName} (${item.daysPending} days) - ${item.status}`);
      });
    }
    
    console.log('🔔 ===== DAILY REMINDER EMAIL SCRIPT END =====');
    
    // Exit with success code
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error in reminder email script:', error);
    console.error('❌ Stack trace:', error.stack);
    
    // Exit with error code
    process.exit(1);
  }
}

// ฟังก์ชันดึงการตั้งค่าจากไฟล์
async function getEmailSettingsFromFile() {
  try {
    console.log('📁 Reading email settings from file:', CONFIG_FILE_PATH);
    
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
    console.log('🔄 Using default settings...');
    
    // ใช้ค่า default ถ้าไม่สามารถอ่านไฟล์ได้
    return getDefaultEmailSettings();
  }
}

// ฟังก์ชันสร้างไฟล์ config เริ่มต้น
async function createDefaultConfigFile() {
  try {
    const defaultSettings = getDefaultEmailSettings();
    
    // สร้างโฟลเดอร์ config ถ้ายังไม่มี
    const configDir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // เพิ่ม timestamp
    const settingsWithTimestamp = {
      ...defaultSettings,
      lastUpdated: new Date().toISOString()
    };

    // บันทึกลงไฟล์
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(settingsWithTimestamp, null, 2), 'utf8');
    
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

// รัน script
sendReminderEmails();

