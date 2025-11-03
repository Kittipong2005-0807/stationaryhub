import type React from 'react';
import type { Metadata } from 'next';
import ClientProviders from '@/components/ClientProviders';
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
  const session = await getServerSession(authOptions);
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <ThemeProviderClient session={session}>
          <ClientProviders session={session}>
            <Layout>{children}</Layout>
          </ClientProviders>
        </ThemeProviderClient>
      </body>
    </html>
  );
}
