"use client"

import { useState, useEffect } from "react"
import { Grid, Typography, TextField, InputAdornment, Box, Chip, Skeleton, Button, Container, Paper, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Card, CardContent, FormControl, InputLabel, Select, MenuItem } from "@mui/material"
import { Search, Category, ViewModule, ViewList, TrendingUp, LocalShipping, Shield, Star, FilterList, Sort, ShoppingCart, Image as ImageIcon } from "@mui/icons-material"
import ProductCart from "@/components/ProductCart"
import { type Product } from "@/lib/database"
import { useAuth } from "@/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { getBasePathUrl } from "@/lib/base-path"
import { getApiUrl } from "@/lib/api-utils"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import ThaiDateUtils from "@/lib/date-utils"
import { getProductImageUrl } from "@/lib/image-utils"

export default function ManagerProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<"name" | "price" | "newest">("newest")
  const { user, isAuthenticated, isAuthLoading } = useAuth()
  const router = useRouter()
  
  // Create categories array from products
  const categories: (string | undefined)[] = Array.from(new Set((products || []).map((p: Product) => p.CATEGORY_NAME).filter(Boolean)));

  // ฟังก์ชันสำหรับสร้าง URL รูปภาพที่ถูกต้อง
  const getImageUrl = (photoUrl: string | null | undefined) => {
    return getProductImageUrl(photoUrl || '');
  };
  
  console.log("Manager Products - User:", user)

  useEffect(() => {
    // useEffect: check auth and fetch products
    console.log("Manager Products Page user:", user);
    if (isAuthLoading) return;
    
    // Redirect if not authenticated or not MANAGER role
    if (!isAuthenticated) {
      router.replace(getBasePathUrl("/login"));
      return;
    }
    
    if (user?.ROLE !== "MANAGER") {
      router.replace(getBasePathUrl("/login"));
      return;
    }
    
    // Fetch products for MANAGER
    if (user?.ROLE === "MANAGER") {
      setLoading(true);
      fetch(getApiUrl("/api/products"), {
        headers: {
          'Cache-Control': 'max-age=300' // cache 5 minutes
        }
      })
        .then((res) => {
          console.log("API /api/products status:", res.status);
          return res.json();
        })
        .then((data) => {
          console.log("API /api/products data:", data);
          setProducts(data);
          setFilteredProducts(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load products", err);
          alert("Failed to load products");
          setLoading(false);
        });
    }
  }, [isAuthenticated, user, isAuthLoading, router]);

  // Filter and sort products
  useEffect(() => {
    let filtered = products.filter(product => {
      const matchesSearch = product.PRODUCT_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.CATEGORY_NAME?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "" || product.CATEGORY_NAME === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort products
    switch (sortBy) {
      case "name":
        filtered.sort((a, b) => a.PRODUCT_NAME.localeCompare(b.PRODUCT_NAME));
        break;
      case "price":
        filtered.sort((a, b) => Number(a.UNIT_COST) - Number(b.UNIT_COST));
        break;
      case "newest":
        filtered.sort((a, b) => new Date(b.CREATED_AT).getTime() - new Date(a.CREATED_AT).getTime());
        break;
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory, sortBy]);

  if (isAuthLoading) {
    // If auth is loading, show skeleton
    return (
      <Box className="flex justify-center items-center h-screen">
        <Skeleton variant="rectangular" width={300} height={80} />
      </Box>
    );
  }
  
  // Prevent rendering if not authenticated or not MANAGER role
  if (!isAuthenticated || user?.ROLE !== "MANAGER") {
    return null;
  }

  // Debug log: echo filteredProducts
  console.log("filteredProducts:", filteredProducts);

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
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-2xl">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex-1">
                <Typography variant="h3" className="font-bold text-white mb-2">
                  🛒 Manager Products
                </Typography>
                <Typography variant="h6" className="text-blue-100">
                  Browse and order products for your team
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
                    onClick={() => router.push('/manager/cart')}
                    className="bg-white text-blue-600 hover:bg-gray-100 font-bold shadow-lg"
                    size="medium"
                    style={{
                      minWidth: '160px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#ffffff',
                      color: '#2563eb',
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
              {/* Search Bar */}
              <Box className="mb-6">
                <TextField
                  fullWidth
                  placeholder="🔍 Search products... (product name, category)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search className="text-gray-400" />
                      </InputAdornment>
                    ),
                  }}
                  size="medium"
                  className="bg-white/50"
                />
              </Box>

              {/* Controls Row */}
              <Box className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6">
                {/* View Mode Toggle */}
                <Box className="flex items-center gap-2">
                  <Typography variant="body2" className="text-gray-600 font-medium">View:</Typography>
                  <Button
                    variant={viewMode === "grid" ? "contained" : "outlined"}
                    onClick={() => setViewMode("grid")}
                    startIcon={<ViewModule />}
                    size="small"
                    className="rounded-full"
                  >
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "contained" : "outlined"}
                    onClick={() => setViewMode("list")}
                    startIcon={<ViewList />}
                    size="small"
                    className="rounded-full"
                  >
                    List
                  </Button>
                </Box>

                {/* Sort Options */}
                <Box className="flex items-center gap-2">
                  <Typography variant="body2" className="text-gray-600 font-medium">Sort by:</Typography>
                  <Button
                    variant={sortBy === "newest" ? "contained" : "outlined"}
                    onClick={() => setSortBy("newest")}
                    size="small"
                    className="rounded-full"
                  >
                    Newest
                  </Button>
                  <Button
                    variant={sortBy === "name" ? "contained" : "outlined"}
                    onClick={() => setSortBy("name")}
                    size="small"
                    className="rounded-full"
                  >
                    Name A-Z
                  </Button>
                  <Button
                    variant={sortBy === "price" ? "contained" : "outlined"}
                    onClick={() => setSortBy("price")}
                    size="small"
                    className="rounded-full"
                  >
                    Price
                  </Button>
                </Box>
              </Box>

              {/* Categories Dropdown */}
              <Box>
                <FormControl fullWidth size="medium">
                  <InputLabel>Category Filter</InputLabel>
                  <Select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    label="Category Filter"
                    startAdornment={
                      <Category className="text-gray-400 mr-2" />
                    }
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((category: string | undefined) => (
                      <MenuItem
                        key={category}
                        value={category || ""}
                      >
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>
        </motion.div>

        {/* Products Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full px-6 mb-8"
        >
          {loading ? (
            viewMode === 'list' ? (
              // List View Skeleton
              <div className="space-y-4">
                {[...Array(6)].map((_, index) => (
                  <Card key={index} className="bg-white/95 backdrop-blur-md shadow-lg border border-white/20">
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center">
                        <Skeleton variant="rectangular" height={200} width={200} className="rounded-xl mb-3" />
                        <Skeleton variant="text" width="80%" height={24} className="mb-2" />
                        <Skeleton variant="text" width="60%" height={20} className="mb-3" />
                        <Skeleton variant="rectangular" height={40} width={120} className="rounded-xl" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Grid View Skeleton - แสดงเป็นตาราง 4 คอลัมน์
              <Grid container spacing={3}>
                {[...Array(8)].map((_, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                    <Card className="bg-white/95 backdrop-blur-md shadow-lg border border-white/20">
                      <CardContent className="p-4">
                        <Skeleton variant="rectangular" height={200} className="rounded-xl mb-3" />
                        <Skeleton variant="text" width="80%" height={24} className="mb-2" />
                        <Skeleton variant="text" width="60%" height={20} className="mb-3" />
                        <Skeleton variant="rectangular" height={40} className="rounded-xl" />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )
          ) : (
            viewMode === 'list' ? (
              // List View - แถวละ 1 รายการ
              <div className="space-y-4">
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.PRODUCT_ID}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <ProductCart product={product} viewMode={viewMode} />
                  </motion.div>
                ))}
              </div>
            ) : (
              // Grid View - แสดงเป็นตาราง 4 คอลัมน์
              <Grid container spacing={3}>
                {filteredProducts.map((product, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={product.PRODUCT_ID}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <ProductCart product={product} viewMode={viewMode} />
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            )
          )}

          {/* Empty State */}
          {!loading && filteredProducts.length === 0 && (
            <Card className="bg-white/95 backdrop-blur-md shadow-lg border border-white/20 text-center py-16">
              <CardContent>
                <ImageIcon className="text-gray-300 text-7xl mb-6 mx-auto" />
                <Typography variant="h5" className="text-gray-500 mb-3">
                  {searchTerm || selectedCategory !== ""
                    ? 'No products found'
                    : 'No products available'}
                </Typography>
                <Typography variant="body1" className="text-gray-400 mb-4">
                  {searchTerm || selectedCategory !== ""
                    ? 'Try adjusting your search or filter criteria'
                    : 'Products will appear here when available'}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("");
                  }}
                  className="rounded-full"
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>

      </motion.div>
    </div>
  );
}
