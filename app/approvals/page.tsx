'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastContainer';
import { useModal } from '@/components/ui/ModalManager';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle,
  XCircle,
  Eye,
  ClipboardList,
  TrendingUp,
  Clock,
  CheckSquare,
  AlertTriangle,
  RefreshCw,
  Download as _Download,
  FileText
} from 'lucide-react';
import {
  ShoppingCart,
  Person,
  CalendarToday,
  Note,
  Inventory,
  Category
} from '@mui/icons-material';
import { Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getBasePathUrl } from '@/lib/base-path';
import { getApiUrl } from '@/lib/api-utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// เพิ่ม font ที่รองรับภาษาไทย
import 'jspdf/dist/polyfills.es.js';

// เพิ่ม type definitions สำหรับ autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}
import html2canvas from 'html2canvas';
import ThaiDateUtils from '@/lib/date-utils';

interface RequisitionItem {
  ITEM_ID: number;
  REQUISITION_ID: number;
  PRODUCT_ID: number;
  PRODUCT_NAME: string;
  QUANTITY: number;
  UNIT_PRICE: number;
  TOTAL_PRICE: number;
  ORDER_UNIT?: string;
  PHOTO_URL?: string;
  CATEGORY_NAME?: string;
  PRODUCTS?: {
    ITEM_ID: string;
  };
}

interface Requisition {
  REQUISITION_ID: number;
  USER_ID: string;
  USERNAME?: string;
  STATUS: string;
  SUBMITTED_AT: string;
  TOTAL_AMOUNT: number;
  SITE_ID: string;
  ISSUE_NOTE: string;
  REQUISITION_ITEMS: RequisitionItem[];
  APPROVALS?: unknown[];
  STATUS_HISTORY?: unknown[];
  DEPARTMENT?: string;
  deliveryDate?: string;
  contactPerson?: string;
  category?: string;
}

// ฟังก์ชันจัดรูปแบบตัวเลขให้มีเครื่องหมายจุลภาค
const formatNumberWithCommas = (num: number) => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// ฟังก์ชันคำนวณ TOTAL_PRICE อย่างปลอดภัย
const calculateSafeTotalPrice = (item: any) => {
  if (item.TOTAL_PRICE) {
    return formatNumberWithCommas(Number(item.TOTAL_PRICE));
  }
  const qty = Number(item.QUANTITY || 0);
  const price = Number(item.UNIT_PRICE || 0);
  if (isNaN(qty) || isNaN(price)) {
    return '0.00';
  }
  return formatNumberWithCommas(qty * price);
};

