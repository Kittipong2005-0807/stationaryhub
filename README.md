# StationaryHub

ระบบจัดการสินค้าอุปกรณ์สำนักงานที่พัฒนาด้วย Next.js

## 🚀 การติดตั้งและใช้งาน

### Prerequisites
- Node.js 18+
- SQL Server
- Docker (optional)

### การติดตั้ง

1. Clone repository:
```bash
git clone <repository-url>
cd stationaryhub
```

2. ติดตั้ง dependencies:
```bash
npm install
```

3. สร้างไฟล์ .env จาก .env.example:
```bash
cp env.example .env
```

4. แก้ไขค่าในไฟล์ .env ให้ตรงกับเซิร์ฟเวอร์

5. Generate Prisma client:
```bash
npm run db:generate
```

6. Build application:
```bash
npm run build
```

7. รัน application:
```bash
npm start
```

## 🌐 Base Path Configuration

โปรเจกต์นี้ใช้ base path `/stationaryhub` ซึ่งหมายความว่า:

- **Development**: http://localhost:3000/stationaryhub
- **Production**: http://your-domain.com/stationaryhub

### การเข้าถึงหน้าเว็บ:
- หน้าแรก: `/stationaryhub`
- หน้า Login: `/stationaryhub/login`
- หน้า Admin: `/stationaryhub/admin`
- หน้า Products: `/stationaryhub/products`

## 🐳 การใช้งาน Docker

### Build และรันด้วย Docker Compose:
```bash
docker-compose up -d
```

### Build และรันด้วย Docker:
```bash
docker build -t stationaryhub .
docker run -p 3000:3000 --env-file .env stationaryhub
```

## 📋 Environment Variables

ไฟล์ `.env` ต้องมีค่าต่อไปนี้:

```env
DATABASE_URL=sqlserver://localhost:1433;database=StationeryDB;user=your_username;password=your_password;trustServerCertificate=true
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000/stationaryhub
NEXT_PUBLIC_BASE_PATH=/stationaryhub
```

## 🔧 การ Deploy

ใช้ script `deploy.sh` สำหรับการ deploy:

```bash
chmod +x deploy.sh
./deploy.sh
```

## 📁 โครงสร้างโปรเจกต์

```
stationaryhub/
├── app/                    # Next.js App Router
├── components/            # React Components
├── lib/                   # Utility functions
├── prisma/               # Database schema
├── public/               # Static files
└── types/                # TypeScript types
```

## 🚨 หมายเหตุสำคัญ

- ตรวจสอบให้แน่ใจว่า `NEXTAUTH_URL` และ `CORS_ORIGIN` มี base path `/stationaryhub` รวมอยู่ด้วย
- เมื่อ deploy ไปยัง production ให้อัปเดต URL ใน environment variables ให้ตรงกับ domain ที่ใช้งาน
- ตรวจสอบการตั้งค่า reverse proxy (Nginx) ให้รองรับ base path

## 📞 การสนับสนุน

หากมีปัญหาหรือคำถาม กรุณาติดต่อทีมพัฒนา
