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
    <>
      {mobile ? (
        <ListItem
          button
          onClick={() => handleNavigation(item.path)}
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
        <Button
          variant={pathname === item.path ? "contained" : "text"}
          onClick={() => handleNavigation(item.path)}
          startIcon={
            <Badge badgeContent={item.badge} color="error">
              <item.icon />
            </Badge>
          }
          size="small"
        >
          {item.label}
        </Button>
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
            <Typography 
              variant="h6" 
              component="div" 
              className="font-bold text-gray-800 cursor-pointer"
              onClick={() => handleNavigation("/")}
            >
              🛍️ StationeryHub
            </Typography>

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
            >
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsNone />
              </Badge>
            </IconButton>
            <Menu
              anchorEl={notificationAnchor}
              open={Boolean(notificationAnchor)}
              onClose={handleNotificationClose}
              PaperProps={{ className: "mt-2 min-w-[320px]" }}
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
                    className={`rounded-lg my-1 px-3 py-2 hover:bg-blue-50 cursor-pointer ${n.read ? "opacity-60" : ""}`}
                  >
                    <Box className="flex-shrink-0 mt-1">
                      {n.status === "approved" && <span className="text-green-600">✅</span>}
                      {n.status === "rejected" && <span className="text-red-500">❌</span>}
                      {n.status !== "approved" && n.status !== "rejected" && <span className="text-blue-500">📦</span>}
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
                    {user?.USERNAME}
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
