"use client"

import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, X, AlertTriangle, Info, XCircle, Check } from "lucide-react"
import { useEffect } from "react"

type ModalType = "success" | "error" | "warning" | "info"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  type: ModalType
  title?: string
  message?: string
  duration?: number
}

export default function AnimatedModal({ 
  isOpen, 
  onClose, 
  type,
  title, 
  message,
  duration = 3000 
}: ModalProps) {
  
  // Get modal configuration based on type
  const getModalConfig = (type: ModalType) => {
    switch (type) {
      case 'success':
        return {
          title: title || 'Success!',
          message: message || 'Operation completed successfully!',
          icon: Check,
          colors: {
            primary: 'from-green-500 to-emerald-600',
            ring: 'bg-green-50',
            ringInner: 'bg-green-100',
            progress: 'from-green-500 to-emerald-600'
          }
        }
      case 'error':
        return {
          title: title || 'เกิดข้อผิดพลาด!',
          message: message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
          icon: X,
          colors: {
            primary: 'from-red-400 to-red-600',
            ring: 'bg-red-50',
            ringInner: 'bg-red-100',
            progress: 'from-red-400 to-red-600'
          }
        }
      case 'warning':
        return {
          title: title || 'คำเตือน!',
          message: message || 'กรุณาตรวจสอบข้อมูลก่อนดำเนินการต่อ',
          icon: AlertTriangle,
          colors: {
            primary: 'from-yellow-500 to-amber-600',
            ring: 'bg-yellow-50',
            ringInner: 'bg-yellow-100',
            progress: 'from-yellow-500 to-amber-600'
          }
        }
      case 'info':
        return {
          title: title || 'ข้อมูล',
          message: message || 'ข้อมูลเพิ่มเติมสำหรับคุณ',
          icon: Info,
          colors: {
            primary: 'from-blue-400 to-blue-600',
            ring: 'bg-blue-50',
            ringInner: 'bg-blue-100',
            progress: 'from-blue-400 to-blue-600'
          }
        }
      default:
        return {
          title: title || 'Success!',
          message: message || 'Operation completed successfully!',
          icon: Check,
          colors: {
            primary: 'from-green-500 to-emerald-600',
            ring: 'bg-green-50',
            ringInner: 'bg-green-100',
            progress: 'from-green-500 to-emerald-600'
          }
        }
    }
  }

  const config = getModalConfig(type)
  const IconComponent = config.icon
  
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen, duration, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ 
              opacity: 0, 
              scale: 0.5,
              y: -50
            }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              y: 0
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.5,
              y: -50
            }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 25,
              duration: 0.5
            }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="relative bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden border border-white/20 backdrop-blur-sm">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white/95 transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-xl"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>

              {/* Content */}
              <div className="p-7 text-center">
                {/* Icon with Animation */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    delay: 0.2,
                    type: "spring",
                    stiffness: 200,
                    damping: 15
                  }}
                  className="relative mb-5"
                >
                  {/* Outer ring animation */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ 
                      delay: 0.3,
                      duration: 0.6,
                      ease: "easeOut"
                    }}
                    className={`absolute inset-0 rounded-full ${config.colors.ring}`}
                  />
                  
                  {/* Inner ring animation */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ 
                      delay: 0.4,
                      duration: 0.6,
                      ease: "easeOut"
                    }}
                    className={`absolute inset-2 rounded-full ${config.colors.ringInner}`}
                  />
                  
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                      delay: 0.5,
                      type: "spring",
                      stiffness: 200,
                      damping: 15
                    }}
                    className={`relative w-20 h-20 mx-auto rounded-full bg-gradient-to-r ${config.colors.primary} flex items-center justify-center shadow-2xl border-2 border-white/30`}
                  >
                    <IconComponent className="w-10 h-10 text-white stroke-2" />
                  </motion.div>
                  
                  {/* Ripple effect */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ 
                      delay: 0.6,
                      duration: 1.2,
                      ease: "easeOut"
                    }}
                    className={`absolute inset-0 rounded-full border-3 ${type === 'success' ? 'border-emerald-400' : type === 'error' ? 'border-red-400' : type === 'warning' ? 'border-amber-400' : 'border-blue-400'}`}
                  />
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2 tracking-tight"
                >
                  {config.title}
                </motion.h2>

                {/* Message */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="text-gray-600 text-base leading-relaxed font-medium"
                >
                  {config.message}
                </motion.p>

                {/* Progress bar */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1, duration: 0.3 }}
                  className="mt-5"
                >
                  <div className="w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-1 overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ 
                        duration: duration / 1000,
                        ease: "linear",
                        delay: 0.5
                      }}
                      className={`h-full bg-gradient-to-r ${config.colors.progress} rounded-full shadow-sm`}
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
