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
  MessageSquare,
  Package
} from 'lucide-react';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('📦 สินค้ามาแล้ว - การทดสอบระบบ');
  const [message, setMessage] = useState('');
  const [emailType, setEmailType] = useState('test');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleTestEmail = async () => {
    if (!email) {
      setError('กรุณากรอกที่อยู่อีเมลปลายทาง');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);

      const data = await apiPost('/api/test-email', {
        to: email,
        subject: subject,
        message: message || 'นี่เป็นข้อความทดสอบการส่งอีเมลจากระบบ StationaryHub',
        emailType: emailType
      });

      setResult(data);
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการส่งอีเมลแจ้งเตือน');
      console.error('Error testing email:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTest = () => {
    setSubject('📦 สินค้ามาแล้ว - การทดสอบระบบ');
    setMessage(`เรียน ท่านผู้ใช้งาน

🎉 ขอแสดงความยินดี!

สินค้าที่ท่านได้ขอเบิกได้มาถึงสถานที่แล้ว กรุณาติดต่อแผนกจัดซื้อเพื่อดำเนินการรับสินค้า

📋 รายละเอียดคำขอเบิกวัสดุ:
• เลขที่คำขอ: #TEST-${Date.now().toString().slice(-6)}
• ผู้ขอเบิก: ท่านผู้ทดสอบระบบ
• จำนวนเงิน: ฿0.00 (การทดสอบระบบ)
• แจ้งเตือนโดย: ระบบทดสอบอัตโนมัติ
• วันที่แจ้งเตือน: ${ThaiDateUtils.formatShortThaiDate(new Date().toISOString())}

💬 ข้อความจากผู้ดูแลระบบ:
นี่เป็นการทดสอบระบบส่งอีเมลแจ้งเตือนของ StationaryHub เพื่อยืนยันว่าระบบทำงานได้ปกติและพร้อมให้บริการ

📞 ข้อมูลติดต่อและสอบถาม:
หากท่านมีข้อสงสัยหรือต้องการความช่วยเหลือ กรุณาติดต่อแผนกจัดซื้อ หรือทีมสนับสนุน IT

ขอแสดงความนับถือ
ทีมพัฒนาและดูแลระบบ StationaryHub`);
  };

  const handleEmailTypeChange = (type: string) => {
    setEmailType(type);
    
    // ตั้งค่าข้อมูลตามประเภทอีเมล
    switch (type) {
      case 'requisition_created':
        setSubject('ยืนยันการส่งคำขอเบิก - StationaryHub');
        setMessage(`เรียน ท่านผู้ใช้งาน

คำขอเบิกของคุณได้รับการส่งเรียบร้อยแล้ว

รายละเอียดคำขอ:
- เลขที่คำขอ: #REQ-${Date.now().toString().slice(-6)}
- จำนวนเงิน: ฿1,500.00
- สถานะ: รอการอนุมัติ
- วันที่ส่ง: ${new Date().toLocaleDateString()}

ระบบจะแจ้งเตือนเมื่อคำขอของคุณได้รับการอนุมัติหรือปฏิเสธ

ขอแสดงความนับถือ
ทีมพัฒนา StationaryHub`);
        break;
        
      case 'requisition_approved':
        setSubject('คำขอเบิกได้รับการอนุมัติ - StationaryHub');
        setMessage(`เรียน ท่านผู้ใช้งาน

คำขอเบิกของคุณได้รับการอนุมัติแล้ว

รายละเอียดคำขอ:
- เลขที่คำขอ: #REQ-${Date.now().toString().slice(-6)}
- อนุมัติโดย: ผู้จัดการแผนก
- สถานะ: อนุมัติแล้ว
- วันที่อนุมัติ: ${new Date().toLocaleDateString()}

คุณสามารถติดตามสถานะได้ในระบบ

ขอแสดงความนับถือ
ทีมพัฒนา StationaryHub`);
        break;
        
      case 'requisition_rejected':
        setSubject('คำขอเบิกถูกปฏิเสธ - StationaryHub');
        setMessage(`เรียน ท่านผู้ใช้งาน

คำขอเบิกของคุณถูกปฏิเสธ

รายละเอียดคำขอ:
- เลขที่คำขอ: #REQ-${Date.now().toString().slice(-6)}
- ปฏิเสธโดย: ผู้จัดการแผนก
- สถานะ: ปฏิเสธ
- วันที่ปฏิเสธ: ${new Date().toLocaleDateString()}
- เหตุผล: งบประมาณไม่เพียงพอ

หากมีคำถาม กรุณาติดต่อผู้จัดการ

ขอแสดงความนับถือ
ทีมพัฒนา StationaryHub`);
        break;
        
      case 'requisition_pending':
        setSubject('มีคำขอเบิกใหม่รอการอนุมัติ - StationaryHub');
        setMessage(`เรียน ท่านผู้จัดการ

มีคำขอเบิกใหม่ที่รอการอนุมัติจากคุณ

รายละเอียดคำขอ:
- เลขที่คำขอ: #REQ-${Date.now().toString().slice(-6)}
- จากผู้ใช้: ผู้ใช้งานทดสอบ
- สถานะ: รอการอนุมัติ
- วันที่ส่ง: ${new Date().toLocaleDateString()}

กรุณาเข้าสู่ระบบเพื่อตรวจสอบและดำเนินการ

ขอแสดงความนับถือ
ทีมพัฒนา StationaryHub`);
        break;
        
      case 'product_arrival':
        setSubject('สินค้ามาแล้ว - StationaryHub');
        setMessage(`เรียน ท่านผู้ใช้งาน

สินค้าที่คุณขอเบิกได้มาถึงแล้ว กรุณาติดต่อแผนกจัดซื้อเพื่อรับสินค้า

รายละเอียดคำขอ:
- เลขที่คำขอ: #REQ-${Date.now().toString().slice(-6)}
- ผู้ขอเบิก: ผู้ใช้งานทดสอบ
- จำนวนเงิน: ฿1,500.00
- แจ้งเตือนโดย: ผู้ดูแลระบบ
- วันที่แจ้งเตือน: ${new Date().toLocaleDateString()}

ข้อความพิเศษ: สินค้าพร้อมส่งมอบแล้ว กรุณาติดต่อแผนกจัดซื้อ

ขอแสดงความนับถือ
ทีมพัฒนา StationaryHub`);
        break;
        
      default:
        setSubject('การทดสอบระบบส่งอีเมล - StationaryHub');
        setMessage('นี่เป็นข้อความทดสอบการส่งอีเมลจากระบบ StationaryHub');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-6">
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
          className="text-center mb-10"
        >
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-full p-3 mr-4">
                <Package className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800">
                ระบบทดสอบการแจ้งเตือนสินค้ามาแล้ว
              </h1>
            </div>
            <p className="text-lg text-gray-600 font-medium mb-2">
              StationaryHub - Product Arrival Notification Testing System
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              ทดสอบและตรวจสอบการทำงานของระบบส่งอีเมลแจ้งเตือนเมื่อสินค้ามาถึงสถานที่
            </p>
          </div>
        </motion.div>

        {/* Main Test Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="shadow-xl border border-gray-200 bg-white">
            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg p-6">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                <div className="bg-white/20 rounded-lg p-2">
                  <Package className="w-6 h-6" />
                </div>
                <span>ระบบทดสอบการแจ้งเตือนสินค้ามาแล้ว</span>
              </CardTitle>
              <p className="text-green-100 text-sm mt-2">
                ทดสอบระบบส่งอีเมลแจ้งเตือนเมื่อสินค้ามาถึงสถานที่
              </p>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {/* Email Type Selection */}
              <div className="space-y-3">
                <Label htmlFor="emailType" className="text-sm font-semibold text-gray-700 flex items-center">
                  <div className="bg-indigo-100 rounded-lg p-2 mr-3">
                    <Package className="w-4 h-4 text-indigo-600" />
                  </div>
                  ประเภทอีเมลแจ้งเตือน
                </Label>
                <select
                  id="emailType"
                  value={emailType}
                  onChange={(e) => handleEmailTypeChange(e.target.value)}
                  className="w-full h-12 text-base border border-gray-300 rounded-md px-3 focus:border-green-500 focus:ring-green-500 bg-white"
                >
                  <option value="test">การทดสอบระบบ</option>
                  <option value="requisition_created">ยืนยันการส่งคำขอเบิก</option>
                  <option value="requisition_approved">คำขอเบิกได้รับการอนุมัติ</option>
                  <option value="requisition_rejected">คำขอเบิกถูกปฏิเสธ</option>
                  <option value="requisition_pending">มีคำขอเบิกใหม่รอการอนุมัติ</option>
                  <option value="product_arrival">สินค้ามาแล้ว</option>
                </select>
              </div>

              {/* Email Input */}
              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center">
                  <div className="bg-blue-100 rounded-lg p-2 mr-3">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  ที่อยู่อีเมลปลายทาง
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="กรุณากรอกที่อยู่อีเมลปลายทาง เช่น your-email@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 text-base border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              {/* Subject Input */}
              <div className="space-y-3">
                <Label htmlFor="subject" className="text-sm font-semibold text-gray-700 flex items-center">
                  <div className="bg-purple-100 rounded-lg p-2 mr-3">
                    <Mail className="w-4 h-4 text-purple-600" />
                  </div>
                  หัวข้ออีเมลแจ้งเตือน
                </Label>
                <Input
                  id="subject"
                  placeholder="กรุณากรอกหัวข้ออีเมลแจ้งเตือน"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-12 text-base border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              {/* Message Input */}
              <div className="space-y-3">
                <Label htmlFor="message" className="text-sm font-semibold text-gray-700 flex items-center">
                  <div className="bg-orange-100 rounded-lg p-2 mr-3">
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                  </div>
                  ข้อความแจ้งเตือน
                </Label>
                <Textarea
                  id="message"
                  placeholder="กรุณากรอกข้อความแจ้งเตือนที่ต้องการส่ง..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="w-full text-base border-gray-300 focus:border-green-500 focus:ring-green-500 resize-none"
                />
              </div>

              {/* Quick Test Button */}
              <div className="flex justify-center py-4">
                <Button
                  onClick={handleQuickTest}
                  variant="outline"
                  className="border-2 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 px-6 py-3 h-auto font-medium"
                >
                  <Package className="w-5 h-5 mr-2" />
                  ใช้ข้อความแจ้งเตือนสินค้าตัวอย่าง
                </Button>
              </div>

              {/* Send Button */}
              <div className="flex justify-center py-6">
                <Button
                  onClick={handleTestEmail}
                  disabled={loading || !email}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-10 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 text-lg h-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-6 h-6 mr-3 animate-spin" />
                      กำลังส่งอีเมลแจ้งเตือน...
                    </>
                  ) : (
                    <>
                      <Package className="w-6 h-6 mr-3" />
                      ส่งการแจ้งเตือนสินค้ามาแล้ว
                    </>
                  )}
                </Button>
              </div>

              {/* Error Display */}
              {error && (
                <Alert className="border-red-200 bg-red-50 rounded-xl p-4">
                  <div className="flex items-center">
                    <XCircle className="h-5 w-5 text-red-600 mr-3" />
                    <AlertDescription className="text-red-800 font-medium">
                      {error}
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              {/* Success Display */}
              {result && (
                <Alert className="border-green-200 bg-green-50 rounded-xl p-6">
                  <div className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-600 mr-4 mt-1" />
                    <AlertDescription className="text-green-800">
                      <div className="space-y-4">
                        <p className="font-bold text-lg">✅ ส่งอีเมลแจ้งเตือนสำเร็จ!</p>
                        <div className="bg-white rounded-lg p-4 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex justify-between">
                              <span className="font-semibold text-gray-600">ผู้รับ:</span>
                              <span className="text-gray-800">{result.to || email}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-semibold text-gray-600">รหัสข้อความ:</span>
                              <span className="text-gray-800 font-mono text-xs">{result.messageId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-semibold text-gray-600">การตอบสนอง:</span>
                              <span className="text-gray-800">{result.response}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-semibold text-gray-600">เวลาส่ง:</span>
                              <span className="text-gray-800">{new Date().toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AlertDescription>
                  </div>
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
          className="mt-8"
        >
          <Card className="shadow-lg border border-gray-200 bg-white">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
              <CardTitle className="flex items-center gap-3 text-xl text-gray-800 font-semibold">
                <div className="bg-blue-100 rounded-lg p-2">
                  <Info className="w-6 h-6 text-blue-600" />
                </div>
                ข้อมูลการทดสอบระบบ
              </CardTitle>
              <p className="text-gray-600 text-sm mt-2">
                ข้อมูลการตั้งค่าและฟีเจอร์ระบบที่เกี่ยวข้องกับการทดสอบ
              </p>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h4 className="font-bold text-gray-800 text-lg mb-4 flex items-center">
                      <div className="bg-gray-200 rounded-lg p-2 mr-3">
                        <span className="text-gray-600">🔧</span>
                      </div>
                      การตั้งค่าระบบ SMTP
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="font-semibold text-gray-600">เซิร์ฟเวอร์ SMTP:</span>
                        <span className="text-gray-800 font-mono text-sm">vcs.ube-ind.co.jp</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="font-semibold text-gray-600">พอร์ต:</span>
                        <span className="text-gray-800 font-mono text-sm">25 (มาตรฐาน SMTP)</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="font-semibold text-gray-600">ผู้ส่ง:</span>
                        <span className="text-gray-800 font-mono text-sm">stationaryhub@ube.co.th</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="font-semibold text-gray-600">โปรโตคอล:</span>
                        <span className="text-gray-800 font-mono text-sm">SMTP/TLS</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h4 className="font-bold text-gray-800 text-lg mb-4 flex items-center">
                      <div className="bg-gray-200 rounded-lg p-2 mr-3">
                        <span className="text-gray-600">📧</span>
                      </div>
                      ฟีเจอร์ระบบที่พร้อมให้บริการ
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start py-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                        <span className="text-gray-700 text-sm">การแจ้งเตือนเมื่อสินค้ามาถึงสถานที่</span>
                      </div>
                      <div className="flex items-start py-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                        <span className="text-gray-700 text-sm">การแจ้งเตือนการอนุมัติหรือปฏิเสธคำขอเบิกวัสดุ</span>
                      </div>
                      <div className="flex items-start py-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3"></div>
                        <span className="text-gray-700 text-sm">รูปแบบอีเมล HTML ที่เป็นทางการและสวยงาม</span>
                      </div>
                      <div className="flex items-start py-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3"></div>
                        <span className="text-gray-700 text-sm">บันทึกประวัติการส่งและติดตามสถานะ</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start">
                  <div className="bg-blue-100 rounded-lg p-2 mr-4">
                    <span className="text-blue-600">📋</span>
                  </div>
                  <div>
                    <h5 className="font-semibold text-blue-800 mb-2">คำแนะนำการใช้งาน</h5>
                    <p className="text-blue-700 text-sm leading-relaxed">
                      ระบบจะส่งอีเมลทดสอบไปยังที่อยู่อีเมลที่ท่านกรอก 
                      กรุณาตรวจสอบกล่องจดหมายและโฟลเดอร์ Spam หลังจากดำเนินการส่งการแจ้งเตือน
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
