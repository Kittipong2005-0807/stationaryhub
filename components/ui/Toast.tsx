"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { CheckCircle, ErrorOutline, WarningAmber, Info, Close } from "@mui/icons-material"

export interface ToastProps {
  id: string
  type: "success" | "error" | "warning" | "info"
  title: string
  message?: string
  duration?: number
  onClose: (id: string) => void
}

const icons = {
  success: CheckCircle,
  error: ErrorOutline,
  warning: WarningAmber,
  info: Info,
}

const colors = {
  success: "from-green-500 to-emerald-500",
  error: "from-red-500 to-rose-500",
  warning: "from-yellow-500 to-orange-500",
  info: "from-blue-500 to-indigo-500",
}

export default function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100)
  const Icon = icons[type]

  useEffect(() => {
    // Interval updates the visual progress bar only
    const step = 100 / (duration / 100)
    const interval = setInterval(() => {
      setProgress((prev) => Math.max(prev - step, 0))
    }, 100)

    // Timeout actually removes the toast after the full duration
    const timeout = setTimeout(() => onClose(id), duration)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [duration, id, onClose])

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="notification-toast relative"
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t-lg overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${colors[type]}`}
          initial={{ width: "100%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: "linear" }}
        />
      </div>

      <div className="flex items-start gap-3 pt-2">
        <div className={`p-2 rounded-full bg-gradient-to-r ${colors[type]} text-white`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
          {message && <p className="text-gray-600 text-sm mt-1 leading-relaxed">{message}</p>}
        </div>

        <button
          onClick={() => onClose(id)}
          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close notification"
        >
          <Close className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </motion.div>
  )
}

