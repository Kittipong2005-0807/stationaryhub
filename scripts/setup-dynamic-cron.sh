#!/bin/bash

# Script สำหรับตั้งค่า cron job แบบ dynamic ที่ดึงเวลาจากการตั้งค่า

echo "🔔 Setting up dynamic reminder email cron job..."

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

# สร้างโฟลเดอร์ logs ถ้ายังไม่มี
mkdir -p logs

# ตั้งค่าสิทธิ์ให้ script สามารถรันได้
chmod +x scripts/send-reminder-emails.js

# ลบ cron job เก่าถ้ามี
if crontab -l 2>/dev/null | grep -q "send-reminder-emails.js"; then
    echo "⚠️  Removing old cron job..."
    crontab -l 2>/dev/null | grep -v "send-reminder-emails.js" | crontab -
fi

# สร้าง cron job ใหม่ที่รันทุกนาทีเพื่อตรวจสอบเวลา
CRON_ENTRY="* * * * * cd $(pwd) && node scripts/send-reminder-emails.js >> logs/reminder-emails.log 2>&1"

# เพิ่ม cron job ใหม่
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo "✅ Dynamic cron job setup completed!"
echo "📅 Schedule: Every minute (script will check time internally)"
echo "📁 Log file: logs/reminder-emails.log"
echo ""
echo "🔍 To view current cron jobs:"
echo "   crontab -l"
echo ""
echo "🗑️  To remove this cron job:"
echo "   crontab -e"
echo "   (Then delete the line with send-reminder-emails.js)"
echo ""
echo "📋 To test the script manually:"
echo "   node scripts/send-reminder-emails.js"
echo ""
echo "⚙️  To change the schedule time:"
echo "   1. Go to Email Reminders page"
echo "   2. Update the schedule settings"
echo "   3. Save settings"
echo "   4. Script will automatically use new time"

