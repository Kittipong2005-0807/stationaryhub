'use client'

import { Badge } from '@/components/ui/badge'
import { CalendarIcon, Package, DollarSign, Image, Tag } from 'lucide-react'

interface ProductDataDisplayProps {
  data: any
  title: string
  variant?: 'old' | 'new'
}

export default function ProductDataDisplay({ data, title, variant = 'old' }: ProductDataDisplayProps) {
  if (!data) return null

  const bgColor = variant === 'old' ? 'bg-gray-50 border-gray-200' : 'bg-green-50 border-green-200'
  const titleColor = variant === 'old' ? 'text-gray-700' : 'text-green-700'

  const formatValue = (key: string, value: any) => {
    if (!value) return '-'
    
    switch (key) {
      case 'UNIT_COST':
        return `฿${parseFloat(value.toString()).toLocaleString()}`
      case 'CREATED_AT':
        try {
          const date = new Date(value.toString())
          
          // แสดงเวลาจากฐานข้อมูลโดยตรง ไม่แปลงเวลา
          const day = date.getDate().toString().padStart(2, '0')
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          const year = (date.getFullYear() + 543).toString().slice(-4) // แปลงเป็นปี พ.ศ.
          const hours = date.getHours().toString().padStart(2, '0')
          const minutes = date.getMinutes().toString().padStart(2, '0')
          const seconds = date.getSeconds().toString().padStart(2, '0')
          
          return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
        } catch (error) {
          return value.toString()
        }
      case 'PHOTO_URL':
        return (
          <div className="flex items-center space-x-2">
            <Image className="w-4 h-4 text-blue-500" />
            <span className="text-blue-600 hover:text-blue-800 cursor-pointer text-sm">
              {value.toString().split('/').pop() || value.toString()}
            </span>
          </div>
        )
      case 'CATEGORY_NAME':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {value.toString()}
          </Badge>
        )
      case 'ITEM_ID':
        return (
          <Badge variant="outline" className="bg-gray-100">
            {value.toString()}
          </Badge>
        )
      default:
        return value.toString()
    }
  }

  const getFieldIcon = (key: string) => {
    switch (key) {
      case 'ITEM_ID':
        return <Tag className="w-4 h-4 text-gray-500" />
      case 'PRODUCT_NAME':
        return <Package className="w-4 h-4 text-gray-500" />
      case 'UNIT_COST':
        return <DollarSign className="w-4 h-4 text-gray-500" />
      case 'CREATED_AT':
        return <CalendarIcon className="w-4 h-4 text-gray-500" />
      default:
        return <Tag className="w-4 h-4 text-gray-500" />
    }
  }

  const getFieldLabel = (key: string) => {
    const labels: { [key: string]: string } = {
      'ITEM_ID': 'รหัสสินค้า',
      'PRODUCT_NAME': 'ชื่อสินค้า',
      'CATEGORY_ID': 'รหัสหมวดหมู่',
      'CATEGORY_NAME': 'หมวดหมู่',
      'UNIT_COST': 'ราคาต่อหน่วย',
      'ORDER_UNIT': 'หน่วยสั่งซื้อ',
      'PHOTO_URL': 'รูปภาพ',
      'CREATED_AT': 'วันที่สร้าง'
    }
    return labels[key] || key
  }

  return (
    <div>
      <h4 className={`text-sm font-semibold ${titleColor} mb-3 flex items-center space-x-2`}>
        <span>{title}</span>
        {variant === 'old' && <Badge variant="destructive" className="text-xs">เดิม</Badge>}
        {variant === 'new' && <Badge variant="default" className="text-xs bg-green-600">ใหม่</Badge>}
      </h4>
      
      <div className={`${bgColor} border rounded-lg p-4 space-y-3`}>
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
            <div className="flex items-center space-x-2">
              {getFieldIcon(key)}
              <span className="text-sm font-medium text-gray-600">
                {getFieldLabel(key)}:
              </span>
            </div>
            <div className="text-sm text-gray-800 font-medium">
              {formatValue(key, value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
