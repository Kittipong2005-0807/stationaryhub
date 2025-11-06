import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Product } from '@/types';

export async function GET(_request: NextRequest) {
  try {
    console.log(`🔍 Debugging products data...`);

    // ดึงข้อมูลสินค้าทั้งหมด
    const allProducts = await prisma.pRODUCTS.findMany({
      include: {
        PRODUCT_CATEGORIES: true
      },
      orderBy: {
        PRODUCT_NAME: 'asc'
      }
    });

    // แยกสินค้าตามสถานะราคา
    const productsWithPrice = allProducts.filter((p: Product) => p.UNIT_COST && parseFloat(p.UNIT_COST.toString()) > 0);
    const productsWithoutPrice = allProducts.filter((p: Product) => !p.UNIT_COST || parseFloat(p.UNIT_COST.toString()) <= 0);

    // ตัวอย่างข้อมูลราคา
    const samplePrices = productsWithPrice.slice(0, 5).map((p: Product) => ({
      PRODUCT_ID: p.PRODUCT_ID,
      PRODUCT_NAME: p.PRODUCT_NAME,
      UNIT_COST: p.UNIT_COST,
      UNIT_COST_TYPE: typeof p.UNIT_COST,
      UNIT_COST_STRING: p.UNIT_COST?.toString(),
      PARSED_PRICE: p.UNIT_COST ? parseFloat(p.UNIT_COST.toString()) : null
    }));

    console.log(`📊 Products analysis:`, {
      total: allProducts.length,
      withPrice: productsWithPrice.length,
      withoutPrice: productsWithoutPrice.length
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        totalProducts: allProducts.length,
        productsWithPrice: productsWithPrice.length,
        productsWithoutPrice: productsWithoutPrice.length,
        samplePrices: samplePrices,
        productsWithPriceList: productsWithPrice.map((p: Product) => ({
          PRODUCT_ID: p.PRODUCT_ID,
          PRODUCT_NAME: p.PRODUCT_NAME,
          UNIT_COST: p.UNIT_COST,
          CATEGORY: p.PRODUCT_CATEGORIES?.CATEGORY_NAME
        })),
        productsWithoutPriceList: productsWithoutPrice.map((p: Product) => ({
          PRODUCT_ID: p.PRODUCT_ID,
          PRODUCT_NAME: p.PRODUCT_NAME,
          UNIT_COST: p.UNIT_COST,
          CATEGORY: p.PRODUCT_CATEGORIES?.CATEGORY_NAME
        }))
      },
      message: 'Products data analysis completed'
    });
  } catch (error) {
    console.error('❌ Error debugging products:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to debug products',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}


