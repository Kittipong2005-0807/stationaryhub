"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Skeleton,
} from "@mui/material"
import { CheckCircle, Cancel, Visibility, Assignment } from "@mui/icons-material"
const { data: session, status } = useSession()
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import type { Requisition } from "@/lib/database"

export default function ApprovalsPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<"approve" | "reject">("approve")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated || (user?.ROLE !== "MANAGER" && user?.ROLE !== "ADMIN")) {
      router.push("/login")
      return
    }

    setLoading(true)
    fetch("/api/requisitions")
      .then((res) => res.json())
      .then((data) => {
        setRequisitions(data)
        setLoading(false)
      })
      .catch(() => {
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
      // In real implementation, call API to update requisition status
      const updatedRequisitions = requisitions.map((req) =>
        req.REQUISITION_ID === selectedRequisition.REQUISITION_ID
          ? { ...req, STATUS: actionType === "approve" ? ("APPROVED" as const) : ("REJECTED" as const) }
          : req,
      )

      setRequisitions(updatedRequisitions)
      setDialogOpen(false)

      // Show success message
      alert(`Requisition ${actionType === "approve" ? "approved" : "rejected"} successfully!`)
    } catch (error) {
      alert("Failed to update requisition. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleView = (requisition: Requisition) => {
    setSelectedRequisition(requisition)
    setViewDialogOpen(true)
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
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!isAuthenticated || (user?.ROLE !== "MANAGER" && user?.ROLE !== "ADMIN")) {
    return null
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Box className="mb-8">
        <Typography variant="h3" className="font-bold text-gray-800 mb-2">
          ✅ Requisition Approvals
        </Typography>
        <Typography variant="body1" className="text-gray-600">
          Review and approve pending requisitions
        </Typography>
      </Box>

      {user?.ROLE === "MANAGER" && (
        <Alert severity="info" className="mb-6">
          <Typography variant="body2">
            As a Manager, you can approve or reject requisitions. Approved requisitions will be processed by the Admin
            team.
          </Typography>
        </Alert>
      )}

      <Card className="bg-white/80 backdrop-blur-md shadow-lg border border-white/20">
        <CardContent>
          {loading ? (
            <Box>
              {[...Array(3)].map((_, index) => (
                <Skeleton key={index} variant="rectangular" height={60} className="mb-4 rounded" />
              ))}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Requisition ID</TableCell>
                    <TableCell>Requested By</TableCell>
                    <TableCell>Submitted Date</TableCell>
                    <TableCell>Total Amount</TableCell>
                    <TableCell>Status</TableCell>
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
                    >
                      <TableCell>
                        <Typography className="font-semibold">#{requisition.REQUISITION_ID}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">{requisition.USERNAME}</Typography>
                          <Typography variant="body2" className="text-gray-500">
                            {requisition.ISSUE_NOTE}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(requisition.SUBMITTED_AT)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography className="font-bold text-green-600">฿{requisition.TOTAL_AMOUNT.toFixed(2)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={requisition.STATUS}
                          color={getStatusColor(requisition.STATUS) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box className="flex gap-2">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => handleView(requisition)}
                          >
                            View
                          </Button>
                          {requisition.STATUS === "PENDING" && (
                            <>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircle />}
                                onClick={() => handleAction(requisition, "approve")}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="error"
                                startIcon={<Cancel />}
                                onClick={() => handleAction(requisition, "reject")}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {!loading && requisitions.length === 0 && (
            <Box className="text-center py-20">
              <Assignment className="text-6xl text-gray-400 mb-4" />
              <Typography variant="h5" className="text-gray-500 mb-2">
                No requisitions found
              </Typography>
              <Typography variant="body1" className="text-gray-400">
                All requisitions have been processed
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Approval/Rejection Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{actionType === "approve" ? "Approve Requisition" : "Reject Requisition"}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" className="mb-4">
            Are you sure you want to {actionType} requisition #{selectedRequisition?.REQUISITION_ID}?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label={`${actionType === "approve" ? "Approval" : "Rejection"} Note (Optional)`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`Add a note about this ${actionType}...`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitAction}
            variant="contained"
            color={actionType === "approve" ? "success" : "error"}
            disabled={submitting}
          >
            {submitting ? "Processing..." : `${actionType === "approve" ? "Approve" : "Reject"}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* รายละเอียดสินค้าในใบสั่งซื้อ */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Requisition #{selectedRequisition?.REQUISITION_ID} Details</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" className="mb-2">
            Requested By: <b>{selectedRequisition?.USERNAME}</b>
          </Typography>
          <Typography variant="body2" className="mb-2">
            Submitted: {selectedRequisition?.SUBMITTED_AT && formatDate(selectedRequisition.SUBMITTED_AT)}
          </Typography>
          <Typography variant="body2" className="mb-2">
            Status: <Chip label={selectedRequisition?.STATUS} color={getStatusColor(selectedRequisition?.STATUS || "") as any} size="small" />
          </Typography>
          <Typography variant="body2" className="mb-2">
            Total Amount: <b>฿{selectedRequisition?.TOTAL_AMOUNT?.toFixed(2)}</b>
          </Typography>
          <Typography variant="body2" className="mb-4">
            Note: {selectedRequisition?.ISSUE_NOTE || "-"}
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product Name</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Unit Price</TableCell>
                  <TableCell>Total Price</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedRequisition?.REQUISITION_ITEMS?.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.PRODUCT_NAME}</TableCell>
                    <TableCell>{item.QUANTITY}</TableCell>
                    <TableCell>฿{item.UNIT_PRICE?.toFixed(2)}</TableCell>
                    <TableCell>฿{item.TOTAL_PRICE?.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)} color="primary">
            Close
          </Button>
          {user?.ROLE === "MANAGER" && selectedRequisition?.STATUS === "PENDING" && (
            <>
              <Button
                onClick={() => { setDialogOpen(true); setActionType("approve") }}
                variant="contained"
                color="success"
              >
                Approve
              </Button>
              <Button
                onClick={() => { setDialogOpen(true); setActionType("reject") }}
                variant="contained"
                color="error"
              >
                Reject
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </motion.div>
  )
}
