"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Chip, Badge, Grid } from "@mui/material"
import { ShoppingCart, ArrowBack, Visibility, Schedule, CheckCircle, Cancel } from "@mui/icons-material"
import { useAuth } from "@/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Link from "next/link"

interface RequisitionItem {
  ITEM_ID: number
  REQUISITION_ID: number
  PRODUCT_ID: number
  PRODUCT_NAME: string
  QUANTITY: number
  UNIT_PRICE: number
  TOTAL_PRICE: number
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
}

export default function ManagerOrdersPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated || user?.ROLE !== "MANAGER") {
      router.push("/login")
      return
    }

    setLoading(true)
    const managerUserId = user?.EmpCode || user?.USER_ID || user?.AdLoginName
    
    fetch(`/api/orgcode3?action=getRequisitionsForManager&userId=${managerUserId}`)
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
  }, [isAuthenticated, user, router])

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
        return <Schedule className="h-4 w-4" />
      case "APPROVED":
        return <CheckCircle className="h-4 w-4" />
      case "REJECTED":
        return <Cancel className="h-4 w-4" />
      default:
        return <Schedule className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }

  if (!isAuthenticated || user?.ROLE !== "MANAGER") {
    return null
  }

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <Typography variant="h6" className="mt-4 text-gray-600">
          Loading your orders...
        </Typography>
      </motion.div>
    )
  }

  if (requisitions.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
        <ShoppingCart className="text-6xl text-gray-400 mb-4" />
        <Typography variant="h4" className="text-gray-600 mb-2">
          No orders yet
        </Typography>
        <Typography variant="body1" className="text-gray-500 mb-6">
          Start shopping to see your orders here
        </Typography>
        <Link href="/manager/products" style={{ textDecoration: 'none' }}>
          <Button
            variant="contained"
            className="btn-gradient-primary"
          >
            Browse Products
          </Button>
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {/* Header with Back Button */}
      <Box className="mb-8">
        <Box className="flex items-center gap-4 mb-4">
          <Link href="/manager/products" style={{ textDecoration: 'none' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              className="rounded-full"
            >
              Back to Products
            </Button>
          </Link>
        </Box>
        <Typography variant="h3" className="font-bold text-gray-800 mb-2">
          📋 My Orders
        </Typography>
        <Typography variant="body1" className="text-gray-600">
          Track your submitted requisitions
        </Typography>
      </Box>

      {/* Orders Table */}
      <Card className="glass-card">
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted Date</TableCell>
                  <TableCell>Total Amount</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requisitions.map((requisition, index) => (
                  <motion.tr
                    key={requisition.REQUISITION_ID}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
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
                        ฿{Number(requisition.TOTAL_AMOUNT).toFixed(2)}
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
                        variant="outline"
                        startIcon={<Visibility />}
                        onClick={() => {
                          // TODO: Implement view order details
                          alert(`Viewing order #${requisition.REQUISITION_ID}`)
                        }}
                        className="rounded-full"
                      >
                        View
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
    </motion.div>
  )
}
