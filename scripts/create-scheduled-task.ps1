# PowerShell Script สำหรับสร้าง Scheduled Task
# ต้องรันด้วยสิทธิ์ Administrator

Write-Host "🔔 Creating StationaryHub Dynamic Reminder Scheduled Task..." -ForegroundColor Green

# ตรวจสอบว่าเป็น Administrator หรือไม่
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    pause
    exit 1
}

# ตรวจสอบว่า Node.js ติดตั้งแล้วหรือไม่
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Node.js first." -ForegroundColor Yellow
    pause
    exit 1
}

# ตรวจสอบว่าไฟล์ script มีอยู่หรือไม่
$scriptPath = "D:\Project\stationaryhub\scripts\send-reminder-emails.js"
if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Script file not found: $scriptPath" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "✅ Script file found: $scriptPath" -ForegroundColor Green

# ลบ task เก่าถ้ามี
Write-Host "🗑️ Removing existing task if any..." -ForegroundColor Yellow
schtasks /delete /tn "StationaryHub-DynamicReminder" /f 2>$null

# สร้าง task ใหม่
Write-Host "📅 Creating new scheduled task..." -ForegroundColor Yellow

$taskName = "StationaryHub-DynamicReminder"
$taskRun = "node `"$scriptPath`""
$schedule = "minute"
$modifier = "1"
$runAs = "SYSTEM"

$command = "schtasks /create /tn `"$taskName`" /tr `"$taskRun`" /sc $schedule /mo $modifier /ru `"$runAs`" /f"

Write-Host "Running command: $command" -ForegroundColor Cyan

try {
    Invoke-Expression $command
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Scheduled task created successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create scheduled task. Exit code: $LASTEXITCODE" -ForegroundColor Red
        pause
        exit 1
    }
} catch {
    Write-Host "❌ Error creating scheduled task: $($_.Exception.Message)" -ForegroundColor Red
    pause
    exit 1
}

# ตรวจสอบ task ที่สร้างแล้ว
Write-Host "🔍 Verifying scheduled task..." -ForegroundColor Yellow
schtasks /query /tn "StationaryHub-DynamicReminder" /fo table

Write-Host ""
Write-Host "🎉 Scheduled Task Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Task Details:" -ForegroundColor Cyan
Write-Host "   Name: StationaryHub-DynamicReminder" -ForegroundColor White
Write-Host "   Schedule: Every minute" -ForegroundColor White
Write-Host "   Script: $scriptPath" -ForegroundColor White
Write-Host "   Run As: SYSTEM" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Management Commands:" -ForegroundColor Cyan
Write-Host "   View task: schtasks /query /tn `"StationaryHub-DynamicReminder`"" -ForegroundColor White
Write-Host "   Run now: schtasks /run /tn `"StationaryHub-DynamicReminder`"" -ForegroundColor White
Write-Host "   Delete: schtasks /delete /tn `"StationaryHub-DynamicReminder`" /f" -ForegroundColor White
Write-Host ""
Write-Host "⚙️ To change schedule time:" -ForegroundColor Cyan
Write-Host "   1. Go to: http://localhost:3000/stationaryhub/admin/email-reminders" -ForegroundColor White
Write-Host "   2. Update schedule settings" -ForegroundColor White
Write-Host "   3. Save settings" -ForegroundColor White
Write-Host "   4. Script will automatically use new time" -ForegroundColor White
Write-Host ""

pause

