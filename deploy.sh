#!/bin/bash

# 🚀 StationaryHub Deployment Script
# ใช้สำหรับ deploy เว็บขึ้นเซิร์ฟเวอร์

set -e

echo "🚀 เริ่มต้นการ Deploy StationaryHub..."

# ตรวจสอบ Node.js version
echo "📋 ตรวจสอบ Node.js version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js ไม่ได้ติดตั้ง กรุณาติดตั้ง Node.js 18+ ก่อน"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version ต้องเป็น 18+ ปัจจุบันเป็น $NODE_VERSION"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# ตรวจสอบ npm
echo "📋 ตรวจสอบ npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm ไม่ได้ติดตั้ง"
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# ตรวจสอบไฟล์ .env
echo "📋 ตรวจสอบไฟล์ .env..."
if [ ! -f .env ]; then
    echo "⚠️  ไม่พบไฟล์ .env สร้างจาก .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ สร้างไฟล์ .env จาก .env.example"
        echo "⚠️  กรุณาแก้ไขค่าในไฟล์ .env ให้ตรงกับเซิร์ฟเวอร์"
        echo "⚠️  กด Enter เพื่อดำเนินการต่อ..."
        read
    else
        echo "❌ ไม่พบไฟล์ .env.example"
        exit 1
    fi
else
    echo "✅ พบไฟล์ .env"
fi

# Clean install
echo "🧹 ทำความสะอาดและติดตั้ง dependencies..."
rm -rf node_modules package-lock.json
npm install

# Generate Prisma client
echo "🗄️  Generate Prisma client..."
npm run db:generate

# Build application
echo "🔨 Build application..."
npm run build

# ตรวจสอบ build result
if [ ! -d ".next" ]; then
    echo "❌ Build ไม่สำเร็จ ไม่พบโฟลเดอร์ .next"
    exit 1
fi

echo "✅ Build สำเร็จ!"

# ตรวจสอบ Docker (ถ้ามี)
if command -v docker &> /dev/null; then
    echo "🐳 พบ Docker สร้าง Docker image..."
    
    # Build Docker image
    docker build -t stationaryhub .
    
    # ตรวจสอบ image
    if docker images | grep -q "stationaryhub"; then
        echo "✅ Docker image สร้างสำเร็จ!"
        
        # แสดงคำสั่งสำหรับรัน Docker
        echo ""
        echo "🐳 คำสั่งสำหรับรัน Docker:"
        echo "docker run -p 3000:3000 --env-file .env stationaryhub"
        echo ""
        echo "หรือใช้ docker-compose:"
        echo "docker-compose up -d"
    else
        echo "❌ Docker image สร้างไม่สำเร็จ"
    fi
else
    echo "⚠️  ไม่พบ Docker ใช้ npm start แทน"
fi

# แสดงคำสั่งสำหรับรัน application
echo ""
echo "🚀 คำสั่งสำหรับรัน application:"
echo "npm start"
echo ""
echo "📱 Application จะรันที่: http://localhost:3000"
echo ""
echo "✅ การ Deploy เสร็จสิ้น!"
echo ""
echo "📋 หมายเหตุ:"
echo "- ตรวจสอบไฟล์ .env ให้ถูกต้อง"
echo "- ตรวจสอบการเชื่อมต่อฐานข้อมูล"
echo "- ตรวจสอบ firewall และ port"
echo "- ใช้ PM2 หรือ systemd สำหรับ production"



