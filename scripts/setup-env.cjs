// =====================================================
// สคริปต์ช่วยตั้งค่า .env.local file
// =====================================================

const fs = require('fs');
const path = require('path');

function setupEnv() {
  try {
    console.log('🔧 ตั้งค่า .env.local file...\n');

    // ตรวจสอบว่ามี .env.local อยู่แล้วหรือไม่
    const envPath = path.join(__dirname, '..', '.env.local');
    
    if (fs.existsSync(envPath)) {
      console.log('✅ ไฟล์ .env.local มีอยู่แล้ว');
      console.log('📁 Path:', envPath);
      
      // อ่านและแสดงข้อมูล
      const envContent = fs.readFileSync(envPath, 'utf8');
      console.log('\n📋 ข้อมูลใน .env.local file:');
      console.log(envContent);
      
      return;
    }

    // สร้าง .env.local file ใหม่
    const envContent = `# Database Configuration
DATABASE_URL="sqlserver://localhost:1433;database=StationeryDB;user=sa;password=your_password;trustServerCertificate=true"

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3001/stationaryhub

# Base Path Configuration
NEXT_PUBLIC_BASE_PATH=/stationaryhub

# LDAP Configuration
LDAP_URI=ldap://your-ldap-server:389
LDAP_BIND_DN=your-bind-dn
LDAP_BIND_PASSWORD=your-bind-password
LDAP_BASE_DN=DC=ube,DC=co,DC=th

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Performance Configuration
NEXT_TLEMETRY_DISABLED=1
NODE_ENV=development

# Security Configuration
CORS_ORIGIN=http://localhost:3001/stationaryhub
`;

    fs.writeFileSync(envPath, envContent);
    console.log('✅ สร้างไฟล์ .env.local สำเร็จ');
    console.log('📁 Path:', envPath);
    console.log('\n📋 ข้อมูลที่สร้าง:');
    console.log(envContent);
    
    console.log('\n⚠️  กรุณาแก้ไข DATABASE_URL ใน .env.local file ให้ตรงกับฐานข้อมูลของคุณ');
    console.log('   ตัวอย่าง: DATABASE_URL="sqlserver://localhost:1433;database=StationeryDB;user=sa;password=123456;trustServerCertificate=true"');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

setupEnv();
