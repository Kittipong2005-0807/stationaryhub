"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Code, CheckCircle, AlertTriangle } from "lucide-react"
import { motion } from "framer-motion"

export default function SetupDevPage() {
  const [userId, setUserId] = useState("9C154")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSetupDev = async () => {
    if (!userId) {
      setError("กรุณากรอก User ID")
      return
    }

    setSubmitting(true)
    setError("")
    setSuccess(false)

    try {
      const response = await fetch("/api/setup-dev-raw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        setSuccess(true)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "เกิดข้อผิดพลาด")
      }
    } catch (error) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
      setSubmitting(false)
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
            <div className="p-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl">
              <Code className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Setup Dev User
              </h1>
              <p className="text-gray-600 mt-2">
                ตั้งค่าผู้ใช้ให้เป็น Developer ในระบบ
              </p>
            </div>
          </motion.div>
        </div>

        {/* Setup Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-md mx-auto"
        >
          <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Code className="h-5 w-5" />
                Dev Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">User ID</label>
                <Input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="9C154"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  User ID ที่จะตั้งค่าเป็น Developer
                </p>
              </div>

              <Button 
                onClick={handleSetupDev}
                disabled={submitting || !userId}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
              >
                {submitting ? "Setting up..." : "Setup as Dev"}
              </Button>

              {/* Success Alert */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Dev setup successful! User {userId} is now a DEVELOPER.
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                </motion.div>
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
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg">คำแนะนำ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>1. กรอก User ID ที่ต้องการตั้งค่าเป็น Developer</p>
              <p>2. กดปุ่ม "Setup as Dev"</p>
              <p>3. ระบบจะอัปเดต Role ในฐานข้อมูล</p>
              <p>4. ล็อกอินใหม่เพื่อให้การเปลี่ยนแปลงมีผล</p>
              <p className="text-green-600 font-medium mt-4">
                💡 Tip: Developer จะมีสิทธิ์เข้าถึงทุกหน้าในระบบ
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
} 