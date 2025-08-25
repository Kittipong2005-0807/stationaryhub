# 🚀 StationaryHub Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] สร้างไฟล์ `.env` จาก `.env.example`
- [ ] ตั้งค่า `NEXTAUTH_URL` ให้มี base path `/stationaryhub`
- [ ] ตั้งค่า `NEXT_PUBLIC_BASE_PATH=/stationaryhub`
- [ ] ตั้งค่า `CORS_ORIGIN` ให้มี base path `/stationaryhub`
- [ ] ตรวจสอบ `DATABASE_URL` ให้ถูกต้อง

### 2. Base Path Configuration
- [ ] ตรวจสอบ `next.config.js` มี `basePath: '/stationaryhub'`
- [ ] ตรวจสอบ environment variables รองรับ base path
- [ ] ตรวจสอบ Docker configuration รองรับ base path
- [ ] ตรวจสอบ Nginx configuration รองรับ base path

### 3. Database Setup
- [ ] ตรวจสอบการเชื่อมต่อฐานข้อมูล
- [ ] รัน `npm run db:generate` เพื่อสร้าง Prisma client
- [ ] ตรวจสอบ database schema ถูกต้อง

### 4. Build & Test
- [ ] รัน `npm run build` สำเร็จ
- [ ] ตรวจสอบ TypeScript errors
- [ ] รัน `npm run lint` ไม่มี errors
- [ ] ทดสอบ application ใน local environment

## 🐳 Docker Deployment

### 1. Build Docker Image
```bash
docker build -t stationaryhub .
```

### 2. Run with Docker Compose
```bash
docker-compose up -d
```

### 3. Verify Deployment
- [ ] ตรวจสอบ application รันที่ `http://localhost:3000/stationaryhub`
- [ ] ตรวจสอบ database connection
- [ ] ตรวจสอบ authentication system

## 🌐 Production Deployment

### 1. Server Configuration
- [ ] ตั้งค่า domain และ SSL certificate
- [ ] ตั้งค่า reverse proxy (Nginx/Apache)
- [ ] ตั้งค่า firewall และ security

### 2. Environment Variables
```env
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com/stationaryhub
NEXT_PUBLIC_BASE_PATH=/stationaryhub
CORS_ORIGIN=https://your-domain.com/stationaryhub
```

### 3. Nginx Configuration
- [ ] ตั้งค่า proxy_pass ไปยัง application
- [ ] ตั้งค่า location block สำหรับ `/stationaryhub`
- [ ] ตั้งค่า SSL และ redirect rules

## 🔍 Post-Deployment Verification

### 1. Application Access
- [ ] หน้าแรก: `https://your-domain.com/stationaryhub`
- [ ] หน้า Login: `https://your-domain.com/stationaryhub/login`
- [ ] หน้า Admin: `https://your-domain.com/stationaryhub/admin`

### 2. Functionality Test
- [ ] Authentication system
- [ ] Database operations
- [ ] File uploads
- [ ] Email notifications
- [ ] Role-based access control

### 3. Performance & Security
- [ ] ตรวจสอบ response times
- [ ] ตรวจสอบ memory usage
- [ ] ตรวจสอบ security headers
- [ ] ตรวจสอบ SSL configuration

## 🚨 Troubleshooting

### Common Issues
1. **Base Path Not Working**
   - ตรวจสอบ `next.config.js`
   - ตรวจสอบ environment variables
   - ตรวจสอบ Nginx configuration

2. **Authentication Issues**
   - ตรวจสอบ `NEXTAUTH_URL`
   - ตรวจสอบ LDAP configuration
   - ตรวจสอบ database connection

3. **Static Assets Not Loading**
   - ตรวจสอบ `public` folder
   - ตรวจสอบ base path configuration
   - ตรวจสอบ Nginx static file serving

## 📞 Support

หากมีปัญหาหรือคำถาม กรุณาติดต่อทีมพัฒนา






