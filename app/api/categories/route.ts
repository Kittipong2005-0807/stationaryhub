import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    console.log(`🔍 Fetching product categories...`);

    // ดึงหมวดหมู่สินค้าจริงจากฐานข้อมูล
    const categories = await prisma.pRODUCT_CATEGORIES.findMany({
      orderBy: {
        CATEGORY_NAME: 'asc'
      },
      include: {
        _count: {
          select: {
            PRODUCTS: true
          }
        }
      }
    });

    console.log(`✅ Categories fetched successfully:`, categories);

    return NextResponse.json({ 
      success: true, 
      data: categories,
      message: 'Product categories retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch categories',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}