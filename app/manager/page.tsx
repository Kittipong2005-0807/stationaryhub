
// HomePage (สินค้า)
// 1. ตรวจสอบสถานะผู้ใช้ (isAuthenticated, user)
// 2. ถ้าไม่ login หรือ role ไม่ใช่ USER จะ redirect หรือไม่แสดงหน้า
// 3. ถ้าเป็น USER จะ fetch ข้อมูลสินค้าจาก API /api/products
// 4. สามารถค้นหา/กรอง/เปลี่ยนมุมมองสินค้าได้
// 5. แสดงสินค้าในรูปแบบ grid หรือ list
// 6. ถ้า loading จะแสดง skeleton
// 7. ถ้าไม่พบสินค้า จะแสดงข้อความ
// 8. มี debug log สำหรับ user และข้อมูลสินค้า

"use client"

import { useState, useEffect } from "react"
import { 
  Grid, 
  Typography, 
  Paper, 
  Box, 
  Button, 
  LinearProgress,
  Chip,
  Avatar,
  Skeleton
} from "@mui/material"
import { 
  TrendingUp, 
  LocalShipping, 
  ShoppingCart, 
  Assignment, 
  CheckCircle, 
  Schedule,
  Star,
  People,
  Inventory
} from "@mui/icons-material"
import { useAuth } from "@/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { getBasePathUrl } from "@/lib/base-path"
import { motion } from "framer-motion"

interface Stats {
  totalRequisitions: number
  pendingRequisitions: number
  approvedRequisitions: number
  rejectedRequisitions: number
  approvedValue: number
  avgApprovalTime: number
  responseRate: number
  totalUsers: number
}

