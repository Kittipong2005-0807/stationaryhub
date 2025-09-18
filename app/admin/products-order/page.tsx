'use client';

import { useState, useEffect } from 'react';
import { Grid } from '@mui/material';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import {
  Search,
  FilterList,
  ShoppingCart,
  ViewList,
  GridView
} from '@mui/icons-material';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import ThaiDateUtils from '@/lib/date-utils';
import { getBasePathUrl } from '@/lib/base-path';
import ProductCard from '@/components/ProductCart';
import { type Product } from '@/lib/database';
import { apiGet } from '@/lib/api-utils';

// Interface สำหรับ Product ตามฐานข้อมูลจริง
interface ProductWithCategory extends Product {
  PRODUCT_CATEGORIES?: {
    CATEGORY_ID: number;
    CATEGORY_NAME: string;
  };
  CATEGORY_NAME?: string;
}

// Interface สำหรับ Category
interface Category {
  CATEGORY_ID: number;
  CATEGORY_NAME: string;
}

export default function AdminProductsOrderPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'newest'>('newest');
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Fetch products and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch products
        const productsResponse = await apiGet('/api/products');
        console.log('Products data:', productsResponse);
        setProducts(productsResponse);
        setFilteredProducts(productsResponse);

        // Fetch categories
        const categoriesResponse = await apiGet('/api/categories');
        console.log('Categories data:', categoriesResponse);
        
        // Handle different response formats
        if (categoriesResponse && categoriesResponse.success && Array.isArray(categoriesResponse.data)) {
          setCategories(categoriesResponse.data);
        } else if (Array.isArray(categoriesResponse)) {
          setCategories(categoriesResponse);
        } else {
          console.error('Invalid categories data format:', categoriesResponse);
          setCategories([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && user?.ROLE === 'ADMIN') {
      fetchData();
    }
  }, [isAuthenticated, user]);

  // Filter and sort products
  useEffect(() => {
    let filtered = products.filter(product => {
      const matchesSearch = 
        product.PRODUCT_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.PRODUCT_ID && product.PRODUCT_ID.toString().includes(searchTerm));
      const matchesCategory = 
        selectedCategory === 'all' || product.CATEGORY_ID === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort products
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.PRODUCT_NAME.localeCompare(b.PRODUCT_NAME));
        break;
      case 'price':
        filtered.sort((a, b) => Number(a.UNIT_COST || 0) - Number(b.UNIT_COST || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.CREATED_AT || '').getTime() - new Date(a.CREATED_AT || '').getTime());
        break;
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory, sortBy]);

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

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.CATEGORY_ID === categoryId);
    return category?.CATEGORY_NAME || 'Unknown';
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
                  🛒 Admin Product Order
                </Typography>
                <Typography variant="h6" className="text-green-100">
                  Order products for your department or organization
                </Typography>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outlined"
                    startIcon={<span>⟳</span>}
                    onClick={() => window.location.reload()}
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                    size="medium"
                    style={{
                      minWidth: '120px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    Refresh
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="contained"
                    startIcon={<ShoppingCart />}
                    onClick={() => router.push(getBasePathUrl('/admin/cart'))}
                    className="bg-white text-green-600 hover:bg-gray-100 font-bold shadow-lg"
                    size="medium"
                    style={{
                      minWidth: '160px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#ffffff',
                      color: '#059669',
                      fontWeight: 'bold'
                    }}
                  >
                    View Cart
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search and Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full px-6 mb-6"
        >
          <Card className="bg-white/95 backdrop-blur-md shadow-lg border border-white/20">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                  <TextField
                    fullWidth
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <Search className="text-gray-400 mr-2" />
                    }}
                    className="bg-white/50"
                    size="medium"
                  />
                </div>
                <div className="w-full lg:w-64">
                  <FormControl fullWidth size="medium">
                    <InputLabel>Category Filter</InputLabel>
                    <Select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as number | 'all')}
                      label="Category Filter"
                      startAdornment={<FilterList className="text-gray-400 mr-2" />}
                    >
                      <MenuItem value="all">All Categories</MenuItem>
                      {categories.map((category) => (
                        <MenuItem key={category.CATEGORY_ID} value={category.CATEGORY_ID}>
                          {category.CATEGORY_NAME}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </div>

              {/* View Mode and Sort Controls */}
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mt-4">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-medium">View:</span>
                  <Button
                    variant={viewMode === 'grid' ? 'contained' : 'outlined'}
                    startIcon={<GridView />}
                    onClick={() => setViewMode('grid')}
                    size="small"
                    className={viewMode === 'grid' ? 'bg-green-500' : ''}
                  >
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'contained' : 'outlined'}
                    startIcon={<ViewList />}
                    onClick={() => setViewMode('list')}
                    size="small"
                    className={viewMode === 'list' ? 'bg-green-500' : ''}
                  >
                    List
                  </Button>
                </div>

                {/* Sort Options */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-medium">Sort by:</span>
                  <Button
                    variant={sortBy === 'newest' ? 'contained' : 'outlined'}
                    onClick={() => setSortBy('newest')}
                    size="small"
                    className={sortBy === 'newest' ? 'bg-green-500' : ''}
                  >
                    Newest
                  </Button>
                  <Button
                    variant={sortBy === 'name' ? 'contained' : 'outlined'}
                    onClick={() => setSortBy('name')}
                    size="small"
                    className={sortBy === 'name' ? 'bg-green-500' : ''}
                  >
                    Name
                  </Button>
                  <Button
                    variant={sortBy === 'price' ? 'contained' : 'outlined'}
                    onClick={() => setSortBy('price')}
                    size="small"
                    className={sortBy === 'price' ? 'bg-green-500' : ''}
                  >
                    Price
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full px-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <Typography variant="h5" className="text-gray-700 font-semibold">
              Available Products: {filteredProducts.length} items
            </Typography>
            {searchTerm && (
              <Typography variant="body1" className="text-gray-500">
                Search: "{searchTerm}"
              </Typography>
            )}
          </div>
        </motion.div>

        {/* Products Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full px-6 mb-8"
        >
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(8)].map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <div className="w-full h-48 bg-gray-200 rounded-t-lg"></div>
                  <CardContent>
                    <div className="w-3/4 h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="w-1/2 h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="w-full h-10 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <Card className="bg-white/95 backdrop-blur-md shadow-lg">
              <CardContent className="text-center py-16">
                <Typography variant="h5" className="text-gray-500 mb-3">
                  {searchTerm || selectedCategory !== 'all' ? 'No products found' : 'No products available'}
                </Typography>
                <Typography variant="body1" className="text-gray-400 mb-4">
                  {searchTerm || selectedCategory !== 'all' 
                    ? 'Try adjusting your search or filter criteria' 
                    : 'No products have been added to the system yet'}
                </Typography>
                {(searchTerm || selectedCategory !== 'all') && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                    }}
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className={viewMode === 'list' ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'}>
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.PRODUCT_ID}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <ProductCard 
                    product={{
                      ...product,
                      CATEGORY_NAME: getCategoryName(product.CATEGORY_ID),
                      STOCK_QUANTITY: 999 // Admin can order unlimited
                    }} 
                    viewMode={viewMode} 
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        {!loading && filteredProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full px-6 mb-8"
          >
            <Card className="bg-white/95 backdrop-blur-md shadow-lg">
              <CardContent className="text-center py-6">
                <Typography variant="h6" className="text-gray-700 mb-4">
                  Need help with ordering?
                </Typography>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button
                    variant="outlined"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="mt-2"
                  >
                    🔝 Back to Top
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                    }}
                    className="mt-2 bg-green-500 hover:bg-green-600"
                  >
                    🔍 New Search
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => router.push(getBasePathUrl('/admin/cart'))}
                    className="mt-2 bg-blue-500 hover:bg-blue-600"
                    startIcon={<ShoppingCart />}
                  >
                    View Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

