"use client"

import { useEffect, useState } from "react"
import { 
  Typography, 
  Card, 
  CardContent, 
  Box, 
  Chip, 
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from "@mui/material"
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { useAuth } from "@/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import type { Requisition } from "@/lib/database"

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
           if (data && data.length > 0) {
             console.log("First order details:", data[0])
             console.log("REQUISITION_ITEMS:", data[0].REQUISITION_ITEMS)
           }
           setOrders(data)
           setLoading(false)
         })
        .catch((error) => {
          console.error("Error fetching orders:", error)
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
        setOrders(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Error refreshing orders:", error)
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
             ) : orders.length === 0 ? (
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
           {orders?.map((order) => (
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
                       รายการ: <span className="font-semibold">{order.REQUISITION_ITEMS?.length || 0} รายการ</span>
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
                
                <Typography variant="subtitle1" className="mb-2 font-semibold">
                  รายการสินค้า
                </Typography>
                
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>สินค้า</TableCell>
                        <TableCell align="right">จำนวน</TableCell>
                        <TableCell align="right">ราคา</TableCell>
                        <TableCell align="right">รวม</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrder.REQUISITION_ITEMS?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.PRODUCT_NAME}</TableCell>
                          <TableCell align="right">{item.QUANTITY}</TableCell>
                          <TableCell align="right">฿{(Number(item.UNIT_PRICE) || 0).toFixed(2)}</TableCell>
                          <TableCell align="right">฿{(Number(item.TOTAL_PRICE) || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} variant="outlined">
              ปิด
            </Button>
          </DialogActions>
        </Dialog>
     </motion.div>
   )
 } 