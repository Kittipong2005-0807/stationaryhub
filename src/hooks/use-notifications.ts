import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { apiFetch } from '@/lib/api-utils'

export interface Notification {
  id: number
  userId: string
  subject: string
  body: string
  status: string
  isRead: boolean
  sentAt: Date
  type?: string
  requisitionId?: number
  actorId?: string
  priority?: 'low' | 'medium' | 'high'
  timestamp?: Date
}

export interface NotificationResponse {
  success: boolean
  data: {
    notifications: Notification[]
    pagination: {
      total: number
      page: number
      limit: number
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
      const data: NotificationResponse = await apiFetch(`/api/notifications?limit=${limit}`)

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
      const data = await apiFetch('/api/notifications/count')

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
      const data = await apiFetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      })

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
