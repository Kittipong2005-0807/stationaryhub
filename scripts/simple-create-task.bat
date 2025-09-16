@echo off
echo Creating Scheduled Task...

schtasks /create /tn "StationaryHub-DynamicReminder" /tr "node D:\Project\stationaryhub\scripts\send-reminder-emails.js" /sc minute /mo 1 /ru "SYSTEM" /f

if errorlevel 1 (
    echo Failed to create task. Please run as Administrator.
) else (
    echo Task created successfully!
)

pause

