'use client';

import type React from 'react';
import { useState } from 'react';
// ส่วน import library และ component ที่ใช้ในหน้า login
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Login as LoginIcon,
  Visibility,
  VisibilityOff,
  Person,
  Lock
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getBasePathUrl } from '@/lib/base-path';

export default function LoginPage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const searchParams = useSearchParams();
  // ส่วนประกาศ state และตัวแปรสำหรับจัดการข้อมูล login
  const errorFromQuery = searchParams.get('error');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(
    errorFromQuery ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : ''
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // ส่วน redirect ถ้า login แล้ว
    setLoading(true);
    setError('');
    try {
      const res = await signIn('credentials', {
        redirect: false,
        username,
        password,
        basePath: `${basePath}/api/auth`
      });
      if (res?.ok && !res?.error) {
        console.log('T : ', res);
        router.push('/');
      } else {
        setError('Invalid username or password');
      }
      // ส่วนแสดง loading หรือซ่อนหน้า login ถ้า login แล้ว
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ส่วน handleSubmit สำหรับ login
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 bg-pattern relative overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full floating blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-pink-400/20 to-red-400/20 rounded-full floating-delayed blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full floating blur-2xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, type: 'spring', stiffness: 100 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="modern-card overflow-hidden">
          <CardContent className="p-8">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
              // ส่วน render UI login form
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                className="mb-4"
              >
                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg">
                  <LoginIcon className="text-4xl text-white" />
                </div>
              </motion.div>

              <Typography variant="h3" className="font-bold text-gradient mb-2">
                Welcome Back
              </Typography>
              <Typography variant="body1" className="text-gray-600">
                Sign in to your StationaryHub account
              </Typography>
            </motion.div>

            {/* Error Alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  className="mb-6"
                >
                  <Alert severity="error" className="glass-card rounded-2xl">
                    {error}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <TextField
                  fullWidth
                  label="Username"
                  variant="outlined"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person className="text-gray-400" />
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)'
                    }
                  }}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  variant="outlined"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock className="text-gray-400" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)'
                    }
                  }}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  className="btn-modern py-4 text-lg font-bold rounded-2xl"
                  sx={{
                    background:
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background:
                        'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
                    }
                  }}
                >
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Signing In...
                      </motion.div>
                    ) : (
                      <motion.span
                        key="signin"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        Sign In
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </motion.form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}