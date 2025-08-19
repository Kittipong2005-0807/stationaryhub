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
  Dialog,
  DialogTitle,
  DialogContent,
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
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false)
  const [notifyMessage, setNotifyMessage] = useState("")
  const [notifying, setNotifying] = useState(false)
  const [sendEmail, setSendEmail] = useState(true) // เพิ่มตัวเลือกส่งอีเมล
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  
  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return 'User';
    return user.FullNameThai || user.FullNameEng || user.USERNAME || user.AdLoginName || user.name || 'User';
  }

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
    return new Date(dateString).toLocaleDateString("th-TH", {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 w-full">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full"
      >
        {/* Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-40 h-40 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full floating blur-3xl"></div>
          <div className="absolute bottom-20 left-10 w-32 h-32 bg-gradient-to-r from-pink-400/10 to-red-400/10 rounded-full floating-delayed blur-3xl"></div>
        </div>

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full px-6 py-6"
      >
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="mb-4 md:mb-0 text-left">
              <Typography variant="h3" className="font-bold text-white mb-2">
                🛠️ Admin Dashboard
              </Typography>
              <Typography variant="h6" className="text-blue-100">
                Welcome back, {getUserDisplayName()}! Here&apos;s what&apos;s happening today.
              </Typography>
            </div>

            <div className="flex items-center gap-4 justify-center">
              <div className="bg-white/10 border-white/30 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="bg-gradient-to-r from-green-500 to-teal-600">
                    <Speed />
                  </Avatar>
                  <div>
                    <Typography variant="body2" className="text-white/80">
                      System Status
                    </Typography>
                    <Typography variant="h6" className="font-bold text-white">
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
        className="w-full px-6 mb-6"
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
        <DialogTitle className="text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl">📦</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">สินค้ามาแล้ว!</h2>
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
      </div>
    )
  }
