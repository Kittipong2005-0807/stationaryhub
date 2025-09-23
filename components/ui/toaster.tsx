"use client"

import { useToast } from "@/src/hooks/use-toast"
import Toast from "@/components/ui/Toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <>
      {toasts.map(function ({ id, type, title, message, ...props }) {
        return (
          <Toast 
            key={id} 
            id={id}
            type={type || "info"}
            title={title || ""}
            message={message}
            onClose={() => {}} // This will be handled by the toast component itself
          />
        )
      })}
    </>
  )
}
