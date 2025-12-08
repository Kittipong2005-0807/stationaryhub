"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/src/contexts/AuthContext'
import { getBasePathUrl } from '@/lib/base-path'

export default function AdminPage() {
  const { user, isAuthenticated, isAuthLoading } = useAuth() as any
  const router = useRouter()

  useEffect(() => {
    if (isAuthLoading) return
    if (!isAuthenticated) {
      router.replace(getBasePathUrl('/login'))
      return
    }
    if (user?.ROLE !== 'ADMIN') {
      router.replace(getBasePathUrl('/'))
      return
    }

    // Redirect to products-order page
    router.replace(getBasePathUrl('/admin/products-order'))
  }, [isAuthenticated, isAuthLoading, user, router])

  return null
}

