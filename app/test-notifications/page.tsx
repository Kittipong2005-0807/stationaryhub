"use client"

import { useState } from "react"
import { useAuth } from "@/src/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion } from "framer-motion"
import { Bell, CheckCircle, AlertTriangle, Send } from "lucide-react"

export default function TestNotificationsPage() {
  const { user } = useAuth()
  const [message, setMessage] = useState("คำขอเบิกของคุณ (เลขที่ 1234) ได้รับการอนุมัติแล้ว")
  const [subject, setSubject] = useState("Notification: requisition_approved")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const createTestNotification = async () => {
    if (!user?.AdLoginName) {
      setError("ไม่พบข้อมูลผู้ใช้")
      return
    }

    try {
      setLoading(true)
      setError("")
      setSuccess(false)

      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.AdLoginName,
          message,
          subject
        }),
      })

      if (response.ok) {
        setSuccess(true)
        setMessage("คำขอเบิกของคุณ (เลขที่ 1234) ได้รับการอนุมัติแล้ว")
        setSubject("Notification: requisition_approved")
      } else {
        const errorData = await response.json()
        setError(errorData.error || "เกิดข้อผิดพลาด")
      }
    } catch (error) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
      setLoading(false)
    }
  }

  const createSampleNotifications = async () => {
    if (!user?.AdLoginName) {
      setError("ไม่พบข้อมูลผู้ใช้")
      return
    }

    try {
      setLoading(true)
      setError("")
      setSuccess(false)

      const notifications = [
        {
          message: "คำขอเบิกของคุณ (เลขที่ 1001) ได้รับการอนุมัติแล้ว",
          subject: "Notification: requisition_approved"
        },
        {
          message: "คำขอเบิกของคุณ (เลขที่ 1002) ถูกปฏิเสธ กรุณาตรวจสอบรายละเอียด",
          subject: "Notification: requisition_rejected"
        },
        {
          message: "คำขอเบิกของคุณ (เลขที่ 1003) ได้รับการส่งเรียบร้อยแล้ว",
          subject: "Notification: requisition_created"
        }
      ]

      for (const notification of notifications) {
        await fetch("/api/notifications/test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.AdLoginName,
            message: notification.message,
            subject: notification.subject
          }),
        })
      }

      setSuccess(true)
    } catch (error) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
      setLoading(false)
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
            <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
              <Bell className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                ทดสอบการแจ้งเตือน
              </h1>
              <p className="text-gray-600 mt-2">
                สร้างการแจ้งเตือนทดสอบสำหรับการพัฒนา
              </p>
            </div>
          </motion.div>
        </div>

        {/* Test Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <Send className="h-5 w-5" />
                สร้างการแจ้งเตือนทดสอบ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">ข้อความ</label>
                <Input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="ข้อความแจ้งเตือน"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">หัวข้อ</label>
                <Input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Notification: requisition_approved"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={createTestNotification}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700 transition-all duration-300"
                >
                  {loading ? "กำลังสร้าง..." : "สร้างการแจ้งเตือน"}
                </Button>
                <Button
                  onClick={createSampleNotifications}
                  disabled={loading}
                  variant="outline"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  สร้างตัวอย่าง
                </Button>
              </div>

              {success && (
                <Alert className="bg-green-50 border-green-200 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    สร้างการแจ้งเตือนสำเร็จ! ตรวจสอบได้ที่ไอคอนแจ้งเตือน
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 max-w-2xl mx-auto"
        >
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardHeader>
              <CardTitle className="text-blue-700">คำแนะนำ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>• ใช้หน้านี้เพื่อสร้างการแจ้งเตือนทดสอบ</p>
              <p>• การแจ้งเตือนจะปรากฏในไอคอนแจ้งเตือนที่ header</p>
              <p>• สามารถดูประวัติการแจ้งเตือนทั้งหมดได้ที่หน้า /notifications</p>
              <p>• ปุ่ม "สร้างตัวอย่าง" จะสร้างการแจ้งเตือน 3 รายการ</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
} 