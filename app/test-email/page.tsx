'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/src/hooks/use-toast'

export default function TestEmailPage() {
  const [toEmail, setToEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!toEmail || !subject || !message) {
      toast({
        type: "error",
        title: "ข้อมูลไม่ครบ",
        message: "กรุณากรอกข้อมูลให้ครบถ้วน",
        onClose: () => {}
      })
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toEmail, subject, message }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          type: "success",
          title: "ส่งอีเมลสำเร็จ",
          message: data.message,
          onClose: () => {}
        })
        setToEmail('')
        setSubject('')
        setMessage('')
      } else {
        toast({
          type: "error",
          title: "ส่งอีเมลไม่สำเร็จ",
          message: data.error || "เกิดข้อผิดพลาดในการส่งอีเมล",
          onClose: () => {}
        })
      }
    } catch (error) {
      toast({
        type: "error",
        title: "เกิดข้อผิดพลาด",
        message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
        onClose: () => {}
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>🧪 ทดสอบการส่งอีเมล</CardTitle>
          <CardDescription>
            ทดสอบการตั้งค่า SMTP และการส่งอีเมลจากระบบ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="toEmail">อีเมลผู้รับ</Label>
              <Input
                id="toEmail"
                type="email"
                placeholder="example@email.com"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subject">หัวข้ออีเมล</Label>
              <Input
                id="subject"
                placeholder="หัวข้ออีเมลทดสอบ"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">เนื้อหาอีเมล</Label>
              <Textarea
                id="message"
                placeholder="เนื้อหาอีเมลทดสอบ..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "กำลังส่ง..." : "ส่งอีเมลทดสอบ"}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">📋 หมายเหตุ:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• ตรวจสอบการตั้งค่า SMTP ในไฟล์ .env.local</li>
              <li>• สำหรับ Gmail ต้องใช้ App Password</li>
              <li>• ตรวจสอบ firewall และ port 587</li>
              <li>• อีเมลจะถูกส่งจาก {process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
