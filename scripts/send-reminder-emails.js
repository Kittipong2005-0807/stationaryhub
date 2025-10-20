#!/usr/bin/env node

/**
 * Script สำหรับส่งอีเมลแจ้งเตือนซ้ำทุก 10 โมงเช้า
 * รันโดย cron job หรือ scheduled task
 */

import https from 'https';
import http from 'http';

// ตั้งค่า URL ของ API
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stationaryhub.ube.co.th';
const REMINDER_ENDPOINT = '/stationaryhub/api/notifications/reminder';
const SETTINGS_ENDPOINT = '/stationaryhub/api/email-settings';

async function sendReminderEmails() {
  try {
    console.log('🔔 ===== DAILY REMINDER EMAIL SCRIPT START =====');
    console.log('🔔 Running at:', new Date().toLocaleString());
    
    // ดึงการตั้งค่าจาก API
    const settings = await getEmailSettings();
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

// ฟังก์ชันดึงการตั้งค่าอีเมล
async function getEmailSettings() {
  try {
    const url = `${API_URL}${SETTINGS_ENDPOINT}`;
    console.log('⚙️ Fetching email settings from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'StationaryHub-Reminder-Script/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.settings) {
      console.log('✅ Email settings loaded successfully');
      return result.settings;
    } else {
      throw new Error('Invalid response format');
    }
    
  } catch (error) {
    console.error('❌ Error fetching email settings:', error);
    console.log('🔄 Using default settings...');
    
    // ใช้ค่า default ถ้าไม่สามารถดึงจาก API ได้
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
}

// รัน script
sendReminderEmails();
