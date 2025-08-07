"use client"

import { useState, useEffect } from "react"
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Chip, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from "@mui/material"
import { Refresh as RefreshIcon, Visibility as VisibilityIcon } from "@mui/icons-material"
import { useAuth } from "@/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import React from "react"

interface RequisitionItem {
  REQUISITION_ITEM_ID: string
  PRODUCT_ID: string
  PRODUCT_NAME: string
  QUANTITY: number
  UNIT_PRICE: number
  TOTAL_PRICE: number
}

interface Requisition {
  REQUISITION_ID: string
  USER_ID: string
  SUBMITTED_AT: string
  STATUS: string
  TOTAL_AMOUNT: number
  ISSUE_NOTE?: string
  REQUISITION_ITEMS?: RequisitionItem[]
}

export default function OrdersPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Requisition | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchOrders = React.useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true)
      } else {
        setUpdating(true)
      }
      setError(null)
      
      console.log("Fetching orders...")
      const response = await fetch("/api/requisitions?mine=1", {
        // เพิ่ม cache headers
        headers: {
          'Cache-Control': 'max-age=60' // cache 1 นาที
        }
      })
      const data = await response.json()
      
      console.log("Orders API response:", response.status, data)
      
      if (response.ok) {
        if (Array.isArray(data)) {
          if (data.length > 0) {
            console.log("First order details:", data[0])
            console.log("REQUISITION_ITEMS:", data[0].REQUISITION_ITEMS)
          }
          setOrders(data)
          setLastUpdated(new Date())
        } else {
          console.log("Data is not an array, setting empty array")
          setOrders([])
          setLastUpdated(new Date())
        }
      } else {
        console.error("API error:", data)
        setError(data.error || "ไม่สามารถดึงข้อมูลได้")
        setOrders([])
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
      setOrders([])
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      } else {
        setUpdating(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || user?.ROLE !== "USER") {
      router.push("/login")
      return
    }
    
    // ดึงข้อมูลครั้งแรก
    fetchOrders(true)

    // อัพเดทข้อมูลทุก 30 วินาที (แทน 10 วินาที)
    const interval = setInterval(() => fetchOrders(false), 30000)

    // Cleanup interval เมื่อ component unmount
    return () => clearInterval(interval)
  }, [isAuthenticated, user, router, fetchOrders])

  // อัพเดทข้อมูลเมื่อ focus กลับมาที่หน้า (ลดความถี่)
  useEffect(() => {
    let focusTimeout: NodeJS.Timeout
    
    const handleFocus = () => {
      // เพิ่ม debounce เพื่อป้องกันการ fetch ซ้ำ
      clearTimeout(focusTimeout)
      focusTimeout = setTimeout(() => {
        console.log("Page focused, refreshing orders...")
        fetchOrders(false)
      }, 2000) // รอ 2 วินาทีก่อน fetch
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
      clearTimeout(focusTimeout)
    }
  }, [fetchOrders])

  const handleViewDetails = (order: Requisition) => {
    setSelectedOrder(order)
    setDetailDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDetailDialogOpen(false)
    setSelectedOrder(null)
  }

  const handleRefresh = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log("Refreshing orders...")
      const response = await fetch("/api/requisitions?mine=1")
      const data = await response.json()
      
      console.log("Orders refresh response:", response.status, data)
      
      if (response.ok) {
        if (Array.isArray(data)) {
          setOrders(data)
          setLastUpdated(new Date())
        } else {
          console.log("Refreshed data is not an array, setting empty array")
          setOrders([])
          setLastUpdated(new Date())
        }
      } else {
        console.error("API error:", data)
        setError(data.error || "ไม่สามารถดึงข้อมูลได้")
      }
    } catch (error) {
      console.error("Error refreshing orders:", error)
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return "success"
      case "PENDING":
        return "warning"
      case "REJECTED":
        return "error"
      default:
        return "default"
    }
  }

  const getStatusText = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return "อนุมัติแล้ว"
      case "PENDING":
        return "รออนุมัติ"
      case "REJECTED":
        return "ไม่อนุมัติ"
      default:
        return status || "รออนุมัติ"
    }
  }

  if (!isAuthenticated || user?.ROLE !== "USER") return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {/* Header */}
      <Box className="flex justify-between items-center mb-6">
        <Typography variant="h4" className="font-bold text-gray-800">
          📦 คำสั่งซื้อของฉัน
        </Typography>
        <Button
          variant="outlined"
          onClick={handleRefresh}
          disabled={loading}
          startIcon={<RefreshIcon className={loading ? "animate-spin" : ""} />}
        >
          {loading ? "กำลังโหลด..." : updating ? "กำลังอัพเดท..." : "อัพเดท"}
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" className="mb-4 glass-card">
          {error}
        </Alert>
      )}

      {/* Debug Info */}
      <Box className="mb-4 p-3 glass-card rounded">
        <Typography variant="body2" className="text-blue-700">
          🔍 Debug: พบคำสั่งซื้อ {orders.length} รายการ
          {lastUpdated && (
            <span className="ml-2 text-xs">
              (อัพเดทล่าสุด: {lastUpdated.toLocaleTimeString('th-TH')})
            </span>
          )}
          {updating && (
            <span className="ml-2 text-xs text-orange-600">
              🔄 กำลังอัพเดทอัตโนมัติ...
            </span>
          )}
        </Typography>
      </Box>

      {loading ? (
        <Box className="flex justify-center items-center min-h-[30vh]">
          <CircularProgress />
        </Box>
      ) : !Array.isArray(orders) || orders.length === 0 ? (
        <Box className="text-center py-16">
          <Typography variant="h6" className="text-gray-500 mb-2">
            ไม่พบประวัติคำสั่งซื้อ
          </Typography>
          <Typography variant="body2" className="text-gray-400 mb-4">
            เริ่มต้นการสั่งซื้อสินค้าจากหน้าแรก
          </Typography>
          <Button 
            variant="outlined" 
            onClick={() => window.location.href = "/test-data"}
          >
            สร้างข้อมูลทดสอบ
          </Button>
        </Box>
      ) : (
        <Box className="space-y-4">
          {orders.map((order) => (
            <Card key={order.REQUISITION_ID} className="glass-card">
              <CardContent className="p-4">
                <Box className="flex justify-between items-start mb-3">
                  <Box>
                    <Typography variant="h6" className="font-semibold text-gray-800">
                      Order #{order.REQUISITION_ID}
                    </Typography>
                    <Typography variant="body2" className="text-gray-500">
                      {new Date(order.SUBMITTED_AT).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                  </Box>
                  <Chip 
                    label={getStatusText(order.STATUS)} 
                    color={getStatusColor(order.STATUS) as "success" | "warning" | "error" | "default"}
                    size="small"
                  />
                </Box>

                <Box className="flex justify-between items-center mb-3">
                  <Box>
                    <Typography variant="body2" className="text-gray-600">
                      ยอดรวม: <span className="font-semibold">฿{(Number(order.TOTAL_AMOUNT) || 0).toFixed(2)}</span>
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      รายการ: <span className="font-semibold">{Array.isArray(order.REQUISITION_ITEMS) ? order.REQUISITION_ITEMS.length : 0} รายการ</span>
                    </Typography>
                  </Box>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => handleViewDetails(order)}
                    startIcon={<VisibilityIcon />}
                  >
                    ดูรายละเอียด
                  </Button>
                </Box>

                {order.ISSUE_NOTE && (
                  <Typography variant="body2" className="text-gray-600 bg-gray-50 p-2 rounded">
                    📝 {order.ISSUE_NOTE}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      
      {/* Dialog รายละเอียด */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          รายละเอียด Order #{selectedOrder?.REQUISITION_ID}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Box className="mb-4">
                <Box className="flex justify-between items-center mb-2">
                  <Typography variant="body2" className="text-gray-600">สถานะ:</Typography>
                  <Chip 
                    label={getStatusText(selectedOrder.STATUS)} 
                    color={getStatusColor(selectedOrder.STATUS) as "success" | "warning" | "error" | "default"}
                    size="small"
                  />
                </Box>
                <Box className="flex justify-between items-center mb-2">
                  <Typography variant="body2" className="text-gray-600">วันที่:</Typography>
                  <Typography variant="body2">
                    {new Date(selectedOrder.SUBMITTED_AT).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                </Box>
                <Box className="flex justify-between items-center mb-2">
                  <Typography variant="body2" className="text-gray-600">ยอดรวม:</Typography>
                  <Typography variant="body2" className="font-semibold">฿{(Number(selectedOrder.TOTAL_AMOUNT) || 0).toFixed(2)}</Typography>
                </Box>
                {selectedOrder.ISSUE_NOTE && (
                  <Box className="mt-3 p-2 bg-gray-50 rounded">
                    <Typography variant="body2" className="text-gray-700">
                      📝 {selectedOrder.ISSUE_NOTE}
                    </Typography>
                  </Box>
                )}
              </Box>
              
              {/* รายการสินค้า */}
              {Array.isArray(selectedOrder.REQUISITION_ITEMS) && selectedOrder.REQUISITION_ITEMS.length > 0 && (
                <Box>
                  <Typography variant="h6" className="mb-3">รายการสินค้า</Typography>
                  <Box className="space-y-2">
                    {selectedOrder.REQUISITION_ITEMS.map((item) => (
                      <Box key={item.REQUISITION_ITEM_ID} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <Box>
                          <Typography variant="body2" className="font-medium">
                            {item.PRODUCT_NAME}
                          </Typography>
                          <Typography variant="body2" className="text-gray-600">
                            จำนวน: {item.QUANTITY} x ฿{item.UNIT_PRICE}
                          </Typography>
                        </Box>
                        <Typography variant="body2" className="font-semibold">
                          ฿{item.TOTAL_PRICE}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>ปิด</Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  )
} 