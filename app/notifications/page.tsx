"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/src/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion } from "framer-motion"
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  Package, 
  Trash2, 
  RefreshCw,
  AlertTriangle,
  Info
} from "lucide-react"

interface Notification {
  EMAIL_ID: number
  TO_USER_ID: string
  SUBJECT: string
  BODY: string
  STATUS: string
  IS_READ: boolean
  SENT_AT: Date
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user?.AdLoginName) {
      fetchNotifications()
    }
  }, [user?.AdLoginName])

  const fetchNotifications = async () => {
    if (!user?.AdLoginName) return

    try {
      setLoading(true)
      setError("")

      const response = await fetch(`/api/notifications?userId=${user.AdLoginName}`)
      const data = await response.json()

      if (response.ok) {
        setNotifications(data.notifications || [])
      } else {
        setError(data.error || "เกิดข้อผิดพลาดในการดึงข้อมูล")
      }
    } catch (error) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchNotifications()
    setRefreshing(false)
  }

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.EMAIL_ID === notificationId 
              ? { ...n, STATUS: 'READ' }
              : n
          )
        )
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.filter(n => n.EMAIL_ID !== notificationId)
        )
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const getNotificationIcon = (subject: string) => {
    if (subject.includes('approved')) return <CheckCircle className="h-5 w-5 text-green-600" />
    if (subject.includes('rejected')) return <XCircle className="h-5 w-5 text-red-600" />
    if (subject.includes('created')) return <Package className="h-5 w-5 text-blue-600" />
    return <Bell className="h-5 w-5 text-gray-600" />
  }

  const getNotificationStatus = (subject: string) => {
    if (subject.includes('approved')) return "อนุมัติแล้ว"
    if (subject.includes('rejected')) return "ปฏิเสธแล้ว"
    if (subject.includes('created')) return "สร้างใหม่"
    return "รอดำเนินการ"
  }

  const getStatusColor = (subject: string) => {
    if (subject.includes('approved')) return "bg-green-100 text-green-800"
    if (subject.includes('rejected')) return "bg-red-100 text-red-800"
    if (subject.includes('created')) return "bg-blue-100 text-blue-800"
    return "bg-gray-100 text-gray-800"
  }

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString)
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const unreadCount = notifications.filter(n => n.STATUS === 'SENT').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">กำลังโหลดการแจ้งเตือน...</p>
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
            className="flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <Bell className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  การแจ้งเตือน
                </h1>
                <p className="text-gray-600 mt-2">
                  ประวัติการแจ้งเตือนทั้งหมดของคุณ
                </p>
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
          >
            <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">ทั้งหมด</p>
                    <p className="text-2xl font-bold text-blue-600">{notifications.length}</p>
                  </div>
                  <Bell className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">ยังไม่อ่าน</p>
                    <p className="text-2xl font-bold text-orange-600">{unreadCount}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">อ่านแล้ว</p>
                    <p className="text-2xl font-bold text-green-600">{notifications.length - unreadCount}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Error Alert */}
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

        {/* Notifications List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {notifications.length === 0 ? (
            <Card className="border-2 border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
              <CardContent className="p-8 text-center">
                <Info className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">ไม่พบการแจ้งเตือน</h3>
                <p className="text-gray-500">คุณยังไม่มีประวัติการแจ้งเตือน</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification.EMAIL_ID}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card className={`border-2 transition-all duration-300 hover:shadow-lg ${
                    notification.STATUS === 'READ' 
                      ? 'border-gray-200 bg-gray-50' 
                      : 'border-blue-200 bg-blue-50'
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.SUBJECT)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-800">
                                {notification.BODY}
                              </h3>
                              <Badge className={getStatusColor(notification.SUBJECT)}>
                                {getNotificationStatus(notification.SUBJECT)}
                              </Badge>
                              {notification.STATUS === 'SENT' && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                  ใหม่
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mb-2">
                              {notification.SUBJECT}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatDate(notification.SENT_AT)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {notification.STATUS === 'SENT' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsRead(notification.EMAIL_ID)}
                              className="text-green-600 border-green-200 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              อ่านแล้ว
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteNotification(notification.EMAIL_ID)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
} 