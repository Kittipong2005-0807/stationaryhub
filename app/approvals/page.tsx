"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle, XCircle, Eye, ClipboardList, TrendingUp, Clock, CheckSquare, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

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
}

export default function ApprovalsPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<"approve" | "reject">("approve")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user as any
  const isAuthenticated = !!session

  useEffect(() => {
    if (!isAuthenticated || (user?.ROLE !== "MANAGER" && user?.ROLE !== "ADMIN")) {
      router.push("/login")
      return
    }

    setLoading(true)
    // ใช้ API orgcode3 เพื่อดึง requisitions ที่ Manager สามารถอนุมัติได้
    fetch(`/api/orgcode3?action=getRequisitionsForManager&userId=${user?.AdLoginName}`)
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

  const handleAction = (requisition: Requisition, action: "approve" | "reject") => {
    setSelectedRequisition(requisition)
    setActionType(action)
    setDialogOpen(true)
    setNote("")
  }

  const handleSubmitAction = async () => {
    if (!selectedRequisition) return
    setSubmitting(true)

    try {
      const response = await fetch(`/api/requisitions/${selectedRequisition.REQUISITION_ID}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: actionType,
          note: note,
        }),
      })

      if (response.ok) {
        // อัปเดตสถานะใน UI โดยดึงข้อมูลใหม่จาก API
        const response = await fetch("/api/requisitions")
        if (response.ok) {
          const updatedRequisitions = await response.json()
          setRequisitions(updatedRequisitions)
        }
        setDialogOpen(false)
        alert(`Requisition ${actionType === "approve" ? "approved" : "rejected"} successfully!`)
      } else {
        alert("Failed to update requisition. Please try again.")
      }
    } catch (error) {
      alert("Failed to update requisition. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleView = async (requisition: Requisition) => {
    console.log("Viewing requisition:", requisition)
    console.log("Requisition items:", requisition.REQUISITION_ITEMS)
    
    try {
      // ดึงข้อมูล requisition ใหม่พร้อม items
      const response = await fetch(`/api/requisitions/${requisition.REQUISITION_ID}`)
      if (response.ok) {
        const detailedRequisition = await response.json()
        console.log("Detailed requisition:", detailedRequisition)
        setSelectedRequisition(detailedRequisition)
      } else {
        console.error("Failed to fetch detailed requisition")
        setSelectedRequisition(requisition)
      }
    } catch (error) {
      console.error("Error fetching detailed requisition:", error)
      setSelectedRequisition(requisition)
    }
    
    setViewDialogOpen(true)
  }

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
        return <Clock className="h-4 w-4" />
      case "APPROVED":
        return <CheckSquare className="h-4 w-4" />
      case "REJECTED":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const pendingCount = requisitions.filter(r => r.STATUS === "PENDING").length
  const approvedCount = requisitions.filter(r => r.STATUS === "APPROVED").length
  const rejectedCount = requisitions.filter(r => r.STATUS === "REJECTED").length

  if (!isAuthenticated || (user?.ROLE !== "MANAGER" && user?.ROLE !== "ADMIN")) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6 }}
        className="container mx-auto px-4 py-8"
      >
        {/* Header Section */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <CheckSquare className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Requisition Approvals
              </h1>
              <p className="text-gray-600 mt-2">
                Review and manage pending requisitions with ease
              </p>
            </div>
          </motion.div>
        </div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-700">{pendingCount}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Approved</p>
                  <p className="text-3xl font-bold text-green-700">{approvedCount}</p>
                </div>
                <CheckSquare className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Rejected</p>
                  <p className="text-3xl font-bold text-red-700">{rejectedCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {user?.ROLE === "MANAGER" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                As a Manager, you can approve or reject requisitions. Approved requisitions will be processed by the Admin team.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
                     <Card className="bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
              <CardTitle className="text-xl font-semibold text-gray-800">
                Requisition Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Skeleton className="h-20 w-full rounded-xl" />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 hover:bg-gray-50/70">
                        <TableHead className="font-semibold text-gray-700">Requisition ID</TableHead>
                        <TableHead className="font-semibold text-gray-700">Requested By</TableHead>
                        <TableHead className="font-semibold text-gray-700">Submitted Date</TableHead>
                        <TableHead className="font-semibold text-gray-700">Total Amount</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {requisitions.map((requisition, index) => {
                          console.log("TOTAL_AMOUNT typeof:", typeof requisition.TOTAL_AMOUNT, "value:", requisition.TOTAL_AMOUNT)
                          return (
                            <motion.tr
                              key={requisition.REQUISITION_ID}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ delay: index * 0.1 }}
                              className="hover:bg-gray-50/50 transition-colors duration-200"
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">#{requisition.REQUISITION_ID}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-medium text-gray-900">{requisition.USER_ID}</p>
                                  <p className="text-sm text-gray-500 line-clamp-2">
                                    {requisition.ISSUE_NOTE || "No note provided"}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">{formatDate(requisition.SUBMITTED_AT)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-lg text-green-600">
                                    ฿{Number(requisition.TOTAL_AMOUNT).toFixed(2)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${getStatusColor(requisition.STATUS)} border px-3 py-1 rounded-full flex items-center gap-1 w-fit`}>
                                  {getStatusIcon(requisition.STATUS)}
                                  {requisition.STATUS}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleView(requisition)}
                                    className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Button>
                                  {requisition.STATUS === "PENDING" && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleAction(requisition, "approve")}
                                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleAction(requisition, "reject")}
                                        className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 border-0 shadow-md hover:shadow-lg transition-all duration-200"
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </motion.tr>
                          )
                        })}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}

              {!loading && requisitions.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-20"
                >
                  <div className="w-24 h-24 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ClipboardList className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-500 mb-2">
                    No requisitions found
                  </h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    All requisitions have been processed. Check back later for new requests.
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

                 {/* Dialog สำหรับ approve/reject */}
         <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
           <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {actionType === "approve" ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Approve Requisition
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    Reject Requisition
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Are you sure you want to {actionType} requisition #{selectedRequisition?.REQUISITION_ID}?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Requisition Details:</p>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Requested by:</span> {selectedRequisition?.USER_ID}</p>
                  <p><span className="font-medium">Amount:</span> ฿{Number(selectedRequisition?.TOTAL_AMOUNT || 0).toFixed(2)}</p>
                  <p><span className="font-medium">Submitted:</span> {selectedRequisition?.SUBMITTED_AT && formatDate(selectedRequisition.SUBMITTED_AT)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {actionType === "approve" ? "Approval" : "Rejection"} Note (Optional)
                </label>
                <Textarea
                  placeholder={`Add a note about this ${actionType}...`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)} 
                disabled={submitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAction}
                disabled={submitting}
                className={`flex-1 ${
                  actionType === "approve" 
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700" 
                    : "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700"
                } text-white border-0`}
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  `${actionType === "approve" ? "Approve" : "Reject"}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

                 {/* Dialog แสดงรายละเอียด */}
         <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
           <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-white">
            <DialogHeader className="pb-6">
              <DialogTitle className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg font-bold">#{selectedRequisition?.REQUISITION_ID}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Requisition Details</h2>
                  <p className="text-sm text-gray-500 mt-1">Complete information about this request</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-8">
              {/* Header Info Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">👤</span>
                      </div>
                      <p className="text-sm font-medium text-blue-700">Requested By</p>
                    </div>
                    <p className="text-xl font-bold text-blue-900">{selectedRequisition?.USER_ID}</p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">💰</span>
                      </div>
                      <p className="text-sm font-medium text-green-700">Total Amount</p>
                    </div>
                    <p className="text-3xl font-bold text-green-900">
                      ฿{Number(selectedRequisition?.TOTAL_AMOUNT || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">📅</span>
                      </div>
                      <p className="text-sm font-medium text-purple-700">Submitted</p>
                    </div>
                    <p className="text-lg font-semibold text-purple-900">
                      {selectedRequisition?.SUBMITTED_AT && formatDate(selectedRequisition.SUBMITTED_AT)}
                    </p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">🏷️</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700">Status</p>
                    </div>
                    <Badge className={`${getStatusColor(selectedRequisition?.STATUS || "")} border px-4 py-2 rounded-full flex items-center gap-2 w-fit text-sm font-semibold`}>
                      {getStatusIcon(selectedRequisition?.STATUS || "")}
                      {selectedRequisition?.STATUS}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Note Section */}
              {selectedRequisition?.ISSUE_NOTE && (
                <div className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">📝</span>
                    </div>
                    <p className="text-sm font-medium text-yellow-700">Note</p>
                  </div>
                  <p className="text-gray-800 text-lg leading-relaxed">{selectedRequisition.ISSUE_NOTE}</p>
                </div>
              )}

              {/* Approval History Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">✅</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Approval History</h3>
                </div>
                
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                  <p className="text-sm text-gray-600 mb-4">
                    This requisition uses the integrated approval system. Status is managed through both APPROVALS and STATUS_HISTORY tables.
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className={`${getStatusColor(selectedRequisition?.STATUS || "")} border px-3 py-1 rounded-full flex items-center gap-1 w-fit`}>
                      {getStatusIcon(selectedRequisition?.STATUS || "")}
                      {selectedRequisition?.STATUS || "PENDING"}
                    </Badge>
                    <span className="text-sm text-gray-500">(Latest status from integrated system)</span>
                  </div>
                  
                  {/* แสดงข้อมูลจาก APPROVALS และ STATUS_HISTORY */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-lg border">
                      <h4 className="font-semibold text-blue-700 mb-2">📋 APPROVALS Table</h4>
                      <p className="text-sm text-gray-600">
                        Records: {selectedRequisition?.APPROVALS?.length || 0}
                      </p>
                      <p className="text-sm text-gray-600">
                        Latest: {selectedRequisition?.APPROVALS?.[0]?.STATUS || "None"}
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border">
                      <h4 className="font-semibold text-green-700 mb-2">📊 STATUS_HISTORY Table</h4>
                      <p className="text-sm text-gray-600">
                        Records: {selectedRequisition?.STATUS_HISTORY?.length || 0}
                      </p>
                      <p className="text-sm text-gray-600">
                        Latest: {selectedRequisition?.STATUS_HISTORY?.[0]?.STATUS || "None"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">📦</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Items</h3>
                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                    {selectedRequisition?.REQUISITION_ITEMS?.length || 0} items
                  </Badge>
                </div>

                {selectedRequisition?.REQUISITION_ITEMS && selectedRequisition.REQUISITION_ITEMS.length > 0 ? (
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                      <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-gray-700">
                        <div>Product Name</div>
                        <div className="text-center">Quantity</div>
                        <div className="text-right">Unit Price</div>
                        <div className="text-right">Total Price</div>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {selectedRequisition.REQUISITION_ITEMS.map((item, idx) => (
                        <div key={idx} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                          <div className="grid grid-cols-4 gap-4 items-center">
                            <div className="font-medium text-gray-900">
                              {item.PRODUCT_NAME || "Unknown Product"}
                            </div>
                            <div className="text-center">
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700 font-semibold">
                                {item.QUANTITY}
                              </Badge>
                            </div>
                            <div className="text-right text-gray-600 font-medium">
                              ฿{Number(item.UNIT_PRICE || 0).toFixed(2)}
                            </div>
                            <div className="text-right font-bold text-green-600 text-lg">
                              ฿{Number(item.TOTAL_PRICE || 0).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Summary */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-green-700">Total Items:</span>
                        <span className="font-bold text-green-900">{selectedRequisition.REQUISITION_ITEMS.length}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📦</span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-600 mb-2">No items found</h4>
                    <p className="text-gray-500">This requisition doesn't have any items or the data hasn't been loaded properly.</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-3 pt-6 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setViewDialogOpen(false)}
                className="flex-1 h-12 text-base font-medium"
              >
                Close
              </Button>
              {user?.ROLE === "MANAGER" && selectedRequisition?.STATUS === "PENDING" && (
                <>
                  <Button 
                    onClick={() => { setDialogOpen(true); setActionType("approve") }} 
                    className="flex-1 h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 text-base font-medium"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    onClick={() => { setDialogOpen(true); setActionType("reject") }} 
                    className="flex-1 h-12 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 text-base font-medium"
                  >
                    <XCircle className="h-5 w-5 mr-2" />
                    Reject
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}
