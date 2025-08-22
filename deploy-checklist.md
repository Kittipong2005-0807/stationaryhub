# 🚀 Deployment Checklist สำหรับ StationaryHub

## 📋 **ก่อนการ Deploy**

### **1. ตรวจสอบ Dependencies**
- [ ] Node.js version 18+ ในเซิร์ฟเวอร์
- [ ] npm หรือ pnpm ในเซิร์ฟเวอร์
- [ ] SQL Server connection string ที่ถูกต้อง
- [ ] LDAP server ที่เข้าถึงได้

### **2. Environment Variables**
```bash
# Database
DATABASE_URL="sqlserver://server:port;database=StationaryNew;user=username;password=password;trustServerCertificate=true"

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-secret-key"

# LDAP
LDAP_URL="ldap://your-ldap-server:389"
LDAP_BIND_DN="cn=admin,dc=example,dc=com"
LDAP_BIND_PASSWORD="password"

# SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

## 🔧 **ขั้นตอนการ Deploy**

### **1. Upload Code**
```bash
# Clone หรือ upload โค้ดไปยังเซิร์ฟเวอร์
git clone https://github.com/your-repo/stationaryhub.git
cd stationaryhub
```

### **2. Install Dependencies**
```bash
npm install
# หรือ
pnpm install
```

### **3. Setup Environment**
```bash
# สร้างไฟล์ .env
cp .env.example .env
# แก้ไขค่าใน .env ให้ตรงกับเซิร์ฟเวอร์
```

### **4. Database Setup**
```bash
# Generate Prisma client
npm run db:generate

# Push schema (ถ้าจำเป็น)
npm run db:push
```

### **5. Build Application**
```bash
npm run build
```

### **6. Start Application**
```bash
npm start
```

## 🚨 **ปัญหาที่อาจเกิดขึ้นและวิธีแก้ไข**

### **1. Database Connection Error**
```bash
# ตรวจสอบ SQL Server
- Firewall rules
- Port 1433 (default)
- Network access
- Authentication mode
```

### **2. Prisma Error**
```bash
# ลบ node_modules และ install ใหม่
rm -rf node_modules package-lock.json
npm install
npm run db:generate
```

### **3. Build Error**
```bash
# ตรวจสอบ Node.js version
node --version
# ต้องเป็น 18+

# Clean build
npm run clean
npm run build
```

### **4. Port Already in Use**
```bash
# เปลี่ยน port ใน package.json
"start": "next start -p 3001"
```

## 📁 **ไฟล์ที่ต้องมีในเซิร์ฟเวอร์**

- [ ] `.env` (environment variables)
- [ ] `next.config.js`
- [ ] `package.json`
- [ ] `prisma/schema.prisma`
- [ ] `.next/` (build output)
- [ ] `public/` (static files)

## 🔒 **Security Checklist**

- [ ] HTTPS enabled
- [ ] Environment variables ไม่ commit ใน git
- [ ] Database credentials ปลอดภัย
- [ ] Firewall rules ถูกต้อง
- [ ] Rate limiting (ถ้าจำเป็น)

## 📊 **Performance Optimization**

- [ ] Enable gzip compression
- [ ] Static file caching
- [ ] Database connection pooling
- [ ] Image optimization
- [ ] CDN สำหรับ static files

## 🚀 **Production Commands**

```bash
# Start production server
npm start

# หรือใช้ PM2
pm2 start npm --name "stationaryhub" -- start

# หรือใช้ Docker
docker build -t stationaryhub .
docker run -p 3000:3000 stationaryhub
```

## 📞 **Support**

หากมีปัญหาการ deploy กรุณาติดต่อ:
- Database connection issues
- Build errors
- Runtime errors
- Performance issues




