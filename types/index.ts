// Database Types
import { Decimal } from "@prisma/client/runtime/library"

export interface Product {
  PRODUCT_ID: number;
  ITEM_ID: string;
  PRODUCT_NAME: string;
  UNIT_COST: Decimal | number | string | null;
  ORDER_UNIT: string | null;
  PHOTO_URL: string | null;
  PRODUCT_CATEGORIES?: {
    CATEGORY_NAME: string;
  } | null;
}

export interface User {
  USER_ID: string;
  USERNAME: string;
  EMAIL: string | null;
  ROLE: string | null;
  DEPARTMENT: string | null;
  FullNameThai?: string;
  FullNameEng?: string;
}

export interface Requisition {
  REQUISITION_ID: number;
  USER_ID: string;
  STATUS: string | null;
  TOTAL_AMOUNT: Decimal | number | null;
  SUBMITTED_AT: Date | string | null;
  USERS?: User | null;
  REQUISITION_ITEMS?: RequisitionItem[];
}

export interface RequisitionItem {
  REQUISITION_ID: number;
  PRODUCT_ID: number;
  QUANTITY: number | null;
  UNIT_PRICE: Decimal | number | string | null;
  PRODUCTS?: Product | null;
}

export interface Notification {
  EMAIL_ID: number;
  SUBJECT: string;
  BODY: string | null;
  STATUS: string | null;
  CREATED_AT: Date | string;
  TO_USER_ID: string | null;
}

export interface Manager {
  L2: string | null;
  CurrentEmail: string | null;
  FullNameEng: string | null;
  PostNameEng: string | null;
  CostCenter: string | null;
}

export interface PriceAlert {
  PRODUCT_ID: number;
  PRODUCT_NAME: string;
  CURRENT_PRICE: number;
  PREVIOUS_PRICE: number;
  PRICE_CHANGE: number;
  PERCENTAGE_CHANGE: number;
  ALERT_LEVEL: string;
  ALERT_MESSAGE: string;
  ALERT_DATE: string;
}

export interface PriceComparison {
  PRODUCT_ID: number;
  PRODUCT_NAME: string;
  CURRENT_PRICE: number;
  PREVIOUS_PRICE: number;
  PRICE_CHANGE: number;
  PERCENTAGE_CHANGE: number;
  CATEGORY_NAME: string;
  ORDER_UNIT: string | null;
  PHOTO_URL: string | null;
}

export interface ApprovalData {
  REQUISITION_ID: number;
  STATUS: string;
  APPROVED_BY: string;
  APPROVAL_DATE: Date | string;
  COMMENTS?: string | null;
}

export interface EmailLog {
  EMAIL_ID: number;
  TO_EMAIL: string;
  SUBJECT: string;
  STATUS: string;
  SENT_AT: Date | string;
  ERROR_MESSAGE?: string | null;
}

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Transaction Types
export interface PrismaTransaction {
  rEQUISITIONS: {
    update: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
  };
  rEQUISITION_ITEMS: {
    deleteMany: (args: any) => Promise<any>;
    createMany: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
  };
  pRODUCTS: {
    findMany: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
  };
  uSERS: {
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
  };
  eMAIL_LOGS: {
    create: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
  };
  aPPROVALS: {
    create: (args: any) => Promise<any>;
  };
  sTATUS_HISTORY: {
    create: (args: any) => Promise<any>;
  };
}

// Utility Types
export type StatusType = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type RoleType = 'admin' | 'manager' | 'user';
export type AlertLevelType = 'low' | 'medium' | 'high' | 'critical';
