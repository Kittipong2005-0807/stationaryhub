"use client"

import React from "react"
import { useAuth } from "@/src/contexts/AuthContext"
import { useCart } from "@/src/contexts/CartContext"
import { Bell } from "lucide-react"
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
  Settings,
} from "@mui/icons-material"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import LoadingSpinner from "./ui/LoadingSpinner"

interface LayoutProps {
  children: React.ReactNode
}

interface Notification {
  EMAIL_ID: number
  TO_USER_ID: string
  SUBJECT: string
  BODY: string
  STATUS: string
  SENT_AT: Date
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

  const unreadCount = notifications.filter((n) => n.STATUS === 'SENT').length

  // ดึงข้อมูลแจ้งเตือนเมื่อ component โหลด
  React.useEffect(() => {
    if (user?.AdLoginName) {
      fetchNotifications()
    }
  }, [user?.AdLoginName])

  const fetchNotifications = async () => {
    if (!user?.AdLoginName) return

    try {
      setLoadingNotifications(true)
      const response = await fetch(`/api/notifications?userId=${user.AdLoginName}`)
      const data = await response.json()

      if (response.ok) {
        setNotifications(data.notifications || [])
      } else {
        console.error('Error fetching notifications:', data.error)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoadingNotifications(false)
    }
  }

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    setIsNavigating(true)
    logout()
    router.push("/login")
    handleClose()
  }

