"use client"

import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, X, AlertTriangle, Info, XCircle } from "lucide-react"
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
          icon: CheckCircle,
          colors: {
            primary: 'from-green-500 to-emerald-500',
            ring: 'bg-green-100',
            ringInner: 'bg-green-200',
            progress: 'from-green-500 to-emerald-500'
          }
        }
      case 'error':
        return {
          title: title || 'เกิดข้อผิดพลาด!',
          message: message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
          icon: XCircle,
          colors: {
            primary: 'from-red-500 to-rose-500',
            ring: 'bg-red-100',
            ringInner: 'bg-red-200',
            progress: 'from-red-500 to-rose-500'
          }
        }
      case 'warning':
        return {
          title: title || 'คำเตือน!',
          message: message || 'กรุณาตรวจสอบข้อมูลก่อนดำเนินการต่อ',
          icon: AlertTriangle,
          colors: {
            primary: 'from-yellow-500 to-orange-500',
            ring: 'bg-yellow-100',
            ringInner: 'bg-yellow-200',
            progress: 'from-yellow-500 to-orange-500'
          }
        }
      case 'info':
        return {
          title: title || 'ข้อมูล',
          message: message || 'ข้อมูลเพิ่มเติมสำหรับคุณ',
          icon: Info,
          colors: {
            primary: 'from-blue-500 to-indigo-500',
            ring: 'bg-blue-100',
            ringInner: 'bg-blue-200',
            progress: 'from-blue-500 to-indigo-500'
          }
        }
      default:
        return {
          title: title || 'Success!',
          message: message || 'Operation completed successfully!',
          icon: CheckCircle,
          colors: {
            primary: 'from-green-500 to-emerald-500',
            ring: 'bg-green-100',
            ringInner: 'bg-green-200',
            progress: 'from-green-500 to-emerald-500'
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
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              {/* Content */}
              <div className="p-8 text-center">
                {/* Success Icon with Animation */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    delay: 0.2,
                    type: "spring",
                    stiffness: 200,
                    damping: 15
                  }}
                  className="relative mb-6"
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
                    className={`relative w-20 h-20 mx-auto rounded-full bg-gradient-to-r ${config.colors.primary} flex items-center justify-center shadow-lg`}
                  >
                    <IconComponent className="w-10 h-10 text-white" />
                  </motion.div>
                  
                  {/* Ripple effect */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ 
                      delay: 0.6,
                      duration: 1,
                      ease: "easeOut"
                    }}
                    className={`absolute inset-0 rounded-full border-2 ${type === 'success' ? 'border-green-400' : type === 'error' ? 'border-red-400' : type === 'warning' ? 'border-yellow-400' : 'border-blue-400'}`}
                  />
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="text-2xl font-bold text-gray-900 mb-2"
                >
                  {config.title}
                </motion.h2>

                {/* Message */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="text-gray-600 text-lg leading-relaxed"
                >
                  {config.message}
                </motion.p>

                {/* Progress bar */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1, duration: 0.3 }}
                  className="mt-6"
                >
                  <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                    <motion.div
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ 
                        duration: duration / 1000,
                        ease: "linear",
                        delay: 0.5
                      }}
                      className={`h-full bg-gradient-to-r ${config.colors.progress} rounded-full`}
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
