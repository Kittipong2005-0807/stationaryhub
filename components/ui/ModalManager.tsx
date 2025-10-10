"use client"

import { useState, useCallback } from "react"
import AnimatedModal from "./AnimatedModal"

type ModalType = "success" | "error" | "warning" | "info"

interface ModalState {
  isOpen: boolean
  type: ModalType
  title: string
  message: string
  duration: number
}

interface ModalManagerProps {
  children: React.ReactNode
}

interface ModalContextType {
  showSuccess: (title: string, message?: string, duration?: number) => void
  showError: (title: string, message?: string, duration?: number) => void
  showWarning: (title: string, message?: string, duration?: number) => void
  showInfo: (title: string, message?: string, duration?: number) => void
  closeModal: () => void
}

// Create context
import { createContext, useContext } from "react"
const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: ModalManagerProps) {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
    duration: 3000
  })

  const showModal = useCallback((
    type: ModalType, 
    title: string, 
    message: string = "", 
    duration: number = 3000
  ) => {
    setModalState({
      isOpen: true,
      type,
      title,
      message,
      duration
    })
  }, [])

  const showSuccess = useCallback((title: string, message?: string, duration?: number) => {
    showModal("success", title, message || "", duration || 3000)
  }, [showModal])

  const showError = useCallback((title: string, message?: string, duration?: number) => {
    showModal("error", title, message || "", duration || 4000) // Error modals stay longer
  }, [showModal])

  const showWarning = useCallback((title: string, message?: string, duration?: number) => {
    showModal("warning", title, message || "", duration || 3500)
  }, [showModal])

  const showInfo = useCallback((title: string, message?: string, duration?: number) => {
    showModal("info", title, message || "", duration || 3000)
  }, [showModal])

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const contextValue: ModalContextType = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    closeModal
  }

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      <AnimatedModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        duration={modalState.duration}
      />
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}
