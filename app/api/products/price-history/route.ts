import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check user session
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check ADMIN role
    const user = session.user as any
    if (user?.ROLE !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const year = searchParams.get('year')
    const limit = searchParams.get('limit') || '100'

    // Build query conditions
    let whereConditions: any = {}
    
    if (productId) {
      whereConditions.PRODUCT_ID = parseInt(productId)
    }
    
    if (year) {
      whereConditions.YEAR = parseInt(year)
    }

    // Fetch price history with product information
    const priceHistory = await prisma.pRICE_HISTORY.findMany({
      where: whereConditions,
      include: {
        PRODUCTS: {
          include: {
            PRODUCT_CATEGORIES: true
          }
        }
      },
      orderBy: {
        RECORDED_DATE: 'desc'
      },
      take: parseInt(limit)
    })

    return NextResponse.json(priceHistory)
  } catch (error) {
    console.error('Error fetching price history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check user session
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check ADMIN role
    const user = session.user as any
    if (user?.ROLE !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { productId, oldPrice, newPrice, notes } = body

    if (!productId || newPrice === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, newPrice' },
        { status: 400 }
      )
    }

    const currentYear = new Date().getFullYear()
    const priceChange = newPrice - (oldPrice || 0)
    const percentageChange = oldPrice && oldPrice > 0 ? (priceChange / oldPrice) * 100 : 0

    // Create price history record
    const priceHistory = await prisma.pRICE_HISTORY.create({
      data: {
        PRODUCT_ID: parseInt(productId),
        OLD_PRICE: oldPrice || 0,
        NEW_PRICE: parseFloat(newPrice),
        PRICE_CHANGE: priceChange,
        PERCENTAGE_CHANGE: percentageChange,
        YEAR: currentYear,
        RECORDED_DATE: new Date(),
        NOTES: notes || `Price updated by admin from ฿${oldPrice || 0} to ฿${newPrice}`,
        CREATED_BY: user?.USERNAME || 'ADMIN',
      },
      include: {
        PRODUCTS: {
          include: {
            PRODUCT_CATEGORIES: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: priceHistory,
      message: `Price history recorded: ฿${oldPrice || 0} → ฿${newPrice}`
    })
  } catch (error) {
    console.error('Error creating price history:', error)
    return NextResponse.json(
      { error: 'Failed to create price history' },
      { status: 500 }
    )
  }
}
