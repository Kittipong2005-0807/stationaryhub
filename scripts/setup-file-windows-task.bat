@echo off
REM Script สำหรับตั้งค่า Windows Scheduled Task แบบใช้ไฟล์ config

echo 🔔 Setting up file-based reminder email Windows Scheduled Task...

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

REM สร้างโฟลเดอร์ config และ logs ถ้ายังไม่มี
if not exist "config" mkdir config
if not exist "logs" mkdir logs

REM ตั้งค่าสิทธิ์ให้ script สามารถรันได้
echo ✅ Setting up file-based scheduled task...

REM ลบ task เก่าถ้ามี
schtasks /delete /tn "StationaryHub-FileReminder" /f >nul 2>&1

REM สร้าง task ใหม่ที่รันทุกนาที (script จะตรวจสอบเวลาเอง)
schtasks /create /tn "StationaryHub-FileReminder" /tr "node \"%~dp0send-reminder-emails-file.js\"" /sc minute /mo 1 /ru "SYSTEM" /f

if errorlevel 1 (
    echo ❌ Failed to create scheduled task. Please run as Administrator.
    pause
    exit /b 1
)

echo ✅ File-based Windows Scheduled Task setup completed!
echo 📅 Schedule: Every minute (script will check time from config file)
echo 📁 Config file: config/email-settings.json
echo 📁 Log file: logs/reminder-emails.log
echo.
echo 🔍 To view the scheduled task:
echo    schtasks /query /tn "StationaryHub-FileReminder"
echo.
echo 🗑️  To remove this scheduled task:
echo    schtasks /delete /tn "StationaryHub-FileReminder"
echo.
echo 📋 To test the script manually:
echo    node scripts/send-reminder-emails-file.js
echo.
echo ⚙️  To change the schedule time:
echo    1. Edit config/email-settings.json
echo    2. Change 'hour' and 'minute' values
echo    3. Save the file
echo    4. Script will automatically use new time
echo.
echo 📝 Example config file:
echo    {
echo      "enabled": true,
echo      "schedule": {
echo        "hour": 14,
echo        "minute": 30,
echo        "timezone": "Asia/Bangkok",
echo        "frequency": "daily"
echo      }
echo    }
echo.
echo ⚠️  Note: This script must be run as Administrator to create scheduled tasks.
pause

