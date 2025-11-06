'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Search, Filter, Download, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getBasePathUrl } from '@/lib/base-path'
import ProductDataDisplay from '@/components/ProductDataDisplay'
import ThaiDateUtils from '@/lib/date-utils'

interface AuditLog {
  AUDIT_ID: number
  PRODUCT_ID: number
  ACTION_TYPE: string
  OLD_DATA: any
  NEW_DATA: any
  CHANGED_BY: string
  CHANGED_AT: string
  IP_ADDRESS: string
  USER_AGENT: string
  NOTES: string
  PRODUCT_NAME: string
  CATEGORY_NAME: string
  USERNAME: string
}

interface Pagination {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export default function ProductAuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    productId: '',
    actionType: '',
    startDate: '',
    endDate: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Fetch audit logs
  const fetchAuditLogs = async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })

      if (filters.productId) params.append('productId', filters.productId)
      if (filters.actionType) params.append('actionType', filters.actionType)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await fetch(getBasePathUrl(`/api/products/audit-log?${params}`))
      const data = await response.json()

      if (data.success) {
        setAuditLogs(data.data)
        setPagination(data.pagination)
      } else {
        console.error('Error fetching audit logs:', data.error)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const handleSearch = () => {
    fetchAuditLogs(1)
  }

  const handleClearFilters = () => {
    setFilters({
      productId: '',
      actionType: '',
      startDate: '',
      endDate: ''
    })
    fetchAuditLogs(1)
  }

  const getActionBadgeColor = (actionType: string) => {
    switch (actionType) {
      case 'CREATE':
        return 'bg-green-100 text-green-800'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'CREATE':
        return 'เพิ่มสินค้า'
      case 'UPDATE':
        return 'แก้ไขสินค้า'
      case 'DELETE':
        return 'ลบสินค้า'
      default:
        return actionType
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      // ใช้ ThaiDateUtils แทนการแก้ไขเวลาเอง
      return ThaiDateUtils.formatShortThaiDate(dateString)
    } catch (error) {
      console.error('Error formatting date:', error)
      return dateString
    }
  }

  const showLogDetails = (log: AuditLog) => {
    setSelectedLog(log)
    setShowDetails(true)
  }

  const exportToCSV = () => {
    const csvContent = [
      ['วันที่', 'เวลา', 'การดำเนินการ', 'ชื่อสินค้า', 'หมวดหมู่', 'ผู้ดำเนินการ', 'หมายเหตุ'],
      ...auditLogs.map(log => [
        formatDateTime(log.CHANGED_AT).split(' ')[0], // วันที่
        formatDateTime(log.CHANGED_AT).split(' ')[1], // เวลา
        getActionLabel(log.ACTION_TYPE),
        log.PRODUCT_NAME,
        log.CATEGORY_NAME,
        log.USERNAME,
        log.NOTES || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    const today = new Date()
    const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`
    link.setAttribute('download', `product_audit_log_${todayStr.replace(/\//g, '-')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ประวัติการเปลี่ยนแปลงสินค้า</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            กรองข้อมูล
          </Button>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>กรองข้อมูล</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="productId">รหัสสินค้า</Label>
                <Input
                  id="productId"
                  value={filters.productId}
                  onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
                  placeholder="ระบุรหัสสินค้า"
                />
              </div>
              <div>
                <Label htmlFor="actionType">ประเภทการดำเนินการ</Label>
                <Select value={filters.actionType} onValueChange={(value) => setFilters({ ...filters, actionType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREATE">เพิ่มสินค้า</SelectItem>
                    <SelectItem value="UPDATE">แก้ไขสินค้า</SelectItem>
                    <SelectItem value="DELETE">ลบสินค้า</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>วันที่เริ่มต้น</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.startDate ? formatDateTime(filters.startDate).split(' ')[0] : "เลือกวันที่"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.startDate ? new Date(filters.startDate) : undefined}
                      onSelect={(date) => setFilters({ ...filters, startDate: date ? date.toISOString() : '' })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>วันที่สิ้นสุด</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.endDate ? formatDateTime(filters.endDate).split(' ')[0] : "เลือกวันที่"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.endDate ? new Date(filters.endDate) : undefined}
                      onSelect={(date) => setFilters({ ...filters, endDate: date ? date.toISOString() : '' })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" />
                ค้นหา
              </Button>
              <Button onClick={handleClearFilters} variant="outline">
                ล้างตัวกรอง
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการประวัติการเปลี่ยนแปลง</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">กำลังโหลด...</div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log) => (
                <div key={log.AUDIT_ID} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getActionBadgeColor(log.ACTION_TYPE)}>
                          {getActionLabel(log.ACTION_TYPE)}
                        </Badge>
                        <span className="font-medium">{log.PRODUCT_NAME}</span>
                        <span className="text-sm text-gray-500">({log.CATEGORY_NAME})</span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>ผู้ดำเนินการ:</strong> {log.USERNAME}</p>
                        <p><strong>วันที่:</strong> {formatDateTime(log.CHANGED_AT)}</p>
                        {log.NOTES && <p><strong>หมายเหตุ:</strong> {log.NOTES}</p>}
                      </div>
                    </div>
                    <Button
                      onClick={() => showLogDetails(log)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      ดูรายละเอียด
                    </Button>
                  </div>
                </div>
              ))}
              
              {auditLogs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  ไม่พบข้อมูลประวัติการเปลี่ยนแปลง
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-600">
                แสดง {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.totalCount)} จาก {pagination.totalCount} รายการ
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => fetchAuditLogs(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                  variant="outline"
                >
                  ก่อนหน้า
                </Button>
                <span className="px-3 py-2 text-sm">
                  หน้า {pagination.page} จาก {pagination.totalPages}
                </span>
                <Button
                  onClick={() => fetchAuditLogs(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                  variant="outline"
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">รายละเอียดการเปลี่ยนแปลง</h2>
              <Button onClick={() => setShowDetails(false)} variant="outline">
                ปิด
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>การดำเนินการ</Label>
                  <Badge className={getActionBadgeColor(selectedLog.ACTION_TYPE)}>
                    {getActionLabel(selectedLog.ACTION_TYPE)}
                  </Badge>
                </div>
                <div>
                  <Label>ชื่อสินค้า</Label>
                  <p>{selectedLog.PRODUCT_NAME}</p>
                </div>
                <div>
                  <Label>หมวดหมู่</Label>
                  <p>{selectedLog.CATEGORY_NAME}</p>
                </div>
                <div>
                  <Label>ผู้ดำเนินการ</Label>
                  <p>{selectedLog.USERNAME}</p>
                </div>
                <div>
                  <Label>วันที่ดำเนินการ</Label>
                  <p>{formatDateTime(selectedLog.CHANGED_AT)}</p>
                </div>
                <div>
                  <Label>หมายเหตุ</Label>
                  <p>{selectedLog.NOTES || '-'}</p>
                </div>
              </div>

              <ProductDataDisplay 
                data={selectedLog.OLD_DATA} 
                title="ข้อมูลเดิม" 
                variant="old" 
              />
              
              <ProductDataDisplay 
                data={selectedLog.NEW_DATA} 
                title="ข้อมูลใหม่" 
                variant="new" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
