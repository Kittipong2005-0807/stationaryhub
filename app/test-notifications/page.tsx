"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion } from "framer-motion"
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  Package, 
  Send,
  RefreshCw,
  AlertTriangle,
  Info
} from "lucide-react"

export default function TestNotificationsPage() {
  const [notificationType, setNotificationType] = useState("requisition_created")
  const [userId, setUserId] = useState("testuser")
  const [requisitionId, setRequisitionId] = useState("1")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")

  const handleTestNotification = async () => {
    try {
      setLoading(true)
      setError("")
      setResult(null)

      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: notificationType,
          userId,
          requisitionId: parseInt(requisitionId),
          message
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || "เกิดข้อผิดพลาดในการทดสอบ")
      }
    } catch (error) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
      console.error("Error testing notification:", error)
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'requisition_created':
        return <Package className="h-5 w-5 text-blue-600" />
      case 'requisition_approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'requisition_rejected':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'test_email':
        return <Send className="h-5 w-5 text-purple-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const getNotificationDescription = (type: string) => {
    switch (type) {
      case 'requisition_created':
        return "ทดสอบการแจ้งเตือนเมื่อสร้าง requisition ใหม่"
      case 'requisition_approved':
        return "ทดสอบการแจ้งเตือนเมื่อ requisition ได้รับการอนุมัติ"
      case 'requisition_rejected':
        return "ทดสอบการแจ้งเตือนเมื่อ requisition ถูกปฏิเสธ"
      case 'test_email':
        return "ทดสอบการส่งอีเมลแจ้งเตือน"
      default:
        return "ทดสอบระบบการแจ้งเตือน"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="container mx-auto px-4 py-8"
      >
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl">
              <Bell className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                ทดสอบระบบการแจ้งเตือน
              </h1>
              <p className="text-gray-600 mt-2">
                ทดสอบระบบการแจ้งเตือนสำหรับ Manager และ User
              </p>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-purple-600" />
                  ทดสอบการแจ้งเตือน
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notificationType">ประเภทการแจ้งเตือน</Label>
                  <Select value={notificationType} onValueChange={setNotificationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="requisition_created">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-blue-600" />
                          สร้าง Requisition ใหม่
                        </div>
                      </SelectItem>
                      <SelectItem value="requisition_approved">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          อนุมัติ Requisition
                        </div>
                      </SelectItem>
                      <SelectItem value="requisition_rejected">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          ปฏิเสธ Requisition
                        </div>
                      </SelectItem>
                      <SelectItem value="test_email">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4 text-purple-600" />
                          ทดสอบอีเมล
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userId">User ID (AdLoginName)</Label>
                  <Input
                    id="userId"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="เช่น: testuser, kittipong"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requisitionId">Requisition ID</Label>
                  <Input
                    id="requisitionId"
                    value={requisitionId}
                    onChange={(e) => setRequisitionId(e.target.value)}
                    placeholder="เช่น: 1, 2, 3"
                  />
                </div>

                {notificationType === "requisition_rejected" && (
                  <div className="space-y-2">
                    <Label htmlFor="message">เหตุผลการปฏิเสธ</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="ระบุเหตุผลการปฏิเสธ..."
                    />
                  </div>
                )}

                <Button
                  onClick={handleTestNotification}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      กำลังทดสอบ...
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      ทดสอบการแจ้งเตือน
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Test Results */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  ผลการทดสอบ
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {error && (
                  <Alert className="mb-4 border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {result && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      {result.message}
                    </AlertDescription>
                  </Alert>
                )}

                {!error && !result && (
                  <div className="text-center text-gray-500 py-8">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>ยังไม่มีการทดสอบ</p>
                    <p className="text-sm">เลือกประเภทการแจ้งเตือนและคลิกปุ่มทดสอบ</p>
                  </div>
                )}

                {/* Notification Type Info */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    {getNotificationIcon(notificationType)}
                    {getNotificationDescription(notificationType)}
                  </h4>
                  <p className="text-sm text-gray-600">
                    การทดสอบนี้จะส่งการแจ้งเตือนไปยัง Manager และ User ที่เกี่ยวข้อง
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Card className="shadow-lg border-0 bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                คำแนะนำการทดสอบ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-orange-700">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p><strong>สร้าง Requisition ใหม่:</strong> ทดสอบการแจ้งเตือน Manager เมื่อมีคำขอเบิกใหม่</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p><strong>อนุมัติ Requisition:</strong> ทดสอบการแจ้งเตือน User และ Manager อื่นๆ เมื่อคำขอได้รับการอนุมัติ</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p><strong>ปฏิเสธ Requisition:</strong> ทดสอบการแจ้งเตือน User และ Manager อื่นๆ เมื่อคำขอถูกปฏิเสธ</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p><strong>ทดสอบอีเมล:</strong> ทดสอบการส่งอีเมลแจ้งเตือนไปยังที่อยู่อีเมลที่กำหนด</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
} 