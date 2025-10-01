"use client"

import React from "react"
import { useAuth } from "@/src/contexts/AuthContext"
import { useCart } from "@/src/contexts/CartContext"

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Avatar,
  Chip,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import {
  ShoppingCart,
  Dashboard,
  Assignment,
  Inventory,
  ExitToApp,
  NotificationsNone,
  Menu as MenuIcon,
  Close,
  Person,
  Check,
  Email,
  ArrowDropDown,
  AdminPanelSettings,
} from "@mui/icons-material"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { getBasePathUrl } from "@/lib/base-path"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { apiGet, apiPut, apiFetch } from "@/lib/api-utils"
import ThaiDateUtils from '@/lib/date-utils'

interface LayoutProps {
  children: React.ReactNode
}

interface Notification {
  id: number
  userId: string
  subject: string
  body: string
  status: string
  isRead: boolean
  sentAt: Date
  type?: string
  requisitionId?: number
  actorId?: string
  priority?: 'low' | 'medium' | 'high'
  timestamp?: string
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, isAuthenticated } = useAuth()
  const { getTotalItems } = useCart()
  const router = useRouter()
  const pathname = usePathname()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [isNavigating, setIsNavigating] = React.useState(false)
  const [notificationAnchor, setNotificationAnchor] = React.useState<null | HTMLElement>(null)
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [loadingNotifications, setLoadingNotifications] = React.useState(false)
  const [_adminMenuAnchor, setAdminMenuAnchor] = React.useState<null | HTMLElement>(null)
  const [adminDropdownOpen, setAdminDropdownOpen] = React.useState(false)
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  // ดึงข้อมูลแจ้งเตือนเมื่อ component โหลด
  React.useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.AdLoginName) return

      try {
        setLoadingNotifications(true)
        console.log('🔔 Fetching notifications for user:', user.AdLoginName)
        
        const data = await apiGet(`/api/notifications?userId=${user.AdLoginName}`)

        console.log('🔔 API response:', data)

        if (data.success) {
          // แปลงข้อมูลจาก API ให้ตรงกับ interface
          const formattedNotifications = (data.data.notifications || []).map((notification: any) => ({
            id: notification.id || notification.EMAIL_ID,
            userId: notification.userId || notification.TO_USER_ID,
            subject: notification.subject || notification.SUBJECT,
            body: notification.message || notification.BODY,
            status: notification.status || notification.STATUS,
            isRead: notification.isRead || notification.IS_READ || false,
            sentAt: new Date(notification.sentAt || notification.SENT_AT),
            type: notification.type,
            requisitionId: notification.requisitionId,
            actorId: notification.actorId,
            priority: notification.priority || 'medium',
            timestamp: notification.timestamp
          }))
          
          setNotifications(formattedNotifications)
          console.log('🔔 Set formatted notifications:', formattedNotifications)
        } else {
          console.error('Error fetching notifications:', data.error)
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
      } finally {
        setLoadingNotifications(false)
      }
    }

    if (user?.AdLoginName) {
      fetchNotifications()
    }
  }, [user?.AdLoginName])

  // Click outside handler for admin dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminDropdownOpen && !(event.target as Element).closest('[data-admin-dropdown]')) {
        setAdminDropdownOpen(false)
        setAdminMenuAnchor(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [adminDropdownOpen])

  // Click outside handler for user menu dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen && !(event.target as Element).closest('[data-user-menu]')) {
        setUserMenuOpen(false)
        setAnchorEl(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
    setUserMenuOpen(true)
  }

  const handleClose = () => {
    setAnchorEl(null)
    setUserMenuOpen(false)
  }

  const handleAdminMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAdminMenuAnchor(event.currentTarget)
    setAdminDropdownOpen(true)
  }

  const handleAdminMenuClose = () => {
    setAdminMenuAnchor(null)
    setAdminDropdownOpen(false)
  }

  const handleLogout = () => {
    setIsNavigating(true)
    logout()
    handleClose()
  }

  const _handleNavigation = (path: string) => {
    if (pathname !== path) {
      setIsNavigating(true)
      router.push(path)
      setMobileMenuOpen(false)
      // ลดเวลา loading ลง
      setTimeout(() => setIsNavigating(false), 300)
    }
  }

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget)
  }
  
  const handleNotificationClose = () => {
    setNotificationAnchor(null)
  }
  
  const handleNotificationAction = async (notification: Notification) => {
    try {
      // Mark as read
      await apiPut(`/api/notifications/${notification.id}/read`, {})

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id 
            ? { ...n, isRead: true }
            : n
        )
      )

      setNotificationAnchor(null)

      // Navigate based on notification type
      if (notification.subject.includes('requisition') || notification.subject.includes('เบิก')) {
        router.push(getBasePathUrl("/orders"))
      }
    } catch (error) {
      console.error('Error handling notification:', error)
    }
  }

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await apiFetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      // Remove from local state
      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      )
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  React.useEffect(() => {
    // ลดเวลา loading ลง
    const timer = setTimeout(() => setIsNavigating(false), 200)
    return () => clearTimeout(timer)
  }, [pathname])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 bg-pattern">{children}</div>
    )
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "error"
      case "MANAGER":
        return "warning"
      case "USER":
        return "primary"
      default:
        return "default"
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "👩‍💻"
      case "MANAGER":
        return "👨‍💼"
      case "USER":
        return "👤"
      default:
        return "👤"
    }
  }

  const getNotificationIcon = (subject: string) => {
    if (subject.includes('อนุมัติ')) return "✅"
    if (subject.includes('ปฏิเสธ')) return "❌"
    if (subject.includes('ใหม่')) return "📦"
    if (subject.includes('พร้อม')) return "🎉"
    if (subject.includes('มาแล้ว')) return "🚀"
    return "📋"
  }

  const _getNotificationStatus = (subject: string) => {
    if (subject.includes('approved')) return "approved"
    if (subject.includes('rejected')) return "rejected"
    return "pending"
  }

  const formatDate = (dateString: string | Date) => {
    return ThaiDateUtils.formatMediumThaiDate(dateString)
  }

  const getNavigationItems = () => {
    const items = []
    const cartItemCount = getTotalItems()

    if (user?.ROLE === "USER") {
      items.push(
        { label: "Products", path: "/", icon: Dashboard },
        { label: "Orders", path: "/orders", icon: Assignment },
        { label: "Cart", path: "/cart", icon: ShoppingCart, badge: cartItemCount > 0 ? cartItemCount : undefined },
      )
    }

    if (user?.ROLE === "MANAGER") {
      items.push(
        { label: "Dashboard", path: "/manager", icon: Dashboard },
        { label: "Approvals", path: "/approvals", icon: Assignment },
        { label: "Products", path: "/manager/products", icon: Inventory },
        { label: "Cart", path: "/manager/cart", icon: ShoppingCart, badge: cartItemCount > 0 ? cartItemCount : undefined },
        { label: "Orders", path: "/manager/orders", icon: Assignment },
      )
    }

    if (user?.ROLE === "ADMIN") {
      items.push(
        { label: "Dashboard", path: "/admin", icon: Dashboard },
        { label: "Products", path: "/admin/products-order", icon: Inventory },
        { label: "Cart", path: "/admin/cart", icon: ShoppingCart, badge: cartItemCount > 0 ? cartItemCount : undefined },
        { label: "Orders", path: "/admin/orders", icon: Assignment },
      )
    }

    return items
  }

  const getAdminMenuItems = () => {
    return [
      { label: "Email Reminders", path: "/admin/email-reminders", icon: Email },
      { label: "Product Management", path: "/admin/products", icon: Inventory },
      { label: "Product Audit Log", path: "/admin/product-audit", icon: Assignment },
      { label: "Approvals", path: "/approvals", icon: Assignment },
    ]
  }

  const navigationItems = getNavigationItems()
  const adminMenuItems = getAdminMenuItems()

  const AdminDropdownButton = () => {
    const isAdminPageActive = adminMenuItems.some(item => pathname === item.path)
    
    return (
      <Box sx={{ position: 'relative', display: 'inline-block' }} data-admin-dropdown>
        <Button
          id="admin-tools-button"
          variant="contained"
          startIcon={<AdminPanelSettings />}
          endIcon={<ArrowDropDown />}
          size="small"
          onClick={handleAdminMenu}
          sx={{ 
            position: 'relative',
            backgroundColor: '#1976d2',
            color: 'white',
            '&:hover': {
              backgroundColor: '#1565c0',
            }
          }}
        >
          Admin Tools
        </Button>
        
        {adminDropdownOpen && (
          <Box
            sx={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              mt: 1,
              minWidth: '200px',
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 1300,
              overflow: 'hidden',
            }}
          >
            {adminMenuItems.map((item) => (
              <Box
                key={item.path}
                component={Link}
                href={item.path}
                onClick={handleAdminMenuClose}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1.5,
                  textDecoration: 'none',
                  color: pathname === item.path ? '#1976d2' : '#333',
                  backgroundColor: pathname === item.path ? '#f3f8ff' : 'transparent',
                  fontWeight: pathname === item.path ? 600 : 400,
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                  },
                  '&:first-of-type': {
                    borderTopLeftRadius: '8px',
                    borderTopRightRadius: '8px',
                  },
                  '&:last-of-type': {
                    borderBottomLeftRadius: '8px',
                    borderBottomRightRadius: '8px',
                  },
                }}
              >
                <item.icon 
                  sx={{ 
                    mr: 1.5, 
                    fontSize: '20px',
                    color: pathname === item.path ? '#1976d2' : '#666',
                  }} 
                />
                <span>{item.label}</span>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    )
  }

  const NavigationButton = ({ item, mobile = false }: { item: any; mobile?: boolean }) => (
    <>
      {mobile ? (
        <ListItem
          button
          component={Link}
          href={item.path}
          className={`rounded-lg mx-2 my-1 ${pathname === item.path ? "bg-blue-50" : ""}`}
          style={{ position: 'relative' }}
        >
          <ListItemIcon>
            <item.icon className={pathname === item.path ? "text-blue-600" : "text-gray-600"} />
          </ListItemIcon>
          <ListItemText
            primary={item.label}
            className={pathname === item.path ? "text-blue-600 font-semibold" : "text-gray-700"}
          />
          {item.badge && (
            <Badge 
              badgeContent={item.badge} 
              color="error"
              sx={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                '& .MuiBadge-badge': {
                  fontSize: '0.75rem',
                  minWidth: '20px',
                  height: '20px',
                }
              }}
            >
              <div style={{ width: 0, height: 0 }} />
            </Badge>
          )}
        </ListItem>
      ) : (
        <Link href={item.path} style={{ textDecoration: 'none' }}>
          <Button
            variant={pathname === item.path ? "contained" : "text"}
            startIcon={<item.icon />}
            size="small"
            sx={{ 
              position: 'relative',
              ...(item.badge && {
                '& .MuiButton-root': {
                  position: 'relative'
                }
              })
            }}
          >
            {item.label}
            {item.badge && (
              <Badge 
                badgeContent={item.badge} 
                color="error"
                sx={{
                  position: 'absolute',
                  top: '0px',
                  right: '0px',
                  '& .MuiBadge-badge': {
                    fontSize: '0.75rem',
                    minWidth: '20px',
                    height: '20px',
                    backgroundColor: pathname === item.path ? '#1976d2' : '#d32f2f',
                    color: 'white',
                    border: '2px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }
                }}
              >
                <div style={{ width: 0, height: 0 }} />
              </Badge>
            )}
          </Button>
        </Link>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-3xl -translate-x-48 -translate-y-48"></div>
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-br from-indigo-200/20 to-pink-200/20 rounded-full blur-3xl translate-x-40 -translate-y-40"></div>
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-gradient-to-br from-purple-200/20 to-blue-200/20 rounded-full blur-3xl -translate-x-36 translate-y-36"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">

      {/* Navigation Loading Overlay */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <LoadingSpinner size="lg" text="Loading..." />
          </motion.div>
        )}
      </AnimatePresence>

        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(99, 102, 241, 0.1)",
            top: 0,
            zIndex: 1100,
            transition: "all 0.3s ease-in-out",
            boxShadow: "0 8px 32px rgba(99, 102, 241, 0.1)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              boxShadow: "0 12px 40px rgba(99, 102, 241, 0.15)",
            }
          }}
        >
          <Toolbar className="px-6">
            {/* Mobile Menu Button */}
            {isMobile && (
              <IconButton
                edge="start"
                onClick={() => setMobileMenuOpen(true)}
                className="mr-2"
                aria-label="Open navigation menu"
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* Logo */}
                         <Link href="/" style={{ textDecoration: 'none' }}>
               <Typography 
                 variant="h6" 
                 component="div" 
                 className="font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
               >
                 🛍️ StationaryHub
               </Typography>
             </Link>

            <Box sx={{ flexGrow: 1 }} />

            {/* Desktop Navigation */}
            {!isMobile && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {navigationItems.map((item) => (
                  <NavigationButton key={item.path} item={item} />
                ))}
                {user?.ROLE === "ADMIN" && <AdminDropdownButton />}
              </Box>
            )}

            {/* Notifications */}
            <IconButton
              aria-label="View notifications"
              onClick={handleNotificationClick}
              size="small"
              disabled={loadingNotifications}
              className="relative"
            >
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsNone />
              </Badge>
            </IconButton>
            <Menu
              anchorEl={notificationAnchor}
              open={Boolean(notificationAnchor)}
              onClose={handleNotificationClose}
              PaperProps={{ className: "mt-2 min-w-[380px] max-h-[500px] overflow-y-auto" }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              <Box className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <Typography variant="h6" className="font-bold text-gray-800">
                    🔔 การแจ้งเตือน
                  </Typography>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <Typography variant="caption" className="text-blue-600 font-medium">
                        {unreadCount} รายการใหม่
                      </Typography>
                    )}
                    <IconButton
                      size="small"
                      onClick={handleNotificationClose}
                      className="h-6 w-6"
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </div>
                </div>
              </Box>
              
              <Box className="p-2">
                {loadingNotifications ? (
                  <Box className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <Typography variant="body2" className="text-gray-500">
                        กำลังโหลด...
                      </Typography>
                    </div>
                  </Box>
                ) : notifications.length === 0 ? (
                  <Box className="text-center py-8">
                    <NotificationsNone className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <Typography variant="body2" className="text-gray-500">
                      ไม่พบการแจ้งเตือน
                    </Typography>
                  </Box>
                ) : (
                  notifications.map((notification) => (
                    <MenuItem
                      key={notification.id}
                      onClick={() => handleNotificationAction(notification)}
                      className={`rounded-lg my-1 px-3 py-3 hover:bg-blue-50 cursor-pointer transition-all duration-200 ${
                        notification.isRead ? "opacity-70 bg-gray-50" : "bg-blue-50 border-l-4 border-l-blue-500"
                      }`}
                    >
                      <Box className="flex items-start gap-3 w-full">
                        <Box className="flex-shrink-0 mt-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            notification.isRead ? 'bg-gray-200' : 'bg-blue-100'
                          }`}>
                            <span className="text-lg">
                              {getNotificationIcon(notification.subject)}
                            </span>
                          </div>
                        </Box>
                        <Box className="flex-1 min-w-0">
                          <Typography 
                            variant="body2" 
                            className={`mb-1 font-medium ${
                              notification.isRead ? 'text-gray-600' : 'text-gray-800'
                            }`}
                          >
                            {notification.body}
                          </Typography>
                          <div className="flex items-center gap-2 mb-1">
                            <Typography variant="caption" className="text-gray-400">
                              {formatDate(notification.sentAt)}
                            </Typography>
                            {!notification.isRead && (
                              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          {notification.type && (
                                                        <Badge
                              className="text-xs"
                            >
                              {notification.type}
                            </Badge>
                          )}
                        </Box>
                        <Box className="flex items-center gap-1">
                          {!notification.isRead && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleNotificationAction(notification)
                              }}
                              className="h-6 w-6 text-blue-600 hover:text-blue-700"
                            >
                              <Check fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteNotification(notification.id)
                            }}
                            className="h-6 w-6 text-gray-400 hover:text-red-500"
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Box>
              
              {notifications.length > 0 && (
                <Box className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <Typography variant="caption" className="text-gray-500">
                      แสดง {notifications.length} รายการ
                    </Typography>
                    <Link href="/notifications" style={{ textDecoration: 'none' }}>
                      <Button size="small" variant="outlined">
                        ดูทั้งหมด
                      </Button>
                    </Link>
                  </div>
                </Box>
              )}
            </Menu>

            {/* User Menu */}
            <Box
              onClick={handleMenu}
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1"
              role="button"
              aria-label="Open user menu"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleMenu(e as any)}
              data-user-menu
            >
              <Avatar sx={{ width: 28, height: 28 }} className="bg-blue-500">
                {getRoleIcon(user?.ROLE || "")}
              </Avatar>
              {!isMobile && (
                <Box>
                  <Typography variant="body2" className="font-medium text-gray-800">
                    {user?.FullNameThai || user?.FullNameEng || user?.USERNAME || user?.AdLoginName || user?.name || 'User'}
                  </Typography>
                  <Chip
                    label={user?.ROLE}
                    size="small"
                    color={getRoleColor(user?.ROLE || "") as any}
                    className="h-4 text-xs"
                  />
                </Box>
              )}
            </Box>

            {/* User Menu Dropdown */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              PaperProps={{
                className: "mt-2 min-w-[250px]",
                'data-user-menu': true,
              }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              <MenuItem onClick={handleClose} className="rounded-xl mx-2 my-1">
                <Person sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="subtitle2" className="font-semibold">
                    {user?.USERNAME}
                  </Typography>
                  <Typography variant="body2" className="text-gray-500">
                    {user && (user as any).EMAIL ? (user as any).EMAIL : 'N/A'}
                  </Typography>
                  <Typography variant="caption" className="text-gray-400">
                    {user && (user as any).DEPARTMENT ? (user as any).DEPARTMENT : 'N/A'} • {user && (user as any).SITE_ID ? (user as any).SITE_ID : 'N/A'}
                  </Typography>
                </Box>
              </MenuItem>

              <Link href="/user-profile" style={{ textDecoration: 'none', color: 'inherit' }}>
                <MenuItem onClick={handleClose} className="rounded-xl mx-2 my-1">
                  <Person sx={{ mr: 2 }} />
                  ข้อมูลผู้ใช้
                </MenuItem>
              </Link>

              <MenuItem onClick={handleClose} className="rounded-xl mx-2 my-1">
                {/* <Settings sx={{ mr: 2 }} />
                Settings */}
              </MenuItem>

              <MenuItem onClick={handleLogout} className="rounded-xl mx-2 my-1 text-red-600">
                <ExitToApp sx={{ mr: 2 }} />
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          className: "w-80",
        }}
      >
        <Box className="p-4">
          <Box className="flex items-center justify-between mb-6">
            <Typography variant="h6" className="font-bold text-gray-800">
              เมนู
            </Typography>
            <IconButton
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
            >
              <Close />
            </IconButton>
          </Box>

          <List>
            {navigationItems.map((item) => (
              <NavigationButton key={item.path} item={item} mobile />
            ))}
            {user?.ROLE === "ADMIN" && (
              <>
                <ListItem className="px-4 py-2">
                  <Typography variant="subtitle2" className="text-gray-500 font-semibold">
                    Admin Tools
                  </Typography>
                </ListItem>
                {adminMenuItems.map((item) => (
                  <NavigationButton key={item.path} item={item} mobile />
                ))}
              </>
            )}
          </List>
        </Box>
      </Drawer>

             <main className="w-full px-4 py-4">
         {children}
       </main>
      </div>
    </div>
  )
}
