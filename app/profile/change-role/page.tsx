"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Shield, UserCheck, Settings, Users, AlertTriangle, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { getBasePathUrl } from "@/lib/base-path"

interface UserPermissions {
  userRole: string
  userPermissions: string[]
  specificPermissions: {
    canApprove: boolean
    canViewRequisition: boolean
    canCreateRequisition: boolean
    canManageUsers: boolean
    canManageProducts: boolean
    canViewReports: boolean
    canManageSystem: boolean
  }
}

export default function ChangeRolePage() {
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newRole, setNewRole] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user as any
  const isAuthenticated = !!session

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(getBasePathUrl("/login"))
      return
    }

    // อนุญาตให้ทุกคนเข้าได้ (ไม่ต้องตรวจสอบสิทธิ์ ASSIGN_ROLE)
    loadPermissions()
  }, [isAuthenticated, router])

  const loadPermissions = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/permissions/check")
      if (response.ok) {
        const permissions = await response.json()
        setUserPermissions(permissions)
      }
    } catch (error) {
      console.error("Error loading permissions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleChangeRole = async () => {
    if (!newRole) return

    setSubmitting(true)
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: user.AdLoginName || user.USER_ID,
          newRole,
          reason,
        }),
      })

      if (response.ok) {
        setSuccess(true)
        setDialogOpen(false)
        // รีโหลดข้อมูลใหม่
        setTimeout(() => {
          loadPermissions()
          setSuccess(false)
        }, 2000)
      } else {
        const error = await response.json()
        alert(`Failed to change role: ${error.error}`)
      }
    } catch (error) {
      alert("Failed to change role")
    } finally {
      setSubmitting(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-red-50 text-red-700 border-red-200"
      case "ADMIN":
        return "bg-purple-50 text-purple-700 border-purple-200"
      case "MANAGER":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "USER":
        return "bg-green-50 text-green-700 border-green-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <Shield className="h-4 w-4" />
      case "ADMIN":
        return <Settings className="h-4 w-4" />
      case "MANAGER":
        return <UserCheck className="h-4 w-4" />
      case "USER":
        return <Users className="h-4 w-4" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6 }}
        className="container mx-auto px-4 py-8"
      >
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <UserCheck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Change Your Role
              </h1>
              <p className="text-gray-600 mt-2">
                Update your role and permissions in the system
              </p>
            </div>
          </motion.div>
        </div>

        {/* Current Role Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Current Role
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <Badge className={`${getRoleColor(userPermissions?.userRole || "")} border px-3 py-1 rounded-full flex items-center gap-1`}>
                  {getRoleIcon(userPermissions?.userRole || "")}
                  {userPermissions?.userRole || "USER"}
                </Badge>
                <span className="text-sm text-gray-600">
                  {user?.USERNAME || user?.name}
                </span>
              </div>

              {/* Current Permissions */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700">Your Current Permissions:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {userPermissions?.specificPermissions && Object.entries(userPermissions.specificPermissions).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      {value ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-600">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Change Role Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Button 
            onClick={() => setDialogOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg shadow-lg"
          >
            Change My Role
          </Button>
        </motion.div>

        {/* Success Alert */}
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6"
          >
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Role changed successfully! Please refresh the page to see the changes.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Change Role Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change Your Role</DialogTitle>
              <DialogDescription>
                Select a new role for your account. This will update your permissions immediately.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">New Role</label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        User - Basic access
                      </div>
                    </SelectItem>
                    <SelectItem value="MANAGER">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Manager - Can approve requisitions
                      </div>
                    </SelectItem>
                    <SelectItem value="ADMIN">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Admin - Full system access
                      </div>
                    </SelectItem>
                    <SelectItem value="SUPER_ADMIN">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Super Admin - Complete control
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Reason (Optional)</label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you changing your role?"
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleChangeRole}
                disabled={!newRole || submitting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {submitting ? "Changing..." : "Change Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
} 