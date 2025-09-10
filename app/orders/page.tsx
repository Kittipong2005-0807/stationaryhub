'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useAuth } from '@/src/contexts/AuthContext';
import { motion } from 'framer-motion';
import { getBasePathUrl } from '@/lib/base-path';
import ThaiDateUtils from '@/lib/date-utils';

interface RequisitionItem {
  ITEM_ID: number;
  PRODUCT_ID: number;
  QUANTITY: number;
  UNIT_PRICE: number;
  TOTAL_PRICE: number;
  PRODUCTS: {
    PRODUCT_NAME: string;
    PHOTO_URL: string;
    PRODUCT_CATEGORIES: {
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
}

export default function OrdersPage() {
  const { user, isAuthenticated } = useAuth();
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
        console.log(`✅ Fetched ${data.length} orders`);
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
    if (!isAuthenticated || !user) return;

    fetchOrders();

    const interval = setInterval(() => {
      if (!loading) {
        setUpdating(true);
        fetchOrders().finally(() => setUpdating(false));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const refreshOrders = () => {
    if (!loading) {
      fetchOrders();
    }
  };

  const handleViewDetails = (order: Requisition) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDetailDialogOpen(false);
    setSelectedOrder(null);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'warning';
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'รอการอนุมัติ';
      case 'APPROVED':
        return 'อนุมัติแล้ว';
      case 'REJECTED':
        return 'ถูกปฏิเสธ';
      default:
        return status || 'Unknown';
    }
  };

  // ฟังก์ชันสำหรับสร้าง URL รูปภาพที่ถูกต้อง
  const getImageUrl = (photoUrl: string | null | undefined) => {
    if (!photoUrl) return '/placeholder.jpg';

    // ถ้าเป็น URL เต็มแล้ว ให้ใช้เลย
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub';

    // ถ้าเป็น path ที่เริ่มต้นด้วย / ให้ใช้ API route
    if (photoUrl.startsWith('/')) {
      const filename = photoUrl.substring(1); // ลบ / ออก
      return `${basePath}/api/image/${filename}`;
    }

    return `${basePath}/api/image/${photoUrl}`;
  };

  if (!isAuthenticated) {
    return (
      <Box className="text-center py-20">
        <Typography variant="h6" className="text-gray-600 mb-4">
          Please log in to view your orders
        </Typography>
      </Box>
    );
  }

  // ตรวจสอบว่าเป็น USER หรือ MANAGER
  const allowedRoles = ['USER', 'MANAGER', 'ADMIN'];
  if (!user || !allowedRoles.includes(user.ROLE || '')) {
    return (
      <Box className="text-center py-20">
        <Typography variant="h6" className="text-gray-600 mb-4">
          Access Denied
        </Typography>
        <Typography variant="body1">
          This page is only accessible to users, managers, and administrators.
        </Typography>
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <Box className="flex justify-between items-center mb-6">
        <Typography variant="h4" className="font-bold text-gray-800">
          📦 My Purchase Orders
        </Typography>
        <Button
          variant="outlined"
          onClick={refreshOrders}
          disabled={loading}
          startIcon={<RefreshIcon className={loading ? 'animate-spin' : ''} />}
        >
          {loading ? 'Loading...' : updating ? 'Updating...' : 'Update'}
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" className="mb-4 glass-card">
          {error}
        </Alert>
      )}

      {loading ? (
        <Box className="flex justify-center items-center min-h-[30vh]">
          <CircularProgress />
        </Box>
      ) : !Array.isArray(orders) || orders.length === 0 ? (
        <Box className="text-center py-16">
          <Typography variant="h6" className="text-gray-500 mb-2">
            No purchase orders found
          </Typography>
          <Typography variant="body2" className="text-gray-400 mb-4">
            Start ordering products from the first page
          </Typography>
          <Button
            variant="outlined"
            onClick={() => (window.location.href = getBasePathUrl('/'))}
          >
            Go to Products
          </Button>
        </Box>
      ) : (
        <Box className="space-y-4">
          {orders.map((order) => (
            <Card key={order.REQUISITION_ID} className="glass-card">
              <CardContent className="p-4">
                <Box className="flex justify-between items-start mb-3">
                  <Box>
                    <Typography
                      variant="h6"
                      className="font-semibold text-gray-800"
                    >
                      Order #{order.REQUISITION_ID}
                    </Typography>
                    <Typography variant="body2" className="text-gray-500">
                      {ThaiDateUtils.formatMediumThaiDate(order.SUBMITTED_AT)}
                    </Typography>
                  </Box>
                  <Chip
                    label={getStatusText(order.STATUS)}
                    color={
                      getStatusColor(order.STATUS) as
                        | 'success'
                        | 'warning'
                        | 'error'
                        | 'default'
                    }
                    size="small"
                  />
                </Box>

                <Box className="flex justify-between items-center mb-3">
                  <Box>
                    <Typography variant="body2" className="text-gray-600">
                      Total Amount:{' '}
                      <span className="font-semibold">
                        ฿{(Number(order.TOTAL_AMOUNT) || 0).toFixed(2)}
                      </span>
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      Items:{' '}
                      <span className="font-semibold">
                        {Array.isArray(order.REQUISITION_ITEMS)
                          ? order.REQUISITION_ITEMS.length
                          : 0}{' '}
                        items
                      </span>
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleViewDetails(order)}
                    startIcon={<VisibilityIcon />}
                  >
                    View Details
                  </Button>
                </Box>

                {order.ISSUE_NOTE && (
                  <Typography
                    variant="body2"
                    className="text-gray-600 bg-gray-50 p-2 rounded"
                  >
                    📝 {order.ISSUE_NOTE}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Dialog รายละเอียด */}
      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle component="div">
          Order Details #{selectedOrder?.REQUISITION_ID}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box className="space-y-4">
              <Box>
                <Typography variant="h6" className="font-semibold mb-2">
                  Order Information
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  <strong>Status:</strong> {getStatusText(selectedOrder.STATUS)}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  <strong>Submitted:</strong>{' '}
                  {new Date(selectedOrder.SUBMITTED_AT).toLocaleDateString(
                    'th-TH'
                  )}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  <strong>Total Amount:</strong> ฿
                  {(Number(selectedOrder.TOTAL_AMOUNT) || 0).toFixed(2)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" className="font-semibold mb-2">
                  Order Items
                </Typography>
                <Box className="space-y-2">
                  {Array.isArray(selectedOrder.REQUISITION_ITEMS) &&
                    selectedOrder.REQUISITION_ITEMS.map((item, index) => (
                      <Card key={index} variant="outlined" className="p-3">
                        <Box className="flex items-center gap-3">
                          {item.PRODUCTS?.PHOTO_URL ? (
                            <img
                              src={getImageUrl(item.PRODUCTS.PHOTO_URL)}
                              alt={item.PRODUCTS.PRODUCT_NAME}
                              className="w-12 h-12 rounded-lg object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.jpg';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 text-xs">
                                No Image
                              </span>
                            </div>
                          )}
                          <Box className="flex-1">
                            <Typography
                              variant="body1"
                              className="font-semibold"
                            >
                              {item.PRODUCTS?.PRODUCT_NAME || 'Unknown Product'}
                            </Typography>
                            <Typography
                              variant="body2"
                              className="text-gray-600"
                            >
                              Category:{' '}
                              {item.PRODUCTS?.PRODUCT_CATEGORIES
                                ?.CATEGORY_NAME || 'N/A'}
                            </Typography>
                            <Typography
                              variant="body2"
                              className="text-gray-600"
                            >
                              Quantity: {item.QUANTITY} × ฿
                              {(Number(item.UNIT_PRICE) || 0).toFixed(2)} = ฿
                              {(Number(item.TOTAL_PRICE) || 0).toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                      </Card>
                    ))}
                </Box>
              </Box>

              {selectedOrder.ISSUE_NOTE && (
                <Box>
                  <Typography variant="h6" className="font-semibold mb-2">
                    Notes
                  </Typography>
                  <Typography
                    variant="body2"
                    className="text-gray-600 bg-gray-50 p-3 rounded"
                  >
                    {selectedOrder.ISSUE_NOTE}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
}
