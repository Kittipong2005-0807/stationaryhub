// Debug Manager Email System แบบละเอียด

console.log('🔍 Detailed Manager Email Debug');
console.log('================================');

// ฟังก์ชัน Mock สำหรับทดสอบ
class MockNotificationService {
  static async notifyRequisitionCreated(requisitionId, userId) {
    console.log(`🔔 [MOCK] notifyRequisitionCreated called with requisitionId: ${requisitionId}, userId: ${userId}`);
    
    try {
      // 1. ส่งอีเมลให้ User
      console.log(`📧 [MOCK] Step 1: Sending email to user ${userId}`);
      const userEmail = 'test.user@ube.co.th';
      console.log(`✅ [MOCK] User email sent to: ${userEmail}`);
      
      // 2. ส่งอีเมลให้ Manager
      console.log(`📧 [MOCK] Step 2: Calling sendDirectManagerEmail`);
      await this.sendDirectManagerEmail(requisitionId, userId);
      
      // 3. บันทึกการแจ้งเตือน
      console.log(`📝 [MOCK] Step 3: Logging notification`);
      console.log(`✅ [MOCK] All email notifications sent for requisition ${requisitionId}`);
      
    } catch (error) {
      console.error('❌ [MOCK] Error in notifyRequisitionCreated:', error);
    }
  }

  static async sendDirectManagerEmail(requisitionId, userId) {
    console.log(`📧 [MOCK] sendDirectManagerEmail called with requisitionId: ${requisitionId}, userId: ${userId}`);
    
    try {
      // Mock: ตรวจสอบ User
      console.log(`🔍 [MOCK] Step 1: Checking user ${userId} in UserWithRoles`);
      const mockUser = {
        costcentercode: 'IT001',
        EmpCode: userId
      };
      console.log(`✅ [MOCK] User found with CostCenter: ${mockUser.costcentercode}`);
      
      // Mock: หา Manager
      console.log(`🔍 [MOCK] Step 2: Finding managers for CostCenter ${mockUser.costcentercode}`);
      const mockManagers = [
        { L2: 'MGR001', CurrentEmail: 'manager1@ube.co.th', FullNameEng: 'Manager One', CostCenter: 'IT001' },
        { L2: 'MGR002', CurrentEmail: 'manager2@ube.co.th', FullNameEng: 'Manager Two', CostCenter: 'IT001' }
      ];
      console.log(`🔔 [MOCK] Found ${mockManagers.length} managers for CostCenter ${mockUser.costcentercode}`);
      
      if (mockManagers.length === 0) {
        console.log(`⚠️ [MOCK] No managers found for CostCenter ${mockUser.costcentercode}`);
        return;
      }
      
      // Mock: ส่งอีเมลให้ Manager
      console.log(`📧 [MOCK] Step 3: Sending emails to managers`);
      for (const manager of mockManagers) {
        console.log(`📤 [MOCK] Sending email to manager: ${manager.FullNameEng} (${manager.CurrentEmail})`);
        console.log(`   📝 Subject: มีคำขอเบิกใหม่รอการอนุมัติ - Requisition #${requisitionId}`);
        console.log(`   🏷️ Type: requisition_pending`);
        console.log(`   👤 Manager ID: ${manager.L2}`);
        console.log(`✅ [MOCK] Email sent successfully to manager ${manager.FullNameEng}`);
      }
      
      console.log(`✅ [MOCK] Direct manager email sending completed for requisition ${requisitionId}`);
      
    } catch (error) {
      console.error('❌ [MOCK] Error in sendDirectManagerEmail:', error);
    }
  }
}

// ฟังก์ชันทดสอบ
async function testManagerEmailFlow() {
  console.log('\n🚀 Testing Manager Email Flow');
  console.log('=============================');
  
  const testRequisitionId = 12345;
  const testUserId = 'TEST001';
  
  console.log(`\n📋 Test Parameters:`);
  console.log(`- Requisition ID: ${testRequisitionId}`);
  console.log(`- User ID: ${testUserId}`);
  
  console.log(`\n🔄 Expected Flow:`);
  console.log(`1. notifyRequisitionCreated() called`);
  console.log(`2. sendDirectManagerEmail() called`);
  console.log(`3. User email sent`);
  console.log(`4. Manager emails sent`);
  console.log(`5. Notification logged`);
  
  console.log(`\n🧪 Running Test...`);
  await MockNotificationService.notifyRequisitionCreated(testRequisitionId, testUserId);
  
  console.log(`\n✅ Test Completed!`);
}

