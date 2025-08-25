import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const year = searchParams.get('year');
    const limit = searchParams.get('limit') || '50';

    console.log(`🔍 Fetching detailed price history for productId: ${productId}, year: ${year}`);

    let query = `
      SELECT 
        ph.HISTORY_ID,
        ph.PRODUCT_ID,
        p.PRODUCT_NAME,
        p.ITEM_ID,
        pc.CATEGORY_NAME,
        ph.OLD_PRICE,
        ph.NEW_PRICE,
        ph.PRICE_CHANGE,
        ph.PERCENTAGE_CHANGE,
        ph.YEAR,
        ph.RECORDED_DATE,
        ph.NOTES,
        ph.CREATED_BY
      FROM PRICE_HISTORY ph
      INNER JOIN PRODUCTS p ON ph.PRODUCT_ID = p.PRODUCT_ID
      LEFT JOIN PRODUCT_CATEGORIES pc ON p.CATEGORY_ID = pc.CATEGORY_ID
      WHERE 1=1
    `;

    if (productId) {
      query += ` AND ph.PRODUCT_ID = ${parseInt(productId)}`;
    }

    if (year) {
      query += ` AND ph.YEAR = ${parseInt(year)}`;
    }

    query += ` ORDER BY ph.RECORDED_DATE DESC`;

    if (limit && limit !== 'all') {
      query += ` OFFSET 0 ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
    }

    console.log(`📊 Executing query:`, query);
    const result = await prisma.$queryRawUnsafe(query);

    console.log(`✅ Detailed price history fetched successfully:`, result);

    return NextResponse.json({ 
      success: true, 
      data: result,
      params: { productId, year, limit },
      message: 'Detailed price history retrieved successfully',
      count: Array.isArray(result) ? result.length : 0
    });
  } catch (error) {
    console.error('❌ Error fetching detailed price history:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch detailed price history',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
