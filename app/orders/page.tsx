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
      
      console.log("🔍 Fetching orders for user:", user?.USER_ID || user?.AdLoginName || user?.id)
      console.log("🔍 User authentication status:", isAuthenticated)
      console.log("🔍 User data:", user)
      
      const response = await fetch("/api/my-orders", {
        // เพิ่ม cache headers
        headers: {
          'Cache-Control': 'max-age=60' // cache 1 นาที
        }
      })
      const data = await response.json()
      
      console.log("📊 Orders API response:", response.status, data)
      
      if (response.ok) {
        if (Array.isArray(data)) {
          if (data.length > 0) {
            console.log("✅ First order details:", data[0])
            console.log("📦 REQUISITION_ITEMS:", data[0].REQUISITION_ITEMS)
            console.log("👤 Order belongs to user:", data[0].USER_ID)
          }
          setOrders(data)
          setLastUpdated(new Date())
        } else {
          console.log("📭 No orders found for user")
          setOrders([])
          setLastUpdated(new Date())
        }
      } else {
        console.error("❌ API error:", data)
        setError(data.error || "ไม่สามารถดึงข้อมูลได้")
        setOrders([])
      }
    } catch (error) {
      console.error("❌ Error fetching orders:", error)
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
      setOrders([])
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      } else {
        setUpdating(false)
      }
    }
  }, [user, isAuthenticated])

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

  const refreshOrders = async () => {
    try {
      setUpdating(true)
      setError(null)
      
      const response = await fetch("/api/my-orders")
      const data = await response.json()
      
      if (response.ok) {
        if (Array.isArray(data)) {
          setOrders(data)
          setLastUpdated(new Date())
        } else {
          setOrders([])
          setLastUpdated(new Date())
        }
      } else {
        setError(data.error || "ไม่สามารถดึงข้อมูลได้")
      }
    } catch (error) {
      console.error("Error refreshing orders:", error)
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
      setUpdating(false)
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
        return "Approved"
      case "PENDING":
        return "Pending Approval"
      case "REJECTED":
        return "Rejected"
      default:
        return status || "Pending Approval"
    }
  }

  if (!isAuthenticated || !user) return null

  // ตรวจสอบว่าเป็น USER หรือ MANAGER
  const allowedRoles = ["USER", "MANAGER", "ADMIN"]
  if (!allowedRoles.includes(user.ROLE)) {
    return (
      <Box className="text-center py-20">
        <Typography variant="h6" className="text-gray-600 mb-4">
          🚫 Access Denied
        </Typography>
        <Typography variant="body1">
          This page is only accessible to users, managers, and administrators.
        </Typography>
      </Box>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {/* Header */}
      <Box className="flex justify-between items-center mb-6">
        <Typography variant="h4" className="font-bold text-gray-800">
          📦 My Purchase Orders
        </Typography>
        <Button
          variant="outlined"
          onClick={refreshOrders}
          disabled={loading}
          startIcon={<RefreshIcon className={loading ? "animate-spin" : ""} />}
        >
          {loading ? "Loading..." : updating ? "Updating..." : "Update"}
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
          🔍 Debug: Found {orders.length} orders for user: <strong>{user?.USERNAME || user?.AdLoginName || user?.id || 'Unknown'}</strong>
          {lastUpdated && (
            <span className="ml-2 text-xs">
              (Last updated: {lastUpdated.toLocaleTimeString('th-TH', { hour12: false })})
            </span>
          )}
          {updating && (
            <span className="ml-2 text-xs text-orange-600">
              🔄 Auto-updating...
            </span>
          )}
        </Typography>
        <Typography variant="body2" className="text-green-700 mt-1">
          👤 User ID: {user?.USER_ID || 'N/A'} | Role: {user?.ROLE || 'N/A'}
        </Typography>
      </Box>

      {loading ? (
        <Box className="flex justify-center items-center min-h-[30vh]">
          <CircularProgress />
        </Box>
      ) : !Array.isArray(orders) || orders.length === 0 ? (
        <Box className="text-center py-16">
          <Typography variant="h6" className="text-gray-500 mb-2">
            No purchase orders found
          </Typography>
          <Typography variant="body2" className="text-gray-400 mb-4">
            Start ordering products from the first page
          </Typography>
          <Button 
            variant="outlined" 
            onClick={() => window.location.href = "/test-data"}
          >
            Create Test Data
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
                        minute: '2-digit',
                        hour12: false
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
                      Total Amount: <span className="font-semibold">฿{(Number(order.TOTAL_AMOUNT) || 0).toFixed(2)}</span>
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      Items: <span className="font-semibold">{Array.isArray(order.REQUISITION_ITEMS) ? order.REQUISITION_ITEMS.length : 0} items</span>
                    </Typography>
                  </Box>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => handleViewDetails(order)}
                    startIcon={<VisibilityIcon />}
                  >
                    View Details
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
          Order Details #{selectedOrder?.REQUISITION_ID}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Box className="mb-4">
                <Box className="flex justify-between items-center mb-2">
                  <Typography variant="body2" className="text-gray-600">Status:</Typography>
                  <Chip 
                    label={getStatusText(selectedOrder.STATUS)} 
                    color={getStatusColor(selectedOrder.STATUS) as "success" | "warning" | "error" | "default"}
                    size="small"
                  />
                </Box>
                <Box className="flex justify-between items-center mb-2">
                  <Typography variant="body2" className="text-gray-600">Date:</Typography>
                  <Typography variant="body2">
                    {new Date(selectedOrder.SUBMITTED_AT).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </Typography>
                </Box>
                <Box className="flex justify-between items-center mb-2">
                  <Typography variant="body2" className="text-gray-600">Total Amount:</Typography>
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
              
              {/* Product List */}
              {Array.isArray(selectedOrder.REQUISITION_ITEMS) && selectedOrder.REQUISITION_ITEMS.length > 0 && (
                <Box>
                  <Typography variant="h6" className="mb-3">Product List</Typography>
                  <Box className="space-y-2">
                    {selectedOrder.REQUISITION_ITEMS.map((item) => (
                      <Box key={item.REQUISITION_ITEM_ID} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <Box>
                          <Typography variant="body2" className="font-medium">
                            {item.PRODUCT_NAME}
                          </Typography>
                          <Typography variant="body2" className="text-gray-600">
                            Quantity: {item.QUANTITY} x ฿{item.UNIT_PRICE}
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
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  )
} 