// ฟังก์ชันตรวจสอบปัญหา
function checkPotentialIssues() {
  console.log('\n🔍 Potential Issues Check');
  console.log('=========================');
  
  const issues = [
    {
      name: 'User not found in UserWithRoles',
      description: 'User ID ไม่มีในตาราง UserWithRoles',
      check: 'SELECT EmpCode FROM UserWithRoles WHERE EmpCode = "USER_ID"',
      solution: 'เพิ่ม User ในตาราง UserWithRoles'
    },
    {
      name: 'User has no CostCenter',
      description: 'User ไม่มี costcentercode',
      check: 'SELECT costcentercode FROM UserWithRoles WHERE EmpCode = "USER_ID"',
      solution: 'อัปเดต costcentercode ในตาราง UserWithRoles'
    },
    {
      name: 'No managers found',
      description: 'ไม่พบ Manager ใน CostCenter เดียวกัน',
      check: 'SELECT * FROM VS_DivisionMgr WHERE CostCenter = "USER_COSTCENTER"',
      solution: 'เพิ่ม Manager ใน VS_DivisionMgr หรือแก้ไข CostCenter'
    },
    {
      name: 'Manager has no email',
      description: 'Manager ไม่มี CurrentEmail',
      check: 'SELECT CurrentEmail FROM VS_DivisionMgr WHERE CostCenter = "USER_COSTCENTER"',
      solution: 'อัปเดต CurrentEmail ในตาราง VS_DivisionMgr'
    },
    {
      name: 'SMTP not configured',
      description: 'การตั้งค่า SMTP ไม่ถูกต้อง',
      check: 'Environment variables: SMTP_USER, SMTP_PASS',
      solution: 'ตั้งค่า SMTP ใน .env.local'
    },
    {
      name: 'Email sending failed',
      description: 'การส่งอีเมลจริงล้มเหลว',
      check: 'Console logs for email errors',
      solution: 'ตรวจสอบการตั้งค่า SMTP และ network'
    }
  ];
  
  issues.forEach((issue, index) => {
    console.log(`\n${index + 1}. ${issue.name}`);
    console.log(`   📝 Description: ${issue.description}`);
    console.log(`   🔍 Check: ${issue.check}`);
    console.log(`   🔧 Solution: ${issue.solution}`);
  });
}

// ฟังก์ชันตรวจสอบ Log
function checkLogMessages() {
  console.log('\n📋 Log Messages to Check');
  console.log('========================');
  
  const logMessages = [
    {
      message: '🔔 Sending immediate email notifications for requisition',
      meaning: 'notifyRequisitionCreated ถูกเรียกใช้',
      found: '✅ ระบบทำงานปกติ',
      notFound: '❌ notifyRequisitionCreated ไม่ถูกเรียกใช้'
    },
    {
      message: '📧 Sending immediate email to managers for requisition',
      meaning: 'sendDirectManagerEmail ถูกเรียกใช้',
      found: '✅ ระบบทำงานปกติ',
      notFound: '❌ sendDirectManagerEmail ไม่ถูกเรียกใช้'
    },
    {
      message: '❌ User not found in UserWithRoles',
      meaning: 'User ไม่มีในฐานข้อมูล',
      found: '❌ ต้องเพิ่ม User ในตาราง UserWithRoles',
      notFound: '✅ User มีในฐานข้อมูล'
    },
    {
      message: '❌ User has no CostCenter assigned',
      meaning: 'User ไม่มี CostCenter',
      found: '❌ ต้องอัปเดต costcentercode',
      notFound: '✅ User มี CostCenter'
    },
    {
      message: '🔔 Found X managers for CostCenter',
      meaning: 'พบ Manager ใน CostCenter',
      found: '✅ มี Manager ใน CostCenter',
      notFound: '❌ ไม่มี Manager ใน CostCenter'
    },
    {
      message: '📤 Sending immediate email to manager',
      meaning: 'กำลังส่งอีเมลให้ Manager',
      found: '✅ ระบบส่งอีเมลให้ Manager',
      notFound: '❌ ระบบไม่ส่งอีเมลให้ Manager'
    },
    {
      message: '✅ Email sent successfully to manager',
      meaning: 'ส่งอีเมลให้ Manager สำเร็จ',
      found: '✅ Manager ได้รับอีเมล',
      notFound: '❌ Manager ไม่ได้รับอีเมล'
    }
  ];
  
  logMessages.forEach((log, index) => {
    console.log(`\n${index + 1}. "${log.message}"`);
    console.log(`   📝 Meaning: ${log.meaning}`);
    console.log(`   ✅ If Found: ${log.found}`);
    console.log(`   ❌ If Not Found: ${log.notFound}`);
  });
}

// รันการทดสอบ
async function runDebug() {
  try {
    await testManagerEmailFlow();
    checkPotentialIssues();
    checkLogMessages();
    
    console.log('\n🎯 Next Steps:');
    console.log('==============');
    console.log('1. ตรวจสอบ Console logs ใน browser');
    console.log('2. ตรวจสอบฐานข้อมูลตาม checklist ข้างต้น');
    console.log('3. ตรวจสอบการตั้งค่า SMTP');
    console.log('4. ทดสอบการส่งอีเมลด้วย API test-email');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

runDebug();
