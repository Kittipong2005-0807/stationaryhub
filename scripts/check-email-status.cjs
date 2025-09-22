// =====================================================
// ตรวจสอบสถานะการส่งอีเมลใน EMAIL_LOGS
// =====================================================

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkEmailStatus() {
  try {
    console.log('📧 ตรวจสอบสถานะการส่งอีเมลใน EMAIL_LOGS...\n');

    // 1. ตรวจสอบข้อมูลในตาราง EMAIL_LOGS
    const totalRecords = await prisma.eMAIL_LOGS.count();
    console.log(`📊 จำนวนรายการทั้งหมดใน EMAIL_LOGS: ${totalRecords}`);

    if (totalRecords === 0) {
      console.log('❌ ไม่มีข้อมูลในตาราง EMAIL_LOGS');
      return;
    }

    // 2. แสดงข้อมูล EMAIL_LOGS ล่าสุด 10 รายการ
    const recentEmailLogs = await prisma.eMAIL_LOGS.findMany({
      orderBy: {
        SENT_AT: 'desc'
      },
      take: 10
    });

    console.log('\n📋 รายการ EMAIL_LOGS ล่าสุด 10 รายการ:');
    recentEmailLogs.forEach((email, index) => {
      console.log(`${index + 1}. ID: ${email.EMAIL_ID}`);
      console.log(`   TO_USER_ID: ${email.TO_USER_ID}`);
      console.log(`   TO_EMAIL: ${email.TO_EMAIL}`);
      console.log(`   SUBJECT: ${email.SUBJECT}`);
      console.log(`   STATUS: ${email.STATUS}`);
      console.log(`   EMAIL_TYPE: ${email.EMAIL_TYPE}`);
      console.log(`   SENT_AT: ${email.SENT_AT}`);
      console.log(`   ERROR_MESSAGE: ${email.ERROR_MESSAGE || 'ไม่มี'}`);
      console.log(`   RETRY_COUNT: ${email.RETRY_COUNT}`);
      console.log('   ---');
    });

    // 3. นับจำนวนแต่ละ STATUS
    console.log('\n📊 สถิติสถานะการส่งอีเมล:');
    const statusStats = await prisma.eMAIL_LOGS.groupBy({
      by: ['STATUS'],
      _count: {
        EMAIL_ID: true
      }
    });

    statusStats.forEach(stat => {
      console.log(`   ${stat.STATUS || 'NULL'}: ${stat._count.EMAIL_ID} รายการ`);
    });

    // 4. นับจำนวนแต่ละ EMAIL_TYPE
    console.log('\n📊 สถิติประเภทอีเมล:');
    const typeStats = await prisma.eMAIL_LOGS.groupBy({
      by: ['EMAIL_TYPE'],
      _count: {
        EMAIL_ID: true
      }
    });

    typeStats.forEach(stat => {
      console.log(`   ${stat.EMAIL_TYPE || 'NULL'}: ${stat._count.EMAIL_ID} รายการ`);
    });

    // 5. ตรวจสอบอีเมลที่ล้มเหลว
    const failedEmails = await prisma.eMAIL_LOGS.findMany({
      where: {
        STATUS: 'FAILED'
      },
      orderBy: {
        SENT_AT: 'desc'
      },
      take: 5
    });

    if (failedEmails.length > 0) {
      console.log('\n❌ อีเมลที่ส่งไม่สำเร็จ (ล่าสุด 5 รายการ):');
      failedEmails.forEach((email, index) => {
        console.log(`${index + 1}. ID: ${email.EMAIL_ID}`);
        console.log(`   TO_EMAIL: ${email.TO_EMAIL}`);
        console.log(`   SUBJECT: ${email.SUBJECT}`);
        console.log(`   ERROR: ${email.ERROR_MESSAGE}`);
        console.log(`   RETRY_COUNT: ${email.RETRY_COUNT}`);
        console.log('   ---');
      });
    }

    // 6. ตรวจสอบอีเมลที่รอการส่ง
    const pendingEmails = await prisma.eMAIL_LOGS.findMany({
      where: {
        STATUS: 'PENDING'
      },
      orderBy: {
        SENT_AT: 'desc'
      },
      take: 5
    });

    if (pendingEmails.length > 0) {
      console.log('\n⏳ อีเมลที่รอการส่ง (ล่าสุด 5 รายการ):');
      pendingEmails.forEach((email, index) => {
        console.log(`${index + 1}. ID: ${email.EMAIL_ID}`);
        console.log(`   TO_EMAIL: ${email.TO_EMAIL}`);
        console.log(`   SUBJECT: ${email.SUBJECT}`);
        console.log(`   EMAIL_TYPE: ${email.EMAIL_TYPE}`);
        console.log('   ---');
      });
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmailStatus();
