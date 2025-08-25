"use client"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import { Inter } from "next/font/google"
import { ReactNode } from "react"
import { SessionProvider } from "next-auth/react"
import { BASE_PATH } from "@/lib/base-path"

const inter = Inter({ subsets: ["latin"] })

const theme = createTheme({
  palette: {
    primary: {
      main: "#667eea",
    },
    secondary: {
      main: "#764ba2",
    },
  },
  typography: {
    fontFamily: inter.style.fontFamily,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
        },
      },
    },
  },
})

export default function ThemeProviderClient({ children }: { children: ReactNode }) {
  return (
    <SessionProvider 
      basePath={`${BASE_PATH}/api/auth`}
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
} 