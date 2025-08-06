import { PrismaClient } from "@prisma/client"

// ป้องกัน hot-reload สร้าง PrismaClient ซ้ำใน dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// สร้าง Prisma client instance เดียว
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ["query", "error", "warn"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

// ใช้ singleton pattern เพื่อให้มี Prisma client instance เดียว
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// เพิ่มฟังก์ชันสำหรับปิดการเชื่อมต่อ
export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect()
  }
}

// เพิ่ม error handling สำหรับ database connection
prisma.$on('error', (e) => {
  console.error('Prisma error:', e)
})

prisma.$on('query', (e) => {
  console.log('Prisma query:', e.query)
  console.log('Prisma params:', e.params)
  console.log('Prisma duration:', e.duration + 'ms')
})

