'use client';
import { Outfit } from 'next/font/google';
import '@/app/globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { MarketsRefreshProvider } from '@/context/MarketsRefreshContext';
import { WalletBalanceProvider } from '@/context/WalletBalanceContext';

const outfit = Outfit({
  subsets: ["latin"],
});

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${outfit.className} bg-gray-50 dark:bg-gray-900`}>
      <ThemeProvider>
        <WalletBalanceProvider>
          <MarketsRefreshProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </MarketsRefreshProvider>
        </WalletBalanceProvider>
      </ThemeProvider>
    </div>
  );
}

