const { NotificationService } = require('./lib/notification-service.ts');

// ข้อมูลตัวอย่างสำหรับทดสอบ
const sampleData = {
  requisition_created: {
    requisitionId: 12345,
    totalAmount: 15000.50,
    submittedAt: new Date(),
    items: [
      {
        productName: 'ปากกา Pilot',
        quantity: 10,
        unitPrice: 25.50,
        totalPrice: 255.00
      },
      {
        productName: 'กระดาษ A4',
        quantity: 5,
        unitPrice: 120.00,
        totalPrice: 600.00
      }
    ],
    requesterName: 'สมชาย ใจดี'
  },
  
  requisition_approved: {
    requisitionId: 12345,
    approvedBy: 'นายกิตติ อนุมัติ'
  },
  
  requisition_rejected: {
    requisitionId: 12345,
    rejectedBy: 'นายกิตติ อนุมัติ',
    reason: 'งบประมาณไม่เพียงพอ'
  },
  
  requisition_pending: {
    requisitionId: 12345,
    userId: 'EMP001',
    managerName: 'นายกิตติ อนุมัติ',
    requesterName: 'สมชาย ใจดี'
  },
  
  requisition_approved_admin: {
    requisitionId: 12345,
    approvedBy: 'นายกิตติ อนุมัติ',
    requesterName: 'สมชาย ใจดี',
    totalAmount: 15000.50,
    submittedAt: new Date(),
    isSelfApproval: false
  },
  
  no_manager_found: {
    requisitionId: 12345,
    userId: 'EMP001',
    costCenter: 'CC001'
  }
};

async function previewAllEmailTemplates() {
  try {
    console.log('📧 ===== PREVIEW ALL EMAIL TEMPLATES =====\n');
    
    // 1. Requisition Created (สำหรับผู้ส่งคำขอ)
    console.log('1️⃣ ===== REQUISITION CREATED EMAIL =====');
    console.log('📧 To: ผู้ส่งคำขอเบิก');
    console.log('📧 Subject: คำขอเบิกได้รับการส่งเรียบร้อยแล้ว');
    console.log('📧 Content:');
    const createdTemplate = NotificationService.createEmailTemplate('requisition_created', sampleData.requisition_created);
    console.log(createdTemplate);
    console.log('\n' + '='.repeat(80) + '\n');
    
    // 2. Requisition Pending (สำหรับ Manager)
    console.log('2️⃣ ===== REQUISITION PENDING EMAIL =====');
    console.log('📧 To: Manager');
    console.log('📧 Subject: มีคำขอเบิกใหม่รอการอนุมัติ');
    console.log('📧 Content:');
    const pendingTemplate = NotificationService.createEmailTemplate('requisition_pending', sampleData.requisition_pending);
    console.log(pendingTemplate);
    console.log('\n' + '='.repeat(80) + '\n');
    
    // 3. Requisition Approved (สำหรับผู้ส่งคำขอ)
    console.log('3️⃣ ===== REQUISITION APPROVED EMAIL =====');
    console.log('📧 To: ผู้ส่งคำขอเบิก');
    console.log('📧 Subject: คำขอเบิกได้รับการอนุมัติ');
    console.log('📧 Content:');
    const approvedTemplate = NotificationService.createEmailTemplate('requisition_approved', sampleData.requisition_approved);
    console.log(approvedTemplate);
    console.log('\n' + '='.repeat(80) + '\n');
    
    // 4. Requisition Rejected (สำหรับผู้ส่งคำขอ)
    console.log('4️⃣ ===== REQUISITION REJECTED EMAIL =====');
    console.log('📧 To: ผู้ส่งคำขอเบิก');
    console.log('📧 Subject: คำขอเบิกถูกปฏิเสธ');
    console.log('📧 Content:');
    const rejectedTemplate = NotificationService.createEmailTemplate('requisition_rejected', sampleData.requisition_rejected);
    console.log(rejectedTemplate);
    console.log('\n' + '='.repeat(80) + '\n');
    
    // 5. Requisition Approved Admin (สำหรับ Admin)
    console.log('5️⃣ ===== REQUISITION APPROVED ADMIN EMAIL =====');
    console.log('📧 To: Admin');
    console.log('📧 Subject: มีการอนุมัติคำขอเบิกใหม่');
    console.log('📧 Content:');
    const approvedAdminTemplate = NotificationService.createEmailTemplate('requisition_approved_admin', sampleData.requisition_approved_admin);
    console.log(approvedAdminTemplate);
    console.log('\n' + '='.repeat(80) + '\n');
    
    // 6. No Manager Found (สำหรับ Admin)
    console.log('6️⃣ ===== NO MANAGER FOUND EMAIL =====');
    console.log('📧 To: Admin');
    console.log('📧 Subject: ผู้ใช้งานแผนกไม่พบManager');
    console.log('📧 Content:');
    const noManagerTemplate = NotificationService.createEmailTemplate('no_manager_found', sampleData.no_manager_found);
    console.log(noManagerTemplate);
    console.log('\n' + '='.repeat(80) + '\n');
    
    console.log('✅ การแสดงตัวอย่างอีเมลทั้งหมดเสร็จสิ้น');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

previewAllEmailTemplates();

