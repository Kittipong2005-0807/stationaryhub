"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  LinearProgress,
} from "@mui/material"
import {
  Dashboard,
  TrendingUp,
  Assignment,
  Inventory,
  GetApp,
  MoreVert,
  PictureAsPdf,
  TableChart,
  AttachMoney,
  Timeline,
  Settings,
  Analytics,
  Speed,
} from "@mui/icons-material"
import { useAuth } from "@/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import type { Requisition } from "@/lib/database"

export default function AdminDashboard() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [stats, setStats] = useState({
    totalRequisitions: 0,
    pendingApprovals: 0,
    approvedRequisitions: 0,
    totalValue: 0,
    monthlyGrowth: 15.3,
    activeUsers: 24,
    lowStockItems: 8,
  })
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null)
  const [loading, setLoading] = useState(true)
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated || user?.ROLE !== "ADMIN") {
      console.log("🔍 Admin access check:", { 
        isAuthenticated, 
        userRole: user?.ROLE, 
        userId: user?.USER_ID,
        empCode: user?.EmpCode 
      })
      router.push("/login")
      return
    }

    setLoading(true)
    fetch("/api/requisitions")
      .then((res) => res.json())
      .then((data) => {
        setRequisitions(data)
        // คำนวณ stats จากข้อมูลจริง
        const totalRequisitions = data.length
        const pendingApprovals = data.filter((r: Requisition) => r.STATUS === "PENDING").length
        const approvedRequisitions = data.filter((r: Requisition) => r.STATUS === "APPROVED").length
        const totalValue = data.reduce((sum: number, r: Requisition) => {
          const amount = parseFloat(r.TOTAL_AMOUNT?.toString() || '0') || 0
          return sum + amount
        }, 0)
        setStats({
          totalRequisitions,
          pendingApprovals,
          approvedRequisitions,
          totalValue,
          monthlyGrowth: 15.3,
          activeUsers: 24,
          lowStockItems: 8,
        })
        setLoading(false)
      })
      .catch(() => {
        alert("โหลดข้อมูล requisitions ไม่สำเร็จ")
        setLoading(false)
      })
  }, [isAuthenticated, user, router])

  const handleExportMenu = (event: React.MouseEvent<HTMLElement>, requisition: Requisition) => {
    setAnchorEl(event.currentTarget)
    setSelectedRequisition(requisition)
  }

  const handleExport = (format: "pdf" | "excel") => {
    if (!selectedRequisition) return

    console.log(`Exporting requisition #${selectedRequisition.REQUISITION_ID} as ${format.toUpperCase()}`)
    alert(`Exporting requisition #${selectedRequisition.REQUISITION_ID} as ${format.toUpperCase()}...`)

    setAnchorEl(null)
    setSelectedRequisition(null)
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
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
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

  const statCards = [
    {
      title: "Total Requisitions",
      value: stats.totalRequisitions,
      icon: Assignment,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100",
      change: "+12%",
      changeColor: "text-green-600",
    },
    {
      title: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: Dashboard,
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-50 to-red-100",
      change: "-5%",
      changeColor: "text-green-600",
    },
    {
      title: "Approved Today",
      value: stats.approvedRequisitions,
      icon: TrendingUp,
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-100",
      change: "+18%",
      changeColor: "text-green-600",
    },
    {
      title: "Total Value",
      value: `฿${(stats.totalValue || 0).toFixed(0)}`,
      icon: AttachMoney,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-100",
      change: "+23%",
      changeColor: "text-green-600",
    },
  ]

  const quickActions = [
    {
      title: "Manage Products",
      description: "Add, edit, or remove products",
      icon: Inventory,
      color: "from-blue-500 to-purple-600",
      href: "/admin/products",
    },
    {
      title: "Review Approvals",
      description: "Process pending requisitions",
      icon: Assignment,
      color: "from-green-500 to-teal-600",
      href: "/approvals",
    },
    {
      title: "Export Reports",
      description: "Generate PDF and Excel reports",
      icon: GetApp,
      color: "from-orange-500 to-red-600",
      action: () => alert("Bulk export functionality coming soon!"),
    },
    {
      title: "System Settings",
      description: "Configure system preferences",
      icon: Settings,
      color: "from-gray-500 to-gray-600",
      action: () => alert("Settings panel coming soon!"),
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="max-w-7xl mx-auto"
    >
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-40 h-40 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full floating blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-32 h-32 bg-gradient-to-r from-pink-400/10 to-red-400/10 rounded-full floating-delayed blur-3xl"></div>
      </div>

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="glass-card-strong rounded-3xl p-8 mb-8 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="mb-4 md:mb-0 text-left">
              <Typography variant="h2" className="font-bold text-gray-900 mb-2">
                🛠️ Admin Dashboard
              </Typography>
              <Typography variant="h6" className="text-gray-600">
                Welcome back, {user?.FullNameThai || user?.FullNameEng || user?.USERNAME || user?.AdLoginName || user?.name || 'User'}! Here's what's happening today.
              </Typography>
            </div>

            <div className="flex items-center gap-4 justify-center">
              <div className="glass-button rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="bg-gradient-to-r from-green-500 to-teal-600">
                    <Speed />
                  </Avatar>
                  <div>
                    <Typography variant="body2" className="text-gray-600">
                      System Status
                    </Typography>
                    <Typography variant="h6" className="font-bold text-green-600">
                      All Systems Operational
                    </Typography>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8 max-w-6xl mx-auto"
      >
        <Grid container spacing={3} justifyContent="center">
          {statCards.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={stat.title}>
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="h-full"
              >
                <Card
                  className={`modern-card h-full bg-gradient-to-br ${stat.bgGradient} border-0 overflow-hidden relative`}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/20 to-transparent rounded-bl-3xl"></div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${stat.gradient} flex items-center justify-center shadow-lg`}
                      >
                        <stat.icon className="text-white text-xl" />
                      </div>
                      <div className="text-right">
                        <Typography variant="body2" className={`font-semibold ${stat.changeColor}`}>
                          {stat.change}
                        </Typography>
                        <Typography variant="caption" className="text-gray-500">
                          vs last month
                        </Typography>
                      </div>
                    </div>

                    <Typography variant="h3" className="font-bold text-gray-800 mb-1">
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" className="text-gray-600 font-medium">
                      {stat.title}
                    </Typography>

                    <div className="mt-4">
                      <LinearProgress
                        variant="determinate"
                        value={75}
                        className="h-2 rounded-full bg-white/30"
                        sx={{
                          "& .MuiLinearProgress-bar": {
                            background: `linear-gradient(90deg, ${stat.gradient.replace("from-", "").replace("to-", "").replace("-500", "").replace("-600", "")})`,
                            borderRadius: "10px",
                          },
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </motion.div>

      {/* Quick Actions & Analytics */}
      <div className="flex justify-center w-full mb-8">
        <Grid container spacing={4} style={{ maxWidth: '1200px' }}>
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
                                             <Link href={action.href || "#"} style={{ textDecoration: 'none' }}>
                         <motion.div
                           key={action.title}
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

      {/* Recent Requisitions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="max-w-6xl mx-auto"
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
                            color={getStatusColor(requisition.STATUS) as any}
                            size="small"
                            className="font-semibold"
                          />
                        </TableCell>
                        <TableCell>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => handleExportMenu(e, requisition)}
                              disabled={requisition.STATUS !== "APPROVED"}
                              className="glass-button rounded-xl"
                            >
                              <MoreVert />
                            </IconButton>
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
    </motion.div>
  )
}
