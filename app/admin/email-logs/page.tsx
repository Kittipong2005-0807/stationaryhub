'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Search,
  Refresh,
  Email,
  Visibility,
  Download
} from '@mui/icons-material';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getBasePathUrl } from '@/lib/base-path';
import { motion } from 'framer-motion';
import ThaiDateUtils from '@/lib/date-utils';

interface EmailLog {
  EMAIL_ID: number;
  TO_USER_ID: string;
  SUBJECT: string;
  BODY: string;
  STATUS: string;
  SENT_AT: Date;
  IS_READ: boolean;
}

export default function EmailLogsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ตรวจสอบสิทธิ์ Admin
  useEffect(() => {
    if (!isAuthenticated || user?.ROLE !== 'ADMIN') {
      router.push(getBasePathUrl('/login'));
      return;
    }
  }, [isAuthenticated, user, router]);

  // ดึงข้อมูล Email Logs
  const fetchEmailLogs = async () => {
    if (!isAuthenticated || !user) return;

    try {
      setLoading(true);
      setError(null);

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub';
      const response = await fetch(`${basePath}/api/email-logs`);
      const data = await response.json();

      if (response.ok) {
        setEmailLogs(data);
        setLastUpdated(new Date());
        console.log(`✅ Fetched ${data.length} email logs`);
      } else {
        setError(data.error || 'Failed to fetch email logs');
        console.error('❌ Error fetching email logs:', data.error);
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('❌ Network error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh ทุก 30 วินาที
  useEffect(() => {
    if (!isAuthenticated || user?.ROLE !== 'ADMIN') {
      return;
    }

    fetchEmailLogs();

    const interval = setInterval(() => {
      if (!loading) {
        fetchEmailLogs();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const refreshLogs = () => {
    if (!loading) {
      fetchEmailLogs();
    }
  };

  // กรองข้อมูลตามเงื่อนไข
  const filteredLogs = emailLogs.filter(log => {
    const matchesSearch = 
      log.TO_USER_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.SUBJECT.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.BODY.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.STATUS === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // เปิด Dialog แสดงรายละเอียด
  const handleViewDetails = (log: EmailLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  // ปิด Dialog
  const handleCloseDialog = () => {
    setDetailDialogOpen(false);
    setSelectedLog(null);
  };

  // ส่งออกข้อมูลเป็น CSV
  const handleExportCSV = () => {
    const csvContent = [
      ['Email ID', 'To User ID', 'Subject', 'Status', 'Sent At', 'Is Read'],
      ...filteredLogs.map(log => [
        log.EMAIL_ID,
        log.TO_USER_ID,
        log.SUBJECT,
        log.STATUS,
        ThaiDateUtils.formatShortThaiDate(log.SENT_AT),
        log.IS_READ ? 'Yes' : 'No'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `email-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // สถิติการส่งเมล
  const getEmailStats = () => {
    const total = emailLogs.length;
    const sent = emailLogs.filter(log => log.STATUS === 'sent').length;
    const failed = emailLogs.filter(log => log.STATUS === 'failed').length;
    const read = emailLogs.filter(log => log.IS_READ).length;
    
    return { total, sent, failed, read };
  };

  const stats = getEmailStats();

  if (!isAuthenticated || user?.ROLE !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📧 Email Logs
              </h1>
              <p className="text-gray-600">
                ดูประวัติการส่งอีเมลทั้งหมดในระบบ
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExportCSV}
                disabled={filteredLogs.length === 0}
              >
                Export CSV
              </Button>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={refreshLogs}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <Card>
            <CardContent>
              <div className="flex items-center">
                <Email className="text-blue-500 text-2xl mr-3" />
                <div>
                  <Typography color="textSecondary" gutterBottom>
                    Total Emails
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stats.total}
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center">
                <Email className="text-green-500 text-2xl mr-3" />
                <div>
                  <Typography color="textSecondary" gutterBottom>
                    Sent Successfully
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stats.sent}
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center">
                <Email className="text-red-500 text-2xl mr-3" />
                <div>
                  <Typography color="textSecondary" gutterBottom>
                    Failed
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stats.failed}
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center">
                <Email className="text-purple-500 text-2xl mr-3" />
                <div>
                  <Typography color="textSecondary" gutterBottom>
                    Read
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stats.read}
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <Card>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="ค้นหา Email ID, User ID, Subject หรือ Content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Email Logs Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <CircularProgress />
                  <Typography className="ml-3">Loading email logs...</Typography>
                </div>
              ) : error ? (
                <Alert severity="error" className="mb-4">
                  {error}
                </Alert>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <Typography variant="h6" component="div">
                      Email Logs ({filteredLogs.length} records)
                    </Typography>
                    {lastUpdated && (
                      <Typography variant="body2" color="textSecondary">
                        Last updated: {ThaiDateUtils.formatShortThaiDate(lastUpdated.toISOString())}
                      </Typography>
                    )}
                  </div>

                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Email ID</TableCell>
                          <TableCell>To User ID</TableCell>
                          <TableCell>Subject</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Sent At</TableCell>
                          <TableCell>Is Read</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredLogs.map((log) => (
                          <TableRow key={log.EMAIL_ID}>
                            <TableCell>{log.EMAIL_ID}</TableCell>
                            <TableCell>{log.TO_USER_ID}</TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                {log.SUBJECT}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={log.STATUS}
                                color={log.STATUS === 'sent' ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {ThaiDateUtils.formatShortThaiDate(log.SENT_AT)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={log.IS_READ ? 'Yes' : 'No'}
                                color={log.IS_READ ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                onClick={() => handleViewDetails(log)}
                                size="small"
                              >
                                <Visibility />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {filteredLogs.length === 0 && (
                    <div className="text-center py-8">
                      <Typography variant="h6" color="textSecondary">
                        No email logs found
                      </Typography>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Detail Dialog */}
        <Dialog
          open={detailDialogOpen}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Email Log Details - ID: {selectedLog?.EMAIL_ID}
          </DialogTitle>
          <DialogContent>
            {selectedLog && (
              <div className="space-y-4">
                <div>
                  <Typography variant="subtitle2" color="textSecondary">
                    To User ID:
                  </Typography>
                  <Typography variant="body1">{selectedLog.TO_USER_ID}</Typography>
                </div>
                <div>
                  <Typography variant="subtitle2" color="textSecondary">
                    Subject:
                  </Typography>
                  <Typography variant="body1">{selectedLog.SUBJECT}</Typography>
                </div>
                <div>
                  <Typography variant="subtitle2" color="textSecondary">
                    Status:
                  </Typography>
                  <Chip
                    label={selectedLog.STATUS}
                    color={selectedLog.STATUS === 'sent' ? 'success' : 'error'}
                    size="small"
                  />
                </div>
                <div>
                  <Typography variant="subtitle2" color="textSecondary">
                    Sent At:
                  </Typography>
                  <Typography variant="body1">
                    {ThaiDateUtils.formatShortThaiDate(selectedLog.SENT_AT)}
                  </Typography>
                </div>
                <div>
                  <Typography variant="subtitle2" color="textSecondary">
                    Is Read:
                  </Typography>
                  <Chip
                    label={selectedLog.IS_READ ? 'Yes' : 'No'}
                    color={selectedLog.IS_READ ? 'success' : 'default'}
                    size="small"
                  />
                </div>
                <div>
                  <Typography variant="subtitle2" color="textSecondary">
                    Email Content:
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: 300,
                      overflow: 'auto',
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      p: 2,
                      backgroundColor: '#f5f5f5'
                    }}
                  >
                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedLog.BODY}
                    </Typography>
                  </Box>
                </div>
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Close</Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}
