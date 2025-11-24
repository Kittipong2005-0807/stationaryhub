"use client"

import React, { useEffect } from 'react'
import { Box, Typography, Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/src/contexts/AuthContext'
import { getBasePathUrl } from '@/lib/base-path'
import { motion } from 'framer-motion'

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

    router.replace(getBasePathUrl('/admin/products-order'))
  }, [isAuthenticated, isAuthLoading, user, router])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 text-center">
      <Box className="max-w-2xl mx-auto glass-card p-8 rounded-2xl">
        <Typography variant="h4" className="font-bold mb-2">
          🛠️ Admin - Dashboard Removed
        </Typography>
        <Typography className="text-gray-600 mb-6">
          หน้าแดชบอร์ดสำหรับผู้ดูแลระบบถูกยกเลิกแล้ว คุณจะถูกนำไปยังหน้าจัดการ (Admin Tools)
        </Typography>
        <Button
          variant="contained"
          onClick={() => router.push(getBasePathUrl('/admin/products-order'))}
        >
          ไปยัง Admin Tools
        </Button>
      </Box>
    </motion.div>
  )
}
