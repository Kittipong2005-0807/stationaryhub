import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export interface Notification {
  id: number
  userId: string
  subject: string
  message: string
  sentAt: Date
  isRead: boolean
  type: string
  requisitionId?: number
  actorId?: string
  priority: 'low' | 'medium' | 'high'
  timestamp?: string
}

export interface NotificationResponse {
  success: boolean
  data: {
    notifications: Notification[]
    pagination: {
      page: number
      limit: number
      total: number
      hasMore: boolean
    }
  }
}

export const useNotifications = () => {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ดึงการแจ้งเตือน
  const fetchNotifications = useCallback(async (limit: number = 50) => {
    if (!session?.user?.name) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/notifications?limit=${limit}`)
      const data: NotificationResponse = await response.json()

      if (data.success) {
        setNotifications(data.data.notifications)
      } else {
        setError('Failed to fetch notifications')
      }
    } catch (err) {
      setError('Error fetching notifications')
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.name])

  // นับจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
  const fetchUnreadCount = useCallback(async () => {
    if (!session?.user?.name) return

    try {
      const response = await fetch('/api/notifications/count')
      const data = await response.json()

      if (data.success) {
        setUnreadCount(data.data.unreadCount)
      }
    } catch (err) {
      console.error('Error fetching unread count:', err)
    }
  }, [session?.user?.name])

  // อัปเดตสถานะการอ่าน
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      })
      const data = await response.json()

      if (data.success) {
        // อัปเดตสถานะใน local state
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, isRead: true }
              : notification
          )
        )
        
        // อัปเดตจำนวนที่ยังไม่ได้อ่าน
        setUnreadCount(prev => Math.max(0, prev - 1))
        
        return true
      }
      return false
    } catch (err) {
      console.error('Error marking notification as read:', err)
      return false
    }
  }, [])

  // อัปเดตสถานะการอ่านแบบ batch
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead)
      
      // อัปเดตสถานะใน local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      )
      
      // อัปเดตจำนวนที่ยังไม่ได้อ่าน
      setUnreadCount(0)
      
      // อัปเดตในฐานข้อมูล (ถ้ามี API)
      // TODO: Implement batch update API
      
      return true
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      return false
    }
  }, [notifications])

  // โหลดข้อมูลเมื่อ session เปลี่ยน
  useEffect(() => {
    if (session?.user?.name) {
      fetchNotifications()
      fetchUnreadCount()
    }
  }, [session?.user?.name, fetchNotifications, fetchUnreadCount])

  // อัปเดตจำนวนที่ยังไม่ได้อ่านทุก 30 วินาที
  useEffect(() => {
    if (!session?.user?.name) return

    const interval = setInterval(() => {
      fetchUnreadCount()
    }, 30000) // 30 วินาที

    return () => clearInterval(interval)
  }, [session?.user?.name, fetchUnreadCount])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    refetch: () => {
      fetchNotifications()
      fetchUnreadCount()
    }
  }
}
