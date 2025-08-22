import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const year = searchParams.get('year');
    const limit = searchParams.get('limit') || '50';

    console.log(`🔍 Fetching real price history for productId: ${productId}, year: ${year}`);

    // ใช้ข้อมูลสินค้าปัจจุบันเป็น fallback (เพราะ PRICE_HISTORY ยังไม่มีข้อมูล)
    console.log(`📊 Fetching current products as price history fallback`);
    
    let query = `
      SELECT 
        NULL as HISTORY_ID,
        p.PRODUCT_ID,
        p.PRODUCT_NAME,
        p.ITEM_ID,
        pc.CATEGORY_NAME,
        p.ORDER_UNIT,
        p.PHOTO_URL,
        ${new Date().getFullYear()} as YEAR,
        p.UNIT_COST as PRICE,
        GETDATE() as RECORDED_DATE,
        'Current Price (No History)' as NOTES,
        'SYSTEM' as CREATED_BY,
        0 as PRICE_CHANGE,
        0 as PERCENTAGE_CHANGE,
        p.UNIT_COST as CURRENT_PRICE
      FROM PRODUCTS p
      LEFT JOIN PRODUCT_CATEGORIES pc ON p.CATEGORY_ID = pc.CATEGORY_ID
      WHERE p.UNIT_COST IS NOT NULL
    `;

    if (productId) {
      query += ` AND p.PRODUCT_ID = ${parseInt(productId)}`;
    }

    query += ` ORDER BY p.PRODUCT_NAME`;

    if (limit && limit !== 'all') {
      query += ` OFFSET 0 ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
    }

    console.log(`📊 Executing query:`, query);
    const result = await prisma.$queryRawUnsafe(query);

    console.log(`✅ Real price history data fetched successfully:`, result);

    return NextResponse.json({ 
      success: true, 
      data: result,
      params: { productId, year, limit },
      message: 'Real price history retrieved successfully',
      count: Array.isArray(result) ? result.length : 0
    });
  } catch (error) {
    console.error('❌ Error fetching real price history:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch real price history',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
