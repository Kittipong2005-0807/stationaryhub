 "use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle, XCircle, Eye, ClipboardList, TrendingUp, Clock, CheckSquare, AlertTriangle, RefreshCw, Download, FileText } from "lucide-react"
import { ShoppingCart, Person, CalendarToday, Note, Inventory, Category } from "@mui/icons-material"
import { Typography } from "@mui/material"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { getBasePathUrl } from "@/lib/base-path"
import { getApiUrl } from "@/lib/api-utils"
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import ThaiDateUtils from '@/lib/date-utils'

interface RequisitionItem {
  ITEM_ID: number
  REQUISITION_ID: number
  PRODUCT_ID: number
  PRODUCT_NAME: string
  QUANTITY: number
  UNIT_PRICE: number
  TOTAL_PRICE: number
  ORDER_UNIT?: string
  PHOTO_URL?: string
  CATEGORY_NAME?: string
}

interface Requisition {
  REQUISITION_ID: number
  USER_ID: string
  USERNAME?: string
  STATUS: string
  SUBMITTED_AT: string
  TOTAL_AMOUNT: number
  SITE_ID: string
  ISSUE_NOTE: string
  REQUISITION_ITEMS: RequisitionItem[]
  APPROVALS?: unknown[]
  STATUS_HISTORY?: unknown[]
  DEPARTMENT?: string
}

