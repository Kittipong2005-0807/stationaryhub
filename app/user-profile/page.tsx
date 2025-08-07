"use client"

import { useAuth } from "@/src/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { 
  User, 
  Mail, 
  Building, 
  Shield, 
  MapPin,
  Calendar,
  CheckCircle,
  AlertTriangle
} from "lucide-react"

export default function UserProfilePage() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-red-600 mb-2">ไม่พบข้อมูลผู้ใช้</h1>
            <p className="text-gray-600">กรุณาล็อกอินใหม่</p>
          </div>
        </div>
      </div>
    )
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800"
      case "MANAGER":
        return "bg-orange-100 text-orange-800"
      case "DEV":
        return "bg-purple-100 text-purple-800"
      case "USER":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
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
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ข้อมูลผู้ใช้
              </h1>
              <p className="text-gray-600 mt-2">
                ข้อมูลผู้ใช้ที่ได้จาก LDAP และฐานข้อมูล
              </p>
            </div>
          </motion.div>
        </div>

        {/* User Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Basic Information */}
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <User className="h-5 w-5" />
                ข้อมูลพื้นฐาน
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">User ID:</span>
                <span className="font-semibold text-gray-800">{user.USER_ID || user.AdLoginName || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Username:</span>
                <span className="font-semibold text-gray-800">{user.USERNAME || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Role:</span>
                <Badge className={getRoleColor(user.ROLE || '')}>
                  {user.ROLE || 'N/A'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Site ID:</span>
                <span className="font-semibold text-gray-800">{user.SITE_ID || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Mail className="h-5 w-5" />
                ข้อมูลการติดต่อ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Email:</span>
                <span className="font-semibold text-gray-800">{user.EMAIL || user.CurrentEmail || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Department:</span>
                <span className="font-semibold text-gray-800">{user.DEPARTMENT || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Position:</span>
                <span className="font-semibold text-gray-800">{user.PostNameEng || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Cost Center:</span>
                <span className="font-semibold text-gray-800">{user.CostCenterEng || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          {/* LDAP Information */}
          <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <Building className="h-5 w-5" />
                ข้อมูลจาก LDAP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">AdLoginName:</span>
                <span className="font-semibold text-gray-800">{user.AdLoginName || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">EmpCode:</span>
                <span className="font-semibold text-gray-800">{user.EmpCode || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Full Name (Thai):</span>
                <span className="font-semibold text-gray-800">{user.FullNameThai || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Full Name (Eng):</span>
                <span className="font-semibold text-gray-800">{user.FullNameEng || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <Shield className="h-5 w-5" />
                ข้อมูลระบบ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">SITE_ID:</span>
                <span className="font-semibold text-gray-800">{user.SITE_ID || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Authentication:</span>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  LDAP
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Session Status:</span>
                <Badge className="bg-blue-100 text-blue-800">
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Data Source:</span>
                <span className="font-semibold text-gray-800">USERS Table</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data Validation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card className="border-2 border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
            <CardHeader>
              <CardTitle className="text-gray-700">การตรวจสอบข้อมูล</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {user.USERNAME ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    USERNAME: {user.USERNAME ? '✅ ถูกต้อง' : '❌ ไม่พบข้อมูล'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {user.EMAIL ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    EMAIL: {user.EMAIL ? '✅ ถูกต้อง' : '❌ ไม่พบข้อมูล'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {user.DEPARTMENT ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    DEPARTMENT: {user.DEPARTMENT ? '✅ ถูกต้อง' : '❌ ไม่พบข้อมูล'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {user.ROLE ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    ROLE: {user.ROLE ? '✅ ถูกต้อง' : '❌ ไม่พบข้อมูล'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
} 