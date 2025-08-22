"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { Product } from "@/lib/database"
import { useSession } from "next-auth/react"

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
  isLoading: boolean
  error: string | null
  refreshCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// localStorage key สำหรับเก็บข้อมูลตะกร้า (รวม user ID)
const getCartStorageKey = (userId: string | null) => {
  return userId ? `stationaryhub_cart_${userId}` : 'stationaryhub_cart_guest'
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [items, setItems] = useState<CartItem[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // โหลดข้อมูลตะกร้าจาก localStorage เมื่อ component โหลด
  useEffect(() => {
    loadCartFromStorage()
  }, [])

  // ตรวจสอบ user session และล้างข้อมูลตะกร้าเมื่อ user เปลี่ยน
  useEffect(() => {
    const userId = session?.user?.name || null
    
    // ถ้า user เปลี่ยน ให้ล้างข้อมูลตะกร้า
    if (userId !== currentUserId) {
      if (currentUserId !== null) {
        console.log(`🔄 User changed from ${currentUserId} to ${userId}, clearing cart`)
        clearCart()
        
        // ล้างข้อมูลตะกร้าเก่าทั้งหมดใน localStorage
        try {
          const oldCartKey = getCartStorageKey(currentUserId)
          localStorage.removeItem(oldCartKey)
          console.log(`🗑️ Removed old cart data for user ${currentUserId}`)
        } catch (error) {
          console.error('❌ Error removing old cart data:', error)
        }
      }
      
      // ถ้า logout (userId เป็น null) ให้ล้างข้อมูลตะกร้าทั้งหมด
      if (userId === null && currentUserId !== null) {
        console.log(`🚪 User ${currentUserId} logged out, clearing all cart data`)
        try {
          // ล้างข้อมูลตะกร้าของ user ที่ logout
          const logoutCartKey = getCartStorageKey(currentUserId)
          localStorage.removeItem(logoutCartKey)
          console.log(`🗑️ Removed cart data for logged out user ${currentUserId}`)
        } catch (error) {
          console.error('❌ Error removing logout user cart data:', error)
        }
      }
      
      setCurrentUserId(userId)
    }
  }, [session?.user?.name, currentUserId])

  const loadCartFromStorage = () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const savedCart = localStorage.getItem(getCartStorageKey(currentUserId))
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        
        // ตรวจสอบว่าเป็น array และมีข้อมูลที่ถูกต้อง
        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          // ตรวจสอบข้อมูลแต่ละ item ว่าครบถ้วน
          const validItems = parsedCart.filter(item => 
            item.PRODUCT_ID && 
            item.PRODUCT_NAME && 
            item.UNIT_COST !== undefined && 
            item.quantity > 0
          )
          
          if (validItems.length > 0) {
            setItems(validItems)
            console.log('🛒 Loaded cart from localStorage:', validItems.length, 'items')
          } else {
            console.log('⚠️ No valid items found in localStorage, clearing cart')
            clearCartFromStorage()
          }
        } else {
          console.log('📭 Empty cart in localStorage')
          setItems([])
        }
      } else {
        console.log('📭 No cart data in localStorage')
        setItems([])
      }
    } catch (error) {
      console.error('❌ Error loading cart from localStorage:', error)
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูลตะกร้า')
      // ถ้าเกิด error ให้ล้างข้อมูลเก่าออก
      clearCartFromStorage()
    } finally {
      setIsLoading(false)
      setIsInitialized(true)
    }
  }

  const clearCartFromStorage = () => {
    try {
      localStorage.removeItem(getCartStorageKey(currentUserId))
      setItems([])
      console.log('🗑️ Cleared cart from localStorage')
    } catch (error) {
      console.error('❌ Error clearing cart from localStorage:', error)
    }
  }

  // บันทึกข้อมูลตะกร้าลง localStorage ทุกครั้งที่มีการเปลี่ยนแปลง
  useEffect(() => {
    if (isInitialized && !isLoading) {
      try {
        localStorage.setItem(getCartStorageKey(currentUserId), JSON.stringify(items))
        console.log('💾 Saved cart to localStorage:', items.length, 'items')
      } catch (error) {
        console.error('❌ Error saving cart to localStorage:', error)
        setError('เกิดข้อผิดพลาดในการบันทึกข้อมูลตะกร้า')
      }
    }
  }, [items, isInitialized, isLoading])

  const addToCart = (product: Product, quantity: number) => {
    if (!product.PRODUCT_ID || quantity <= 0) {
      console.error('❌ Invalid product or quantity:', { product, quantity })
      return
    }

    setItems((prev) => {
      const existingItem = prev.find((item) => item.PRODUCT_ID === product.PRODUCT_ID)
      if (existingItem) {
        return prev.map((item) =>
          item.PRODUCT_ID === product.PRODUCT_ID ? { ...item, quantity: item.quantity + quantity } : item,
        )
      }
      return [...prev, { ...product, quantity }]
    })
    
    console.log('➕ Added to cart:', product.PRODUCT_NAME, 'x', quantity)
  }

  const removeFromCart = (productId: number) => {
    setItems((prev) => {
      const itemToRemove = prev.find(item => item.PRODUCT_ID === productId)
      if (itemToRemove) {
        console.log('➖ Removed from cart:', itemToRemove.PRODUCT_NAME)
      }
      return prev.filter((item) => item.PRODUCT_ID !== productId)
    })
  }

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    
    setItems((prev) => {
      const updatedItems = prev.map((item) => 
        item.PRODUCT_ID === productId ? { ...item, quantity } : item
      )
      
      const updatedItem = updatedItems.find(item => item.PRODUCT_ID === productId)
      if (updatedItem) {
        console.log('🔄 Updated quantity:', updatedItem.PRODUCT_NAME, 'x', quantity)
      }
      
      return updatedItems
    })
  }

  const clearCart = () => {
    setItems([])
    clearCartFromStorage()
    console.log('🗑️ Cart cleared')
  }

  const refreshCart = () => {
    loadCartFromStorage()
  }

  const getTotalAmount = () => {
    return items.reduce((total, item) => total + (item.UNIT_COST || 0) * item.quantity, 0)
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
        isLoading,
        error,
        refreshCart,
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
