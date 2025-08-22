import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, newPrice, year, notes } = body;

    console.log(`🔍 Updating product price:`, { productId, newPrice, year, notes });

    if (!productId || !newPrice) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: productId, newPrice' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าสินค้ามีอยู่จริง
    const existingProduct = await prisma.pRODUCTS.findUnique({
      where: { PRODUCT_ID: parseInt(productId) },
      include: { PRODUCT_CATEGORIES: true }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: `Product with ID ${productId} not found` },
        { status: 404 }
      );
    }

    const oldPrice = existingProduct.UNIT_COST ? parseFloat(existingProduct.UNIT_COST.toString()) : 0;
    const currentYear = year || new Date().getFullYear();

    // 1. อัปเดตราคาปัจจุบันในตาราง PRODUCTS
    const updatedProduct = await prisma.pRODUCTS.update({
      where: {
        PRODUCT_ID: parseInt(productId)
      },
      data: {
        UNIT_COST: parseFloat(newPrice)
      },
      include: {
        PRODUCT_CATEGORIES: true
      }
    });

    console.log(`✅ Product price updated: ${oldPrice} → ${newPrice}`);

    // 2. บันทึกประวัติราคาในตาราง PRICE_HISTORY
    try {
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
          ${parseInt(currentYear)}, 
          ${parseFloat(newPrice)}, 
          GETDATE(), 
          ${notes || 'Price updated via API'}, 
          ${'ADMIN'},
                      ${parseFloat(newPrice) - oldPrice},
            ${oldPrice > 0 ? ((parseFloat(newPrice) - oldPrice) / oldPrice) * 100 : 0}
        )
      `;

      console.log(`✅ Price history recorded for year ${currentYear}`);
    } catch (historyError) {
      console.warn(`⚠️ Could not record price history:`, historyError);
      // ไม่หยุดการทำงานถ้าบันทึกประวัติไม่สำเร็จ
    }

    // 3. สร้างข้อมูลสำหรับ response
    const historyLog = {
      productId: parseInt(productId),
      productName: updatedProduct.PRODUCT_NAME,
      oldPrice: oldPrice,
      newPrice: parseFloat(newPrice),
      year: currentYear,
      priceChange: parseFloat(newPrice) - (oldPrice || 0),
      percentageChange: oldPrice ? ((parseFloat(newPrice) - oldPrice) / oldPrice) * 100 : 0,
      updatedAt: new Date().toISOString(),
      notes: notes || 'Price updated via API'
    };

    return NextResponse.json({ 
      success: true, 
      data: updatedProduct,
      history: historyLog,
      message: `Price updated for "${updatedProduct.PRODUCT_NAME}" from ฿${oldPrice || 0} to ฿${newPrice} (${historyLog.percentageChange >= 0 ? '+' : ''}${historyLog.percentageChange.toFixed(1)}%)`
    });
  } catch (error) {
    console.error('❌ Error updating product price:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update product price',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
