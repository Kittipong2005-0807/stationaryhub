import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const category = searchParams.get('category');

    console.log(`🔍 Fetching price comparison for year: ${year}, category: ${category}`);

    // ใช้ข้อมูลจริงจากตาราง PRODUCTS
    let query = `
      SELECT 
        p.PRODUCT_ID,
        p.PRODUCT_NAME,
        p.ITEM_ID,
        p.UNIT_COST as CURRENT_PRICE,
        pc.CATEGORY_NAME,
        p.ORDER_UNIT,
        p.PHOTO_URL,
                            -- สร้างข้อมูลราคาเปรียบเทียบจำลอง (ลดราคา 5-15% จากราคาปัจจุบัน)
                    CAST(p.UNIT_COST * (0.85 + (CAST(p.PRODUCT_ID AS BIGINT) % 10) / 100.0) AS DECIMAL(10,2)) as PREVIOUS_PRICE,
                    CAST(p.UNIT_COST - (p.UNIT_COST * (0.85 + (CAST(p.PRODUCT_ID AS BIGINT) % 10) / 100.0)) AS DECIMAL(10,2)) as PRICE_CHANGE,
                    CAST(((p.UNIT_COST - (p.UNIT_COST * (0.85 + (CAST(p.PRODUCT_ID AS BIGINT) % 10) / 100.0))) / (p.UNIT_COST * (0.85 + (CAST(p.PRODUCT_ID AS BIGINT) % 10) / 100.0))) * 100 AS DECIMAL(5,2)) as PERCENTAGE_CHANGE
      FROM PRODUCTS p
      LEFT JOIN PRODUCT_CATEGORIES pc ON p.CATEGORY_ID = pc.CATEGORY_ID
      WHERE p.UNIT_COST IS NOT NULL
    `;

    // เพิ่มเงื่อนไขหมวดหมู่ถ้ามี
    if (category && category !== 'all') {
      query += ` AND pc.CATEGORY_NAME = '${category}'`;
    }

    query += ` ORDER BY p.PRODUCT_NAME`;

    console.log(`📊 Executing query:`, query);

    const result = await prisma.$queryRawUnsafe(query);

    console.log(`✅ Price comparison data fetched successfully:`, result);

    return NextResponse.json({ 
      success: true, 
      data: result,
      params: { year: year || 2025, category: category || 'all' },
      message: 'Using real product data with simulated price comparison'
    });
  } catch (error) {
    console.error('❌ Error fetching price comparison:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch price comparison data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
