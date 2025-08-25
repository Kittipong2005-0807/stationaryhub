"use client"

import { useState, useEffect } from "react"
import { Grid, Typography, TextField, InputAdornment, Box, Chip, Skeleton, Button, Container, Paper, Divider } from "@mui/material"
import { Search, Category, ViewModule, ViewList, TrendingUp, LocalShipping, Shield, Star, FilterList, Sort, ShoppingCart } from "@mui/icons-material"
import ProductCart from "@/components/ProductCart"
import { type Product } from "@/lib/database"
import { useAuth } from "@/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

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
  
  console.log("Manager Products - User:", user)

  useEffect(() => {
    // useEffect: check auth and fetch products
    console.log("Manager Products Page user:", user);
    if (isAuthLoading) return;
    
    // Redirect if not authenticated or not MANAGER role
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    
    if (user?.ROLE !== "MANAGER") {
      router.replace("/login");
      return;
    }
    
    // Fetch products for MANAGER
    if (user?.ROLE === "MANAGER") {
      setLoading(true);
      fetch("/api/products", {
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

  // Debug log: echo filteredProducts and viewMode
  console.log("filteredProducts:", filteredProducts);
  console.log("viewMode:", viewMode);

  return (
    <Container maxWidth="xl" className="py-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <Paper 
            elevation={0}
            className="gradient-primary text-white p-8 rounded-3xl text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              position: 'relative'
            }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
              <div className="absolute top-1/2 right-0 w-24 h-24 bg-white rounded-full translate-x-12 -translate-y-12"></div>
              <div className="absolute bottom-0 left-1/4 w-20 h-20 bg-white rounded-full -translate-x-10 translate-y-10"></div>
            </div>
            
            <Typography variant="h3" className="font-bold mb-4 relative z-10">
              🛒 Manager Products
            </Typography>
            <Typography variant="h6" className="mb-6 opacity-90 relative z-10">
              Browse and order products for your team
            </Typography>
            
            {/* Manager Features */}
            <Box className="flex flex-wrap justify-center gap-6 mt-8 relative z-10">
              <Box className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <ShoppingCart className="text-white" />
                <Typography variant="body2" className="text-white font-medium">Order Products</Typography>
              </Box>
              <Box className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Shield className="text-white" />
                <Typography variant="body2" className="text-white font-medium">Team Management</Typography>
              </Box>
              <Box className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Star className="text-white" />
                <Typography variant="body2" className="text-white font-medium">Quality Products</Typography>
              </Box>
            </Box>
          </Paper>
        </motion.div>

        {/* Search and Filter Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <Paper elevation={0} className="glass-card-strong p-6 rounded-2xl">
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
                className="search-field"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 1)',
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'rgba(255, 255, 255, 1)',
                    }
                  }
                }}
              />
            </Box>

            {/* Controls Row */}
            <Box className="flex flex-col lg:flex-row gap-4 items-center justify-between">
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

            {/* Categories */}
            <Box className="mt-6">
              <Typography variant="body2" className="text-gray-600 font-medium mb-3 flex items-center gap-2">
                <Category className="text-gray-500" />
                Product Categories:
              </Typography>
              <Box className="flex flex-wrap gap-2">
                <Chip
                  label="All"
                  onClick={() => setSelectedCategory("")}
                  color={selectedCategory === "" ? "primary" : "default"}
                  size="medium"
                  className="hover:scale-105 transition-transform cursor-pointer"
                  variant={selectedCategory === "" ? "filled" : "outlined"}
                />
                {categories.map((category: string | undefined) => (
                  <Chip
                    key={category}
                    label={category}
                    onClick={() => setSelectedCategory(category || "")}
                    color={selectedCategory === category ? "primary" : "default"}
                    size="medium"
                    className="hover:scale-105 transition-transform cursor-pointer"
                    variant={selectedCategory === category ? "filled" : "outlined"}
                  />
                ))}
              </Box>
            </Box>
          </Paper>
        </motion.div>

        {/* Results Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-6"
        >
          <Box className="flex items-center justify-between">
            <Typography variant="h6" className="text-gray-700 font-semibold">
              Search Results: {filteredProducts.length} items
            </Typography>
            {searchTerm && (
              <Typography variant="body2" className="text-gray-500">
                Search: "{searchTerm}"
              </Typography>
            )}
          </Box>
        </motion.div>

        {/* Products Grid/List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {loading ? (
            // Loading Skeleton
            <Grid container spacing={3}>
              {[...Array(6)].map((_, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Paper elevation={0} className="glass-card p-4 rounded-2xl">
                    <Skeleton variant="rectangular" height={200} className="rounded-xl mb-3" />
                    <Skeleton variant="text" width="80%" height={24} className="mb-2" />
                    <Skeleton variant="text" width="60%" height={20} className="mb-3" />
                    <Skeleton variant="rectangular" height={40} className="rounded-xl" />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : filteredProducts.length === 0 ? (
            // No Results
            <Paper elevation={0} className="glass-card text-center py-16 rounded-2xl">
              <Box className="text-gray-500">
                <Typography variant="h5" className="mb-3">
                  😔 No products found
                </Typography>
                <Typography variant="body1" className="mb-4">
                  Try changing your search terms or category
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("");
                  }}
                  className="rounded-full"
                >
                  Clear Search
                </Button>
              </Box>
            </Paper>
          ) : (
            // Products Display
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
          )}
        </motion.div>

        {/* Quick Actions */}
        {!loading && filteredProducts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-12"
          >
            <Paper elevation={0} className="glass-card p-6 rounded-2xl text-center">
              <Typography variant="h6" className="text-gray-700 mb-4">
                Need help?
              </Typography>
              <Box className="flex flex-wrap justify-center gap-4">
                <Button 
                  variant="outlined" 
                  startIcon={<TrendingUp />}
                  className="rounded-full"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Back to Top
                </Button>
                <Button 
                  variant="contained" 
                  startIcon={<Search />}
                  className="rounded-full gradient-primary"
                  onClick={() => setSearchTerm("")}
                >
                  New Search
                </Button>
                <Button 
                  variant="contained" 
                  startIcon={<ShoppingCart />}
                  className="rounded-full gradient-success"
                  onClick={() => router.push("/manager/cart")}
                >
                  View Cart
                </Button>
              </Box>
            </Paper>
          </motion.div>
        )}
      </motion.div>
    </Container>
  );
}
