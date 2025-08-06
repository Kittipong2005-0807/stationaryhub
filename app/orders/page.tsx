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
  DialogActions
} from "@mui/material"
import { Refresh as RefreshIcon, Visibility as VisibilityIcon } from "@mui/icons-material"
import { useAuth } from "@/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

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
  const [selectedOrder, setSelectedOrder] = useState<Requisition | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || user?.ROLE !== "USER") {
      router.push("/login")
      return
    }
    
    const fetchOrders = () => {
      setLoading(true)
      fetch("/api/requisitions?mine=1")
        .then((res) => res.json())
        .then((data) => {
          console.log("Orders data:", data)
          // ตรวจสอบว่า data เป็น array หรือไม่
          if (Array.isArray(data)) {
            if (data.length > 0) {
              console.log("First order details:", data[0])
              console.log("REQUISITION_ITEMS:", data[0].REQUISITION_ITEMS)
            }
            setOrders(data)
          } else {
            console.log("Data is not an array, setting empty array")
            setOrders([])
          }
          setLoading(false)
        })
        .catch((error) => {
          console.error("Error fetching orders:", error)
          setOrders([]) // ตั้งค่าเป็น array ว่างเมื่อเกิด error
          setLoading(false)
        })
    }

    // ดึงข้อมูลครั้งแรก
    fetchOrders()

    // อัพเดทข้อมูลทุก 30 วินาที
    const interval = setInterval(fetchOrders, 30000)

    // Cleanup interval เมื่อ component unmount
    return () => clearInterval(interval)
  }, [isAuthenticated, user, router])

  const handleViewDetails = (order: Requisition) => {
    setSelectedOrder(order)
    setDetailDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDetailDialogOpen(false)
    setSelectedOrder(null)
  }

  const handleRefresh = () => {
    setLoading(true)
    fetch("/api/requisitions?mine=1")
      .then((res) => res.json())
      .then((data) => {
        console.log("Orders data refreshed:", data)
        // ตรวจสอบว่า data เป็น array หรือไม่
        if (Array.isArray(data)) {
          setOrders(data)
        } else {
          console.log("Refreshed data is not an array, setting empty array")
          setOrders([])
        }
        setLoading(false)
      })
      .catch((error) => {
        console.error("Error refreshing orders:", error)
        setOrders([]) // ตั้งค่าเป็น array ว่างเมื่อเกิด error
        setLoading(false)
      })
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
          {loading ? "กำลังโหลด..." : "อัพเดท"}
        </Button>
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
          <Typography variant="body2" className="text-gray-400">
            เริ่มต้นการสั่งซื้อสินค้าจากหน้าแรก
          </Typography>
        </Box>
      ) : (
        <Box className="space-y-4">
          {orders.map((order) => (
            <Card key={order.REQUISITION_ID} className="shadow-sm border hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Box className="flex justify-between items-start mb-3">
                  <Box>
                    <Typography variant="h6" className="font-semibold text-gray-800">
                      Order #{order.REQUISITION_ID}
                    </Typography>
                    <Typography variant="body2" className="text-gray-500">
                      {new Date(order.SUBMITTED_AT).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Chip 
                    label={order.STATUS} 
                    color={order.STATUS === "APPROVED" ? "success" : order.STATUS === "PENDING" ? "warning" : "default"}
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
                    label={selectedOrder.STATUS} 
                    color={selectedOrder.STATUS === "APPROVED" ? "success" : selectedOrder.STATUS === "PENDING" ? "warning" : "default"}
                    size="small"
                  />
                </Box>
                <Box className="flex justify-between items-center mb-2">
                  <Typography variant="body2" className="text-gray-600">วันที่:</Typography>
                  <Typography variant="body2">{new Date(selectedOrder.SUBMITTED_AT).toLocaleDateString()}</Typography>
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