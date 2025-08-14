import { PrismaClient } from "@prisma/client"

// Prevent hot-reload from creating duplicate PrismaClient in dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Create single Prisma client instance
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

// Use singleton pattern to ensure single Prisma client instance
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// Add function to close connection
export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect()
  }
}

