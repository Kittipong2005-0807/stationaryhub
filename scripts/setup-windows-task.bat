@echo off
REM Script สำหรับตั้งค่า Windows Scheduled Task สำหรับส่งอีเมลแจ้งเตือนซ้ำทุก 10 โมงเช้า

echo 🔔 Setting up daily reminder email Windows Scheduled Task...

REM ตรวจสอบว่า Node.js ติดตั้งแล้วหรือไม่
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM ตรวจสอบว่า npm ติดตั้งแล้วหรือไม่
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

REM ตรวจสอบว่า schtasks command มีอยู่หรือไม่
schtasks /? >nul 2>&1
if errorlevel 1 (
    echo ❌ schtasks command is not available. Please run as Administrator.
    pause
    exit /b 1
)

REM สร้างโฟลเดอร์ logs ถ้ายังไม่มี
if not exist "logs" mkdir logs

REM ตั้งค่าสิทธิ์ให้ script สามารถรันได้
echo ✅ Setting up scheduled task...

REM ลบ task เก่าถ้ามี
schtasks /delete /tn "StationaryHub-DailyReminder" /f >nul 2>&1

REM สร้าง task ใหม่
schtasks /create /tn "StationaryHub-DailyReminder" /tr "node \"%~dp0send-reminder-emails.js\"" /sc daily /st 10:00 /ru "SYSTEM" /f

if errorlevel 1 (
    echo ❌ Failed to create scheduled task. Please run as Administrator.
    pause
    exit /b 1
)

echo ✅ Windows Scheduled Task setup completed!
echo 📅 Schedule: Every day at 10:00 AM
echo 📁 Log file: logs/reminder-emails.log
echo.
echo 🔍 To view the scheduled task:
echo    schtasks /query /tn "StationaryHub-DailyReminder"
echo.
echo 🗑️  To remove this scheduled task:
echo    schtasks /delete /tn "StationaryHub-DailyReminder"
echo.
echo 📋 To test the script manually:
echo    node scripts/send-reminder-emails.js
echo.
echo ⚠️  Note: This script must be run as Administrator to create scheduled tasks.
pause

