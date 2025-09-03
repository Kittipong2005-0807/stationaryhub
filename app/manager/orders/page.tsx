"use client"

import React, { useState, useEffect } from "react"
import {
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
  Box,
  Grid,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material"
import {
  Visibility,
  ShoppingCart,
  Person,
  CalendarToday,
  // AttachMoney,
  Note,
  Category,
  Inventory,
  CheckCircle,
  Cancel,
  Pending,
} from "@mui/icons-material"
import { motion } from "framer-motion"
import { useAuth } from "@/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { getBasePathUrl } from "@/lib/base-path"
import { getApiUrl } from "@/lib/api-utils"
import ThaiDateUtils from '@/lib/date-utils'

interface RequisitionItem {
  ITEM_ID: number
  PRODUCT_ID: number
  PRODUCT_NAME: string
  CATEGORY_NAME?: string
  QUANTITY: number
  UNIT_PRICE: number
  TOTAL_PRICE: number
  PHOTO_URL?: string
}

interface Requisition {
  REQUISITION_ID: number
  USER_ID: string
  USERNAME?: string
  EMAIL?: string
  DEPARTMENT?: string
  TOTAL_AMOUNT: number
  STATUS: string
  SUBMITTED_AT: string
  ISSUE_NOTE?: string
  REQUISITION_ITEMS?: RequisitionItem[]
}

export default function ManagerOrdersPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || user?.ROLE !== "MANAGER") {
      router.push(getBasePathUrl("/login"))
      return
    }

    fetchRequisitions()
  }, [isAuthenticated, user, router])

  const fetchRequisitions = async () => {
    try {
      setLoading(true)
      // ดึง order ของตัว Manager เองเท่านั้น
      const response = await fetch(getApiUrl("/api/requisitions?mine=1"))
      const data = await response.json()
      
      if (response.ok) {
        setRequisitions(data || [])
      } else {
        console.error("Failed to fetch requisitions:", data.error)
      }
    } catch (error) {
      console.error("Error fetching requisitions:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRequisitionDetails = async (requisitionId: number) => {
    try {
      setDetailLoading(true)
      const response = await fetch(getApiUrl(`/api/requisitions/${requisitionId}`))
      const data = await response.json()
      
      if (response.ok) {
        console.log("📦 Requisition details:", data)
        console.log("🖼️ Items with photos:", data.REQUISITION_ITEMS?.map((item: any) => ({
          name: item.PRODUCT_NAME,
          photo: item.PHOTO_URL,
          category: item.CATEGORY_NAME
        })))
        setSelectedRequisition(data)
        setDetailDialogOpen(true)
      } else {
        console.error("Failed to fetch requisition details:", data.error)
        alert("ไม่สามารถดึงข้อมูลรายละเอียดได้")
      }
    } catch (error) {
      console.error("Error fetching requisition details:", error)
      alert("เกิดข้อผิดพลาดในการดึงข้อมูล")
    } finally {
      setDetailLoading(false)
    }
  }

  const handleViewDetails = (requisition: Requisition) => {
    fetchRequisitionDetails(requisition.REQUISITION_ID)
  }

  const handleCloseDialog = () => {
    setDetailDialogOpen(false)
    setSelectedRequisition(null)
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "APPROVED":
        return "bg-green-100 text-green-800 border-green-200"
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return <Pending className="h-4 w-4" />
      case "APPROVED":
        return <CheckCircle className="h-4 w-4" />
      case "REJECTED":
        return <Cancel className="h-4 w-4" />
      default:
        return <Pending className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return ThaiDateUtils.formatMediumThaiDate(dateString)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount)
  }

  // ฟังก์ชันสำหรับสร้าง URL รูปภาพที่ถูกต้อง
  const getImageUrl = (photoUrl: string | null | undefined) => {
    if (!photoUrl) return '/stationaryhub/placeholder.jpg'
    
    // ถ้าเป็น URL เต็มแล้ว ให้ใช้เลย
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl
    }
    
    // ถ้าเป็น filename ธรรมดา ให้เพิ่ม base path
    if (photoUrl.startsWith('/')) {
      return `/stationaryhub${photoUrl}`
    }
    
    return `/stationaryhub/${photoUrl}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Box className="mb-8">
        <Typography variant="h3" className="font-bold text-gray-800 mb-2">
          📋 Manager Orders
        </Typography>
        <Typography variant="body1" className="text-gray-600">
          จัดการคำขอเบิกของแผนก
        </Typography>
      </Box>

      <Card className="glass-card">
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Total Amount</TableCell>
                  <TableCell>Issue Note</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requisitions.map((requisition) => (
                  <motion.tr
                    key={requisition.REQUISITION_ID}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="hover:bg-gray-50/50 transition-colors duration-200"
                  >
                    <TableCell>
                      <Typography variant="subtitle1" className="font-semibold">
                        #{requisition.REQUISITION_ID}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(requisition.STATUS)} border px-3 py-1 rounded-full flex items-center gap-1 w-fit`}>
                        {getStatusIcon(requisition.STATUS)}
                        {requisition.STATUS}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" className="text-gray-600">
                        {formatDate(requisition.SUBMITTED_AT)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle1" className="font-bold text-green-600">
                        {formatCurrency(requisition.TOTAL_AMOUNT)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" className="text-gray-600 max-w-xs truncate" title={requisition.ISSUE_NOTE}>
                        {requisition.ISSUE_NOTE || "No note provided"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => handleViewDetails(requisition)}
                        disabled={detailLoading}
                        className="rounded-full"
                      >
                        {detailLoading ? "Loading..." : "View"}
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-8"
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Card className="glass-card text-center">
              <CardContent>
                <Typography variant="h4" className="font-bold text-yellow-600 mb-2">
                  {requisitions.filter(r => r.STATUS === "PENDING").length}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Pending Orders
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card className="glass-card text-center">
              <CardContent>
                <Typography variant="h4" className="font-bold text-green-600 mb-2">
                  {requisitions.filter(r => r.STATUS === "APPROVED").length}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Approved Orders
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card className="glass-card text-center">
              <CardContent>
                <Typography variant="h4" className="font-bold text-red-600 mb-2">
                  {requisitions.filter(r => r.STATUS === "REJECTED").length}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Rejected Orders
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </motion.div>

      {/* Order Details Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          className: "glass-card"
        }}
      >
        <DialogTitle className="flex items-center gap-3 border-b border-gray-200 pb-4">
          <ShoppingCart className="text-blue-600" />
          <div>
            <Typography variant="h5" className="font-bold">
              Order Details #{selectedRequisition?.REQUISITION_ID}
            </Typography>
            <Typography variant="body2" className="text-gray-600">
              รายละเอียดคำขอเบิก
            </Typography>
          </div>
        </DialogTitle>

        <DialogContent className="pt-6">
          {selectedRequisition && (
            <div className="space-y-6">
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
                        <span className="font-medium">{selectedRequisition.USER_ID}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Username:</span>
                        <span className="font-medium">{selectedRequisition.USERNAME || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{selectedRequisition.EMAIL || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Department:</span>
                        <span className="font-medium">{selectedRequisition.DEPARTMENT || "N/A"}</span>
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
                        <Badge className={`${getStatusColor(selectedRequisition.STATUS)} border px-2 py-1 rounded-full text-xs`}>
                          {getStatusIcon(selectedRequisition.STATUS)}
                          {selectedRequisition.STATUS}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Submitted:</span>
                        <span className="font-medium">{formatDate(selectedRequisition.SUBMITTED_AT)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(selectedRequisition.TOTAL_AMOUNT)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Issue Note */}
              {selectedRequisition.ISSUE_NOTE && (
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
                    รายการสินค้า ({selectedRequisition.REQUISITION_ITEMS?.length || 0} รายการ)
                  </Typography>

                  {selectedRequisition.REQUISITION_ITEMS && selectedRequisition.REQUISITION_ITEMS.length > 0 ? (
                    <div className="space-y-3">
                      {selectedRequisition.REQUISITION_ITEMS.map((item) => (
                        <div key={item.ITEM_ID} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
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
                              {item.PRODUCT_NAME}
                            </Typography>
                            {item.CATEGORY_NAME && (
                              <Typography variant="body2" className="text-gray-500">
                                {item.CATEGORY_NAME}
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
                                {formatCurrency(item.UNIT_PRICE)}
                              </Typography>
                            </div>
                            
                            <div>
                              <Typography variant="body2" className="text-gray-500">
                                Total
                              </Typography>
                              <Typography variant="h6" className="font-bold text-purple-600">
                                {formatCurrency(item.TOTAL_PRICE)}
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
          )}
        </DialogContent>

        <DialogActions className="px-6 py-4 border-t border-gray-200">
          <Button onClick={handleCloseDialog} variant="outlined">
            ปิด
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  )
}
