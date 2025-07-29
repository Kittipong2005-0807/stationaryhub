"use client"

import { motion } from "framer-motion"
import { CheckCircle, Schedule, Cancel, WarningAmber, Info } from "@mui/icons-material"

interface StatusBadgeProps {
  status: "PENDING" | "APPROVED" | "REJECTED" | "INFO" | "WARNING"
  size?: "sm" | "md" | "lg"
  animated?: boolean
}

const statusConfig = {
  INFO: {
    icon: Info,
    className: "status-info",
    label: "Info",
  },
  // keeping same order but updating WARNING mapping
  PENDING: {
    icon: Schedule,
    className: "status-pending",
    label: "Pending",
  },
  APPROVED: {
    icon: CheckCircle,
    className: "status-approved",
    label: "Approved",
  },
  REJECTED: {
    icon: Cancel,
    className: "status-rejected",
    label: "Rejected",
  },
  WARNING: {
    icon: WarningAmber,
    className: "status-warning",
    label: "Warning",
  },
}

const sizeClasses = {
  sm: "text-xs px-2 py-1",
  md: "text-sm px-3 py-2",
  lg: "text-base px-4 py-3",
}

export default function StatusBadge({ status, size = "md", animated = true }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <motion.div
      initial={animated ? { scale: 0, opacity: 0 } : undefined}
      animate={animated ? { scale: 1, opacity: 1 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`inline-flex items-center gap-2 ${config.className} ${sizeClasses[size]} rounded-full font-semibold`}
    >
      <Icon className="w-4 h-4" />
      <span>{config.label}</span>
    </motion.div>
  )
}
