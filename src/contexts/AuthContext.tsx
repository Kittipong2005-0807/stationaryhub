
// AuthContext
// 1. ใช้ next-auth ในการจัดการ session ผู้ใช้
// 2. ให้ context สำหรับ user, login, logout, สถานะ auth
// 3. login: เรียก signIn แบบ credentials
// 4. logout: เรียก signOut และ redirect ไป /login
// 5. isAuthenticated: ตรวจสอบสถานะ session
// 6. isAuthLoading: ตรวจสอบสถานะ loading
// 7. ใช้ Provider ครอบ component ทั้งหมดที่ต้องการ auth

"use client"

import type React from "react"
import { createContext, useContext } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
// import type { Session } from "next-auth" // ไม่จำเป็นต้องใช้

interface AuthContextType {
  user: {
    name?: string | null;
    email?: string | null;
    [key: string]: unknown;
  } | null;
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
  isAuthLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ...existing code...
  const { data: session, status } = useSession()
  const user = session?.user ?? null
  console.log("AuthProvider session:", user)
  const isAuthenticated = status === "authenticated"
  const isAuthLoading = status === "loading"

  const login = async (username: string, password: string): Promise<boolean> => {
    const res = await signIn("credentials", {
      redirect: false,
      username,
      password,
    })
    return !!(res && res.ok && !res.error)
  }

  const logout = () => {
    signOut({ callbackUrl: "/login" })
  }

  return (
    <AuthContext.Provider value={{ user , login, logout, isAuthenticated, isAuthLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  // hook สำหรับเรียกใช้งาน context
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
