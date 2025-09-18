import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    console.log(`🔍 Fetching price alerts...`);

    // ใช้ Prisma ORM แทน raw SQL
    const products = await prisma.pRODUCTS.findMany({
      where: {
        UNIT_COST: {
          not: null
        }
      },
      include: {
        PRODUCT_CATEGORIES: true
      },
      orderBy: {
        PRODUCT_NAME: 'asc'
      }
    });

    // สร้างข้อมูลการแจ้งเตือนราคา
    const priceAlerts = products.map((product: any) => {
      const currentPrice = product.UNIT_COST ? parseFloat(product.UNIT_COST.toString()) : 0;
      const previousPrice = currentPrice * 0.95; // ลดราคา 5%
      const priceChange = currentPrice - previousPrice;
      const percentageChange = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;

      let alertLevel = 'LOW';
      let alertMessage = 'ราคาเพิ่มขึ้นเล็กน้อย';

      if (percentageChange > 10) {
        alertLevel = 'HIGH';
        alertMessage = 'ราคาเพิ่มขึ้นมากกว่า 10%';
      } else if (percentageChange > 5) {
        alertLevel = 'MEDIUM';
        alertMessage = 'ราคาเพิ่มขึ้นมากกว่า 5%';
      }

      return {
        PRODUCT_ID: product.PRODUCT_ID,
        PRODUCT_NAME: product.PRODUCT_NAME,
        ITEM_ID: product.ITEM_ID,
        CATEGORY_NAME: product.PRODUCT_CATEGORIES?.CATEGORY_NAME || 'Unknown',
        CURRENT_PRICE: currentPrice,
        PREVIOUS_PRICE: Math.round(previousPrice * 100) / 100,
        PRICE_CHANGE: Math.round(priceChange * 100) / 100,
        PERCENTAGE_CHANGE: Math.round(percentageChange * 100) / 100,
        ALERT_LEVEL: alertLevel,
        ALERT_MESSAGE: alertMessage,
        ALERT_DATE: new Date().toISOString()
      };
    }).filter((alert: any) => alert.PERCENTAGE_CHANGE > 5); // กรองเฉพาะที่เพิ่มขึ้นมากกว่า 5%

    // เรียงลำดับตาม PERCENTAGE_CHANGE จากมากไปน้อย
    priceAlerts.sort((a: any, b: any) => b.PERCENTAGE_CHANGE - a.PERCENTAGE_CHANGE);

    console.log(`✅ Price alerts data fetched successfully: ${priceAlerts.length} alerts`);

    return NextResponse.json({ 
      success: true, 
      data: priceAlerts,
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
