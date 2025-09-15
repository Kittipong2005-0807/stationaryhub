'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion } from 'framer-motion';
import { apiPost } from '@/lib/api-utils';
import {
  Mail,
  CheckCircle,
  XCircle,
  Send,
  RefreshCw,
  AlertTriangle,
  Info,
  User,
  MessageSquare
} from 'lucide-react';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('🧪 ทดสอบการส่งอีเมลจาก StationaryHub');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleTestEmail = async () => {
    if (!email) {
      setError('กรุณากรอกอีเมลปลายทาง');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);

      const data = await apiPost('/api/test-email', {
        to: email,
        subject: subject,
        message: message || 'นี่เป็นข้อความทดสอบการส่งอีเมลจากระบบ StationaryHub'
      });

      setResult(data);
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการส่งอีเมล');
      console.error('Error testing email:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTest = () => {
    setSubject('🧪 ทดสอบการส่งอีเมลจาก StationaryHub');
    setMessage(`
🎉 ยินดีด้วย! การทดสอบการส่งอีเมลสำเร็จแล้ว!

📋 รายละเอียดการทดสอบ:
• เวลา: ${new Date().toLocaleString('th-TH')}
• จาก: StationaryHub System
• สถานะ: ✅ สำเร็จ

🔧 ฟีเจอร์ที่พร้อมใช้งาน:
• 📧 ส่งอีเมลแจ้งเตือนเมื่อสินค้ามาแล้ว
• 🔔 ส่งอีเมลเมื่อสร้าง/อนุมัติ/ปฏิเสธ requisition
• 📱 รองรับทั้ง In-App Notification และ Email
• 🎨 อีเมลมีรูปแบบที่สวยงามและอ่านง่าย

หากคุณได้รับอีเมลนี้ แสดงว่าระบบส่งอีเมลทำงานได้ปกติแล้ว! 🎉
    `);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            📧 ทดสอบการส่งอีเมล
          </h1>
          <p className="text-lg text-gray-600">
            ทดสอบระบบส่งอีเมลของ StationaryHub
          </p>
        </motion.div>

        {/* Main Test Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Mail className="w-6 h-6" />
                ทดสอบการส่งอีเมล
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  <User className="w-4 h-4 inline mr-2" />
                  อีเมลปลายทาง
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your-email@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Subject Input */}
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-medium text-gray-700">
                  หัวข้ออีเมล
                </Label>
                <Input
                  id="subject"
                  placeholder="หัวข้ออีเมล"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium text-gray-700">
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  ข้อความ
                </Label>
                <Textarea
                  id="message"
                  placeholder="ข้อความที่ต้องการส่ง..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="w-full"
                />
              </div>

              {/* Quick Test Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleQuickTest}
                  variant="outline"
                  className="mr-2"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  ใช้ข้อความทดสอบ
                </Button>
              </div>

              {/* Send Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleTestEmail}
                  disabled={loading || !email}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      กำลังส่งอีเมล...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      ส่งอีเมลทดสอบ
                    </>
                  )}
                </Button>
              </div>

              {/* Error Display */}
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Success Display */}
              {result && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div className="space-y-2">
                      <p className="font-semibold">✅ ส่งอีเมลสำเร็จ!</p>
                      <div className="text-sm space-y-1">
                        <p><strong>ถึง:</strong> {result.to || email}</p>
                        <p><strong>Message ID:</strong> {result.messageId}</p>
                        <p><strong>Response:</strong> {result.response}</p>
                        <p><strong>เวลา:</strong> {new Date().toLocaleString('th-TH')}</p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6"
        >
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
                <Info className="w-5 h-5 text-blue-600" />
                ข้อมูลการทดสอบ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700">🔧 การตั้งค่า SMTP</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Host: vcs.ube-ind.co.jp</p>
                    <p>• Port: 25</p>
                    <p>• From: stationaryhub@ube.co.th</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700">📧 ฟีเจอร์ที่พร้อมใช้งาน</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• ส่งอีเมลแจ้งเตือนสินค้ามาแล้ว</p>
                    <p>• ส่งอีเมลเมื่อสร้าง/อนุมัติ requisition</p>
                    <p>• รองรับ HTML Email</p>
                    <p>• บันทึกประวัติการส่ง</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 หมายเหตุ:</strong> ระบบจะส่งอีเมลไปยังที่อยู่อีเมลที่คุณกรอก 
                  กรุณาตรวจสอบอีเมลของคุณหลังจากกดส่ง
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
