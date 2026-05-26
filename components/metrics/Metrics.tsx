"use client";
import React, { useEffect, useState } from "react";
import { BoltIcon, ShootingStarIcon, DollarLineIcon } from "../../icons";
import { getMarkets, getBets, getResults, type Market, type Bet, type Result } from "@/lib/api";
import { useActiveAccount } from "thirdweb/react";
import { LoaderOne } from "@/components/ui/loader";
import { useMarketsRefresh } from "@/context/MarketsRefreshContext";

export const Metrics = () => {
  const account = useActiveAccount();
  const userAddress = account?.address?.toLowerCase() || null;
  
  const [totalBets, setTotalBets] = useState<number>(0);
  const [totalMarkets, setTotalMarkets] = useState<number>(0);
  const [totalWinnings, setTotalWinnings] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const { refreshTrigger } = useMarketsRefresh();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        const [marketsResponse, betsResponse, resultsResponse] = await Promise.all([
          getMarkets(),
          getBets(),
          getResults(),
        ]);

        // Filter data by user address if connected
        let userBets: Bet[] = [];
        let userMarkets: Market[] = [];

        if (betsResponse.success && betsResponse.data) {
          if (userAddress) {
            // Filter bets by the connected wallet address (bettor)
            userBets = betsResponse.data.filter(
              (bet) => bet.bettor?.toLowerCase() === userAddress
            );
          } else {
            // If not connected, show empty
            userBets = [];
          }
          setTotalBets(userBets.length);
        }

        if (marketsResponse.success && marketsResponse.data) {
          if (userAddress) {
            // Filter markets by creator address
            userMarkets = marketsResponse.data.filter(
              (market) => market.creator?.toLowerCase() === userAddress
            );
            setTotalMarkets(userMarkets.length);
          } else {
            setTotalMarkets(0);
          }
        }

        // Calculate total winnings based on results and user's bets
        if (userBets.length > 0 && 
            marketsResponse.success && marketsResponse.data &&
            resultsResponse.success && resultsResponse.data) {
          
          const marketsMap = new Map<string, Market>();
          marketsResponse.data.forEach((market) => {
            marketsMap.set(market.marketId, market);
          });

          const resultsMap = new Map<string, Result>();
          resultsResponse.data.forEach((result) => {
            resultsMap.set(result.marketId, result);
          });

          let calculatedWinnings = 0;
          
          // Only calculate winnings for user's bets
          userBets.forEach((bet) => {
            const market = marketsMap.get(bet.marketId);
            const result = resultsMap.get(bet.marketId);

            if (market && result) {
              // Check if the bet's option matches the outcome
              const betOption = bet.option.toUpperCase();
              const outcome = result.outcome.toUpperCase();
              
              if (betOption === outcome) {
                // For now, we'll use the bet amount as winnings
                // In a real parimutuel system, this would be calculated based on the pool
                calculatedWinnings += bet.amountInEther || 0;
              }
            }
          });

          setTotalWinnings(calculatedWinnings);
        } else {
          // If no results or no bets, set winnings to 0
          setTotalWinnings(0);
        }
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [userAddress, refreshTrigger]); // Re-fetch when wallet address or refresh trigger changes

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <ShootingStarIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>

        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Total Bets
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90 flex items-center">
            {isLoading ? <LoaderOne /> : totalBets.toLocaleString()}
          </h4>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}

      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoltIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Total Markets Created
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90 flex items-center">
            {isLoading ? <LoaderOne /> : totalMarkets.toLocaleString()}
          </h4>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}

      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <DollarLineIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Total Winnings
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90 flex items-center">
            {isLoading 
              ? <LoaderOne /> 
              : totalWinnings.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })
            }
          </h4>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}
    </div>
  );
};
