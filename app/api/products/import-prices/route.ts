import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const year = formData.get('year') as string;
    const notes = formData.get('notes') as string;

    console.log(`🔍 Importing prices from file: ${file.name} for year: ${year}`);

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!year) {
      return NextResponse.json(
        { success: false, error: 'Year is required' },
        { status: 400 }
      );
    }

    let fileContent: string;
    let rows: string[];

    try {
      fileContent = await file.text();
      
      if (file.name.endsWith('.csv')) {
        rows = fileContent.split('\n').filter(row => row.trim() !== '');
      } else {
        return NextResponse.json(
          { success: false, error: 'Only CSV files are supported' },
          { status: 400 }
        );
      }
    } catch (fileError) {
      return NextResponse.json(
        { success: false, error: 'Failed to read file' },
        { status: 400 }
      );
    }

    // ข้าม header row
    const dataRows = rows.slice(1);
    const results = [];
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      try {
        const row = dataRows[i];
        const columns = row.split(',').map(col => col.trim().replace(/"/g, ''));
        
        if (columns.length < 2) {
          errors.push({ row: i + 2, error: 'Invalid row format' });
          continue;
        }

        const [productId, newPrice] = columns;
        
        if (!productId || !newPrice) {
          errors.push({ row: i + 2, error: 'Missing productId or price' });
          continue;
        }

        const parsedProductId = parseInt(productId);
        const parsedPrice = parseFloat(newPrice);

        if (isNaN(parsedProductId) || isNaN(parsedPrice)) {
          errors.push({ row: i + 2, error: 'Invalid productId or price format' });
          continue;
        }

        // ตรวจสอบว่าสินค้ามีอยู่จริง
        const existingProduct = await prisma.pRODUCTS.findUnique({
          where: { PRODUCT_ID: parsedProductId }
        });

        if (!existingProduct) {
          errors.push({ row: i + 2, error: `Product ID ${parsedProductId} not found` });
          continue;
        }

        const oldPrice = existingProduct.UNIT_COST ? parseFloat(existingProduct.UNIT_COST.toString()) : 0;

        // อัปเดตราคาใน PRODUCTS
        await prisma.pRODUCTS.update({
          where: { PRODUCT_ID: parsedProductId },
          data: { UNIT_COST: parsedPrice }
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
            ${parsedProductId}, 
            ${parseInt(year)}, 
            ${parsedPrice}, 
            GETDATE(), 
            ${notes || `Imported from ${file.name}`}, 
            ${'ADMIN'},
            ${parsedPrice - oldPrice},
            ${oldPrice > 0 ? ((parsedPrice - oldPrice) / oldPrice) * 100 : 0}
          )
        `;

        results.push({
          productId: parsedProductId,
          productName: existingProduct.PRODUCT_NAME,
          oldPrice: oldPrice,
          newPrice: parsedPrice,
          success: true
        });

        console.log(`✅ Imported price for Product ID ${parsedProductId}: ${oldPrice} → ${parsedPrice}`);
      } catch (error) {
        console.error(`❌ Error processing row ${i + 2}:`, error);
        errors.push({ 
          row: i + 2, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    const successCount = results.length;
    const errorCount = errors.length;

    console.log(`📊 Import completed: ${successCount} successful, ${errorCount} errors`);

    return NextResponse.json({ 
      success: true, 
      summary: {
        total: dataRows.length,
        successful: successCount,
        errors: errorCount
      },
      results: results,
      errors: errors,
      message: `Price import completed: ${successCount} successful, ${errorCount} errors`
    });
  } catch (error) {
    console.error('❌ Error in price import:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to import prices',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
