#!/bin/bash

# Script สำหรับตั้งค่า cron job สำหรับส่งอีเมลแจ้งเตือนซ้ำทุก 10 โมงเช้า

echo "🔔 Setting up daily reminder email cron job..."

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

# สร้าง cron job entry
CRON_ENTRY="0 10 * * * cd $(pwd) && node scripts/send-reminder-emails.js >> logs/reminder-emails.log 2>&1"

# ตรวจสอบว่า cron job มีอยู่แล้วหรือไม่
if crontab -l 2>/dev/null | grep -q "send-reminder-emails.js"; then
    echo "⚠️  Cron job already exists. Updating..."
    # ลบ cron job เก่า
    crontab -l 2>/dev/null | grep -v "send-reminder-emails.js" | crontab -
fi

# เพิ่ม cron job ใหม่
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

# สร้างโฟลเดอร์ logs ถ้ายังไม่มี
mkdir -p logs

# ตั้งค่าสิทธิ์ให้ script สามารถรันได้
chmod +x scripts/send-reminder-emails.js

echo "✅ Cron job setup completed!"
echo "📅 Schedule: Every day at 10:00 AM"
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

