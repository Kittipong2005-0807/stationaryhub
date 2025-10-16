'use client';

import React from 'react';
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
  IconButton,
  Box,
  Divider,
  TextField
} from '@mui/material';
import { Delete, Add, Remove, ShoppingCart } from '@mui/icons-material';
import { RefreshCw } from 'lucide-react';
import { useCart } from '@/src/contexts/CartContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { getBasePathUrl } from '@/lib/base-path';
import { apiPost } from '@/lib/api-utils';
import { useModal } from '@/components/ui/ModalManager';

export default function AdminCartPage() {
  console.log('🛒 AdminCartPage component rendering...');

  const {
    items,
    removeFromCart,
    updateQuantity,
    getTotalAmount,
    clearCart,
    isLoading,
    error,
    refreshCart
  } = useCart();

  console.log('🛒 Cart context values:', {
    items: items?.length,
    isLoading,
    error,
    hasRefreshCart: !!refreshCart
  });

  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showSuccess, showError, showWarning, showInfo } = useModal();

  console.log('🛒 Auth context values:', {
    isAuthenticated,
    userRole: user?.ROLE,
    hasUser: !!user
  });

  React.useEffect(() => {
    if (!isAuthenticated || user?.ROLE !== 'ADMIN') {
      router.push(getBasePathUrl('/login'));
    }
  }, [isAuthenticated, user, router]);

  // แสดง Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูลตะกร้า...</p>
        </div>
      </div>
    );
  }

  // แสดง Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            เกิดข้อผิดพลาด
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refreshCart}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmitRequisition = async () => {
    if (items.length === 0 || isSubmitting) return;
    console.log(' Cart user data: ', user);

    // ใช้ OrgCode3Service เพื่อสร้าง requisition พร้อม SITE_ID
    const requisitionData = {
      action: 'createRequisition',
      userId: user?.EmpCode || user?.USER_ID || user?.AdLoginName, // ใช้ EmpCode เป็นหลัก
      totalAmount: getTotalAmount(),
      issueNote: 'Admin requisition submitted from cart',
      siteId: user?.SITE_ID || user?.orgcode3 || null, // ใช้ SITE_ID หรือ orgcode3 จาก session
      REQUISITION_ITEMS: items.map((item) => ({
        PRODUCT_ID: item.PRODUCT_ID,
        QUANTITY: item.quantity,
        UNIT_PRICE: item.UNIT_COST,
        TOTAL_PRICE: item.UNIT_COST * item.quantity
      }))
    };

    // แสดง userId ที่จะใช้
    console.log('EmpCode from session:', user?.EmpCode);
    console.log('USER_ID from session:', user?.USER_ID);
    console.log('AdLoginName from session:', user?.AdLoginName);
    console.log('Final userId to be used:', requisitionData.userId);
    console.log('Cart data being sent:', requisitionData);
    console.log('User data from session:', {
      USER_ID: user?.USER_ID,
      AdLoginName: user?.AdLoginName,
      EmpCode: user?.EmpCode,
      SITE_ID: user?.SITE_ID,
      ROLE: user?.ROLE,
      EMAIL: user?.EMAIL,
      USERNAME: user?.USERNAME,
      orgcode3: user?.orgcode3
    });

    // แสดงข้อมูล session ทั้งหมด
    console.log('Full session user object:', user);

    // แสดง userId ที่จะใช้
    const finalUserId = user?.EmpCode || user?.USER_ID || user?.AdLoginName;
    console.log('Final userId to be used:', finalUserId);

    // ตรวจสอบว่าข้อมูลครบหรือไม่
    if (!user?.EmpCode) {
      console.error('EmpCode is missing from session');
      showError('ข้อมูลไม่ครบถ้วน', 'ข้อมูลผู้ใช้ไม่ครบถ้วน กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    if (getTotalAmount() <= 0) {
      console.error('Total amount is zero or negative');
      showError('ข้อมูลไม่ถูกต้อง', 'จำนวนเงินรวมต้องมากกว่า 0');
      return;
    }

    try {
      setIsSubmitting(true);
      const finalUserId = user?.EmpCode || user?.USER_ID || user?.AdLoginName;
      const idempotencyKey = `${finalUserId}-${Date.now()}-${items.length}-${getTotalAmount()}`;
      // ใช้ API orgcode3 เพื่อสร้าง requisition พร้อม orgcode3
      const result = await apiPost('/api/orgcode3', requisitionData, {
        headers: { 'Idempotency-Key': idempotencyKey }
      });

      console.log('Requisition created with ID:', result.requisitionId);

      // ไม่ต้องเรียก API /api/requisitions อีกครั้ง เพราะ OrgCode3Service สร้าง requisition items ให้แล้ว

      showSuccess('สั่งซื้อสำเร็จ!', 'Admin requisition submitted successfully!');
      clearCart();
      router.push(getBasePathUrl('/admin/orders'));
    } catch (err: any) {
      console.error('Error submitting requisition:', err);
      showError('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการส่งใบเบิก กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated || user?.ROLE !== 'ADMIN') {
    return null;
  }

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <ShoppingCart className="text-6xl text-gray-400 mb-4" />
        <Typography variant="h4" className="text-gray-600 mb-2">
          Your cart is empty
        </Typography>
        <Typography variant="body1" className="text-gray-500 mb-6">
          Add some products to get started
        </Typography>
        <Link href="/admin/products-order" style={{ textDecoration: 'none' }}>
          <Button variant="contained" className="bg-green-600 hover:bg-green-700">
            Browse Products
          </Button>
        </Link>
      </motion.div>
    );
  }

  // ฟังก์ชันสำหรับสร้าง URL รูปภาพที่ถูกต้อง
  const getImageUrl = (photoUrl: string | null | undefined) => {
    if (!photoUrl) return getBasePathUrl('/placeholder.svg');

    // ถ้าเป็น URL เต็มแล้ว ให้ใช้เลย
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }

    // เรียกผ่าน API image โดยใช้ base path แต่ API จะใช้ PATH_FILE_URL เป็น root
    // ถ้าเป็น path ที่เริ่มต้นด้วย / ให้เรียกผ่าน API image
    if (photoUrl.startsWith('/')) {
      const filename = photoUrl.substring(1); // ลบ / ออก
      return getBasePathUrl(`/api/image/${filename}`);
    }

    // ถ้าเป็น filename ที่ไม่มี path ให้เรียกผ่าน API image
    return getBasePathUrl(`/api/image/${photoUrl}`);
  };

  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    updateQuantity(itemId, newQuantity);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Typography variant="h3" className="font-bold text-gray-800 mb-2">
              🧾 Admin Requisition Cart
            </Typography>
            <Typography variant="body1" className="text-gray-600">
              Review your selected items before submitting as Admin
            </Typography>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outlined"
              onClick={refreshCart}
              disabled={isLoading}
              startIcon={
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                />
              }
            >
              รีเฟรช
            </Button>
          </div>
        </div>

        {/* แสดงสถานะการโหลดข้อมูล */}
        {isLoading && (
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
            <span className="text-sm">กำลังโหลดข้อมูลตะกร้า...</span>
          </div>
        )}

        {/* แสดงข้อผิดพลาด */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-red-600">
              <span className="text-sm">⚠️ {error}</span>
              <Button
                size="small"
                variant="outlined"
                onClick={refreshCart}
                className="ml-auto"
              >
                ลองใหม่
              </Button>
            </div>
          </div>
        )}
      </Box>

      <Card className="glass-card">
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Unit Price</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow
                    key={item.PRODUCT_ID}
                    component={motion.tr}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <TableCell>
                      <Box className="flex items-center gap-3">
                        <Image
                          src={getImageUrl(item.PHOTO_URL)}
                          alt={item.PRODUCT_NAME}
                          width={50}
                          height={50}
                          className="rounded-lg"
                        />
                        <Box>
                          <Typography
                            variant="subtitle1"
                            className="font-semibold"
                          >
                            {item.PRODUCT_NAME}
                          </Typography>
                          <Typography variant="body2" className="text-gray-500">
                            {item.CATEGORY_NAME}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography className="font-semibold text-green-600">
                        ฿{Number(item.UNIT_COST || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box className="flex items-center gap-1">
                        <IconButton
                          size="small"
                          onClick={() =>
                            updateQuantity(item.PRODUCT_ID, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                        >
                          <Remove />
                        </IconButton>
                        <TextField
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = Number.parseInt(e.target.value) || 1;
                            updateQuantity(item.PRODUCT_ID, val);
                          }}
                          size="small"
                          className="w-16"
                          inputProps={{ min: 1, className: 'text-center' }}
                        />
                        <IconButton
                          size="small"
                          onClick={() =>
                            updateQuantity(item.PRODUCT_ID, item.quantity + 1)
                          }
                        >
                          <Add />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography className="font-bold">
                        ฿
                        {Number(item.UNIT_COST * item.quantity || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="error"
                        onClick={() => removeFromCart(item.PRODUCT_ID)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider className="my-4" />

          {/* ข้อมูลสรุปตะกร้า */}
          <Box className="bg-gray-50 rounded-lg p-4 mb-4">
            <Typography
              variant="h6"
              className="font-semibold mb-3 text-gray-700"
            >
              📊 สรุปข้อมูลตะกร้า
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <Typography variant="h4" className="font-bold text-green-600">
                  {items.length}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  รายการสินค้า
                </Typography>
              </div>
              <div className="text-center">
                <Typography variant="h4" className="font-bold text-blue-600">
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  จำนวนรวม
                </Typography>
              </div>
              <div className="text-center">
                <Typography variant="h4" className="font-bold text-purple-600">
                  ฿{getTotalAmount().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  จำนวนเงินรวม
                </Typography>
              </div>
            </div>
          </Box>

          <Box className="flex gap-2 md:gap-4 justify-end">
            <Button
              variant="outlined"
              onClick={clearCart}
              color="error"
              style={{ minWidth: 120 }}
              disabled={isLoading}
            >
              Clear Cart
            </Button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleSubmitRequisition}
                className="bg-green-600 hover:bg-green-700"
                style={{ minWidth: 180 }}
                disabled={isLoading || items.length === 0 || isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Admin Requisition'}
              </Button>
            </motion.div>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
}
