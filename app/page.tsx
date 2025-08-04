
// HomePage (สินค้า)
// 1. ตรวจสอบสถานะผู้ใช้ (isAuthenticated, user)
// 2. ถ้าไม่ login หรือ role ไม่ใช่ USER จะ redirect หรือไม่แสดงหน้า
// 3. ถ้าเป็น USER จะ fetch ข้อมูลสินค้าจาก API /api/products
// 4. สามารถค้นหา/กรอง/เปลี่ยนมุมมองสินค้าได้
// 5. แสดงสินค้าในรูปแบบ grid หรือ list
// 6. ถ้า loading จะแสดง skeleton
// 7. ถ้าไม่พบสินค้า จะแสดงข้อความ
// 8. มี debug log สำหรับ user และข้อมูลสินค้า

"use client"

import { useState, useEffect } from "react"
import { Grid, Typography, TextField, InputAdornment, Box, Chip, Skeleton, Fab } from "@mui/material"
import { Search, Category, ViewModule, ViewList } from "@mui/icons-material"
import ProductCart from "@/components/ProductCart"
import { type Product } from "@/lib/database"
import { useAuth } from "@/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

export default function HomePage() {
  // ...existing code...
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const { user, isAuthenticated, isAuthLoading } = useAuth()
  const router = useRouter()
  // สร้างตัวแปร categories จาก products
  const categories: (string | undefined)[] = Array.from(new Set((products ?? []).map((p: Product) => p.CATEGORY_NAME)));
console.log("Test User : ",user)
  useEffect(() => {
    // useEffect: ตรวจสอบ auth และ fetch สินค้า
    console.log("HomePage user:", user);
    if (isAuthLoading) return;
    // Redirect if not authenticated or not USER role
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (user?.ROLE === "MANAGER") {
      router.replace("/manager");
      return;
    }
    if (user?.ROLE === "ADMIN") {
      router.replace("/admin");
      return;
    }
    // Only fetch products if authenticated and USER role
    if (user?.ROLE === "USER") {
      setLoading(true);
      fetch("/api/products")
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
          console.error("โหลดข้อมูลสินค้าไม่สำเร็จ", err);
          alert("โหลดข้อมูลสินค้าไม่สำเร็จ");
          setLoading(false);
        });
    }
  }, [isAuthenticated, user, isAuthLoading, router]);
  if (isAuthLoading) {
  // ถ้า auth กำลังโหลด แสดง skeleton
    return (
      <Box className="flex justify-center items-center h-screen">
        <Skeleton variant="rectangular" width={300} height={80} />
      </Box>
    );
  }
  // Prevent rendering if not authenticated or not USER role
  if (!isAuthenticated || user?.ROLE !== "USER") {
  // ถ้าไม่ได้ login หรือ role ไม่ใช่ USER ไม่แสดงหน้า
  // ส่วนแสดง UI สินค้า, header, search, filter, grid/list
    return null;
  }

  // Debug log: echo filteredProducts and viewMode
  console.log("filteredProducts:", filteredProducts);
  console.log("viewMode:", viewMode);
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 text-center flex flex-col items-center"
        >
          <Typography variant="h2" className="font-bold text-gray-900 mb-4">
            🛒 Discover Products
          </Typography>
          <Typography variant="h6" className="text-gray-600 max-w-2xl mx-auto">
            Browse our extensive collection of office supplies and stationery items
          </Typography>
        </motion.div>

        {/* Search and Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Box className="glass-card-strong rounded-3xl p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 w-full">
                <TextField
                  fullWidth
                  placeholder="Search products, categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search className="text-gray-400" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      ใหญ่ไปครับborderRadius: "20px",
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(10px)",
                    },
                  }}
                />
              </div>

              <div className="flex gap-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Fab
                    size="small"
                    onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                    className="glass-button"
                  >
                    {viewMode === "grid" ? <ViewList /> : <ViewModule />}
                  </Fab>
                </motion.div>
              </div>
            </div>
          </Box>

          {/* Category Filters */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
            <Box className="flex flex-wrap gap-3 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Chip
                  label="All Categories"
                  onClick={() => setSelectedCategory("")}
                  color={selectedCategory === "" ? "primary" : "default"}
                  icon={<Category />}
                  className={`cursor-pointer font-semibold px-4 py-2 h-12 ${
                    selectedCategory === ""
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                      : "glass-button"
                  }`}
                />
              </motion.div>
              {categories.map((category: string | undefined) => (
                <motion.div key={category} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Chip
                    label={category}
                    onClick={() => setSelectedCategory(category || "")}
                    color={selectedCategory === category ? "primary" : "default"}
                    icon={<Category />}
                    className={`cursor-pointer font-semibold px-4 py-2 h-12 ${
                      selectedCategory === category ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg" : "glass-button"
                    }`}
                  />
                </motion.div>
              ))}
            </Box>
          </motion.div>
        </motion.div>

        {/* Product Grid/List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="grid gap-6"
        >
          {loading ? (
            <Grid container spacing={3}>
              {[...Array(6)].map((_, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Skeleton variant="rectangular" height={200} />
                </Grid>
              ))}
            </Grid>
          ) : filteredProducts.length === 0 ? (
            <Typography variant="h6" className="text-center text-gray-600">
              No products found.
            </Typography>
          ) : (
           
            <AnimatePresence mode="wait">
              {viewMode === "grid" ? (
                <Grid container spacing={3}>
                  {filteredProducts.map((product) => (
                     <Grid item xs={12} sm={6} md={4} key={product.PRODUCT_ID}>
                          <>
                        
                     <ProductCart product={product} viewMode={viewMode} />
                        </>
                    </Grid>
                 ))}
                </Grid>
              ) : (
                <Grid container spacing={3}>
                  {filteredProducts.map((product) => (
                    <Grid item xs={12} key={product.PRODUCT_ID}>
                      { <ProductCart product={product} viewMode={viewMode} /> }
                    </Grid>
                  ))}
                </Grid>
              )}
            </AnimatePresence>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}