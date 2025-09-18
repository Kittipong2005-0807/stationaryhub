import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const category = searchParams.get('category');

    console.log(`🔍 Fetching price comparison for year: ${year}, category: ${category}`);

    // ใช้ Prisma ORM แทน raw SQL
    const whereCondition: any = {
      UNIT_COST: {
        not: null,
        gt: 0 // เพิ่มเงื่อนไขให้ราคามากกว่า 0
      }
    };

    // เพิ่มเงื่อนไขหมวดหมู่ถ้ามี
    if (category && category !== 'all') {
      whereCondition.PRODUCT_CATEGORIES = {
        CATEGORY_NAME: category
      };
    }

    const products = await prisma.pRODUCTS.findMany({
      where: whereCondition,
      include: {
        PRODUCT_CATEGORIES: true
      },
      orderBy: {
        PRODUCT_NAME: 'asc'
      }
    });

    console.log(`📊 Found ${products.length} products with valid prices`);

    // สร้างข้อมูลราคาเปรียบเทียบจำลอง
    const priceComparisonData = products.map((product: any) => {
      // Debug: แสดงข้อมูลราคา
      console.log(`🔍 Product ${product.PRODUCT_NAME}: UNIT_COST = ${product.UNIT_COST}, Type = ${typeof product.UNIT_COST}`);
      
      // แปลง UNIT_COST เป็น number อย่างปลอดภัย
      let currentPrice = 0;
      if (product.UNIT_COST !== null && product.UNIT_COST !== undefined) {
        if (typeof product.UNIT_COST === 'number') {
          currentPrice = product.UNIT_COST;
        } else if (typeof product.UNIT_COST === 'string') {
          currentPrice = parseFloat(product.UNIT_COST);
        } else {
          // ถ้าเป็น Decimal object
          currentPrice = parseFloat(product.UNIT_COST.toString());
        }
      }

      // ตรวจสอบว่า currentPrice เป็น number ที่ถูกต้อง
      if (isNaN(currentPrice) || currentPrice <= 0) {
        console.warn(`⚠️ Invalid price for product ${product.PRODUCT_NAME}: ${currentPrice}`);
        currentPrice = 0;
      }

      const discountPercentage = (product.PRODUCT_ID % 10 + 5) / 100; // 5-15% discount
      const previousPrice = currentPrice * (1 - discountPercentage);
      const priceChange = currentPrice - previousPrice;
      const percentageChange = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;

      return {
        PRODUCT_ID: product.PRODUCT_ID,
        PRODUCT_NAME: product.PRODUCT_NAME,
        ITEM_ID: product.ITEM_ID,
        CURRENT_PRICE: Math.round(currentPrice * 100) / 100, // ปัดเศษ 2 ตำแหน่ง
        PREVIOUS_PRICE: Math.round(previousPrice * 100) / 100,
        PRICE_CHANGE: Math.round(priceChange * 100) / 100,
        PERCENTAGE_CHANGE: Math.round(percentageChange * 100) / 100,
        CATEGORY_NAME: product.PRODUCT_CATEGORIES?.CATEGORY_NAME || 'Unknown',
        ORDER_UNIT: product.ORDER_UNIT,
        PHOTO_URL: product.PHOTO_URL
      };
    }).filter((item: any) => item.CURRENT_PRICE > 0); // กรองเฉพาะสินค้าที่มีราคามากกว่า 0

    console.log(`✅ Price comparison data fetched successfully: ${priceComparisonData.length} products with valid prices`);

    // Debug: แสดงตัวอย่างข้อมูล
    if (priceComparisonData.length > 0) {
      console.log(`📋 Sample data:`, priceComparisonData[0]);
    }

    return NextResponse.json({ 
      success: true, 
      data: priceComparisonData,
      params: { year: year || 2025, category: category || 'all' },
      message: 'Using real product data with simulated price comparison',
      debug: {
        totalProducts: products.length,
        validPriceProducts: priceComparisonData.length,
        samplePrice: priceComparisonData.length > 0 ? priceComparisonData[0].CURRENT_PRICE : null
      }
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
