"use client"

import React from "react"
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
  IconButton,
  Box,
  Divider,
  TextField,
} from "@mui/material"
import { Delete, Add, Remove, ShoppingCart } from "@mui/icons-material"
import { useCart } from "@/src/contexts/CartContext"
import { useAuth } from "@/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Image from "next/image"

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, getTotalAmount, clearCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!isAuthenticated || user?.ROLE !== "USER") {
      router.push("/login")
    }
  }, [isAuthenticated, user, router])
  
  const handleSubmitRequisition = async () => {
    if (items.length === 0) return
    console.log(" Cart user data: ", user)
    // ดึง USER_ID จาก user context (ไม่ hardcode)
    const requisitionData = {
      USER_ID: user?.EmpCode,
      TOTAL_AMOUNT: getTotalAmount(),
      ISSUE_NOTE: "Requisition submitted from cart",
      STATUS: "PENDING",
      SITE_ID: user?.SITE_ID || "1700",
      REQUISITION_ITEMS: items.map((item) => ({
        PRODUCT_ID: item.PRODUCT_ID,
        QUANTITY: item.quantity,
        UNIT_PRICE: item.UNIT_COST,
        TOTAL_PRICE: item.UNIT_COST * item.quantity,
      })),
      // ไม่ต้องส่ง USER_ID ให้ API เพราะ API จะดึงจาก session ฝั่ง server
    }
    console.log("Cart :  ", requisitionData)

    try {
      const res = await fetch("/api/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requisitionData),
      })
      if (!res.ok) throw new Error("Failed to submit requisition")
      alert("Requisition submitted successfully!")
      clearCart()
      router.push("/orders")
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการส่งใบเบิก กรุณาลองใหม่")
    }
  }

  if (!isAuthenticated || user?.ROLE !== "USER") {
    return null
  }

  if (items.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
        <ShoppingCart className="text-6xl text-gray-400 mb-4" />
        <Typography variant="h4" className="text-gray-600 mb-2">
          Your cart is empty
        </Typography>
        <Typography variant="body1" className="text-gray-500 mb-6">
          Add some products to get started
        </Typography>
        <Button
          variant="contained"
          onClick={() => router.push("/")}
          className="bg-gradient-to-r from-blue-500 to-purple-600"
        >
          Browse Products
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Box className="mb-8">
        <Typography variant="h3" className="font-bold text-gray-800 mb-2">
          🧾 Requisition Cart
        </Typography>
        <Typography variant="body1" className="text-gray-600">
          Review your selected items before submitting
        </Typography>
      </Box>

      <Card className="bg-white/80 backdrop-blur-md shadow-lg border border-white/20">
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Unit Price</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <motion.tr
                    key={item.PRODUCT_ID}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <TableCell>
                      <Box className="flex items-center gap-3">
                        <Image
                          src={item.PHOTO_URL || "/placeholder.svg"}
                          alt={item.PRODUCT_NAME}
                          width={50}
                          height={50}
                          className="rounded-lg"
                        />
                        <Box>
                          <Typography variant="subtitle1" className="font-semibold">
                            {item.PRODUCT_NAME}
                          </Typography>
                          <Typography variant="body2" className="text-gray-500">
                            {item.CATEGORY_NAME}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography className="font-semibold text-green-600">
                        ฿{Number(item.UNIT_COST || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box className="flex items-center gap-1">
                        <IconButton
                          size="small"
                          onClick={() => updateQuantity(item.PRODUCT_ID, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Remove />
                        </IconButton>
                        <TextField
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = Number.parseInt(e.target.value) || 1
                            updateQuantity(item.PRODUCT_ID, val)
                          }}
                          size="small"
                          className="w-16"
                          inputProps={{ min: 1, className: "text-center" }}
                        />
                        <IconButton size="small" onClick={() => updateQuantity(item.PRODUCT_ID, item.quantity + 1)}>
                          <Add />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography className="font-bold">฿{Number(item.UNIT_COST * item.quantity || 0).toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton color="error" onClick={() => removeFromCart(item.PRODUCT_ID)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider className="my-4" />

          <Box style={{ marginTop: 32, marginBottom: 24 }}>
            <Box className="flex items-end justify-between mb-4 w-full">
              <Typography variant="h5" className="font-bold">
                Total Amount:
              </Typography>
              <Typography variant="h4" className="font-bold text-green-600" style={{ lineHeight: 1, marginRight: 12 }}>
                ฿{getTotalAmount().toFixed(2)}
              </Typography>
            </Box>
            <Box className="flex gap-2 md:gap-4 justify-end">
              <Button variant="outlined" onClick={clearCart} color="error" style={{ minWidth: 120 }}>
                Clear Cart
              </Button>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSubmitRequisition}
                  className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                  style={{ minWidth: 180 }}
                >
                  Submit Requisition
                </Button>
              </motion.div>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  )
}
