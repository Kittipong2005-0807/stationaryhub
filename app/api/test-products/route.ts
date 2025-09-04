import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 Testing products retrieval from database`);

    // Fetch products from database without session check
    const products = await prisma.$queryRaw`
      SELECT TOP 10
        p.PRODUCT_ID,
        p.ITEM_ID,
        p.PRODUCT_NAME,
        p.CATEGORY_ID,
        p.UNIT_COST,
        p.ORDER_UNIT,
        p.PHOTO_URL,
        p.CREATED_AT,
        pc.CATEGORY_NAME
      FROM PRODUCTS p
      LEFT JOIN PRODUCT_CATEGORIES pc ON p.CATEGORY_ID = pc.CATEGORY_ID
      ORDER BY p.CREATED_AT DESC
    `;

    console.log(`✅ Products fetched from database:`, products);

    return NextResponse.json({ 
      success: true, 
      data: products,
      count: Array.isArray(products) ? products.length : 0,
      message: 'Products retrieved from database successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching products from database:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch products from database',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
