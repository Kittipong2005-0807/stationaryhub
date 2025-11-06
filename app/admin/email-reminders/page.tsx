'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { apiPost } from '@/lib/api-utils';
import ThaiDateUtils from '@/lib/date-utils';
import {
  Bell,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  Mail,
  Users,
  Calendar,
  Settings,
  Save,
  Filter,
  Download,
  Timer,
  Activity,
  BarChart3,
  FileText
} from 'lucide-react';

interface ReminderStats {
  pendingCount: number;
  remindersSent: number;
  lastRun: string;
  nextRun: string;
}

interface ReminderResult {
  requisitionId: number;
  requesterName: string;
  daysPending: number;
  status: 'sent' | 'failed' | 'error';
  error?: string;
}

interface EmailSettings {
  enabled: boolean;
  schedule: {
    hour: number;
    minute: number;
    timezone: string;
    frequency: 'daily' | 'weekdays' | 'custom';
    customDays: number[];
  };
  template: {
    subject: string;
    headerColor: string;
    urgencyLevel: 'low' | 'medium' | 'high';
    includeProductDetails: boolean;
    includeRequesterInfo: boolean;
    customMessage: string;
  };
  notifications: {
    maxRetries: number;
    retryInterval: number;
    escalationEnabled: boolean;
    escalationAfterDays: number;
  };
  filters: {
    minDaysPending: number;
    maxDaysPending: number;
    excludeWeekends: boolean;
    excludeHolidays: boolean;
  };
}

interface EmailLog {
  id: number;
  timestamp: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  requisitionId?: number;
  error?: string;
  retryCount: number;
}

