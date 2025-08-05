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
import { Add, Edit, Delete, Inventory, Image as ImageIcon } from "@mui/icons-material"
import { useAuth } from "@/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { type Product } from "@/lib/database"
import Image from "next/image"

export default function ProductManagementPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    PRODUCT_NAME: "",
    CATEGORY_ID: 1,
    STOCK_TYPE: "CONSUMABLE",
    STOCK_QUANTITY: 0,
    UNIT_COST: 0,
    ORDER_UNIT: "PIECE",
    PHOTO_URL: "",
  })
  const [loading, setLoading] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  const categories = [
    { id: 1, name: "Office Supplies" },
    { id: 2, name: "Stationery" },
    { id: 3, name: "Electronics" },
    { id: 4, name: "Furniture" },
    { id: 5, name: "Cleaning Supplies" },
  ]

  useEffect(() => {
    if (!isAuthenticated || user?.ROLE !== "ADMIN") {
      router.push("/login")
      return
    }

    // ดึงข้อมูลสินค้าจาก API
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch(() => alert("โหลดข้อมูลสินค้าไม่สำเร็จ"))
  }, [isAuthenticated, user, router])

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        PRODUCT_NAME: product.PRODUCT_NAME,
        CATEGORY_ID: product.CATEGORY_ID,
        STOCK_TYPE: product.STOCK_TYPE,
        STOCK_QUANTITY: product.STOCK_QUANTITY,
        UNIT_COST: product.UNIT_COST,
        ORDER_UNIT: product.ORDER_UNIT, // เพิ่มบรรทัดนี้
        PHOTO_URL: product.PHOTO_URL,
      })
    } else {
      setEditingProduct(null)
      setFormData({
        PRODUCT_NAME: "",
        CATEGORY_ID: 1,
        STOCK_TYPE: "CONSUMABLE",
        STOCK_QUANTITY: 0,
        UNIT_COST: 0,
        ORDER_UNIT: "PIECE",
        PHOTO_URL: "",
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingProduct(null)
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      if (editingProduct) {
        // Update existing product
        const updatedProducts = products.map((p) =>
          p.PRODUCT_ID === editingProduct.PRODUCT_ID
            ? {
                ...p,
                ...formData,
                CATEGORY_NAME: categories.find((c) => c.id === formData.CATEGORY_ID)?.name || "",
              }
            : p,
        )
        setProducts(updatedProducts)
      } else {
        // Add new product
        const newProduct: Product = {
          PRODUCT_ID: Math.max(...products.map((p) => p.PRODUCT_ID)) + 1,
          ...formData,
          CATEGORY_NAME: categories.find((c) => c.id === formData.CATEGORY_ID)?.name || "",
          CREATED_AT: new Date().toISOString(),
        }
        setProducts([...products, newProduct])
      }

      handleCloseDialog()
      alert(`Product ${editingProduct ? "updated" : "created"} successfully!`)
    } catch (error) {
      alert("Failed to save product. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      const updatedProducts = products.filter((p) => p.PRODUCT_ID !== productId)
      setProducts(updatedProducts)
      alert("Product deleted successfully!")
    }
  }

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="glass-card-strong rounded-3xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="mb-4 md:mb-0">
              <Typography variant="h2" className="font-bold text-gray-900 mb-2">
                📦 Product Management
              </Typography>
              <Typography variant="h6" className="text-gray-600">
                Add, edit, and manage your product inventory with ease
              </Typography>
            </div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
                className="btn-modern rounded-2xl px-6 py-3 font-bold shadow-lg bg-gradient-to-r from-indigo-400 to-purple-500 hover:from-purple-500 hover:to-indigo-400 text-white"
              >
                Add New Product
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <Card className="bg-white/80 backdrop-blur-md shadow-lg border border-white/20">
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Image</TableCell>
                  <TableCell>Product Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Stock</TableCell>
                  <TableCell>Unit Cost</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product, index) => (
                  <motion.tr
                    key={product.PRODUCT_ID}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <TableCell>
                      <Image
                        src={product.PHOTO_URL || "/placeholder.svg"}
                        alt={product.PRODUCT_NAME}
                        width={50}
                        height={50}
                        className="rounded-lg object-cover"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle1" className="font-semibold">
                        {product.PRODUCT_NAME}
                      </Typography>
                      <Typography variant="body2" className="text-gray-500">
                        Unit: {product.ORDER_UNIT}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={product.CATEGORY_NAME} size="small" className="bg-blue-100 text-blue-800" />
                    </TableCell>
                    <TableCell>
                      <Typography
                        className={`font-semibold ${
                          product.STOCK_QUANTITY > 10 ? "text-green-600" : "text-orange-600"
                        }`}
                      >
                        {product.STOCK_QUANTITY}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography className="font-bold text-green-600">฿{(parseFloat(product.UNIT_COST?.toString() || '0') || 0).toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={product.STOCK_TYPE}
                        size="small"
                        color={product.STOCK_TYPE === "DURABLE" ? "primary" : "secondary"}
                      />
                    </TableCell>
                    <TableCell>
                      <Box className="flex gap-1">
                        <IconButton size="small" color="primary" onClick={() => handleOpenDialog(product)}>
                          <Edit />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(product.PRODUCT_ID)}>
                          <Delete />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {products.length === 0 && (
            <Box className="text-center py-20">
              <Inventory className="text-6xl text-gray-400 mb-4" />
              <Typography variant="h5" className="text-gray-500 mb-2">
                No products found
              </Typography>
              <Typography variant="body1" className="text-gray-400">
                Add your first product to get started
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Product Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} className="mt-2">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Product Name"
                value={formData.PRODUCT_NAME}
                onChange={(e) => setFormData({ ...formData, PRODUCT_NAME: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.CATEGORY_ID}
                  onChange={(e) => setFormData({ ...formData, CATEGORY_ID: e.target.value as number })}
                  label="Category"
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Stock Type</InputLabel>
                <Select
                  value={formData.STOCK_TYPE}
                  onChange={(e) => setFormData({ ...formData, STOCK_TYPE: e.target.value })}
                  label="Stock Type"
                >
                  <MenuItem value="CONSUMABLE">Consumable</MenuItem>
                  <MenuItem value="DURABLE">Durable</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Order Unit"
                value={formData.ORDER_UNIT}
                onChange={(e) => setFormData({ ...formData, ORDER_UNIT: e.target.value })}
                placeholder="e.g., PIECE, REAM, BOX"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Stock Quantity"
                type="number"
                value={formData.STOCK_QUANTITY}
                onChange={(e) => setFormData({ ...formData, STOCK_QUANTITY: Number.parseInt(e.target.value) || 0 })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Unit Cost"
                type="number"
                value={formData.UNIT_COST}
                onChange={(e) => setFormData({ ...formData, UNIT_COST: Number.parseFloat(e.target.value) || 0 })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Photo URL"
                value={formData.PHOTO_URL}
                onChange={(e) => setFormData({ ...formData, PHOTO_URL: e.target.value })}
                placeholder="https://example.com/image.jpg"
                InputProps={{
                  startAdornment: <ImageIcon className="mr-2 text-gray-400" />, 
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? "Saving..." : editingProduct ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  )
}
