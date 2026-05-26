"use client";

import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { useEffect, useState, useCallback, useRef } from "react";

/**
 * Hook to get the user's ERC20 token balance on Genlayer
 * Token Address: 0x3c4fa9dBB58cc64FD31Aaef01a92f8875E26b577
 * Uses API route to avoid CORS issues with RPC
 * Fetches balance reactively when wallet/chain changes, not via polling
 * Returns 0 balance by default for all EVM addresses (if they don't have GEN tokens)
 * @returns { balance: number | null, isLoading: boolean, address: string | null, refreshBalance: () => void }
 */
export function useWalletBalance() {
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchedAddress, setLastFetchedAddress] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render on refresh
  const isLoadingRef = useRef(false);

  const fetchBalance = useCallback(async (force = false) => {
    if (!account?.address) {
      setBalance(null);
      setLastFetchedAddress(null);
      return;
    }

    // Only fetch balance if connected to Genlayer
    // TODO: Update with actual Genlayer chain ID
    if (chain?.id !== 50312) {
      setBalance(null);
      setLastFetchedAddress(null);
      return;
    }

    // Skip if already loading (unless forced)
    if (isLoadingRef.current && !force) {
      console.log(`[useWalletBalance] Already loading, skipping fetch`);
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      // Use API route to fetch balance (avoids CORS issues)
      // Add timestamp to prevent caching
      const response = await fetch(`/api/balance?address=${account.address}&t=${Date.now()}`);
      const data = await response.json();

      if (data.success && data.balance !== undefined) {
        const newBalance = typeof data.balance === 'number' ? data.balance : parseFloat(data.balance);
        console.log(`[useWalletBalance] Fetched balance: ${newBalance} GEN for ${account.address}`);
        // Always update balance - use functional update to ensure React detects the change
        setBalance((prevBalance) => {
          if (prevBalance !== newBalance) {
            console.log(`[useWalletBalance] Balance changed: ${prevBalance} -> ${newBalance}`);
            return newBalance;
          }
          // Even if same value, return it to trigger re-render
          return newBalance;
        });
        setLastFetchedAddress(account.address);
      } else {
        console.error("Failed to fetch balance:", data.error);
        setBalance(null);
        setLastFetchedAddress(null);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance(null);
      setLastFetchedAddress(null);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [account?.address, chain?.id]);

  // Fetch balance when wallet address or chain changes
  useEffect(() => {
    // Only fetch if address changed or hasn't been fetched yet
    if (account?.address && account.address !== lastFetchedAddress) {
      fetchBalance();
    }
  }, [account?.address, chain?.id, lastFetchedAddress, fetchBalance]);

  // Also fetch when refreshKey changes (manual refresh)
  useEffect(() => {
    if (refreshKey > 0 && account?.address) {
      console.log(`[useWalletBalance] Refresh key changed to ${refreshKey}, fetching balance`);
      fetchBalance(true);
    }
  }, [refreshKey, account?.address, fetchBalance]);

  // Manual refresh function
  const refreshBalance = useCallback(() => {
    console.log(`[useWalletBalance] Manual refresh requested for ${account?.address}`);
    if (!account?.address) {
      console.log(`[useWalletBalance] No account address, skipping refresh`);
      return;
    }
    // Reset loading ref to allow immediate fetch
    isLoadingRef.current = false;
    // Clear balance to show loading state
    setBalance(null);
    // Increment refresh key to trigger useEffect and force re-render
    setRefreshKey((prev) => {
      const newKey = prev + 1;
      console.log(`[useWalletBalance] Incrementing refresh key: ${prev} -> ${newKey}`);
      return newKey;
    });
  }, [account?.address]);

  return {
    balance,
    isLoading,
    address: account?.address || null,
    isConnected: !!account?.address,
    refreshBalance, // Expose manual refresh function
  };
}

