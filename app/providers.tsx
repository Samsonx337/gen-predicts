"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi-config";
import { useState } from "react";
import { ThirdwebProvider } from "thirdweb/react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <div style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
      <ThirdwebProvider>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                className: 'dark:bg-gray-800 dark:text-white',
                style: {
                  borderRadius: '0.75rem',
                  padding: '1rem',
                },
                success: {
                  iconTheme: {
                    primary: '#465fff',
                    secondary: '#fff',
                  },
                  className: 'dark:bg-gray-800 dark:text-white dark:border-gray-700',
                },
                error: {
                  iconTheme: {
                    primary: '#f04438',
                    secondary: '#fff',
                  },
                  className: 'dark:bg-gray-800 dark:text-white dark:border-gray-700',
                },
                loading: {
                  iconTheme: {
                    primary: '#465fff',
                    secondary: '#fff',
                  },
                  className: 'dark:bg-gray-800 dark:text-white dark:border-gray-700',
                },
              }}
            />
          </QueryClientProvider>
        </WagmiProvider>
      </ThirdwebProvider>
    </div>
  );
}

