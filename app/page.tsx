
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
import { Grid, Typography, TextField, InputAdornment, Box, Chip, Skeleton, Button } from "@mui/material"
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
      fetch("/api/products", {
        // เพิ่ม cache headers
        headers: {
          'Cache-Control': 'max-age=300' // cache 5 นาที
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
        {/* Header */}
        <Box className="mb-6">
          <Typography variant="h4" className="font-bold text-gray-800 mb-2">
            🛒 สินค้าทั้งหมด
          </Typography>
          <Typography variant="body1" className="text-gray-600">
            เลือกสินค้าที่ต้องการสั่งซื้อ
          </Typography>
        </Box>

        {/* Search and Filter */}
        <Box className="mb-6">
          <Box className="flex flex-col md:flex-row gap-4 items-center mb-4">
            <TextField
              fullWidth
              placeholder="ค้นหาสินค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search className="text-gray-400" />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
            <Button
              variant="outlined"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              startIcon={viewMode === "grid" ? <ViewList /> : <ViewModule />}
            >
              {viewMode === "grid" ? "รายการ" : "ตาราง"}
            </Button>
          </Box>

          {/* Categories */}
          <Box className="flex flex-wrap gap-2">
            <Chip
              label="ทั้งหมด"
              onClick={() => setSelectedCategory("")}
              color={selectedCategory === "" ? "primary" : "default"}
              size="small"
            />
            {categories.map((category: string | undefined) => (
              <Chip
                key={category}
                label={category}
                onClick={() => setSelectedCategory(category || "")}
                color={selectedCategory === category ? "primary" : "default"}
                size="small"
              />
            ))}
          </Box>
        </Box>

        {/* Products */}
        <Box>
          {loading ? (
            <Grid container spacing={3}>
              {[...Array(6)].map((_, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Skeleton variant="rectangular" height={200} />
                </Grid>
              ))}
            </Grid>
          ) : filteredProducts.length === 0 ? (
            <Box className="text-center py-16">
              <Typography variant="h6" className="text-gray-500 mb-2">
                ไม่พบสินค้า
              </Typography>
              <Typography variant="body2" className="text-gray-400">
                ลองเปลี่ยนคำค้นหาหรือหมวดหมู่
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {filteredProducts.map((product) => (
                <Grid item xs={12} sm={6} md={4} key={product.PRODUCT_ID}>
                  <ProductCart product={product} viewMode={viewMode} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </motion.div>
    </>
  );
}