export default function ManagerDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalRequisitions: 0,
    pendingRequisitions: 0,
    approvedRequisitions: 0,
    rejectedRequisitions: 0,
    approvedValue: 0,
    avgApprovalTime: 0,
    responseRate: 0,
    totalUsers: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, isAuthenticated, isAuthLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthLoading) return
    
    if (!isAuthenticated || user?.ROLE !== "MANAGER") {
      router.replace(getBasePathUrl("/login"))
      return
    }

    fetchDashboardData()
  }, [isAuthenticated, user, isAuthLoading, router])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log("🔍 Fetching dashboard data...")
      
      // Get current user ID
      const currentUserId = user?.AdLoginName || user?.USERNAME || user?.id
      console.log("👤 Current user ID:", currentUserId)
      
      if (!currentUserId) {
        throw new Error("User ID not found")
      }
      
      // Fetch requisitions data for current manager's department
      const requisitionsRes = await fetch(`/api/orgcode3?action=getRequisitionsForManager&userId=${currentUserId}`)
      console.log("📊 Requisitions response status:", requisitionsRes.status)
      
      if (!requisitionsRes.ok) {
        throw new Error(`Failed to fetch requisitions: ${requisitionsRes.status}`)
      }
      
      const requisitionsData = await requisitionsRes.json()
      console.log("📊 Requisitions data:", requisitionsData)
      
      // Extract requisitions array from response
      const requisitions = requisitionsData.requisitions || requisitionsData || []
      console.log("📋 Extracted requisitions:", requisitions)
      
             // Also fetch all requisitions from the same department/site
       const allRequisitionsRes = await fetch(`/api/orgcode3?action=getAllRequisitionsForDepartment&userId=${currentUserId}`)
       console.log("🏢 All department requisitions response status:", allRequisitionsRes.status)
       
       let allDepartmentRequisitions = []
       if (allRequisitionsRes.ok) {
         const allRequisitionsData = await allRequisitionsRes.json()
         allDepartmentRequisitions = allRequisitionsData.requisitions || allRequisitionsData || []
         console.log("🏢 All department requisitions:", allDepartmentRequisitions)
       } else {
         console.log("⚠️ Could not fetch all department requisitions, using manager's requisitions only")
         allDepartmentRequisitions = requisitions
       }
       
               // Fallback: If still no data, try to get data from user's actual SITE_ID
        if (allDepartmentRequisitions.length === 0 && requisitions.length === 0) {
          console.log("🔄 No data found, trying fallback with user's actual SITE_ID")
          try {
            // Get user's SITE_ID from session
            const userSiteId = user?.SITE_ID || '1700' // Use actual SITE_ID from user
            console.log("🔄 Using user's SITE_ID for fallback:", userSiteId)
            
            const fallbackRes = await fetch(`/api/orgcode3?action=getRequisitionsBySiteId&siteId=${userSiteId}`)
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json()
              allDepartmentRequisitions = fallbackData.requisitions || []
              console.log("🔄 Fallback data from user's SITE_ID:", userSiteId, allDepartmentRequisitions)
            }
          } catch (fallbackError) {
            console.log("⚠️ Fallback also failed:", fallbackError)
          }
        }
       
       // Use all department requisitions for statistics
       const finalRequisitions = allDepartmentRequisitions.length > 0 ? allDepartmentRequisitions : requisitions
       console.log("📊 Final requisitions for statistics:", finalRequisitions)
      
      // For now, use mock data for user count since getUserCount action doesn't exist
      const mockUsersData = { count: 25 } // Mock data
      console.log("👥 Using mock users data:", mockUsersData)
      
      // Calculate statistics from department requisitions
      const totalRequisitions = finalRequisitions.length || 0
      const pendingRequisitions = finalRequisitions.filter((r: any) => r.STATUS === 'PENDING').length || 0
      const approvedRequisitions = finalRequisitions.filter((r: any) => r.STATUS === 'APPROVED').length || 0
      const rejectedRequisitions = finalRequisitions.filter((r: any) => r.STATUS === 'REJECTED').length || 0
      
      // Calculate approved value from requisition items
      const approvedValue = finalRequisitions
        .filter((r: any) => r.STATUS === 'APPROVED')
        .reduce((total: number, r: any) => {
          if (r.REQUISITION_ITEMS && Array.isArray(r.REQUISITION_ITEMS)) {
            return total + r.REQUISITION_ITEMS.reduce((sum: number, item: any) => 
              sum + (Number(item.TOTAL_PRICE) || 0), 0)
          }
          return total + (Number(r.TOTAL_AMOUNT) || 0)
        }, 0)
      
      // Calculate average approval time (simplified - using 2.5 hours as default)
      const avgApprovalTime = 2.5
      
      // Calculate response rate
      const responseRate = totalRequisitions > 0 
        ? ((approvedRequisitions + rejectedRequisitions) / totalRequisitions) * 100 
        : 0
      
      const totalUsers = mockUsersData.count || 0
      
      const newStats = {
        totalRequisitions,
        pendingRequisitions,
        approvedRequisitions,
        rejectedRequisitions,
        approvedValue,
        avgApprovalTime,
        responseRate,
        totalUsers
      }
      
      console.log("📈 Calculated stats:", newStats)
      setStats(newStats)
      
    } catch (error) {
      console.error('❌ Failed to fetch dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'products':
        router.push(getBasePathUrl('/manager/products'))
        break
      case 'approvals':
        router.push(getBasePathUrl('/approvals'))
        break
      case 'cart':
        router.push(getBasePathUrl('/manager/cart'))
        break
      case 'orders':
        router.push(getBasePathUrl('/manager/orders'))
        break
      default:
        break
    }
  }

  if (isAuthLoading) {
    return (
      <Box className="flex justify-center items-center h-screen">
        <Skeleton variant="rectangular" width={300} height={80} />
      </Box>
    )
  }

  if (!isAuthenticated || user?.ROLE !== "MANAGER") {
    return null
  }

  if (loading) {
    return (
      <Box className="p-6">
        <Typography variant="h4" className="mb-4">🔄 Loading Dashboard...</Typography>
        <Grid container spacing={3}>
          {[...Array(8)].map((_, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper elevation={0} className="glass-card p-4 rounded-2xl">
                <Skeleton variant="rectangular" height={120} className="rounded-xl" />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  if (error) {
    return (
      <Box className="p-6">
        <Paper elevation={0} className="glass-card p-6 rounded-2xl text-center">
          <Typography variant="h5" className="text-red-600 mb-4">
            ❌ Error Loading Dashboard
          </Typography>
          <Typography variant="body1" className="text-gray-600 mb-4">
            {error}
          </Typography>
          <Button 
            variant="contained" 
            onClick={fetchDashboardData}
            className="rounded-full"
          >
            🔄 Retry
          </Button>
        </Paper>
      </Box>
    )
  }

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
            🎯 Manager Dashboard
          </Typography>
          <Typography variant="h6" className="text-gray-600">
            Welcome back, {user?.FullNameThai || user?.FullNameEng || user?.USERNAME || 'Manager'}! Here&apos;s your overview.
          </Typography>
          
                     {/* Debug Info */}
           <Box className="mt-4 p-3 bg-blue-50 rounded-lg">
             <Typography variant="body2" className="text-blue-700">
               🔍 Debug: Total Requisitions: {stats.totalRequisitions} | 
               Pending: {stats.pendingRequisitions} | 
               Approved: {stats.approvedRequisitions} | 
               Rejected: {stats.rejectedRequisitions}
             </Typography>
                           <Typography variant="body2" className="text-blue-700 mt-1">
                🏢 User SITE_ID: {(user as any)?.SITE_ID || 'Not set'} | 
                Department: {(user as any)?.DEPARTMENT || 'Not set'}
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

            {/* Pending Requisitions */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} className="glass-card p-6 rounded-2xl hover:shadow-lg transition-shadow">
                <Box className="flex items-center justify-between">
                  <Box>
                    <Typography variant="h4" className="font-bold text-orange-600">
                      {stats.pendingRequisitions}
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
                      ฿{stats.approvedValue.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      Approved Value
                    </Typography>
                  </Box>
                  <Avatar className="bg-green-100 text-green-600">
                    <TrendingUp />
                  </Avatar>
                </Box>
              </Paper>
            </Grid>

            {/* Response Rate */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} className="glass-card p-6 rounded-2xl hover:shadow-lg transition-shadow">
                <Box className="flex items-center justify-between">
                  <Box>
                    <Typography variant="h4" className="font-bold text-purple-600">
                      {stats.responseRate.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      Response Rate
                    </Typography>
                  </Box>
                  <Avatar className="bg-purple-100 text-purple-600">
                    <Star />
                  </Avatar>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </motion.div>

        {/* Detailed Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <Grid container spacing={3}>
            {/* Approval Status */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} className="glass-card p-6 rounded-2xl">
                <Typography variant="h6" className="font-semibold mb-4 text-gray-700">
                  Approval Status
                </Typography>
                <Box className="space-y-4">
                  <Box>
                    <Box className="flex justify-between items-center mb-2">
                      <Typography variant="body2" className="text-gray-600">
                        Approved
                      </Typography>
                      <Typography variant="body2" className="font-medium">
                        {stats.approvedRequisitions}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={stats.totalRequisitions > 0 ? (stats.approvedRequisitions / stats.totalRequisitions) * 100 : 0}
                      className="h-2 rounded-full"
                      sx={{ backgroundColor: '#e5e7eb', '& .MuiLinearProgress-bar': { backgroundColor: '#10b981' } }}
                    />
                  </Box>
                  
                  <Box>
                    <Box className="flex justify-between items-center mb-2">
                      <Typography variant="body2" className="text-gray-600">
                        Rejected
                      </Typography>
                      <Typography variant="body2" className="font-medium">
                        {stats.rejectedRequisitions}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={stats.totalRequisitions > 0 ? (stats.rejectedRequisitions / stats.totalRequisitions) * 100 : 0}
                      className="h-2 rounded-full"
                      sx={{ backgroundColor: '#e5e7eb', '& .MuiLinearProgress-bar': { backgroundColor: '#ef4444' } }}
                    />
                  </Box>
                  
                  <Box>
                    <Box className="flex justify-between items-center mb-2">
                      <Typography variant="body2" className="text-gray-600">
                        Pending
                      </Typography>
                      <Typography variant="body2" className="font-medium">
                        {stats.pendingRequisitions}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={stats.totalRequisitions > 0 ? (stats.pendingRequisitions / stats.totalRequisitions) * 100 : 0}
                      className="h-2 rounded-full"
                      sx={{ backgroundColor: '#e5e7eb', '& .MuiLinearProgress-bar': { backgroundColor: '#f59e0b' } }}
                    />
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Performance Metrics */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} className="glass-card p-6 rounded-2xl">
                <Typography variant="h6" className="font-semibold mb-4 text-gray-700">
                  Performance Metrics
                </Typography>
                <Box className="space-y-4">
                  <Box className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <Box className="flex items-center gap-3">
                      <CheckCircle className="text-green-600" />
                      <Box>
                        <Typography variant="body2" className="text-gray-600">
                          Avg. Approval Time
                        </Typography>
                        <Typography variant="h6" className="font-semibold text-green-600">
                          {stats.avgApprovalTime} hrs
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Box className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <Box className="flex items-center gap-3">
                      <People className="text-blue-600" />
                      <Box>
                        <Typography variant="body2" className="text-gray-600">
                          Total Users
                        </Typography>
                        <Typography variant="h6" className="font-semibold text-blue-600">
                          {stats.totalUsers}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Box className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <Box className="flex items-center gap-3">
                      <Inventory className="text-purple-600" />
                      <Box>
                        <Typography variant="body2" className="text-gray-600">
                          Total Products
                        </Typography>
                        <Typography variant="h6" className="font-semibold text-purple-600">
                          Active
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8"
        >
          <Paper elevation={0} className="glass-card p-6 rounded-2xl">
            <Typography variant="h6" className="font-semibold mb-4 text-gray-700">
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Inventory />}
                  onClick={() => handleQuickAction('products')}
                  className="h-16 rounded-xl gradient-primary hover:shadow-lg transition-all"
                >
                  Shop Products
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Assignment />}
                  onClick={() => handleQuickAction('approvals')}
                  className="h-16 rounded-xl border-2 hover:shadow-lg transition-all"
                >
                  Review Approvals
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ShoppingCart />}
                  onClick={() => handleQuickAction('cart')}
                  className="h-16 rounded-xl border-2 hover:shadow-lg transition-all"
                >
                  View Cart
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<LocalShipping />}
                  onClick={() => handleQuickAction('orders')}
                  className="h-16 rounded-xl border-2 hover:shadow-lg transition-all"
                >
                  My Orders
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Paper elevation={0} className="glass-card p-6 rounded-2xl">
            <Typography variant="h6" className="font-semibold mb-4 text-gray-700">
              Recent Activity
            </Typography>
            <Box className="space-y-3">
              <Box className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="bg-green-100 text-green-600">
                  <CheckCircle />
                </Avatar>
                <Box className="flex-1">
                  <Typography variant="body2" className="font-medium">
                    Requisition approved
                  </Typography>
                  <Typography variant="caption" className="text-gray-500">
                    Stationery items for Marketing team
                  </Typography>
                </Box>
                <Chip label="APPROVED" color="success" size="small" />
              </Box>
              
              <Box className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="bg-orange-100 text-orange-600">
                  <Schedule />
                </Avatar>
                <Box className="flex-1">
                  <Typography variant="body2" className="font-medium">
                    New requisition received
                  </Typography>
                  <Typography variant="caption" className="text-gray-500">
                    Office supplies for IT department
                  </Typography>
                </Box>
                <Chip label="PENDING" color="warning" size="small" />
              </Box>
              
              <Box className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="bg-blue-100 text-blue-600">
                  <ShoppingCart />
                </Avatar>
                <Box className="flex-1">
                  <Typography variant="body2" className="font-medium">
                    Cart updated
                  </Typography>
                  <Typography variant="caption" className="text-gray-500">
                    Added 5 items to cart
                  </Typography>
                </Box>
                <Chip label="UPDATED" color="info" size="small" />
              </Box>
            </Box>
          </Paper>
        </motion.div>

      </motion.div>
    </Box>
  )
}