export default function ApprovalsPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<"approve" | "reject">("approve")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingRequisition, setEditingRequisition] = useState<Requisition | null>(null)
  const [editFormData, setEditFormData] = useState({
    deliveryDate: "",
    contactPerson: "",
    category: "",
    companyName: "",
    fax: "",
    phone: "",
    contact: ""
  })
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false)
  const [notifyMessage, setNotifyMessage] = useState("")
  const [notifying, setNotifying] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user as unknown as { EmpCode?: string; USER_ID?: string; AdLoginName?: string; ROLE?: string }
  const isAuthenticated = !!session


  useEffect(() => {
    if (!isAuthenticated || (user?.ROLE !== "MANAGER" && user?.ROLE !== "ADMIN")) {
      router.push(getBasePathUrl("/login"))
      return
    }

    setLoading(true)
    
    // แยก API call ตาม Role
    if (user?.ROLE === "ADMIN") {
      // Admin เห็นแค่ requisitions ที่ Manager approve แล้ว
      console.log("Admin user data:", { 
        EmpCode: user?.EmpCode, 
        USER_ID: user?.USER_ID, 
        AdLoginName: user?.AdLoginName,
        ROLE: user?.ROLE
      })
      
      fetch(getApiUrl(`/api/orgcode3?action=getApprovedRequisitionsForAdmin`))
        .then((res) => {
          console.log("Admin API response status:", res.status)
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`)
          }
          return res.json()
        })
        .then(async (data) => {
          console.log("Fetched approved requisitions for admin:", data)
          if (data.requisitions && Array.isArray(data.requisitions)) {
                      setRequisitions(data.requisitions)
        } else if (Array.isArray(data)) {
          setRequisitions(data)
        } else {
          console.warn("Unexpected data format:", data)
          setRequisitions([])
        }
        setLoading(false)
        

        })
        .catch((error) => {
          console.error("Error fetching approved requisitions:", error)
          alert("โหลดข้อมูล requisitions ไม่สำเร็จ: " + error.message)
          setRequisitions([])
          setLoading(false)
        })
    } else {
      // Manager เห็น requisitions ที่อยู่ใน SITE_ID เดียวกัน
      const managerUserId = user?.EmpCode || user?.USER_ID || user?.AdLoginName
      console.log("Manager user data:", { 
        EmpCode: user?.EmpCode, 
        USER_ID: user?.USER_ID, 
        AdLoginName: user?.AdLoginName,
        managerUserId 
      })
      
      fetch(getApiUrl(`/api/orgcode3?action=getRequisitionsForManager&userId=${managerUserId}`))
        .then((res) => res.json())
        .then((data) => {
          console.log("Fetched requisitions for manager:", data)
          setRequisitions(data.requisitions || [])
          setLoading(false)
        })
        .catch((error) => {
          console.error("Error fetching requisitions:", error)
          alert("โหลดข้อมูล requisitions ไม่สำเร็จ")
          setLoading(false)
        })
    }
  }, [isAuthenticated, user, router])

  const handleAction = (requisition: Requisition, action: "approve" | "reject") => {
    setSelectedRequisition(requisition)
    setActionType(action)
    setDialogOpen(true)
    setNote("")
  }

  const handleSubmitAction = async () => {
    if (!selectedRequisition) return
    setSubmitting(true)
// console.log("selectedRequisition", selectedRequisition);
    try {
      const response = await fetch(getApiUrl(`/api/requisitions/${selectedRequisition.REQUISITION_ID}/approve`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: actionType,
          note: note,
        }),
      })

      if (response.ok) {
        // อัปเดตสถานะใน UI โดยดึงข้อมูลใหม่จาก API orgcode3
        if (user?.ROLE === "ADMIN") {
          // Admin refresh ข้อมูล
          const refreshResponse = await fetch(getApiUrl(`/api/orgcode3?action=getApprovedRequisitionsForAdmin`))
          if (refreshResponse.ok) {
            const data = await refreshResponse.json()
            if (data.requisitions && Array.isArray(data.requisitions)) {
              setRequisitions(data.requisitions)
            } else if (Array.isArray(data)) {
              setRequisitions(data)
            }
          }
        } else {
          // Manager refresh ข้อมูล
          const managerUserId = user?.EmpCode || user?.USER_ID || user?.AdLoginName
          const refreshResponse = await fetch(getApiUrl(`/api/orgcode3?action=getRequisitionsForManager&userId=${managerUserId}`))
          if (refreshResponse.ok) {
            const data = await refreshResponse.json()
            setRequisitions(data.requisitions || [])
          }
        }
        setDialogOpen(false)
        alert(`Requisition ${actionType === "approve" ? "approved" : "rejected"} successfully!`)
      } else {
        alert("Failed to update requisition. Please try again.")
      }
    } catch (error) {
      alert("Failed to update requisition. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // เพิ่มฟังก์ชัน refresh สำหรับ Admin
  const handleRefresh = async () => {
    if (!isAuthenticated) return
    
    setLoading(true)
    
    try {
      if (user?.ROLE === "ADMIN") {
        const response = await fetch(getApiUrl(`/api/orgcode3?action=getApprovedRequisitionsForAdmin`))
        if (response.ok) {
          const data = await response.json()
          if (data.requisitions && Array.isArray(data.requisitions)) {
            setRequisitions(data.requisitions)
          } else if (Array.isArray(data)) {
            setRequisitions(data)
          }
        }
      } else {
        const managerUserId = user?.EmpCode || user?.USER_ID || user?.AdLoginName
        const response = await fetch(getApiUrl(`/api/orgcode3?action=getRequisitionsForManager&userId=${managerUserId}`))
        if (response.ok) {
          const data = await response.json()
          setRequisitions(data.requisitions || [])
        }
      }
    } catch (error) {
      console.error("Error refreshing data:", error)
      alert("Failed to refresh data")
    } finally {
      setLoading(false)
    }
  }

  // เพิ่มฟังก์ชันดาวน์โหลดไฟล์ Excel/CSV สำหรับ Admin
  const handleDownload = () => {
    if (!requisitions.length) {
      alert("ไม่มีข้อมูลให้ดาวน์โหลด")
      return
    }

    // สร้างข้อมูล CSV สำหรับใบเบิกสินค้า
    const headers = [
      "ใบเบิกสินค้า",
      "Requisition ID",
      "วันที่ขอเบิก",
      "ผู้ขอเบิก",
      "Site ID",
      "หมายเหตุ",
      "สถานะ",
      "รายการสินค้า",
      "จำนวน",
      "หน่วย",
      "ราคาต่อหน่วย",
      "ราคารวม"
    ]

    // สร้างข้อมูลรายการสินค้าทั้งหมด
    const csvData: (string | number)[][] = []
    
    requisitions.forEach(req => {
      if (req.REQUISITION_ITEMS && req.REQUISITION_ITEMS.length > 0) {
        // สำหรับแต่ละ item ใน requisition
        req.REQUISITION_ITEMS.forEach((item, index) => {
          csvData.push([
            `ใบเบิกสินค้า #${req.REQUISITION_ID}`, // ชื่อเอกสาร
            req.REQUISITION_ID, // Requisition ID
            formatDate(req.SUBMITTED_AT), // วันที่ขอเบิก
            req.USER_ID, // ผู้ขอเบิก
            req.SITE_ID, // Site ID
            req.ISSUE_NOTE || "", // หมายเหตุ
            req.STATUS, // สถานะ
            item.PRODUCT_NAME || "Unknown Product", // รายการสินค้า
            item.QUANTITY, // จำนวน
            "ชิ้น", // หน่วย (default)
            item.UNIT_PRICE, // ราคาต่อหน่วย
            item.TOTAL_PRICE // ราคารวม
          ])
        })
      } else {
        // ถ้าไม่มี items ให้ใส่ข้อมูลหลัก
        csvData.push([
          `ใบเบิกสินค้า #${req.REQUISITION_ID}`,
          req.REQUISITION_ID,
          formatDate(req.SUBMITTED_AT),
          req.USER_ID,
          req.SITE_ID,
          req.ISSUE_NOTE || "",
          req.STATUS,
          "ไม่มีรายการสินค้า",
          "",
          "",
          "",
          ""
        ])
      }
    })

    // รวม headers และ data
    const csvContent = [headers, ...csvData]
      .map(row => row.map((cell: string | number) => `"${cell}"`).join(","))
      .join("\n")

    // สร้างไฟล์และดาวน์โหลด
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `ใบเบิกสินค้า_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // เพิ่มฟังก์ชันดาวน์โหลดเฉพาะรายการ
  const handleDownloadSingle = (requisition: Requisition) => {
    if (!requisition.REQUISITION_ITEMS || requisition.REQUISITION_ITEMS.length === 0) {
      alert("ไม่มีรายการสินค้าให้ดาวน์โหลด")
      return
    }

    // สร้างข้อมูล CSV สำหรับใบเบิกสินค้าเฉพาะรายการ
    const headers = [
      "ใบเบิกสินค้า",
      "Requisition ID",
      "วันที่ขอเบิก",
      "ผู้ขอเบิก",
      "Site ID",
      "หมายเหตุ",
      "สถานะ",
      "รายการสินค้า",
      "จำนวน",
      "หน่วย",
      "ราคาต่อหน่วย",
      "ราคารวม"
    ]

    // สร้างข้อมูลรายการสินค้าสำหรับ requisition เดียว
    const csvData: (string | number)[][] = []
    
    requisition.REQUISITION_ITEMS.forEach((item, index) => {
      csvData.push([
        `ใบเบิกสินค้า #${requisition.REQUISITION_ID}`, // ชื่อเอกสาร
        requisition.REQUISITION_ID, // Requisition ID
        formatDate(requisition.SUBMITTED_AT), // วันที่ขอเบิก
        requisition.USER_ID, // ผู้ขอเบิก
        requisition.SITE_ID, // Site ID
        requisition.ISSUE_NOTE || "", // หมายเหตุ
        requisition.STATUS, // สถานะ
        item.PRODUCT_NAME || "Unknown Product", // รายการสินค้า
        item.QUANTITY, // จำนวน
        "ชิ้น", // หน่วย (default)
        item.UNIT_PRICE, // ราคาต่อหน่วย
        item.TOTAL_PRICE // ราคารวม
      ])
    })

    // รวม headers และ data
    const csvContent = [headers, ...csvData]
      .map(row => row.map((cell: string | number) => `"${cell}"`).join(","))
      .join("\n")

    // สร้างไฟล์และดาวน์โหลด
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `ใบเบิกสินค้า_${requisition.REQUISITION_ID}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // เพิ่มฟังก์ชันสร้าง PDF สำหรับใบเบิกสินค้า
  const generatePDF = async (requisition: Requisition) => {
    if (!requisition.REQUISITION_ITEMS || requisition.REQUISITION_ITEMS.length === 0) {
      alert("ไม่มีรายการสินค้าให้สร้าง PDF")
      return
    }

    try {
      // สร้าง HTML element ชั่วคราว
      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '210mm' // A4 width
      tempDiv.style.padding = '20mm'
      tempDiv.style.backgroundColor = 'white'
      tempDiv.style.fontFamily = 'Arial, sans-serif'
      tempDiv.style.fontSize = '12px'
      tempDiv.style.lineHeight = '1.4'
      
             // สร้าง HTML content สำหรับ SUPPLY REQUEST ORDER
       tempDiv.innerHTML = `
         <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
           <h1 style="margin: 0; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">SUPPLY REQUEST ORDER</h1>
         </div>
         
                   <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px;">
            <div style="text-align: left;">
              <h3 style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">TO:</h3>
              <p style="margin: 0 0 3px 0; font-size: 11px;">${editFormData.companyName}</p>
              <p style="margin: 0 0 3px 0; font-size: 11px;">FAX: ${editFormData.fax}</p>
              <p style="margin: 0 0 3px 0; font-size: 11px;">PHONE: ${editFormData.phone}</p>
              <p style="margin: 0 0 3px 0; font-size: 11px;">CONTACT: ${editFormData.contact}</p>
            </div>
           <div style="text-align: right;">
             <p style="margin: 0 0 3px 0; font-size: 11px;"><strong>Date:</strong> ${formatDate(requisition.SUBMITTED_AT)}</p>
             <p style="margin: 0 0 3px 0; font-size: 11px;"><strong>Time:</strong> ${new Date(requisition.SUBMITTED_AT).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
             <p style="margin: 0 0 3px 0; font-size: 11px;"><strong>Requisition ID:</strong> #${requisition.REQUISITION_ID}</p>
           </div>
         </div>
         
                   <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc; background: #f9f9f9;">
            <h3 style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold;">Please Delivery on:</h3>
            <p style="margin: 0 0 3px 0; font-size: 11px;">${editFormData.deliveryDate || '_________________________________'}</p>
            <p style="margin: 0 0 3px 0; font-size: 11px;"><strong>หมายเหตุ:</strong> ${requisition.ISSUE_NOTE || 'ไม่มีหมายเหตุ'}</p>
            <p style="margin: 0 0 3px 0; font-size: 11px;"><strong>ต้องการข้อมูลเพิ่มเติมโปรดติดต่อ:</strong> ${editFormData.contactPerson}</p>
          </div>
          
          <div style="margin-bottom: 20px; padding: 8px; background: #e8f4fd; border-left: 4px solid #2196f3;">
            <h3 style="margin: 0; font-size: 12px; font-weight: bold; color: #1976d2;">หมวดหมู่: ${editFormData.category}</h3>
          </div>
        
        <div style="margin-bottom: 25px;">
          <div style="background: #f5f5f5; padding: 8px 12px; border: 1px solid #ddd; border-bottom: none; font-weight: bold; font-size: 12px;">
            <div style="font-size: 14px; font-weight: bold; color: #333;">Cost Center: ${requisition.SITE_ID}</div>
            <div style="font-size: 11px; color: #666; margin-top: 2px;">UCHA ${requisition.SITE_ID} - ${requisition.USER_ID}</div>
            <div style="font-size: 11px; color: #666; margin-top: 2px;">Department: ${requisition.DEPARTMENT || 'N/A'}</div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; font-size: 10px; table-layout: fixed;">
            <thead>
              <tr>
                <th style="background: #e3f2fd; color: #1976d2; padding: 6px 4px; text-align: left; font-weight: bold; font-size: 10px; border: 1px solid #ddd; width: 10%;">Itemnum</th>
                <th style="background: #e3f2fd; color: #1976d2; padding: 6px 4px; text-align: left; font-weight: bold; font-size: 10px; border: 1px solid #ddd; width: 40%;">Description</th>
                <th style="background: #e3f2fd; color: #1976d2; padding: 6px 4px; text-align: center; font-weight: bold; font-size: 10px; border: 1px solid #ddd; width: 12%;">Order</th>
                <th style="background: #e3f2fd; color: #1976d2; padding: 6px 4px; text-align: center; font-weight: bold; font-size: 10px; border: 1px solid #ddd; width: 10%;">Unit</th>
                <th style="background: #e3f2fd; color: #1976d2; padding: 6px 4px; text-align: center; font-weight: bold; font-size: 10px; border: 1px solid #ddd; width: 12%;">Cost</th>
                <th style="background: #e3f2fd; color: #1976d2; padding: 6px 4px; text-align: center; font-weight: bold; font-size: 10px; border: 1px solid #ddd; width: 8%;">Sent</th>
                <th style="background: #e3f2fd; color: #1976d2; padding: 6px 4px; text-align: center; font-weight: bold; font-size: 10px; border: 1px solid #ddd; width: 8%;">SRNum</th>
              </tr>
            </thead>
            <tbody>
              ${requisition.REQUISITION_ITEMS.map((item, index) => `
                <tr style="background: ${index % 2 === 0 ? '#fafafa' : 'white'};">
                  <td style="padding: 6px 4px; border: 1px solid #ddd; font-size: 10px; font-weight: bold; color: #1976d2;">SA${String(index + 1).padStart(3, '0')}</td>
                  <td style="padding: 6px 4px; border: 1px solid #ddd; font-size: 9px; word-wrap: break-word; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.PRODUCT_NAME || 'Unknown Product'}">${(item.PRODUCT_NAME || 'Unknown Product').length > 25 ? (item.PRODUCT_NAME || 'Unknown Product').substring(0, 25) + '...' : (item.PRODUCT_NAME || 'Unknown Product')}</td>
                  <td style="padding: 6px 4px; border: 1px solid #ddd; font-size: 10px; text-align: center;">${Math.round(item.QUANTITY)}</td>
                  <td style="padding: 6px 4px; border: 1px solid #ddd; font-size: 10px; text-align: center;">${item.ORDER_UNIT || 'EA'}</td>
                  <td style="padding: 6px 4px; border: 1px solid #ddd; font-size: 10px; text-align: right;">฿${Number(item.UNIT_PRICE || 0).toFixed(2)}</td>
                  <td style="padding: 6px 4px; border: 1px solid #ddd; font-size: 10px; text-align: center; color: #1976d2; font-weight: bold;">${Math.round(item.QUANTITY)}</td>
                  <td style="padding: 6px 4px; border: 1px solid #ddd; font-size: 10px; text-align: center; font-weight: bold; color: #1976d2;">${requisition.REQUISITION_ID}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f0f8ff; border: 1px solid #2196f3; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #1976d2;">สรุปยอดรวม</h3>
          <div style="font-size: 18px; font-weight: bold; color: #1976d2; text-align: right;">ยอดรวมทั้งหมด: ฿${Number(requisition.TOTAL_AMOUNT).toFixed(2)}</div>
          <p style="margin: 10px 0 0 0; color: #1976d2;">จำนวนรายการ: ${requisition.REQUISITION_ITEMS.length} รายการ</p>
          <p style="margin: 5px 0 0 0; color: #1976d2;">สถานะ: ${requisition.STATUS}</p>
          <p style="margin: 5px 0 0 0; color: #1976d2;">แผนก: ${requisition.DEPARTMENT || 'N/A'}</p>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 10px; border-top: 1px solid #ddd; padding-top: 15px;">
          <p style="margin: 0 0 5px 0;">เอกสารนี้ถูกสร้างโดยระบบ StationaryHub</p>
          <p style="margin: 0 0 5px 0;">วันที่สร้าง: ${new Date().toLocaleDateString('th-TH')} เวลา: ${new Date().toLocaleTimeString('th-TH')}</p>
          <p style="margin: 0;">Page 1 of 1</p>
        </div>
      `
      
      // เพิ่ม element ลงใน DOM
      document.body.appendChild(tempDiv)
      
      // รอให้ content render เสร็จ
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // แปลง HTML เป็น canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })
      
      // ลบ element ชั่วคราว
      document.body.removeChild(tempDiv)
      
      // สร้าง PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 295 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0
      
      // เพิ่มหน้าแรก
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      
      // เพิ่มหน้าถัดไปถ้าจำเป็น
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      
      // ดาวน์โหลด PDF
      pdf.save(`SUPPLY_REQUEST_ORDER_${requisition.REQUISITION_ID}_${new Date().toISOString().split('T')[0]}.pdf`)
      
      alert('ไฟล์ SUPPLY REQUEST ORDER PDF ถูกสร้างและดาวน์โหลดแล้ว!')
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('เกิดข้อผิดพลาดในการสร้าง PDF: ' + (error as Error).message)
    }
  }

  // เพิ่มฟังก์ชันสำหรับเปิดหน้าแก้ไข
  const handleEdit = (requisition: Requisition) => {
    setEditingRequisition(requisition)
    setEditDialogOpen(true)
  }

  // เพิ่มฟังก์ชันสำหรับแจ้งเตือนว่าสินค้ามาแล้ว
  const handleNotifyArrival = (requisition: Requisition) => {
    setSelectedRequisition(requisition)
    setNotifyMessage(`สินค้าที่คุณขอเบิก (Requisition #${requisition.REQUISITION_ID}) ได้มาถึงแล้ว กรุณาติดต่อแผนกจัดซื้อเพื่อรับสินค้า`)
    setNotifyDialogOpen(true)
  }

  const handleSubmitNotification = async () => {
    if (!selectedRequisition) return
    
    setNotifying(true)
    try {
      const response = await fetch("/stationaryhub/api/notifications/arrival", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requisitionId: selectedRequisition.REQUISITION_ID,
          message: notifyMessage,
        }),
      })

      if (response.ok) {
        alert("ส่งการแจ้งเตือนว่าสินค้ามาแล้วสำเร็จ!")
        setNotifyDialogOpen(false)
        setNotifyMessage("")
        setSelectedRequisition(null)
      } else {
        const errorData = await response.json()
        alert(`เกิดข้อผิดพลาด: ${errorData.error}`)
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการส่งการแจ้งเตือน")
      console.error("Error sending notification:", error)
    } finally {
      setNotifying(false)
    }
  }

  // เพิ่มฟังก์ชันสำหรับบันทึกการแก้ไข
  const handleSaveEdit = () => {
    setEditDialogOpen(false)
    if (editingRequisition) {
      generatePDF(editingRequisition)
    }
  }

  const handleView = async (requisition: Requisition) => {
    console.log("Viewing requisition:", requisition)
    console.log("Requisition items:", requisition.REQUISITION_ITEMS)
    
    try {
      // ดึงข้อมูล requisition ใหม่พร้อม items
              const response = await fetch(getApiUrl(`/api/requisitions/${requisition.REQUISITION_ID}`))
      if (response.ok) {
        const detailedRequisition = await response.json()
        console.log("Detailed requisition:", detailedRequisition)
        setSelectedRequisition(detailedRequisition)
      } else {
        console.error("Failed to fetch detailed requisition")
        setSelectedRequisition(requisition)
      }
    } catch (error) {
      console.error("Error fetching detailed requisition:", error)
      setSelectedRequisition(requisition)
    }
    
    setViewDialogOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      case "APPROVED":
        return "bg-green-50 text-green-700 border-green-200"
      case "REJECTED":
        return "bg-red-50 text-red-700 border-red-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4" />
      case "APPROVED":
        return <CheckSquare className="h-4 w-4" />
      case "REJECTED":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return ThaiDateUtils.formatShortThaiDate(dateString)
  }

  // ฟังก์ชันสำหรับฟิลเตอร์ข้อมูล
  const getFilteredRequisitions = () => {
    let filtered = requisitions
    
    // กรองตามสถานะที่เลือก
    switch (activeFilter) {
      case "pending":
        filtered = requisitions.filter(r => r.STATUS === "PENDING")
        break
      case "approved":
        filtered = requisitions.filter(r => r.STATUS === "APPROVED")
        break
      case "rejected":
        filtered = requisitions.filter(r => r.STATUS === "REJECTED")
        break
      default:
        // สำหรับ "all" ให้เรียงลำดับ: PENDING อยู่ด้านบน, APPROVED/REJECTED อยู่ด้านล่าง
        filtered = [...requisitions].sort((a, b) => {
          if (a.STATUS === "PENDING" && b.STATUS !== "PENDING") return -1
          if (a.STATUS !== "PENDING" && b.STATUS === "PENDING") return 1
          return 0
        })
        break
    }
    
    return filtered
  }

  const filteredRequisitions = getFilteredRequisitions()

  const pendingCount = requisitions.filter(r => r.STATUS === "PENDING").length
  const approvedCount = requisitions.filter(r => r.STATUS === "APPROVED").length
  const rejectedCount = requisitions.filter(r => r.STATUS === "REJECTED").length

  if (!isAuthenticated || (user?.ROLE !== "MANAGER" && user?.ROLE !== "ADMIN")) {
    return null
  }

  // ฟังก์ชันสำหรับสร้าง URL รูปภาพที่ถูกต้อง
  const getImageUrl = (photoUrl: string | null | undefined) => {
    if (!photoUrl) return '/stationaryhub/placeholder.jpg'
    
    // ถ้าเป็น URL เต็มแล้ว ให้ใช้เลย
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl
    }
    
    // ถ้าเป็น path ที่มี basepath แล้ว ให้ใช้เลย
    if (photoUrl.startsWith('/stationaryhub/')) {
      return photoUrl
    }
    
    // ถ้าเป็น path ที่เริ่มต้นด้วย / ให้ใช้ API route
    if (photoUrl.startsWith('/')) {
      const filename = photoUrl.substring(1) // ลบ / ออก
      return `/stationaryhub/api/image/${filename}`
    }
    
    return `/stationaryhub/api/image/${photoUrl}`
  }

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
            
            {/* Refresh Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="flex gap-3"
            >
                               
              
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
                  <p className="text-3xl font-bold text-yellow-700">{pendingCount}</p>
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
                  <p className="text-3xl font-bold text-green-700">{approvedCount}</p>
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
                  <p className="text-3xl font-bold text-red-700">{rejectedCount}</p>
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
                  variant={activeFilter === "all" ? "default" : "outline"}
                  onClick={() => setActiveFilter("all")}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeFilter === "all"
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl"
                      : "hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  All ({requisitions.length})
                </Button>
                
                <Button
                  variant={activeFilter === "pending" ? "default" : "outline"}
                  onClick={() => setActiveFilter("pending")}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeFilter === "pending"
                      ? "bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg hover:shadow-xl"
                      : "hover:bg-yellow-50 border-yellow-200 text-yellow-700"
                  }`}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Pending ({pendingCount})
                </Button>
                
                <Button
                  variant={activeFilter === "approved" ? "default" : "outline"}
                  onClick={() => setActiveFilter("approved")}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeFilter === "approved"
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl"
                      : "hover:bg-green-50 border-green-200 text-green-700"
                  }`}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Approved ({approvedCount})
                </Button>
                
                <Button
                  variant={activeFilter === "rejected" ? "default" : "outline"}
                  onClick={() => setActiveFilter("rejected")}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeFilter === "rejected"
                      ? "bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg hover:shadow-xl"
                      : "hover:bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Rejected ({rejectedCount})
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {user?.ROLE === "MANAGER" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                As a Manager, you can approve or reject requisitions. Approved requisitions will be processed by the Admin team.
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
            <CardHeader className={`border-b ${
              activeFilter === "pending" 
                ? "bg-gradient-to-r from-yellow-50 to-orange-100 border-yellow-200"
                : activeFilter === "approved"
                ? "bg-gradient-to-r from-green-50 to-emerald-100 border-green-200"
                : activeFilter === "rejected"
                ? "bg-gradient-to-r from-red-50 to-pink-100 border-red-200"
                : "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200"
            }`}>
              <CardTitle className={`text-xl font-semibold flex items-center gap-3 ${
                activeFilter === "pending" 
                  ? "text-yellow-800"
                  : activeFilter === "approved"
                  ? "text-green-800"
                  : activeFilter === "rejected"
                  ? "text-red-800"
                  : "text-gray-800"
              }`}>
                {activeFilter === "pending" && <Clock className="h-6 w-6 text-yellow-600" />}
                {activeFilter === "approved" && <CheckSquare className="h-6 w-6 text-green-600" />}
                {activeFilter === "rejected" && <AlertTriangle className="h-6 w-6 text-red-600" />}
                {activeFilter === "all" && <ClipboardList className="h-6 w-6 text-gray-600" />}
                {activeFilter === "all" && "All Requisitions"}
                {activeFilter === "pending" && `Pending Requisitions (${pendingCount})`}
                {activeFilter === "approved" && `Approved Requisitions (${approvedCount})`}
                {activeFilter === "rejected" && `Rejected Requisitions (${rejectedCount})`}
              </CardTitle>
              <p className={`text-sm ${
                activeFilter === "pending" 
                  ? "text-yellow-700"
                  : activeFilter === "approved"
                  ? "text-green-700"
                  : activeFilter === "rejected"
                  ? "text-red-700"
                  : "text-gray-600"
              }`}>
                {activeFilter === "all" && "View all requisitions across all statuses"}
                {activeFilter === "pending" && "Requisitions awaiting your approval or rejection"}
                {activeFilter === "approved" && "Requisitions that have been approved"}
                {activeFilter === "rejected" && "Requisitions that have been rejected"}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Skeleton className="h-20 w-full rounded-xl" />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden">
                  {filteredRequisitions.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                        activeFilter === "pending" 
                          ? "bg-gradient-to-r from-yellow-100 to-orange-100"
                          : activeFilter === "approved"
                          ? "bg-gradient-to-r from-green-100 to-emerald-100"
                          : activeFilter === "rejected"
                          ? "bg-gradient-to-r from-red-100 to-pink-100"
                          : "bg-gradient-to-r from-gray-100 to-gray-200"
                      }`}>
                        {activeFilter === "pending" && <Clock className="h-10 w-10 text-yellow-600" />}
                        {activeFilter === "approved" && <CheckSquare className="h-10 w-10 text-green-600" />}
                        {activeFilter === "rejected" && <AlertTriangle className="h-10 w-10 text-red-600" />}
                        {activeFilter === "all" && <ClipboardList className="h-10 w-10 text-gray-400" />}
                      </div>
                      <h3 className={`text-xl font-semibold mb-2 ${
                        activeFilter === "pending" 
                          ? "text-yellow-700"
                          : activeFilter === "approved"
                          ? "text-green-700"
                          : activeFilter === "rejected"
                          ? "text-red-700"
                          : "text-gray-500"
                      }`}>
                        {activeFilter === "pending" && "No pending requisitions"}
                        {activeFilter === "approved" && "No approved requisitions"}
                        {activeFilter === "rejected" && "No rejected requisitions"}
                        {activeFilter === "all" && "No requisitions found"}
                      </h3>
                      <p className={`max-w-md mx-auto ${
                        activeFilter === "pending" 
                          ? "text-yellow-600"
                          : activeFilter === "approved"
                          ? "text-green-600"
                          : activeFilter === "rejected"
                          ? "text-red-600"
                          : "text-gray-400"
                      }`}>
                        {activeFilter === "pending" && "All requisitions have been processed. You're all caught up!"}
                        {activeFilter === "approved" && "No requisitions have been approved yet."}
                        {activeFilter === "rejected" && "No requisitions have been rejected yet."}
                        {activeFilter === "all" && "No requisitions found in the system."}
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className={`${
                          activeFilter === "pending" 
                            ? "bg-yellow-50/50 hover:bg-yellow-50/70"
                            : activeFilter === "approved"
                            ? "bg-green-50/50 hover:bg-green-50/70"
                            : activeFilter === "rejected"
                            ? "bg-red-50/50 hover:bg-red-50/70"
                            : "bg-gray-50/50 hover:bg-gray-50/70"
                        }`}>
                          <TableHead className={`font-semibold ${
                            activeFilter === "pending" 
                              ? "text-yellow-800"
                              : activeFilter === "approved"
                              ? "text-green-800"
                              : activeFilter === "rejected"
                              ? "text-red-800"
                              : "text-gray-700"
                          }`}>Requisition ID</TableHead>
                          <TableHead className={`font-semibold ${
                            activeFilter === "pending" 
                              ? "text-yellow-800"
                              : activeFilter === "approved"
                              ? "text-green-800"
                              : activeFilter === "rejected"
                              ? "text-red-800"
                              : "text-gray-700"
                          }`}>Requested By</TableHead>
                          <TableHead className={`font-semibold ${
                            activeFilter === "pending" 
                              ? "text-yellow-800"
                              : activeFilter === "approved"
                              ? "text-green-800"
                              : activeFilter === "rejected"
                              ? "text-red-800"
                              : "text-gray-700"
                          }`}>Department</TableHead>
                          <TableHead className={`font-semibold ${
                            activeFilter === "pending" 
                              ? "text-yellow-800"
                              : activeFilter === "approved"
                              ? "text-green-800"
                              : activeFilter === "rejected"
                              ? "text-red-800"
                              : "text-gray-700"
                          }`}>Submitted Date</TableHead>
                          <TableHead className={`font-semibold ${
                            activeFilter === "pending" 
                              ? "text-yellow-800"
                              : activeFilter === "approved"
                              ? "text-green-800"
                              : activeFilter === "rejected"
                              ? "text-red-800"
                              : "text-gray-700"
                          }`}>Total Amount</TableHead>
                          <TableHead className={`font-semibold ${
                            activeFilter === "pending" 
                              ? "text-yellow-800"
                              : activeFilter === "approved"
                              ? "text-green-800"
                              : activeFilter === "rejected"
                              ? "text-red-800"
                              : "text-gray-700"
                          }`}>Status</TableHead>
                          <TableHead className={`font-semibold ${
                            activeFilter === "pending" 
                              ? "text-yellow-800"
                              : activeFilter === "approved"
                              ? "text-green-800"
                              : activeFilter === "rejected"
                              ? "text-red-800"
                              : "text-gray-700"
                          }`}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filteredRequisitions.map((requisition, index) => (
                            <motion.tr
                              key={requisition.REQUISITION_ID}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ delay: index * 0.1 }}
                              className={`transition-colors duration-200 ${
                                activeFilter === "pending" 
                                  ? "hover:bg-yellow-50/50"
                                  : activeFilter === "approved"
                                  ? "hover:bg-green-50/50"
                                  : activeFilter === "rejected"
                                  ? "hover:bg-red-50/50"
                                  : "hover:bg-gray-50/50"
                              }`}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    activeFilter === "pending" 
                                      ? "bg-gradient-to-r from-yellow-500 to-orange-600"
                                      : activeFilter === "approved"
                                      ? "bg-gradient-to-r from-green-500 to-emerald-600"
                                      : activeFilter === "rejected"
                                      ? "bg-gradient-to-r from-red-500 to-pink-600"
                                      : requisition.STATUS === "APPROVED"
                                      ? "bg-gradient-to-r from-green-500 to-emerald-600"
                                      : requisition.STATUS === "REJECTED"
                                      ? "bg-gradient-to-r from-red-500 to-pink-600"
                                      : "bg-gradient-to-r from-gray-500 to-gray-600"
                                  }`}>
                                    <span className="text-white text-sm font-bold">#{requisition.REQUISITION_ID}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-medium text-gray-900">{requisition.USERNAME || requisition.USER_ID}</p>
                                  <p className="text-sm text-gray-500 line-clamp-2">
                                    {requisition.ISSUE_NOTE || "No note provided"}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-gray-700">{requisition.DEPARTMENT || "N/A"}</p>
                                  <p className="text-xs text-gray-500">{requisition.SITE_ID || "N/A"}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">{formatDate(requisition.SUBMITTED_AT)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-lg text-green-600">
                                    ฿{Number(requisition.TOTAL_AMOUNT).toFixed(2)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${getStatusColor(requisition.STATUS)} border px-3 py-1 rounded-full flex items-center gap-1 w-fit`}>
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
                                  {requisition.STATUS === "PENDING" && user?.ROLE === "MANAGER" && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleAction(requisition, "approve")}
                                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleAction(requisition, "reject")}
                                        className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 border-0 shadow-md hover:shadow-lg transition-all duration-200"
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                                                      {user?.ROLE === "ADMIN" && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleEdit(requisition)}
                                          disabled={!requisition.REQUISITION_ITEMS || requisition.REQUISITION_ITEMS.length === 0}
                                          className="hover:bg-yellow-50 hover:border-yellow-300 transition-colors border-yellow-200 text-yellow-600"
                                        >
                                          <FileText className="h-4 w-4 mr-2" />
                                          แก้ไข & PDF
                                        </Button>
                                        
                                        {/* ปุ่มแจ้งเตือนว่าสินค้ามาแล้ว */}
                                        <Button
                                          size="sm"
                                          onClick={() => handleNotifyArrival(requisition)}
                                          disabled={requisition.STATUS !== "APPROVED"}
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
                {actionType === "approve" ? (
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
                Are you sure you want to {actionType} requisition #{selectedRequisition?.REQUISITION_ID}?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Requisition Details:</p>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Requested by:</span> {selectedRequisition?.USERNAME || selectedRequisition?.USER_ID}</p>
                  <p><span className="font-medium">Amount:</span> ฿{Number(selectedRequisition?.TOTAL_AMOUNT || 0).toFixed(2)}</p>
                  <p><span className="font-medium">Submitted:</span> {selectedRequisition?.SUBMITTED_AT && formatDate(selectedRequisition.SUBMITTED_AT)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {actionType === "approve" ? "Approval" : "Rejection"} Note (Optional)
                </label>
                <Textarea
                  placeholder={`Add a note about this ${actionType}...`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="resize-none"
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
                disabled={submitting}
                className={`flex-1 ${
                  actionType === "approve" 
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700" 
                    : "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700"
                } text-white border-0`}
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  `${actionType === "approve" ? "Approve" : "Reject"}`
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
                   <Typography variant="h6" className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                     <Person className="h-5 w-5" />
                     ข้อมูลผู้ขอ
                   </Typography>
                   <div className="space-y-2">
                     <div className="flex justify-between">
                       <span className="text-gray-600">User ID:</span>
                       <span className="font-medium">{selectedRequisition?.USER_ID}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-gray-600">Username:</span>
                       <span className="font-medium">{selectedRequisition?.USERNAME || "N/A"}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-gray-600">Department:</span>
                       <span className="font-medium">{selectedRequisition?.DEPARTMENT || "N/A"}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-gray-600">Site ID:</span>
                       <span className="font-medium">{selectedRequisition?.SITE_ID || "N/A"}</span>
                     </div>
                   </div>
                 </CardContent>
               </Card>

               <Card className="bg-green-50 border border-green-200">
                 <CardContent>
                   <Typography variant="h6" className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                     <CalendarToday className="h-5 w-5" />
                     ข้อมูลคำขอ
                   </Typography>
                   <div className="space-y-2">
                     <div className="flex justify-between">
                       <span className="text-gray-600">Status:</span>
                       <Badge className={`${getStatusColor(selectedRequisition?.STATUS || "")} border px-3 py-1 rounded-full flex items-center gap-1 w-fit`}>
                         {getStatusIcon(selectedRequisition?.STATUS || "")}
                         {selectedRequisition?.STATUS}
                       </Badge>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-gray-600">Submitted:</span>
                       <span className="font-medium">
                         {selectedRequisition?.SUBMITTED_AT && formatDate(selectedRequisition.SUBMITTED_AT)}
                       </span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-gray-600">Total Amount:</span>
                       <span className="font-bold text-green-600">
                         ฿{Number(selectedRequisition?.TOTAL_AMOUNT || 0).toFixed(2)}
                       </span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-gray-600">Items:</span>
                       <span className="font-medium">
                         {selectedRequisition?.REQUISITION_ITEMS?.length || 0} รายการ
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
                   <Typography variant="h6" className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
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
                 <Typography variant="h6" className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                   <Inventory className="h-5 w-5" />
                   รายการสินค้า ({selectedRequisition?.REQUISITION_ITEMS?.length || 0} รายการ)
                 </Typography>

                               {selectedRequisition?.REQUISITION_ITEMS && selectedRequisition.REQUISITION_ITEMS.length > 0 ? (
                 <div className="space-y-3">
                   {selectedRequisition.REQUISITION_ITEMS.map((item, idx) => (
                     <div key={item.ITEM_ID || idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
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
                         <Typography variant="subtitle1" className="font-semibold text-gray-800 truncate">
                           {item.PRODUCT_NAME || "Unknown Product"}
                         </Typography>
                         {item.CATEGORY_NAME && (
                           <Typography variant="body2" className="text-gray-500">
                             {item.CATEGORY_NAME}
                           </Typography>
                         )}
                         {item.ORDER_UNIT && (
                           <Typography variant="body2" className="text-gray-500">
                             Unit: {item.ORDER_UNIT}
                           </Typography>
                         )}
                       </div>
                       
                       <div className="flex items-center gap-4 text-right">
                         <div>
                           <Typography variant="body2" className="text-gray-500">
                             Quantity
                           </Typography>
                           <Typography variant="h6" className="font-bold text-blue-600">
                             {item.QUANTITY}
                           </Typography>
                         </div>
                         
                         <div>
                           <Typography variant="body2" className="text-gray-500">
                             Unit Price
                           </Typography>
                           <Typography variant="h6" className="font-bold text-green-600">
                             ฿{Number(item.UNIT_PRICE || 0).toFixed(2)}
                           </Typography>
                         </div>
                         
                         <div>
                           <Typography variant="body2" className="text-gray-500">
                             Total
                           </Typography>
                           <Typography variant="h6" className="font-bold text-purple-600">
                             ฿{Number(item.TOTAL_PRICE || 0).toFixed(2)}
                           </Typography>
                         </div>
                       </div>
                     </div>
                   ))}
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
             {user?.ROLE === "MANAGER" && selectedRequisition?.STATUS === "PENDING" && (
               <>
                 <Button 
                   onClick={() => { setDialogOpen(true); setActionType("approve") }} 
                   className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0"
                 >
                   <CheckCircle className="h-4 w-4 mr-2" />
                   อนุมัติ
                 </Button>
                 <Button 
                   onClick={() => { setDialogOpen(true); setActionType("reject") }} 
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
                              <h2 className="text-xl font-bold text-gray-900">สินค้ามาแล้ว!</h2>
                              <DialogDescription className="text-sm text-gray-500">
                                ส่งการแจ้งเตือนให้ผู้ใช้ทราบ
                              </DialogDescription>
                            </div>
                          </DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm font-medium text-blue-700 mb-2">รายละเอียด Requisition:</p>
                            <div className="space-y-1 text-sm text-blue-600">
                              <p><span className="font-medium">ID:</span> #{selectedRequisition?.REQUISITION_ID}</p>
                              <p><span className="font-medium">ผู้ขอเบิก:</span> {selectedRequisition?.USERNAME || selectedRequisition?.USER_ID}</p>
                              <p><span className="font-medium">จำนวนเงิน:</span> ฿{(parseFloat(selectedRequisition?.TOTAL_AMOUNT?.toString() || '0') || 0).toFixed(2)}</p>
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
                   <div className="text-xl font-bold text-gray-900">แก้ไขข้อมูล SUPPLY REQUEST ORDER</div>
                   <div className="text-sm text-gray-500 mt-1">ปรับแต่งข้อมูลก่อนสร้าง PDF</div>
                 </div>
               </div>
             </DialogHeader>
             
             <div className="space-y-6 py-4">
               {/* ข้อมูลบริษัท */}
               <div className="space-y-4">
                 <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">ข้อมูลบริษัท</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อบริษัท</label>
                     <input
                       type="text"
                       value={editFormData.companyName}
                       onChange={(e) => setEditFormData({...editFormData, companyName: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">FAX</label>
                     <input
                       type="text"
                       value={editFormData.fax}
                       onChange={(e) => setEditFormData({...editFormData, fax: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">โทรศัพท์</label>
                     <input
                       type="text"
                       value={editFormData.phone}
                       onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">ผู้ติดต่อ</label>
                     <input
                       type="text"
                       value={editFormData.contact}
                       onChange={(e) => setEditFormData({...editFormData, contact: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     />
                   </div>
                 </div>
               </div>

               {/* ข้อมูลการจัดส่ง */}
               <div className="space-y-4">
                 <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">ข้อมูลการจัดส่ง</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">วันที่จัดส่ง</label>
                     <input
                       type="text"
                       value={editFormData.deliveryDate}
                       onChange={(e) => setEditFormData({...editFormData, deliveryDate: e.target.value})}
                       placeholder="เช่น 15/01/2025 หรือ ภายใน 7 วัน"
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">ผู้ติดต่อเพิ่มเติม</label>
                     <input
                       type="text"
                       value={editFormData.contactPerson}
                       onChange={(e) => setEditFormData({...editFormData, contactPerson: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     />
                   </div>
                 </div>
               </div>

               {/* หมวดหมู่ */}
               <div className="space-y-4">
                 <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">หมวดหมู่สินค้า</h3>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">หมวดหมู่</label>
                   <input
                     type="text"
                     value={editFormData.category}
                     onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   />
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
       </motion.div>
     </div>
   )
 }
