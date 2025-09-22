"use client"

import { SessionProvider } from 'next-auth/react'
import { AuthProvider } from '@/src/contexts/AuthContext'
import { CartProvider } from '@/src/contexts/CartContext'
import dynamic from 'next/dynamic'

const ToastProvider = dynamic(
  () =>
    import('@/components/ui/ToastContainer').then((mod) => mod.ToastProvider),
  {
    ssr: false,
    loading: () => null
  }
)

interface ClientProvidersProps {
  children: React.ReactNode
  session: any
}

export default function ClientProviders({ children, session }: ClientProvidersProps) {
  return (
    <SessionProvider session={session}>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </SessionProvider>
  )
}

