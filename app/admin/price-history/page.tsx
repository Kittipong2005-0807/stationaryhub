'use client';

import { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import { Refresh, TrendingUp, TrendingDown, Remove } from '@mui/icons-material';
import { useAuth } from '@/src/contexts/AuthContext';
import { motion } from 'framer-motion';
import ThaiDateUtils from '@/lib/date-utils';

// Interface สำหรับ Price History
interface PriceHistory {
  HISTORY_ID: number;
  PRODUCT_ID: number;
  OLD_PRICE: number | null;
  NEW_PRICE: number | null;
  PRICE_CHANGE: number | null;
  PERCENTAGE_CHANGE: number | null;
  YEAR: number;
  RECORDED_DATE: string;
  NOTES: string | null;
  CREATED_BY: string | null;
  PRODUCTS?: {
    PRODUCT_NAME: string;
    PRODUCT_CATEGORIES?: {
      CATEGORY_NAME: string;
    };
  };
}

// Interface สำหรับ Product
interface Product {
  PRODUCT_ID: number;
  PRODUCT_NAME: string;
  CATEGORY_ID: number;
  PRODUCT_CATEGORIES?: {
    CATEGORY_ID: number;
    CATEGORY_NAME: string;
  };
}

export default function PriceHistoryPage() {
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<number | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { user, isAuthenticated } = useAuth();

  // Fetch price history and products
  useEffect(() => {
    if (isAuthenticated && user?.ROLE === 'ADMIN') {
      fetchPriceHistory();
      fetchProducts();
    }
  }, [isAuthenticated, user]);

  const fetchPriceHistory = async () => {
    try {
      setLoading(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub';
      const response = await fetch(`${basePath}/api/products/price-history`);
      if (response.ok) {
        const data = await response.json();
        setPriceHistory(data);
      }
    } catch (error) {
      console.error('Error fetching price history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/stationaryhub';
      const response = await fetch(`${basePath}/api/products`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPriceHistory();
    setRefreshing(false);
  };

  // Filter price history based on search and filters
  const filteredPriceHistory = priceHistory.filter((history) => {
    const matchesProduct =
      selectedProduct === 'all' || history.PRODUCT_ID === selectedProduct;
    const matchesYear = selectedYear === 'all' || history.YEAR === selectedYear;
    const matchesSearch =
      history.PRODUCTS?.PRODUCT_NAME?.toLowerCase().includes(
        searchTerm.toLowerCase()
      ) || history.NOTES?.toLowerCase().includes(searchTerm.toLowerCase());
    return (
      matchesProduct && matchesYear && (searchTerm === '' || matchesSearch)
    );
  });

  const getChangeIcon = (percentageChange: number | null) => {
    if (!percentageChange) return <Remove className="text-gray-400" />;
    if (percentageChange > 0) return <TrendingUp className="text-green-500" />;
    if (percentageChange < 0) return <TrendingDown className="text-red-500" />;
    return <Remove className="text-gray-400" />;
  };

  const getChangeColor = (percentageChange: number | null) => {
    if (!percentageChange) return 'default';
    if (percentageChange > 0) return 'success';
    if (percentageChange < 0) return 'error';
    return 'default';
  };

  const getProductName = (productId: number) => {
    const product = products.find((p) => p.PRODUCT_ID === productId);
    return product?.PRODUCT_NAME || 'Unknown Product';
  };

  const getCategoryName = (productId: number) => {
    const product = products.find((p) => p.PRODUCT_ID === productId);
    return product?.PRODUCT_CATEGORIES?.CATEGORY_NAME || 'Unknown';
  };

  if (!isAuthenticated || user?.ROLE !== 'ADMIN') {
    return (
      <div className="text-center py-20">
        <Typography variant="h4" className="text-gray-600">
          Access Denied
        </Typography>
        <Typography variant="body1" className="mt-4">
          This page is only accessible to administrators.
        </Typography>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
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
                  📈 Price History
                </Typography>
                <Typography variant="h6" className="text-green-100">
                  Track price changes and trends for all products
                </Typography>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  size="medium"
                >
                  {refreshing ? 'Loading...' : 'Refresh'}
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Filters Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full px-6 mb-6"
        >
          <Card className="bg-white/95 backdrop-blur-md shadow-lg border border-white/20">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <TextField
                  fullWidth
                  placeholder="Search products or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="medium"
                />

                <FormControl fullWidth size="medium">
                  <InputLabel>Product Filter</InputLabel>
                  <Select
                    value={selectedProduct}
                    onChange={(e) =>
                      setSelectedProduct(e.target.value as number | 'all')
                    }
                    label="Product Filter"
                  >
                    <MenuItem value="all">All Products</MenuItem>
                    {products.map((product) => (
                      <MenuItem
                        key={product.PRODUCT_ID}
                        value={product.PRODUCT_ID}
                      >
                        {product.PRODUCT_NAME}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="medium">
                  <InputLabel>Year Filter</InputLabel>
                  <Select
                    value={selectedYear}
                    onChange={(e) =>
                      setSelectedYear(e.target.value as number | 'all')
                    }
                    label="Year Filter"
                  >
                    <MenuItem value="all">All Years</MenuItem>
                    {Array.from(new Set(priceHistory.map((h) => h.YEAR)))
                      .sort((a, b) => b - a)
                      .map((year) => (
                        <MenuItem key={year} value={year}>
                          {year}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                <Box className="flex items-center justify-center">
                  <Typography variant="body2" className="text-gray-600">
                    {filteredPriceHistory.length} records found
                  </Typography>
                </Box>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Price History Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full px-6 mb-8"
        >
          <Card className="bg-white/95 backdrop-blur-md shadow-xl border border-white/20 overflow-hidden">
            <CardContent className="p-0">
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-green-50">
                      <TableCell className="font-bold text-gray-700 py-4">
                        Product
                      </TableCell>
                      <TableCell className="font-bold text-gray-700 py-4">
                        Category
                      </TableCell>
                      <TableCell className="font-bold text-gray-700 py-4">
                        Old Price
                      </TableCell>
                      <TableCell className="font-bold text-gray-700 py-4">
                        New Price
                      </TableCell>
                      <TableCell className="font-bold text-gray-700 py-4">
                        Change
                      </TableCell>
                      <TableCell className="font-bold text-gray-700 py-4">
                        % Change
                      </TableCell>
                      <TableCell className="font-bold text-gray-700 py-4">
                        Date
                      </TableCell>
                      <TableCell className="font-bold text-gray-700 py-4">
                        Notes
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPriceHistory.map((history, index) => (
                      <motion.tr
                        key={history.HISTORY_ID}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-green-50/50 transition-colors"
                      >
                        <TableCell className="font-semibold text-gray-800 py-3">
                          {getProductName(history.PRODUCT_ID)}
                        </TableCell>
                        <TableCell className="py-3">
                          <Chip
                            label={getCategoryName(history.PRODUCT_ID)}
                            color="primary"
                            size="small"
                            className="bg-gradient-to-r from-green-500 to-teal-500 text-white"
                          />
                        </TableCell>
                        <TableCell className="font-medium text-gray-600 py-3">
                          {history.OLD_PRICE
                            ? `฿${history.OLD_PRICE.toLocaleString('th-TH')}`
                            : '-'}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600 py-3">
                          {history.NEW_PRICE
                            ? `฿${history.NEW_PRICE.toLocaleString('th-TH')}`
                            : '-'}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            {getChangeIcon(history.PERCENTAGE_CHANGE)}
                            <span
                              className={`font-medium ${
                                history.PRICE_CHANGE && history.PRICE_CHANGE > 0
                                  ? 'text-green-600'
                                  : history.PRICE_CHANGE &&
                                      history.PRICE_CHANGE < 0
                                    ? 'text-red-600'
                                    : 'text-gray-600'
                              }`}
                            >
                              {history.PRICE_CHANGE
                                ? `฿${history.PRICE_CHANGE.toLocaleString('th-TH')}`
                                : '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Chip
                            label={
                              history.PERCENTAGE_CHANGE
                                ? `${history.PERCENTAGE_CHANGE >= 0 ? '+' : ''}${history.PERCENTAGE_CHANGE.toFixed(1)}%`
                                : '-'
                            }
                            color={
                              getChangeColor(history.PERCENTAGE_CHANGE) as any
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell className="text-gray-600 py-3">
                          {ThaiDateUtils.formatShortThaiDate(
                            history.RECORDED_DATE
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600 py-3 max-w-xs truncate">
                          {history.NOTES || '-'}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {filteredPriceHistory.length === 0 && (
                <Box className="text-center py-16">
                  <TrendingUp className="text-gray-300 text-7xl mb-6" />
                  <Typography variant="h5" className="text-gray-500 mb-3">
                    {loading
                      ? 'Loading price history...'
                      : 'No price history found'}
                  </Typography>
                  <Typography variant="body1" className="text-gray-400">
                    {loading
                      ? 'Please wait while we load the data...'
                      : 'Try adjusting your search or filter criteria'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