export default function ApprovalsPage() {
  // ฟังก์ชันสำหรับจัดการ font ภาษาไทย
  const setupThaiFont = (pdf: jsPDF) => {
    try {
      // ตรวจสอบว่า PDF object ถูกต้อง
      if (!pdf || typeof pdf.setFont !== 'function' || typeof pdf.setFontSize !== 'function') {
        console.error('Invalid PDF object provided to setupThaiFont', {
          pdfExists: !!pdf,
          pdfType: typeof pdf,
          setFontExists: typeof pdf?.setFont,
          setFontSizeExists: typeof pdf?.setFontSize
        });
        return;
      }

      // ตรวจสอบว่า autoTable plugin ถูกโหลดแล้วหรือไม่
      if (!pdf.autoTable) {
        console.warn('autoTable plugin not loaded, attempting to load...');
        // ถ้าไม่ได้โหลด ให้ import ใหม่
        import('jspdf-autotable').then(() => {
          console.log('autoTable plugin loaded successfully');
        }).catch((error) => {
          console.error('Failed to load autoTable plugin:', error);
        });
      }
      
      // ใช้ font ที่รองรับภาษาไทยได้ดีกว่า
      pdf.setFont('helvetica');
      
      // ตั้งค่า font size เริ่มต้น
      pdf.setFontSize(10);
      
      // ตั้งค่า PDF properties
      pdf.setProperties({
        title: 'Supply Request Order',
        subject: 'PDF Document',
        author: 'Stationary Hub System',
        creator: 'Stationary Hub System'
      });
      
      console.log('Font setup completed');
    } catch (error) {
      console.warn('Could not set font, using default:', error);
    }
  };

  // ฟังก์ชันสำหรับจัดการ font ใน autoTable
  const setupAutoTableThaiFont = () => {
    return {
      font: 'helvetica',
      fontStyle: 'normal',
      fontSize: 9,
      // เพิ่มการตั้งค่าสำหรับภาษาไทย
      textColor: [0, 0, 0],
      halign: 'left',
      valign: 'middle',
      cellPadding: 3,
      overflow: 'linebreak',
      minCellHeight: 8,
    };
  };

  // ฟังก์ชันสำหรับแปลงข้อความไทยให้แสดงผลได้
  const convertThaiText = (text: string): string => {
    if (!text) return '';
    
    // แปลงตัวอักษรไทยเป็นตัวอักษรที่ jsPDF รองรับ
    // หรือใช้วิธีอื่นในการจัดการ
    try {
      // ลองใช้ encodeURIComponent แล้ว decode
      return decodeURIComponent(encodeURIComponent(text));
    } catch (error) {
      // ถ้าไม่ได้ ให้ใช้ข้อความต้นฉบับ
      return text;
    }
  };

  // Helper to create PDF with autoTable for proper table pagination
  const createPDFWithAutoTable = async (requisitions: any[], editFormData: any) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 10;
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - (margin * 2);

    // ตรวจสอบว่า autoTable plugin พร้อมใช้งาน
    if (!pdf.autoTable) {
      // ถ้า autoTable ไม่มี ให้เพิ่มเข้าไป
      (pdf as any).autoTable = autoTable;
    }

    // ตรวจสอบอีกครั้งว่า autoTable พร้อมใช้งาน
    if (!pdf.autoTable && !(pdf as any).autoTable) {
      throw new Error('autoTable plugin is not available. Please ensure jspdf-autotable is properly imported.');
    }
    
    // ตั้งค่า font สำหรับภาษาไทย
    setupThaiFont(pdf);
    
    let isFirstPage = true;
    
    for (let i = 0; i < requisitions.length; i++) {
      const requisition = requisitions[i];
      
      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;
      
      // Header
      if (i === 0) {
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.text('SUPPLY REQUEST ORDER', pageWidth / 2, 20, { align: 'center' });
        
        // Company info
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(editFormData.companyName, margin, 30);
        pdf.text(editFormData.companyAddress, margin, 35);
        pdf.text(`TEL: ${editFormData.phone} FAX: ${editFormData.fax}`, margin, 40);
        pdf.text(`เลขประจำตัวผู้เสียภาษี ${editFormData.taxId}`, margin, 45);
        
        // Date and Requisition ID
        pdf.text(`Date: ${formatDate(requisition.SUBMITTED_AT)}`, contentWidth + margin - 50, 30);
        pdf.text(`Requisition ID: #${requisition.REQUISITION_ID}`, contentWidth + margin - 50, 35);
        
        // Delivery info
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Please Delivery on:', margin, 55);
        pdf.setFont('helvetica', 'normal');
        pdf.text(editFormData.deliveryDate || '_________________', margin, 60);
        pdf.text(`หมายเหตุ: ${requisition.ISSUE_NOTE || 'ไม่มีหมายเหตุ'}`, margin, 65);
        pdf.text(`ต้องการข้อมูลเพิ่มเติมโปรดติดต่อ: ${editFormData.contactPerson || 'N/A'}`, margin, 70);
      }
      
      // Cost Center info
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Cost Center: ${requisition.SITE_ID} | ผู้สั่ง: ${requisition.USER_ID} | แผนก: ${requisition.DEPARTMENT || 'N/A'}`, margin, i === 0 ? 80 : 20);
      
      // Prepare table data
      const tableData: any[] = [];
      const groupedItems = requisition.REQUISITION_ITEMS.reduce((acc: any, item: any) => {
        const category = item.CATEGORY_NAME || 'ไม่ระบุหมวดหมู่';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {});
      
      Object.entries(groupedItems).forEach(([category, items]: [string, any]) => {
        // Category header with special styling
        tableData.push([category, '', '', '', '', '']);
        
        // Items in category
        items.forEach((item: any) => {
          tableData.push([
            (item as any).PRODUCT_ITEM_ID || item.ITEM_ID || 'N/A',
            convertThaiText(item.PRODUCT_NAME),
            item.QUANTITY,
            convertThaiText(item.ORDER_UNIT || 'ชิ้น'),
            `฿${formatNumberWithCommas(Number(item.UNIT_PRICE))}`,
            `฿${calculateSafeTotalPrice(item)}`
          ]);
        });
      });
      
      // สร้าง header สำหรับ PDF
      if (i === 0) {
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.text('SUPPLY REQUEST ORDER', pageWidth / 2, 20, { align: 'center' });
        
        // Company info
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(editFormData.companyName, margin, 30);
        pdf.text(editFormData.companyAddress, margin, 35);
        pdf.text(`TEL: ${editFormData.phone} FAX: ${editFormData.fax}`, margin, 40);
        pdf.text(`เลขประจำตัวผู้เสียภาษี ${editFormData.taxId}`, margin, 45);
        
        // Date and Requisition ID
        pdf.text(`Date: ${formatDate(requisition.SUBMITTED_AT)}`, contentWidth + margin - 50, 30);
        pdf.text(`Requisition ID: #${requisition.REQUISITION_ID}`, contentWidth + margin - 50, 35);
        
        // Delivery info
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Please Delivery on:', margin, 55);
        pdf.setFont('helvetica', 'normal');
        pdf.text(editFormData.deliveryDate || '_________________', margin, 60);
        pdf.text(`หมายเหตุ: ${requisition.ISSUE_NOTE || 'ไม่มีหมายเหตุ'}`, margin, 65);
        pdf.text(`ต้องการข้อมูลเพิ่มเติมโปรดติดต่อ: ${editFormData.contactPerson || 'N/A'}`, margin, 70);
      }
      
      // Cost Center info
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Cost Center: ${requisition.SITE_ID} | ผู้สั่ง: ${requisition.USER_ID} | แผนก: ${requisition.DEPARTMENT || 'N/A'}`, margin, i === 0 ? 80 : 20);
      
      // ตั้งค่า font สำหรับ autoTable
      setupThaiFont(pdf);
      
      // Create table with proper pagination settings
      try {
        // ตรวจสอบว่า pdf object ยังคงถูกต้อง
        if (!pdf) {
          throw new Error('PDF object is null or undefined');
        }

        // ตรวจสอบว่า pdf object มี methods ที่จำเป็น
        if (typeof pdf.setFont !== 'function' || typeof pdf.setFontSize !== 'function') {
          throw new Error('PDF object is missing required methods');
        }

        // ตรวจสอบว่า autoTable พร้อมใช้งาน
        if (!(pdf as any).autoTable) {
          throw new Error('autoTable is not available');
        }

        console.log('Creating autoTable for requisition', {
          pdfExists: !!pdf,
          pdfType: typeof pdf,
          autoTableExists: !!(pdf as any).autoTable,
          tableDataLength: tableData.length
        });

        // ใช้ (pdf as any).autoTable เพื่อให้แน่ใจว่าใช้งานได้
        (pdf as any).autoTable({
        head: [['ITEM_ID', 'Description', 'Qty', 'Unit', 'Unit Price', 'Total']],
        body: tableData,
        startY: i === 0 ? 90 : 30,
        margin: { left: margin, right: margin, top: 10, bottom: 20 },
        styles: {
          ...setupAutoTableThaiFont(),
        },
        headStyles: {
          fillColor: [233, 236, 239],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak',
          minCellHeight: 8,
          valign: 'middle',
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 20 }, // ITEM_ID
          1: { halign: 'left', cellWidth: 60 },   // Description
          2: { halign: 'center', cellWidth: 15 }, // Qty
          3: { halign: 'center', cellWidth: 15 }, // Unit
          4: { halign: 'right', cellWidth: 25 },  // Unit Price
          5: { halign: 'right', cellWidth: 25 },  // Total
        },
        // ตั้งค่า pagination ที่เหมาะสม
        tableWidth: 'wrap',
        showHead: 'everyPage',
        // ป้องกันการตัดแถวตาราง
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        // ตั้งค่าให้แถวไม่ถูกตัดครึ่ง
        keepWithHeaderRows: 1,
        didDrawPage: (data: any) => {
          // Page numbering
          const pageCount = pdf.getNumberOfPages();
          pdf.setFontSize(10);
          pdf.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        },
        // จัดการการแบ่งหน้าให้ดีขึ้น
        didParseCell: (data: any) => {
          // จัดการ category header rows
          const rowData = data.row.raw;
          if (rowData && rowData[1] === '' && rowData[2] === '' && rowData[3] === '' && rowData[4] === '' && rowData[5] === '') {
            // Category header row
            data.cell.styles.fillColor = [240, 240, 240];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 10;
            data.cell.styles.halign = 'left';
            data.cell.styles.valign = 'middle';
            data.cell.styles.cellPadding = { top: 4, right: 3, bottom: 4, left: 6 };
            // ป้องกันการตัด category header
            data.cell.styles.pageBreak = 'avoid';
          } else {
            // สำหรับแถวข้อมูลสินค้า ป้องกันการตัดแถว
            data.cell.styles.pageBreak = 'avoid';
            data.cell.styles.minCellHeight = 8;
          }
        },
        // เพิ่มการจัดการการแบ่งหน้า
        willDrawCell: (data: any) => {
          // ตรวจสอบว่ามีพื้นที่เพียงพอสำหรับแถวนี้หรือไม่
          const remainingHeight = pdf.internal.pageSize.height - data.cursor.y;
          const rowHeight = 12; // ความสูงของแถว
          
          if (remainingHeight < rowHeight && data.row.index > 0) {
            // ถ้าไม่มีพื้นที่เพียงพอ ให้ขึ้นหน้าใหม่
            pdf.addPage();
            data.cursor.y = 20; // เริ่มต้นที่ตำแหน่งใหม่
          }
        }
      });
      } catch (autoTableError) {
        console.error('Error creating autoTable:', autoTableError);
        showError('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างตารางได้: ' + (autoTableError as Error).message);
        throw autoTableError; // throw error แทน return
      }
    }
    
    return pdf;
  };

  // Helper to render a canvas image into the PDF with consistent margins and page breaks
  const renderImageWithMargins = (
    pdfInstance: jsPDF,
    imageData: string,
    canvasWidth: number,
    canvasHeight: number,
  ) => {
    const margin = 10;
    const bottomMargin = 15;
    const pageW = 210;
    const pageH = 297;
    const innerW = pageW - margin * 2;
    const usableH = pageH - margin - bottomMargin;
    const pageOverlap = 15; // increased overlap to prevent clipping at page breaks
    const calculatedImageHeight = (canvasHeight * innerW) / canvasWidth;

    const drawFrame = () => {
      pdfInstance.setFillColor(255, 255, 255);
      pdfInstance.rect(0, 0, pageW, margin, 'F');
      pdfInstance.rect(0, pageH - bottomMargin, pageW, bottomMargin, 'F');
      pdfInstance.rect(0, 0, margin, pageH, 'F');
      pdfInstance.rect(pageW - margin, 0, margin, pageH, 'F');
    };

    if (calculatedImageHeight <= usableH) {
      pdfInstance.addImage(imageData, 'PNG', margin, margin, innerW, calculatedImageHeight);
      drawFrame();
      pdfInstance.setFontSize(10);
      pdfInstance.setTextColor(102, 102, 102);
      pdfInstance.text(`Page 1 of 1`, 105, pageH - bottomMargin / 2, { align: 'center' });
      return;
    }

    let currentPage = 1;
    let offsetY = 0;
    const step = Math.max(1, usableH - pageOverlap);
    const totalPages = Math.ceil(Math.max(0, calculatedImageHeight - pageOverlap) / step);
    while (offsetY < calculatedImageHeight - pageOverlap) {
      if (currentPage > 1) {
        pdfInstance.addPage();
      }
      pdfInstance.addImage(imageData, 'PNG', margin, margin - offsetY, innerW, calculatedImageHeight);
      drawFrame();
      pdfInstance.setFontSize(10);
      pdfInstance.setTextColor(102, 102, 102);
      pdfInstance.text(`Page ${currentPage} of ${totalPages}`, 105, pageH - bottomMargin / 2, { align: 'center' });
      if (currentPage === totalPages) {
        pdfInstance.setFontSize(8);
        pdfInstance.setTextColor(102, 102, 102);
        pdfInstance.text('Document created by StationaryHub System', 105, pageH - bottomMargin - 2, { align: 'center' });
        pdfInstance.text(`Created: ${(() => {
          const now = new Date();
          const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
          const dateNum = now.getDate().toString().padStart(2, '0');
          const month = thaiMonthsShort[now.getMonth()];
          const year = (now.getFullYear() + 543).toString().slice(-4);
          const hours = now.getHours().toString().padStart(2, '0');
          const minutes = now.getMinutes().toString().padStart(2, '0');
          return `${dateNum} ${month} ${year} ${hours}:${minutes}`;
        })()}`, 105, pageH - bottomMargin - 7, { align: 'center' });
      }
      offsetY += step;
      currentPage++;
    }
  };
  const { showSuccess: showToastSuccess, showError: showToastError, showInfo: showToastInfo } = useToast();
  const { showSuccess, showError, showWarning, showInfo } = useModal();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequisition, setSelectedRequisition] =
    useState<Requisition | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected' | 'closed'
  >('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRequisition, setEditingRequisition] =
    useState<Requisition | null>(null);
  const [editFormData, setEditFormData] = useState({
    deliveryDate: '',
    contactPerson: '',
    category: '',
    companyName: 'บริษัท ยูไนเต็ด1999 พลัซ จำกัด (สำนักงานใหญ่)',
    companyAddress: '1 ซ.ข้างอำเภอ ถ.ตากสินมหาราช ต.เชิงเนิน อ.เมือง จ.ระยอง 21000',
    fax: '(038) 623433',
    phone: '(038) 623126',
    taxId: '0215542000264',
    fileName: ''
  });

  const [editAllFormData, setEditAllFormData] = useState({
    deliveryDate: '',
    contactPerson: '',
    category: '',
    companyName: 'บริษัท ยูไนเต็ด1999 พลัซ จำกัด (สำนักงานใหญ่)',
    companyAddress: '1 ซ.ข้างอำเภอ ถ.ตากสินมหาราช ต.เชิงเนิน อ.เมือง จ.ระยอง 21000',
    fax: '(038) 623433',
    phone: '(038) 623126',
    taxId: '0215542000264',
    fileName: ''
  });
  const [editAllDialogOpen, setEditAllDialogOpen] = useState(false);
  const [editItemsDialogOpen, setEditItemsDialogOpen] = useState(false);
  const [editingItems, setEditingItems] = useState<RequisitionItem[]>([]);
  const [savingItems, setSavingItems] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifying, setNotifying] = useState(false);
  
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as unknown as {
    EmpCode?: string;
    USER_ID?: string;
    AdLoginName?: string;
    ROLE?: string;
  };
  const isAuthenticated = !!session;

  useEffect(() => {
    if (
      !isAuthenticated ||
      (user?.ROLE !== 'MANAGER' && user?.ROLE !== 'ADMIN')
    ) {
      router.push(getBasePathUrl('/login'));
      return;
    }

    setLoading(true);

    // แยก API call ตาม Role
    if (user?.ROLE === 'ADMIN') {
      // Admin เห็น requisitions ของทุกแผนก
      console.log('Admin user data:', {
        EmpCode: user?.EmpCode,
        USER_ID: user?.USER_ID,
        AdLoginName: user?.AdLoginName,
        ROLE: user?.ROLE
      });

      fetch(getApiUrl(`/api/orgcode3?action=getAllRequisitionsForAdmin`))
        .then((res) => {
          console.log('Admin API response status:', res.status);
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(async (data) => {
          console.log('Fetched all requisitions for admin:', data);
          if (data.requisitions && Array.isArray(data.requisitions)) {
            setRequisitions(data.requisitions);
          } else if (Array.isArray(data)) {
            setRequisitions(data);
          } else {
            console.warn('Unexpected data format:', data);
            setRequisitions([]);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching all requisitions for admin:', error);
          showError('เกิดข้อผิดพลาด', 'โหลดข้อมูล requisitions ไม่สำเร็จ: ' + error.message);
          setRequisitions([]);
          setLoading(false);
        });
    } else {
      // Manager เห็น requisitions ที่อยู่ใน SITE_ID เดียวกัน
      const managerUserId = user?.EmpCode || user?.USER_ID || user?.AdLoginName;
      console.log('Manager user data:', {
        EmpCode: user?.EmpCode,
        USER_ID: user?.USER_ID,
        AdLoginName: user?.AdLoginName,
        managerUserId
      });

      fetch(
        getApiUrl(
          `/api/orgcode3?action=getRequisitionsForManager&userId=${managerUserId}`
        )
      )
        .then((res) => res.json())
        .then((data) => {
          console.log('Fetched requisitions for manager:', data);
          setRequisitions(data.requisitions || []);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching requisitions:', error);
          showError('เกิดข้อผิดพลาด', 'โหลดข้อมูล requisitions ไม่สำเร็จ');
          setLoading(false);
        });
    }
  }, [isAuthenticated, user, router, showError]);

  const handleAction = (
    requisition: Requisition,
    action: 'approve' | 'reject'
  ) => {
    setSelectedRequisition(requisition);
    setActionType(action);
    setDialogOpen(true);
    setNote('');
  };

  const handleSubmitAction = async () => {
    if (!selectedRequisition) return;
    
    // Check if rejection note is required for reject action
    if (actionType === 'reject' && (!note || note.trim() === '')) {
      showWarning('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกเหตุผลในการปฏิเสธ (Rejection Note)');
      return;
    }
    
    setSubmitting(true);
    // console.log("selectedRequisition", selectedRequisition);
    try {
      const response = await fetch(
        getApiUrl(
          `/api/requisitions/${selectedRequisition.REQUISITION_ID}/approve`
        ),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: actionType,
            note: note
          })
        }
      );

      if (response.ok) {
        // อัปเดตสถานะใน UI โดยดึงข้อมูลใหม่จาก API orgcode3
        if (user?.ROLE === 'ADMIN') {
          // Admin refresh ข้อมูล
          const refreshResponse = await fetch(
            getApiUrl(`/api/orgcode3?action=getAllRequisitionsForAdmin`)
          );
          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            if (data.requisitions && Array.isArray(data.requisitions)) {
              setRequisitions(data.requisitions);
            } else if (Array.isArray(data)) {
              setRequisitions(data);
            }
          }
        } else {
          // Manager refresh ข้อมูล
          const managerUserId =
            user?.EmpCode || user?.USER_ID || user?.AdLoginName;
          const refreshResponse = await fetch(
            getApiUrl(
              `/api/orgcode3?action=getRequisitionsForManager&userId=${managerUserId}`
            )
          );
          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            setRequisitions(data.requisitions || []);
          }
        }
        setDialogOpen(false);
        
        // Show Success Modal
        showSuccess('Success!', `Requisition ${actionType === 'approve' ? 'ได้รับการอนุมัติ' : 'ถูกปฏิเสธ'} เรียบร้อยแล้ว`);
      } else {
        showError('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดต requisition ได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch {
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดต requisition ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  // เพิ่มฟังก์ชัน refresh สำหรับ Admin
  const handleRefresh = async () => {
    if (!isAuthenticated) return;

    setLoading(true);

    try {
      if (user?.ROLE === 'ADMIN') {
        const response = await fetch(
          getApiUrl(`/api/orgcode3?action=getAllRequisitionsForAdmin`)
        );
        if (response.ok) {
          const data = await response.json();
          if (data.requisitions && Array.isArray(data.requisitions)) {
            setRequisitions(data.requisitions);
          } else if (Array.isArray(data)) {
            setRequisitions(data);
          }
        }
      } else {
        const managerUserId =
          user?.EmpCode || user?.USER_ID || user?.AdLoginName;
        const response = await fetch(
          getApiUrl(
            `/api/orgcode3?action=getRequisitionsForManager&userId=${managerUserId}`
          )
        );
        if (response.ok) {
          const data = await response.json();
          setRequisitions(data.requisitions || []);
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถรีเฟรชข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  // เพิ่มฟังก์ชันดาวน์โหลดไฟล์ Excel/CSV สำหรับ Admin
  const _handleDownload = () => {
    if (!requisitions.length) {
      showInfo('ไม่มีข้อมูล', 'ไม่มีข้อมูลให้ดาวน์โหลด');
      return;
    }

    // สร้างข้อมูล CSV สำหรับใบเบิกสินค้า
    const headers = [
      'ใบเบิกสินค้า',
      'Requisition ID',
      'วันที่ขอเบิก',
      'ผู้ขอเบิก',
      'Site ID',
      'หมายเหตุ',
      'สถานะ',
      'รายการสินค้า',
      'จำนวน',
      'หน่วย',
      'ราคาต่อหน่วย',
      'ราคารวม'
    ];

    // สร้างข้อมูลรายการสินค้าทั้งหมด
    const csvData: (string | number)[][] = [];

    requisitions.forEach((req) => {
      if (req.REQUISITION_ITEMS && req.REQUISITION_ITEMS.length > 0) {
        // สำหรับแต่ละ item ใน requisition
        req.REQUISITION_ITEMS.forEach((item, index) => {
          csvData.push([
            `ใบเบิกสินค้า #${req.REQUISITION_ID}`, // ชื่อเอกสาร
            req.REQUISITION_ID, // Requisition ID
            formatDate(req.SUBMITTED_AT), // วันที่ขอเบิก
            req.USER_ID, // ผู้ขอเบิก
            req.SITE_ID, // Site ID
            req.ISSUE_NOTE || '', // หมายเหตุ
            req.STATUS, // สถานะ
            item.PRODUCT_NAME || 'Unknown Product', // รายการสินค้า
            item.QUANTITY, // จำนวน
            'ชิ้น', // หน่วย (default)
            item.UNIT_PRICE, // ราคาต่อหน่วย
            item.TOTAL_PRICE // ราคารวม
          ]);
        });
      } else {
        // ถ้าไม่มี items ให้ใส่ข้อมูลหลัก
        csvData.push([
          `ใบเบิกสินค้า #${req.REQUISITION_ID}`,
          req.REQUISITION_ID,
          formatDate(req.SUBMITTED_AT),
          req.USER_ID,
          req.SITE_ID,
          req.ISSUE_NOTE || '',
          req.STATUS,
          'ไม่มีรายการสินค้า',
          '',
          '',
          '',
          ''
        ]);
      }
    });

    // รวม headers และ data
    const csvContent = [headers, ...csvData]
      .map((row) => row.map((cell: string | number) => `"${cell}"`).join(','))
      .join('\n');

    // สร้างไฟล์และดาวน์โหลด
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `ใบเบิกสินค้า_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // เพิ่มฟังก์ชันดาวน์โหลดเฉพาะรายการ
  const _handleDownloadSingle = (requisition: Requisition) => {
    if (
      !requisition.REQUISITION_ITEMS ||
      requisition.REQUISITION_ITEMS.length === 0
    ) {
      showInfo('ไม่มีข้อมูล', 'ไม่มีรายการสินค้าให้ดาวน์โหลด');
      return;
    }

    // สร้างข้อมูล CSV สำหรับใบเบิกสินค้าเฉพาะรายการ
    const headers = [
      'ใบเบิกสินค้า',
      'Requisition ID',
      'วันที่ขอเบิก',
      'ผู้ขอเบิก',
      'Site ID',
      'หมายเหตุ',
      'สถานะ',
      'รายการสินค้า',
      'จำนวน',
      'หน่วย',
      'ราคาต่อหน่วย',
      'ราคารวม'
    ];

    // สร้างข้อมูลรายการสินค้าสำหรับ requisition เดียว
    const csvData: (string | number)[][] = [];

    requisition.REQUISITION_ITEMS.forEach((item, index) => {
      csvData.push([
        `ใบเบิกสินค้า #${requisition.REQUISITION_ID}`, // ชื่อเอกสาร
        requisition.REQUISITION_ID, // Requisition ID
        formatDate(requisition.SUBMITTED_AT), // วันที่ขอเบิก
        requisition.USER_ID, // ผู้ขอเบิก
        requisition.SITE_ID, // Site ID
        requisition.ISSUE_NOTE || '', // หมายเหตุ
        requisition.STATUS, // สถานะ
        item.PRODUCT_NAME || 'Unknown Product', // รายการสินค้า
        item.QUANTITY, // จำนวน
        'ชิ้น', // หน่วย (default)
        item.UNIT_PRICE, // ราคาต่อหน่วย
        item.TOTAL_PRICE // ราคารวม
      ]);
    });

    // รวม headers และ data
    const csvContent = [headers, ...csvData]
      .map((row) => row.map((cell: string | number) => `"${cell}"`).join(','))
      .join('\n');

    // สร้างไฟล์และดาวน์โหลด
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `ใบเบิกสินค้า_${requisition.REQUISITION_ID}_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  // เพิ่มฟังก์ชันสำหรับแจ้งเตือนว่าสินค้ามาแล้ว
  const handleNotifyArrival = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setNotifyMessage(
      `สินค้าที่คุณขอเบิก (Requisition #${requisition.REQUISITION_ID}) ได้มาถึงแล้ว กรุณาติดต่อแผนกจัดซื้อเพื่อรับสินค้า`
    );
    setNotifyDialogOpen(true);
  };

  const handleSubmitNotification = async () => {
    if (!selectedRequisition) return;

    setNotifying(true);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub';
      const response = await fetch(`${basePath}/api/notifications/arrival`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requisitionId: selectedRequisition.REQUISITION_ID,
          message: notifyMessage
        })
      });

      if (response.ok) {
        // อัปเดตสถานะเป็น CLOSED หลังจากส่งแจ้งเตือนสำเร็จ
        setRequisitions(prevRequisitions => 
          prevRequisitions.map(req => 
            req.REQUISITION_ID === selectedRequisition.REQUISITION_ID 
              ? { ...req, STATUS: 'CLOSED' }
              : req
          )
        );
        
        showSuccess('ส่งการแจ้งเตือนสำเร็จ!', 'สินค้ามาแล้วและสถานะถูกเปลี่ยนเป็น Closed');
        setNotifyDialogOpen(false);
        setNotifyMessage('');
        setSelectedRequisition(null);
      } else {
        const errorData = await response.json();
        showError('เกิดข้อผิดพลาด', errorData.error);
      }
    } catch (error) {
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถส่งการแจ้งเตือนได้');
      console.error('Error sending notification:', error);
    } finally {
      setNotifying(false);
    }
  };

  // เพิ่มฟังก์ชันสำหรับบันทึกการแก้ไข
  const handleSaveEdit = () => {
    setEditDialogOpen(false);
    if (editingRequisition) {
      generatePDF(editingRequisition);
    }
  };

  // เพิ่มฟังก์ชันสำหรับแก้ไขข้อมูลการโหลดรวม
  const handleEditAllData = () => {
    setEditAllFormData({
      deliveryDate: '',
      contactPerson: '',
      category: '',
      companyName: 'บริษัท ยูไนเต็ด1999 พลัซ จำกัด (สำนักงานใหญ่)',
      companyAddress: '1 ซ.ข้างอำเภอ ถ.ตากสินมหาราช ต.เชิงเนิน อ.เมือง จ.ระยอง 21000',
      fax: '(038) 623433',
      phone: '(038) 623126',
      taxId: '0215542000264',
      fileName: `SUPPLY_REQUEST_ORDER_${selectedYear}${selectedMonth}_${new Date().toISOString().split('T')[0]}`
    });
    setEditAllDialogOpen(true);
  };

  // เพิ่มฟังก์ชันสำหรับบันทึกการแก้ไขข้อมูลการโหลดรวม
  const handleSaveAllEdit = () => {
    setEditAllDialogOpen(false);
    generateAllPDFsByCategory();
  };

  // เพิ่มฟังก์ชันสำหรับแก้ไขรายการสินค้า
  const handleEditItems = async (requisition: Requisition) => {
    try {
      setSavingItems(true);
      const response = await fetch(
        getApiUrl(`/api/requisitions/${requisition.REQUISITION_ID}/items`)
      );
      
      if (response.ok) {
        const items = await response.json();
        // คำนวณ TOTAL_PRICE สำหรับรายการที่ไม่มี
        const itemsWithCalculatedTotal = items.map((item: any) => ({
          ...item,
          TOTAL_PRICE: item.TOTAL_PRICE || (Number(item.QUANTITY || 0) * Number(item.UNIT_PRICE || 0))
        }));
        setEditingItems(itemsWithCalculatedTotal);
        setEditItemsDialogOpen(true);
      } else {
        showError('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดรายการสินค้าได้');
      }
    } catch (error) {
      console.error('Error loading items:', error);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดรายการสินค้าได้');
    } finally {
      setSavingItems(false);
    }
  };

  // เพิ่มฟังก์ชันสำหรับบันทึกรายการสินค้าที่แก้ไข
  const handleSaveItems = async () => {
    if (!editingRequisition) return;

    try {
      setSavingItems(true);
      const response = await fetch(
        getApiUrl(`/api/requisitions/${editingRequisition.REQUISITION_ID}/items`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ items: editingItems })
        }
      );

      if (response.ok) {
        const result = await response.json();
        showSuccess('บันทึกสำเร็จ!', `รายการสินค้าถูกบันทึกเรียบร้อยแล้ว ยอดรวมใหม่: ฿${result.totalAmount.toFixed(2)}`);
        setEditItemsDialogOpen(false);
        
        // รีเฟรชข้อมูล
        await handleRefresh();
      } else {
        const errorData = await response.json();
        showError('เกิดข้อผิดพลาด', errorData.error);
      }
    } catch (error) {
      console.error('Error saving items:', error);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกรายการสินค้าได้');
    } finally {
      setSavingItems(false);
    }
  };

  // เพิ่มฟังก์ชันสำหรับอัปเดตจำนวนสินค้า
  const handleUpdateItemQuantity = (itemId: number, quantity: number) => {
    if (quantity < 0) return;
    
    setEditingItems(prev => 
      prev.map(item => 
        item.ITEM_ID === itemId 
          ? { 
              ...item, 
              QUANTITY: quantity,
              TOTAL_PRICE: quantity * (item.UNIT_PRICE || 0)
            }
          : item
      )
    );
  };

  // เพิ่มฟังก์ชันสำหรับอัปเดตราคาต่อหน่วย
  const handleUpdateItemPrice = (itemId: number, unitPrice: number) => {
    if (unitPrice < 0) return;
    
    setEditingItems(prev => 
      prev.map(item => 
        item.ITEM_ID === itemId 
          ? { 
              ...item, 
              UNIT_PRICE: unitPrice,
              TOTAL_PRICE: item.QUANTITY * unitPrice
            }
          : item
      )
    );
  };

  // เพิ่มฟังก์ชันสำหรับลบรายการสินค้า
  const handleRemoveItem = (itemId: number) => {
    setEditingItems(prev => prev.filter(item => item.ITEM_ID !== itemId));
  };

  // ฟังก์ชันคำนวณยอดรวมที่ปลอดภัย
  const calculateTotalAmount = (items: RequisitionItem[] | undefined | null): number => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => {
      // ใช้ TOTAL_PRICE ถ้ามี หรือคำนวณจาก QUANTITY * UNIT_PRICE
      const totalPrice = Number(item.TOTAL_PRICE) || (Number(item.QUANTITY || 0) * Number(item.UNIT_PRICE || 0));
      return sum + totalPrice;
    }, 0);
  };


  // ฟังก์ชันสร้าง PDF ทั้งหมดทุกรายการ (เก่า - ไม่ใช้แล้ว)
  const _generateAllPDFs = async () => {
    console.log('Starting bulk PDF generation...', {
      filteredRequisitionsCount: filteredRequisitions.length,
      selectedYear,
      selectedMonth,
      activeFilter,
      requisitionsCount: requisitions.length,
      filteredRequisitions: filteredRequisitions.map(r => ({
        id: r.REQUISITION_ID,
        status: r.STATUS,
        submittedAt: r.SUBMITTED_AT,
        itemsCount: r.REQUISITION_ITEMS?.length || 0,
        hasItems: !!(r.REQUISITION_ITEMS && r.REQUISITION_ITEMS.length > 0),
        totalAmount: r.TOTAL_AMOUNT
      }))
    });

    if (filteredRequisitions.length === 0) {
      showInfo('ไม่มีข้อมูล', `ไม่มีข้อมูลให้สร้าง PDF\n- จำนวน requisitions ทั้งหมด: ${requisitions.length}\n- จำนวนที่ผ่าน filter: ${filteredRequisitions.length}\n- ปีที่เลือก: ${selectedYear}\n- เดือนที่เลือก: ${selectedMonth || 'ไม่เลือก'}\n- Filter: ${activeFilter}`);
      return;
    }

    try {
      // สร้าง PDF หลักด้วย autoTable
      const pdf = await createPDFWithAutoTable(filteredRequisitions, editFormData);
      // PDF created with autoTable - no need for html2canvas processing

      // Save the PDF
      const fileName = `Supply_Request_Order_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      showSuccess('สร้าง PDF สำเร็จ', `สร้าง PDF เรียบร้อยแล้ว\nไฟล์: ${fileName}\nจำนวน requisitions: ${filteredRequisitions.length}`);
          } catch (error) {
      console.error('Error generating PDF:', error);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถสร้าง PDF ได้: ' + (error as Error).message);
    }
  };

  // เพิ่มฟังก์ชันสร้าง PDF แบบแยกตามหมวดหมู่
  const generateAllPDFsByCategory = async () => {
    console.log('Starting bulk PDF generation by category...', {
      filteredRequisitionsCount: filteredRequisitions.length,
      selectedYear,
      selectedMonth,
      activeFilter,
      requisitionsCount: requisitions.length,
      filteredRequisitions: filteredRequisitions.map(r => ({
        id: r.REQUISITION_ID,
        status: r.STATUS,
        submittedAt: r.SUBMITTED_AT,
        itemsCount: r.REQUISITION_ITEMS?.length || 0,
        hasItems: !!(r.REQUISITION_ITEMS && r.REQUISITION_ITEMS.length > 0),
        totalAmount: r.TOTAL_AMOUNT
      }))
    });

    if (filteredRequisitions.length === 0) {
      showInfo('ไม่มีข้อมูล', `ไม่มีข้อมูลให้สร้าง PDF\n- จำนวน requisitions ทั้งหมด: ${requisitions.length}\n- จำนวนที่ผ่าน filter: ${filteredRequisitions.length}\n- ปีที่เลือก: ${selectedYear}\n- เดือนที่เลือก: ${selectedMonth || 'ไม่เลือก'}\n- Filter: ${activeFilter}`);
      return;
    }

    try {
      // รวบรวมข้อมูลทั้งหมดและจัดกลุ่มตามหมวดหมู่เท่านั้น
      const allItemsByCategory: Record<string, Array<{requisition: Requisition, item: RequisitionItem}>> = {};
      const categoryTotals: Record<string, number> = {};

      // วนลูปผ่านทุก requisition และจัดกลุ่มตามหมวดหมู่
      for (const requisition of filteredRequisitions) {
        if (!requisition.REQUISITION_ITEMS || requisition.REQUISITION_ITEMS.length === 0) {
          // ลองดึงข้อมูล items ใหม่
          try {
            const response = await fetch(getApiUrl(`/api/requisitions/${requisition.REQUISITION_ID}/items`));
            if (response.ok) {
              const items = await response.json();
              if (items && items.length > 0) {
                requisition.REQUISITION_ITEMS = items;
                console.log(`Fetched ${items.length} items for requisition ${requisition.REQUISITION_ID}`);
              } else {
                console.log(`Still no items for requisition ${requisition.REQUISITION_ID} after fetch`);
                continue;
              }
            } else {
              console.log(`Failed to fetch items for requisition ${requisition.REQUISITION_ID}`);
              continue;
            }
          } catch (error) {
            console.error(`Error fetching items for requisition ${requisition.REQUISITION_ID}:`, error);
            continue;
          }
        }

        // จัดกลุ่ม items ตามหมวดหมู่
        for (const item of requisition.REQUISITION_ITEMS) {
          const category = item.CATEGORY_NAME || 'ไม่ระบุหมวดหมู่';
          
          if (!allItemsByCategory[category]) {
            allItemsByCategory[category] = [];
            categoryTotals[category] = 0;
          }
          
          allItemsByCategory[category].push({ requisition, item });
          categoryTotals[category] += Number(calculateSafeTotalPrice(item)) || 0;
        }
      }

      console.log('Items grouped by category:', {
        categories: Object.keys(allItemsByCategory),
        categoryTotals
      });

      // สร้าง PDF สำหรับแต่ละหมวดหมู่
      const categoryKeys = Object.keys(allItemsByCategory).sort();
      let totalPDFs = 0;
      
      for (const category of categoryKeys) {
        const items = allItemsByCategory[category];
        totalPDFs++;
        
        console.log(`Processing category ${category}`, {
          itemCount: items.length,
          totalAmount: categoryTotals[category]
        });
        
        // เพิ่ม delay ระหว่างการดาวน์โหลดแต่ละไฟล์
        if (totalPDFs > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // รอ 1 วินาที
        }
        
        // ตรวจสอบว่ามีข้อมูลเพียงพอหรือไม่
        if (items.length === 0) {
          console.log(`No items found for category ${category}, skipping...`);
          continue;
        }
        
        // สร้าง PDF ใหม่สำหรับหมวดหมู่นี้
        const pdf = new jsPDF('p', 'mm', 'a4');
        const margin = 10;
        const pageWidth = 210;
        const pageHeight = 297;
        
        // ตรวจสอบว่า PDF object ถูกสร้างขึ้นอย่างถูกต้อง
        if (!pdf) {
          console.error(`Failed to create PDF for category ${category}`);
          continue;
        }

        // ตรวจสอบว่า PDF object มี methods ที่จำเป็น
        if (typeof pdf.setFont !== 'function' || typeof pdf.setFontSize !== 'function') {
          console.error(`PDF object is missing required methods for category ${category}`);
          continue;
        }
        
        // ตั้งค่า font สำหรับภาษาไทย
        setupThaiFont(pdf);

        // เรียงลำดับ items ตาม requisition ID และ item order
        items.sort((a, b) => {
          const aId = String(a.requisition.REQUISITION_ID);
          const bId = String(b.requisition.REQUISITION_ID);
          if (aId !== bId) {
            return aId.localeCompare(bId);
          }
          return 0; // ถ้าเป็น requisition เดียวกัน ให้เรียงตามลำดับเดิม
        });

        // จัดกลุ่ม items ตามคนก่อน แล้วสร้างรายการ items
        const itemsByUser = items.reduce((acc, { requisition, item }) => {
          const userId = requisition.USER_ID;
          if (!acc[userId]) {
            acc[userId] = {
              user: requisition,
              items: []
            };
          }
          acc[userId].items.push({ requisition, item });
          return acc;
        }, {} as Record<string, { user: Requisition, items: Array<{requisition: Requisition, item: RequisitionItem}> }>);

        // ดึงข้อมูลผู้ใช้จาก userWithRoles สำหรับทุกคน
        const userDataMap: Record<string, { fullName: string, department: string, costCenterCode: string }> = {};
        for (const userId of Object.keys(itemsByUser)) {
          try {
            // เพิ่ม timeout สำหรับการ fetch
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 วินาที timeout
            
            const response = await fetch(getApiUrl(`/api/orgcode3?action=getUserOrgCode4&userId=${userId}`), {
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              userDataMap[userId] = {
                fullName: data.fullNameThai || data.fullNameEng || userId,
                department: data.costCenterEng || 'N/A',
                costCenterCode: data.costcentercode || 'N/A'
              };
            } else {
              userDataMap[userId] = {
                fullName: userId,
                department: 'N/A',
                costCenterCode: 'N/A'
              };
            }
          } catch (error) {
            console.error(`Error fetching user data for ${userId}:`, error);
            userDataMap[userId] = {
              fullName: userId,
              department: 'N/A',
              costCenterCode: 'N/A'
            };
          }
        }

        // สร้าง table data สำหรับ autoTable
        const tableData: any[] = [];
        
        Object.entries(itemsByUser).forEach(([userId, { user, items: userItems }]) => {
          const userData = userDataMap[userId] || { fullName: userId, department: 'N/A', costCenterCode: 'N/A' };
          
          // เพิ่ม user header
          tableData.push([`ผู้สั่ง: ${userData.fullName} - ${userData.department} - ${userData.costCenterCode} - (${userItems.length} รายการ)`, '', '', '', '', '']);
          
          // เพิ่ม items ของ user นี้
          userItems.forEach(({ requisition, item }) => {
            tableData.push([
              (item as any).PRODUCT_ITEM_ID || item.ITEM_ID || 'N/A',
              item.PRODUCT_NAME,
              item.QUANTITY,
              item.ORDER_UNIT || 'ชิ้น',
              `฿${formatNumberWithCommas(Number(item.UNIT_PRICE))}`,
              `฿${calculateSafeTotalPrice(item)}`
            ]);
          });
        });

        // ตรวจสอบว่ามีข้อมูลใน tableData หรือไม่
        if (tableData.length === 0) {
          console.log(`No data for category ${category}, skipping...`);
          continue;
        }

        console.log(`Creating PDF for category ${category}`, {
          tableDataLength: tableData.length,
          itemsCount: items.length,
          usersCount: Object.keys(itemsByUser).length
        });

        // สร้าง header สำหรับ PDF
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.text('SUPPLY REQUEST ORDER', pageWidth / 2, 20, { align: 'center' });
        
        // Company info
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(editAllFormData.companyName, margin, 30);
        pdf.text(editAllFormData.companyAddress, margin, 35);
        pdf.text(`TEL: ${editAllFormData.phone} FAX: ${editAllFormData.fax}`, margin, 40);
        pdf.text(`เลขประจำตัวผู้เสียภาษี ${editAllFormData.taxId}`, margin, 45);
        
        // Date
        const nowDate = new Date();
        const thaiMonthsShortList = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const dateNum = nowDate.getDate().toString().padStart(2, '0');
        const month = thaiMonthsShortList[nowDate.getMonth()];
        const year = (nowDate.getFullYear() + 543).toString().slice(-4);
        const hours = nowDate.getHours().toString().padStart(2, '0');
        const minutes = nowDate.getMinutes().toString().padStart(2, '0');
        const currentDate = `${dateNum} ${month} ${year} ${hours}:${minutes}`;
        
        pdf.text(`Date: ${currentDate}`, pageWidth - margin - 50, 30);
        
        // Delivery info
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Please Delivery on:', margin, 55);
        pdf.setFont('helvetica', 'normal');
        pdf.text(editAllFormData.deliveryDate || '_________________', margin, 60);
        pdf.text('หมายเหตุ: ต้องการสินค้าด่วน', margin, 65);
        pdf.text(`ต้องการข้อมูลเพิ่มเติมโปรดติดต่อ: ${editAllFormData.contactPerson || 'N/A'}`, margin, 70);
        
        // Category info
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`หมวดหมู่: ${category}`, margin, 80);

        // ตั้งค่า font สำหรับ autoTable
        setupThaiFont(pdf);

        // ตรวจสอบและเพิ่ม autoTable plugin หากจำเป็น
        if (!pdf.autoTable) {
          (pdf as any).autoTable = autoTable;
        }

        // ตรวจสอบอีกครั้งว่า autoTable พร้อมใช้งาน
        if (!pdf.autoTable && !(pdf as any).autoTable) {
          console.error(`autoTable plugin not available for category ${category}`);
          showError('เกิดข้อผิดพลาด', `ไม่สามารถใช้ autoTable สำหรับหมวดหมู่ ${category} ได้`);
          continue;
        }

        // ตรวจสอบว่า PDF object ยังคงถูกต้อง
        if (!pdf || typeof pdf.setFont !== 'function') {
          console.error(`PDF object is invalid for category ${category}`);
          showError('เกิดข้อผิดพลาด', `PDF object ไม่ถูกต้องสำหรับหมวดหมู่ ${category}`);
          continue;
        }

        // สร้างตารางด้วย autoTable
        try {
          // ตรวจสอบว่า pdf object ยังคงถูกต้อง
          if (!pdf) {
            console.error(`PDF object is null or undefined for category ${category}`);
            showError('เกิดข้อผิดพลาด', `PDF object ไม่ถูกต้องสำหรับหมวดหมู่ ${category}`);
          continue;
        }

          // ตรวจสอบว่า pdf object มี methods ที่จำเป็น
          if (typeof pdf.setFont !== 'function' || typeof pdf.setFontSize !== 'function') {
            console.error(`PDF object is missing required methods for category ${category}`);
            showError('เกิดข้อผิดพลาด', `PDF object ไม่มี methods ที่จำเป็นสำหรับหมวดหมู่ ${category}`);
            continue;
          }

          // ตรวจสอบว่า autoTable พร้อมใช้งาน
          if (!(pdf as any).autoTable) {
            console.error(`autoTable is not available for category ${category}`);
            showError('เกิดข้อผิดพลาด', `autoTable ไม่พร้อมใช้งานสำหรับหมวดหมู่ ${category}`);
            continue;
          }

          console.log(`Creating autoTable for category ${category}`, {
            pdfExists: !!pdf,
            pdfType: typeof pdf,
            autoTableExists: !!(pdf as any).autoTable,
            tableDataLength: tableData.length
          });

          // ใช้ (pdf as any).autoTable เพื่อให้แน่ใจว่าใช้งานได้
          (pdf as any).autoTable({
          head: [['ITEM_ID', 'Description', 'Qty', 'Unit', 'Unit Price', 'Total']],
          body: tableData,
          startY: 90,
          margin: { left: margin, right: margin, top: 10, bottom: 20 },
          styles: {
            ...setupAutoTableThaiFont(),
          },
          headStyles: {
            fillColor: [233, 236, 239],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 3,
            overflow: 'linebreak',
            minCellHeight: 8,
            valign: 'middle',
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250],
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 20 }, // ITEM_ID
            1: { halign: 'left', cellWidth: 60 },   // Description
            2: { halign: 'center', cellWidth: 15 }, // Qty
            3: { halign: 'center', cellWidth: 15 }, // Unit
            4: { halign: 'right', cellWidth: 25 },  // Unit Price
            5: { halign: 'right', cellWidth: 25 },  // Total
          },
          // ตั้งค่า pagination ที่เหมาะสม
          tableWidth: 'wrap',
          showHead: 'everyPage',
          // ป้องกันการตัดแถวตาราง
          pageBreak: 'avoid',
          rowPageBreak: 'avoid',
          // ตั้งค่าให้แถวไม่ถูกตัดครึ่ง
          keepWithHeaderRows: 1,
          didDrawPage: (data: any) => {
            // Page numbering
            const pageCount = pdf.getNumberOfPages();
            pdf.setFontSize(10);
            pdf.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
          },
          // จัดการการแบ่งหน้าให้ดีขึ้น
          didParseCell: (data: any) => {
            // จัดการ user header rows
            const rowData = data.row.raw;
            if (rowData && rowData[1] === '' && rowData[2] === '' && rowData[3] === '' && rowData[4] === '' && rowData[5] === '') {
              // User header row
              data.cell.styles.fillColor = [240, 240, 240];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 10;
              data.cell.styles.halign = 'left';
              data.cell.styles.valign = 'middle';
              data.cell.styles.cellPadding = { top: 4, right: 3, bottom: 4, left: 6 };
              // ป้องกันการตัด user header
              data.cell.styles.pageBreak = 'avoid';
            } else {
              // สำหรับแถวข้อมูลสินค้า ป้องกันการตัดแถว
              data.cell.styles.pageBreak = 'avoid';
              data.cell.styles.minCellHeight = 8;
            }
          },
          // เพิ่มการจัดการการแบ่งหน้า
          willDrawCell: (data: any) => {
            // ตรวจสอบว่ามีพื้นที่เพียงพอสำหรับแถวนี้หรือไม่
            const remainingHeight = pdf.internal.pageSize.height - data.cursor.y;
            const rowHeight = 12; // ความสูงของแถว
            
            if (remainingHeight < rowHeight && data.row.index > 0) {
              // ถ้าไม่มีพื้นที่เพียงพอ ให้ขึ้นหน้าใหม่
              pdf.addPage();
              data.cursor.y = 20; // เริ่มต้นที่ตำแหน่งใหม่
            }
          }
        });
        } catch (autoTableError) {
          console.error(`Error creating autoTable for category ${category}:`, autoTableError);
          showError('เกิดข้อผิดพลาด', `ไม่สามารถสร้างตารางสำหรับหมวดหมู่ ${category} ได้: ${(autoTableError as Error).message}`);
          continue;
        }

        // บันทึก PDF
        try {
        const fileName = editAllFormData.fileName || `SUPPLY_REQUEST_ORDER_${category.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedYear}${selectedMonth || ''}_${new Date().toISOString().split('T')[0]}`;
          pdf.save(`${fileName}.pdf`);
        console.log(`PDF for category ${category} saved: ${fileName}.pdf`);
        } catch (saveError) {
          console.error(`Error saving PDF for category ${category}:`, saveError);
          showError('เกิดข้อผิดพลาด', `ไม่สามารถบันทึก PDF สำหรับหมวดหมู่ ${category} ได้: ${(saveError as Error).message}`);
          continue;
        }
      }

      showSuccess('สร้าง PDF สำเร็จ!', `ไฟล์ PDF ทั้งหมด ${totalPDFs} ไฟล์ถูกสร้างและดาวน์โหลดแล้ว (แยกตามหมวดหมู่)`);
    } catch (error) {
      console.error('Error generating PDFs by user and category:', error);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถสร้าง PDF ได้: ' + (error as Error).message);
    }
  };

  // เพิ่มฟังก์ชันสร้าง PDF สำหรับใบเบิกสินค้า
  const generatePDF = async (requisition: Requisition) => {
    // ตรวจสอบและโหลดข้อมูล items หากจำเป็น
    let itemsToUse = requisition.REQUISITION_ITEMS;
    
    if (!itemsToUse || itemsToUse.length === 0) {
      try {
        const response = await fetch(
          getApiUrl(`/api/requisitions/${requisition.REQUISITION_ID}/items`)
        );
        
        if (response.ok) {
          itemsToUse = await response.json();
        } else {
          showError('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดรายการสินค้าได้');
          return;
        }
      } catch (error) {
        console.error('Error loading items for PDF:', error);
        showError('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดรายการสินค้าได้');
        return;
      }
    }
    
    if (!itemsToUse || itemsToUse.length === 0) {
      showInfo('ไม่มีข้อมูล', 'ไม่มีรายการสินค้าให้สร้าง PDF');
      return;
    }

    // ดึง OrgCode4 และข้อมูลชื่อพนักงานของ user สำหรับแสดงใน Cost Center
    let userOrgCode4 = requisition.SITE_ID; // fallback to SITE_ID
    let userOrgTDesc3 = 'N/A'; // fallback to N/A
    let userFullName = requisition.USER_ID; // fallback to USER_ID
    let userDepartment = requisition.DEPARTMENT || 'N/A'; // fallback to requisition.DEPARTMENT
    let userCostCenterCode = requisition.SITE_ID || '';
    try {
      const response = await fetch(getApiUrl(`/api/orgcode3?action=getUserOrgCode4&userId=${requisition.USER_ID}`));
      if (response.ok) {
        const data = await response.json();
        userOrgCode4 = data.orgCode4 || requisition.SITE_ID;
        userOrgTDesc3 = data.orgTDesc3 || 'N/A';
        // ใช้ชื่อไทยก่อน หากไม่มีให้ใช้ชื่ออังกฤษ หากไม่มีให้ใช้ USER_ID
        userFullName = data.fullNameThai || data.fullNameEng || requisition.USER_ID;
        // ใช้ CostCenterEng จาก userWithRoles แทน requisition.DEPARTMENT
        userDepartment = data.costCenterEng || requisition.DEPARTMENT || 'N/A';
        userCostCenterCode = data.costcentercode || requisition.SITE_ID || '';
        console.log('PDF Data:', { userOrgCode4, userOrgTDesc3, userFullName, userDepartment, requisition: requisition.REQUISITION_ID });
      }
    } catch (error) {
      console.error('Error fetching user OrgCode4:', error);
    }

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!userOrgCode4) {
      userOrgCode4 = requisition.SITE_ID || 'N/A';
    }
    if (!userOrgTDesc3) {
      userOrgTDesc3 = 'N/A';
    }
    if (!userCostCenterCode) {
      userCostCenterCode = 'N/A';
    }
    
    // สร้าง requisition object ที่มี items ที่ถูกต้อง
    const requisitionWithItems = {
      ...requisition,
      REQUISITION_ITEMS: itemsToUse
    };

    let tempDiv: HTMLDivElement | null = null;
    try {
      // สร้าง HTML element ชั่วคราว
      tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '210mm'; // A4 width
      tempDiv.style.padding = '20mm';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '11px';
      tempDiv.style.lineHeight = '1.2';

      // สร้าง HTML content สำหรับ SUPPLY REQUEST ORDER
      // ประมาณการความสูงของเนื้อหา
      const estimatedContentHeight = 200 + (itemsToUse.length * 25);
      const needsMultiplePages = estimatedContentHeight > 250;
      
      // สร้าง HTML content โดยใช้ฟังก์ชัน
      const generateHTMLContent = () => {
        console.log('Generating HTML with data:', { 
          userOrgCode4, 
          userOrgTDesc3, 
          requisition: requisition.REQUISITION_ID,
          itemsCount: itemsToUse.length 
        });
        
        const groupedItems = itemsToUse.reduce((acc, item) => {
          const category = item.CATEGORY_NAME || 'ไม่ระบุหมวดหมู่';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(item);
          return acc;
        }, {} as Record<string, typeof itemsToUse>);

        const sortedCategories = Object.keys(groupedItems).sort();


        const categoryHTML = sortedCategories.map(category => {
          const items = groupedItems[category];
          const categoryItemsHTML = items.map(item => {
            const itemHTML = `
              <tr style="border-bottom: 1px solid #eee; page-break-inside: avoid; break-inside: avoid;">
                <td style="padding: 8px; text-align: center; font-size: 10px;">${(item as any).PRODUCT_ITEM_ID || item.ITEM_ID || 'N/A'}</td>
                <td style="padding: 8px; font-size: 10px;">${item.PRODUCT_NAME || 'Unknown Product'}</td>
                <td style="padding: 8px; text-align: center; font-size: 10px;">${item.QUANTITY}</td>
                <td style="padding: 8px; text-align: center; font-size: 10px;">ชิ้น</td>
                <td style="padding: 8px; text-align: right; font-size: 10px;">฿${formatNumberWithCommas(Number(item.UNIT_PRICE || 0))}</td>
                <td style="padding: 8px; text-align: right; font-size: 10px; font-weight: bold;">฿${calculateSafeTotalPrice(item)}</td>
              </tr>
            `;
            return itemHTML;
          }).join('');

          return `
            <tr style="background: #f8f9fa; page-break-inside: avoid; break-inside: avoid;">
              <td colspan="6" style="padding: 8px; font-weight: bold; font-size: 11px; color: #333;">${category}</td>
            </tr>
            ${categoryItemsHTML}
          `;
        }).join('');

        return `
          <div style="padding: 20px;">
            <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">SUPPLY REQUEST ORDER</h1>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
              <div style="text-align: left;">
                <p style="margin: 0 0 2px 0; font-size: 10px; font-weight: bold;">${editFormData.companyName}</p>
                <p style="margin: 0 0 2px 0; font-size: 10px;">${editFormData.companyAddress}</p>
                <p style="margin: 0 0 2px 0; font-size: 10px;">TEL: ${editFormData.phone} FAX: ${editFormData.fax}</p>
                <p style="margin: 0 0 2px 0; font-size: 10px;">เลขประจำตัวผู้เสียภาษี ${editFormData.taxId}</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0 0 2px 0; font-size: 10px;"><strong>Date:</strong> ${formatDate(requisition.SUBMITTED_AT)}</p>
                <p style="margin: 0 0 2px 0; font-size: 10px;"><strong>Requisition ID:</strong> #${requisition.REQUISITION_ID}</p>
              </div>
            </div>
            
            <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc; background: #f9f9f9;">
              <h3 style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold;">Please Delivery on:</h3>
              <p style="margin: 0 0 3px 0; font-size: 11px;">${editFormData.deliveryDate || '_________________________________'}</p>
              <p style="margin: 0 0 3px 0; font-size: 11px;"><strong>หมายเหตุ:</strong> ${requisition.ISSUE_NOTE || 'ไม่มีหมายเหตุ'}</p>
              <p style="margin: 0 0 3px 0; font-size: 11px;"><strong>ต้องการข้อมูลเพิ่มเติมโปรดติดต่อ:</strong> ${editFormData.contactPerson || 'N/A'}</p>
            </div>
            
            <div style="margin-bottom: 25px;">
              <div style="background: #f5f5f5; padding: 8px 12px; border: 1px solid #ddd; border-bottom: none; font-weight: bold; font-size: 12px;">
                <div style="font-size: 12px; color: #333; line-height: 1.4;">
                  <strong>Cost Center:</strong> ${userOrgCode4} | 
                  <strong>ผู้สั่ง:</strong> ${userFullName} - ${requisition.USER_ID} (${userCostCenterCode}) | 
                  <strong>แผนก:</strong> ${userDepartment}
                </div>
              </div>
              
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                <thead>
                  <tr style="background: #e9ecef;">
                    <th style="padding: 8px; border: 1px solid #ddd; font-size: 10px; font-weight: bold;">ITEM_ID</th>
                    <th style="padding: 8px; border: 1px solid #ddd; font-size: 10px; font-weight: bold;">Description</th>
                    <th style="padding: 8px; border: 1px solid #ddd; font-size: 10px; font-weight: bold;">Qty</th>
                    <th style="padding: 8px; border: 1px solid #ddd; font-size: 10px; font-weight: bold;">Unit</th>
                    <th style="padding: 8px; border: 1px solid #ddd; font-size: 10px; font-weight: bold;">Unit Price</th>
                    <th style="padding: 8px; border: 1px solid #ddd; font-size: 10px; font-weight: bold;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoryHTML}
                </tbody>
              </table>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f0f8ff; border: 1px solid #2196f3; border-radius: 5px;">
              <h3 style="margin: 0 0 5px 0; color: #1976d2; font-size: 12px;">สรุปยอดรวม</h3>
              <div style="font-size: 16px; font-weight: bold; color: #1976d2; text-align: right;">ยอดรวมทั้งหมด: ฿${formatNumberWithCommas(Number(requisition.TOTAL_AMOUNT))}</div>
              <p style="margin: 5px 0 0 0; color: #1976d2; font-size: 10px;">จำนวนรายการ: ${itemsToUse.length} รายการ</p>
              <p style="margin: 2px 0 0 0; color: #1976d2; font-size: 10px;">สถานะ: ${requisition.STATUS}</p>
              <p style="margin: 2px 0 0 0; color: #1976d2; font-size: 10px;">แผนก: ${userDepartment}</p>
            </div>
          </div>
        `;
      };
      
      tempDiv.innerHTML = generateHTMLContent();

      // เพิ่ม element ลงใน DOM
      document.body.appendChild(tempDiv);

      // รอให้ content render เสร็จ
      await new Promise((resolve) => setTimeout(resolve, 100));

      // แปลง HTML เป็น canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      console.log('Canvas generated:', { 
        width: canvas.width, 
        height: canvas.height,
        hasContent: canvas.width > 0 && canvas.height > 0
      });

      // ลบ element ชั่วคราว
      if (tempDiv && tempDiv.parentNode) {
      document.body.removeChild(tempDiv);
      }

      // ตรวจสอบ canvas ก่อนสร้าง PDF
      if (canvas.width === 0 || canvas.height === 0) {
        showError('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างภาพได้');
        return;
      }

      // สร้าง PDF
      const imgData = canvas.toDataURL('image/png');
      console.log('Image data generated:', { 
        dataLength: imgData.length,
        hasData: imgData.length > 100
      });
      const pdf = new jsPDF('p', 'mm', 'a4');
      // Shared pagination/margin config
      const margin = 10;
      const bottomMargin = 15;
      const pageWidth = 210;
      const pageHeightFull = 297;
      const imgWidth = pageWidth - margin * 2;
      const usablePageHeight = pageHeightFull - margin - bottomMargin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // ตรวจสอบว่าต้องแบ่งหน้าไหม
      if (imgHeight <= usablePageHeight) {
        // เนื้อหาไม่เกินหน้าเดียว
        renderImageWithMargins(pdf, imgData, canvas.width, canvas.height);
        
        // เพิ่มหมายเลขหน้า
        pdf.setFontSize(10);
        pdf.setTextColor(102, 102, 102);
        pdf.text(`Page 1 of 1`, 105, pageHeightFull - bottomMargin / 2, { align: 'center' });
      } else {
        // เนื้อหาเกินหน้าเดียว - แบ่งเป็นหลายหน้า
        let currentPage = 1;
        let yOffset = 0;
        const totalPages = Math.ceil(imgHeight / usablePageHeight);
        
        while (yOffset < imgHeight) {
          if (currentPage > 1) {
            pdf.addPage();
          }
          
          // คำนวณความสูงของส่วนที่จะแสดงในหน้านี้
          const remainingHeight = imgHeight - yOffset;
          const _pageContentHeight = Math.min(usablePageHeight, remainingHeight);
          
          // เพิ่มรูปภาพเฉพาะส่วนที่ต้องการ
          renderImageWithMargins(pdf, imgData, canvas.width, canvas.height);
          
          // เพิ่มหมายเลขหน้า
          pdf.setFontSize(10);
          pdf.setTextColor(102, 102, 102);
          pdf.text(`Page ${currentPage} of ${totalPages}`, 105, pageHeightFull - bottomMargin / 2, { align: 'center' });
          
          // เพิ่ม footer เฉพาะหน้าสุดท้าย
          if (currentPage === totalPages) {
            pdf.setFontSize(8);
            pdf.setTextColor(102, 102, 102);
            pdf.text('Document created by StationaryHub System', 105, pageHeightFull - bottomMargin - 2, { align: 'center' });
            pdf.text(`Created: ${(() => {
              const now = new Date();
              const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
              const dateNum = now.getDate().toString().padStart(2, '0');
              const month = thaiMonthsShort[now.getMonth()];
              const year = (now.getFullYear() + 543).toString().slice(-4);
              const hours = now.getHours().toString().padStart(2, '0');
              const minutes = now.getMinutes().toString().padStart(2, '0');
              return `${dateNum} ${month} ${year} ${hours}:${minutes}`;
            })()}`, 105, pageHeightFull - bottomMargin - 7, { align: 'center' });
          }
          
          yOffset += usablePageHeight;
          currentPage++;
        }
      }

      // ตรวจสอบ PDF ก่อนดาวน์โหลด
      const pdfOutput = pdf.output('datauristring');
      console.log('PDF generated:', { 
        pdfLength: pdfOutput.length,
        hasContent: pdfOutput.length > 1000
      });

      if (pdfOutput.length < 1000) {
        showError('เกิดข้อผิดพลาด', 'ไฟล์ PDF ไม่มีเนื้อหา');
        return;
      }

      // ดาวน์โหลด PDF
      const fileName = editFormData.fileName || `SUPPLY_REQUEST_ORDER_${requisition.REQUISITION_ID}_${new Date().toISOString().split('T')[0]}`;
      pdf.save(`${fileName}.pdf`);

      showSuccess('สร้าง PDF สำเร็จ!', 'ไฟล์ SUPPLY REQUEST ORDER PDF ถูกสร้างและดาวน์โหลดแล้ว');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถสร้าง PDF ได้: ' + (error as Error).message);
    } finally {
      // ตรวจสอบและลบ tempDiv หากยังค้างอยู่
      if (tempDiv && tempDiv.parentNode) {
        try {
          document.body.removeChild(tempDiv);
        } catch (cleanupError) {
          console.warn('Error cleaning up tempDiv:', cleanupError);
        }
      }
    }
  };

  // เพิ่มฟังก์ชันสำหรับเปิดหน้าแก้ไข
  const handleEdit = async (requisition: Requisition) => {
    try {
      setEditingRequisition(requisition);
      
      // โหลดข้อมูล requisition items ใหม่
      const response = await fetch(
        getApiUrl(`/api/requisitions/${requisition.REQUISITION_ID}/items`)
      );
      
      if (response.ok) {
        const items = await response.json();
        // อัปเดต requisition ด้วย items ที่โหลดมาใหม่
        const updatedRequisition = {
          ...requisition,
          REQUISITION_ITEMS: items
        };
        setEditingRequisition(updatedRequisition);
      }
      
      setEditFormData({
        deliveryDate: requisition.deliveryDate || '',
        contactPerson: requisition.contactPerson || '',
        category: requisition.category || '',
        companyName: 'บริษัท ยูไนเต็ด1999 พลัซ จำกัด (สำนักงานใหญ่)',
        companyAddress: '1 ซ.ข้างอำเภอ ถ.ตากสินมหาราช ต.เชิงเนิน อ.เมือง จ.ระยอง 21000',
        fax: '(038) 623433',
        phone: '(038) 623126',
        taxId: '0215542000264',
        fileName: `SUPPLY_REQUEST_ORDER_${requisition.REQUISITION_ID}_${new Date().toISOString().split('T')[0]}`
      });
      setEditDialogOpen(true);
    } catch (error) {
      console.error('Error loading requisition items for edit:', error);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลรายการสินค้าได้');
    }
  };

  const handleView = async (requisition: Requisition) => {
    console.log('Viewing requisition:', requisition);
    console.log('Requisition items:', requisition.REQUISITION_ITEMS);

    try {
      // ดึงข้อมูล requisition ใหม่พร้อม items
      const response = await fetch(
        getApiUrl(`/api/requisitions/${requisition.REQUISITION_ID}`)
      );
      if (response.ok) {
        const detailedRequisition = await response.json();
        console.log('Detailed requisition:', detailedRequisition);
        setSelectedRequisition(detailedRequisition);
      } else {
        console.error('Failed to fetch detailed requisition');
        setSelectedRequisition(requisition);
      }
    } catch (error) {
      console.error('Error fetching detailed requisition:', error);
      setSelectedRequisition(requisition);
    }

    setViewDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'APPROVED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'REJECTED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'CLOSED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'APPROVED':
        return <CheckSquare className="h-4 w-4" />;
      case 'REJECTED':
        return <AlertTriangle className="h-4 w-4" />;
      case 'CLOSED':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return ThaiDateUtils.formatShortThaiDate(dateString);
  };

  // ฟังก์ชันสำหรับฟิลเตอร์ข้อมูล
  const getFilteredRequisitions = () => {
    let filtered = requisitions;

    // กรองตามสถานะที่เลือก
    switch (activeFilter) {
      case 'pending':
        filtered = requisitions.filter((r) => r.STATUS === 'PENDING');
        break;
      case 'approved':
        filtered = requisitions.filter((r) => r.STATUS === 'APPROVED');
        break;
      case 'rejected':
        filtered = requisitions.filter((r) => r.STATUS === 'REJECTED');
        break;
      case 'closed':
        filtered = requisitions.filter((r) => r.STATUS === 'CLOSED');
        break;
      default:
        // สำหรับ "all" ให้เรียงลำดับ: PENDING อยู่ด้านบน, APPROVED/REJECTED/CLOSED อยู่ด้านล่าง
        filtered = [...requisitions].sort((a, b) => {
          if (a.STATUS === 'PENDING' && b.STATUS !== 'PENDING') return -1;
          if (a.STATUS !== 'PENDING' && b.STATUS === 'PENDING') return 1;
          return 0;
        });
        break;
    }

    // กรองตามเดือนและปีที่เลือก
    if (selectedYear) {
      filtered = filtered.filter((r) => {
        const date = new Date(r.SUBMITTED_AT);
        const year = date.getFullYear().toString();
        
        // ถ้าเลือกทั้งเดือนและปี
        if (selectedMonth) {
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          return month === selectedMonth && year === selectedYear;
        }
        
        // ถ้าเลือกแค่ปี
        return year === selectedYear;
      });
    }

    return filtered;
  };

  const filteredRequisitions = getFilteredRequisitions();

  const pendingCount = requisitions.filter(
    (r) => r.STATUS === 'PENDING'
  ).length;
  const approvedCount = requisitions.filter(
    (r) => r.STATUS === 'APPROVED'
  ).length;
  const rejectedCount = requisitions.filter(
    (r) => r.STATUS === 'REJECTED'
  ).length;
  const closedCount = requisitions.filter(
    (r) => r.STATUS === 'CLOSED'
  ).length;

  if (
    !isAuthenticated ||
    (user?.ROLE !== 'MANAGER' && user?.ROLE !== 'ADMIN')
  ) {
    return null;
  }

  // ฟังก์ชันสำหรับสร้าง URL รูปภาพที่ถูกต้อง
  const getImageUrl = (photoUrl: string | null | undefined) => {
    if (!photoUrl) return getBasePathUrl('/placeholder.jpg');

    // ถ้าเป็น URL เต็มแล้ว ให้ใช้เลย
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }

    // เรียกผ่าน API image โดยใช้ base path แต่ API จะใช้ PATH_FILE_URL เป็น root
    // ถ้าเป็น path ที่เริ่มต้นด้วย / ให้เรียกผ่าน API image
    if (photoUrl.startsWith('/')) {
      const filename = photoUrl.substring(1); // ลบ / ออก
      return getBasePathUrl(`/api/image/${filename}`);
    }

    // ถ้าเป็น filename ที่ไม่มี path ให้เรียกผ่าน API image
    return getBasePathUrl(`/api/image/${photoUrl}`);
  };

  // ฟังก์ชันจัดกลุ่มสินค้าตามหมวดหมู่
  const groupItemsByCategory = (items: RequisitionItem[]) => {
    const grouped = items.reduce((acc, item) => {
      const category = item.CATEGORY_NAME || 'ไม่ระบุหมวดหมู่';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, RequisitionItem[]>);

    // เรียงลำดับหมวดหมู่
    const sortedCategories = Object.keys(grouped).sort();
    return sortedCategories.map(category => ({
      category,
      items: grouped[category]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="container mx-auto px-4 py-8"
      >
        {/* Header Section */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <CheckSquare className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Requisition Approvals
                </h1>
                <p className="text-gray-600 mt-2">
                  Review and manage pending requisitions with ease
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="flex gap-3"
            >
              {/* Download All PDFs Button - แสดงเฉพาะเมื่อมีข้อมูลและเป็น ADMIN เท่านั้น */}
              {filteredRequisitions.length > 0 && user?.ROLE === 'ADMIN' && (
        <Button
          onClick={handleEditAllData}
          disabled={loading}
          className="px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white border-0 shadow-md hover:shadow-xl"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            ดาวน์โหลด PDF ทั้งหมด ({filteredRequisitions.length})
          </div>
        </Button>
              )}

              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="outline"
                className="px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </div>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-700">
                    {pendingCount}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Approved</p>
                  <p className="text-3xl font-bold text-green-700">
                    {approvedCount}
                  </p>
                </div>
                <CheckSquare className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Rejected</p>
                  <p className="text-3xl font-bold text-red-700">
                    {rejectedCount}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <Card className="bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-wrap gap-2 p-4">
                <Button
                  variant={activeFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setActiveFilter('all')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeFilter === 'all'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl'
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  All ({requisitions.length})
                </Button>

                <Button
                  variant={activeFilter === 'pending' ? 'default' : 'outline'}
                  onClick={() => setActiveFilter('pending')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeFilter === 'pending'
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg hover:shadow-xl'
                      : 'hover:bg-yellow-50 border-yellow-200 text-yellow-700'
                  }`}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Pending ({pendingCount})
                </Button>

                <Button
                  variant={activeFilter === 'approved' ? 'default' : 'outline'}
                  onClick={() => setActiveFilter('approved')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeFilter === 'approved'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl'
                      : 'hover:bg-green-50 border-green-200 text-green-700'
                  }`}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Approved ({approvedCount})
                </Button>

                <Button
                  variant={activeFilter === 'rejected' ? 'default' : 'outline'}
                  onClick={() => setActiveFilter('rejected')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeFilter === 'rejected'
                      ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg hover:shadow-xl'
                      : 'hover:bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Rejected ({rejectedCount})
                </Button>

                <Button
                  variant={activeFilter === 'closed' ? 'default' : 'outline'}
                  onClick={() => setActiveFilter('closed')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeFilter === 'closed'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-xl'
                      : 'hover:bg-blue-50 border-blue-200 text-blue-700'
                  }`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Closed ({closedCount})
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Month/Year Filter - แสดงสำหรับ Admin และ Manager */}
        {(user?.ROLE === 'ADMIN' || user?.ROLE === 'MANAGER') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <Card className="bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <CalendarToday className="h-5 w-5 text-blue-600" />
                    <span className="text-lg font-semibold text-gray-800">กรองตามเดือน:</span>
                  </div>
                  
                  <div className="flex gap-4">
                    {/* Year Input */}
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-600 mb-1">ปี</label>
                      <input
                        type="number"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        min="2000"
                        max="2100"
                        placeholder="เช่น 2025"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Month Dropdown */}
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-600 mb-1">เดือน</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">ทั้งหมด</option>
                        {[
                          { value: '01', label: 'มกราคม' },
                          { value: '02', label: 'กุมภาพันธ์' },
                          { value: '03', label: 'มีนาคม' },
                          { value: '04', label: 'เมษายน' },
                          { value: '05', label: 'พฤษภาคม' },
                          { value: '06', label: 'มิถุนายน' },
                          { value: '07', label: 'กรกฎาคม' },
                          { value: '08', label: 'สิงหาคม' },
                          { value: '09', label: 'กันยายน' },
                          { value: '10', label: 'ตุลาคม' },
                          { value: '11', label: 'พฤศจิกายน' },
                          { value: '12', label: 'ธันวาคม' }
                        ].map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Clear Filter Button */}
                    {(selectedMonth || selectedYear !== new Date().getFullYear().toString()) && (
                      <button
                        onClick={() => {
                          setSelectedMonth('');
                          setSelectedYear(new Date().getFullYear().toString());
                        }}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        ล้างตัวกรอง
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Summary */}
                {(selectedMonth || selectedYear !== new Date().getFullYear().toString()) && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">แสดงข้อมูล:</span> 
                      {selectedMonth ? ` เดือน${[
                        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                      ][parseInt(selectedMonth) - 1]}` : ' ทุกเดือน'} 
                      {selectedYear} ({filteredRequisitions.length} รายการ)
                    </p>
                  </div>
                )}

                {/* Admin Filter Info */}
                {user?.ROLE === 'ADMIN' && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      <span className="font-medium">Admin View:</span> 
                      แสดงข้อมูลทั้งหมด {requisitions.length} รายการ
                      {filteredRequisitions.length !== requisitions.length && (
                        <span className="ml-2 text-green-600">
                          (กรองแล้ว {filteredRequisitions.length} รายการ)
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Manager Filter Info */}
                {user?.ROLE === 'MANAGER' && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Manager View:</span> 
                      แสดงข้อมูลใน SITE_ID เดียวกัน {requisitions.length} รายการ
                      {filteredRequisitions.length !== requisitions.length && (
                        <span className="ml-2 text-blue-600">
                          (กรองแล้ว {filteredRequisitions.length} รายการ)
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {user?.ROLE === 'MANAGER' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                As a Manager, you can approve or reject requisitions. Approved
                requisitions will be processed by the Admin team.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-8"
        >
          {/* Unified Table View with Filter */}
          <Card className="bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
            <CardHeader
              className={`border-b ${
                activeFilter === 'pending'
                  ? 'bg-gradient-to-r from-yellow-50 to-orange-100 border-yellow-200'
                  : activeFilter === 'approved'
                    ? 'bg-gradient-to-r from-green-50 to-emerald-100 border-green-200'
                    : activeFilter === 'rejected'
                      ? 'bg-gradient-to-r from-red-50 to-pink-100 border-red-200'
                      : activeFilter === 'closed'
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-100 border-blue-200'
                        : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
              }`}
            >
              <CardTitle
                className={`text-xl font-semibold flex items-center gap-3 ${
                  activeFilter === 'pending'
                    ? 'text-yellow-800'
                    : activeFilter === 'approved'
                      ? 'text-green-800'
                      : activeFilter === 'rejected'
                        ? 'text-red-800'
                        : activeFilter === 'closed'
                          ? 'text-blue-800'
                          : 'text-gray-800'
                }`}
              >
                {activeFilter === 'pending' && (
                  <Clock className="h-6 w-6 text-yellow-600" />
                )}
                {activeFilter === 'approved' && (
                  <CheckSquare className="h-6 w-6 text-green-600" />
                )}
                {activeFilter === 'rejected' && (
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                )}
                {activeFilter === 'closed' && (
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                )}
                {activeFilter === 'all' && (
                  <ClipboardList className="h-6 w-6 text-gray-600" />
                )}
                {activeFilter === 'all' && `All Requisitions (${requisitions.length})`}
                {activeFilter === 'pending' &&
                  `Pending Requisitions (${pendingCount})`}
                {activeFilter === 'approved' &&
                  `Approved Requisitions (${approvedCount})`}
                {activeFilter === 'rejected' &&
                  `Rejected Requisitions (${rejectedCount})`}
                {activeFilter === 'closed' &&
                  `Closed Requisitions (${closedCount})`}
              </CardTitle>
              <p
                className={`text-sm ${
                  activeFilter === 'pending'
                    ? 'text-yellow-700'
                    : activeFilter === 'approved'
                      ? 'text-green-700'
                      : activeFilter === 'rejected'
                        ? 'text-red-700'
                        : activeFilter === 'closed'
                          ? 'text-blue-700'
                          : 'text-gray-600'
                }`}
              >
                {activeFilter === 'all' &&
                  'View all requisitions across all statuses'}
                {activeFilter === 'pending' &&
                  'Requisitions awaiting your approval or rejection'}
                {activeFilter === 'approved' &&
                  'Requisitions that have been approved'}
                {activeFilter === 'rejected' &&
                  'Requisitions that have been rejected'}
                {activeFilter === 'closed' &&
                  'Requisitions that have been completed and delivered'}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, _index) => (
                    <motion.div
                      key={_index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: _index * 0.1 }}
                    >
                      <Skeleton className="h-20 w-full rounded-xl" />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden">
                  {filteredRequisitions.length === 0 ? (
                    <div className="p-12 text-center">
                      <div
                        className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                          activeFilter === 'pending'
                            ? 'bg-gradient-to-r from-yellow-100 to-orange-100'
                            : activeFilter === 'approved'
                              ? 'bg-gradient-to-r from-green-100 to-emerald-100'
                              : activeFilter === 'rejected'
                                ? 'bg-gradient-to-r from-red-100 to-pink-100'
                                : activeFilter === 'closed'
                                  ? 'bg-gradient-to-r from-blue-100 to-indigo-100'
                                  : 'bg-gradient-to-r from-gray-100 to-gray-200'
                        }`}
                      >
                        {activeFilter === 'pending' && (
                          <Clock className="h-10 w-10 text-yellow-600" />
                        )}
                        {activeFilter === 'approved' && (
                          <CheckSquare className="h-10 w-10 text-green-600" />
                        )}
                        {activeFilter === 'rejected' && (
                          <AlertTriangle className="h-10 w-10 text-red-600" />
                        )}
                        {activeFilter === 'closed' && (
                          <CheckCircle className="h-10 w-10 text-blue-600" />
                        )}
                        {activeFilter === 'all' && (
                          <ClipboardList className="h-10 w-10 text-gray-400" />
                        )}
                      </div>
                      <h3
                        className={`text-xl font-semibold mb-2 ${
                          activeFilter === 'pending'
                            ? 'text-yellow-700'
                            : activeFilter === 'approved'
                              ? 'text-green-700'
                              : activeFilter === 'rejected'
                                ? 'text-red-700'
                                : activeFilter === 'closed'
                                  ? 'text-blue-700'
                                  : 'text-gray-500'
                        }`}
                      >
                        {activeFilter === 'pending' &&
                          'No pending requisitions'}
                        {activeFilter === 'approved' &&
                          'No approved requisitions'}
                        {activeFilter === 'rejected' &&
                          'No rejected requisitions'}
                        {activeFilter === 'closed' &&
                          'No closed requisitions'}
                        {activeFilter === 'all' && 'No requisitions found'}
                      </h3>
                      <p
                        className={`max-w-md mx-auto ${
                          activeFilter === 'pending'
                            ? 'text-yellow-600'
                            : activeFilter === 'approved'
                              ? 'text-green-600'
                              : activeFilter === 'rejected'
                                ? 'text-red-600'
                                : activeFilter === 'closed'
                                  ? 'text-blue-600'
                                  : 'text-gray-400'
                        }`}
                      >
                        {activeFilter === 'pending' &&
                          "All requisitions have been processed. You're all caught up!"}
                        {activeFilter === 'approved' &&
                          'No requisitions have been approved yet.'}
                        {activeFilter === 'rejected' &&
                          'No requisitions have been rejected yet.'}
                        {activeFilter === 'closed' &&
                          'No requisitions have been closed yet.'}
                        {activeFilter === 'all' &&
                          'No requisitions found in the system.'}
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow
                          className={`${
                            activeFilter === 'pending'
                              ? 'bg-yellow-50/50 hover:bg-yellow-50/70'
                              : activeFilter === 'approved'
                                ? 'bg-green-50/50 hover:bg-green-50/70'
                                : activeFilter === 'rejected'
                                  ? 'bg-red-50/50 hover:bg-red-50/70'
                                  : activeFilter === 'closed'
                                    ? 'bg-blue-50/50 hover:bg-blue-50/70'
                                    : 'bg-gray-50/50 hover:bg-gray-50/70'
                          }`}
                        >
                          <TableHead
                            className={`font-semibold ${
                              activeFilter === 'pending'
                                ? 'text-yellow-800'
                                : activeFilter === 'approved'
                                  ? 'text-green-800'
                                  : activeFilter === 'rejected'
                                    ? 'text-red-800'
                                    : activeFilter === 'closed'
                                      ? 'text-blue-800'
                                      : 'text-gray-700'
                            }`}
                          >
                            Requisition ID
                          </TableHead>
                          <TableHead
                            className={`font-semibold ${
                              activeFilter === 'pending'
                                ? 'text-yellow-800'
                                : activeFilter === 'approved'
                                  ? 'text-green-800'
                                  : activeFilter === 'rejected'
                                    ? 'text-red-800'
                                    : activeFilter === 'closed'
                                      ? 'text-blue-800'
                                      : 'text-gray-700'
                            }`}
                          >
                            Requested By
                          </TableHead>
                          <TableHead
                            className={`font-semibold ${
                              activeFilter === 'pending'
                                ? 'text-yellow-800'
                                : activeFilter === 'approved'
                                  ? 'text-green-800'
                                  : activeFilter === 'rejected'
                                    ? 'text-red-800'
                                    : activeFilter === 'closed'
                                      ? 'text-blue-800'
                                      : 'text-gray-700'
                            }`}
                          >
                            Department
                          </TableHead>
                          <TableHead
                            className={`font-semibold ${
                              activeFilter === 'pending'
                                ? 'text-yellow-800'
                                : activeFilter === 'approved'
                                  ? 'text-green-800'
                                  : activeFilter === 'rejected'
                                    ? 'text-red-800'
                                    : activeFilter === 'closed'
                                      ? 'text-blue-800'
                                      : 'text-gray-700'
                            }`}
                          >
                            Submitted Date
                          </TableHead>
                          <TableHead
                            className={`font-semibold ${
                              activeFilter === 'pending'
                                ? 'text-yellow-800'
                                : activeFilter === 'approved'
                                  ? 'text-green-800'
                                  : activeFilter === 'rejected'
                                    ? 'text-red-800'
                                    : activeFilter === 'closed'
                                      ? 'text-blue-800'
                                      : 'text-gray-700'
                            }`}
                          >
                            Total Amount
                          </TableHead>
                          <TableHead
                            className={`font-semibold ${
                              activeFilter === 'pending'
                                ? 'text-yellow-800'
                                : activeFilter === 'approved'
                                  ? 'text-green-800'
                                  : activeFilter === 'rejected'
                                    ? 'text-red-800'
                                    : activeFilter === 'closed'
                                      ? 'text-blue-800'
                                      : 'text-gray-700'
                            }`}
                          >
                            Status
                          </TableHead>
                          <TableHead
                            className={`font-semibold ${
                              activeFilter === 'pending'
                                ? 'text-yellow-800'
                                : activeFilter === 'approved'
                                  ? 'text-green-800'
                                  : activeFilter === 'rejected'
                                    ? 'text-red-800'
                                    : activeFilter === 'closed'
                                      ? 'text-blue-800'
                                      : 'text-gray-700'
                            }`}
                          >
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filteredRequisitions.map((requisition, _index) => (
                            <motion.tr
                              key={requisition.REQUISITION_ID}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ delay: _index * 0.1 }}
                              className={`transition-colors duration-200 ${
                                activeFilter === 'pending'
                                  ? 'hover:bg-yellow-50/50'
                                  : activeFilter === 'approved'
                                    ? 'hover:bg-green-50/50'
                                    : activeFilter === 'rejected'
                                      ? 'hover:bg-red-50/50'
                                      : 'hover:bg-gray-50/50'
                              }`}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                      activeFilter === 'pending'
                                        ? 'bg-gradient-to-r from-yellow-500 to-orange-600'
                                        : activeFilter === 'approved'
                                          ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                          : activeFilter === 'rejected'
                                            ? 'bg-gradient-to-r from-red-500 to-pink-600'
                                            : requisition.STATUS === 'APPROVED'
                                              ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                              : requisition.STATUS ===
                                                  'REJECTED'
                                                ? 'bg-gradient-to-r from-red-500 to-pink-600'
                                                : requisition.STATUS === 'CLOSED'
                                                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                                  : 'bg-gradient-to-r from-gray-500 to-gray-600'
                                    }`}
                                  >
                                    <span className="text-white text-sm font-bold">
                                      #{requisition.REQUISITION_ID}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-medium text-gray-900">
                                    {requisition.USERNAME ||
                                      requisition.USER_ID}
                                  </p>
                                  <p className="text-sm text-gray-500 line-clamp-2">
                                    {requisition.ISSUE_NOTE ||
                                      'No note provided'}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-gray-700">
                                    {requisition.DEPARTMENT || 'N/A'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {requisition.SITE_ID || 'N/A'}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">
                                    {formatDate(requisition.SUBMITTED_AT)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-lg text-green-600">
                                    ฿
                                    {formatNumberWithCommas(Number(requisition.TOTAL_AMOUNT))}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`${getStatusColor(requisition.STATUS)} border px-3 py-1 rounded-full flex items-center gap-1 w-fit`}
                                >
                                  {getStatusIcon(requisition.STATUS)}
                                  {requisition.STATUS}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleView(requisition)}
                                    className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Button>
                                  {requisition.STATUS === 'PENDING' &&
                                    user?.ROLE === 'MANAGER' && (
                                      <>
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            handleAction(requisition, 'approve')
                                          }
                                          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                                        >
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() =>
                                            handleAction(requisition, 'reject')
                                          }
                                          className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 border-0 shadow-md hover:shadow-lg transition-all duration-200"
                                        >
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Reject
                                        </Button>
                                      </>
                                    )}
                                  {user?.ROLE === 'ADMIN' && requisition.STATUS === 'APPROVED' && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEdit(requisition)}
                                        disabled={false}
                                        className="hover:bg-yellow-50 hover:border-yellow-300 transition-colors border-yellow-200 text-yellow-600"
                                      >
                                        <FileText className="h-4 w-4 mr-2" />
                                        แก้ไข & PDF
                                      </Button>

                                      {/* ปุ่มแก้ไขรายการสินค้า */}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingRequisition(requisition);
                                          handleEditItems(requisition);
                                        }}
                                        disabled={savingItems}
                                        className="hover:bg-blue-50 hover:border-blue-300 transition-colors border-blue-200 text-blue-600"
                                      >
                                        {savingItems ? (
                                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                                        ) : (
                                          <Inventory className="h-4 w-4 mr-2" />
                                        )}
                                        แก้ไขรายการ
                                      </Button>

                                      {/* ปุ่มแจ้งเตือนว่าสินค้ามาแล้ว */}
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleNotifyArrival(requisition)
                                        }
                                        disabled={
                                          requisition.STATUS !== 'APPROVED'
                                        }
                                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                                      >
                                        <span className="mr-2">📦</span>
                                        แจ้งเตือน
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Dialog สำหรับ approve/reject */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {actionType === 'approve' ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Approve Requisition
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    Reject Requisition
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Are you sure you want to {actionType} requisition #
                {selectedRequisition?.REQUISITION_ID}? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Requisition Details:
                </p>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Requested by:</span>{' '}
                    {selectedRequisition?.USERNAME ||
                      selectedRequisition?.USER_ID}
                  </p>
                  <p>
                    <span className="font-medium">Amount:</span> ฿
                    {formatNumberWithCommas(Number(selectedRequisition?.TOTAL_AMOUNT || 0))}
                  </p>
                  <p>
                    <span className="font-medium">Submitted:</span>{' '}
                    {selectedRequisition?.SUBMITTED_AT &&
                      formatDate(selectedRequisition.SUBMITTED_AT)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {actionType === 'approve' ? 'Approval' : 'Rejection'} Note
                  {actionType === 'reject' ? (
                    <span className="text-red-500 ml-1">* (Required)</span>
                  ) : (
                    <span className="text-gray-500 ml-1">(Optional)</span>
                  )}
                </label>
                <Textarea
                  placeholder={
                    actionType === 'reject' 
                      ? 'กรุณากรอกเหตุผลในการปฏิเสธ...' 
                      : `Add a note about this ${actionType}...`
                  }
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className={`resize-none ${
                    actionType === 'reject' && (!note || note.trim() === '') 
                      ? 'border-red-300 focus:border-red-500' 
                      : ''
                  }`}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAction}
                disabled={submitting || (actionType === 'reject' && (!note || note.trim() === ''))}
                className={`flex-1 ${
                  actionType === 'approve'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                    : 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'
                } text-white border-0`}
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  `${actionType === 'approve' ? 'Approve' : 'Reject'}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog แสดงรายละเอียด */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-white">
            <DialogHeader className="pb-4">
              <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
                <ShoppingCart className="text-blue-600" />
                <div>
                  <div className="font-bold text-lg">
                    Requisition Details #{selectedRequisition?.REQUISITION_ID}
                  </div>
                  <div className="text-gray-600 text-sm">
                    รายละเอียดคำขอเบิก
                  </div>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6 pt-6">
              {/* Order Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-blue-50 border border-blue-200">
                  <CardContent>
                    <Typography
                      variant="h6"
                      className="font-semibold text-blue-800 mb-3 flex items-center gap-2"
                    >
                      <Person className="h-5 w-5" />
                      ข้อมูลผู้ขอ
                    </Typography>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">User ID:</span>
                        <span className="font-medium">
                          {selectedRequisition?.USER_ID}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Username:</span>
                        <span className="font-medium">
                          {selectedRequisition?.USERNAME || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Department:</span>
                        <span className="font-medium">
                          {selectedRequisition?.DEPARTMENT || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Site ID:</span>
                        <span className="font-medium">
                          {selectedRequisition?.SITE_ID || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border border-green-200">
                  <CardContent>
                    <Typography
                      variant="h6"
                      className="font-semibold text-green-800 mb-3 flex items-center gap-2"
                    >
                      <CalendarToday className="h-5 w-5" />
                      ข้อมูลคำขอ
                    </Typography>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <Badge
                          className={`${getStatusColor(selectedRequisition?.STATUS || '')} border px-3 py-1 rounded-full flex items-center gap-1 w-fit`}
                        >
                          {getStatusIcon(selectedRequisition?.STATUS || '')}
                          {selectedRequisition?.STATUS}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Submitted:</span>
                        <span className="font-medium">
                          {selectedRequisition?.SUBMITTED_AT &&
                            formatDate(selectedRequisition.SUBMITTED_AT)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-bold text-green-600">
                          ฿
                          {Number(
                            selectedRequisition?.TOTAL_AMOUNT || 0
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Items:</span>
                        <span className="font-medium">
                          {selectedRequisition?.REQUISITION_ITEMS?.length || 0}{' '}
                          รายการ
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Issue Note */}
              {selectedRequisition?.ISSUE_NOTE && (
                <Card className="bg-yellow-50 border border-yellow-200">
                  <CardContent>
                    <Typography
                      variant="h6"
                      className="font-semibold text-yellow-800 mb-3 flex items-center gap-2"
                    >
                      <Note className="h-5 w-5" />
                      หมายเหตุ
                    </Typography>
                    <Typography variant="body1" className="text-gray-700">
                      {selectedRequisition.ISSUE_NOTE}
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {/* Order Items */}
              <Card className="border border-gray-200">
                <CardContent>
                  <Typography
                    variant="h6"
                    className="font-semibold text-gray-800 mb-4 flex items-center gap-2"
                  >
                    <Inventory className="h-5 w-5" />
                    รายการสินค้า (
                    {selectedRequisition?.REQUISITION_ITEMS?.length || 0}{' '}
                    รายการ)
                  </Typography>

                  {selectedRequisition?.REQUISITION_ITEMS &&
                  selectedRequisition.REQUISITION_ITEMS.length > 0 ? (
                    <div className="space-y-6">
                      {groupItemsByCategory(selectedRequisition.REQUISITION_ITEMS).map(
                        (categoryGroup, categoryIndex) => (
                          <div key={categoryGroup.category} className="space-y-3">
                            {/* หัวข้อหมวดหมู่ */}
                            <div className="flex items-center gap-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                              <Typography
                                variant="h6"
                                className="font-bold text-blue-800"
                              >
                                {categoryGroup.category}
                              </Typography>
                              <Typography
                                variant="body2"
                                className="text-blue-600 bg-blue-100 px-2 py-1 rounded-full"
                              >
                                {categoryGroup.items.length} รายการ
                              </Typography>
                            </div>

                            {/* รายการสินค้าในหมวดหมู่ */}
                            <div className="space-y-3 ml-4">
                              {categoryGroup.items.map((item, idx) => (
                                <div
                                  key={item.ITEM_ID || idx}
                                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                                >
                                  <div className="flex-shrink-0">
                                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                      {item.PHOTO_URL ? (
                                        <img
                                          src={getImageUrl(item.PHOTO_URL)}
                                          alt={item.PRODUCT_NAME}
                                          className="w-full h-full object-cover rounded-lg"
                                        />
                                      ) : (
                                        <Category className="h-8 w-8 text-gray-400" />
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <Typography
                                      variant="subtitle1"
                                      className="font-semibold text-gray-800 truncate"
                                    >
                                      {item.PRODUCT_NAME || 'Unknown Product'}
                                    </Typography>
                                    {item.ORDER_UNIT && (
                                      <Typography
                                        variant="body2"
                                        className="text-gray-500"
                                      >
                                        Unit: {item.ORDER_UNIT}
                                      </Typography>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-4 text-right">
                                    <div>
                                      <Typography
                                        variant="body2"
                                        className="text-gray-500"
                                      >
                                        Quantity
                                      </Typography>
                                      <Typography
                                        variant="h6"
                                        className="font-bold text-blue-600"
                                      >
                                        {item.QUANTITY}
                                      </Typography>
                                    </div>

                                    <div>
                                      <Typography
                                        variant="body2"
                                        className="text-gray-500"
                                      >
                                        Unit Price
                                      </Typography>
                                      <Typography
                                        variant="h6"
                                        className="font-bold text-green-600"
                                      >
                                        ฿{Number(item.UNIT_PRICE || 0).toFixed(2)}
                                      </Typography>
                                    </div>

                                    <div>
                                      <Typography
                                        variant="body2"
                                        className="text-gray-500"
                                      >
                                        Total
                                      </Typography>
                                      <Typography
                                        variant="h6"
                                        className="font-bold text-purple-600"
                                      >
                                        ฿{calculateSafeTotalPrice(item)}
                                      </Typography>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Inventory className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <Typography variant="body1">ไม่พบรายการสินค้า</Typography>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setViewDialogOpen(false)}
              >
                ปิด
              </Button>
              {user?.ROLE === 'MANAGER' &&
                selectedRequisition?.STATUS === 'PENDING' && (
                  <>
                    <Button
                      onClick={() => {
                        setDialogOpen(true);
                        setActionType('approve');
                      }}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      อนุมัติ
                    </Button>
                    <Button
                      onClick={() => {
                        setDialogOpen(true);
                        setActionType('reject');
                      }}
                      className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white border-0"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      ปฏิเสธ
                    </Button>
                  </>
                )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog สำหรับแจ้งเตือนว่าสินค้ามาแล้ว */}
        <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg">📦</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    สินค้ามาแล้ว!
                  </h2>
                  <DialogDescription className="text-sm text-gray-500">
                    ส่งการแจ้งเตือนให้ผู้ใช้ทราบ
                  </DialogDescription>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-700 mb-2">
                  รายละเอียด Requisition:
                </p>
                <div className="space-y-1 text-sm text-blue-600">
                  <p>
                    <span className="font-medium">ID:</span> #
                    {selectedRequisition?.REQUISITION_ID}
                  </p>
                  <p>
                    <span className="font-medium">ผู้ขอเบิก:</span>{' '}
                    {selectedRequisition?.USERNAME ||
                      selectedRequisition?.USER_ID}
                  </p>
                  <p>
                    <span className="font-medium">จำนวนเงิน:</span> ฿
                    {(
                      parseFloat(
                        selectedRequisition?.TOTAL_AMOUNT?.toString() || '0'
                      ) || 0
                    ).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  ข้อความแจ้งเตือน
                </label>
                <Textarea
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  rows={3}
                  placeholder="พิมพ์ข้อความแจ้งเตือนที่นี่..."
                  className="resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => setNotifyDialogOpen(false)}
                disabled={notifying}
                className="flex-1"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSubmitNotification}
                disabled={notifying}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0"
              >
                {notifying ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    กำลังส่ง...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>📦</span>
                    ส่งการแจ้งเตือน
                  </div>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog สำหรับแก้ไขข้อมูล */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] bg-white overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">
                    แก้ไขข้อมูล SUPPLY REQUEST ORDER
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    ปรับแต่งข้อมูลก่อนสร้าง PDF
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* ข้อมูลบริษัท */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  ข้อมูลบริษัท
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ชื่อบริษัท
                    </label>
                    <input
                      type="text"
                      value={editFormData.companyName}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          companyName: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ที่อยู่บริษัท
                    </label>
                    <input
                      type="text"
                      value={editFormData.companyAddress}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          companyAddress: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      โทรศัพท์
                    </label>
                    <input
                      type="text"
                      value={editFormData.phone}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          phone: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      FAX
                    </label>
                    <input
                      type="text"
                      value={editFormData.fax}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          fax: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      เลขประจำตัวผู้เสียภาษี
                    </label>
                    <input
                      type="text"
                      value={editFormData.taxId}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          taxId: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* ข้อมูลการจัดส่ง */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  ข้อมูลการจัดส่ง
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      วันที่จัดส่ง
                    </label>
                    <input
                      type="text"
                      value={editFormData.deliveryDate}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          deliveryDate: e.target.value
                        })
                      }
                      placeholder="เช่น 15/01/2025 หรือ ภายใน 7 วัน"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ผู้ติดต่อเพิ่มเติม
                    </label>
                    <input
                      type="text"
                      value={editFormData.contactPerson}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          contactPerson: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>


              {/* ชื่อไฟล์ */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  ชื่อไฟล์ PDF
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ชื่อไฟล์
                  </label>
                  <input
                    type="text"
                    value={editFormData.fileName}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        fileName: e.target.value
                      })
                    }
                    placeholder="เช่น SUPPLY_REQUEST_ORDER_001_2025-01-15"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ไฟล์จะถูกบันทึกเป็น: {editFormData.fileName || 'SUPPLY_REQUEST_ORDER'}.pdf
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="flex-1 h-12 text-base font-medium"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 text-base font-medium"
              >
                <FileText className="h-5 w-5 mr-2" />
                สร้าง PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog สำหรับแก้ไขข้อมูลการโหลดรวม */}
        <Dialog open={editAllDialogOpen} onOpenChange={setEditAllDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] bg-white overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">
                    แก้ไขข้อมูล SUPPLY REQUEST ORDER
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    ปรับแต่งข้อมูลก่อนสร้าง PDF ทั้งหมด (แยกตามหมวดหมู่)
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* ข้อมูลบริษัท */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  ข้อมูลบริษัท
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ชื่อบริษัท
                    </label>
                    <input
                      type="text"
                      value={editAllFormData.companyName}
                      onChange={(e) =>
                        setEditAllFormData({
                          ...editAllFormData,
                          companyName: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ที่อยู่บริษัท
                    </label>
                    <input
                      type="text"
                      value={editAllFormData.companyAddress}
                      onChange={(e) =>
                        setEditAllFormData({
                          ...editAllFormData,
                          companyAddress: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      โทรศัพท์
                    </label>
                    <input
                      type="text"
                      value={editAllFormData.phone}
                      onChange={(e) =>
                        setEditAllFormData({
                          ...editAllFormData,
                          phone: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      FAX
                    </label>
                    <input
                      type="text"
                      value={editAllFormData.fax}
                      onChange={(e) =>
                        setEditAllFormData({
                          ...editAllFormData,
                          fax: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      เลขประจำตัวผู้เสียภาษี
                    </label>
                    <input
                      type="text"
                      value={editAllFormData.taxId}
                      onChange={(e) =>
                        setEditAllFormData({
                          ...editAllFormData,
                          taxId: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* ข้อมูลการจัดส่ง */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  ข้อมูลการจัดส่ง
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      วันที่จัดส่ง
                    </label>
                    <input
                      type="text"
                      value={editAllFormData.deliveryDate}
                      onChange={(e) =>
                        setEditAllFormData({
                          ...editAllFormData,
                          deliveryDate: e.target.value
                        })
                      }
                      placeholder="เช่น 15/01/2025 หรือ ภายใน 7 วัน"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ผู้ติดต่อเพิ่มเติม
                    </label>
                    <input
                      type="text"
                      value={editAllFormData.contactPerson}
                      onChange={(e) =>
                        setEditAllFormData({
                          ...editAllFormData,
                          contactPerson: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* ชื่อไฟล์ */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  ชื่อไฟล์ PDF
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ชื่อไฟล์
                  </label>
                  <input
                    type="text"
                    value={editAllFormData.fileName}
                    onChange={(e) =>
                      setEditAllFormData({
                        ...editAllFormData,
                        fileName: e.target.value
                      })
                    }
                    placeholder="เช่น SUPPLY_REQUEST_ORDER_202501_2025-01-15"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ไฟล์จะถูกบันทึกเป็น: {editAllFormData.fileName || 'SUPPLY_REQUEST_ORDER'}.pdf
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setEditAllDialogOpen(false)}
                className="flex-1 h-12 text-base font-medium"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSaveAllEdit}
                className="flex-1 h-12 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 text-base font-medium"
              >
                <FileText className="h-5 w-5 mr-2" />
                สร้าง PDF ทั้งหมด
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog สำหรับแก้ไขรายการสินค้า */}
        <Dialog open={editItemsDialogOpen} onOpenChange={setEditItemsDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] w-[95vw] bg-white overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Inventory className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">
                    แก้ไขรายการสินค้า
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Requisition #{editingRequisition?.REQUISITION_ID}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* สรุปยอดรวม */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <h3 className="text-lg font-semibold text-gray-800">ยอดรวมปัจจุบัน</h3>
                    <p className="text-2xl sm:text-3xl font-bold text-green-600">
                      ฿{calculateTotalAmount(editingItems).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center sm:text-right">
                    <p className="text-sm text-gray-600">จำนวนรายการ</p>
                    <p className="text-xl font-semibold text-blue-600">
                      {(editingItems || []).length} รายการ
                    </p>
                  </div>
                </div>
              </div>

              {/* รายการสินค้า */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  รายการสินค้า
                </h3>
                
                {(editingItems || []).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Inventory className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>ไม่มีรายการสินค้า</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(editingItems || []).map((item, _index) => (
                      <div
                        key={item.ITEM_ID}
                        className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow overflow-hidden"
                      >
                        {/* Desktop Layout */}
                        <div className="hidden lg:flex items-center gap-4 p-4">
                          {/* รูปภาพสินค้า */}
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                              {item.PHOTO_URL ? (
                                <img
                                  src={getImageUrl(item.PHOTO_URL)}
                                  alt={item.PRODUCT_NAME}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Category className="h-8 w-8 text-gray-400" />
                              )}
                            </div>
                          </div>

                          {/* ข้อมูลสินค้า */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-800 truncate">
                              {item.PRODUCT_NAME || 'Unknown Product'}
                            </h4>
                            <p className="text-sm text-gray-600">
                              หมวดหมู่: {item.CATEGORY_NAME || 'ไม่ระบุ'}
                            </p>
                          </div>

                          {/* ราคาต่อหน่วย */}
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                              ราคาต่อหน่วย:
                            </label>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-gray-500">฿</span>
                              <input
                                type="number"
                                value={item.UNIT_PRICE}
                                onChange={(e) => handleUpdateItemPrice(item.ITEM_ID, Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-24 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>

                          {/* จำนวนสินค้า */}
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                              จำนวน:
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleUpdateItemQuantity(item.ITEM_ID, Math.max(0, item.QUANTITY - 1))}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={item.QUANTITY}
                                onChange={(e) => handleUpdateItemQuantity(item.ITEM_ID, Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                min="0"
                              />
                              <button
                                onClick={() => handleUpdateItemQuantity(item.ITEM_ID, item.QUANTITY + 1)}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* ยอดรวม */}
                          <div className="text-right min-w-[100px]">
                            <p className="text-sm text-gray-600">ยอดรวม</p>
                            <p className="text-lg font-bold text-green-600">
                              ฿{calculateSafeTotalPrice(item)}
                            </p>
                          </div>

                          {/* ปุ่มลบ */}
                          <button
                            onClick={() => handleRemoveItem(item.ITEM_ID)}
                            className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors"
                            title="ลบรายการนี้"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Mobile/Tablet Layout */}
                        <div className="lg:hidden p-4 space-y-4">
                          {/* Header with image and product info */}
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                {item.PHOTO_URL ? (
                                  <img
                                    src={getImageUrl(item.PHOTO_URL)}
                                    alt={item.PRODUCT_NAME}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <Category className="h-6 w-6 text-gray-400" />
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-800 text-sm">
                                {item.PRODUCT_NAME || 'Unknown Product'}
                              </h4>
                              <p className="text-xs text-gray-600">
                                หมวดหมู่: {item.CATEGORY_NAME || 'ไม่ระบุ'}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item.ITEM_ID)}
                              className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors"
                              title="ลบรายการนี้"
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Controls */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* ราคาต่อหน่วย */}
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-700">
                                ราคาต่อหน่วย
                              </label>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">฿</span>
                                <input
                                  type="number"
                                  value={item.UNIT_PRICE}
                                  onChange={(e) => handleUpdateItemPrice(item.ITEM_ID, Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                            </div>

                            {/* จำนวนสินค้า */}
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-700">
                                จำนวน
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleUpdateItemQuantity(item.ITEM_ID, Math.max(0, item.QUANTITY - 1))}
                                  className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-sm"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={item.QUANTITY}
                                  onChange={(e) => handleUpdateItemQuantity(item.ITEM_ID, Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="flex-1 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  min="0"
                                />
                                <button
                                  onClick={() => handleUpdateItemQuantity(item.ITEM_ID, item.QUANTITY + 1)}
                                  className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-sm"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* ยอดรวม */}
                          <div className="text-center pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-600">ยอดรวม</p>
                            <p className="text-lg font-bold text-green-600">
                              ฿{calculateSafeTotalPrice(item)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-3 pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => setEditItemsDialogOpen(false)}
                  className="flex-1 h-12 text-base font-medium order-2 sm:order-1"
                  disabled={savingItems}
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleSaveItems}
                  disabled={savingItems || (editingItems || []).length === 0}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 text-base font-medium order-1 sm:order-2"
                >
                  {savingItems ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      กำลังบันทึก...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Inventory className="h-5 w-5" />
                      บันทึกการแก้ไข
                    </div>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>


      </motion.div>
    </div>
  );
}
