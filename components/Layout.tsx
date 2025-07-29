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
  Settings,
} from "@mui/icons-material"
import { useRouter, usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import LoadingSpinner from "./ui/LoadingSpinner"

interface LayoutProps {
  children: React.ReactNode
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
  const [notifications, setNotifications] = React.useState([
    { id: 1, type: "order", message: "คำสั่งซื้อ #1234 ได้รับการอนุมัติแล้ว", status: "approved", read: false, date: "2024-07-01 10:30" },
    { id: 2, type: "order", message: "คำสั่งซื้อ #1235 ถูกปฏิเสธ กรุณาตรวจสอบ", status: "rejected", read: false, date: "2024-07-01 09:15" },
  ])

  const unreadCount = notifications.filter((n) => !n.read).length

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
    }
  }

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget)
  }
  const handleNotificationClose = () => {
    setNotificationAnchor(null)
  }
  const handleNotificationAction = (n: any) => {
    setNotifications((prev) => prev.map((item) => item.id === n.id ? { ...item, read: true } : item))
    setNotificationAnchor(null)
    if (n.type === "order") {
      // สมมุติว่า order id อยู่ในข้อความ เช่น #1234
      const match = n.message.match(/#(\d+)/)
      if (match) {
        const orderId = match[1]
        // ไปหน้ารายละเอียด order (ถ้ามี) หรือไป /orders
        // router.push(`/orders/${orderId}`) // ถ้ามีหน้าแยก
        router.push("/orders")
      } else {
        router.push("/orders")
      }
    } else if (n.type === "news") {
      // ไปหน้าข่าวสาร (ถ้ามี) หรืออยู่หน้าเดิม
      // router.push("/news")
    }
  }

  React.useEffect(() => {
    setIsNavigating(false)
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
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} key={item.path}>
      {mobile ? (
        <ListItem
          button
          onClick={() => handleNavigation(item.path)}
          className={`rounded-xl mx-2 my-1 ${pathname === item.path ? "bg-blue-50" : ""}`}
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
        <Button
          color="primary"
          onClick={() => handleNavigation(item.path)}
          startIcon={
            <Badge badgeContent={item.badge} color="error">
              <item.icon />
            </Badge>
          }
          className={`glass-button rounded-full px-4 py-2 font-semibold transition-all duration-300 ${
            pathname === item.path ? "bg-blue-100 text-blue-700 shadow-lg" : "text-gray-700 hover:bg-white/50"
          }`}
          aria-label={item.label}
        >
          {item.label}
        </Button>
      )}
    </motion.div>
  )

  return (
    <div className="min-h-screen">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full floating blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-pink-400/20 to-red-400/20 rounded-full floating-delayed blur-xl"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full floating blur-xl"></div>
      </div>

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

      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      >
        <AppBar
          position="static"
          className="glass-nav"
          elevation={0}
          sx={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(30px)",
          }}
        >
          <Toolbar className="px-6">
            {/* Mobile Menu Button */}
            {isMobile && (
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <IconButton
                  edge="start"
                  onClick={() => setMobileMenuOpen(true)}
                  className="mr-2 glass-button rounded-full"
                  aria-label="Open navigation menu"
                >
                  <MenuIcon />
                </IconButton>
              </motion.div>
            )}

            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigation("/")}
              className="cursor-pointer"
            >
              <Typography variant="h5" component="div" className="font-bold text-gray-900">
                🛍️ StationeryHub
              </Typography>
            </motion.div>

            <Box sx={{ flexGrow: 1 }} />

            {/* Desktop Navigation */}
            {!isMobile && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <AnimatePresence>
                  {navigationItems.map((item) => (
                    <NavigationButton key={item.path} item={item} />
                  ))}
                </AnimatePresence>
              </Box>
            )}

            {/* Notifications */}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <IconButton
                className="glass-button rounded-full p-0 mx-2 flex items-center justify-center"
                aria-label="View notifications"
                onClick={handleNotificationClick}
                sx={{ width: 48, height: 48, minWidth: 48, minHeight: 48 }}
              >
                <Badge badgeContent={unreadCount} color="error">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatDelay: 5 }}
                  >
                    <NotificationsNone className="text-gray-700" />
                  </motion.div>
                </Badge>
              </IconButton>
              <Menu
                anchorEl={notificationAnchor}
                open={Boolean(notificationAnchor)}
                onClose={handleNotificationClose}
                PaperProps={{ className: "glass-card-strong rounded-2xl mt-2 min-w-[320px]" }}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              >
                <Box className="px-4 py-2">
                  <Typography variant="subtitle1" className="font-bold mb-2">รายการแจ้งเตือน</Typography>
                  {notifications.filter(n => n.type === "order").length === 0 && (
                    <Typography variant="body2" className="text-gray-500">ไม่พบแจ้งเตือน</Typography>
                  )}
                  {notifications.filter(n => n.type === "order").map((n) => (
                    <MenuItem
                      key={n.id}
                      onClick={() => handleNotificationAction(n)}
                      className={`rounded-xl my-2 px-3 py-2 transition-all duration-200 flex items-start gap-3 shadow-sm border border-gray-100 hover:bg-blue-50/60 cursor-pointer ${n.read ? "opacity-60" : "bg-white/90"}`}
                      style={{
                        background:
                          n.status === "approved"
                            ? "linear-gradient(90deg, #e0ffe7 0%, #f6fff9 100%)"
                            : n.status === "rejected"
                            ? "linear-gradient(90deg, #ffe0e0 0%, #fff6f6 100%)"
                            : undefined,
                        borderLeft: n.status === "approved" ? "4px solid #22c55e" : n.status === "rejected" ? "4px solid #ef4444" : "4px solid #3b82f6",
                      }}
                    >
                      <Box className="flex-shrink-0 mt-1">
                        {n.status === "approved" && <span className="text-green-600 text-xl">✅</span>}
                        {n.status === "rejected" && <span className="text-red-500 text-xl">❌</span>}
                        {n.status !== "approved" && n.status !== "rejected" && <span className="text-blue-500 text-xl">📦</span>}
                      </Box>
                      <Box className="flex-1">
                        <Typography variant="body2" className="mb-1 font-medium text-gray-800">
                          {n.message}
                        </Typography>
                        <Typography variant="caption" className="text-gray-400">
                          {n.date}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Box>
              </Menu>
            </motion.div>

            {/* User Menu */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Box
                onClick={handleMenu}
                className="flex items-center gap-3 glass-button rounded-full px-4 py-2 cursor-pointer hover-lift"
                role="button"
                aria-label="Open user menu"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleMenu(e as any)}
              >
                <Avatar sx={{ width: 32, height: 32 }} className="bg-gradient-to-r from-blue-500 to-purple-600">
                  {getRoleIcon(user?.ROLE || "")}
                </Avatar>
                {!isMobile && (
                  <Box>
                    <Typography variant="body2" className="font-semibold text-gray-800">
                      {user?.USERNAME}
                    </Typography>
                    <Chip
                      label={user?.ROLE}
                      size="small"
                      color={getRoleColor(user?.ROLE || "") as any}
                      className="h-5 text-xs"
                    />
                  </Box>
                )}
              </Box>
            </motion.div>

            {/* User Menu Dropdown */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              PaperProps={{
                className: "glass-card-strong rounded-2xl mt-2 min-w-[250px]",
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
      </motion.div>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          className: "glass-sidebar w-80",
        }}
      >
        <Box className="p-4">
          <Box className="flex items-center justify-between mb-6">
            <Typography variant="h6" className="font-bold text-gradient">
              Navigation
            </Typography>
            <IconButton
              onClick={() => setMobileMenuOpen(false)}
              className="glass-button rounded-full"
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

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="container mx-auto px-4 py-8 relative z-10"
      >
        {children}
      </motion.main>
    </div>
  )
}
