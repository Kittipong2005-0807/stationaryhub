"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, CheckCircle, AlertTriangle } from "lucide-react"
import { motion } from "framer-motion"

export default function SetupAdminPage() {
  const [email, setEmail] = useState("mujg-hkwfhm6dsohksojvp@ube.co.th")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSetupAdmin = async () => {
    if (!email) {
      setError("กรุณากรอก email")
      return
    }

    setSubmitting(true)
    setError("")
    setSuccess(false)

    try {
      const response = await fetch("/api/setup-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
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
            <div className="p-3 bg-gradient-to-r from-red-500 to-purple-600 rounded-xl">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent">
                Setup Admin User
              </h1>
              <p className="text-gray-600 mt-2">
                ตั้งค่าผู้ใช้ให้เป็น Admin ในระบบ
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
          <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-pink-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <Shield className="h-5 w-5" />
                Admin Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ube.co.th"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email ที่จะตั้งค่าเป็น Admin
                </p>
              </div>

              <Button 
                onClick={handleSetupAdmin}
                disabled={submitting || !email}
                className="w-full bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white"
              >
                {submitting ? "Setting up..." : "Setup as Admin"}
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
                      Admin setup successful! User {email} is now an ADMIN.
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
              <p>1. กรอก email ที่ต้องการตั้งค่าเป็น Admin</p>
              <p>2. กดปุ่ม "Setup as Admin"</p>
              <p>3. ระบบจะอัปเดต Role ในฐานข้อมูล</p>
              <p>4. ล็อกอินใหม่เพื่อให้การเปลี่ยนแปลงมีผล</p>
              <p className="text-blue-600 font-medium mt-4">
                💡 Tip: หลังจากตั้งค่าแล้ว ให้ล็อกอินใหม่เพื่อให้ Role ใหม่มีผล
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
} 