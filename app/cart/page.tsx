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
import Link from "next/link"
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
    
    // ใช้ OrgCode3Service เพื่อสร้าง requisition พร้อม SITE_ID
    const requisitionData = {
      action: "createRequisition",
      userId: user?.EmpCode || user?.USER_ID || user?.AdLoginName, // ใช้ EmpCode เป็นหลัก
      totalAmount: getTotalAmount(),
      issueNote: "Requisition submitted from cart",
      siteId: user?.SITE_ID || user?.orgcode3 || null, // ใช้ SITE_ID หรือ orgcode3 จาก session
      REQUISITION_ITEMS: items.map((item) => ({
        PRODUCT_ID: item.PRODUCT_ID,
        QUANTITY: item.quantity,
        UNIT_PRICE: item.UNIT_COST,
        TOTAL_PRICE: item.UNIT_COST * item.quantity,
      })),
    }
    
    // แสดง userId ที่จะใช้
    console.log("EmpCode from session:", user?.EmpCode)
    console.log("USER_ID from session:", user?.USER_ID)
    console.log("AdLoginName from session:", user?.AdLoginName)
    console.log("Final userId to be used:", requisitionData.userId)
    console.log("Cart data being sent:", requisitionData)
    console.log("User data from session:", { 
      USER_ID: user?.USER_ID,
      AdLoginName: user?.AdLoginName, 
      EmpCode: user?.EmpCode, 
      SITE_ID: user?.SITE_ID,
      ROLE: user?.ROLE,
      EMAIL: user?.EMAIL,
      USERNAME: user?.USERNAME,
      orgcode3: user?.orgcode3
    })
    
    // แสดงข้อมูล session ทั้งหมด
    console.log("Full session user object:", user)
    
    // แสดง userId ที่จะใช้
    const finalUserId = user?.EmpCode || user?.USER_ID || user?.AdLoginName
    console.log("Final userId to be used:", finalUserId)
    
    // ตรวจสอบว่าข้อมูลครบหรือไม่
    if (!user?.EmpCode) {
      console.error("EmpCode is missing from session")
      alert("ข้อมูลผู้ใช้ไม่ครบถ้วน กรุณาเข้าสู่ระบบใหม่")
      return
    }
    
    if (getTotalAmount() <= 0) {
      console.error("Total amount is zero or negative")
      alert("จำนวนเงินรวมต้องมากกว่า 0")
      return
    }

    try {
      // ใช้ API orgcode3 เพื่อสร้าง requisition พร้อม orgcode3
      const res = await fetch("/api/orgcode3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requisitionData),
      })
      
      console.log("API response status:", res.status)
      if (!res.ok) {
        const errorData = await res.json()
        console.error("API error:", errorData)
        throw new Error(errorData.error || "Failed to submit requisition")
      }
      
      const result = await res.json()
      console.log("Requisition created with ID:", result.requisitionId)
      
      // สร้าง requisition items
      if (result.requisitionId && requisitionData.REQUISITION_ITEMS.length > 0) {
        const itemsRes = await fetch("/api/requisitions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...requisitionData,
            requisitionId: result.requisitionId
          }),
        })
        
        if (!itemsRes.ok) {
          console.warn("Failed to create requisition items")
        }
      }
      
      alert("Requisition submitted successfully!")
      clearCart()
      router.push("/orders")
    } catch (err) {
      console.error("Error submitting requisition:", err)
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
        <Link href="/" style={{ textDecoration: 'none' }}>
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
      <Box className="mb-8">
        <Typography variant="h3" className="font-bold text-gray-800 mb-2">
          🧾 Requisition Cart
        </Typography>
        <Typography variant="body1" className="text-gray-600">
          Review your selected items before submitting
        </Typography>
      </Box>

      <Card className="glass-card">
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
                  className="btn-gradient-success"
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
