'use client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea'
    },
    secondary: {
      main: '#764ba2'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          textTransform: 'none',
          fontWeight: 600
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
        }
      }
    }
  }
});

export default function ThemeProviderClient({
  children,
  session
}: {
  children: ReactNode;
  session?: Session | null;
}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return (
    <SessionProvider
      session={session}
      basePath={`${basePath}/api/auth`}
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
