import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/src/contexts/AuthContext"
import { CartProvider } from "@/src/contexts/CartContext"
import dynamic from "next/dynamic"
import Layout from "@/components/Layout"
import ThemeProviderClient from "@/components/ThemeProviderClient"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "StationeryHub - Modern Requisition System",
  description: "Advanced stationery requisition and approval system with modern UI/UX",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ToastProvider = dynamic(() => import("@/components/ui/ToastContainer").then(mod => mod.ToastProvider), { ssr: false })
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProviderClient>
          <AuthProvider>
            <CartProvider>
              <ToastProvider>
                <Layout>{children}</Layout>
              </ToastProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProviderClient>
      </body>
    </html>
  )
}
