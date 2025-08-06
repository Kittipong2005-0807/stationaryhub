"use client"

import { useState } from "react"
import { 
  Box, 
  Typography, 
  Button, 
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText
} from "@mui/material"
import { Add as AddIcon } from "@mui/icons-material"

export default function TestDataPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [createdData, setCreatedData] = useState<any>(null)

  const createTestData = async () => {
    try {
      setLoading(true)
      setMessage(null)
      setError(null)
      setCreatedData(null)

      const response = await fetch("/api/test-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`สร้างข้อมูลทดสอบสำเร็จ!`)
        setCreatedData(data)
      } else {
        setError(data.error || "ไม่สามารถสร้างข้อมูลทดสอบได้")
      }
    } catch (error) {
      console.error("Error creating test data:", error)
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box className="container mx-auto px-4 py-8">
      <Typography variant="h4" className="font-bold text-gray-800 mb-6">
        🧪 สร้างข้อมูลทดสอบ
      </Typography>

      <Card className="max-w-md">
        <CardContent>
          <Typography variant="h6" className="mb-4">
            สร้างคำสั่งซื้อทดสอบ
          </Typography>
          
          <Typography variant="body2" className="text-gray-600 mb-4">
            กดปุ่มด้านล่างเพื่อสร้างคำสั่งซื้อทดสอบสำหรับหน้า Orders
          </Typography>

          <Button
            variant="contained"
            onClick={createTestData}
            disabled={loading}
            startIcon={<AddIcon />}
            fullWidth
          >
            {loading ? "กำลังสร้าง..." : "สร้างข้อมูลทดสอบ"}
          </Button>

          {message && (
            <Alert severity="success" className="mt-4">
              {message}
            </Alert>
          )}

          {error && (
            <Alert severity="error" className="mt-4">
              {error}
            </Alert>
          )}

          {createdData && (
            <Box className="mt-4 p-3 bg-green-50 rounded">
              <Typography variant="h6" className="text-green-800 mb-2">
                ✅ สร้างสำเร็จ
              </Typography>
              <Typography variant="body2" className="text-green-700 mb-2">
                Requisition ID: {createdData.requisitionId}
              </Typography>
              <Typography variant="body2" className="text-green-700 mb-2">
                สินค้าที่ใช้:
              </Typography>
              <List dense>
                {createdData.productsUsed?.map((product: string, index: number) => (
                  <ListItem key={index} className="py-1">
                    <ListItemText 
                      primary={`• ${product}`}
                      className="text-green-700"
                    />
                  </ListItem>
                ))}
              </List>
              <Typography variant="body2" className="text-green-700 mt-2">
                ไปที่หน้า <a href="/orders" className="underline font-semibold">Orders</a> เพื่อดูผลลัพธ์
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
} 