"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Menu,
  MenuItem,
  Avatar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  TextField,
} from "@mui/material"
import {
  Dashboard,
  TrendingUp,
  TrendingDown,
  Assignment,
  Inventory,
  GetApp,
  PictureAsPdf,
  TableChart,
  AttachMoney,
  Timeline,
  Analytics,
  Schedule,
  ShoppingCart,
} from "@mui/icons-material"
import { useAuth } from "@/src/contexts/AuthContext"
// import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import type { Requisition } from "@/lib/database"
import { apiGet, apiPost } from "@/lib/api-utils"
import { getBasePathUrl } from '@/lib/base-path';

// Interface สำหรับข้อมูลราคาสินค้า
interface ProductPrice {
  PRODUCT_ID: number
  PRODUCT_NAME: string
  CATEGORY_NAME: string
  UNIT_COST: number
  YEAR: number
  MONTH: number
  CHANGE_PERCENTAGE: number
  PHOTO_URL?: string
  CURRENT_PRICE?: number
  PREVIOUS_PRICE?: number
  PRICE_CHANGE?: number
  PERCENTAGE_CHANGE?: number
}

export default function AdminDashboard() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([])
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [realPriceHistory, setRealPriceHistory] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [_arrivalMessage, _setArrivalMessage] = useState<string>('')
  const [stats, setStats] = useState({
    totalRequisitions: 0,
    pendingApprovals: 0,
    approvedRequisitions: 0,
    totalValue: 0,
    monthlyGrowth: 15.3,
    activeUsers: 24,
    lowStockItems: 8,
    avgPriceChange: 0,
    topPriceIncrease: 0,
    topPriceDecrease: 0,
  })
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false)
  const [notifyMessage, setNotifyMessage] = useState("")
  const [notifying, setNotifying] = useState(false)
  const [sendEmail, setSendEmail] = useState(true) // เพิ่มตัวเลือกส่งอีเมล
  const [importing, setImporting] = useState(false)
  const { user, isAuthenticated } = useAuth()
  
  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return 'User';
    return user.FullNameThai || user.FullNameEng || user.USERNAME || user.AdLoginName || user.name || 'User';
  }

  // ฟังก์ชันดึงข้อมูลราคาสินค้า
  const fetchProductPrices = useCallback(async () => {
    try {
      console.log('🔍 Fetching price comparison data for year:', selectedYear, 'category:', selectedCategory)
      const response = await apiGet(`/stationaryhub/api/products/price-comparison?year=${selectedYear}&category=${selectedCategory}`)
      
      if (response && response.success && Array.isArray(response.data)) {
        setProductPrices(response.data)
        console.log('✅ Product prices loaded:', response.data.length, 'items')
      } else {
        console.log('⚠️ No product prices data or invalid format')
        setProductPrices([])
      }
    } catch (error) {
      console.error('❌ Error fetching product prices:', error)
      setProductPrices([])
    }
  }, [selectedYear, selectedCategory])

  const fetchRequisitions = useCallback(async () => {
    try {
      const response = await apiGet("/api/requisitions")
      if (response && Array.isArray(response)) {
        setRequisitions(response)
        console.log('✅ Requisitions loaded:', response.length, 'items')
      } else if (response && response.success && Array.isArray(response.data)) {
        setRequisitions(response.data)
        console.log('✅ Requisitions loaded:', response.data.length, 'items')
      } else {
        console.log('⚠️ No requisitions data or invalid format')
        setRequisitions([])
      }
    } catch (error) {
      console.error('❌ Error fetching requisitions:', error)
      setRequisitions([])
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiGet('/stationaryhub/api/categories')
      if (response.success && Array.isArray(response.data)) {
        setCategories(response.data)
        console.log('✅ Categories loaded:', response.data.length, 'items')
      } else {
        console.warn('⚠️ No categories data or invalid format')
        setCategories([])
      }
    } catch (error) {
      console.error('❌ Error fetching categories:', error)
      setCategories([])
    }
  }, [])

  const fetchRealPriceHistory = useCallback(async () => {
    try {
      const response = await apiGet('/api/products/real-price-history');
      if (response.success && Array.isArray(response.data)) {
        setRealPriceHistory(response.data)
        console.log('✅ Real price history loaded:', response.data.length, 'items')
      } else {
        console.warn('⚠️ No real price history data or invalid format')
        setRealPriceHistory([])
      }
    } catch (error) {
      console.error('❌ Error fetching real price history:', error)
      setRealPriceHistory([])
    }
  }, [])



  const handleImportPrices = async (file: File) => {
    try {
      setImporting(true)
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await apiPost('/api/products/import-prices', formData)
      
      if (response.success) {
        alert('Price import completed successfully!')
        fetchProductPrices()
      } else {
        alert('Price import failed: ' + response.error)
      }
    } catch (error) {
      console.error('Error importing prices:', error)
      alert('Error importing prices')
    } finally {
      setImporting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportPrices(file);
    }
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

  const handlePriceChange = async (productId: number, newPrice: number) => {
    try {
      const response = await apiPost('/api/products/update-price', {
        productId,
        newPrice,
        year: selectedYear,
        notes: `Price updated via admin panel`
      });

      if (response.success) {
        alert(`Price updated successfully for Product ID ${productId} to ฿${newPrice.toFixed(2)}`);
        fetchProductPrices(); // Refresh prices after update
        fetchRealPriceHistory(); // Refresh history
      } else {
        alert(`Failed to update price for Product ID ${productId}: ${response.error}`);
      }
    } catch (error) {
      console.error(`Error updating price for Product ID ${productId}:`, error);
      alert(`Error updating price for Product ID ${productId}`);
    }
  };


  // ดึงข้อมูลราคาสินค้าเมื่อปีหรือหมวดหมู่เปลี่ยน
  useEffect(() => {
    if (isAuthenticated && user?.ROLE === "ADMIN") {
      fetchProductPrices()
    }
  }, [selectedYear, selectedCategory, isAuthenticated, user, fetchProductPrices])

  // ดึงข้อมูลเริ่มต้นเมื่อ component mount
  useEffect(() => {
    if (isAuthenticated && user?.ROLE === "ADMIN") {
      setLoading(true)
      Promise.all([
        fetchProductPrices(),
        fetchCategories(),
        fetchRealPriceHistory(),
        fetchRequisitions()
      ]).finally(() => {
        setLoading(false)
      })
    }
  }, [isAuthenticated, user, fetchProductPrices, fetchCategories, fetchRealPriceHistory, fetchRequisitions])

  // อัปเดต stats เมื่อข้อมูลเปลี่ยน
  useEffect(() => {
    if (requisitions.length > 0) {
      const totalRequisitions = requisitions.length
      const pendingApprovals = requisitions.filter(r => r.STATUS === 'PENDING').length
      const approvedRequisitions = requisitions.filter(r => r.STATUS === 'APPROVED').length
      const totalValue = requisitions.reduce((sum, r) => sum + (parseFloat(r.TOTAL_AMOUNT?.toString() || '0') || 0), 0)

      setStats(prev => ({
        ...prev,
        totalRequisitions,
        pendingApprovals,
        approvedRequisitions,
        totalValue
      }))
    }
  }, [requisitions])

  // อัปเดต price stats เมื่อข้อมูลราคาเปลี่ยน
  useEffect(() => {
    if (productPrices.length > 0) {
      const avgPriceChange = productPrices.reduce((sum, p) => sum + (parseFloat(p.PERCENTAGE_CHANGE?.toString() || '0') || 0), 0) / productPrices.length
      const topPriceIncrease = Math.max(...productPrices.map(p => parseFloat(p.PERCENTAGE_CHANGE?.toString() || '0') || 0))
      const topPriceDecrease = Math.min(...productPrices.map(p => parseFloat(p.PERCENTAGE_CHANGE?.toString() || '0') || 0))

      setStats(prev => ({
        ...prev,
        avgPriceChange: avgPriceChange || 0,
        topPriceIncrease: topPriceIncrease || 0,
        topPriceDecrease: topPriceDecrease || 0
      }))
    }
  }, [productPrices])



  const handleExport = (format: "pdf" | "excel") => {
    if (!selectedRequisition) return

    console.log(`Exporting requisition #${selectedRequisition.REQUISITION_ID} as ${format.toUpperCase()}`)
    alert(`Exporting requisition #${selectedRequisition.REQUISITION_ID} as ${format.toUpperCase()}...`)

    setAnchorEl(null)
    setSelectedRequisition(null)
  }

  const handleNotifyArrival = (requisition: Requisition) => {
    setSelectedRequisition(requisition)
    setNotifyMessage(`สินค้าที่คุณขอเบิก (Requisition #${requisition.REQUISITION_ID}) ได้มาถึงแล้ว กรุณาติดต่อแผนกจัดซื้อเพื่อรับสินค้า`)
    setNotifyDialogOpen(true)
  }

  const handleSubmitNotification = async () => {
    if (!selectedRequisition || !notifyMessage.trim()) {
      alert("กรุณาเลือก requisition และพิมพ์ข้อความแจ้งเตือน")
      return
    }

    setNotifying(true)
    try {
      // ส่งการแจ้งเตือนในระบบ (In-App Notification)
      const response = await fetch("/api/notifications/arrival", {
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
        let emailStatus = "ไม่ส่งอีเมล"
        
        // ส่งอีเมลแจ้งเตือนไปยัง user (ถ้าเลือกส่งอีเมล)
        if (sendEmail) {
          try {
            const emailResponse = await fetch("/api/send-arrival-email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                requisitionId: selectedRequisition.REQUISITION_ID,
                userId: selectedRequisition.USER_ID,
                message: notifyMessage,
                adminName: getUserDisplayName()
              }),
            })

            if (emailResponse.ok) {
              const emailData = await emailResponse.json()
              if (emailData.emailSent) {
                emailStatus = "ส่งอีเมลสำเร็จ"
                console.log("📧 Email sent successfully to:", emailData.userEmail)
              } else {
                emailStatus = "ส่งอีเมลไม่สำเร็จ: " + emailData.reason
                console.log("⚠️ Email not sent:", emailData.reason)
              }
            } else {
              emailStatus = "ส่งอีเมลไม่สำเร็จ: API Error"
              console.log("⚠️ Email API error:", await emailResponse.text())
            }
          } catch (emailError) {
            console.error("❌ Error sending email:", emailError)
            emailStatus = "ส่งอีเมลไม่สำเร็จ: Network Error"
          }
        }

        alert(`✅ ส่งการแจ้งเตือนสำเร็จ!\n\n📱 In-App: สำเร็จ\n📧 อีเมล: ${emailStatus}`)
        setNotifyDialogOpen(false)
        setNotifyMessage("")
        setSelectedRequisition(null)
        setSendEmail(true) // รีเซ็ตเป็นค่าเริ่มต้น
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

  const _handleSendArrivalEmail = async (requisitionId: number) => {
    try {
      setNotifying(true)
      
      // ส่ง notification
      const response = await fetch("/api/notifications/arrival", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requisitionId,
          message: "สินค้าที่คุณสั่งซื้อได้มาถึงแล้ว กรุณาตรวจสอบที่แผนกจัดซื้อ",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send notification")
      }

      // ส่งอีเมล (ถ้าเปิดใช้งาน)
      if (sendEmail) {
        const emailResponse = await fetch("/api/send-arrival-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requisitionId,
            email: user?.EMAIL,
            username: user?.USERNAME,
          }),
        })

        if (!emailResponse.ok) {
          console.warn("Failed to send email, but notification was sent")
        }
      }

      alert("แจ้งเตือนเรียบร้อยแล้ว!")
    } catch (error) {
      console.error("Error sending arrival notification:", error)
      alert("เกิดข้อผิดพลาดในการส่งแจ้งเตือน")
    } finally {
      setNotifying(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "warning"
      case "APPROVED":
        return "success"
      case "REJECTED":
        return "error"
      default:
        return "default"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }

  if (!isAuthenticated || user?.ROLE !== "ADMIN") {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
        <div className="glass-card-strong rounded-3xl p-12 max-w-md mx-auto">
          <Typography variant="h4" className="text-gray-600 mb-4">
            🚫 Access Denied
          </Typography>
          <Typography variant="body1">This page is only accessible to administrators.</Typography>
        </div>
      </motion.div>
    )
  }



  const quickActions = [
    {
      title: "Product Management",
      description: "Add, edit, or remove products",
      icon: Inventory,
      color: "from-blue-500 to-purple-600",
      href: "/admin/products",
    },
    {
      title: "Product Audit Log",
      description: "View product change history",
      icon: Assignment,
      color: "from-indigo-500 to-blue-600",
      href: "/admin/product-audit",
    },
    {
      title: "Order Products",
      description: "Order products for your department",
      icon: ShoppingCart,
      color: "from-green-500 to-emerald-600",
      href: "/admin/products-order",
    },
    {
      title: "Review Approvals",
      description: "Process pending requisitions",
      icon: Assignment,
      color: "from-orange-500 to-red-600",
      href: "/approvals",
    },
    {
      title: "Export Reports",
      description: "Generate PDF and Excel reports",
      icon: GetApp,
      color: "from-purple-500 to-pink-600",
      action: () => alert("Bulk export functionality coming soon!"),
    },
    {
      title: "System Settings",
      description: "Configure system preferences",
      icon: Dashboard,
      color: "from-gray-500 to-gray-600",
      action: () => alert("Settings panel coming soon!"),
    },
  ]

  return (
    <Box className="p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <Typography variant="h3" className="font-bold text-gray-800 mb-2">
            🛠️ Admin Dashboard
          </Typography>
          <Typography variant="h6" className="text-gray-600">
            {`Welcome back, ${getUserDisplayName()}! Here's your overview.`}
          </Typography>
          
          {/* Debug Info */}
          <Box className="mt-4 p-3 bg-blue-50 rounded-lg">
            <Typography variant="body2" className="text-blue-700">
              {`🔍 Debug: Total Requisitions: ${stats.totalRequisitions} | Pending: ${stats.pendingApprovals} | Approved: ${stats.approvedRequisitions} | Total Value: ฿${stats.totalValue.toFixed(2)}`}
            </Typography>
            <Typography variant="body2" className="text-blue-700 mt-1">
              {`🏢 Role: ${user?.ROLE || 'Not set'} | Department: ${user?.DEPARTMENT || 'Not set'}`}
            </Typography>
          </Box>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <Grid container spacing={3}>
            {/* Total Requisitions */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} className="glass-card p-6 rounded-2xl hover:shadow-lg transition-shadow">
                <Box className="flex items-center justify-between">
                  <Box>
                    <Typography variant="h4" className="font-bold text-blue-600">
                      {stats.totalRequisitions}
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      Total Requisitions
                    </Typography>
                  </Box>
                  <Avatar className="bg-blue-100 text-blue-600">
                    <Assignment />
                  </Avatar>
                </Box>
              </Paper>
            </Grid>

            {/* Pending Approvals */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} className="glass-card p-6 rounded-2xl hover:shadow-lg transition-shadow">
                <Box className="flex items-center justify-between">
                  <Box>
                    <Typography variant="h4" className="font-bold text-orange-600">
                      {stats.pendingApprovals}
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      Pending
                    </Typography>
                  </Box>
                  <Avatar className="bg-orange-100 text-orange-600">
                    <Schedule />
                  </Avatar>
                </Box>
              </Paper>
            </Grid>

            {/* Approved Value */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} className="glass-card p-6 rounded-2xl hover:shadow-lg transition-shadow">
                <Box className="flex items-center justify-between">
                  <Box>
                    <Typography variant="h4" className="font-bold text-green-600">
                      ฿{stats.approvedRequisitions}
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      Approved Today
                    </Typography>
                  </Box>
                  <Avatar className="bg-green-100 text-green-600">
                    <TrendingUp />
                  </Avatar>
                </Box>
              </Paper>
            </Grid>

            {/* Total Value */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} className="glass-card p-6 rounded-2xl hover:shadow-lg transition-shadow">
                <Box className="flex items-center justify-between">
                  <Box>
                    <Typography variant="h4" className="font-bold text-purple-600">
                      ฿{(stats.totalValue || 0).toFixed(0)}
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      Total Value
                    </Typography>
                  </Box>
                  <Avatar className="bg-purple-100 text-purple-600">
                    <AttachMoney />
                  </Avatar>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </motion.div>

        {/* Price Comparison Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-8"
        >
          <Grid container spacing={3}>
            {/* Average Price Change */}
            <Grid item xs={12} sm={6} md={4}>
              <Paper elevation={0} className="glass-card p-6 rounded-2xl hover:shadow-lg transition-shadow">
                <Box className="flex items-center justify-between">
                  <Box>
                    <Typography variant="h4" className={`font-bold ${stats.avgPriceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.avgPriceChange >= 0 ? '+' : ''}{stats.avgPriceChange.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      Avg. Price Change
                    </Typography>
                  </Box>
                  <Avatar className="bg-green-100 text-green-600">
                    <TrendingUp />
                  </Avatar>
                </Box>
              </Paper>
            </Grid>

            {/* Top Price Increase */}
            <Grid item xs={12} sm={6} md={4}>
              <Paper elevation={0} className="glass-card p-6 rounded-2xl hover:shadow-lg transition-shadow">
                <Box className="flex items-center justify-between">
                  <Box>
                    <Typography variant="h4" className="font-bold text-red-600">
                      +{stats.topPriceIncrease.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      Top Price Increase
                    </Typography>
                  </Box>
                  <Avatar className="bg-red-100 text-red-600">
                    <TrendingUp />
                  </Avatar>
                </Box>
              </Paper>
            </Grid>

            {/* Top Price Decrease */}
            <Grid item xs={12} sm={6} md={4}>
              <Paper elevation={0} className="glass-card p-6 rounded-2xl hover:shadow-lg transition-shadow">
                <Box className="flex items-center justify-between">
                  <Box>
                    <Typography variant="h4" className="font-bold text-green-600">
                      {stats.topPriceDecrease.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      Top Price Decrease
                    </Typography>
                  </Box>
                  <Avatar className="bg-green-100 text-green-600">
                    <TrendingDown />
                  </Avatar>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </motion.div>

      {/* Quick Actions & Analytics */}
      <div className="w-full px-6 mb-6">
        <Grid container spacing={4}>
          {/* Quick Actions */}
          <Grid item xs={12} lg={6}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
              <Card className="modern-card h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <Dashboard className="text-white" />
                    </div>
                    <Typography variant="h5" className="font-bold text-gray-800">
                      Quick Actions
                    </Typography>
                  </div>

                  <div className="space-y-4">
                    {quickActions.map((action, index) => (
                      <Link key={action.title} href={action.href || "#"} style={{ textDecoration: 'none' }}>
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + index * 0.1 }}
                          whileHover={{ scale: 1.02, x: 5 }}
                          whileTap={{ scale: 0.98 }}
                          className="glass-button rounded-2xl p-4 cursor-pointer group"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-xl bg-gradient-to-r ${action.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}
                            >
                              <action.icon className="text-white" />
                            </div>
                            <div className="flex-1">
                              <Typography variant="subtitle1" className="font-bold text-gray-800">
                                {action.title}
                              </Typography>
                              <Typography variant="body2" className="text-gray-600">
                                {action.description}
                              </Typography>
                            </div>
                            <div className="text-gray-400 group-hover:text-gray-600 transition-colors">→</div>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Analytics Overview */}
          <Grid item xs={12} lg={6}>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
              <Card className="modern-card h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center">
                      <Analytics className="text-white" />
                    </div>
                    <Typography variant="h5" className="font-bold text-gray-800">
                      System Overview
                    </Typography>
                  </div>

                  <div className="space-y-6">
                    <div className="glass-button rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Typography variant="body1" className="font-semibold text-gray-700">
                          Active Users
                        </Typography>
                        <Typography variant="h6" className="font-bold text-blue-600">
                          {stats.activeUsers}
                        </Typography>
                      </div>
                      <LinearProgress
                        variant="determinate"
                        value={80}
                        className="h-2 rounded-full"
                        sx={{
                          backgroundColor: "rgba(59, 130, 246, 0.1)",
                          "& .MuiLinearProgress-bar": {
                            background: "linear-gradient(90deg, #3b82f6, #1d4ed8)",
                            borderRadius: "10px",
                          },
                        }}
                      />
                    </div>

                    <div className="glass-button rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Typography variant="body1" className="font-semibold text-gray-700">
                          Low Stock Items
                        </Typography>
                        <Typography variant="h6" className="font-bold text-orange-600">
                          {stats.lowStockItems}
                        </Typography>
                      </div>
                      <LinearProgress
                        variant="determinate"
                        value={30}
                        className="h-2 rounded-full"
                        sx={{
                          backgroundColor: "rgba(249, 115, 22, 0.1)",
                          "& .MuiLinearProgress-bar": {
                            background: "linear-gradient(90deg, #f97316, #ea580c)",
                            borderRadius: "10px",
                          },
                        }}
                      />
                    </div>

                    <div className="glass-button rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Typography variant="body1" className="font-semibold text-gray-700">
                          Monthly Growth
                        </Typography>
                        <Typography variant="h6" className="font-bold text-green-600">
                          +{stats.monthlyGrowth}%
                        </Typography>
                      </div>
                      <LinearProgress
                        variant="determinate"
                        value={stats.monthlyGrowth * 5}
                        className="h-2 rounded-full"
                        sx={{
                          backgroundColor: "rgba(34, 197, 94, 0.1)",
                          "& .MuiLinearProgress-bar": {
                            background: "linear-gradient(90deg, #22c55e, #16a34a)",
                            borderRadius: "10px",
                          },
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </div>

      {/* Price Comparison Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, delay: 0.75 }}
        className="w-full px-6 mb-6"
      >
        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center">
                  <AttachMoney className="text-white" />
                </div>
                <Typography variant="h5" className="font-bold text-gray-800">
                  Price Comparison ({selectedYear})
                </Typography>
              </div>

              <div className="flex gap-3">
                <FormControl size="small" className="min-w-32">
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    label="Year"
                  >
                    <MenuItem value={2023}>2023</MenuItem>
                    <MenuItem value={2024}>2024</MenuItem>
                    <MenuItem value={2025}>2025</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" className="min-w-40">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category.CATEGORY_ID} value={category.CATEGORY_NAME}>
                        {category.CATEGORY_NAME}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  size="small"
                  onClick={fetchProductPrices}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  Refresh
                </Button>

                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="csv-import"
                />
                <label htmlFor="csv-import">
                  <Button
                    variant="outlined"
                    size="small"
                    component="span"
                    className="border-green-300 hover:border-green-400 text-green-600"
                    disabled={importing}
                  >
                    {importing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        กำลังนำเข้า...
                      </div>
                    ) : (
                      "Import CSV"
                    )}
                  </Button>
                </label>
              </div>
            </div>

            {productPrices.length > 0 ? (
              <TableContainer className="glass-button rounded-2xl">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="font-bold text-gray-700">Product</TableCell>
                      <TableCell className="font-bold text-gray-700">Category</TableCell>
                      <TableCell className="font-bold text-gray-700">Current Price</TableCell>
                      <TableCell className="font-bold text-gray-700">Previous Price</TableCell>
                      <TableCell className="font-bold text-gray-700">Change</TableCell>
                      <TableCell className="font-bold text-gray-700">% Change</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {productPrices.slice(0, 10).map((item, index) => (
                      <TableRow
                        key={item.PRODUCT_ID || index}
                        className="hover:bg-white/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.PHOTO_URL ? (
                              <Image 
                                src={getImageUrl(item.PHOTO_URL)} 
                                alt={item.PRODUCT_NAME}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-lg object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/stationaryhub/placeholder.jpg'
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
                                <Inventory className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <Typography variant="body2" className="font-semibold">
                                {item.PRODUCT_NAME}
                              </Typography>
                              <Typography variant="caption" className="text-gray-500">
                                ID: {item.PRODUCT_ID}
                              </Typography>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={item.CATEGORY_NAME || 'N/A'} 
                            size="small" 
                            className="bg-blue-100 text-blue-800"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" className="font-semibold text-green-600">
                            ฿{parseFloat(item.CURRENT_PRICE?.toString() || '0').toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" className="text-gray-600">
                            ฿{parseFloat(item.PREVIOUS_PRICE?.toString() || '0').toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            className={`font-semibold ${
                              parseFloat(item.PRICE_CHANGE?.toString() || '0') >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {parseFloat(item.PRICE_CHANGE?.toString() || '0') >= 0 ? '+' : ''}
                            ฿{parseFloat(item.PRICE_CHANGE?.toString() || '0').toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {parseFloat(item.PERCENTAGE_CHANGE?.toString() || '0') >= 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                            <Typography 
                              variant="body2" 
                              className={`font-bold ${
                                parseFloat(item.PERCENTAGE_CHANGE?.toString() || '0') >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {parseFloat(item.PERCENTAGE_CHANGE?.toString() || '0') >= 0 ? '+' : ''}
                              {parseFloat(item.PERCENTAGE_CHANGE?.toString() || '0').toFixed(1)}%
                            </Typography>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <div className="text-center py-8">
                <Typography variant="body1" className="text-gray-500">
                  No price comparison data available. Click "Refresh" to load data.
                </Typography>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Real Price History Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, delay: 0.8 }}
        className="w-full px-6 mb-6"
      >
        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
                  <Timeline className="text-white" />
                </div>
                <Typography variant="h5" className="font-bold text-gray-800">
                  Real Price History
                </Typography>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={fetchRealPriceHistory}
                  className="border-gray-300 hover:border-gray-400"
                >
                  Refresh History
                </Button>
              </div>
            </div>

            {realPriceHistory.length > 0 ? (
              <TableContainer className="glass-button rounded-2xl">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="font-bold text-gray-700">Product</TableCell>
                      <TableCell className="font-bold text-gray-700">Year</TableCell>
                      <TableCell className="font-bold text-gray-700">Price</TableCell>
                      <TableCell className="font-bold text-gray-700">Price Change</TableCell>
                      <TableCell className="font-bold text-gray-700">% Change</TableCell>
                      <TableCell className="font-bold text-gray-700">Date</TableCell>
                      <TableCell className="font-bold text-gray-700">Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {realPriceHistory.slice(0, 10).map((item, index) => (
                      <TableRow
                        key={item.HISTORY_ID || index}
                        className="hover:bg-white/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.PHOTO_URL ? (
                              <Image 
                                src={getImageUrl(item.PHOTO_URL)} 
                                alt={item.PRODUCT_NAME}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-lg object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/stationaryhub/placeholder.jpg'
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
                                <Inventory className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <Typography variant="body2" className="font-semibold">
                                {item.PRODUCT_NAME}
                              </Typography>
                              <Typography variant="caption" className="text-gray-500">
                                ID: {item.PRODUCT_ID}
                              </Typography>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={item.YEAR} 
                            size="small" 
                            className="bg-blue-100 text-blue-800"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" className="font-semibold text-green-600">
                            ฿{parseFloat(item.PRICE || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            className={`font-semibold ${
                              parseFloat(item.PRICE_CHANGE || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {parseFloat(item.PRICE_CHANGE || 0) >= 0 ? '+' : ''}
                            ฿{parseFloat(item.PRICE_CHANGE || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {parseFloat(item.PERCENTAGE_CHANGE || 0) >= 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                            <Typography 
                              variant="body2" 
                              className={`font-bold ${
                                parseFloat(item.PERCENTAGE_CHANGE || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {parseFloat(item.PERCENTAGE_CHANGE || 0) >= 0 ? '+' : ''}
                              {parseFloat(item.PERCENTAGE_CHANGE || 0).toFixed(1)}%
                            </Typography>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" className="text-gray-600">
                            {new Date(item.RECORDED_DATE).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" className="text-gray-600 max-w-32 truncate">
                            {item.NOTES || '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <div className="text-center py-8">
                <Typography variant="body1" className="text-gray-500">
                  No real price history available. Update some prices to see history.
                </Typography>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Requisitions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="w-full px-6 mb-6"
      >
        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                  <Timeline className="text-white" />
                </div>
                <Typography variant="h5" className="font-bold text-gray-800">
                  Recent Requisitions
                </Typography>
              </div>

              <Link href="/approvals" style={{ textDecoration: 'none' }}>
                <Button variant="outlined" className="glass-button rounded-xl">
                  View All
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="glass-button rounded-2xl p-4 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <TableContainer className="glass-button rounded-2xl">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="font-bold text-gray-700">Requisition</TableCell>
                      <TableCell className="font-bold text-gray-700">Requested By</TableCell>
                      <TableCell className="font-bold text-gray-700">Date</TableCell>
                      <TableCell className="font-bold text-gray-700">Amount</TableCell>
                      <TableCell className="font-bold text-gray-700">Status</TableCell>
                      <TableCell className="font-bold text-gray-700">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requisitions.map((requisition, index) => (
                      <motion.tr
                        key={requisition.REQUISITION_ID}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                        className="hover:bg-white/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                              <Typography variant="body2" className="font-bold text-white">
                                #{requisition.REQUISITION_ID}
                              </Typography>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600">👤</Avatar>
                            <div>
                              <Typography variant="subtitle2" className="font-semibold">
                                {requisition.USERNAME}
                              </Typography>
                              <Typography variant="caption" className="text-gray-500">
                                {requisition.ISSUE_NOTE?.substring(0, 30)}...
                              </Typography>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" className="text-gray-600">
                            {formatDate(requisition.SUBMITTED_AT)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                                                     <Typography variant="h6" className="font-bold text-green-600">
                             ฿{(parseFloat(requisition.TOTAL_AMOUNT?.toString() || '0') || 0).toFixed(2)}
                           </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={requisition.STATUS}
                            color={getStatusColor(requisition.STATUS) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                            size="small"
                            className="font-semibold"
                          />
                        </TableCell>
                        <TableCell>
                          {/* ปุ่มแจ้งเตือนว่าสินค้ามาแล้ว */}
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              size="small"
                              onClick={() => handleNotifyArrival(requisition)}
                              disabled={requisition.STATUS !== "APPROVED"}
                              variant="contained"
                              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-xl px-4 py-2"
                              startIcon={<span className="text-sm">📦</span>}
                            >
                              แจ้งเตือน
                            </Button>
                          </motion.div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Export Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          className: "glass-card-strong rounded-2xl mt-2",
        }}
      >
        <MenuItem onClick={() => handleExport("pdf")} className="rounded-xl mx-2 my-1">
          <PictureAsPdf className="mr-3 text-red-600" />
          <Typography>Export as PDF</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleExport("excel")} className="rounded-xl mx-2 my-1">
          <TableChart className="mr-3 text-green-600" />
          <Typography>Export as Excel</Typography>
        </MenuItem>
      </Menu>

      {/* Notification Dialog */}
      <Dialog
        open={notifyDialogOpen}
        onClose={() => setNotifyDialogOpen(false)}
        PaperProps={{
          className: "glass-card-strong rounded-2xl",
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="text-center" component="div">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl">📦</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">สินค้ามาแล้ว!</div>
        </DialogTitle>
        
        <DialogContent className="text-center text-gray-600 mb-4">
          <Typography variant="body2" component="div">
            ส่งการแจ้งเตือนให้ผู้ใช้ทราบ
          </Typography>
        </DialogContent>
        
        <DialogContent>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="text-center">
                <p className="text-lg font-bold text-blue-800 mb-2">
                  Requisition #{selectedRequisition?.REQUISITION_ID}
                </p>
                <p className="text-blue-600">
                  ผู้ขอเบิก: <span className="font-semibold">{selectedRequisition?.USERNAME || selectedRequisition?.USER_ID}</span>
                </p>
                <p className="text-blue-600">
                  จำนวนเงิน: <span className="font-semibold">฿{(parseFloat(selectedRequisition?.TOTAL_AMOUNT?.toString() || '0') || 0).toFixed(2)}</span>
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 text-center">
                ข้อความแจ้งเตือน
              </label>
              <textarea
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none text-center text-gray-700"
                placeholder="พิมพ์ข้อความแจ้งเตือนที่นี่..."
              />
              <p className="text-xs text-gray-500 text-center">
                หรือใช้ข้อความเริ่มต้นที่แนะนำไว้
              </p>
            </div>
            
            {/* ตัวเลือกส่งอีเมล */}
            <div className="flex items-center justify-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <input
                type="checkbox"
                id="sendEmail"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
              />
              <label htmlFor="sendEmail" className="text-sm font-medium text-blue-800">
                📧 ส่งอีเมลแจ้งเตือนไปยังผู้ใช้ด้วย
              </label>
            </div>
            
            {/* ข้อมูลเพิ่มเติม */}
            {sendEmail && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800 text-center">
                  💡 <strong>หมายเหตุ:</strong> ระบบจะส่งอีเมลไปยัง email ที่ผู้ใช้ลงทะเบียนไว้ในระบบ LDAP
                </p>
              </div>
            )}
          </div>
        </DialogContent>
        
        <div className="flex gap-3 px-6 pb-6 justify-end">
          <Button
            variant="outlined"
            onClick={() => setNotifyDialogOpen(false)}
            disabled={notifying}
            className="flex-1 h-12 text-base font-medium border-2 border-gray-300 hover:border-gray-400"
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmitNotification}
            disabled={notifying}
            className="flex-1 h-12 text-base font-medium bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {notifying ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                กำลังส่ง...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg">📦</span>
                {sendEmail ? "ส่งการแจ้งเตือน + อีเมล" : "ส่งการแจ้งเตือน"}
              </div>
            )}
          </Button>
        </div>
      </Dialog>
        </motion.div>
      </Box>
    )
  }
