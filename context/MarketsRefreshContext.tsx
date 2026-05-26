"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Bet } from '@/lib/api';

interface MarketsRefreshContextType {
  refreshTrigger: number;
  refreshMarkets: (optimisticBet?: Bet) => void;
  optimisticBets: Map<string, Bet>;
  optimisticBetsVersion: number; // Version counter to trigger re-renders
  clearOptimisticBet: (marketId: string, bettor: string) => void;
}

const MarketsRefreshContext = createContext<MarketsRefreshContextType | undefined>(undefined);

export function MarketsRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [optimisticBets, setOptimisticBets] = useState<Map<string, Bet>>(new Map());
  const [optimisticBetsVersion, setOptimisticBetsVersion] = useState(0);

  const refreshMarkets = useCallback((optimisticBet?: Bet) => {
    if (optimisticBet) {
      const key = `${optimisticBet.marketId}-${optimisticBet.bettor.toLowerCase()}`;
      setOptimisticBets(prev => {
        const newMap = new Map(prev);
        newMap.set(key, optimisticBet);
        return newMap;
      });
      setOptimisticBetsVersion(prev => prev + 1);
    }
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const clearOptimisticBet = useCallback((marketId: string, bettor: string) => {
    const key = `${marketId}-${bettor.toLowerCase()}`;
    setOptimisticBets(prev => {
      const newMap = new Map(prev);
      if (newMap.has(key)) {
        newMap.delete(key);
        setOptimisticBetsVersion(prev => prev + 1);
      }
      return newMap;
    });
  }, []);

  return (
    <MarketsRefreshContext.Provider value={{ refreshTrigger, refreshMarkets, optimisticBets, optimisticBetsVersion, clearOptimisticBet }}>
      {children}
    </MarketsRefreshContext.Provider>
  );
}

export function useMarketsRefresh() {
  const context = useContext(MarketsRefreshContext);
  if (context === undefined) {
    throw new Error('useMarketsRefresh must be used within a MarketsRefreshProvider');
  }
  return context;
}

