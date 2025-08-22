import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prices, year, notes } = body; // prices = array of {productId, newPrice}

    console.log(`🔍 Bulk updating prices for ${prices.length} products in year ${year}`);

    if (!prices || !Array.isArray(prices) || prices.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid prices array' },
        { status: 400 }
      );
    }

    if (!year) {
      return NextResponse.json(
        { success: false, error: 'Year is required for bulk update' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const price of prices) {
      try {
        const { productId, newPrice } = price;

        if (!productId || !newPrice) {
          errors.push({ productId, error: 'Missing productId or newPrice' });
          continue;
        }

        // ตรวจสอบว่าสินค้ามีอยู่จริง
        const existingProduct = await prisma.pRODUCTS.findUnique({
          where: { PRODUCT_ID: parseInt(productId) }
        });

        if (!existingProduct) {
          errors.push({ productId, error: 'Product not found' });
          continue;
        }

        const oldPrice = existingProduct.UNIT_COST ? parseFloat(existingProduct.UNIT_COST.toString()) : 0;

        // อัปเดตราคาใน PRODUCTS
        await prisma.pRODUCTS.update({
          where: { PRODUCT_ID: parseInt(productId) },
          data: { UNIT_COST: parseFloat(newPrice) }
        });

        // บันทึกประวัติราคา
        await prisma.$executeRaw`
          INSERT INTO PRICE_HISTORY (
            PRODUCT_ID, 
            YEAR, 
            PRICE, 
            RECORDED_DATE, 
            NOTES, 
            CREATED_BY,
            PRICE_CHANGE,
            PERCENTAGE_CHANGE
          ) VALUES (
            ${parseInt(productId)}, 
            ${parseInt(year)}, 
            ${parseFloat(newPrice)}, 
            GETDATE(), 
            ${notes || 'Bulk price update'}, 
            ${'ADMIN'},
            ${parseFloat(newPrice) - oldPrice},
            ${oldPrice > 0 ? ((parseFloat(newPrice) - oldPrice) / oldPrice) * 100 : 0}
          )
        `;

        results.push({
          productId: parseInt(productId),
          productName: existingProduct.PRODUCT_NAME,
          oldPrice: oldPrice,
          newPrice: parseFloat(newPrice),
          success: true
        });

        console.log(`✅ Updated price for Product ID ${productId}: ${oldPrice} → ${newPrice}`);
      } catch (error) {
        console.error(`❌ Error updating Product ID ${price.productId}:`, error);
        errors.push({ 
          productId: price.productId, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    const successCount = results.length;
    const errorCount = errors.length;

    console.log(`📊 Bulk update completed: ${successCount} successful, ${errorCount} errors`);

    return NextResponse.json({ 
      success: true, 
      summary: {
        total: prices.length,
        successful: successCount,
        errors: errorCount
      },
      results: results,
      errors: errors,
      message: `Bulk price update completed: ${successCount} successful, ${errorCount} errors`
    });
  } catch (error) {
    console.error('❌ Error in bulk price update:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to perform bulk price update',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