export default function EmailRemindersPage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [lastResults, setLastResults] = useState<ReminderResult[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    enabled: true,
    schedule: {
      hour: 10,
      minute: 0,
      timezone: 'Asia/Bangkok',
      frequency: 'daily',
      customDays: []
    },
    template: {
      subject: '🔔 แจ้งเตือนซ้ำ - มีคำขอเบิกรอการอนุมัติ',
      headerColor: '#dc2626',
      urgencyLevel: 'high',
      includeProductDetails: true,
      includeRequesterInfo: true,
      customMessage: 'กรุณาตรวจสอบและดำเนินการคำขอเบิกที่รอการอนุมัติ'
    },
    notifications: {
      maxRetries: 3,
      retryInterval: 30,
      escalationEnabled: true,
      escalationAfterDays: 3
    },
    filters: {
      minDaysPending: 1,
      maxDaysPending: 30,
      excludeWeekends: false,
      excludeHolidays: true
    }
  });
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [settingsChanged, setSettingsChanged] = useState(false);

  const loadStats = async () => {
    try {
      // ดึงข้อมูลสถิติ (จำลอง)
      const mockStats: ReminderStats = {
        pendingCount: 5,
        remindersSent: 3,
        lastRun: ThaiDateUtils.formatShortThaiDate(new Date().toISOString()),
        nextRun: ThaiDateUtils.formatShortThaiDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      };
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadEmailLogs = async () => {
    try {
      setLogsLoading(true);
      // ดึงข้อมูล logs (จำลอง)
      const mockLogs: EmailLog[] = [
        {
          id: 1,
          timestamp: new Date().toISOString(),
          recipient: 'manager@company.com',
          subject: '🔔 แจ้งเตือนซ้ำ - มีคำขอเบิกรอการอนุมัติ #12345',
          status: 'sent',
          requisitionId: 12345,
          retryCount: 0
        },
        {
          id: 2,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          recipient: 'admin@company.com',
          subject: '🔔 แจ้งเตือนซ้ำ - มีคำขอเบิกรอการอนุมัติ #12346',
          status: 'failed',
          requisitionId: 12346,
          error: 'SMTP connection timeout',
          retryCount: 2
        }
      ];
      setEmailLogs(mockLogs);
    } catch (error) {
      console.error('Error loading email logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSettingsChange = (section: keyof EmailSettings, field: string, value: any) => {
    setEmailSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as object),
        [field]: value
      }
    }));
    setSettingsChanged(true);
  };

  const handleNestedSettingsChange = (section: keyof EmailSettings, subsection: string, field: string, value: any) => {
    console.log('🔄 handleNestedSettingsChange called:', { section, subsection, field, value });
    
    setEmailSettings(prev => {
      const newSettings = { ...prev };
      
      if (subsection === '') {
        // ถ้าไม่มี subsection ให้อัปเดต field โดยตรงใน section
        (newSettings[section] as any) = {
          ...(prev[section] as object),
          [field]: value
        };
        console.log('✅ Updated direct field:', { section, field, value });
      } else {
        // ถ้ามี subsection ให้อัปเดต field ใน subsection
        (newSettings[section] as any) = {
          ...(prev[section] as object),
          [subsection]: {
            ...((prev[section] as any)[subsection] as object),
            [field]: value
          }
        };
        console.log('✅ Updated nested field:', { section, subsection, field, value });
      }
      
      return newSettings;
    });
    setSettingsChanged(true);
    console.log('✅ Settings changed flag set to true');
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      // บันทึกการตั้งค่าจริง
      const response = await fetch('/stationaryhub/api/email-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: emailSettings
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuccess('บันทึกการตั้งค่าสำเร็จ');
          setSettingsChanged(false);
        } else {
          setError(data.message || 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
        }
      } else {
        setError('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
    } finally {
      setLoading(false);
    }
  };


  const handleSendReminders = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const result = await apiPost('/api/notifications/reminder', {
        timestamp: new Date().toISOString(),
        source: 'manual-trigger'
      });

      setSuccess(result.message);
      setLastResults(result.results || []);
      
      // รีเฟรชสถิติ
      await loadStats();

    } catch (error) {
      setError('เกิดข้อผิดพลาดในการส่งอีเมลแจ้งเตือนซ้ำ');
      console.error('Error sending reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestReminder = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // ส่งอีเมลทดสอบ
      await apiPost('/api/test-email', {
        to: 'manager@company.com',
        subject: '🔔 ทดสอบระบบแจ้งเตือนซ้ำ - StationaryHub',
        message: 'นี่เป็นการทดสอบระบบแจ้งเตือนซ้ำ\n\nระบบจะส่งอีเมลแจ้งเตือนซ้ำทุก 10 โมงเช้าให้ Manager เมื่อมีคำขอที่รอการอนุมัติ\n\nขอแสดงความนับถือ\nทีมพัฒนา StationaryHub',
        emailType: 'requisition_pending'
      });

      setSuccess('ส่งอีเมลทดสอบแจ้งเตือนซ้ำสำเร็จ');

    } catch {
      setError('เกิดข้อผิดพลาดในการส่งอีเมลทดสอบ');
      console.error('Error testing reminder');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmailSettings();
    loadStats();
    loadEmailLogs();
  }, []);

  const loadEmailSettings = async () => {
    try {
      const response = await fetch('/stationaryhub/api/email-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEmailSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      loadEmailLogs();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-8"
        >
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-full p-3 mr-4">
                <Bell className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800">
                ระบบแจ้งเตือนอีเมลซ้ำ
              </h1>
            </div>
            <p className="text-lg text-gray-600 font-medium mb-2">
              StationaryHub - Advanced Email Reminder System
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              จัดการระบบส่งอีเมลแจ้งเตือนซ้ำแบบละเอียดและครบถ้วน
            </p>
          </div>
        </motion.div>

        {/* Tabs Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white shadow-lg">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Timer className="w-4 h-4" />
                ตารางเวลา
              </TabsTrigger>
              <TabsTrigger value="template" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Template
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Logs
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="mt-6">
              {/* Stats Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
              >
                <Card className="shadow-lg border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-blue-100 rounded-lg p-3 mr-4">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">คำขอที่รอการอนุมัติ</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.pendingCount || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-green-100 rounded-lg p-3 mr-4">
                        <Mail className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">อีเมลที่ส่งแล้ว</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.remindersSent || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-orange-100 rounded-lg p-3 mr-4">
                        <Clock className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">รันครั้งล่าสุด</p>
                        <p className="text-sm font-bold text-gray-900">{stats?.lastRun || 'ยังไม่เคยรัน'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-purple-100 rounded-lg p-3 mr-4">
                        <Calendar className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">รันครั้งถัดไป</p>
                        <p className="text-sm font-bold text-gray-900">{stats?.nextRun || 'ไม่ทราบ'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Control Panel */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="shadow-xl border border-gray-200 bg-white mb-8">
                  <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg p-6">
                    <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                      <div className="bg-white/20 rounded-lg p-2">
                        <Settings className="w-6 h-6" />
                      </div>
                      <span>แผงควบคุมระบบแจ้งเตือน</span>
                    </CardTitle>
                    <p className="text-red-100 text-sm mt-2">
                      จัดการระบบส่งอีเมลแจ้งเตือนซ้ำสำหรับคำขอที่รอการอนุมัติ
                    </p>
                    <div className="mt-3 p-3 bg-white/10 rounded-lg">
                      <p className="text-red-100 text-sm">
                        <strong>📧 ผู้รับอีเมล:</strong> ระบบจะส่งอีเมลแจ้งเตือนซ้ำไปยัง Manager ในแผนกเดียวกันกับผู้สร้างคำขอเบิกโดยอัตโนมัติ
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-4 justify-center">
                      <Button
                        onClick={handleSendReminders}
                        disabled={loading}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-3 h-auto font-medium"
                      >
                        {loading ? (
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                          <Bell className="w-5 h-5 mr-2" />
                        )}
                        ส่งอีเมลแจ้งเตือนซ้ำตอนนี้
                      </Button>

                      <Button
                        onClick={handleTestReminder}
                        disabled={loading}
                        variant="outline"
                        className="border-2 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 px-8 py-3 h-auto font-medium"
                      >
                        <Mail className="w-5 h-5 mr-2" />
                        ทดสอบส่งอีเมลแจ้งเตือน
                      </Button>
                    </div>

                    {/* Alerts */}
                    {error && (
                      <Alert className="border-red-200 bg-red-50">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          {error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          {success}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Last Results */}
              {lastResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Card className="shadow-xl border border-gray-200 bg-white">
                    <CardHeader className="bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-t-lg p-6">
                      <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                        <div className="bg-white/20 rounded-lg p-2">
                          <RefreshCw className="w-6 h-6" />
                        </div>
                        <span>ผลลัพธ์การส่งอีเมลล่าสุด</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">เลขที่คำขอ</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">ผู้ขอเบิก</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">จำนวนวันที่รอ</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">สถานะ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lastResults.map((result, index) => (
                              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 text-gray-900 font-medium">#{result.requisitionId}</td>
                                <td className="py-3 px-4 text-gray-700">{result.requesterName}</td>
                                <td className="py-3 px-4 text-gray-700">{result.daysPending} วัน</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    result.status === 'sent' 
                                      ? 'bg-green-100 text-green-800' 
                                      : result.status === 'failed'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {result.status === 'sent' ? 'ส่งสำเร็จ' : 
                                     result.status === 'failed' ? 'ส่งไม่สำเร็จ' : 'เกิดข้อผิดพลาด'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="mt-6">
              <Card className="shadow-xl border border-gray-200 bg-white">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg p-6">
                  <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                    <div className="bg-white/20 rounded-lg p-2">
                      <Timer className="w-6 h-6" />
                    </div>
                    <span>การตั้งค่าตารางเวลา</span>
                  </CardTitle>
                  <p className="text-blue-100 text-sm mt-2">
                    กำหนดเวลาและความถี่การส่งอีเมลแจ้งเตือนซ้ำ
                  </p>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Label htmlFor="enabled" className="flex items-center gap-2">
                        <Switch
                          id="enabled"
                          checked={emailSettings.enabled}
                          onCheckedChange={(checked) => handleSettingsChange('enabled', '', checked)}
                        />
                        <span className="font-medium">เปิดใช้งานระบบแจ้งเตือน</span>
                      </Label>
                      
                      <div className="space-y-2">
                        <Label htmlFor="hour">เวลาส่งอีเมล</Label>
                        <div className="flex gap-2">
                          <Input
                            id="hour"
                            type="number"
                            min="0"
                            max="23"
                            value={emailSettings.schedule.hour}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (!isNaN(value)) {
                                handleNestedSettingsChange('schedule', '', 'hour', value);
                              }
                            }}
                            className="w-20"
                          />
                          <span className="flex items-center">:</span>
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            value={emailSettings.schedule.minute}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (!isNaN(value)) {
                                handleNestedSettingsChange('schedule', '', 'minute', value);
                              }
                            }}
                            className="w-20"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="timezone">เขตเวลา</Label>
                        <Select
                          value={emailSettings.schedule.timezone}
                          onValueChange={(value) => handleNestedSettingsChange('schedule', '', 'timezone', value)}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="Asia/Bangkok">Asia/Bangkok (GMT+7)</SelectItem>
                            <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                            <SelectItem value="Asia/Tokyo">Asia/Tokyo (GMT+9)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="frequency">ความถี่การส่ง</Label>
                        <Select
                          value={emailSettings.schedule.frequency}
                          onValueChange={(value) => handleNestedSettingsChange('schedule', '', 'frequency', value)}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="daily">ทุกวัน</SelectItem>
                            <SelectItem value="weekdays">วันทำงานเท่านั้น</SelectItem>
                            <SelectItem value="custom">กำหนดเอง</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="minDays">จำนวนวันขั้นต่ำที่รอ</Label>
                        <Input
                          id="minDays"
                          type="number"
                          min="1"
                          value={emailSettings.filters.minDaysPending}
                          onChange={(e) => handleNestedSettingsChange('filters', '', 'minDaysPending', parseInt(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maxDays">จำนวนวันสูงสุดที่รอ</Label>
                        <Input
                          id="maxDays"
                          type="number"
                          min="1"
                          value={emailSettings.filters.maxDaysPending}
                          onChange={(e) => handleNestedSettingsChange('filters', '', 'maxDaysPending', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={saveSettings}
                      disabled={!settingsChanged}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      บันทึกการตั้งค่า
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>


            {/* Template Tab */}
            <TabsContent value="template" className="mt-6">
              <Card className="shadow-xl border border-gray-200 bg-white">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg p-6">
                  <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                    <div className="bg-white/20 rounded-lg p-2">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span>การตั้งค่า Template อีเมล</span>
                  </CardTitle>
                  <p className="text-purple-100 text-sm mt-2">
                    ปรับแต่งรูปแบบและเนื้อหาของอีเมลแจ้งเตือน
                  </p>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="subject">หัวข้ออีเมล</Label>
                        <Input
                          id="subject"
                          value={emailSettings.template.subject}
                          onChange={(e) => handleNestedSettingsChange('template', '', 'subject', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="headerColor">สีหัวข้อ</Label>
                        <div className="flex gap-2">
                          <Input
                            id="headerColor"
                            type="color"
                            value={emailSettings.template.headerColor}
                            onChange={(e) => handleNestedSettingsChange('template', '', 'headerColor', e.target.value)}
                            className="w-16 h-10"
                          />
                          <Input
                            value={emailSettings.template.headerColor}
                            onChange={(e) => handleNestedSettingsChange('template', '', 'headerColor', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="urgency">ระดับความเร่งด่วน</Label>
                        <Select
                          value={emailSettings.template.urgencyLevel}
                          onValueChange={(value) => handleNestedSettingsChange('template', '', 'urgencyLevel', value)}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="low">ต่ำ</SelectItem>
                            <SelectItem value="medium">ปานกลาง</SelectItem>
                            <SelectItem value="high">สูง</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-4">
                        <Label className="flex items-center gap-2">
                          <Switch
                            checked={emailSettings.template.includeProductDetails}
                            onCheckedChange={(checked) => handleNestedSettingsChange('template', '', 'includeProductDetails', checked)}
                          />
                          <span>รวมรายละเอียดสินค้า</span>
                        </Label>

                        <Label className="flex items-center gap-2">
                          <Switch
                            checked={emailSettings.template.includeRequesterInfo}
                            onCheckedChange={(checked) => handleNestedSettingsChange('template', '', 'includeRequesterInfo', checked)}
                          />
                          <span>รวมข้อมูลผู้ขอเบิก</span>
                        </Label>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customMessage">ข้อความเพิ่มเติม</Label>
                        <Textarea
                          id="customMessage"
                          value={emailSettings.template.customMessage}
                          onChange={(e) => handleNestedSettingsChange('template', '', 'customMessage', e.target.value)}
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={saveSettings}
                      disabled={!settingsChanged}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      บันทึกการตั้งค่า
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs" className="mt-6">
              <Card className="shadow-xl border border-gray-200 bg-white">
                <CardHeader className="bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-t-lg p-6">
                  <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                    <div className="bg-white/20 rounded-lg p-2">
                      <Activity className="w-6 h-6" />
                    </div>
                    <span>Logs การส่งอีเมล</span>
                  </CardTitle>
                  <p className="text-gray-100 text-sm mt-2">
                    ตรวจสอบประวัติการส่งอีเมลแจ้งเตือนซ้ำ
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Filter className="w-4 h-4 mr-2" />
                          กรอง
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          ส่งออก
                        </Button>
                      </div>
                      <Button size="sm" onClick={loadEmailLogs} disabled={logsLoading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
                        รีเฟรช
                      </Button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">เวลา</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">ผู้รับ</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">หัวข้อ</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">สถานะ</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">การลองใหม่</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emailLogs.map((log) => (
                            <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-700">
                                {ThaiDateUtils.formatShortThaiDate(log.timestamp)}
                              </td>
                              <td className="py-3 px-4 text-gray-700">{log.recipient}</td>
                              <td className="py-3 px-4 text-gray-700">{log.subject}</td>
                              <td className="py-3 px-4">
                                <Badge 
                                  variant={log.status === 'sent' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}
                                >
                                  {log.status === 'sent' ? 'ส่งสำเร็จ' : 
                                   log.status === 'failed' ? 'ส่งไม่สำเร็จ' : 'รอส่ง'}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-gray-700">{log.retryCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </div>
  );
}
