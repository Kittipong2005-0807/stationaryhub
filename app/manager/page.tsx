"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/src/contexts/AuthContext'
import { getBasePathUrl } from '@/lib/base-path'

export default function ManagerPage() {
  const { user, isAuthenticated, isAuthLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthLoading) return
    if (!isAuthenticated) {
      router.replace(getBasePathUrl('/login'))
      return
    }
    if (user?.ROLE !== 'MANAGER') {
      router.replace(getBasePathUrl('/'))
      return
    }

    // Redirect to approvals page
    router.replace(getBasePathUrl('/approvals'))
  }, [isAuthenticated, isAuthLoading, user, router])

  return null
}

