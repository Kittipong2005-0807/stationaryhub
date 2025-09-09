"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/src/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion } from "framer-motion"
import { Database, Users, FileText, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react"

interface SiteIdStats {
  totalUsers: number
  usersWithSiteId: number
  totalRequisitions: number
  requisitionsWithSiteId: number
  siteIdList: string[]
}

export default function SiteIdStatusPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<SiteIdStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchSiteIdStats()
  }, [])

  const fetchSiteIdStats = async () => {
    try {
      setLoading(true)
      setError("")

      // ดึงข้อมูลสถิติ SITE_ID
      const response = await fetch("/api/orgcode3?action=getStats")
      const data = await response.json()
      
      if (response.ok) {
        setStats(data)
      } else {
        setError(data.error || "เกิดข้อผิดพลาดในการดึงข้อมูล")
      }
    } catch (error) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
      console.error("Error fetching SITE_ID stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    )
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
              <Database className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                สถานะระบบ SITE_ID
              </h1>
              <p className="text-gray-600 mt-2">
                ข้อมูลการใช้งานระบบ SITE_ID ในระบบ
              </p>
            </div>
          </motion.div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Users Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <Users className="h-5 w-5" />
                    ผู้ใช้
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ทั้งหมด:</span>
                      <span className="font-bold">{stats.totalUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">มี SITE_ID:</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {stats.usersWithSiteId}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ไม่มี SITE_ID:</span>
                      <Badge variant="destructive">
                        {stats.totalUsers - stats.usersWithSiteId}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Requisitions Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-teal-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <FileText className="h-5 w-5" />
                    คำขอ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ทั้งหมด:</span>
                      <span className="font-bold">{stats.totalRequisitions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">มี SITE_ID:</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {stats.requisitionsWithSiteId}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ไม่มี SITE_ID:</span>
                      <Badge variant="destructive">
                        {stats.totalRequisitions - stats.requisitionsWithSiteId}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Coverage Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <CheckCircle className="h-5 w-5" />
                    ความครอบคลุม
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ผู้ใช้:</span>
                      <Badge variant="default" className="bg-blue-100 text-blue-800">
                        {stats.totalUsers > 0 ? Math.round((stats.usersWithSiteId / stats.totalUsers) * 100) : 0}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">คำขอ:</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {stats.totalRequisitions > 0 ? Math.round((stats.requisitionsWithSiteId / stats.totalRequisitions) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* SITE_ID Count */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <Database className="h-5 w-5" />
                    แผนก
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">จำนวนแผนก:</span>
                      <span className="font-bold">{stats.siteIdList.length}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {stats.siteIdList.slice(0, 3).join(", ")}
                      {stats.siteIdList.length > 3 && "..."}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex justify-center gap-4"
        >
          <Button
            onClick={fetchSiteIdStats}
            variant="outline"
            className="glass-button rounded-xl"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            รีเฟรชข้อมูล
          </Button>
          <Button
            onClick={() => window.history.back()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
          >
            กลับ
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
} 