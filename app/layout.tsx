import type React from 'react';
import type { Metadata } from 'next';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { CartProvider } from '@/src/contexts/CartContext';
import dynamic from 'next/dynamic';
import Layout from '@/components/Layout';
import ThemeProviderClient from '@/components/ThemeProviderClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

// Import CSS
import './globals.css';

export const metadata: Metadata = {
  title: 'StationaryHub - Modern Requisition System',
  description:
    'Advanced stationery requisition and approval system with modern UI/UX',
  generator: 'v0.dev',
  // เพิ่มการตั้งค่าเพื่อลด CSS preload warning
  other: {
    'X-Content-Type-Options': 'nosniff'
  }
};

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const ToastProvider = dynamic(
    () =>
      import('@/components/ui/ToastContainer').then((mod) => mod.ToastProvider),
    {
      ssr: false,
      // เพิ่มการตั้งค่าเพื่อลด preload warning
      loading: () => null
    }
  );
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body className="font-sans">
        <ThemeProviderClient session={session}>
          <AuthProvider>
            <CartProvider>
              <ToastProvider>
                <Layout>{children}</Layout>
              </ToastProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProviderClient>
      </body>
    </html>
  );
}
