import type { NextRequest } from "next/server"

export interface User {
  USER_ID: number
  USERNAME: string
  EMAIL: string
  ROLE: "USER" | "MANAGER" | "ADMIN"
  DEPARTMENT: string
  SITE_ID: string // Changed from number to string
}

export interface AuthContext {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
}

// ลบ mockUsers, getUserFromToken, requireAuth ออกทั้งหมด
