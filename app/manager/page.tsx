
"use client"

import React, { useEffect } from 'react'
import { Box, Typography, Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/src/contexts/AuthContext'
import { getBasePathUrl } from '@/lib/base-path'
import { motion } from 'framer-motion'

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

    // Redirect managers to manager product list
    router.replace(getBasePathUrl('/manager/products'))
  }, [isAuthenticated, isAuthLoading, user, router])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 text-center">
      <Box className="max-w-2xl mx-auto glass-card p-8 rounded-2xl">
        <Typography variant="h4" className="font-bold mb-2">
          🎯 Manager - Dashboard Removed
        </Typography>
        <Typography className="text-gray-600 mb-6">
          หน้าแดชบอร์ดสำหรับผู้จัดการถูกยกเลิกแล้ว คุณจะถูกนำไปยังหน้าจัดการสินค้า
        </Typography>
        <Button variant="contained" onClick={() => router.push(getBasePathUrl('/manager/products'))}>
          ไปยังหน้าจัดการสินค้า
        </Button>
      </Box>
    </motion.div>
  )
}