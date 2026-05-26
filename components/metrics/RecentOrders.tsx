"use client";
import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";
import { getBets, getMarkets, type Bet, type Market } from "@/lib/api";
import { getCategoryEmoji } from "@/lib/category-images";
import { useActiveAccount } from "thirdweb/react";
import { LoaderTwo } from "@/components/ui/loader";

export default function RecentOrders() {
  const account = useActiveAccount();
  const { theme } = useTheme();
  const userAddress = account?.address?.toLowerCase() || null;
  
  const [bets, setBets] = useState<Bet[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setHasFetched(false);
        const [betsResponse, marketsResponse] = await Promise.all([
          getBets(),
          getMarkets(),
        ]);

        // Ensure both responses are processed before setting loading to false
        let processedBets: Bet[] = [];
        let processedMarkets: Market[] = [];

        if (betsResponse.success && betsResponse.data) {
          // Filter bets by user's wallet address
          if (userAddress) {
            const userBets = betsResponse.data.filter(
              (bet) => bet.bettor?.toLowerCase() === userAddress
            );
            // Sort by most recent (assuming bets are ordered, or we can add timestamp later)
            processedBets = userBets.slice(0, 10); // Get top 10 most recent
          } else {
            processedBets = [];
          }
        }

        if (marketsResponse.success && marketsResponse.data) {
          processedMarkets = marketsResponse.data;
        }

        // Set both states together to avoid intermediate renders
        setBets(processedBets);
        setMarkets(processedMarkets);
        setHasFetched(true);
      } catch (error) {
        console.error("Error fetching recent bets:", error);
        setBets([]);
        setMarkets([]);
        setHasFetched(true);
      }
    };

    fetchData();
  }, [userAddress]);

  // Wait for computed data (marketMap) to be ready before hiding loader
  useEffect(() => {
    if (hasFetched) {
      // Use requestAnimationFrame to ensure React has processed state updates
      // and useMemo has recalculated marketMap
      const timer = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsLoading(false);
        });
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [hasFetched, markets, bets]);

  // Create a map of marketId to market data for quick lookup
  const marketMap = useMemo(() => {
    const map = new Map<string, Market>();
    markets.forEach((market) => {
      map.set(market.marketId, market);
    });
    return map;
  }, [markets]);

  // Determine bet status based on market deadline
  const getBetStatus = (bet: Bet): "Won" | "Pending" | "Lost" => {
    const market = marketMap.get(bet.marketId);
    if (!market || !market.deadline) {
      return "Pending";
    }
    
    const now = Date.now();
    if (market.deadline > now) {
      return "Pending";
    }
    
    // If market has ended, we'd need results data to determine Won/Lost
    // For now, return Pending for ended markets without results
    return "Pending";
  };

  // Show loader if loading OR if we have bets but markets haven't loaded yet (needed for bet display)
  // If we have no bets, we can show empty state even without markets
  const hasBetsButNoMarkets = bets.length > 0 && markets.length === 0;
  
  if (isLoading || hasBetsButNoMarkets) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 w-full">
        <div className="flex items-center justify-center py-12">
          <LoaderTwo />
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 w-full">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent Bets Placed
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            <svg
              className="stroke-current fill-white dark:fill-gray-800"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.29004 5.90393H17.7067"
                stroke=""
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M17.7075 14.0961H2.29085"
                stroke=""
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12.0826 3.33331C13.5024 3.33331 14.6534 4.48431 14.6534 5.90414C14.6534 7.32398 13.5024 8.47498 12.0826 8.47498C10.6627 8.47498 9.51172 7.32398 9.51172 5.90415C9.51172 4.48432 10.6627 3.33331 12.0826 3.33331Z"
                fill=""
                stroke=""
                strokeWidth="1.5"
              />
              <path
                d="M7.91745 11.525C6.49762 11.525 5.34662 12.676 5.34662 14.0959C5.34661 15.5157 6.49762 16.6667 7.91745 16.6667C9.33728 16.6667 10.4883 15.5157 10.4883 14.0959C10.4883 12.676 9.33728 11.525 7.91745 11.525Z"
                fill=""
                stroke=""
                strokeWidth="1.5"
              />
            </svg>
            Filter
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            See all
          </button>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Market
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Prediction
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Amount
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Status
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {bets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  No bets found. Place your first bet to see it here!
                </TableCell>
              </TableRow>
            ) : (
              bets.map((bet) => {
                const market = marketMap.get(bet.marketId);
                const marketQuestion = market?.question || "Unknown Market";
                const category = market?.category || "Other";
                const icon = getCategoryEmoji(category);
                const status = getBetStatus(bet);
                const option = bet.option.toUpperCase() as "YES" | "NO";

                return (
                  <TableRow key={`${bet.marketId}-${bet.bettor}`} className="">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-[50px] w-[50px] rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl font-bold text-gray-900 dark:text-white shrink-0">
                          {icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {marketQuestion}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        size="sm"
                        color={option === "YES" ? "success" : "error"}
                      >
                        {option}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Image
                          src={theme === "dark" ? "/genlayer_light.svg" : "/genlayer_dark.svg"}
                          alt="GEN token"
                          width={16}
                          height={16}
                          className="w-4 h-4 object-contain"
                        />
                        <span>
                          {bet.amountInEther?.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }) || "0.00"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        size="sm"
                        color={
                          status === "Won"
                            ? "success"
                            : status === "Pending"
                            ? "warning"
                            : "error"
                        }
                      >
                        {status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
