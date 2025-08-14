"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/src/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion } from "framer-motion"
import { Users, Building2, UserCheck, AlertTriangle, CheckCircle } from "lucide-react"

interface SiteIdUser {
  USER_ID: string
  USERNAME: string
  ROLE: string
  SITE_ID: string
  DEPARTMENT?: string
}

export default function OrgCode3InfoPage() {
  const { user } = useAuth()
  const [userSiteId, setUserSiteId] = useState<string | null>(null)
  const [availableManagers, setAvailableManagers] = useState<SiteIdUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (user?.AdLoginName) {
      fetchOrgCode3Info()
    }
  }, [user])

  const fetchOrgCode3Info = async () => {
    try {
      setLoading(true)
      setError("")

      // ดึง SITE_ID ของ user
      const siteIdResponse = await fetch(`/api/orgcode3?action=getUserSiteId&userId=${user?.AdLoginName}`)
      const siteIdData = await siteIdResponse.json()
      
      if (siteIdData.siteId) {
        setUserSiteId(siteIdData.siteId)
        
        // ดึงรายการ Manager ที่มี SITE_ID เดียวกัน
        const managersResponse = await fetch(`/api/orgcode3?action=getAvailableManagers&userId=${user?.AdLoginName}`)
        const managersData = await managersResponse.json()
        setAvailableManagers(managersData.managers || [])
      } else {
        setError("ไม่พบข้อมูล SITE_ID สำหรับผู้ใช้นี้")
      }
    } catch (error) {
      setError("เกิดข้อผิดพลาดในการดึงข้อมูล")
      console.error("Error fetching SITE_ID info:", error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "destructive"
      case "MANAGER":
        return "default"
      case "DEV":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "👩‍💻"
      case "MANAGER":
        return "👨‍💼"
      case "DEV":
        return "⚡"
      default:
        return "👤"
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
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ข้อมูลแผนก (SITE_ID)
              </h1>
              <p className="text-gray-600 mt-2">
                ข้อมูลแผนกและ Manager ที่เกี่ยวข้อง
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Users className="h-5 w-5" />
                  ข้อมูลผู้ใช้
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">ชื่อผู้ใช้:</span>
                  <span className="font-semibold">{user?.FullNameThai || user?.FullNameEng || user?.USERNAME || user?.AdLoginName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">User ID:</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">{user?.AdLoginName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">แผนก:</span>
                  <Badge variant="outline">{user && (user as any).CostCenterEng ? (user as any).CostCenterEng : "ไม่ระบุ"}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">SITE_ID:</span>
                  <div className="flex items-center gap-2">
                    {userSiteId ? (
                      <>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          {userSiteId}
                        </Badge>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </>
                    ) : (
                      <>
                        <Badge variant="destructive">ไม่พบข้อมูล</Badge>
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Available Managers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-teal-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <UserCheck className="h-5 w-5" />
                  Manager ที่เกี่ยวข้อง
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableManagers.length > 0 ? (
                  <div className="space-y-3">
                    {availableManagers.map((manager, index) => (
                      <motion.div
                        key={manager.USER_ID}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{getRoleIcon(manager.ROLE)}</div>
                          <div>
                            <div className="font-semibold text-gray-800">{manager.USERNAME}</div>
                            <div className="text-sm text-gray-500">{manager.DEPARTMENT || "ไม่ระบุแผนก"}</div>
                          </div>
                        </div>
                        <Badge variant={getRoleColor(manager.ROLE) as any}>
                          {manager.ROLE}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🤷‍♂️</div>
                    <p className="text-gray-600">ไม่พบ Manager ในแผนกเดียวกัน</p>
                    <p className="text-sm text-gray-500 mt-1">
                      อาจเป็นเพราะไม่มี Manager ในแผนกนี้ หรือข้อมูล orgcode3 ไม่ถูกต้อง
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex justify-center gap-4"
        >
          <Button
            onClick={fetchOrgCode3Info}
            variant="outline"
            className="glass-button rounded-xl"
          >
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