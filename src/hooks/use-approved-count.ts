import { useState, useEffect } from 'react'
import { getApiUrl } from '@/lib/api-utils'

export const useApprovedCount = () => {
  const [approvedCount, setApprovedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApprovedCount = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(getApiUrl('/api/approvals/count'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setApprovedCount(data.data.approvedCount)
      } else {
        throw new Error(data.error || 'Failed to fetch approved count')
      }
    } catch (err) {
      console.error('Error fetching approved count:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const markAsViewed = async () => {
    try {
      const response = await fetch(getApiUrl('/api/approvals/mark-viewed'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        console.log(`✅ Marked ${data.data.markedCount} requisitions as viewed`)
        // รีเฟรชจำนวนหลังจากอัพเดท
        await fetchApprovedCount()
      } else {
        throw new Error(data.error || 'Failed to mark as viewed')
      }
    } catch (err) {
      console.error('Error marking as viewed:', err)
    }
  }

  const refreshCount = () => {
    fetchApprovedCount()
  }

  useEffect(() => {
    fetchApprovedCount()
  }, [])

  return {
    approvedCount,
    loading,
    error,
    refreshCount,
    markAsViewed
  }
}
