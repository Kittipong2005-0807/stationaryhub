'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, Mail, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'

interface EmailStats {
  totalEmails: number
  recentEmails: number
  statusBreakdown: Record<string, number>
}

export default function EmailManagementPage() {
  const [stats, setStats] = useState<EmailStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryLoading, setRetryLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/email-management')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to fetch email stats' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error fetching email stats' })
    } finally {
      setLoading(false)
    }
  }

  const retryFailedEmails = async () => {
    try {
      setRetryLoading(true)
      setMessage(null)
      
      const response = await fetch('/api/email-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'retry_failed',
          maxRetries: 3
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        // รีเฟรชสถิติหลังจาก retry
        await fetchStats()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to retry emails' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error retrying emails' })
    } finally {
      setRetryLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return 'default' // green
      case 'failed':
        return 'destructive' // red
      case 'pending':
        return 'secondary' // yellow
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading email statistics...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Management</h1>
          <p className="text-muted-foreground">
            จัดการและติดตามการส่งอีเมลในระบบ
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={fetchStats} 
            variant="outline" 
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={retryFailedEmails} 
            disabled={retryLoading || !stats}
            variant="default"
          >
            <Mail className="h-4 w-4 mr-2" />
            {retryLoading ? 'Retrying...' : 'Retry Failed Emails'}
          </Button>
        </div>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Emails */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmails.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                ทั้งหมดในระบบ
              </p>
            </CardContent>
          </Card>

          {/* Recent Emails */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Emails</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentEmails.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                ใน 24 ชั่วโมงที่ผ่านมา
              </p>
            </CardContent>
          </Card>

          {/* Success Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalEmails > 0 
                  ? Math.round((stats.statusBreakdown.SENT || 0) / stats.totalEmails * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                อีเมลที่ส่งสำเร็จ
              </p>
            </CardContent>
          </Card>

          {/* Failed Emails */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Emails</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {(stats.statusBreakdown.FAILED || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                อีเมลที่ส่งไม่สำเร็จ
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Breakdown */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Email Status Breakdown</CardTitle>
            <CardDescription>
              สถิติการส่งอีเมลแยกตามสถานะ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(status)}
                    <span className="font-medium capitalize">{status}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusBadgeVariant(status)}>
                      {count.toLocaleString()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {stats.totalEmails > 0 
                        ? Math.round(count / stats.totalEmails * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

