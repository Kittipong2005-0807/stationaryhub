'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  Refresh,
  Visibility,
  ShoppingCart,
  CheckCircle,
  Pending,
  Cancel,
  Assignment
} from '@mui/icons-material';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { getBasePathUrl } from '@/lib/base-path';
import ThaiDateUtils from '@/lib/date-utils';

interface RequisitionItem {
  REQUISITION_ITEM_ID: number;
  PRODUCT_ID: number;
  QUANTITY: number;
  UNIT_PRICE: number;
  TOTAL_PRICE: number;
  PRODUCTS: {
    PRODUCT_NAME: string;
    PHOTO_URL: string | null;
    PRODUCT_CATEGORIES?: {
      CATEGORY_NAME: string;
    };
  };
}

interface Requisition {
  REQUISITION_ID: number;
  USER_ID: string;
  STATUS: string;
  SUBMITTED_AT: string;
  TOTAL_AMOUNT: number;
  ISSUE_NOTE?: string;
  REQUISITION_ITEMS: RequisitionItem[];
  USERS?: {
    USERNAME: string;
    FullNameThai?: string;
    FullNameEng?: string;
    DEPARTMENT?: string;
  };
}

export default function AdminOrdersPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Requisition | null>(null);

  // ดึงข้อมูลคำขอเบิก
  const fetchOrders = async () => {
    if (!isAuthenticated || !user) return;

    try {
      setLoading(true);
      setError(null);

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub';
      const response = await fetch(`${basePath}/api/my-orders`);
      const data = await response.json();

      if (response.ok) {
        setOrders(data);
        setLastUpdated(new Date());
        console.log(`✅ Fetched ${data.length} admin orders`);
      } else {
        setError(data.error || 'Failed to fetch orders');
        console.error('❌ Error fetching orders:', data.error);
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
      router.push(getBasePathUrl('/login'));
      return;
    }

    fetchOrders();

    const interval = setInterval(() => {
      if (!loading) {
        setUpdating(true);
        fetchOrders().finally(() => setUpdating(false));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, router]);

  const refreshOrders = () => {
    if (!loading) {
      fetchOrders();
    }
  };

  const handleViewDetails = (order: Requisition) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'COMPLETED':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Pending />;
      case 'APPROVED':
        return <CheckCircle />;
      case 'REJECTED':
        return <Cancel />;
      case 'COMPLETED':
        return <CheckCircle />;
      default:
        return <Assignment />;
    }
  };

  // ฟังก์ชันสำหรับสร้าง URL รูปภาพที่ถูกต้อง
  const getImageUrl = (photoUrl: string | null | undefined) => {
    if (!photoUrl) return getBasePathUrl('/placeholder.svg');

    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }

    if (photoUrl.startsWith('/')) {
      const filename = photoUrl.substring(1);
      return getBasePathUrl(`/api/image/${filename}`);
    }

    return getBasePathUrl(`/api/image/${photoUrl}`);
  };

  if (!isAuthenticated || user?.ROLE !== 'ADMIN') {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-emerald-50"
    >
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full px-6 py-6"
      >
        <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-2xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex-1">
              <Typography variant="h3" className="font-bold text-white mb-2">
                📋 Admin Orders
              </Typography>
              <Typography variant="h6" className="text-green-100">
                View your submitted requisitions and their status
              </Typography>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outlined"
                  startIcon={updating ? <CircularProgress size={16} /> : <Refresh />}
                  onClick={refreshOrders}
                  disabled={loading || updating}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  size="medium"
                >
                  {updating ? 'Updating...' : 'Refresh'}
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="contained"
                  startIcon={<ShoppingCart />}
                  onClick={() => router.push(getBasePathUrl('/admin/products-order'))}
                  className="bg-white text-green-600 hover:bg-gray-100 font-bold shadow-lg"
                  size="medium"
                >
                  Order Products
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Status Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full px-6 mb-6"
      >
        <Card className="bg-white/95 backdrop-blur-md shadow-lg border border-white/20">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Typography variant="h6" className="text-gray-700 font-semibold">
                  Total Orders: {orders.length}
                </Typography>
                {lastUpdated && (
                  <Typography variant="body2" className="text-gray-500">
                    Last updated: {lastUpdated && ThaiDateUtils.formatThaiTimeOnly(lastUpdated.toISOString())}
                  </Typography>
                )}
              </div>
              
              {updating && (
                <div className="flex items-center gap-2 text-green-600">
                  <CircularProgress size={16} />
                  <Typography variant="body2">Updating...</Typography>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full px-6 mb-6"
        >
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </motion.div>
      )}

      {/* Orders Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full px-6 mb-8"
      >
        <Card className="bg-white/95 backdrop-blur-md shadow-lg border border-white/20">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="text-center">
                  <CircularProgress size={48} className="mb-4" />
                  <Typography variant="h6" className="text-gray-600">
                    Loading orders...
                  </Typography>
                </div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingCart className="text-6xl text-gray-400 mb-4" />
                <Typography variant="h5" className="text-gray-500 mb-3">
                  No orders found
                </Typography>
                <Typography variant="body1" className="text-gray-400 mb-6">
                  You haven't submitted any requisitions yet
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<ShoppingCart />}
                  onClick={() => router.push(getBasePathUrl('/admin/products-order'))}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Start Ordering
                </Button>
              </div>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="font-bold text-gray-700">Order ID</TableCell>
                      <TableCell className="font-bold text-gray-700">Date</TableCell>
                      <TableCell className="font-bold text-gray-700">Amount</TableCell>
                      <TableCell className="font-bold text-gray-700">Status</TableCell>
                      <TableCell className="font-bold text-gray-700">Items</TableCell>
                      <TableCell className="font-bold text-gray-700">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map((order, index) => (
                      <motion.tr
                        key={order.REQUISITION_ID}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        className="hover:bg-white/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                              <Typography variant="body2" className="font-bold text-white">
                                #{order.REQUISITION_ID}
                              </Typography>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" className="font-medium">
                            {ThaiDateUtils.formatShortThaiDate(order.SUBMITTED_AT)}
                          </Typography>
                          <Typography variant="caption" className="text-gray-500">
                            {ThaiDateUtils.formatThaiTimeOnly(order.SUBMITTED_AT)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="h6" className="font-bold text-green-600">
                            ฿{Number(order.TOTAL_AMOUNT).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(order.STATUS)}
                            label={order.STATUS}
                            color={getStatusColor(order.STATUS) as any}
                            variant="filled"
                            className="font-medium"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" className="font-medium">
                            {order.REQUISITION_ITEMS?.length || 0} items
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={() => handleViewDetails(order)}
                            className="text-green-600 hover:bg-green-50"
                            size="small"
                          >
                            <Visibility />
                          </IconButton>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Order Details Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <div className="flex items-center gap-3">
            <ShoppingCart />
            <div>
              <Typography variant="h6" className="font-bold">
                Order Details #{selectedOrder?.REQUISITION_ID}
              </Typography>
              <Typography variant="body2" className="text-green-100">
                Submitted: {selectedOrder && ThaiDateUtils.formatShortThaiDate(selectedOrder.SUBMITTED_AT)}
              </Typography>
            </div>
          </div>
        </DialogTitle>
        <DialogContent className="p-6">
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <Typography variant="h4" className="font-bold text-green-600">
                        ฿{Number(selectedOrder.TOTAL_AMOUNT).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" className="text-gray-600">
                        Total Amount
                      </Typography>
                    </div>
                    <div className="text-center">
                      <Typography variant="h4" className="font-bold text-blue-600">
                        {selectedOrder.REQUISITION_ITEMS?.length || 0}
                      </Typography>
                      <Typography variant="body2" className="text-gray-600">
                        Items
                      </Typography>
                    </div>
                    <div className="text-center">
                      <Chip
                        icon={getStatusIcon(selectedOrder.STATUS)}
                        label={selectedOrder.STATUS}
                        color={getStatusColor(selectedOrder.STATUS) as any}
                        variant="filled"
                        className="font-medium"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items List */}
              <div>
                <Typography variant="h6" className="font-bold mb-4">
                  Order Items
                </Typography>
                <div className="space-y-3">
                  {selectedOrder.REQUISITION_ITEMS?.map((item, index) => (
                    <motion.div
                      key={item.REQUISITION_ITEM_ID}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="bg-white border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Image
                              src={getImageUrl(item.PRODUCTS.PHOTO_URL)}
                              alt={item.PRODUCTS.PRODUCT_NAME}
                              width={60}
                              height={60}
                              className="rounded-lg border border-gray-200"
                            />
                            <div className="flex-1">
                              <Typography variant="h6" className="font-semibold mb-1">
                                {item.PRODUCTS.PRODUCT_NAME}
                              </Typography>
                              <Typography variant="body2" className="text-gray-500 mb-2">
                                {item.PRODUCTS.PRODUCT_CATEGORIES?.CATEGORY_NAME || 'No Category'}
                              </Typography>
                              <div className="flex items-center gap-4">
                                <Typography variant="body2" className="text-gray-600">
                                  Quantity: <span className="font-semibold">{item.QUANTITY}</span>
                                </Typography>
                                <Typography variant="body2" className="text-gray-600">
                                  Unit Price: <span className="font-semibold">฿{Number(item.UNIT_PRICE).toFixed(2)}</span>
                                </Typography>
                                <Typography variant="body2" className="text-gray-600">
                                  Total: <span className="font-semibold text-green-600">฿{(() => {
                                    if (item.TOTAL_PRICE) {
                                      return Number(item.TOTAL_PRICE).toFixed(2);
                                    }
                                    const qty = Number(item.QUANTITY || 0);
                                    const price = Number(item.UNIT_PRICE || 0);
                                    return (isNaN(qty) || isNaN(price)) ? '0.00' : (qty * price).toFixed(2);
                                  })()}</span>
                                </Typography>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.ISSUE_NOTE && (
                <div>
                  <Typography variant="h6" className="font-bold mb-2">
                    Notes
                  </Typography>
                  <Card className="bg-blue-50 border border-blue-200">
                    <CardContent className="p-4">
                      <Typography variant="body2" className="text-gray-700">
                        {selectedOrder.ISSUE_NOTE}
                      </Typography>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions className="p-6">
          <Button
            onClick={() => setDetailDialogOpen(false)}
            variant="outlined"
            className="border-gray-300"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
}
