
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
import ProductCart from "@/components/ProductCart"
import { type Product } from "@/lib/database"
import { useAuth } from "@/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { apiGet } from "@/lib/api-utils"

export default function HomePage() {
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
  
  console.log("Test User : ", user)

  useEffect(() => {
    // useEffect: check auth and fetch products
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
      apiGet("/api/products")
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
      <div className="flex justify-center items-center h-screen">
        <div className="w-80 h-20 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }
  
  // Prevent rendering if not authenticated or not USER role
  if (!isAuthenticated || user?.ROLE !== "USER") {
    // If not logged in or role is not USER, don't show page
    return null;
  }

  // Debug log: echo filteredProducts and viewMode
  console.log("filteredProducts:", filteredProducts);
  console.log("viewMode:", viewMode);

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
        
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-8 rounded-3xl text-center relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
              <div className="absolute top-1/2 right-0 w-24 h-24 bg-white rounded-full translate-x-12 -translate-y-12"></div>
              <div className="absolute bottom-0 left-1/4 w-20 h-20 bg-white rounded-full -translate-x-10 translate-y-10"></div>
            </div>
            
            <h1 className="text-4xl font-bold mb-4 relative z-10">
              🛒 Welcome to StationaryHub
            </h1>
            <p className="text-xl mb-6 opacity-90 relative z-10">
              Discover high-quality stationery at affordable prices
            </p>
            
            {/* Features */}
            <div className="flex flex-wrap justify-center gap-6 mt-8 relative z-10">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white">🚚</span>
                <span className="text-white font-medium">Fast Delivery</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white">🛡️</span>
                <span className="text-white font-medium">Quality Guaranteed</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white">⭐</span>
                <span className="text-white font-medium">Featured Products</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search and Filter Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
            {/* Search Bar */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="🔍 Search products... (product name, category)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Controls Row */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-medium">View:</span>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-4 py-2 rounded-full transition-colors ${
                    viewMode === "grid" 
                      ? "bg-blue-500 text-white" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-4 py-2 rounded-full transition-colors ${
                    viewMode === "list" 
                      ? "bg-blue-500 text-white" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  List
                </button>
              </div>

              {/* Sort Options */}
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-medium">Sort by:</span>
                <button
                  onClick={() => setSortBy("newest")}
                  className={`px-3 py-2 rounded-full text-sm transition-colors ${
                    sortBy === "newest" 
                      ? "bg-blue-500 text-white" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Newest
                </button>
                <button
                  onClick={() => setSortBy("name")}
                  className={`px-3 py-2 rounded-full text-sm transition-colors ${
                    sortBy === "name" 
                      ? "bg-blue-500 text-white" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Name
                </button>
                <button
                  onClick={() => setSortBy("price")}
                  className={`px-3 py-2 rounded-full text-sm transition-colors ${
                    sortBy === "price" 
                      ? "bg-blue-500 text-white" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Price
                </button>
              </div>
            </div>

            {/* Categories */}
            <div className="mt-6">
              <p className="text-gray-600 font-medium mb-3 flex items-center gap-2">
                📂 Product Categories:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory("")}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    selectedCategory === "" 
                      ? "bg-blue-500 text-white" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  All
                </button>
                {categories.map((category: string | undefined) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category || "")}
                    className={`px-4 py-2 rounded-full text-sm transition-colors ${
                      selectedCategory === category 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Results Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl text-gray-700 font-semibold">
              Search Results: {filteredProducts.length} items
            </h2>
            {searchTerm && (
              <p className="text-gray-500">
                Search: "{searchTerm}"
              </p>
            )}
          </div>
        </motion.div>

        {/* Products Grid/List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {loading ? (
            viewMode === 'list' ? (
              // List View Skeleton
              <div className="space-y-4">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
                    <div className="flex flex-col items-center">
                      <div className="w-48 h-48 bg-gray-200 rounded-xl mb-3 animate-pulse"></div>
                      <div className="w-4/5 h-6 bg-gray-200 rounded mb-2 animate-pulse"></div>
                      <div className="w-3/5 h-5 bg-gray-200 rounded mb-3 animate-pulse"></div>
                      <div className="w-32 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Grid View Skeleton
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
                    <div className="w-full h-48 bg-gray-200 rounded-xl mb-3 animate-pulse"></div>
                    <div className="w-4/5 h-6 bg-gray-200 rounded mb-2 animate-pulse"></div>
                    <div className="w-3/5 h-5 bg-gray-200 rounded mb-3 animate-pulse"></div>
                    <div className="w-32 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
                  </div>
                ))}
              </div>
            )
          ) : filteredProducts.length === 0 ? (
            // No Results
            <div className="bg-white/80 backdrop-blur-sm text-center py-16 rounded-2xl shadow-lg">
              <div className="text-gray-500">
                <h3 className="text-2xl mb-3">
                  😔 No products found
                </h3>
                <p className="mb-4">
                  Try changing your search terms or category
                </p>
                <button 
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("");
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
                >
                  Clear Search
                </button>
              </div>
            </div>
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
              // Grid View - แสดงเป็นตาราง
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
            )
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
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg text-center">
              <h3 className="text-xl text-gray-700 mb-4">
                Need help?
              </h3>
              <div className="flex flex-wrap justify-center gap-4">
                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-6 py-2 border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
                >
                  🔝 Back to Top
                </button>
                <button 
                  onClick={() => setSearchTerm("")}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700 transition-colors"
                >
                  🔍 New Search
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}