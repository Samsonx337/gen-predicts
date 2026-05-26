"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useWalletBalance as useWalletBalanceHook } from "@/hooks/useWalletBalance";

interface WalletBalanceContextType {
  balance: number | null;
  isLoading: boolean;
  address: string | null;
  isConnected: boolean;
  refreshBalance: () => void;
}

const WalletBalanceContext = createContext<WalletBalanceContextType | undefined>(undefined);

export function WalletBalanceProvider({ children }: { children: ReactNode }) {
  const walletBalance = useWalletBalanceHook();

  return (
    <WalletBalanceContext.Provider value={walletBalance}>
      {children}
    </WalletBalanceContext.Provider>
  );
}

export function useWalletBalance() {
  const context = useContext(WalletBalanceContext);
  if (context === undefined) {
    throw new Error("useWalletBalance must be used within a WalletBalanceProvider");
  }
  return context;
}

