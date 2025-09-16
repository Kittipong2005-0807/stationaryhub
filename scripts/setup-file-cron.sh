#!/bin/bash

# Script สำหรับตั้งค่า cron job แบบใช้ไฟล์ config

echo "🔔 Setting up file-based reminder email cron job..."

# ตรวจสอบว่า Node.js ติดตั้งแล้วหรือไม่
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# ตรวจสอบว่า npm ติดตั้งแล้วหรือไม่
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# ตรวจสอบว่า cron ติดตั้งแล้วหรือไม่
if ! command -v crontab &> /dev/null; then
    echo "❌ crontab is not available. Please install cron first."
    exit 1
fi

# สร้างโฟลเดอร์ config และ logs ถ้ายังไม่มี
mkdir -p config
mkdir -p logs

# ตั้งค่าสิทธิ์ให้ script สามารถรันได้
chmod +x scripts/send-reminder-emails-file.js

# ลบ cron job เก่าถ้ามี
if crontab -l 2>/dev/null | grep -q "send-reminder-emails-file.js"; then
    echo "⚠️  Removing old cron job..."
    crontab -l 2>/dev/null | grep -v "send-reminder-emails-file.js" | crontab -
fi

# สร้าง cron job ใหม่ที่รันทุกนาทีเพื่อตรวจสอบเวลา
CRON_ENTRY="* * * * * cd $(pwd) && node scripts/send-reminder-emails-file.js >> logs/reminder-emails.log 2>&1"

# เพิ่ม cron job ใหม่
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo "✅ File-based cron job setup completed!"
echo "📅 Schedule: Every minute (script will check time from config file)"
echo "📁 Config file: config/email-settings.json"
echo "📁 Log file: logs/reminder-emails.log"
echo ""
echo "🔍 To view current cron jobs:"
echo "   crontab -l"
echo ""
echo "🗑️  To remove this cron job:"
echo "   crontab -e"
echo "   (Then delete the line with send-reminder-emails-file.js)"
echo ""
echo "📋 To test the script manually:"
echo "   node scripts/send-reminder-emails-file.js"
echo ""
echo "⚙️  To change the schedule time:"
echo "   1. Edit config/email-settings.json"
echo "   2. Change 'hour' and 'minute' values"
echo "   3. Save the file"
echo "   4. Script will automatically use new time"
echo ""
echo "📝 Example config file:"
echo "   {"
echo "     \"enabled\": true,"
echo "     \"schedule\": {"
echo "       \"hour\": 14,"
echo "       \"minute\": 30,"
echo "       \"timezone\": \"Asia/Bangkok\","
echo "       \"frequency\": \"daily\""
echo "     }"
echo "   }"

