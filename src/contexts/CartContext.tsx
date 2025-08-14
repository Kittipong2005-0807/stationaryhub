"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"
import type { Product } from "@/lib/database"

interface CartItem extends Product {
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addToCart: (product: Product, quantity: number) => void
  removeFromCart: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  clearCart: () => void
  getTotalAmount: () => number
  getTotalItems: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addToCart = (product: Product, quantity: number) => {
    setItems((prev) => {
      const existingItem = prev.find((item) => item.PRODUCT_ID === product.PRODUCT_ID)
      if (existingItem) {
        return prev.map((item) =>
          item.PRODUCT_ID === product.PRODUCT_ID ? { ...item, quantity: item.quantity + quantity } : item,
        )
      }
      return [...prev, { ...product, quantity }]
    })
  }

  const removeFromCart = (productId: number) => {
    setItems((prev) => prev.filter((item) => item.PRODUCT_ID !== productId))
  }

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setItems((prev) => prev.map((item) => (item.PRODUCT_ID === productId ? { ...item, quantity } : item)))
  }

  const clearCart = () => {
    setItems([])
  }

  const getTotalAmount = () => {
    return items.reduce((total, item) => total + item.UNIT_COST * item.quantity, 0)
  }

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalAmount,
        getTotalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

// Helper function to check if user can use cart
export function canUseCart(userRole?: string): boolean {
  return userRole === "USER" || userRole === "MANAGER"
}
