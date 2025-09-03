
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
import { createContext, useContext, useEffect } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { getBasePathUrl } from "@/lib/base-path"

interface AuthContextType {
  user: {
    name?: string | null;
    email?: string | null;
    FullNameThai?: string | null;
    FullNameEng?: string | null;
    USERNAME?: string | null;
    AdLoginName?: string | null;
    ROLE?: string | null;
    USER_ID?: string | null;
    EmpCode?: string | null;
    [key: string]: unknown;
  } | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAuthenticated: boolean
  isAuthLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const user = session?.user ?? null
  
  console.log("AuthProvider session:", user)
  console.log("AuthProvider status:", status)
  
  const isAuthenticated = status === "authenticated"
  const isAuthLoading = status === "loading"

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await signIn("credentials", {
        redirect: false,
        username,
        password,
      })
      
      if (res?.ok && !res.error) {
        return { success: true }
      } else {
        return { 
          success: false, 
          error: res?.error || "การเข้าสู่ระบบล้มเหลว" 
        }
      }
    } catch (error) {
      console.error("Login error:", error)
      return { 
        success: false, 
        error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" 
      }
    }
  }

  const logout = () => {
    signOut({ 
      callbackUrl: getBasePathUrl("/login"),
      redirect: true
    })
  }

  // Redirect to login if not authenticated and not loading
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      const currentPath = window.location.pathname
      if (currentPath !== getBasePathUrl("/login") && !currentPath.includes("/api/")) {
        console.log("Redirecting to login - user not authenticated")
        router.push(getBasePathUrl("/login"))
      }
    }
  }, [isAuthenticated, isAuthLoading, router])

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isAuthLoading }}>
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
