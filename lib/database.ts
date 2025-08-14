// Database connection utilities
// In real implementation, use actual SQL Server connection

import { prisma } from './prisma'
import nodemailer from 'nodemailer'

export interface Product {
  PRODUCT_ID: number
  PRODUCT_NAME: string
  CATEGORY_ID: number
  CATEGORY_NAME?: string
  STOCK_TYPE: string
  STOCK_QUANTITY: number
  UNIT_COST: number
  ORDER_UNIT: string
  PHOTO_URL: string
  CREATED_AT: string
}

export interface Requisition {
  REQUISITION_ID: number
  USER_ID: number
  USERNAME?: string
  STATUS: "PENDING" | "APPROVED" | "REJECTED"
  SUBMITTED_AT: string
  TOTAL_AMOUNT: number
  SITE_ID: string // Changed from number to string
  ISSUE_NOTE: string
  items?: RequisitionItem[]
  REQUISITION_ITEMS?: RequisitionItem[]
}

export interface RequisitionItem {
  ITEM_ID: number
  REQUISITION_ID: number
  PRODUCT_ID: number
  PRODUCT_NAME?: string
  QUANTITY: number
  UNIT_PRICE: number
  TOTAL_PRICE: number
}

export interface Approval {
  APPROVAL_ID: number
  REQUISITION_ID: number
  APPROVED_BY: number
  STATUS: "APPROVED" | "REJECTED"
  APPROVED_AT: string
  NOTE: string
}

export interface ExportLog {
  EXPORT_ID: number
  REQUISITION_ID: number
  EXPORTED_BY: number
  FILE_TYPE: "PDF" | "EXCEL"
  EXPORTED_AT: string
}

export interface EmailLog {
  EMAIL_ID: number
  TO_USER_ID: number
  SUBJECT: string
  BODY: string
  SENT_AT: string
  STATUS: "SENT" | "FAILED"
}

export interface StatusHistory {
  STATUS_ID: number
  REQUISITION_ID: number
  STATUS: string
  CHANGED_BY: number
  CHANGED_AT: string
  COMMENT: string
}

export interface ProductCategory {
  CATEGORY_ID: number
  CATEGORY_NAME: string
}

// Database query functions (Prisma version)
export async function getProducts() {
  return await prisma.pRODUCTS.findMany({
    include: { PRODUCT_CATEGORIES: true }
  })
}

export async function getRequisitions(userId?: string, role?: string) {
  if (role === 'USER' && userId) {
    return await prisma.rEQUISITIONS.findMany({
      where: { USER_ID: userId },
      include: { USERS: true, REQUISITION_ITEMS: true }
    })
  }
  return await prisma.rEQUISITIONS.findMany({
    include: { USERS: true, REQUISITION_ITEMS: true }
  })
}

export async function createRequisition(requisitionData: any) {
  // ตัวอย่างการสร้าง requisition พร้อม items
  return await prisma.rEQUISITIONS.create({
    data: {
      USER_ID: requisitionData.USER_ID,
      STATUS: requisitionData.STATUS || 'PENDING',
      SUBMITTED_AT: requisitionData.SUBMITTED_AT || new Date().toISOString(),
      TOTAL_AMOUNT: requisitionData.TOTAL_AMOUNT,
      SITE_ID: requisitionData.SITE_ID,
      ISSUE_NOTE: requisitionData.ISSUE_NOTE,
      REQUISITION_ITEMS: {
        create: requisitionData.items?.map((item: any) => ({
          PRODUCT_ID: item.PRODUCT_ID,
          QUANTITY: item.QUANTITY,
          UNIT_PRICE: item.UNIT_PRICE,
          TOTAL_PRICE: item.TOTAL_PRICE
        })) || []
      }
    },
    include: { REQUISITION_ITEMS: true }
  })
}

// ฟังก์ชันส่งอีเมล (พื้นฐาน)
export async function sendMail(to: string, subject: string, text: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@example.com',
    to,
    subject,
    text,
  })
}
