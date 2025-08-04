"use client"

import { useEffect, useState } from "react"
import { Typography, Card, CardContent, Box, Chip, Divider, CircularProgress } from "@mui/material"
import { useAuth } from "@/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import type { Requisition } from "@/lib/database"

export default function OrdersPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || user?.ROLE !== "USER") {
      router.push("/login")
      return
    }
    setLoading(true)
    fetch("/api/requisitions?mine=1")
      .then((res) => res.json())
      .then((data) => {
        setOrders(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [isAuthenticated, user, router])

  if (!isAuthenticated || user?.ROLE !== "USER") return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Typography variant="h3" className="font-bold mb-4 text-center">
        📦 Order Review
      </Typography>
      <Typography variant="body1" className="text-gray-600 mb-8 text-center">
        ตรวจสอบคำสั่งซื้อที่เพิ่งสั่งและประวัติย้อนหลังของคุณ
      </Typography>
      {loading ? (
        <Box className="flex justify-center items-center min-h-[30vh]">
          <CircularProgress />
        </Box>
      ) : orders.length === 0 ? (
        <Box className="text-center py-20">
          <Typography variant="h5" className="text-gray-500 mb-2">
            ไม่พบประวัติคำสั่งซื้อ
          </Typography>
        </Box>
      ) : (
        <Box className="space-y-6 max-w-2xl mx-auto">
          {orders?.map((order) => (
            <Card key={order.REQUISITION_ID} className="shadow-md border border-gray-200">
              <CardContent>
                <Box className="flex justify-between items-center mb-2">
                  <Typography variant="h6" className="font-bold">
                    Order #{order.REQUISITION_ID}
                  </Typography>
                  <Chip label={order.STATUS} color={order.STATUS === "APPROVED" ? "success" : order.STATUS === "PENDING" ? "warning" : "default"} />
                </Box>
                <Typography variant="body2" className="text-gray-500 mb-1">
                  วันที่สั่งซื้อ: {new Date(order.SUBMITTED_AT).toLocaleString()}
                </Typography>
                <Typography variant="body2" className="mb-2">
                ยอดรวม: <b>฿{(Number(order.TOTAL_AMOUNT) || 0).toFixed(2)}</b>
                </Typography>
                {order.ISSUE_NOTE && (
                  <Typography variant="body2" className="mb-2 text-gray-600">
                    หมายเหตุ: {order.ISSUE_NOTE}
                  </Typography>
                )}
                {order.REQUISITION_ITEMS && order.REQUISITION_ITEMS.length > 0 && (
                  <>
                    <Divider className="my-2" />
                    <Typography variant="subtitle2" className="mb-1">
                      รายการสินค้า:
                    </Typography>
                    <ul className="pl-4">
                      {order.REQUISITION_ITEMS.map((item, idx) => (
                        <li key={idx} className="mb-1">
                          {item.PRODUCT_NAME} x {item.QUANTITY} = ฿{item.TOTAL_PRICE.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </motion.div>
  )
} 