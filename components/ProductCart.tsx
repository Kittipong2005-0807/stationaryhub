"use client"

import { useState } from "react"
import { Card, CardContent, Typography, Button, TextField, Box, Chip, IconButton } from "@mui/material"
import { Add, Remove, ShoppingCart, FavoriteBorder, Favorite, Inventory } from "@mui/icons-material"
import type { Product } from "@/lib/database"
import { useCart, canUseCart } from "@/src/contexts/CartContext"
import { useAuth } from "@/src/contexts/AuthContext"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import StatusBadge from "./ui/StatusBadge"
import { useToast } from "./ui/ToastContainer"


interface ProductCardProps {
  product: Product
  viewMode?: 'grid' | 'list'
}

export default function ProductCard({ product, viewMode = 'grid' }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const { addToCart } = useCart()
  const { showSuccess, showError, showWarning } = useToast()
  const { user } = useAuth()
  
  // Check if user can use cart (USER or MANAGER)
  const canUseCartForUser = canUseCart(user?.ROLE || undefined)

  const handleAddToCart = async () => {
    if (quantity > product.STOCK_QUANTITY) {
      showError("Insufficient Stock", `Only ${product.STOCK_QUANTITY} items available`)
      return
    }
    setIsAdding(true)
    try {
      addToCart(product, quantity)
      showSuccess("Added to Cart", `${quantity} ${product.PRODUCT_NAME} added successfully`)
      setTimeout(() => {
        setIsAdding(false)
        setQuantity(1)
      }, 1000)
    } catch (error) {
      showError("Failed to Add", "Please try again")
      setIsAdding(false)
    }
  }

  const incrementQuantity = () => {
    setQuantity((prev) => prev + 1)
  }
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1)
    }
  }
  const handleQuantityChange = (value: string) => {
    const numValue = Number.parseInt(value) || 1
    if (numValue >= 1) {
      setQuantity(numValue)
    }
  }
  const isOutOfStock = product.STOCK_QUANTITY === 0
  const isLowStock = product.STOCK_QUANTITY > 0 && product.STOCK_QUANTITY <= 10

  // --- List View (Shopee/Lazada style) ---
  if (viewMode === 'list') {
    return (
      <motion.div
        whileHover={{ y: -2, scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Card
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            minHeight: 200,
            position: 'relative',
            boxShadow: '0 2px 8px #eee',
            borderRadius: 16,
            margin: 8,
            transition: 'box-shadow 0.2s ease'
          }}
          className="glass-card hover:shadow-lg"
        >
          {/* Image */}
          <Box style={{ width: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, flexShrink: 0 }}>
            <Image
              src={product.PHOTO_URL || "/placeholder.svg"}
              alt={product.PRODUCT_NAME}
              width={160}
              height={160}
              style={{ objectFit: "cover", borderRadius: 12, border: "1px solid #eee", background: '#fafafa' }}
            />
          </Box>
          {/* Content */}
          <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 16, position: 'relative' }}>
            {/* Product name */}
            <Typography variant="h6" style={{ fontWeight: 700, marginBottom: 8 }}>
              {product.PRODUCT_NAME}
            </Typography>
            {/* Product details */}
            <Box style={{ marginBottom: 16 }}>
              <Typography variant="body2" style={{ color: '#666', marginBottom: 4 }}>
                Category: {product.CATEGORY_NAME || 'N/A'}
              </Typography>
              <Typography variant="body2" style={{ color: '#666', marginBottom: 4 }}>
                Stock: {product.STOCK_QUANTITY} units
              </Typography>
              <Typography variant="body2" style={{ color: '#666' }}>
                SKU: {product?.PRODUCT_ID || 'N/A'}
              </Typography>
            </Box>
            {/* Quantity Selector and Price Row */}
            <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Left side - Quantity and Price */}
              <Box style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {canUseCartForUser && (
                  <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconButton onClick={decrementQuantity} disabled={quantity <= 1} size="small" style={{ background: '#f3f3f3', borderRadius: 8 }}>
                      <Remove />
                    </IconButton>
                    <TextField
                      type="number"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      size="small"
                      inputProps={{ min: 1, className: 'text-center font-semibold', 'aria-label': 'Product quantity' }}
                      style={{ width: 56 }}
                    />
                    <IconButton onClick={incrementQuantity} size="small" style={{ background: '#f3f3f3', borderRadius: 8 }}>
                      <Add />
                    </IconButton>
                  </Box>
                )}
                <Typography variant="h5" style={{ color: "#FF5722", fontWeight: 700 }}>฿{Number(product.UNIT_COST || 0).toFixed(2)}</Typography>
              </Box>
              {/* Right side - Buttons */}
              <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconButton onClick={() => setIsFavorite(!isFavorite)} aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}>
                  {isFavorite ? <Favorite className="text-red-500" /> : <FavoriteBorder className="text-gray-400" />}
                </IconButton>
                {canUseCartForUser && (
                  <Button variant="contained" color="primary" startIcon={<ShoppingCart />} onClick={handleAddToCart} disabled={isAdding} style={{ borderRadius: 20 }}>
                    {isAdding ? "Adding..." : "Add to Cart"}
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        </Card>
      </motion.div>
    )
  }

  // --- Grid View (Original style) ---
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="h-full"
    >
      <Card
        className="glass-card h-full relative overflow-hidden transition-shadow duration-200 hover:shadow-lg"
        style={{ borderRadius: 12 }}
      >
        {/* Favorite Button */}
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="absolute top-4 right-4 z-10">
          <IconButton
            onClick={() => setIsFavorite(!isFavorite)}
            className="glass-button rounded-full p-2"
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            style={{ borderRadius: '50%', width: 40, height: 40 }}
          >
            <AnimatePresence mode="wait">
              {isFavorite ? (
                <motion.div
                  key="filled"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.3 }}
                >
                  <Favorite className="text-red-500" />
                </motion.div>
              ) : (
                <motion.div
                  key="outline"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.3 }}
                >
                  <FavoriteBorder className="text-gray-400" />
                </motion.div>
              )}
            </AnimatePresence>
          </IconButton>
        </motion.div>
        {/* Part 1: Image */}
        <Box
          style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderBottom: '2px solid #e5e7eb', paddingBottom: 8 }}
        >
          {imageLoading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                background: "#f3f3f3"
              }}
            >
              {/* loading skeleton */}
            </div>
          )}
          <Image
            src={product.PHOTO_URL || "/placeholder.svg"}
            alt={product.PRODUCT_NAME}
            fill
            style={{ objectFit: "cover", borderRadius: 12 }}
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
          />
        </Box>
        {/* Parts 2-4: Content */}
        <Box>
          <CardContent>
            {/* Product Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Typography
                variant="h6"
                component="div"
                className="font-bold text-gray-800 mb-2 line-clamp-2"
                title={product.PRODUCT_NAME}
              >
                {product.PRODUCT_NAME}
              </Typography>
              <Box className="flex items-center gap-2 mb-2">
                <Chip
                  label={product.CATEGORY_NAME}
                  size="small"
                  className="bg-blue-100 text-blue-800 font-medium hover-lift"
                />
              </Box>
              <Typography variant="body2" className="text-gray-500 mb-1">
                Unit Price: <span className="font-semibold text-blue-700">฿{Number(product.UNIT_COST || 0).toFixed(2)}</span>
              </Typography>
              <Typography variant="caption" className="text-gray-400">
                Added: {new Date(product.CREATED_AT).toLocaleDateString('th-TH')} {new Date(product.CREATED_AT).toLocaleTimeString('th-TH', { hour12: false })}
              </Typography>
            </motion.div>
            {/* Quantity Selector */}
            {canUseCartForUser && !isOutOfStock && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-4"
              >
                <Typography variant="body2" className="text-gray-600 mb-2 font-medium">
                  Quantity
                </Typography>
                <Box className="flex items-center justify-center gap-3 p-2 glass-button rounded-2xl">
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <IconButton
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                      size="small"
                      className="bg-gray-100 hover:bg-gray-200 rounded-full click-scale"
                      aria-label="Decrease quantity"
                    >
                      <Remove />
                    </IconButton>
                  </motion.div>
                  <TextField
                    type="number"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    size="small"
                    className="w-16"
                    inputProps={{
                      min: 1,
                      className: "text-center font-semibold",
                      "aria-label": "Product quantity",
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        backgroundColor: "rgba(255, 255, 255, 0.8)",
                      },
                    }}
                  />
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <IconButton
                      onClick={incrementQuantity}
                      disabled={quantity >= product.STOCK_QUANTITY}
                      size="small"
                      className="bg-gray-100 hover:bg-gray-200 rounded-full click-scale"
                      aria-label="Increase quantity"
                    >
                      <Add />
                    </IconButton>
                  </motion.div>
                </Box>
                {quantity === product.STOCK_QUANTITY && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-orange-600 mt-1 text-center font-medium"
                  >
                    Maximum quantity selected
                  </motion.p>
                )}
              </motion.div>
            )}
            {/* Add to Cart Button */}
            {canUseCartForUser && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={isAdding ? null : <ShoppingCart />}
                  onClick={handleAddToCart}
                  disabled={isAdding || isOutOfStock}
                  className={`btn-gradient-primary rounded-2xl py-3 font-bold text-white shadow-lg ${
                    isAdding ? "animate-pulse" : ""
                  }`}
                  aria-label={`Add ${product.PRODUCT_NAME} to cart`}
                >
                  <AnimatePresence mode="wait">
                    {isAdding ? (
                      <motion.div
                        key="adding"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2"
                      >
                        <div className="loading-dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                        Added!
                      </motion.div>
                    ) : isOutOfStock ? (
                      <motion.span
                        key="outofstock"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        Out of Stock
                      </motion.span>
                    ) : (
                      <motion.span
                        key="add"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        Add to Cart
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            )}
            {/* Total Price Preview */}
            {canUseCartForUser && !isOutOfStock && quantity > 1 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 text-center"
              >
                <Typography variant="body2" className="text-gray-600">
                  Total: <span className="font-bold text-green-600">฿{(Number(product.UNIT_COST || 0) * quantity).toFixed(2)}</span>
                </Typography>
              </motion.div>
            )}
          </CardContent>
        </Box>
      </Card>
    </motion.div>
  )
}
