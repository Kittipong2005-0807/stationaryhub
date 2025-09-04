import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, newPrice, year, notes } = body;

    console.log(`🔍 Testing price history update:`, { productId, newPrice, year, notes });

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

    console.log(`📊 Product found: ${existingProduct.PRODUCT_NAME}, Old price: ${oldPrice}`);

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
      const insertResult = await prisma.$executeRaw`
        INSERT INTO PRICE_HISTORY (
          PRODUCT_ID, 
          OLD_PRICE,
          NEW_PRICE, 
          PRICE_CHANGE,
          PERCENTAGE_CHANGE,
          YEAR, 
          RECORDED_DATE, 
          NOTES, 
          CREATED_BY
        ) VALUES (
          ${parseInt(productId)}, 
          ${oldPrice},           -- ราคาเก่า
          ${parseFloat(newPrice)}, -- ราคาใหม่
          ${parseFloat(newPrice) - oldPrice}, -- การเปลี่ยนแปลงราคา
          ${oldPrice > 0 ? ((parseFloat(newPrice) - oldPrice) / oldPrice) * 100 : 0}, -- เปอร์เซ็นต์
          ${parseInt(currentYear)}, 
          GETDATE(), 
          ${notes || 'Test price update'}, 
          ${'TEST_USER'}
        )
      `;

      console.log(`✅ Price history recorded for year ${currentYear}, Result:`, insertResult);
    } catch (historyError) {
      console.error(`❌ Could not record price history:`, historyError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to record price history',
          details: historyError instanceof Error ? historyError.message : String(historyError)
        },
        { status: 500 }
      );
    }

    // 3. ตรวจสอบข้อมูลที่บันทึก
    const historyData = await prisma.$queryRaw`
      SELECT TOP 1 * FROM PRICE_HISTORY 
      WHERE PRODUCT_ID = ${parseInt(productId)} 
      ORDER BY RECORDED_DATE DESC
    `;

    console.log(`📋 Latest price history record:`, historyData);

    // 4. สร้างข้อมูลสำหรับ response
    const historyLog = {
      productId: parseInt(productId),
      productName: updatedProduct.PRODUCT_NAME,
      oldPrice: oldPrice,
      newPrice: parseFloat(newPrice),
      year: currentYear,
      priceChange: parseFloat(newPrice) - (oldPrice || 0),
      percentageChange: oldPrice ? ((parseFloat(newPrice) - oldPrice) / oldPrice) * 100 : 0,
      updatedAt: new Date().toISOString(),
      notes: notes || 'Test price update'
    };

    return NextResponse.json({ 
      success: true, 
      data: updatedProduct,
      history: historyLog,
      historyRecord: historyData,
      message: `Price updated for "${updatedProduct.PRODUCT_NAME}" from ฿${oldPrice || 0} to ฿${newPrice} (${historyLog.percentageChange >= 0 ? '+' : ''}${historyLog.percentageChange.toFixed(1)}%)`
    });
  } catch (error) {
    console.error('❌ Error in test price history:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test price history',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    console.log(`🔍 Testing price history retrieval for productId: ${productId}`);

    let query = `
      SELECT TOP 10
        ph.HISTORY_ID,
        ph.PRODUCT_ID,
        p.PRODUCT_NAME,
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
    `;

    if (productId) {
      query += ` WHERE ph.PRODUCT_ID = ${parseInt(productId)}`;
    }

    query += ` ORDER BY ph.RECORDED_DATE DESC`;

    console.log(`📊 Executing query:`, query);
    const result = await prisma.$queryRawUnsafe(query);

    console.log(`✅ Test price history fetched successfully:`, result);

    return NextResponse.json({ 
      success: true, 
      data: result,
      count: Array.isArray(result) ? result.length : 0,
      message: 'Test price history retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching test price history:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch test price history',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
