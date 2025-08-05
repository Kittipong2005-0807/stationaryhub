"use client"
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
  Avatar,
  LinearProgress,
  Box,
} from "@mui/material"
import {
  Assignment,
  TrendingUp,
  Schedule,
  CheckCircle,
  Cancel,
  Visibility,
  Timeline,
  Analytics,
  Speed,
  People,
  AttachMoney,
} from "@mui/icons-material"
import { useAuth } from "@/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import type { Requisition } from "@/lib/database"

export default function ManagerDashboard() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    approvedToday: 0,
    rejectedToday: 0,
    totalValue: 0,
    avgApprovalTime: "2.5 hrs",
    teamMembers: 12,
    monthlyApprovals: 45,
  })
  const [loading, setLoading] = useState(true)
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated || user?.ROLE !== "MANAGER") {
      router.push("/login")
      return
    }

    setLoading(true)
    fetch("/api/requisitions")
      .then((res) => res.json())
      .then((data) => {
        setRequisitions(data)
        // คำนวณ stats จากข้อมูลจริง
        const pendingApprovals = data.filter((r: Requisition) => r.STATUS === "PENDING").length
        const approvedToday = data.filter((r: Requisition) => r.STATUS === "APPROVED" && new Date(r.SUBMITTED_AT) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length
        const totalValue = data.filter((r: Requisition) => r.STATUS === "PENDING").reduce((sum: number, r: Requisition) => sum + (r.TOTAL_AMOUNT || 0), 0)
        setStats({
          pendingApprovals,
          approvedToday,
          rejectedToday: 1,
          totalValue,
          avgApprovalTime: "2.5 hrs",
          teamMembers: 12,
          monthlyApprovals: 45,
        })
        setLoading(false)
      })
      .catch(() => {
        alert("โหลดข้อมูล requisitions ไม่สำเร็จ")
        setLoading(false)
      })
  }, [isAuthenticated, user, router])

  const handleQuickAction = (requisitionId: number, action: "approve" | "reject") => {
    const updatedRequisitions = requisitions?.map((req) =>
      req.REQUISITION_ID === requisitionId
        ? { ...req, STATUS: action === "approve" ? ("APPROVED" as const) : ("REJECTED" as const) }
        : req,
    )
    setRequisitions(updatedRequisitions)

    // Update stats
    const newPendingCount = updatedRequisitions?.filter((r) => r.STATUS === "PENDING").length
    setStats((prev) => ({
      ...prev,
      pendingApprovals: newPendingCount,
      approvedToday: action === "approve" ? prev.approvedToday + 1 : prev.approvedToday,
      rejectedToday: action === "reject" ? prev.rejectedToday + 1 : prev.rejectedToday,
    }))

    alert(`Requisition #${requisitionId} ${action === "approve" ? "approved" : "rejected"} successfully!`)
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours === 1) return "1 hour ago"
    if (diffInHours < 24) return `${diffInHours} hours ago`
    return `${Math.floor(diffInHours / 24)} days ago`
  }

  const getPriorityColor = (amount: number) => {
    if (amount > 200) return "error"
    if (amount > 100) return "warning"
    return "success"
  }

  if (!isAuthenticated || user?.ROLE !== "MANAGER") {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
        <div className="glass-card-strong rounded-3xl p-12 max-w-md mx-auto">
          <Typography variant="h4" className="text-gray-600 mb-4">
            🚫 Access Denied
          </Typography>
          <Typography variant="body1">This page is only accessible to managers.</Typography>
        </div>
      </motion.div>
    )
  }

  const statCards = [
    {
      title: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: Schedule,
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-50 to-red-100",
      change: "+3 today",
      changeColor: "text-orange-600",
    },
    {
      title: "Approved Today",
      value: stats.approvedToday,
      icon: CheckCircle,
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-100",
      change: "+2 from yesterday",
      changeColor: "text-green-600",
    },
    {
      title: "Pending Value",
      value: `฿${Number(stats.totalValue).toFixed(0)}`,
      icon: AttachMoney,
      gradient: "from-blue-500 to-purple-500",
      bgGradient: "from-blue-50 to-purple-100",
      change: "Awaiting approval",
      changeColor: "text-blue-600",
    },
    {
      title: "Team Members",
      value: stats.teamMembers,
      icon: People,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-100",
      change: "Active users",
      changeColor: "text-purple-600",
    },
  ]

  const quickActions = [
    {
      title: "Review Approvals",
      description: "Process pending requisitions",
      icon: Assignment,
      color: "from-blue-500 to-purple-600",
      href: "/approvals",
      count: stats.pendingApprovals,
    },
    {
      title: "View Products",
      description: "Browse available inventory",
      icon: Timeline,
      color: "from-green-500 to-teal-600",
      href: "/",
      count: null,
    },
    {
      title: "Team Analytics",
      description: "View team performance metrics",
      icon: Analytics,
      color: "from-orange-500 to-red-600",
      action: () => alert("Team analytics coming soon!"),
      count: null,
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
        <div className="absolute top-20 right-10 w-40 h-40 bg-gradient-to-r from-orange-400/10 to-red-400/10 rounded-full floating blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-32 h-32 bg-gradient-to-r from-green-400/10 to-teal-400/10 rounded-full floating-delayed blur-3xl"></div>
      </div>

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8 text-left"
      >
        <div className="glass-card-strong rounded-3xl p-8 mb-8 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between md:justify-start">
            <div className="mb-4 md:mb-0 text-left">
              <Typography variant="h2" className="font-bold text-gray-900 mb-2">
                👨‍💼 Manager Dashboard
              </Typography>
              <Typography variant="h6" className="text-gray-600">
                Welcome back, {user?.USERNAME || 'User'}! You have {stats.pendingApprovals || 0} requisitions awaiting your approval.
              </Typography>
            </div>

            <div className="flex items-center gap-4 justify-center">
              <div className="glass-button rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="bg-gradient-to-r from-orange-500 to-red-600">
                    <Speed />
                  </Avatar>
                  <div>
                    <Typography variant="body2" className="text-gray-600">
                      Avg. Approval Time
                    </Typography>
                    <Typography variant="h6" className="font-bold text-orange-600">
                      {stats.avgApprovalTime}
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
        <Grid container spacing={3}>
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
                        <Typography variant="caption" className="text-gray-500">
                          {stat.change}
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
                        value={stat.title === "Pending Approvals" ? (stat.value as number) * 20 : 75}
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

      {/* Quick Actions & Performance */}
      <div className="flex justify-center w-full mb-8">
        <Grid container spacing={4} className="max-w-6xl w-full">
          {/* Quick Actions */}
          <Grid item xs={12} lg={6}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
              <Card className="modern-card h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <Assignment className="text-white" />
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
                            <div className="flex items-center gap-2">
                              <Typography variant="subtitle1" className="font-bold text-gray-800">
                                {action.title}
                              </Typography>
                              {action.count && (
                                <Chip
                                  label={action.count}
                                  size="small"
                                  className="bg-red-100 text-red-800 font-bold animate-pulse"
                                />
                              )}
                            </div>
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

          {/* Performance Overview */}
          <Grid item xs={12} lg={6}>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
              <Card className="modern-card h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center">
                      <TrendingUp className="text-white" />
                    </div>
                    <Typography variant="h5" className="font-bold text-gray-800">
                      Performance Overview
                    </Typography>
                  </div>

                  <div className="space-y-6">
                    <div className="glass-button rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Typography variant="body1" className="font-semibold text-gray-700">
                          Monthly Approvals
                        </Typography>
                        <Typography variant="h6" className="font-bold text-green-600">
                          {stats.monthlyApprovals}
                        </Typography>
                      </div>
                      <LinearProgress
                        variant="determinate"
                        value={90}
                        className="h-2 rounded-full"
                        sx={{
                          backgroundColor: "rgba(34, 197, 94, 0.1)",
                          "& .MuiLinearProgress-bar": {
                            background: "linear-gradient(90deg, #22c55e, #16a34a)",
                            borderRadius: "10px",
                          },
                        }}
                      />
                      <Typography variant="caption" className="text-gray-500 mt-1">
                        Target: 50 approvals
                      </Typography>
                    </div>

                    <div className="glass-button rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Typography variant="body1" className="font-semibold text-gray-700">
                          Response Time
                        </Typography>
                        <Typography variant="h6" className="font-bold text-blue-600">
                          {stats.avgApprovalTime}
                        </Typography>
                      </div>
                      <LinearProgress
                        variant="determinate"
                        value={75}
                        className="h-2 rounded-full"
                        sx={{
                          backgroundColor: "rgba(59, 130, 246, 0.1)",
                          "& .MuiLinearProgress-bar": {
                            background: "linear-gradient(90deg, #3b82f6, #1d4ed8)",
                            borderRadius: "10px",
                          },
                        }}
                      />
                      <Typography variant="caption" className="text-gray-500 mt-1">
                        Target: {"<"} 4 hours
                      </Typography>
                    </div>

                    <div className="glass-button rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Typography variant="body1" className="font-semibold text-gray-700">
                          Approval Rate
                        </Typography>
                        <Typography variant="h6" className="font-bold text-purple-600">
                          94%
                        </Typography>
                      </div>
                      <LinearProgress
                        variant="determinate"
                        value={94}
                        className="h-2 rounded-full"
                        sx={{
                          backgroundColor: "rgba(147, 51, 234, 0.1)",
                          "& .MuiLinearProgress-bar": {
                            background: "linear-gradient(90deg, #9333ea, #7c3aed)",
                            borderRadius: "10px",
                          },
                        }}
                      />
                      <Typography variant="caption" className="text-gray-500 mt-1">
                        Approved vs Total
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </div>

      {/* Pending Approvals */}
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
                  <Schedule className="text-white" />
                </div>
                <Typography variant="h5" className="font-bold text-gray-800">
                  Pending Approvals
                </Typography>
                {stats.pendingApprovals > 0 && (
                  <Chip
                    label={`${stats.pendingApprovals} pending`}
                    color="warning"
                    className="animate-pulse font-bold"
                  />
                )}
              </div>

              <Button variant="outlined" className="glass-button rounded-xl" onClick={() => router.push("/approvals")}>
                View All
              </Button>
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
            ) : (requisitions || [])?.filter((r) => r.STATUS === "PENDING").length === 0 ? (
              <div className="text-center py-12">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  className="text-6xl mb-4"
                >
                  ✅
                </motion.div>
                <Typography variant="h5" className="text-gray-600 mb-2 font-bold">
                  All caught up!
                </Typography>
                <Typography variant="body1" className="text-gray-500">
                  No pending approvals at the moment
                </Typography>
              </div>
            ) : (
              <TableContainer className="glass-button rounded-2xl">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="font-bold text-gray-700">Requisition</TableCell>
                      <TableCell className="font-bold text-gray-700">Requested By</TableCell>
                      <TableCell className="font-bold text-gray-700">Amount</TableCell>
                      <TableCell className="font-bold text-gray-700">Priority</TableCell>
                      <TableCell className="font-bold text-gray-700">Time</TableCell>
                      <TableCell className="font-bold text-gray-700">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requisitions
                      ?.filter((r) => r.STATUS === "PENDING")
                      .map((requisition, index) => (
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
                            <Typography variant="h6" className="font-bold text-green-600">
                              ฿{(parseFloat(requisition.TOTAL_AMOUNT?.toString() || '0') || 0).toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                requisition.TOTAL_AMOUNT > 200
                                  ? "High"
                                  : requisition.TOTAL_AMOUNT > 100
                                    ? "Medium"
                                    : "Low"
                              }
                              color={getPriorityColor(requisition.TOTAL_AMOUNT) as "error" | "warning" | "success" | "default"}
                              size="small"
                              className="font-semibold"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" className="text-gray-600">
                              {getTimeAgo(requisition.SUBMITTED_AT)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box className="flex gap-1">
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    alert(`Viewing details for requisition #${requisition.REQUISITION_ID}`)
                                  }
                                  className="glass-button rounded-xl"
                                >
                                  <Visibility />
                                </IconButton>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleQuickAction(requisition.REQUISITION_ID, "approve")}
                                  className="glass-button rounded-xl text-green-600"
                                >
                                  <CheckCircle />
                                </IconButton>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleQuickAction(requisition.REQUISITION_ID, "reject")}
                                  className="glass-button rounded-xl text-red-600"
                                >
                                  <Cancel />
                                </IconButton>
                              </motion.div>
                            </Box>
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
    </motion.div>
  )
}
