"use client"

import { useState, useEffect } from "react"
import { Grid } from "@mui/material"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import TextField from "@mui/material/TextField"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import Chip from "@mui/material/Chip"
import FormControl from "@mui/material/FormControl"
import InputLabel from "@mui/material/InputLabel"
import Select from "@mui/material/Select"
import MenuItem from "@mui/material/MenuItem"
import { Add, Edit, Delete, Inventory, Image as ImageIcon, Refresh, Search, FilterList } from "@mui/icons-material"
import { useAuth } from "@/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Image from "next/image"

// Interface สำหรับ Product ตามฐานข้อมูลจริง
interface Product {
  PRODUCT_ID: number
  ITEM_ID?: string
  PRODUCT_NAME: string
  CATEGORY_ID: number
  UNIT_COST?: number
  ORDER_UNIT?: string
  PHOTO_URL?: string
  CREATED_AT?: string
  PRODUCT_CATEGORIES?: {
    CATEGORY_ID: number
    CATEGORY_NAME: string
  }
}

// Interface สำหรับ Category
interface Category {
  CATEGORY_ID: number
  CATEGORY_NAME: string
}

export default function ProductManagementPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    ITEM_ID: "",
    PRODUCT_NAME: "",
    CATEGORY_ID: 1,
    UNIT_COST: 0,
    ORDER_UNIT: "",
    PHOTO_URL: "",
  })
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all")
  const [imageUploading, setImageUploading] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  // Fetch products and categories
  useEffect(() => {
    // Fetch products
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    // Fetch categories
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    if (isAuthenticated && user?.ROLE === "ADMIN") {
      fetchProducts();
      fetchCategories();
    }
  }, [isAuthenticated, user, router]);

  // Function to refresh data
  const fetchData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch products
      const productsResponse = await fetch("/api/products")
      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        setProducts(productsData)
      }

      // Fetch categories
      const categoriesResponse = await fetch("/api/categories")
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json()
        setCategories(categoriesData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      alert("Failed to load data")
    } finally {
      setRefreshing(false)
    }
  }

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        ITEM_ID: product.ITEM_ID || "",
        PRODUCT_NAME: product.PRODUCT_NAME,
        CATEGORY_ID: product.CATEGORY_ID,
        UNIT_COST: product.UNIT_COST || 0,
        ORDER_UNIT: product.ORDER_UNIT || "",
        PHOTO_URL: product.PHOTO_URL || "",
      })
    } else {
      setEditingProduct(null)
      setFormData({
        ITEM_ID: "",
        PRODUCT_NAME: "",
        CATEGORY_ID: 1,
        UNIT_COST: 0,
        ORDER_UNIT: "",
        PHOTO_URL: "",
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingProduct(null)
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Only JPEG, PNG, and WebP are allowed.")
      return
    }

    // ตรวจสอบขนาดไฟล์ (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      alert("File too large. Maximum size is 5MB.")
      return
    }

    try {
      setImageUploading(true)
      
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-product-image", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        setFormData(prev => ({ ...prev, PHOTO_URL: result.imageUrl }))
        alert("Image uploaded successfully!")
      } else {
        const errorData = await response.json()
        alert(`Upload failed: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      alert("Failed to upload image")
    } finally {
      setImageUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.PRODUCT_NAME.trim()) {
      alert("Please enter product name")
      return
    }

    if (!formData.ORDER_UNIT.trim()) {
      alert("Please enter unit")
      return
    }

    setLoading(true)

    try {
      const url = editingProduct 
        ? `/api/products/${editingProduct.PRODUCT_ID}` 
        : "/api/products"
      
      const method = editingProduct ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Product ${editingProduct ? "updated" : "created"} successfully!`)
        handleCloseDialog()
        fetchData() // รีเฟรชข้อมูล
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.error || "Failed to save data"}`)
      }
    } catch (error) {
      console.error("Error saving product:", error)
      alert("Error saving product")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId: number) => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        alert("Product deleted successfully!")
        fetchData() // รีเฟรชข้อมูล
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.error || "Failed to delete product"}`)
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      alert("Error deleting product")
    }
  }

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.CATEGORY_ID === categoryId)
    return category?.CATEGORY_NAME || "Unknown"
  }

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.PRODUCT_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.ITEM_ID && product.ITEM_ID.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === "all" || product.CATEGORY_ID === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (!isAuthenticated || user?.ROLE !== "ADMIN") {
    return (
      <div className="text-center py-20">
        <Typography variant="h4" className="text-gray-600">
          Access Denied
        </Typography>
        <Typography variant="body1" className="mt-4">
          This page is only accessible to administrators.
        </Typography>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
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
                  📦 Product Management
                </Typography>
                <Typography variant="h6" className="text-blue-100">
                  Manage your product inventory with ease
                </Typography>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchData}
                    disabled={refreshing}
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                    size="medium"
                  >
                    {refreshing ? "Loading..." : "Refresh"}
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenDialog()}
                    className="bg-white text-blue-600 hover:bg-gray-100 font-bold shadow-lg"
                    size="medium"
                  >
                    Add New Product
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
                      startAdornment: <Search className="text-gray-400 mr-2" />,
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
                      onChange={(e) => setSelectedCategory(e.target.value as number | "all")}
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
          <Card className="bg-white/95 backdrop-blur-md shadow-xl border border-white/20 overflow-hidden">
            <CardContent className="p-0">
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-blue-50">
                      <TableCell className="font-bold text-gray-700 py-4">Image</TableCell>
                      <TableCell className="font-bold text-gray-700 py-4">Item ID</TableCell>
                      <TableCell className="font-bold text-gray-700 py-4">Product Name</TableCell>
                      <TableCell className="font-bold text-gray-700 py-4">Category</TableCell>
                      <TableCell className="font-bold text-gray-700 py-4">Unit Price</TableCell>
                      <TableCell className="font-bold text-gray-700 py-4">Unit</TableCell>
                      <TableCell className="font-bold text-gray-700 py-4">Created Date</TableCell>
                      <TableCell className="font-bold text-gray-700 py-4">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredProducts.map((product, index) => (
                      <motion.tr
                        key={product.PRODUCT_ID}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-blue-50/50 transition-colors"
                      >
                        <TableCell className="py-3">
                          {product.PHOTO_URL ? (
                            <Image
                              src={product.PHOTO_URL}
                              alt={product.PRODUCT_NAME}
                              width={45}
                              height={45}
                              className="rounded-lg object-cover shadow-md"
                            />
                          ) : (
                            <Box className="w-11 h-11 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center shadow-md">
                              <ImageIcon className="text-gray-400" />
                            </Box>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-gray-600 py-3">
                          {product.ITEM_ID || "-"}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-800 py-3">
                          {product.PRODUCT_NAME}
                        </TableCell>
                        <TableCell className="py-3">
                          <Chip 
                            label={getCategoryName(product.CATEGORY_ID)}
                            color="primary"
                            size="small"
                            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                          />
                        </TableCell>
                        <TableCell className="font-semibold text-green-600 py-3">
                          {product.UNIT_COST ? `$${product.UNIT_COST.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell className="text-gray-600 py-3">
                          {product.ORDER_UNIT || "-"}
                        </TableCell>
                        <TableCell className="text-gray-600 py-3">
                          {product.CREATED_AT 
                            ? new Date(product.CREATED_AT).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex gap-2">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(product)}
                              className="text-blue-600 hover:bg-blue-100 transition-colors"
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(product.PRODUCT_ID)}
                              className="text-red-600 hover:bg-red-100 transition-colors"
                            >
                              <Delete />
                            </IconButton>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {filteredProducts.length === 0 && (
                <Box className="text-center py-16">
                  <Inventory className="text-gray-300 text-7xl mb-6" />
                  <Typography variant="h5" className="text-gray-500 mb-3">
                    {searchTerm || selectedCategory !== "all" ? "No products found" : "No products in system"}
                  </Typography>
                  <Typography variant="body1" className="text-gray-400">
                    {searchTerm || selectedCategory !== "all" 
                      ? "Try adjusting your search or filter criteria" 
                      : "Click 'Add New Product' to get started"
                    }
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Add/Edit Product Dialog */}
        <Dialog 
          open={dialogOpen} 
          onClose={handleCloseDialog} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            style: {
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          <DialogTitle 
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl"
            style={{ padding: '24px 32px' }}
          >
            <Typography variant="h5" className="font-bold">
              {editingProduct ? "✏️ Edit Product" : "➕ Add New Product"}
            </Typography>
            <Typography variant="body2" className="text-blue-100 mt-1">
              {editingProduct ? "Update product information" : "Create a new product in your inventory"}
            </Typography>
          </DialogTitle>
          <DialogContent 
            className="pt-8 pb-6"
            style={{ padding: '32px' }}
          >
                                                   <Grid container spacing={3}>
                {/* Basic Information */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Item ID"
                    value={formData.ITEM_ID}
                    onChange={(e) => setFormData({ ...formData, ITEM_ID: e.target.value })}
                    placeholder="P001, SKU123, etc."
                    variant="outlined"
                    size="medium"
                    helperText="Optional: Enter a unique identifier"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Product Name *"
                    value={formData.PRODUCT_NAME}
                    onChange={(e) => setFormData({ ...formData, PRODUCT_NAME: e.target.value })}
                    placeholder="Enter product name"
                    required
                    variant="outlined"
                    size="medium"
                    helperText="Required: Enter the name of the product"
                  />
                </Grid>

                {/* Category and Pricing */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="medium">
                    <InputLabel>Category *</InputLabel>
                    <Select
                      value={formData.CATEGORY_ID}
                      onChange={(e) => setFormData({ ...formData, CATEGORY_ID: e.target.value as number })}
                      label="Category *"
                    >
                      {categories.map((category) => (
                        <MenuItem key={category.CATEGORY_ID} value={category.CATEGORY_ID}>
                          {category.CATEGORY_NAME}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Unit Price"
                    type="number"
                    value={formData.UNIT_COST}
                    onChange={(e) => setFormData({ ...formData, UNIT_COST: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    variant="outlined"
                    size="medium"
                    InputProps={{
                      startAdornment: <span className="text-gray-500 mr-2">฿</span>,
                    }}
                    helperText="Enter the price per unit"
                  />
                </Grid>

                {/* Unit */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Unit *"
                    value={formData.ORDER_UNIT}
                    onChange={(e) => setFormData({ ...formData, ORDER_UNIT: e.target.value })}
                    placeholder="Piece, Box, Pack, etc."
                    required
                    variant="outlined"
                    size="medium"
                    helperText="Required: Enter the unit of measurement"
                  />
                </Grid>

                                 {/* Image Upload */}
                 <Grid item xs={12} md={6}>
                   <Box className="space-y-3">
                     {/* Image Preview */}
                     {formData.PHOTO_URL && (
                       <Box className="relative">
                         <Image
                           src={formData.PHOTO_URL}
                           alt="Product preview"
                           width={120}
                           height={120}
                           className="rounded-lg object-cover border border-gray-200"
                         />
                         <IconButton
                           size="small"
                           onClick={() => setFormData({ ...formData, PHOTO_URL: "" })}
                           className="absolute -top-2 -right-2 bg-red-500 text-white hover:bg-red-600"
                           style={{ width: '20px', height: '20px' }}
                         >
                           <span className="text-xs">×</span>
                         </IconButton>
                       </Box>
                     )}
                     
                     {/* File Upload */}
                     <Box className="space-y-2">
                       <input
                         type="file"
                         accept="image/*"
                         onChange={handleImageUpload}
                         className="hidden"
                         id="image-upload"
                       />
                       <label htmlFor="image-upload">
                         <Button
                           variant="outlined"
                           component="span"
                           startIcon={imageUploading ? <Refresh className="animate-spin" /> : <ImageIcon />}
                           className="w-full border border-gray-300 hover:border-gray-400"
                           disabled={imageUploading}
                           size="small"
                         >
                           {imageUploading ? "Uploading..." : (formData.PHOTO_URL ? "Change Image" : "Upload Image")}
                         </Button>
                       </label>
                       <Typography variant="caption" className="text-gray-500 block text-center">
                         JPEG, PNG, WebP (max 5MB)
                       </Typography>
                     </Box>
                   </Box>
                 </Grid>
              </Grid>
          </DialogContent>
          <DialogActions 
            className="p-6 bg-gray-50 rounded-b-2xl"
            style={{ padding: '24px 32px' }}
          >
            <Button 
              onClick={handleCloseDialog} 
              color="inherit" 
              variant="outlined" 
              size="large"
              style={{ borderRadius: '12px', padding: '10px 24px' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading || !formData.PRODUCT_NAME.trim() || !formData.ORDER_UNIT.trim()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold"
              size="large"
              style={{ borderRadius: '12px', padding: '10px 24px' }}
            >
              {loading ? "Saving..." : (editingProduct ? "Update Product" : "Add Product")}
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </div>
  )
}