  const handleNavigation = (path: string) => {
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
      await fetch(`/api/notifications/${notification.EMAIL_ID}/read`, {
        method: 'POST'
      })

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.EMAIL_ID === notification.EMAIL_ID 
            ? { ...n, STATUS: 'READ' }
            : n
        )
      )

      setNotificationAnchor(null)

      // Navigate based on notification type
      if (notification.SUBJECT.includes('requisition')) {
        router.push("/orders")
      }
    } catch (error) {
      console.error('Error handling notification:', error)
    }
  }

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      // Remove from local state
      setNotifications(prev => 
        prev.filter(n => n.EMAIL_ID !== notificationId)
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
    if (subject.includes('approved')) return "✅"
    if (subject.includes('rejected')) return "❌"
    if (subject.includes('created')) return "📦"
    return "📋"
  }

  const getNotificationStatus = (subject: string) => {
    if (subject.includes('approved')) return "approved"
    if (subject.includes('rejected')) return "rejected"
    return "pending"
  }

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString)
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getNavigationItems = () => {
    const items = []

    if (user?.ROLE === "USER") {
      items.push(
        { label: "Products", path: "/", icon: Dashboard },
        { label: "Orders", path: "/orders", icon: Assignment },
        { label: "Cart", path: "/cart", icon: ShoppingCart, badge: getTotalItems() },
      )
    }

    if (user?.ROLE === "MANAGER") {
      items.push(
        { label: "Dashboard", path: "/manager", icon: Dashboard },
        { label: "Approvals", path: "/approvals", icon: Assignment },
        { label: "Products", path: "/", icon: Inventory },
      )
    }

    if (user?.ROLE === "ADMIN") {
      items.push(
        { label: "Dashboard", path: "/admin", icon: Dashboard },
        { label: "Products", path: "/admin/products", icon: Inventory },
        { label: "Approvals", path: "/approvals", icon: Assignment },
      )
    }

    return items
  }

  const navigationItems = getNavigationItems()

  const NavigationButton = ({ item, mobile = false }: { item: any; mobile?: boolean }) => (
    <>
      {mobile ? (
        <ListItem
          button
          component={Link}
          href={item.path}
          className={`rounded-lg mx-2 my-1 ${pathname === item.path ? "bg-blue-50" : ""}`}
        >
          <ListItemIcon>
            <Badge badgeContent={item.badge} color="error">
              <item.icon className={pathname === item.path ? "text-blue-600" : "text-gray-600"} />
            </Badge>
          </ListItemIcon>
          <ListItemText
            primary={item.label}
            className={pathname === item.path ? "text-blue-600 font-semibold" : "text-gray-700"}
          />
        </ListItem>
      ) : (
        <Link href={item.path} style={{ textDecoration: 'none' }}>
          <Button
            variant={pathname === item.path ? "contained" : "text"}
            startIcon={
              <Badge badgeContent={item.badge} color="error">
                <item.icon />
              </Badge>
            }
            size="small"
          >
            {item.label}
          </Button>
        </Link>
      )}
    </>
  )

  return (
    <div className="min-h-screen">

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
          position="static"
          elevation={1}
          sx={{
            backgroundColor: "white",
            borderBottom: "1px solid #e5e7eb",
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
                 🛍️ StationeryHub
               </Typography>
             </Link>

            <Box sx={{ flexGrow: 1 }} />

            {/* Desktop Navigation */}
            {!isMobile && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {navigationItems.map((item) => (
                  <NavigationButton key={item.path} item={item} />
                ))}
              </Box>
            )}

            {/* Notifications */}
            <IconButton
              aria-label="View notifications"
              onClick={handleNotificationClick}
              size="small"
              disabled={loadingNotifications}
            >
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsNone />
              </Badge>
            </IconButton>
            <Menu
              anchorEl={notificationAnchor}
              open={Boolean(notificationAnchor)}
              onClose={handleNotificationClose}
              PaperProps={{ className: "mt-2 min-w-[320px] max-h-[400px] overflow-y-auto" }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              <Box className="px-4 py-2">
                <Typography variant="subtitle1" className="font-bold mb-2">รายการแจ้งเตือน</Typography>
                
                {loadingNotifications ? (
                  <Box className="flex items-center justify-center py-4">
                    <LoadingSpinner size="sm" text="กำลังโหลด..." />
                  </Box>
                ) : notifications.length === 0 ? (
                  <Typography variant="body2" className="text-gray-500 py-4 text-center">
                    ไม่พบแจ้งเตือน
                  </Typography>
                ) : (
                  notifications.map((notification) => (
                    <MenuItem
                      key={notification.EMAIL_ID}
                      onClick={() => handleNotificationAction(notification)}
                      className={`rounded-lg my-1 px-3 py-2 hover:bg-blue-50 cursor-pointer ${
                        notification.STATUS === 'READ' ? "opacity-60" : ""
                      }`}
                    >
                      <Box className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.SUBJECT)}
                      </Box>
                      <Box className="flex-1">
                        <Typography variant="body2" className="mb-1 font-medium text-gray-800">
                          {notification.BODY}
                        </Typography>
                        <Typography variant="caption" className="text-gray-400">
                          {formatDate(notification.SENT_AT)}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteNotification(notification.EMAIL_ID)
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </MenuItem>
                  ))
                )}
              </Box>
            </Menu>

            {/* User Menu */}
            <Box
              onClick={handleMenu}
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1"
              role="button"
              aria-label="Open user menu"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleMenu(e as any)}
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
              <Link href="/notifications" style={{ textDecoration: 'none', color: 'inherit' }}>
                <IconButton color="inherit" sx={{ ml: 1 }}>
                  <Bell />
                </IconButton>
              </Link>
              {user?.ROLE === 'DEV' && (
                <Link href="/test-notifications" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <IconButton color="inherit" sx={{ ml: 1 }}>
                    <Bell className="text-orange-600" />
                  </IconButton>
                </Link>
              )}
            </Box>

            {/* User Menu Dropdown */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              PaperProps={{
                className: "mt-2 min-w-[250px]",
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
                    {user?.EMAIL}
                  </Typography>
                  <Typography variant="caption" className="text-gray-400">
                    {user?.DEPARTMENT} • {user?.SITE_ID}
                  </Typography>
                </Box>
              </MenuItem>

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
          </List>
        </Box>
      </Drawer>

             <main className="container mx-auto px-4 py-6">
         {children}
       </main>
    </div>
  )
}
