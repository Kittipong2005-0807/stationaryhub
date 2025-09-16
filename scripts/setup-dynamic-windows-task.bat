@echo off
REM Script สำหรับตั้งค่า Windows Scheduled Task แบบ dynamic ที่ดึงเวลาจากการตั้งค่า

echo 🔔 Setting up dynamic reminder email Windows Scheduled Task...

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
echo ✅ Setting up dynamic scheduled task...

REM ลบ task เก่าถ้ามี
schtasks /delete /tn "StationaryHub-DynamicReminder" /f >nul 2>&1

REM สร้าง task ใหม่ที่รันทุกนาที (script จะตรวจสอบเวลาเอง)
schtasks /create /tn "StationaryHub-DynamicReminder" /tr "node \"%~dp0send-reminder-emails.js\"" /sc minute /mo 1 /ru "SYSTEM" /f

if errorlevel 1 (
    echo ❌ Failed to create scheduled task. Please run as Administrator.
    pause
    exit /b 1
)

echo ✅ Dynamic Windows Scheduled Task setup completed!
echo 📅 Schedule: Every minute (script will check time internally)
echo 📁 Log file: logs/reminder-emails.log
echo.
echo 🔍 To view the scheduled task:
echo    schtasks /query /tn "StationaryHub-DynamicReminder"
echo.
echo 🗑️  To remove this scheduled task:
echo    schtasks /delete /tn "StationaryHub-DynamicReminder"
echo.
echo 📋 To test the script manually:
echo    node scripts/send-reminder-emails.js
echo.
echo ⚙️  To change the schedule time:
echo    1. Go to Email Reminders page
echo    2. Update the schedule settings
echo    3. Save settings
echo    4. Script will automatically use new time
echo.
echo ⚠️  Note: This script must be run as Administrator to create scheduled tasks.
pause

