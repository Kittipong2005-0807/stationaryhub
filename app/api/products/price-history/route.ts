import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const year = searchParams.get('year');

    console.log(`🔍 Fetching price history for productId: ${productId}, year: ${year}`);

    // ใช้ข้อมูลจริงจากตาราง PRODUCTS และสร้างประวัติราคาจำลอง
    let query = `
      SELECT 
        p.PRODUCT_ID,
        p.PRODUCT_NAME,
        p.ITEM_ID,
        pc.CATEGORY_NAME,
        p.ORDER_UNIT,
        p.PHOTO_URL,
        p.UNIT_COST as CURRENT_PRICE,
                            -- สร้างประวัติราคาจำลองสำหรับปีที่แตกต่างกัน
                    2025 as YEAR,
                    p.UNIT_COST as PRICE,
                    COALESCE(p.CREATED_AT, GETDATE()) as RECORDED_DATE,
                    'Current Price' as NOTES
                  FROM PRODUCTS p
                  LEFT JOIN PRODUCT_CATEGORIES pc ON p.CATEGORY_ID = pc.CATEGORY_ID
                  WHERE p.UNIT_COST IS NOT NULL
                `;

                if (productId) {
                  query += ` AND p.PRODUCT_ID = ${parseInt(productId)}`;
                }

                query += `
                  UNION ALL
                  SELECT 
                    p.PRODUCT_ID,
                    p.PRODUCT_NAME,
                    p.ITEM_ID,
                    pc.CATEGORY_NAME,
                    p.ORDER_UNIT,
                    p.PHOTO_URL,
                    p.UNIT_COST as CURRENT_PRICE,
                    2024 as YEAR,
                    CAST(p.UNIT_COST * 0.95 AS DECIMAL(10,2)) as PRICE,
                    DATEADD(year, -1, COALESCE(p.CREATED_AT, GETDATE())) as RECORDED_DATE,
                    'Previous Year Price' as NOTES
                  FROM PRODUCTS p
                  LEFT JOIN PRODUCT_CATEGORIES pc ON p.CATEGORY_ID = pc.CATEGORY_ID
                  WHERE p.UNIT_COST IS NOT NULL
                `;

                if (productId) {
                  query += ` AND p.PRODUCT_ID = ${parseInt(productId)}`;
                }

                query += `
                  UNION ALL
                  SELECT 
                    p.PRODUCT_ID,
                    p.PRODUCT_NAME,
                    p.ITEM_ID,
                    pc.CATEGORY_NAME,
                    p.ORDER_UNIT,
                    p.PHOTO_URL,
                    p.UNIT_COST as CURRENT_PRICE,
                    2023 as YEAR,
                    CAST(p.UNIT_COST * 0.90 AS DECIMAL(10,2)) as PRICE,
                    DATEADD(year, -2, COALESCE(p.CREATED_AT, GETDATE())) as RECORDED_DATE,
                    '2023 Price' as NOTES
                  FROM PRODUCTS p
                  LEFT JOIN PRODUCT_CATEGORIES pc ON p.CATEGORY_ID = pc.CATEGORY_ID
                  WHERE p.UNIT_COST IS NOT NULL
                `;

    if (productId) {
      query += ` AND p.PRODUCT_ID = ${parseInt(productId)}`;
    }

    // เพิ่มเงื่อนไขปีถ้ามี
    if (year) {
      query = `
        SELECT * FROM (${query}) as combined_data
        WHERE YEAR = ${parseInt(year)}
      `;
    }

    query += ` ORDER BY PRODUCT_NAME, YEAR DESC`;

    console.log(`📊 Executing query:`, query);

    const result = await prisma.$queryRawUnsafe(query);

    console.log(`✅ Price history data fetched successfully:`, result);

    return NextResponse.json({ 
      success: true, 
      data: result,
      params: { productId, year },
      message: 'Using real product data with simulated price history'
    });
  } catch (error) {
    console.error('❌ Error fetching price history:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch price history',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
