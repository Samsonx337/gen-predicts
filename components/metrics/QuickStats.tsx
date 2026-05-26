"use client";
import React, { useEffect, useState, useMemo } from "react";
import { getMarkets, getBets, getResults, type Market, type Bet, type Result } from "@/lib/api";
import { useActiveAccount } from "thirdweb/react";
import { LoaderOne } from "@/components/ui/loader";
import { useMarketsRefresh } from "@/context/MarketsRefreshContext";

export function QuickStats() {
  const account = useActiveAccount();
  const userAddress = account?.address?.toLowerCase() || null;
  
  const [markets, setMarkets] = useState<Market[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { refreshTrigger } = useMarketsRefresh();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [marketsResponse, betsResponse, resultsResponse] = await Promise.all([
          getMarkets(),
          getBets(),
          getResults(),
        ]);

        if (marketsResponse.success && marketsResponse.data) {
          // Filter markets by user's creator address
          if (userAddress) {
            const userMarkets = marketsResponse.data.filter(
              (market) => market.creator?.toLowerCase() === userAddress
            );
            setMarkets(userMarkets);
          } else {
            setMarkets([]);
          }
        }

        if (betsResponse.success && betsResponse.data) {
          // Filter bets by user's wallet address
          if (userAddress) {
            const userBets = betsResponse.data.filter(
              (bet) => bet.bettor?.toLowerCase() === userAddress
            );
            setBets(userBets);
          } else {
            setBets([]);
          }
        }

        if (resultsResponse.success && resultsResponse.data) {
          setResults(resultsResponse.data);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userAddress, refreshTrigger]);

  // Calculate statistics
  const stats = useMemo(() => {
    const now = Date.now();
    
    // Active markets created by user (not past deadline)
    const activeMarkets = markets.filter(
      (market) => market.deadline && market.deadline > now
    ).length;

    // Pending bets (user's bets on active markets)
    const activeMarketIds = new Set(
      markets
        .filter((market) => market.deadline && market.deadline > now)
        .map((market) => market.marketId)
    );
    const pendingBets = bets.filter((bet) =>
      activeMarketIds.has(bet.marketId)
    ).length;

    // Average bet size (user's bets only)
    const avgBetSize =
      bets.length > 0
        ? bets.reduce((sum, bet) => sum + (bet.amountInEther || 0), 0) /
          bets.length
        : 0;

    // Win rate - calculate based on user's winning bets vs total bets
    let winRate = 0;
    if (bets.length > 0 && results.length > 0) {
      const resultsMap = new Map<string, Result>();
      results.forEach((result) => {
        resultsMap.set(result.marketId, result);
      });

      let winningBets = 0;
      bets.forEach((bet) => {
        const result = resultsMap.get(bet.marketId);
        if (result && bet.option.toUpperCase() === result.outcome.toUpperCase()) {
          winningBets++;
        }
      });

      winRate = (winningBets / bets.length) * 100;
    }

    return {
      winRate,
      activeMarkets,
      pendingBets,
      avgBetSize,
    };
  }, [markets, bets, results]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 h-full">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
        Quick Stats
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Win Rate
          </span>
          <span className="font-semibold text-gray-800 dark:text-white/90 flex items-center">
            {isLoading
              ? <LoaderOne />
              : `${stats.winRate.toFixed(1)}%`}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Active Markets
          </span>
          <span className="font-semibold text-gray-800 dark:text-white/90 flex items-center">
            {isLoading ? <LoaderOne /> : stats.activeMarkets.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Pending Bets
          </span>
          <span className="font-semibold text-gray-800 dark:text-white/90 flex items-center">
            {isLoading ? <LoaderOne /> : stats.pendingBets.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Avg. Bet Size
          </span>
          <span className="font-semibold text-gray-800 dark:text-white/90 flex items-center">
            {isLoading
              ? <LoaderOne />
              : stats.avgBetSize.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
          </span>
        </div>
      </div>
    </div>
  );
}

