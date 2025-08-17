import { PrismaClient } from "@prisma/client"

// Prevent hot-reload from creating duplicate PrismaClient in dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Create single Prisma client instance
const prismaClientSingleton = () => {
  try {
    const databaseUrl = process.env.DATABASE_URL || "sqlserver://tcl_ryg2;database=StationaryNew;user=kittipong;password=password@1;trustServerCertificate=true"
    
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not defined")
    }

    const client = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    })

    // Test connection
    client.$connect()
      .then(() => {
        console.log("✅ Prisma client connected successfully")
      })
      .catch((error) => {
        console.error("❌ Prisma client connection failed:", error)
      })

    return client
  } catch (error) {
    console.error("❌ Failed to create Prisma client:", error)
    throw error
  }
}

// Use singleton pattern to ensure single Prisma client instance
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// Add function to close connection
export async function disconnectPrisma() {
  try {
    if (prisma) {
      await prisma.$disconnect()
      console.log("✅ Prisma client disconnected successfully")
    }
  } catch (error) {
    console.error("❌ Failed to disconnect Prisma client:", error)
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectPrisma()
})

process.on('SIGINT', async () => {
  await disconnectPrisma()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await disconnectPrisma()
  process.exit(0)
})

