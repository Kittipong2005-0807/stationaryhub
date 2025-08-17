// =====================================================
// เพิ่มฟิลด์ IS_READ ในตาราง EMAIL_LOGS
// =====================================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addIsReadField() {
  try {
    console.log('🔧 เพิ่มฟิลด์ IS_READ ในตาราง EMAIL_LOGS...\n');

    // 1. ตรวจสอบโครงสร้างตารางปัจจุบัน
    console.log('📊 ตรวจสอบโครงสร้างตารางปัจจุบัน...');
    const allEmailLogs = await prisma.eMAIL_LOGS.findMany({
      select: {
        EMAIL_ID: true,
        TO_USER_ID: true,
        SUBJECT: true,
        STATUS: true,
        SENT_AT: true
      },
      take: 5
    });

    console.log(`📋 ตัวอย่างข้อมูล: ${allEmailLogs.length} รายการ`);
    allEmailLogs.forEach((email, index) => {
      console.log(`   ${index + 1}. ID: ${email.EMAIL_ID} - ${email.SUBJECT} (${email.STATUS})`);
    });

    // 2. แนะนำการแก้ไข
    console.log('\n💡 แนะนำการแก้ไข...');
    console.log('📝 ปัญหา: Check Constraint จำกัดค่า STATUS เป็น SENT เท่านั้น');
    console.log('🔧 วิธีแก้ไข: เพิ่มฟิลด์ IS_READ (boolean) แทนการเปลี่ยน STATUS');
    
    console.log('\n📋 ขั้นตอนการแก้ไข:');
    console.log('   1. เพิ่มฟิลด์ IS_READ (BIT) ในตาราง EMAIL_LOGS');
    console.log('   2. ตั้งค่าเริ่มต้น IS_READ = 0 (false)');
    console.log('   3. อัปเดต API ให้ใช้ IS_READ แทน STATUS');
    console.log('   4. อัปเดต Frontend ให้ใช้ isRead แทน status');

    // 3. สร้าง SQL Script สำหรับแก้ไข
    console.log('\n📝 SQL Script สำหรับแก้ไข:');
    console.log(`
-- เพิ่มฟิลด์ IS_READ ในตาราง EMAIL_LOGS
ALTER TABLE EMAIL_LOGS 
ADD IS_READ BIT DEFAULT 0;

-- อัปเดตข้อมูลที่มีอยู่ให้ IS_READ = 0
UPDATE EMAIL_LOGS 
SET IS_READ = 0 
WHERE IS_READ IS NULL;

-- สร้าง Index สำหรับการค้นหา
CREATE INDEX IX_EMAIL_LOGS_IS_READ ON EMAIL_LOGS(IS_READ);
    `);

    // 4. แนะนำการอัปเดต API
    console.log('\n🔧 แนะนำการอัปเดต API:');
    console.log(`
// แก้ไข app/api/notifications/[id]/read/route.ts
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notificationId = parseInt(params.id)

    // อัปเดต IS_READ เป็น 1 (true) แทนการเปลี่ยน STATUS
    await prisma.eMAIL_LOGS.update({
      where: { EMAIL_ID: notificationId },
      data: { IS_READ: true }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
    `);

    // 5. แนะนำการอัปเดต Frontend
    console.log('\n🎨 แนะนำการอัปเดต Frontend:');
    console.log(`
// แก้ไข components/Layout.tsx
const unreadCount = notifications.filter((n) => !n.isRead).length;

// แก้ไขการแสดงผล
className={\`rounded-lg my-1 px-3 py-2 hover:bg-blue-50 cursor-pointer \${
  notification.isRead ? "opacity-60" : ""
}\`}
    `);

    // 6. แนะนำการอัปเดต Interface
    console.log('\n📋 แนะนำการอัปเดต Interface:');
    console.log(`
// แก้ไข interface Notification
interface Notification {
  id: number
  userId: string
  subject: string
  body: string
  isRead: boolean  // เปลี่ยนจาก status เป็น isRead
  sentAt: Date
}
    `);

    console.log('\n✅ การแนะนำการแก้ไขเสร็จสิ้น!');
    console.log('📝 ขั้นตอนต่อไป:');
    console.log('   1. รัน SQL Script ในฐานข้อมูล');
    console.log('   2. อัปเดต API และ Frontend');
    console.log('   3. ทดสอบระบบการแจ้งเตือน');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// รันการแนะนำการแก้ไข
addIsReadField();
