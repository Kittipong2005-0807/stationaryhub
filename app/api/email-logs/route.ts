import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ตรวจสอบว่าเป็น Admin หรือไม่
    if ((session.user as any).ROLE !== 'ADMIN') {
      return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 });
    }

    // ดึงข้อมูล Email Logs
    const emailLogs = await prisma.eMAIL_LOGS.findMany({
      orderBy: {
        SENT_AT: 'desc'
      },
      take: 1000, // จำกัดจำนวนข้อมูลที่ดึง
      select: {
        EMAIL_ID: true,
        TO_USER_ID: true,
        SUBJECT: true,
        BODY: true,
        STATUS: true,
        SENT_AT: true,
        IS_READ: true
      }
    });

    console.log(`✅ Retrieved ${emailLogs.length} email logs for admin`);

    return NextResponse.json(emailLogs);

  } catch (error: any) {
    console.error("❌ Error fetching email logs:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch email logs",
        message: error.message || "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ตรวจสอบว่าเป็น Admin หรือไม่
    if ((session.user as any).ROLE !== 'ADMIN') {
      return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 });
    }

    const { action, emailId } = await request.json();

    if (action === 'markAsRead' && emailId) {
      // อัปเดตสถานะการอ่าน
      await prisma.$executeRaw`
        UPDATE EMAIL_LOGS 
        SET IS_READ = 1,
            UPDATED_AT = GETDATE()
        WHERE EMAIL_ID = ${parseInt(emailId)}
      `;

      console.log(`✅ Marked email log ${emailId} as read`);

      return NextResponse.json({ 
        success: true, 
        message: "Email log marked as read",
        emailId: parseInt(emailId)
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("❌ Error updating email log:", error);
    return NextResponse.json(
      { 
        error: "Failed to update email log",
        message: error.message || "Unknown error"
      }, 
      { status: 500 }
    );
  }
}
