import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 Fetching price alerts...`);

    // ใช้ข้อมูลจริงจากตาราง PRODUCTS และสร้างการแจ้งเตือนจำลอง
    const result = await prisma.$queryRawUnsafe(`
      SELECT 
        p.PRODUCT_ID,
        p.PRODUCT_NAME,
        p.ITEM_ID,
        pc.CATEGORY_NAME,
        p.UNIT_COST as CURRENT_PRICE,
        CAST(p.UNIT_COST * 0.95 AS DECIMAL(10,2)) as PREVIOUS_PRICE,
        CAST(p.UNIT_COST - (p.UNIT_COST * 0.95) AS DECIMAL(10,2)) as PRICE_CHANGE,
        CAST(((p.UNIT_COST - (p.UNIT_COST * 0.95)) / (p.UNIT_COST * 0.95)) * 100 AS DECIMAL(5,2)) as PERCENTAGE_CHANGE,
        CASE 
          WHEN ((p.UNIT_COST - (p.UNIT_COST * 0.95)) / (p.UNIT_COST * 0.95)) * 100 > 10 THEN 'HIGH'
          WHEN ((p.UNIT_COST - (p.UNIT_COST * 0.95)) / (p.UNIT_COST * 0.95)) * 100 > 5 THEN 'MEDIUM'
          ELSE 'LOW'
        END as ALERT_LEVEL,
        CASE 
          WHEN ((p.UNIT_COST - (p.UNIT_COST * 0.95)) / (p.UNIT_COST * 0.95)) * 100 > 10 THEN 'ราคาเพิ่มขึ้นมากกว่า 10%'
          WHEN ((p.UNIT_COST - (p.UNIT_COST * 0.95)) / (p.UNIT_COST * 0.95)) * 100 > 5 THEN 'ราคาเพิ่มขึ้นมากกว่า 5%'
          ELSE 'ราคาเพิ่มขึ้นเล็กน้อย'
        END as ALERT_MESSAGE,
        GETDATE() as ALERT_DATE
      FROM PRODUCTS p
      LEFT JOIN PRODUCT_CATEGORIES pc ON p.CATEGORY_ID = pc.CATEGORY_ID
      WHERE p.UNIT_COST IS NOT NULL
        AND ((p.UNIT_COST - (p.UNIT_COST * 0.95)) / (p.UNIT_COST * 0.95)) * 100 > 5
      ORDER BY PERCENTAGE_CHANGE DESC
    `);

    console.log(`✅ Price alerts data fetched successfully:`, result);

    return NextResponse.json({ 
      success: true, 
      data: result,
      timestamp: new Date().toISOString(),
      message: 'Using real product data with simulated price alerts'
    });
  } catch (error) {
    console.error('❌ Error fetching price alerts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch price alerts',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
