@echo off
REM Batch file สำหรับสร้าง Scheduled Task ด้วยสิทธิ์ Administrator

echo 🔔 Creating StationaryHub Dynamic Reminder Scheduled Task...
echo.

REM ตรวจสอบว่าเป็น Administrator หรือไม่
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ Running with Administrator privileges
) else (
    echo ❌ This script requires Administrator privileges!
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM ตรวจสอบว่า Node.js ติดตั้งแล้วหรือไม่
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH!
    echo Please install Node.js first.
    pause
    exit /b 1
) else (
    echo ✅ Node.js is installed
)

REM ตรวจสอบว่าไฟล์ script มีอยู่หรือไม่
if not exist "D:\Project\stationaryhub\scripts\send-reminder-emails.js" (
    echo ❌ Script file not found: D:\Project\stationaryhub\scripts\send-reminder-emails.js
    pause
    exit /b 1
) else (
    echo ✅ Script file found
)

echo.
echo 🗑️ Removing existing task if any...
schtasks /delete /tn "StationaryHub-DynamicReminder" /f >nul 2>&1

echo 📅 Creating new scheduled task...
schtasks /create /tn "StationaryHub-DynamicReminder" /tr "node \"D:\Project\stationaryhub\scripts\send-reminder-emails.js\"" /sc minute /mo 1 /ru "SYSTEM" /f

if errorlevel 1 (
    echo ❌ Failed to create scheduled task!
    echo Please check the command syntax and try again.
    pause
    exit /b 1
) else (
    echo ✅ Scheduled task created successfully!
)

echo.
echo 🔍 Verifying scheduled task...
schtasks /query /tn "StationaryHub-DynamicReminder" /fo table

echo.
echo 🎉 Scheduled Task Setup Complete!
echo.
echo 📋 Task Details:
echo    Name: StationaryHub-DynamicReminder
echo    Schedule: Every minute
echo    Script: D:\Project\stationaryhub\scripts\send-reminder-emails.js
echo    Run As: SYSTEM
echo.
echo 🔧 Management Commands:
echo    View task: schtasks /query /tn "StationaryHub-DynamicReminder"
echo    Run now: schtasks /run /tn "StationaryHub-DynamicReminder"
echo    Delete: schtasks /delete /tn "StationaryHub-DynamicReminder" /f
echo.
echo ⚙️ To change schedule time:
echo    1. Go to: http://localhost:3000/stationaryhub/admin/email-reminders
echo    2. Update schedule settings
echo    3. Save settings
echo    4. Script will automatically use new time
echo.

pause

